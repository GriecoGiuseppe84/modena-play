import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/requireAuth';
import { pool } from '../database/pg';
import { anonymizeIp, sha256 } from '../utils/crypto';

export const affiliateRouter = Router();

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function adminOnly(req: any, res: any, next: any) {
  if (req.authUser?.kind !== 'admin') return res.status(403).json({ error: 'Admin only' });
  return next();
}

function slugify(input: string): string {
  const s = String(input ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');

  const out = s
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return out || 'link';
}

function randSuffix(len = 4) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const cleanBase = slugify(base);
  let candidate = cleanBase;

  for (let i = 0; i < 10; i++) {
    const r = await pool.query(
      `SELECT id FROM affiliate_links WHERE slug=$1 ${excludeId ? 'AND id <> $2' : ''} LIMIT 1`,
      excludeId ? [candidate, excludeId] : [candidate]
    );
    if ((r.rows?.length ?? 0) === 0) return candidate;
    candidate = `${cleanBase}-${randSuffix(4)}`.slice(0, 60);
  }
  return `${cleanBase}-${Date.now().toString(36).slice(-4)}`.slice(0, 60);
}

function safeIpHash(req: any) {
  const raw = String(req.headers['x-forwarded-for'] ?? req.ip ?? req.socket?.remoteAddress ?? '');
  const ip = anonymizeIp(raw.split(',')[0]?.trim() ?? raw);
  if (!ip) return null;
  const salt = String(process.env.JWT_SECRET || '');
  return sha256(`${ip}|${salt}`);
}

function pickUtm(query: any) {
  const get = (k: string) => {
    const v = String(query?.[k] ?? '').trim();
    return v ? v.slice(0, 64) : null;
  };
  return {
    utm_source: get('utm_source'),
    utm_medium: get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    utm_content: get('utm_content'),
    utm_term: get('utm_term'),
  };
}


// ------------------------------------------------------------
// Public: link metadata (for AffiliateBox / offers)
// GET /api/affiliate/public/links/:slug
// GET /api/affiliate/public/links?tag=...&brand=...&limit=...
// ------------------------------------------------------------
affiliateRouter.get('/public/links/:slug', async (req, res) => {
  const slug = String(req.params.slug ?? '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const r = await pool.query(
    `SELECT l.id, l.title, l.slug, l.network, l.destination_url, l.is_active, l.click_count,
            l.payout_type, l.payout_value, l.tags, l.notes,
            b.name as brand_name
     FROM affiliate_links l
     LEFT JOIN affiliate_brands b ON b.id = l.brand_id
     WHERE l.slug = $1
     LIMIT 1`,
    [slug]
  );

  const item = r.rows?.[0];
  if (!item) return res.status(404).json({ error: 'Link not found' });
  if (!item.is_active) return res.status(410).json({ error: 'Link inactive' });

  return res.json({ ok: true, item });
});

affiliateRouter.get('/public/links', async (req, res) => {
  const tag = String(req.query.tag ?? '').trim().toLowerCase();
  const brand = String(req.query.brand ?? '').trim();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50) || 50));

  const where: string[] = ['l.is_active = true'];
  const params: any[] = [];
  let i = 1;

  if (tag) {
    where.push(`$${i} = ANY(l.tags)`);
    params.push(tag);
    i++;
  }
  if (brand) {
    where.push(`b.name ILIKE $${i}`);
    params.push(`%${brand}%`);
    i++;
  }

  const q = `
    SELECT l.id, l.title, l.slug, l.network, l.destination_url, l.click_count,
           l.payout_type, l.payout_value, l.tags,
           b.name as brand_name
    FROM affiliate_links l
    LEFT JOIN affiliate_brands b ON b.id = l.brand_id
    WHERE ${where.join(' AND ')}
    ORDER BY l.updated_at DESC
    LIMIT ${limit}
  `;
  const r = await pool.query(q, params);
  return res.json({ ok: true, items: r.rows ?? [] });
});

// ------------------------------------------------------------
// Public: resolve (and optional redirect)
// GET /api/affiliate/resolve/:slug?redirect=1&...utm...
// ------------------------------------------------------------

affiliateRouter.get('/resolve/:slug', async (req, res) => {
  const slug = String(req.params.slug ?? '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const linkR = await pool.query(
    `SELECT id, title, destination_url, is_active FROM affiliate_links WHERE slug=$1 LIMIT 1`,
    [slug]
  );
  const link = linkR.rows?.[0];
  if (!link) return res.status(404).json({ error: 'Link not found' });
  if (!link.is_active) return res.status(410).json({ error: 'Link inactive' });

  // Track click (best-effort)
  try {
    const referrer = String(req.headers['referer'] ?? req.headers['referrer'] ?? '').slice(0, 512) || null;
    const userAgent = String(req.headers['user-agent'] ?? '').slice(0, 512) || null;

    // page path can be passed from frontend as ?p=/some/page
    const pagePath = String(req.query.p ?? '').slice(0, 256) || null;

    const utm = pickUtm(req.query);

    await pool.query(
      `INSERT INTO affiliate_clicks (link_id, referrer, user_agent, ip_hash, page_path, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        link.id,
        referrer,
        userAgent,
        safeIpHash(req),
        pagePath,
        utm.utm_source,
        utm.utm_medium,
        utm.utm_campaign,
        utm.utm_content,
        utm.utm_term,
      ]
    );
  } catch (e) {
    // ignore tracking failures
  }

  const redirect = String(req.query.redirect ?? '').trim() === '1';
  if (redirect) return res.redirect(302, link.destination_url);

  return res.json({
    ok: true,
    link: { slug, title: link.title, destinationUrl: link.destination_url },
  });
});

// ------------------------------------------------------------
// Admin: Links CRUD
// ------------------------------------------------------------

affiliateRouter.use(requireAuth);
affiliateRouter.use(adminOnly);

affiliateRouter.get('/links', async (_req, res) => {
  const r = await pool.query(
    `SELECT id, title, source_url, destination_url, network, slug, is_active, click_count, brand_id, payout_type, payout_value, tags, notes, created_at, updated_at
     FROM affiliate_links
     ORDER BY created_at DESC
     LIMIT 500`
  );
  return res.json({ items: r.rows ?? [] });
});

const linkSchema = Joi.object({
  title: Joi.string().min(2).max(120).required(),
  source_url: Joi.string().allow('', null).max(512),
  destination_url: Joi.string().uri().max(1024).required(),
  network: Joi.string().max(64).default('generic'),
  slug: Joi.string().allow('', null).max(60),
  is_active: Joi.boolean().default(true),
  brand_id: Joi.string().uuid().allow(null, ''),
  payout_type: Joi.string().max(16).allow(null, ''),
  payout_value: Joi.number().allow(null),
  tags: Joi.array().items(Joi.string().max(32)).max(12).default([]),
  notes: Joi.string().allow('', null).max(2000),
});

affiliateRouter.post('/links', async (req, res) => {
  const { value, error } = linkSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const slug = await ensureUniqueSlug(value.slug || value.title);

  const r = await pool.query(
    `INSERT INTO affiliate_links (title, source_url, destination_url, network, slug, is_active, brand_id, payout_type, payout_value, tags, notes)
     VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,''),NULLIF($8,''),$9,$10,$11)
     RETURNING id, title, source_url, destination_url, network, slug, is_active, click_count, brand_id, payout_type, payout_value, tags, notes, created_at, updated_at`,
    [
      value.title,
      value.source_url ?? '',
      value.destination_url,
      value.network ?? 'generic',
      slug,
      Boolean(value.is_active),
      value.brand_id || null,
      value.payout_type || null,
      value.payout_value ?? null,
      value.tags ?? [],
      value.notes ?? null,
    ]
  );

  return res.json({ item: r.rows?.[0] });
});

const patchSchema = linkSchema.fork(['title', 'destination_url'], (s) => s.optional());

affiliateRouter.patch('/links/:id', async (req, res) => {
  const id = String(req.params.id ?? '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const { value, error } = patchSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  // slug update (optional)
  let slug: string | null = null;
  if (value.slug !== undefined) {
    slug = await ensureUniqueSlug(value.slug || value.title || 'link', id);
  }

  const r = await pool.query(
    `UPDATE affiliate_links SET
        title = COALESCE($2, title),
        source_url = COALESCE($3, source_url),
        destination_url = COALESCE($4, destination_url),
        network = COALESCE($5, network),
        slug = COALESCE($6, slug),
        is_active = COALESCE($7, is_active),
        brand_id = COALESCE(NULLIF($8,''), brand_id),
        payout_type = COALESCE(NULLIF($9,''), payout_type),
        payout_value = COALESCE($10, payout_value),
        tags = COALESCE($11, tags),
        notes = COALESCE($12, notes),
        updated_at = now()
      WHERE id=$1
      RETURNING id, title, source_url, destination_url, network, slug, is_active, click_count, brand_id, payout_type, payout_value, tags, notes, created_at, updated_at`,
    [
      id,
      value.title ?? null,
      value.source_url ?? null,
      value.destination_url ?? null,
      value.network ?? null,
      slug,
      value.is_active ?? null,
      value.brand_id ?? '',
      value.payout_type ?? '',
      value.payout_value ?? null,
      value.tags ?? null,
      value.notes ?? null,
    ]
  );

  if ((r.rows?.length ?? 0) === 0) return res.status(404).json({ error: 'Not found' });
  return res.json({ item: r.rows?.[0] });
});

// ------------------------------------------------------------
// Admin: Brands CRUD (minimal)
// ------------------------------------------------------------

const brandSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  slug: Joi.string().allow('', null).max(80),
  website_url: Joi.string().allow('', null).max(512),
  network: Joi.string().allow('', null).max(64),
  notes: Joi.string().allow('', null).max(2000),
});

affiliateRouter.get('/brands', async (_req, res) => {
  const r = await pool.query(
    `SELECT id, name, slug, website_url, network, notes, created_at, updated_at
     FROM affiliate_brands
     ORDER BY created_at DESC
     LIMIT 500`
  );
  return res.json({ items: r.rows ?? [] });
});

affiliateRouter.post('/brands', async (req, res) => {
  const { value, error } = brandSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const slug = slugify(value.slug || value.name);

  const r = await pool.query(
    `INSERT INTO affiliate_brands (name, slug, website_url, network, notes)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (slug) DO UPDATE SET
       name=EXCLUDED.name,
       website_url=EXCLUDED.website_url,
       network=EXCLUDED.network,
       notes=EXCLUDED.notes,
       updated_at=now()
     RETURNING id, name, slug, website_url, network, notes, created_at, updated_at`,
    [value.name, slug, value.website_url ?? null, value.network ?? null, value.notes ?? null]
  );

  return res.json({ item: r.rows?.[0] });
});
