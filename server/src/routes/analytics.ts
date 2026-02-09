import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { supabaseService } from '../lib/supabase';

export const analyticsRouter = Router();

// Simple analytics endpoint (currently focused on affiliate tracking).
// NOTE: we keep it separate from /api/affiliate to avoid breaking older URLs.

function requireService(res: any) {
  if (!supabaseService) {
    res.status(500).json({
      error:
        'Analytics requires SUPABASE_SERVICE_ROLE_KEY on the API service (Render) to query aggregated data safely.',
    });
    return null;
  }
  return supabaseService;
}

analyticsRouter.use(requireAuth);

analyticsRouter.get('/summary', async (req: any, res) => {
  const service = requireService(res);
  if (!service) return;

  // Admin sees global numbers; other roles just see public-friendly aggregates.
  const isAdmin = req.authUser?.kind === 'admin';

  const { data: links, error } = await service
    .from('affiliate_links')
    .select('id, click_count, is_active')
    .limit(1000);

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

  return res.json({
    scope: isAdmin ? 'global' : 'public',
    totalLinks,
    activeLinks,
    totalClicks,
    last7DaysClicks: Number(last7DaysClicks ?? 0),
  });
});
