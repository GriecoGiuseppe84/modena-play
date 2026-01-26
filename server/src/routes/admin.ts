import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../database/supabase';
import { schemas } from '../utils/validators';
import { ENV } from '../config/env';

export const adminRouter = Router();

// --- Setup status ---
adminRouter.get('/setup/status', requireAuth('admin'), async (_req, res) => {
  const { data } = await supabaseAdmin.from('admin_config').select('config_value').eq('config_key', 'setup_status').maybeSingle();
  const completed = Boolean(data?.config_value?.completed);
  res.json({ completed, raw: data?.config_value ?? null });
});

// Step 1: Supabase connectivity check
adminRouter.post('/setup/step1', requireAuth('admin'), async (_req, res) => {
  const { error } = await supabaseAdmin.rpc('mg_now');
  if (error) return res.status(500).json({ ok: false, error: 'Supabase RPC failed. Check SUPABASE_URL and SUPABASE_SERVICE_KEY.' });
  res.json({ ok: true });
});

// Step 2: Verify tables exist (and seed admin profile if possible)
adminRouter.post('/setup/step2', requireAuth('admin'), async (_req, res) => {
  // We can't run arbitrary DDL over supabase-js reliably.
  // So we verify existence and guide the admin to apply the SQL if missing.
  const required = ['profiles', 'affiliate_links', 'link_clicks', 'conversions', 'admin_config', 'audit_log'];
  const missing: string[] = [];

  for (const t of required) {
    const { error } = await supabaseAdmin.from(t).select('id').limit(1);
    if (error) missing.push(t);
  }

  if (missing.length) {
    return res.status(412).json({
      ok: false,
      error: 'Database schema not applied yet.',
      missingTables: missing,
      action: 'Paste server/src/database/migrations/001_init_schema.sql in Supabase SQL editor, then retry Step 2.',
    });
  }

  // Ensure admin profile exists: match by ADMIN_EMAIL
  const { data: prof } = await supabaseAdmin.from('profiles').select('id,email,role').eq('email', ENV.ADMIN_EMAIL).maybeSingle();
  if (!prof) {
    // If there's no auth.users row for this email yet, we still insert a profile stub with a deterministic UUID is not possible.
    // We keep this as a "soft seed": admin can sign up in Supabase Auth using the same email and it will link via trigger.
    await supabaseAdmin.from('profiles').insert({
      id: crypto.randomUUID(),
      email: ENV.ADMIN_EMAIL,
      role: 'admin',
      is_active: true,
    });
  } else if (prof.role !== 'admin') {
    await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', prof.id);
  }

  res.json({ ok: true });
});

// Step 3: Save platform config
adminRouter.post('/setup/step3', requireAuth('admin'), async (req: any, res) => {
  const { error, value } = schemas.setupConfig.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ error: 'Invalid input', details: error.details.map((d) => d.message) });

  const payload = {
    app_name: value.appName,
    admin_email: value.adminEmail,
    currency: value.currency,
    timezone: value.timezone,
    max_clickthrough_per_day: value.maxClickthroughPerDay,
  };

  await supabaseAdmin.from('admin_config').upsert({
    config_key: 'platform_settings',
    config_value: payload,
    updated_by: req.auth.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'config_key' });

  await supabaseAdmin.from('audit_log').insert({
    action: 'ADMIN_CONFIG_UPDATE',
    actor_id: req.auth.userId,
    resource_type: 'admin_config',
    resource_id: 'platform_settings',
    changes: payload,
  });

  res.json({ ok: true });
});

// Step 5: Complete setup
adminRouter.post('/setup/complete', requireAuth('admin'), async (req: any, res) => {
  const value = { completed: true, completed_at: new Date().toISOString(), version: '1.0' };

  await supabaseAdmin.from('admin_config').upsert({
    config_key: 'setup_status',
    config_value: value,
    updated_by: req.auth.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'config_key' });

  await supabaseAdmin.from('audit_log').insert({
    action: 'ADMIN_SETUP_COMPLETE',
    actor_id: req.auth.userId,
    resource_type: 'admin_config',
    resource_id: 'setup_status',
    changes: value,
  });

  res.json({ ok: true });
});
