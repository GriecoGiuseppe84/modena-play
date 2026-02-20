import { Router } from 'express';
import Joi from 'joi';
import { pool } from '../database/pg';
import { requireAuth } from '../middleware/requireAuth';

export const contentRouter = Router();

// -----------------------------
// Helpers
// -----------------------------
function slugify(input: string): string {
  const s = String(input ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');

  const out = s
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return out || 'post';
}

async function ensureUniqueSlug(table: 'content_posts' | 'content_categories' | 'content_tags', base: string, excludeId?: string) {
  const cleanBase = slugify(base);
  let candidate = cleanBase;

  for (let i = 0; i < 10; i++) {
    const r = await pool.query(
      `SELECT id FROM ${table} WHERE slug=$1 ${excludeId ? 'AND id <> $2' : ''} LIMIT 1`,
      excludeId ? [candidate, excludeId] : [candidate]
    );
    if ((r.rows?.length ?? 0) === 0) return candidate;
    candidate = `${cleanBase}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 80);
  }
  return `${cleanBase}-${Date.now().toString(36).slice(-4)}`.slice(0, 80);
}

function containsForbiddenTerms(text: string) {
  // Project focus: "gaming safe" only. We block publishing (not drafting) if these keywords appear.
  const t = String(text ?? '').toLowerCase();
  const terms = [
    /\bcasino\b/i,
    /\bslot\b/i,
    /\bbonus\b/i,
    /\bscommess(e|a)\b/i,
    /\broulette\b/i,
    /\bblackjack\b/i,
    /\bpoker\b/i,
  ];
  return terms.some((re) => re.test(t));
}

// -----------------------------
// Public endpoints
// -----------------------------

// GET /api/content/posts?limit=20&offset=0
contentRouter.get('/posts', async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 20), 50);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  const r = await pool.query(
    `SELECT id, title, slug, excerpt, hero_image_url, status, published_at, created_at, updated_at
     FROM content_posts
     WHERE status='published'
     ORDER BY published_at DESC NULLS LAST, created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return res.json({ items: r.rows ?? [] });
});

// GET /api/content/posts/:slug
contentRouter.get('/posts/:slug', async (req, res) => {
  const slug = String(req.params.slug ?? '').trim().toLowerCase();
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const r = await pool.query(
    `SELECT p.id, p.title, p.slug, p.excerpt, p.body_md, p.hero_image_url, p.seo_title, p.seo_description, p.status, p.published_at, p.created_at, p.updated_at,
            c.id as category_id, c.name as category_name, c.slug as category_slug
     FROM content_posts p
     LEFT JOIN content_categories c ON c.id = p.category_id
     WHERE p.slug=$1 AND p.status='published'
     LIMIT 1`,
    [slug]
  );

  const post = r.rows?.[0];
  if (!post) return res.status(404).json({ error: 'Not found' });

  const tagsR = await pool.query(
    `SELECT t.id, t.name, t.slug
     FROM content_tags t
     JOIN content_post_tags pt ON pt.tag_id=t.id
     WHERE pt.post_id=$1
     ORDER BY t.name ASC`,
    [post.id]
  );

  

// related posts: share at least 1 tag, exclude current
const relatedR = await pool.query(
  `SELECT p.id, p.title, p.slug, p.excerpt, p.hero_image_url, p.published_at
   FROM content_posts p
   WHERE p.status='published'
     AND p.id <> $1
     AND EXISTS (
       SELECT 1
       FROM content_post_tags pt
       WHERE pt.post_id = p.id
         AND pt.tag_id IN (SELECT tag_id FROM content_post_tags WHERE post_id=$1)
     )
   ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC
   LIMIT 6`,
  [post.id]
);
return res.json({ item: post, tags: tagsR.rows ?? [], related: relatedR.rows ?? [] });
});

// -----------------------------
// Admin endpoints
// -----------------------------

contentRouter.use('/admin', requireAuth);
contentRouter.use('/admin', (req: any, res, next) => {
  if (req.authUser?.kind !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

// Categories
contentRouter.get('/admin/categories', async (_req, res) => {
  const r = await pool.query(
    `SELECT id, name, slug, created_at, updated_at
     FROM content_categories
     ORDER BY name ASC`
  );
  return res.json({ items: r.rows ?? [] });
});

const categorySchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  slug: Joi.string().allow('', null).max(80),
});

contentRouter.post('/admin/categories', async (req, res) => {
  const { value, error } = categorySchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const slug = await ensureUniqueSlug('content_categories', value.slug || value.name);

  const r = await pool.query(
    `INSERT INTO content_categories (name, slug)
     VALUES ($1,$2)
     ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, updated_at=now()
     RETURNING id, name, slug, created_at, updated_at`,
    [value.name, slug]
  );

  return res.json({ item: r.rows?.[0] });
});

// Tags
contentRouter.get('/admin/tags', async (_req, res) => {
  const r = await pool.query(
    `SELECT id, name, slug, created_at, updated_at
     FROM content_tags
     ORDER BY name ASC`
  );
  return res.json({ items: r.rows ?? [] });
});

const tagSchema = Joi.object({
  name: Joi.string().min(2).max(60).required(),
  slug: Joi.string().allow('', null).max(80),
});

contentRouter.post('/admin/tags', async (req, res) => {
  const { value, error } = tagSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  const slug = await ensureUniqueSlug('content_tags', value.slug || value.name);

  const r = await pool.query(
    `INSERT INTO content_tags (name, slug)
     VALUES ($1,$2)
     ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, updated_at=now()
     RETURNING id, name, slug, created_at, updated_at`,
    [value.name, slug]
  );

  return res.json({ item: r.rows?.[0] });
});

// Posts
contentRouter.get('/admin/posts', async (_req, res) => {
  const r = await pool.query(
    `SELECT id, title, slug, excerpt, status, published_at, created_at, updated_at
     FROM content_posts
     ORDER BY created_at DESC
     LIMIT 200`
  );
  return res.json({ items: r.rows ?? [] });
});

// Read (full) by id
contentRouter.get('/admin/posts/:id', async (req, res) => {
  const id = String(req.params.id ?? '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const r = await pool.query(
    `SELECT id, title, slug, excerpt, body_md, hero_image_url, seo_title, seo_description, status, published_at, category_id, created_at, updated_at
     FROM content_posts
     WHERE id=$1
     LIMIT 1`,
    [id]
  );
  const post = r.rows?.[0];
  if (!post) return res.status(404).json({ error: 'Not found' });

  const tagsR = await pool.query(
    `SELECT t.id, t.name, t.slug
     FROM content_tags t
     JOIN content_post_tags pt ON pt.tag_id=t.id
     WHERE pt.post_id=$1
     ORDER BY t.name ASC`,
    [id]
  );

  return res.json({ item: post, tags: tagsR.rows ?? [] });
});

const postSchema = Joi.object({
  title: Joi.string().min(2).max(160).required(),
  slug: Joi.string().allow('', null).max(80),
  excerpt: Joi.string().allow('', null).max(500),
  body_md: Joi.string().allow('', null).max(200000),
  hero_image_url: Joi.string().allow('', null).max(1000),
  seo_title: Joi.string().allow('', null).max(160),
  seo_description: Joi.string().allow('', null).max(200),
  status: Joi.string().valid('draft', 'published').default('draft'),
  published_at: Joi.string().allow('', null),
  category_id: Joi.string().uuid().allow('', null),
  tag_slugs: Joi.array().items(Joi.string().max(80)).max(20).default([]),
});

contentRouter.post('/admin/posts', async (req, res) => {
  const { value, error } = postSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  if (value.status === 'published') {
    const txt = [value.title, value.excerpt, value.body_md, value.seo_title, value.seo_description].filter(Boolean).join(' ');
    if (containsForbiddenTerms(txt)) {
      return res.status(400).json({ error: 'Contenuto bloccato: focus "gaming safe" (evita casino/slot/bonus e simili).' });
    }
  }

  const slug = await ensureUniqueSlug('content_posts', value.slug || value.title);

  const publishedAt =
    value.status === 'published'
      ? value.published_at
        ? new Date(value.published_at).toISOString()
        : new Date().toISOString()
      : null;

  const r = await pool.query(
    `INSERT INTO content_posts (title, slug, excerpt, body_md, hero_image_url, seo_title, seo_description, status, published_at, category_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULLIF($10,'')::uuid)
     RETURNING id, title, slug, excerpt, body_md, hero_image_url, seo_title, seo_description, status, published_at, category_id, created_at, updated_at`,
    [
      value.title,
      slug,
      value.excerpt ?? null,
      value.body_md ?? null,
      value.hero_image_url ?? null,
      value.seo_title ?? null,
      value.seo_description ?? null,
      value.status ?? 'draft',
      publishedAt,
      value.category_id ?? '',
    ]
  );
  const post = r.rows?.[0];

  // tags: ensure exist and link
  const tagSlugs: string[] = value.tag_slugs ?? [];
  if (post && tagSlugs.length) {
    for (const ts of tagSlugs) {
      const tSlug = slugify(ts);
      const tagR = await pool.query(
        `INSERT INTO content_tags (name, slug)
         VALUES ($1,$2)
         ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [ts, tSlug]
      );
      const tagId = tagR.rows?.[0]?.id;
      if (tagId) {
        await pool.query(
          `INSERT INTO content_post_tags (post_id, tag_id)
           VALUES ($1,$2)
           ON CONFLICT DO NOTHING`,
          [post.id, tagId]
        );
      }
    }
  }

  return res.json({ item: post });
});

// Update
contentRouter.put('/admin/posts/:id', async (req, res) => {
  const id = String(req.params.id ?? '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const { value, error } = postSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json({ error: error.message });

  if (value.status === 'published') {
    const txt = [value.title, value.excerpt, value.body_md, value.seo_title, value.seo_description].filter(Boolean).join(' ');
    if (containsForbiddenTerms(txt)) {
      return res.status(400).json({ error: 'Contenuto bloccato: focus "gaming safe" (evita casino/slot/bonus e simili).' });
    }
  }

  const slug = await ensureUniqueSlug('content_posts', value.slug || value.title, id);

  const publishedAt =
    value.status === 'published'
      ? value.published_at
        ? new Date(value.published_at).toISOString()
        : new Date().toISOString()
      : null;

  const r = await pool.query(
    `UPDATE content_posts
     SET title=$1,
         slug=$2,
         excerpt=$3,
         body_md=$4,
         hero_image_url=$5,
         seo_title=$6,
         seo_description=$7,
         status=$8,
         published_at=$9,
         category_id=NULLIF($10,'')::uuid,
         updated_at=now()
     WHERE id=$11
     RETURNING id, title, slug, excerpt, body_md, hero_image_url, seo_title, seo_description, status, published_at, category_id, created_at, updated_at`,
    [
      value.title,
      slug,
      value.excerpt ?? null,
      value.body_md ?? null,
      value.hero_image_url ?? null,
      value.seo_title ?? null,
      value.seo_description ?? null,
      value.status ?? 'draft',
      publishedAt,
      value.category_id ?? '',
      id,
    ]
  );
  const post = r.rows?.[0];
  if (!post) return res.status(404).json({ error: 'Not found' });

  // Replace tags
  await pool.query(`DELETE FROM content_post_tags WHERE post_id=$1`, [id]);
  const tagSlugs: string[] = value.tag_slugs ?? [];
  if (tagSlugs.length) {
    for (const ts of tagSlugs) {
      const tSlug = slugify(ts);
      const tagR = await pool.query(
        `INSERT INTO content_tags (name, slug)
         VALUES ($1,$2)
         ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name
         RETURNING id`,
        [ts, tSlug]
      );
      const tagId = tagR.rows?.[0]?.id;
      if (tagId) {
        await pool.query(
          `INSERT INTO content_post_tags (post_id, tag_id)
           VALUES ($1,$2)
           ON CONFLICT DO NOTHING`,
          [id, tagId]
        );
      }
    }
  }

  return res.json({ item: post });
});

// Delete
contentRouter.delete('/admin/posts/:id', async (req, res) => {
  const id = String(req.params.id ?? '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id' });
  await pool.query(`DELETE FROM content_posts WHERE id=$1`, [id]);
  return res.json({ ok: true });
});
