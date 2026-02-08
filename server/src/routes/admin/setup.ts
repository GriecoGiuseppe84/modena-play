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

  // ---------------------------------------------
  // Local users (email/password) — for MVP auth
  // ---------------------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'user',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  // ---------------------------------------------
  // Affiliate links (MVP)
  // ---------------------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliate_links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      source_url text NOT NULL DEFAULT '',
      destination_url text NOT NULL DEFAULT '',
      network text NOT NULL DEFAULT 'generic',
      slug text NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      click_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (slug)
    );
  `);

  // idempotent upgrades
  await pool.query(`ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];`);
  await pool.query(`ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS destination_base_url text NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS utm_source text NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS utm_medium text NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS utm_campaign text NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS utm_content text NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS utm_term text NOT NULL DEFAULT '';`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_affiliate_links_active on affiliate_links (is_active);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_affiliate_links_network on affiliate_links (network);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_affiliate_links_category on affiliate_links (category);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_affiliate_links_click_count on affiliate_links (click_count DESC);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_affiliate_links_tags_gin on affiliate_links USING GIN (tags);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliate_clicks (
      id bigserial PRIMARY KEY,
      link_id uuid NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
      clicked_at timestamptz NOT NULL DEFAULT now(),
      referrer text NULL,
      user_agent text NULL,
      ip_hash text NULL
    );
  `);

  await pool.query(`create index if not exists idx_affiliate_clicks_link_time on affiliate_clicks (link_id, clicked_at desc);`);

  await pool.query(`
    CREATE OR REPLACE FUNCTION public.inc_affiliate_link_click_count()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      UPDATE affiliate_links
      SET click_count = COALESCE(click_count,0) + 1,
          updated_at = now()
      WHERE id = NEW.link_id;
      RETURN NEW;
    END;
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_affiliate_clicks_inc') THEN
        CREATE TRIGGER trg_affiliate_clicks_inc
        AFTER INSERT ON affiliate_clicks
        FOR EACH ROW EXECUTE FUNCTION public.inc_affiliate_link_click_count();
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE OR REPLACE VIEW public.affiliate_clicks_daily_total AS
    SELECT date_trunc('day', clicked_at) as day, count(*) as clicks
    FROM affiliate_clicks
    GROUP BY 1;
  `);

  // ---------------------------------------------
  // Content: articles (draft/published)
  // ---------------------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_articles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      author_user_id uuid NULL,
      title text NOT NULL,
      slug text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      excerpt text NOT NULL DEFAULT '',
      body_md text NOT NULL DEFAULT '',
      tags text[] NOT NULL DEFAULT '{}'::text[],
      published_at timestamptz NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (slug)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_articles_status on content_articles (status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_articles_published_at on content_articles (published_at DESC);`);

  // updated_at helper
  await pool.query(`
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;
  `);

  // triggers (idempotent)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_system_config_updated_at') THEN
        CREATE TRIGGER trg_system_config_updated_at
        BEFORE UPDATE ON system_config
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_affiliate_links_updated_at') THEN
        CREATE TRIGGER trg_affiliate_links_updated_at
        BEFORE UPDATE ON affiliate_links
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_content_articles_updated_at') THEN
        CREATE TRIGGER trg_content_articles_updated_at
        BEFORE UPDATE ON content_articles
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      END IF;
    END $$;
  `);

  // daily per link
  await pool.query(`
    CREATE OR REPLACE VIEW public.affiliate_clicks_daily AS
    SELECT link_id, date_trunc('day', clicked_at) as day, count(*) as clicks
    FROM affiliate_clicks
    GROUP BY 1,2;
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
      tables: ['admin_setup_state', 'system_config', 'affiliate_links', 'affiliate_clicks'],
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
