import { Router } from 'express';
import { supabaseAdmin } from '../database/supabase';
import type { ApiHealth } from '../types';
import { ENV } from '../config/env';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let db: ApiHealth['database'] = 'connected';
  try {
    const { error } = await supabaseAdmin.rpc('mg_now');
    if (error) db = 'disconnected';
  } catch {
    db = 'disconnected';
  }

  const payload: ApiHealth = {
    status: db === 'connected' ? 'ok' : 'degraded',
    database: db,
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
  };
  res.json(payload);
});
