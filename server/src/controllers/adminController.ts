import type { Request, Response } from 'express';
import { pool, pgNow } from '../database/pg';
import { runMigrations } from '../database/migrate';
import Joi from 'joi';

const createLinkSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  source_url: Joi.string().uri({ scheme: [/https?/] }).required(),
  destination_url: Joi.string().uri({ scheme: [/https?/] }).required(),
  category: Joi.string().min(1).max(80).required(),
  commission_rate: Joi.number().min(0).max(1).required(),
  status: Joi.string().valid('active', 'paused', 'archived').required(),
});

const updateLinkSchema = createLinkSchema.fork(
  ['title','source_url','destination_url','category','commission_rate','status'],
  (s) => s.optional()
);

export async function setupStatus(_req: Request, res: Response) {
  const r = await pool.query("select config_value from public.admin_config where config_key='setup_completed' limit 1");
  const completed = r.rows?.[0]?.config_value?.completed === true;
  return res.json({ completed });
}

export async function testDb(_req: Request, res: Response) {
  const now = await pgNow();
  return res.json({ ok: true, now });
}

export async function runDbMigrations(_req: Request, res: Response) {
  await runMigrations();
  return res.json({ ok: true });
}

export async function savePlatformConfig(req: Request & { user?: any }, res: Response) {
  const body = req.body ?? {};
  const payload = {
    appName: String(body.appName ?? 'Modena Play').trim(),
    adminEmail: String(body.adminEmail ?? req.user?.email ?? '').trim().toLowerCase(),
    currency: String(body.currency ?? 'EUR'),
    timezone: String(body.timezone ?? 'Europe/Rome'),
    maxClickThroughPerDay: Number(body.maxClickThroughPerDay ?? 500),
  };

  await pool.query(
    `insert into public.admin_config(config_key, config_value, updated_by, updated_at)
     values ($1,$2,$3, now())
     on conflict (config_key) do update set config_value=excluded.config_value, updated_by=excluded.updated_by, updated_at=now()`,
    ['platform_config', payload, req.user?.id ?? null]
  );

  return res.json({ ok: true, config: payload });
}

export async function healthInfo(_req: Request, res: Response) {
  const now = await pgNow();
  return res.json({
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString(),
    now,
    environment: process.env.NODE_ENV ?? 'development',
  });
}

export async function completeSetup(req: Request & { user?: any }, res: Response) {
  await pool.query(
    `insert into public.admin_config(config_key, config_value, updated_by, updated_at)
     values ($1,$2,$3, now())
     on conflict (config_key) do update set config_value=excluded.config_value, updated_by=excluded.updated_by, updated_at=now()`,
    ['setup_completed', { completed: true }, req.user?.id ?? null]
  );

  await pool.query(
    `insert into public.audit_log(action, actor_id, resource_type, resource_id, changes)
     values ($1,$2,$3,$4,$5)`,
    ['SETUP_COMPLETED', req.user?.id ?? null, 'platform', req.user?.id ?? null, { setup_completed: true }]
  );

  return res.json({ completed: true });
}

export async function listLinks(req: Request & { user?: any }, res: Response) {
  const r = await pool.query(
    `select * from public.affiliate_links where created_by_id = $1 order by created_at desc`,
    [req.user!.id]
  );
  return res.json({ items: r.rows });
}

export async function createLink(req: Request & { user?: any }, res: Response) {
  const { error, value } = createLinkSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const r = await pool.query(
    `insert into public.affiliate_links(created_by_id, source_url, destination_url, title, category, commission_rate, status)
     values ($1,$2,$3,$4,$5,$6,$7)
     returning *`,
    [req.user!.id, value.source_url, value.destination_url, value.title, value.category, value.commission_rate, value.status]
  );
  return res.status(201).json({ item: r.rows[0] });
}

export async function updateLink(req: Request & { user?: any }, res: Response) {
  const { error, value } = updateLinkSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const id = String(req.params.id);
  const fields: string[] = [];
  const vals: any[] = [];
  let i = 1;

  const map: Record<string, string> = {
    title: 'title',
    source_url: 'source_url',
    destination_url: 'destination_url',
    category: 'category',
    commission_rate: 'commission_rate',
    status: 'status',
  };

  for (const k of Object.keys(map)) {
    if ((value as any)[k] !== undefined) {
      fields.push(`${map[k]} = $${i++}`);
      vals.push((value as any)[k]);
    }
  }
  fields.push(`updated_at = now()`);

  vals.push(req.user!.id);
  const ownerParam = i++;
  vals.push(id);
  const idParam = i++;

  const sql = `update public.affiliate_links
               set ${fields.join(', ')}
               where created_by_id = $${ownerParam} and id = $${idParam}
               returning *`;

  const r = await pool.query(sql, vals);
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  return res.json({ item: r.rows[0] });
}

export async function deleteLink(req: Request & { user?: any }, res: Response) {
  const id = String(req.params.id);
  const r = await pool.query(
    `delete from public.affiliate_links where created_by_id = $1 and id = $2 returning id`,
    [req.user!.id, id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
  return res.json({ ok: true });
}

export async function analytics(req: Request & { user?: any }, res: Response) {
  const uid = req.user!.id;

  const clicksToday = await pool.query(
    `select count(*)::int as n
     from public.link_clicks c
     join public.affiliate_links l on l.id = c.link_id
     where l.created_by_id = $1 and c.clicked_at >= date_trunc('day', now())`,
    [uid]
  );

  const revenueMonth = await pool.query(
    `select coalesce(sum(commission_earned), 0)::numeric as n
     from public.conversions cv
     join public.affiliate_links l on l.id = cv.link_id
     where l.created_by_id = $1 and cv.created_at >= date_trunc('month', now())`,
    [uid]
  );

  const conv = await pool.query(
    `select
       (select count(*)::int from public.conversions cv join public.affiliate_links l on l.id=cv.link_id where l.created_by_id=$1) as conversions,
       (select count(*)::int from public.link_clicks c join public.affiliate_links l on l.id=c.link_id where l.created_by_id=$1) as clicks`,
    [uid]
  );

  const clicks = conv.rows[0].clicks || 0;
  const conversions = conv.rows[0].conversions || 0;
  const conversionRate = clicks > 0 ? (conversions / clicks) : 0;

  return res.json({
    clicksToday: clicksToday.rows[0].n,
    revenueThisMonth: String(revenueMonth.rows[0].n),
    conversionRate,
  });
}
