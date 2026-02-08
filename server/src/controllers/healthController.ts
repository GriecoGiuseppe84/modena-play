import type { Request, Response } from 'express';
import { pool, isDatabaseConfigured, databaseConfigHint } from '../database/pg';

export async function healthHandler(_req: Request, res: Response) {
  const timestamp = new Date().toISOString();

  // 1) Postgres (DATABASE_URL) è il requisito principale per l'MVP.
  if (!isDatabaseConfigured()) {
    return res.status(500).json({
      status: 'error',
      database: 'missing',
      error: databaseConfigHint(),
      timestamp,
    });
  }

  try {
    // ping rapido DB + lettura setup status
    const start = Date.now();
    await Promise.race([
      pool.query('SELECT 1 as ok'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('DB connection timeout')), 7_000)),
    ]);

    const reg = await pool.query(`SELECT to_regclass('public.admin_setup_state') as t`);
    const hasSetupTable = Boolean(reg.rows?.[0]?.t);
    let completed: boolean | null = null;
    if (hasSetupTable) {
      const st = await pool.query('SELECT completed FROM admin_setup_state WHERE id=1');
      completed = Boolean(st.rows?.[0]?.completed);
    }

    return res.json({
      status: 'ok',
      database: 'connected',
      setup: { table: hasSetupTable ? 'present' : 'missing', completed },
      tookMs: Date.now() - start,
      timestamp,
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const isTimeout = msg.toLowerCase().includes('timeout');
    return res.status(isTimeout ? 504 : 500).json({
      status: 'error',
      database: 'error',
      error: msg,
      timestamp,
    });
  }
}
