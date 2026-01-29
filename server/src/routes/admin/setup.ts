import { Router } from 'express';
import { pool, isDatabaseConfigured, safeDbInfo } from '../../database/pg';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

/**
 * Small helper: run a query with optional timeout safety using statement_timeout
 * (the pool already sets statement_timeout on connect, but here we keep control per-step)
 */
async function q<T = any>(text: string, params: any[] = []) {
  return pool.query<T>(text, params);
}

router.use(requireAuth);
router.use((req: any, res, next) => {
  if (req.authUser?.kind !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

async function ensureBaseSchema() {
  // Extension needed for gen_random_uuid()
  await q(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await q(`
    CREATE TABLE IF NOT EXISTS admin_setup_state (
      id integer PRIMARY KEY DEFAULT 1,
      completed boolean NOT NULL DEFAULT false,
      completed_at timestamptz NULL
    );
  `);

  await q(`
    INSERT INTO admin_setup_state (id, completed)
    VALUES (1, false)
    ON CONFLICT (id) DO NOTHING;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS system_config (
      id integer PRIMARY KEY DEFAULT 1,
      app_name text NOT NULL DEFAULT 'Modena Play',
      admin_email text NOT NULL DEFAULT '',
      currency text NOT NULL DEFAULT 'EUR',
      timezone text NOT NULL DEFAULT 'Europe/Rome',
      max_clickthrough_per_day integer NOT NULL DEFAULT 500,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await q(`
    INSERT INTO system_config (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS affiliate_links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      source_url text NOT NULL DEFAULT '',
      destination_url text NOT NULL,
      category text NOT NULL DEFAULT 'general',
      click_count integer NOT NULL DEFAULT 0,
      conversion_count integer NOT NULL DEFAULT 0,
      commission_rate numeric NOT NULL DEFAULT 0.05,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

// ✅ risolve il 404 su GET /api/admin/setup (il frontend spesso lo chiama come "ping")
router.get('/', async (_req, res) => {
  return res.json({ ok: true, db: safeDbInfo() });
});

router.get('/status', async (_req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.status(500).json({ error: 'DB not configured', db: safeDbInfo() });
    }

    // Non forzare schema se DB è down: se fallisce, torna 503 con info
    await ensureBaseSchema();

    const r = await q<{ completed: boolean }>(`SELECT completed FROM admin_setup_state WHERE id=1`);
    return res.json({ ok: true, completed: Boolean(r.rows?.[0]?.completed) });
  } catch (e: any) {
    return res.status(503).json({ ok: false, error: e?.message ?? 'DB unreachable', db: safeDbInfo() });
  }
});

router.post('/test-db', async (_req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.status(500).json({ ok: false, error: 'DB not configured', db: safeDbInfo() });
    }

    // Query banale: se qui fallisce, DB non raggiungibile / auth / SSL
    const r = await q<{ ok: number }>('SELECT 1 as ok');
    return res.json({ ok: true, db: r.rows?.[0]?.ok === 1 });
  } catch (e: any) {
    return res.status(503).json({ ok: false, error: e?.message ?? 'DB connection failed', db: safeDbInfo() });
  }
});

router.post('/run-migrations', async (_req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.status(500).json({ ok: false, error: 'DB not configured', db: safeDbInfo() });
    }

    await ensureBaseSchema();

    // ritorna anche le tabelle create/verificate (utile per debug)
    return res.json({
      ok: true,
      migrated: true,
      tables: ['admin_setup_state', 'system_config', 'affiliate_links'],
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? 'Migrations failed', db: safeDbInfo() });
  }
});

router.post('/save-config', async (req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.status(500).json({ ok: false, error: 'DB not configured', db: safeDbInfo() });
    }

    await ensureBaseSchema();
    const { appName, adminEmail, currency, timezone, maxClickThroughPerDay } = req.body ?? {};

    await q(
      `
      UPDATE system_config
      SET app_name = COALESCE($1, app_name),
          admin_email = COALESCE($2, admin_email),
          currency = COALESCE($3, currency),
          timezone = COALESCE($4, timezone),
          max_clickthrough_per_day = COALESCE($5, max_clickthrough_per_day),
          updated_at = now()
      WHERE id = 1
      `,
      [
        typeof appName === 'string' ? appName : null,
        typeof adminEmail === 'string' ? adminEmail : null,
        typeof currency === 'string' ? currency : null,
        typeof timezone === 'string' ? timezone : null,
        Number.isFinite(Number(maxClickThroughPerDay)) ? Number(maxClickThroughPerDay) : null,
      ]
    );

    const readBack = await q(`SELECT app_name, admin_email, currency, timezone, max_clickthrough_per_day FROM system_config WHERE id=1`);
    return res.json({ ok: true, config: readBack.rows?.[0] ?? null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? 'Save config failed', db: safeDbInfo() });
  }
});

router.post('/complete', async (_req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.status(500).json({ ok: false, error: 'DB not configured', db: safeDbInfo() });
    }

    await ensureBaseSchema();

    const state = await q<{ completed: boolean }>(`SELECT completed FROM admin_setup_state WHERE id=1`);
    if (Boolean(state.rows?.[0]?.completed)) {
      // utile se premi due volte “Complete setup”
      return res.status(409).json({ ok: false, error: 'Setup already completed' });
    }

    await q(`UPDATE admin_setup_state SET completed=true, completed_at=now() WHERE id=1`);
    return res.json({ ok: true, completed: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? 'Complete setup failed', db: safeDbInfo() });
  }
});

export default router;
