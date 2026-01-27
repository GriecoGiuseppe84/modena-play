import type { Request, Response } from 'express';
import { getSupabaseAdmin } from '../database/supabase';

export async function healthHandler(_req: Request, res: Response) {
  try {
    const client = getSupabaseAdmin();

    // Best-effort DB ping: try selecting from a table that should exist after setup.
    // If schema isn't initialized yet, we still confirm the client is configured.
    const { error } = await client.from('admin_config').select('id').limit(1);

    if (error) {
      // If table missing (setup not run), still show "configured" but flag schema.
      const msg = String(error.message || '');
      const schemaNotReady =
        msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist');

      return res.status(schemaNotReady ? 200 : 500).json({
        status: schemaNotReady ? 'ok' : 'error',
        database: schemaNotReady ? 'configured' : 'error',
        schema: schemaNotReady ? 'missing' : 'unknown',
        error: schemaNotReady ? undefined : error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      status: 'ok',
      database: 'connected',
      schema: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', error: String(e?.message || e), timestamp: new Date().toISOString() });
  }
}
