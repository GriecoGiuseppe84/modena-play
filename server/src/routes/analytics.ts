import { Router } from 'express';
import { pool } from '../database/pg';
import { requireAuth } from '../middleware/requireAuth';

export const analyticsRouter = Router();

// Simple analytics endpoint (focused on affiliate tracking).
// Kept for backward compatibility with older URLs.

analyticsRouter.use(requireAuth);

analyticsRouter.get('/summary', async (req: any, res) => {
  const isAdmin = req.authUser?.kind === 'admin';

  const links = await pool.query(`SELECT id, click_count, is_active FROM affiliate_links LIMIT 1000`);
  const list = links.rows ?? [];
  const totalLinks = list.length;
  const activeLinks = list.filter((l: any) => l.is_active).length;
  const totalClicks = list.reduce((a: number, l: any) => a + Number(l.click_count ?? 0), 0);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last7 = await pool.query(`SELECT count(*)::int as c FROM affiliate_clicks WHERE clicked_at >= $1`, [since.toISOString()]);
  const last7DaysClicks = Number(last7.rows?.[0]?.c ?? 0);

  return res.json({
    scope: isAdmin ? 'global' : 'public',
    totalLinks,
    activeLinks,
    totalClicks,
    last7DaysClicks,
  });
});
