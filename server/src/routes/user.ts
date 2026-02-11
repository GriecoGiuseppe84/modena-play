import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/requireAuth';
import { pool } from '../database/pg';

export const userRouter = Router();
userRouter.use(requireAuth);

function ensureUser(req: any, res: any) {
  const u = req.authUser;
  if (!u || u.kind !== 'user') {
    res.status(403).json({ error: 'Only user accounts can access this resource' });
    return null;
  }
  return u;
}

// GET /api/user/favorites/posts
userRouter.get('/favorites/posts', async (req: any, res) => {
  const u = ensureUser(req, res);
  if (!u) return;
  const r = await pool.query(
    `SELECT p.id, p.title, p.slug, p.excerpt, p.hero_image_url, f.created_at as favorited_at
     FROM user_favorite_posts f
     JOIN content_posts p ON p.id = f.post_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC
     LIMIT 50`,
    [u.sub]
  );
  return res.json({ items: r.rows ?? [] });
});

// POST /api/user/favorites/posts/toggle  { post_id | slug }
userRouter.post('/favorites/posts/toggle', async (req: any, res) => {
  const u = ensureUser(req, res);
  if (!u) return;

  const schema = Joi.object({
    post_id: Joi.string().uuid().optional(),
    slug: Joi.string().min(1).max(120).optional(),
  }).or('post_id', 'slug');

  const { error, value } = schema.validate(req.body ?? {});
  if (error) return res.status(400).json({ error: error.message });

  let postId = value.post_id as string | undefined;
  if (!postId) {
    const pr = await pool.query(`SELECT id FROM content_posts WHERE slug=$1 LIMIT 1`, [String(value.slug).toLowerCase()]);
    postId = pr.rows?.[0]?.id;
  }
  if (!postId) return res.status(404).json({ error: 'Post not found' });

  // toggle
  const exists = await pool.query(
    `SELECT 1 FROM user_favorite_posts WHERE user_id=$1 AND post_id=$2 LIMIT 1`,
    [u.sub, postId]
  );
  if ((exists.rows?.length ?? 0) > 0) {
    await pool.query(`DELETE FROM user_favorite_posts WHERE user_id=$1 AND post_id=$2`, [u.sub, postId]);
    return res.json({ ok: true, favorited: false });
  }

  await pool.query(
    `INSERT INTO user_favorite_posts (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [u.sub, postId]
  );
  return res.json({ ok: true, favorited: true });
});
