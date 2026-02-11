import { Router } from 'express';
import Joi from 'joi';
import crypto from 'node:crypto';
import { signup, login } from '../controllers/publicAuthController';
import { pool } from '../database/pg';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);

// -----------------------------
// Page views (public)
// -----------------------------
router.post('/pageview', async (req, res) => {
  const schema = Joi.object({
    path: Joi.string().min(1).max(500).required(),
    title: Joi.string().max(200).allow('', null),
    utm_source: Joi.string().max(120).allow('', null),
    utm_medium: Joi.string().max(120).allow('', null),
    utm_campaign: Joi.string().max(120).allow('', null),
    utm_content: Joi.string().max(120).allow('', null),
    utm_term: Joi.string().max(120).allow('', null),
    referrer: Joi.string().max(800).allow('', null),
  });

  const { error, value } = schema.validate(req.body ?? {});
  if (error) return res.status(400).json({ error: error.message });

  const ip = String((req as any).ip ?? '');
  const ip_hash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
  const ua = String(req.headers['user-agent'] ?? '').slice(0, 500);

  await pool.query(
    `INSERT INTO page_views (path, title, referrer, user_agent, ip_hash, utm_source, utm_medium, utm_campaign, utm_content, utm_term)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      value.path,
      value.title ?? null,
      value.referrer ?? null,
      ua || null,
      ip_hash,
      value.utm_source ?? null,
      value.utm_medium ?? null,
      value.utm_campaign ?? null,
      value.utm_content ?? null,
      value.utm_term ?? null,
    ]
  );

  return res.json({ ok: true });
});

// -----------------------------
// Newsletter subscribers (public)
// -----------------------------
router.post('/subscribe', async (req, res) => {
  const schema = Joi.object({ email: Joi.string().email().required() });
  const { error, value } = schema.validate(req.body ?? {});
  if (error) return res.status(400).json({ error: error.message });

  await pool.query(
    `INSERT INTO newsletter_subscribers (email, is_active)
     VALUES ($1, true)
     ON CONFLICT (email) DO UPDATE SET is_active=true, updated_at=now()`,
    [String(value.email).toLowerCase()]
  );

  return res.json({ ok: true });
});

// -----------------------------
// Trending (public): top pages/posts by views & clicks
// GET /api/public/trending?days=7
// -----------------------------
router.get('/trending', async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days ?? 7), 1), 90);
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // pages by views
  const pv = await pool.query(
    `SELECT path, COUNT(*)::int as views
     FROM page_views
     WHERE viewed_at >= $1::timestamptz
     GROUP BY 1
     ORDER BY views DESC
     LIMIT 20`,
    [from]
  );

  // clicks by page_path
  const ck = await pool.query(
    `SELECT COALESCE(page_path,'(unknown)') as path, COUNT(*)::int as clicks
     FROM affiliate_clicks
     WHERE clicked_at >= $1::timestamptz
     GROUP BY 1
     ORDER BY clicks DESC
     LIMIT 20`,
    [from]
  );

  // trending posts (blog) by views on /blog/:slug
  const posts = await pool.query(
    `SELECT p.id, p.title, p.slug, p.excerpt, p.hero_image_url,
            COALESCE(v.views,0)::int as views,
            COALESCE(c.clicks,0)::int as clicks
     FROM content_posts p
     LEFT JOIN (
       SELECT regexp_replace(path, '^/blog/', '') as slug, COUNT(*)::int as views
       FROM page_views
       WHERE viewed_at >= $1::timestamptz AND path LIKE '/blog/%'
       GROUP BY 1
     ) v ON v.slug = p.slug
     LEFT JOIN (
       SELECT regexp_replace(COALESCE(page_path,''), '^/blog/', '') as slug, COUNT(*)::int as clicks
       FROM affiliate_clicks
       WHERE clicked_at >= $1::timestamptz AND COALESCE(page_path,'') LIKE '/blog/%'
       GROUP BY 1
     ) c ON c.slug = p.slug
     WHERE p.status='published'
     ORDER BY (COALESCE(v.views,0) + COALESCE(c.clicks,0)*2) DESC, p.published_at DESC NULLS LAST
     LIMIT 10`,
    [from]
  );

  return res.json({
    days,
    from,
    trendingPosts: posts.rows ?? [],
    topPagesByViews: pv.rows ?? [],
    topPagesByClicks: ck.rows ?? [],
  });
});

export default router;
