import { pool } from '../database/pg';

export async function checkSetupNotCompleted(_req: any, res: any, next: any) {
  const r = await pool.query("select config_value from public.admin_config where config_key = 'setup_completed' limit 1");
  const completed = r.rows?.[0]?.config_value?.completed === true;
  if (completed) return res.status(403).json({ error: 'Setup già completato' });
  return next();
}
