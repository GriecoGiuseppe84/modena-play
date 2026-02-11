-- Modena Play (Neon) - Non-destructive bootstrap SQL
-- Crea tabelle/colonne/indici SOLO se non esistono.
-- Sicuro da rilanciare più volte.
--
-- Nota: richiede estensione pgcrypto per gen_random_uuid().
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Base setup state + system config
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_setup_state (
  id integer PRIMARY KEY DEFAULT 1,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz NULL
);

INSERT INTO admin_setup_state (id, completed)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS system_config (
  id integer PRIMARY KEY DEFAULT 1,
  app_name text NOT NULL DEFAULT 'Modena Play',
  admin_email text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'EUR',
  timezone text NOT NULL DEFAULT 'Europe/Rome',
  max_clickthrough_per_day integer NOT NULL DEFAULT 500,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO system_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Affiliate (core)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS affiliate_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  website_url text NULL,
  network text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_affiliate_brands_name ON affiliate_brands (name);

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

-- colonne extra (non distruttivo)
ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS brand_id uuid NULL;
ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS payout_type text NULL;
ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS payout_value numeric NULL;
ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE affiliate_links ADD COLUMN IF NOT EXISTS notes text NULL;

-- FK brand_id (safe add)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_affiliate_links_brand') THEN
    ALTER TABLE affiliate_links
      ADD CONSTRAINT fk_affiliate_links_brand
      FOREIGN KEY (brand_id) REFERENCES affiliate_brands(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_affiliate_links_active ON affiliate_links (is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_network ON affiliate_links (network);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id bigserial PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  referrer text NULL,
  user_agent text NULL,
  ip_hash text NULL
);

-- colonne extra click (UTM + page + revenue)
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS page_path text NULL;
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS utm_source text NULL;
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS utm_medium text NULL;
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS utm_campaign text NULL;
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS utm_content text NULL;
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS utm_term text NULL;
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS revenue numeric NULL;

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link_time ON affiliate_clicks (link_id, clicked_at desc);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_page_time ON affiliate_clicks (page_path, clicked_at desc);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_utm_source ON affiliate_clicks (utm_source);

-- Trigger: incrementa click_count su affiliate_links
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_affiliate_clicks_inc') THEN
    CREATE TRIGGER trg_affiliate_clicks_inc
    AFTER INSERT ON affiliate_clicks
    FOR EACH ROW EXECUTE FUNCTION public.inc_affiliate_link_click_count();
  END IF;
END $$;

-- View utile (trend)
CREATE OR REPLACE VIEW public.affiliate_clicks_daily_total AS
SELECT date_trunc('day', clicked_at) as day, count(*) as clicks
FROM affiliate_clicks
GROUP BY 1;

-- ------------------------------------------------------------
-- Content (posts / categories / tags)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS content_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text NULL,
  body_md text NULL,
  hero_image_url text NULL,
  seo_title text NULL,
  seo_description text NULL,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz NULL,
  category_id uuid NULL REFERENCES content_categories(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_content_posts_status_pub ON content_posts (status, published_at desc);
CREATE INDEX IF NOT EXISTS idx_content_posts_category ON content_posts (category_id);

CREATE TABLE IF NOT EXISTS content_post_tags (
  post_id uuid NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES content_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, tag_id)
);

COMMIT;
