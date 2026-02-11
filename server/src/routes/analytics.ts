import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { pool } from '../database/pg';

export const analyticsRouter = Router();

/**
 * Analytics endpoints (affiliate-focused).
 * Uses Postgres (Neon) directly.
 * All endpoints require auth.
 */
analyticsRouter.use(requireAuth);

// GET /api/analytics/summary?from=ISO&to=ISO
analyticsRouter.get('/summary', async (req: any, res) => {
  try {
    const isAdmin = req.authUser?.kind === 'admin';

    // Optional range (defaults last 30 days)
    const to = String(req.query.to ?? new Date().toISOString());
    const from = String(
      req.query.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    );

    // totals
    const linksR = await pool.query(
      `SELECT 
        COUNT(*)::int as total_links,
        SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int as active_links,
        COALESCE(SUM(click_count),0)::int as total_clicks
       FROM affiliate_links`
    );

    const totals = linksR.rows?.[0] ?? { total_links: 0, active_links: 0, total_clicks: 0 };

    // clicks in range
    const clicksR = await pool.query(
      `SELECT COUNT(*)::int as clicks
       FROM affiliate_clicks
       WHERE clicked_at >= $1::timestamptz AND clicked_at <= $2::timestamptz`,
      [from, to]
    );

    const clicks = Number(clicksR.rows?.[0]?.clicks ?? 0);


// views in range (pageviews)
let views = 0;
try {
  const vR = await pool.query(
    `SELECT COUNT(*)::int as views
     FROM page_views
     WHERE viewed_at >= $1::timestamptz AND viewed_at <= $2::timestamptz`,
    [from, to]
  );
  views = Number(vR.rows?.[0]?.views ?? 0);
} catch {
  // table might not exist yet (older schema)
  views = 0;
}

    // revenue (optional column)
    const revR = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(revenue,0)),0)::numeric as revenue
       FROM affiliate_clicks
       WHERE clicked_at >= $1::timestamptz AND clicked_at <= $2::timestamptz`,
      [from, to]
    );
    const revenue = Number(revR.rows?.[0]?.revenue ?? 0);

    // top links (admin only)
    let topLinks: any[] = [];
    if (isAdmin) {
      const topR = await pool.query(
        `SELECT l.id, l.title, l.slug, COUNT(c.id)::int as clicks
         FROM affiliate_links l
         LEFT JOIN affiliate_clicks c ON c.link_id = l.id
           AND c.clicked_at >= $1::timestamptz AND c.clicked_at <= $2::timestamptz
         GROUP BY l.id
         ORDER BY clicks DESC
         LIMIT 10`,
        [from, to]
      );
      topLinks = topR.rows ?? [];
    }

    // top pages (based on click page_path)
    const pagesR = await pool.query(
      `SELECT COALESCE(page_path,'(unknown)') as page, COUNT(*)::int as clicks
       FROM affiliate_clicks
       WHERE clicked_at >= $1::timestamptz AND clicked_at <= $2::timestamptz
       GROUP BY 1
       ORDER BY clicks DESC
       LIMIT 10`,
      [from, to]
    );

    // daily series last 30/90? give last 30 in range
    const seriesR = await pool.query(
      `SELECT date_trunc('day', clicked_at) as day, COUNT(*)::int as clicks, COALESCE(SUM(COALESCE(revenue,0)),0)::numeric as revenue
       FROM affiliate_clicks
       WHERE clicked_at >= $1::timestamptz AND clicked_at <= $2::timestamptz
       GROUP BY 1
       ORDER BY 1 ASC`,
      [from, to]
    );

    return res.json({
      scope: isAdmin ? 'global' : 'user',
      from,
      to,
      totalLinks: Number(totals.total_links ?? 0),
      activeLinks: Number(totals.active_links ?? 0),
      totalClicks: Number(totals.total_clicks ?? 0),
      clicks,
      revenue,
      views,
      conversionRate: views > 0 ? Math.round((clicks / views) * 10000) / 100 : 0,
      topLinks,
      topPages: pagesR.rows ?? [],
      series: seriesR.rows ?? [],
    });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('[analytics] summary error:', e?.message || e);
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
});
