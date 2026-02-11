-- Modena Play (Neon) - Phase 2+ (non-destructive)
-- Safe re-run: creates tables/columns/indexes only if missing.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Page views (for CTR)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  title text NULL,
  referrer text NULL,
  user_agent text NULL,
  ip_hash text NULL,
  utm_source text NULL,
  utm_medium text NULL,
  utm_campaign text NULL,
  utm_content text NULL,
  utm_term text NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views (viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views (path);

-- ------------------------------------------------------------
-- User favorites (engagement)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_favorite_posts (
  user_id text NOT NULL,
  post_id uuid NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_posts_user ON user_favorite_posts (user_id);

-- ------------------------------------------------------------
-- Newsletter subscribers (monetization/retention)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email text PRIMARY KEY,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active ON newsletter_subscribers (is_active);

COMMIT;
