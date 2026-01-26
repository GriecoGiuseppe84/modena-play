import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../database/supabase';
import { schemas } from '../utils/validators';

export const analyticsRouter = Router();

analyticsRouter.get('/summary', requireAuth(), async (req: any, res) => {
  const from = String(req.query.from ?? '');
  const to = String(req.query.to ?? '');
  const { error } = schemas.analyticsRange.validate({ from, to });
  if (error) return res.status(400).json({ error: 'Invalid date range' });

  const { data, error: rpcErr } = await supabaseAdmin.rpc('mg_analytics_summary', {
    p_user_id: req.auth.role === 'admin' ? null : req.auth.userId,
    p_from: from,
    p_to: to,
  });

  if (rpcErr) return res.status(500).json({ error: 'Analytics failed' });
  res.json(data);
});

analyticsRouter.get('/top-links', requireAuth(), async (req: any, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
  const q = supabaseAdmin
    .from('affiliate_links')
    .select('id,title,click_count,conversion_count,conversion_rate')
    .order('click_count', { ascending: false })
    .limit(limit);

  const { data, error } = req.auth.role === 'admin' ? await q : await q.eq('created_by_id', req.auth.userId);
  if (error) return res.status(500).json({ error: 'Failed to load top links' });
  res.json({ items: data ?? [] });
});
