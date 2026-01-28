import { Router } from 'express';
import { Pool } from 'pg';
import { verifyJwt } from '../../lib/jwt';

const router = Router();

/**
 * Admin guard (JWT semplice)
 * Richiede Authorization: Bearer <token> con role=admin
 */
function requireAdmin(req: any, res: any, next: any) {
  const auth = String(req.headers.authorization ?? '');
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'Missing Bearer token' });

  try {
    const payload = verifyJwt(m[1]);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    req.auth = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.use(requireAdmin);

// ---------- DB helpers ----------
let pool: Pool | null = null;

function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL');
  if (!pool) pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } as any });
  return pool;
}

async function ensureBaseSchema() {
  const p = getPool();
  // setup_state + system_config + affiliate_links (minimo per MVP)
  await p.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await p.query(`
    CREATE TABLE IF NOT EXISTS admin_setup_state (
      id integer PRIMARY KEY DEFAULT 1,
      completed boolean NOT NULL DEFAULT false,
      completed_at timestamptz NULL
    );
  `);

  // riga singleton
  await p.query(`
    INSERT INTO admin_setup_state (id, completed)
    VALUES (1, false)
    ON CONFLICT (id) DO NOTHING;
  `);

  await p.query(`
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

  // riga singleton
  await p.query(`
    INSERT INTO system_config (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `);

  // tabella base per AdminDashboard links
  await p.query(`
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

// ---------- Routes ----------

/**
 * GET /api/admin/setup/status
 * -> { completed: boolean }
 */
router.get('/status', async (_req, res) => {
  try {
    const p = getPool();
    await ensureBaseSchema();
    const r = await p.query(`SELECT completed FROM admin_setup_state WHERE id=1`);
    return res.json({ completed: Boolean(r.rows?.[0]?.completed) });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Failed to load setup status' });
  }
});

/**
 * POST /api/admin/setup/test-db
 * -> testa connessione DB
 */
router.post('/test-db', async (_req, res) => {
  try {
    const p = getPool();
    const r = await p.query('SELECT 1 as ok');
    return res.json({ ok: true, db: r.rows?.[0]?.ok === 1 });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'DB connection failed' });
  }
});

/**
 * POST /api/admin/setup/run-migrations
 * -> crea tabelle minime
 */
router.post('/run-migrations', async (_req, res) => {
  try {
    await ensureBaseSchema();
    return res.json({ ok: true, migrated: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Migrations failed' });
  }
});

/**
 * POST /api/admin/setup/save-config
 * body: { appName, adminEmail, currency, timezone, maxClickThroughPerDay }
 */
router.post('/save-config', async (req, res) => {
  try {
    await ensureBaseSchema();
    const { appName, adminEmail, currency, timezone, maxClickThroughPerDay } = req.body ?? {};

    const p = getPool();
    await p.query(
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

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Save config failed' });
  }
});

/**
 * POST /api/admin/setup/complete
 * -> set completed = true
 */
router.post('/complete', async (_req, res) => {
  try {
    await ensureBaseSchema();
    const p = getPool();
    await p.query(`UPDATE admin_setup_state SET completed=true, completed_at=now() WHERE id=1`);
    return res.json({ ok: true, completed: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Complete setup failed' });
  }
});

export default router;
