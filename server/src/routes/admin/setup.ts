import { Router } from 'express';
import { pool, isDatabaseConfigured, databaseConfigHint } from '../../database/pg';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

// ✅ proteggi TUTTO con JWT del progetto
router.use(requireAuth);
router.use((req: any, res, next) => {
  if (req.authUser?.kind !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

async function ensureBaseSchema() {
  // Fail fast: senza DATABASE_URL la connessione può “pendere” e far scattare il timeout lato client.
  if (!isDatabaseConfigured()) {
    throw new Error(databaseConfigHint());
  }

  // se manca DATABASE_URL, la pool fallirà con message chiaro
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

// ---------- Routes ----------

router.get('/status', async (_req, res) => {
  try {
    await ensureBaseSchema();
    const r = await pool.query(`SELECT completed FROM admin_setup_state WHERE id=1`);
    return res.json({ completed: Boolean(r.rows?.[0]?.completed) });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Failed to load setup status' });
  }
});

router.post('/test-db', async (_req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.status(500).json({
        error: databaseConfigHint(),
        action: 'Imposta DATABASE_URL e riavvia il servizio API su Render.',
      });
    }

    const start = Date.now();

    // Ulteriore protezione: se per qualunque motivo la query/connessione impiega troppo,
    // rispondiamo con 504 invece di lasciare il client in timeout.
    const r = await Promise.race([
      pool.query('SELECT 1 as ok'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('DB connection timeout')), 7_000)),
    ]) as any;

    return res.json({ ok: true, db: r.rows?.[0]?.ok === 1, tookMs: Date.now() - start });
  } catch (e: any) {
    const msg = String(e?.message || 'DB connection failed');
    const isTimeout = msg.toLowerCase().includes('timeout');
    return res.status(isTimeout ? 504 : 500).json({ error: msg });
  }
});

router.post('/run-migrations', async (_req, res) => {
  try {
    await ensureBaseSchema();
    return res.json({ ok: true, migrated: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Migrations failed' });
  }
});

router.post('/save-config', async (req, res) => {
  try {
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

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Save config failed' });
  }
});

router.post('/complete', async (_req, res) => {
  try {
    await ensureBaseSchema();
    await pool.query(`UPDATE admin_setup_state SET completed=true, completed_at=now() WHERE id=1`);
    return res.json({ ok: true, completed: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Complete setup failed' });
  }
});

export default router;
