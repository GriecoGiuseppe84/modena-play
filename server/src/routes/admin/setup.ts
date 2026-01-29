import { Router } from 'express';
import { pool, isDatabaseConfigured, safeDbInfo } from '../../database/pg';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.use(requireAuth);
router.use((req: any, res, next) => {
  if (req.authUser?.kind !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

async function ensureBaseSchema() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_setup_state (
      id integer PRIMARY KEY DEFAULT 1,
      completed boolean NOT NULL DEFAULT false,
      completed_at timestamptz NULL
    );
  `);

  await pool.query(`
    INSERT INTO admin_setup_state (id, completed)
    VALUES (1, false)
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
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

  await pool.query(`
    INSERT INTO system_config (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
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

// ✅ risolve il 404 su GET /api/admin/setup
router.get('/', async (_req, res) => {
  return res.json({ ok: true, db: safeDbInfo() });
});

router.get('/status', async (_req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.status(500).json({ ok: false, error: 'DB not configured', db: safeDbInfo() });
    }

    await ensureBaseSchema();

    const r = await pool.query(`SELECT completed FROM admin_setup_state WHERE id=1`);
    const completed = Boolean((r.rows?.[0] as any)?.completed);

    return res.json({ ok: true, completed });
  } catch (e: any) {
    return res.status(503).json({ ok: false, error: e?.message ?? 'DB unreachable', db: safeDbInfo() });
  }
});

router.post('/test-db', async (_req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.status(500).json({ ok: false, error: 'DB not configured', db: safeDbInfo() });
    }
    const r = await pool.query('SELECT 1 as ok');
    return res.json({ ok: true, db: (r.rows?.[0] as any)?.ok === 1 });
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

    await pool.query(
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

    const readBack = await pool.query(
      `SELECT app_name, admin_email, currency, timezone, max_clickthrough_per_day FROM system_config WHERE id=1`
    );

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

    const state = await pool.query(`SELECT completed FROM admin_setup_state WHERE id=1`);
    const completed = Boolean((state.rows?.[0] as any)?.completed);
    if (completed) {
      return res.status(409).json({ ok: false, error: 'Setup already completed' });
    }

    await pool.query(`UPDATE admin_setup_state SET completed=true, completed_at=now() WHERE id=1`);
    return res.json({ ok: true, completed: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? 'Complete setup failed', db: safeDbInfo() });
  }
});

export default router;
