import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/requireAuth';
import { supabaseService } from '../lib/supabase';
import { anonymizeIp, sha256 } from '../utils/crypto';

export const affiliateRouter = Router();

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function adminOnly(req: any, res: any, next: any) {
  if (req.authUser?.kind !== 'admin') return res.status(403).json({ error: 'Admin only' });
  return next();
}

function requireService(res: any) {
  if (!supabaseService) {
    res.status(500).json({
      error:
        'Affiliate module requires SUPABASE_SERVICE_ROLE_KEY on the API service (Render). It is used server-side to bypass RLS safely.',
    });
    return null;
  }
  return supabaseService;
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

async function ensureUniqueSlug(service: any, base: string, excludeId?: string): Promise<string> {
  const cleanBase = slugify(base);
  let candidate = cleanBase;

  for (let i = 0; i < 10; i++) {
    let q = service.from('affiliate_links').select('id').eq('slug', candidate);
    if (excludeId) q = q.neq('id', excludeId);

    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;

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
  // uniq
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
  const service = requireService(res);
  if (!service) return;

  const slug = String(req.params.slug ?? '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const { data: link, error } = await service
    .from('affiliate_links')
    .select('id, slug, is_active, destination_url')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!link || !link.is_active) return res.status(404).json({ error: 'Not found' });

  const dest = String(link.destination_url ?? '').trim();
  if (!/^https?:\/\//i.test(dest)) {
    return res.status(500).json({ error: 'Invalid destination_url (must start with http/https)' });
  }

  // log click (best-effort)
  const ref = String(req.headers.referer ?? '') || null;
  const ua = String(req.headers['user-agent'] ?? '') || null;
  const ipHash = safeIpHash(req);

  try {
    await service.from('affiliate_clicks').insert({
      link_id: link.id,
      referrer: ref,
      user_agent: ua,
      ip_hash: ipHash,
    });
  } catch {
    // never block redirect
  }

  const wantsRedirect = String(req.query?.redirect ?? '') === '1';
  if (wantsRedirect) return res.redirect(302, dest);
  return res.json({ ok: true, destination_url: dest });
});

// ------------------------------------------------------------
// Public: resources list (for /risorse landing)
// GET /api/affiliate/public/links?sort=top|new&category=&tag=&network=&q=&limit=
// ------------------------------------------------------------

affiliateRouter.get('/public/links', async (req, res) => {
  const service = requireService(res);
  if (!service) return;

  const q = String(req.query?.q ?? '').trim();
  const category = String(req.query?.category ?? '').trim();
  const tag = String(req.query?.tag ?? '').trim().toLowerCase();
  const network = String(req.query?.network ?? '').trim();
  const sort = String(req.query?.sort ?? 'top').trim();
  const limit = Math.min(60, Math.max(6, Number(req.query?.limit ?? 24)));

  let query = service
    .from('affiliate_links')
    .select('id, title, slug, network, category, tags, description, click_count, created_at')
    .eq('is_active', true)
    .limit(limit);

  if (q) {
    const safe = q.replace(/%/g, '');
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (category) query = query.eq('category', category);
  if (network) query = query.eq('network', network);
  if (tag) query = query.contains('tags', [tag]);

  if (sort === 'new') query = query.order('created_at', { ascending: false });
  else query = query.order('click_count', { ascending: false }).order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ items: data ?? [] });
});

// Public meta (categories/tags/networks)
affiliateRouter.get('/public/meta', async (_req, res) => {
  const service = requireService(res);
  if (!service) return;

  // best-effort: small sample is enough for UI meta
  const { data, error } = await service
    .from('affiliate_links')
    .select('category, tags, network, is_active')
    .eq('is_active', true)
    .limit(1500);

  if (error) return res.status(500).json({ error: error.message });

  const rows = data ?? [];
  const categories = new Map<string, number>();
  const networks = new Map<string, number>();
  const tags = new Map<string, number>();

  for (const r of rows as any[]) {
    const c = String(r.category ?? '').trim();
    if (c) categories.set(c, (categories.get(c) ?? 0) + 1);
    const n = String(r.network ?? '').trim();
    if (n) networks.set(n, (networks.get(n) ?? 0) + 1);
    const tArr = Array.isArray(r.tags) ? r.tags : [];
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

// List links (filters: q, active, category, tag, network, sort)
affiliateRouter.get('/links', adminOnly, async (req: any, res) => {
  const service = requireService(res);
  if (!service) return;

  const q = String(req.query?.q ?? '').trim();
  const active = String(req.query?.active ?? '').trim();
  const category = String(req.query?.category ?? '').trim();
  const tag = String(req.query?.tag ?? '').trim().toLowerCase();
  const network = String(req.query?.network ?? '').trim();
  const sort = String(req.query?.sort ?? 'new').trim();
  const limit = Math.min(500, Math.max(10, Number(req.query?.limit ?? 200)));

  let query = service
    .from('affiliate_links')
    .select(
      'id, title, slug, network, category, tags, description, source_url, destination_url, destination_base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, is_active, click_count, created_at, updated_at',
    )
    .limit(limit);

  if (sort === 'top') query = query.order('click_count', { ascending: false }).order('created_at', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  if (q) {
    const safe = q.replace(/%/g, '');
    query = query.or(`title.ilike.%${safe}%,slug.ilike.%${safe}%,description.ilike.%${safe}%,destination_url.ilike.%${safe}%`);
  }
  if (active === '1') query = query.eq('is_active', true);
  if (active === '0') query = query.eq('is_active', false);
  if (category) query = query.eq('category', category);
  if (network) query = query.eq('network', network);
  if (tag) query = query.contains('tags', [tag]);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ items: data ?? [] });
});

// Create link (slug auto + UTM builder)
affiliateRouter.post('/links', adminOnly, async (req: any, res) => {
  const service = requireService(res);
  if (!service) return;

  const schema = Joi.object({
    title: Joi.string().min(2).max(120).required(),
    description: Joi.string().allow('').max(360).optional(),
    category: Joi.string().allow('').max(40).optional(),
    tags: Joi.array().items(Joi.string().max(32)).optional(),
    // UTM builder
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
  const slug = desiredSlug ? await ensureUniqueSlug(service, desiredSlug) : await ensureUniqueSlug(service, value.title);

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

  const { data, error: insErr } = await service
    .from('affiliate_links')
    .insert(payload)
    .select(
      'id, title, slug, network, category, tags, description, source_url, destination_url, destination_base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, is_active, click_count, created_at, updated_at',
    )
    .maybeSingle();

  if (insErr) return res.status(500).json({ error: insErr.message });
  return res.json({ ok: true, item: data });
});

// Update link (supports UTM rebuild)
affiliateRouter.patch('/links/:id', adminOnly, async (req: any, res) => {
  const service = requireService(res);
  if (!service) return;

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
    destination_url: Joi.string().allow('').uri({ scheme: ['http', 'https'] }).optional(), // fallback/manual
    source_url: Joi.string().allow('').optional(),
    network: Joi.string().max(32).optional(),
    slug: Joi.string().allow('').optional(),
    is_active: Joi.boolean().optional(),
  }).min(1);

  const { error, value } = schema.validate(req.body ?? {}, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const id = String(req.params.id ?? '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  // Normalize tags if provided
  if (value.tags !== undefined) value.tags = normalizeTags(value.tags);

  // If slug changed, keep it unique
  if (value.slug !== undefined) {
    const desired = String(value.slug ?? '').trim();
    if (!desired) {
      const base = String(value.title ?? 'link');
      value.slug = await ensureUniqueSlug(service, base, id);
    } else {
      value.slug = await ensureUniqueSlug(service, desired, id);
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
    const { data: current, error: curErr } = await service
      .from('affiliate_links')
      .select('destination_base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term')
      .eq('id', id)
      .maybeSingle();

    if (curErr) return res.status(500).json({ error: curErr.message });
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

  const { data, error: upErr } = await service
    .from('affiliate_links')
    .update(value)
    .eq('id', id)
    .select(
      'id, title, slug, network, category, tags, description, source_url, destination_url, destination_base_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, is_active, click_count, created_at, updated_at',
    )
    .maybeSingle();

  if (upErr) return res.status(500).json({ error: upErr.message });
  return res.json({ ok: true, item: data });
});

// ------------------------------------------------------------
// Analytics
// ------------------------------------------------------------

// Summary (used in admin dashboard & affiliate page)
affiliateRouter.get('/analytics/summary', adminOnly, async (_req: any, res) => {
  const service = requireService(res);
  if (!service) return;

  const { data: links, error } = await service
    .from('affiliate_links')
    .select('id, title, slug, click_count, is_active')
    .limit(2000);

  if (error) return res.status(500).json({ error: error.message });

  const list = links ?? [];
  const totalLinks = list.length;
  const activeLinks = list.filter((l: any) => l.is_active).length;
  const totalClicks = list.reduce((a: number, l: any) => a + Number(l.click_count ?? 0), 0);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: last7DaysClicks, error: cErr } = await service
    .from('affiliate_clicks')
    .select('id', { count: 'exact', head: true })
    .gte('clicked_at', since);

  if (cErr) return res.status(500).json({ error: cErr.message });

  const topLinks = [...list]
    .sort((a: any, b: any) => Number(b.click_count ?? 0) - Number(a.click_count ?? 0))
    .slice(0, 5)
    .map((l: any) => ({ id: l.id, title: l.title, slug: l.slug, click_count: Number(l.click_count ?? 0) }));

  return res.json({
    totalLinks,
    activeLinks,
    totalClicks,
    last7DaysClicks: Number(last7DaysClicks ?? 0),
    topLinks,
  });
});

// Daily clicks (total)
affiliateRouter.get('/analytics/daily', adminOnly, async (req: any, res) => {
  const service = requireService(res);
  if (!service) return;

  const days = Math.min(30, Math.max(3, Number(req.query?.days ?? 14)));

  const { data, error } = await service
    .from('affiliate_clicks_daily_total')
    .select('day, clicks')
    .order('day', { ascending: false })
    .limit(days);

  if (error) return res.status(500).json({ error: error.message });

  const items = (data ?? [])
    .map((r: any) => ({ day: r.day, clicks: Number(r.clicks ?? 0) }))
    .reverse();

  return res.json({ days, items });
});
