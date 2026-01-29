import { Router } from 'express';
import { pool, isDatabaseConfigured, safeDbInfo, withTimeout } from '../../database/pg';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

// ✅ Proteggi TUTTO con JWT del progetto
router.use(requireAuth);
router.use((req: any, res, next) => {
  if (req.authUser?.kind !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

const HINTS = [
  'Suggerimenti:',
  '(1) verifica che il backend non sia in cold-start;',
  '(2) su Render imposta DATABASE_URL nel service "modenaplay-api" (Environment) e riavvia;',
  '(3) se usi Supabase, copia la connection string "Direct connection" (port 5432) dalla dashboard;',
  '(4) attenzione a password con caratteri speciali: usa la stringa fornita da Supabase (già corretta) o URL-encode.',
].join(' ');

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

function normalizeErr(e: any) {
  const msg = String(e?.message || e || '');
  const lower = msg.toLowerCase();
  const isTimeout =
    lower.includes('timeout') ||
    lower.includes('etimedout') ||
    lower.includes('econnrefused') ||
    lower.includes('connection terminated due to connection timeout');
  return { msg, isTimeout };
}

async function getSetupStatusPayload() {
  // Non deve MAI rompere la UI con 500: restituisce sempre un JSON leggibile.
  if (!isDatabaseConfigured()) {
    return {
      completed: false,
      db: { ok: false, error: 'DATABASE_URL missing', info: safeDbInfo() },
      action: HINTS,
    };
  }

  // Ping rapido (non crea schema)
  try {
    await withTimeout(pool.query('SELECT 1 as ok'), 5000, 'DB connection timeout');
  } catch (e: any) {
    const { msg, isTimeout } = normalizeErr(e);
    return {
      completed: false,
      db: { ok: false, error: msg, info: safeDbInfo() },
      action: HINTS,
      degraded: true,
      ...(isTimeout ? { code: 504 } : {}),
    };
  }

  // Se DB ok, prova a leggere lo stato setup (creando schema base se necessario)
  try {
    await withTimeout(ensureBaseSchema(), 15000, 'Schema init timeout');
    const r = await pool.query(`SELECT completed FROM admin_setup_state WHERE id=1`);
    return { completed: Boolean(r.rows?.[0]?.completed), db: { ok: true, info: safeDbInfo() } };
  } catch (e: any) {
    const { msg } = normalizeErr(e);
    return {
      completed: false,
      db: { ok: true, info: safeDbInfo() },
      error: msg,
      action: 'DB ok ma schema non inizializzabile. Controlla permessi/estensioni su Postgres.',
    };
  }
}

// ---------- Routes ----------

// Alias: GET /api/admin/setup
router.get('/', async (_req, res) => {
  const payload = await getSetupStatusPayload();
  return res.json(payload);
});

// Compat: GET /api/admin/setup/status
router.get('/status', async (_req, res) => {
  const payload = await getSetupStatusPayload();
  return res.json(payload);
});

router.post('/test-db', async (_req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'DATABASE_URL missing', action: HINTS });
  }
  try {
    const r = await withTimeout(pool.query('SELECT 1 as ok'), 8000, 'DB connection timeout');
    return res.json({ ok: true, db: r.rows?.[0]?.ok === 1, info: safeDbInfo() });
  } catch (e: any) {
    const { msg, isTimeout } = normalizeErr(e);
    return res.status(isTimeout ? 504 : 502).json({
      error: msg || 'DB connection failed',
      action: HINTS,
      info: safeDbInfo(),
    });
  }
});

router.post('/run-migrations', async (_req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'DATABASE_URL missing', action: HINTS });
  }
  try {
    await withTimeout(ensureBaseSchema(), 45000, 'Migrations timeout');
    return res.json({ ok: true, migrated: true });
  } catch (e: any) {
    const { msg, isTimeout } = normalizeErr(e);
    return res.status(isTimeout ? 504 : 500).json({ error: msg ?? 'Migrations failed', action: HINTS });
  }
});

router.post('/save-config', async (req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'DATABASE_URL missing', action: HINTS });
  }
  try {
    await withTimeout(ensureBaseSchema(), 20000, 'Schema init timeout');
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

    return res.json({ ok: true });
  } catch (e: any) {
    const { msg, isTimeout } = normalizeErr(e);
    return res.status(isTimeout ? 504 : 500).json({ error: msg ?? 'Save config failed', action: HINTS });
  }
});

router.post('/complete', async (_req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'DATABASE_URL missing', action: HINTS });
  }
  try {
    await withTimeout(ensureBaseSchema(), 20000, 'Schema init timeout');
    await pool.query(`UPDATE admin_setup_state SET completed=true, completed_at=now() WHERE id=1`);
    return res.json({ ok: true, completed: true });
  } catch (e: any) {
    const { msg, isTimeout } = normalizeErr(e);
    return res.status(isTimeout ? 504 : 500).json({ error: msg ?? 'Complete setup failed', action: HINTS });
  }
});

export default router;
