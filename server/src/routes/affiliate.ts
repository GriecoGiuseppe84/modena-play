import { Router } from 'express';
import { pool } from '../database/pg';
import { requireAuth } from '../middleware/auth';
import { anonymizeIp } from '../utils/crypto';

export const affiliateRouter = Router();

// All affiliate endpoints require auth (user/seller/admin)
affiliateRouter.use(requireAuth);

// List links owned by current user (admin can pass ?all=1)
affiliateRouter.get('/links', async (req: any, res) => {
  const all = String(req.query?.all ?? '') === '1';
  const userId = req.user.id;

  if (all && req.user.role === 'admin') {
    const r = await pool.query(
      `select * from public.affiliate_links order by created_at desc limit 500`
    );
    return res.json({ items: r.rows });
  }

  const r = await pool.query(
    `select * from public.affiliate_links where created_by_id = $1 order by created_at desc`,
    [userId]
  );
  return res.json({ items: r.rows });
});

// Create link for current user/seller/admin
affiliateRouter.post('/links', async (req: any, res) => {
  const userId = req.user.id;
  const {
    source_url,
    destination_url,
    title,
    category,
    commission_rate,
    status,
  } = req.body ?? {};

  if (!source_url || !destination_url || !title) {
    return res.status(400).json({ error: 'Missing source_url / destination_url / title' });
  }

  const r = await pool.query(
    `insert into public.affiliate_links(created_by_id, source_url, destination_url, title, category, commission_rate, status)
     values ($1,$2,$3,$4,$5,$6,$7)
     returning *`,
    [
      userId,
      String(source_url),
      String(destination_url),
      String(title),
      String(category ?? ''),
      Number(commission_rate ?? 0),
      String(status ?? 'active'),
    ]
  );
  return res.status(201).json({ item: r.rows[0] });
});

// Basic click tracking endpoint (public). Logs and redirects.
affiliateRouter.get('/r/:id', async (req: any, res) => {
  const linkId = String(req.params.id || '');
  if (!linkId) return res.status(400).send('Missing link id');

  const lr = await pool.query(`select destination_url from public.affiliate_links where id = $1 limit 1`, [linkId]);
  const dest = lr.rows?.[0]?.destination_url;
  if (!dest) return res.status(404).send('Not found');

  const ip = anonymizeIp(String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? ''));
  const ua = String(req.headers['user-agent'] ?? '');
  const referer = String(req.headers['referer'] ?? '');
  const visitorId = String(req.cookies?.visitor_id ?? '');

  try {
    await pool.query(
      `insert into public.link_clicks(link_id, visitor_id, referer, user_agent, ip_anonymized)
       values ($1,$2,$3,$4,$5)`,
      [linkId, visitorId || null, referer || null, ua || null, ip || null]
    );
    await pool.query(`update public.affiliate_links set click_count = coalesce(click_count,0) + 1, updated_at = now() where id=$1`, [linkId]);
  } catch {
    // don't block redirect on logging errors
  }

  return res.redirect(302, dest);
});
