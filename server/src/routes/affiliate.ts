import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../database/pg';
import { requireAuth } from '../middleware/requireAuth';
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
    .replace(/[\u0300-\u036f]/g, '');

  const out = s
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

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
      `SELECT id FROM affiliate_links WHERE slug = $1 ${excludeId ? 'AND id <> $2' : ''} LIMIT 1`,
      excludeId ? [candidate, excludeId] : [candidate]
    );
    if (!r.rows?.[0]) return candidate;
    candidate = `${cleanBase}-${randSuffix(4)}`.slice(0, 56);
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

function normalizeTags(v: any): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : String(v).split(',');
  const out = arr
    .map((x: any) => String(x ?? '').trim())
    .filter(Boolean)
    .map((x: string) => x.slice(0, 32).toLowerCase());
  return Array.from(new Set(out)).slice(0, 12);
}

function buildUtmUrl(baseUrl: string, utm: Record<string, string | undefined | null>): string {
  const u = new URL(baseUrl);
  const entries: Array<[string, string | undefined | null]> = [
    ['utm_source', utm.utm_source],
    ['utm_medium', utm.utm_medium],
    ['utm_campaign', utm.utm_campaign],
    ['utm_content', utm.utm_content],
    ['utm_term', utm.utm_term],
  ];
  for (const [k, v] of entries) {
    const s = String(v ?? '').trim();
    if (s) u.searchParams.set(k, s);
    else u.searchParams.delete(k);
  }
  return u.toString();
}

function pickUtm(value: any) {
  return {
    utm_source: String(value.utm_source ?? '').trim(),
    utm_medium: String(value.utm_medium ?? '').trim(),
    utm_campaign: String(value.utm_campaign ?? '').trim(),
    utm_content: String(value.utm_content ?? '').trim(),
    utm_term: String(value.utm_term ?? '').trim(),
  };
}

// ------------------------------------------------------------
// Public: resolve (and optional redirect)
// GET /api/affiliate/resolve/:slug?redirect=1
// ------------------------------------------------------------

affiliateRouter.get('/resolve/:slug', async (req, res) => {
  const slug = String(req.params.slug ?? '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const r = await pool.query(
    `SELECT id, slug, is_active, destination_url FROM affiliate_links WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  const link = r.rows?.[0];
  if (!link || !link.is_active) return res.status(404).json({ error: 'Not found' });

  const dest = String(link.destination_url ?? '').trim();
  if (!/^https?:\/\//i.test(dest)) {
    return res.status(500).json({ error: 'Invalid destination_url (must start with http/https)' });
  }

  // log click (best-effort)
  const ref = String(req.headers.referer ?? '') || null;
  const ua = String(req.headers['user-agent'] ?? '') || null;
  const ipHash = safeIpHash(req);
  pool
    .query(
      `INSERT INTO affiliate_clicks (link_id, referrer, user_agent, ip_hash) VALUES ($1,$2,$3,$4)`,
      [link.id, ref, ua, ipHash]
    )
    .catch(() => {
      /* never block redirect */
    });

  const wantsRedirect = String(req.query?.redirect ?? '') === '1';
  if (wantsRedirect) return res.redirect(302, dest);
  return res.json({ ok: true, destination_url: dest });
});

// ------------------------------------------------------------
// Public: resources list
// GET /api/affiliate/public/links?sort=top|new&category=&tag=&network=&q=&limit=
// ------------------------------------------------------------

affiliateRouter.get('/public/links', async (req, res) => {
  const q = String(req.query?.q ?? '').trim();
  const category = String(req.query?.category ?? '').trim();
  const tag = String(req.query?.tag ?? '').trim().toLowerCase();
  const network = String(req.query?.network ?? '').trim();
  const sort = String(req.query?.sort ?? 'top').trim();
  const limit = Math.min(60, Math.max(6, Number(req.query?.limit ?? 24)));

  const where: string[] = ['is_active = true'];
  const params: any[] = [];
  const p = (v: any) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (q) {
    const safe = `%${q.replace(/%/g, '')}%`;
    where.push(`(title ILIKE ${p(safe)} OR description ILIKE ${p(safe)})`);
  }
  if (category) where.push(`category = ${p(category)}`);
  if (network) where.push(`network = ${p(network)}`);
  if (tag) where.push(`${p(tag)} = ANY(tags)`);

  const orderBy = sort === 'new' ? 'created_at DESC' : 'click_count DESC, created_at DESC';

  const sql = `
    SELECT id, title, slug, network, category, tags, description, click_count, created_at
    FROM affiliate_links
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ${p(limit)}
  `;

  const r = await pool.query(sql, params);
  return res.json({ items: r.rows ?? [] });
});

// Public meta (categories/tags/networks)
affiliateRouter.get('/public/meta', async (_req, res) => {
  const r = await pool.query(
    `SELECT category, tags, network FROM affiliate_links WHERE is_active = true ORDER BY created_at DESC LIMIT 1500`
  );

  const rows = r.rows ?? [];
  const categories = new Map<string, number>();
  const networks = new Map<string, number>();
  const tags = new Map<string, number>();

  for (const rr of rows as any[]) {
    const c = String(rr.category ?? '').trim();
    if (c) categories.set(c, (categories.get(c) ?? 0) + 1);
    const n = String(rr.network ?? '').trim();
    if (n) networks.set(n, (networks.get(n) ?? 0) + 1);
    const tArr = Array.isArray(rr.tags) ? rr.tags : [];
    for (const t of tArr) {
      const tt = String(t ?? '').trim().toLowerCase();
      if (tt) tags.set(tt, (tags.get(tt) ?? 0) + 1);
    }
  }

  const toList = (m: Map<string, number>) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }));

  return res.json({
    categories: toList(categories),
    networks: toList(networks),
    tags: toList(tags).slice(0, 30),
  });
});

// ------------------------------------------------------------
// Protected (admin): CRUD links + analytics
// ------------------------------------------------------------

affiliateRouter.use(requireAuth);

// List links
affiliateRouter.get('/links', adminOnly, async (req: any, res) => {
  const q = String(req.query?.q ?? '').trim();
  const active = String(req.query?.active ?? '').trim();
  const category = String(req.query?.category ?? '').trim();
  const tag = String(req.query?.tag ?? '').trim().toLowerCase();
  const network = String(req.query?.network ?? '').trim();
  const sort = String(req.query?.sort ?? 'new').trim();
  const limit = Math.min(500, Math.max(10, Number(req.query?.limit ?? 200)));

  const where: string[] = [];
  const params: any[] = [];
  const p = (v: any) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (q) {
    const safe = `%${q.replace(/%/g, '')}%`;
    where.push(
      `(title ILIKE ${p(safe)} OR slug ILIKE ${p(safe)} OR description ILIKE ${p(safe)} OR destination_url ILIKE ${p(safe)})`
    );
  }
  if (active === '1') where.push(`is_active = true`);
  if (active === '0') where.push(`is_active = false`);
  if (category) where.push(`category = ${p(category)}`);
  if (network) where.push(`network = ${p(network)}`);
  if (tag) where.push(`${p(tag)} = ANY(tags)`);

  const orderBy = sort === 'top' ? 'click_count DESC, created_at DESC' : 'created_at DESC';

  const sql = `
    SELECT id, title, slug, network, category, tags, description, source_url, destination_url,
           destination_base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
           is_active, click_count, created_at, updated_at
    FROM affiliate_links
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${orderBy}
    LIMIT ${p(limit)}
  `;

  const r = await pool.query(sql, params);
  return res.json({ items: r.rows ?? [] });
});

// Create link
affiliateRouter.post('/links', adminOnly, async (req: any, res) => {
  const schema = Joi.object({
    title: Joi.string().min(2).max(120).required(),
    description: Joi.string().allow('').max(360).optional(),
    category: Joi.string().allow('').max(40).optional(),
    tags: Joi.array().items(Joi.string().max(32)).optional(),
    destination_base_url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
    utm_source: Joi.string().allow('').max(80).optional(),
    utm_medium: Joi.string().allow('').max(80).optional(),
    utm_campaign: Joi.string().allow('').max(120).optional(),
    utm_content: Joi.string().allow('').max(120).optional(),
    utm_term: Joi.string().allow('').max(120).optional(),
    source_url: Joi.string().allow('').optional(),
    network: Joi.string().max(32).default('generic'),
    slug: Joi.string().allow('').optional(),
    is_active: Joi.boolean().default(true),
  });

  const { error, value } = schema.validate(req.body ?? {}, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const desiredSlug = String(value.slug ?? '').trim();
  const slug = desiredSlug ? await ensureUniqueSlug(desiredSlug) : await ensureUniqueSlug(value.title);

  const baseUrl = String(value.destination_base_url ?? '').trim();
  const utm = pickUtm(value);
  let destination_url = '';
  try {
    destination_url = buildUtmUrl(baseUrl, utm);
  } catch {
    return res.status(400).json({ error: 'destination_base_url is not a valid URL' });
  }

  const payload = {
    title: value.title,
    description: String(value.description ?? ''),
    category: String(value.category ?? ''),
    tags: normalizeTags(value.tags),
    network: value.network,
    slug,
    is_active: Boolean(value.is_active),
    source_url: String(value.source_url ?? ''),
    destination_base_url: baseUrl,
    ...utm,
    destination_url,
  };

  const r = await pool.query(
    `
      INSERT INTO affiliate_links (
        title, description, category, tags, network, slug, is_active, source_url,
        destination_base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, destination_url
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id, title, slug, network, category, tags, description, source_url, destination_url,
                destination_base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                is_active, click_count, created_at, updated_at
    `,
    [
      payload.title,
      payload.description,
      payload.category,
      payload.tags,
      payload.network,
      payload.slug,
      payload.is_active,
      payload.source_url,
      payload.destination_base_url,
      payload.utm_source,
      payload.utm_medium,
      payload.utm_campaign,
      payload.utm_content,
      payload.utm_term,
      payload.destination_url,
    ]
  );

  return res.json({ ok: true, item: r.rows?.[0] ?? null });
});

// Update link
affiliateRouter.patch('/links/:id', adminOnly, async (req: any, res) => {
  const schema = Joi.object({
    title: Joi.string().min(2).max(120).optional(),
    description: Joi.string().allow('').max(360).optional(),
    category: Joi.string().allow('').max(40).optional(),
    tags: Joi.array().items(Joi.string().max(32)).optional(),
    destination_base_url: Joi.string().allow('').uri({ scheme: ['http', 'https'] }).optional(),
    utm_source: Joi.string().allow('').max(80).optional(),
    utm_medium: Joi.string().allow('').max(80).optional(),
    utm_campaign: Joi.string().allow('').max(120).optional(),
    utm_content: Joi.string().allow('').max(120).optional(),
    utm_term: Joi.string().allow('').max(120).optional(),
    destination_url: Joi.string().allow('').uri({ scheme: ['http', 'https'] }).optional(),
    source_url: Joi.string().allow('').optional(),
    network: Joi.string().max(32).optional(),
    slug: Joi.string().allow('').optional(),
    is_active: Joi.boolean().optional(),
  }).min(1);

  const { error, value } = schema.validate(req.body ?? {}, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const id = String(req.params.id ?? '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  // normalize tags
  if (value.tags !== undefined) value.tags = normalizeTags(value.tags);

  // slug uniqueness
  if (value.slug !== undefined) {
    const desired = String(value.slug ?? '').trim();
    if (!desired) {
      const base = String(value.title ?? 'link');
      value.slug = await ensureUniqueSlug(base, id);
    } else {
      value.slug = await ensureUniqueSlug(desired, id);
    }
  }

  const needsUtmRebuild =
    value.destination_base_url !== undefined ||
    value.utm_source !== undefined ||
    value.utm_medium !== undefined ||
    value.utm_campaign !== undefined ||
    value.utm_content !== undefined ||
    value.utm_term !== undefined;

  if (needsUtmRebuild) {
    const cur = await pool.query(
      `SELECT destination_base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term FROM affiliate_links WHERE id=$1`,
      [id]
    );
    const current = cur.rows?.[0];
    if (!current) return res.status(404).json({ error: 'Not found' });

    const baseUrl = String((value.destination_base_url ?? current.destination_base_url ?? '') || '').trim();
    if (!baseUrl) return res.status(400).json({ error: 'destination_base_url is required (or keep existing)' });

    const utmMerged = {
      utm_source: value.utm_source !== undefined ? String(value.utm_source ?? '').trim() : String(current.utm_source ?? '').trim(),
      utm_medium: value.utm_medium !== undefined ? String(value.utm_medium ?? '').trim() : String(current.utm_medium ?? '').trim(),
      utm_campaign: value.utm_campaign !== undefined ? String(value.utm_campaign ?? '').trim() : String(current.utm_campaign ?? '').trim(),
      utm_content: value.utm_content !== undefined ? String(value.utm_content ?? '').trim() : String(current.utm_content ?? '').trim(),
      utm_term: value.utm_term !== undefined ? String(value.utm_term ?? '').trim() : String(current.utm_term ?? '').trim(),
    };

    try {
      value.destination_base_url = baseUrl;
      value.destination_url = buildUtmUrl(baseUrl, utmMerged);
    } catch {
      return res.status(400).json({ error: 'destination_base_url is not a valid URL' });
    }
  } else if (value.destination_url !== undefined) {
    const url = String(value.destination_url ?? '').trim();
    if (!url) return res.status(400).json({ error: 'destination_url cannot be empty' });
  }

  // dynamic UPDATE
  const sets: string[] = [];
  const params: any[] = [id];
  const p = (v: any) => {
    params.push(v);
    return `$${params.length}`;
  };

  const map: Record<string, any> = {
    title: value.title,
    description: value.description,
    category: value.category,
    tags: value.tags,
    destination_base_url: value.destination_base_url,
    utm_source: value.utm_source,
    utm_medium: value.utm_medium,
    utm_campaign: value.utm_campaign,
    utm_content: value.utm_content,
    utm_term: value.utm_term,
    destination_url: value.destination_url,
    source_url: value.source_url,
    network: value.network,
    slug: value.slug,
    is_active: value.is_active,
  };

  for (const [k, v] of Object.entries(map)) {
    if (v === undefined) continue;
    sets.push(`${k} = ${p(v)}`);
  }

  if (!sets.length) return res.status(400).json({ error: 'No valid fields to update' });

  const r = await pool.query(
    `
      UPDATE affiliate_links
      SET ${sets.join(', ')}, updated_at = now()
      WHERE id = $1
      RETURNING id, title, slug, network, category, tags, description, source_url, destination_url,
                destination_base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                is_active, click_count, created_at, updated_at
    `,
    params
  );

  const item = r.rows?.[0];
  if (!item) return res.status(404).json({ error: 'Not found' });
  return res.json({ ok: true, item });
});

// Summary
affiliateRouter.get('/analytics/summary', adminOnly, async (_req: any, res) => {
  const links = await pool.query(`SELECT id, title, slug, click_count, is_active FROM affiliate_links LIMIT 2000`);
  const list = links.rows ?? [];
  const totalLinks = list.length;
  const activeLinks = list.filter((l: any) => l.is_active).length;
  const totalClicks = list.reduce((a: number, l: any) => a + Number(l.click_count ?? 0), 0);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last7 = await pool.query(`SELECT count(*)::int as c FROM affiliate_clicks WHERE clicked_at >= $1`, [since.toISOString()]);
  const last7DaysClicks = Number(last7.rows?.[0]?.c ?? 0);

  const topLinks = [...list]
    .sort((a: any, b: any) => Number(b.click_count ?? 0) - Number(a.click_count ?? 0))
    .slice(0, 5)
    .map((l: any) => ({ id: l.id, title: l.title, slug: l.slug, click_count: Number(l.click_count ?? 0) }));

  return res.json({ totalLinks, activeLinks, totalClicks, last7DaysClicks, topLinks });
});

// Daily clicks total
affiliateRouter.get('/analytics/daily', adminOnly, async (req: any, res) => {
  const days = Math.min(30, Math.max(3, Number(req.query?.days ?? 14)));

  const r = await pool.query(
    `
      SELECT day, clicks
      FROM affiliate_clicks_daily_total
      ORDER BY day DESC
      LIMIT $1
    `,
    [days]
  );

  const items = (r.rows ?? [])
    .map((rr: any) => ({ day: rr.day, clicks: Number(rr.clicks ?? 0) }))
    .reverse();

  return res.json({ days, items });
});
