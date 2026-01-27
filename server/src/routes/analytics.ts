import { Router } from 'express';
import { pool } from '../database/pg';
import { requireAuth } from '../middleware/auth';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

// Summary cards for current user (or admin ?all=1)
analyticsRouter.get('/summary', async (req: any, res) => {
  const all = String(req.query?.all ?? '') === '1';
  const userId = req.user.id;

  const where = all && req.user.role === 'admin' ? '' : 'where l.created_by_id = $1';
  const params = all && req.user.role === 'admin' ? [] : [userId];

  const clicks = await pool.query(
    `select coalesce(sum(l.click_count),0)::int as clicks
     from public.affiliate_links l ${where}`,
    params
  );

  const conv = await pool.query(
    `select coalesce(count(*),0)::int as conversions,
            coalesce(sum(c.commission_earned),0)::numeric as commission
     from public.conversions c
     join public.affiliate_links l on l.id = c.link_id
     ${where}`,
    params
  );

  const clicksN = Number(clicks.rows?.[0]?.clicks ?? 0);
  const convN = Number(conv.rows?.[0]?.conversions ?? 0);
  const rate = clicksN > 0 ? (convN / clicksN) : 0;

  return res.json({
    clicks: clicksN,
    conversions: convN,
    conversionRate: rate,
    commission: String(conv.rows?.[0]?.commission ?? '0'),
  });
});
