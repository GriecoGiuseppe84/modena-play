-- Modena Play — Schema base + affiliate-ready
--
-- Esegui questo file in Supabase → SQL Editor.
-- È idempotente (puoi rilanciarlo senza rompere nulla).

-- UUID generator
create extension if not exists pgcrypto;

-- ---------------------------------------------
-- Setup state (wizard)
-- ---------------------------------------------
create table if not exists public.admin_setup_state (
  id integer primary key default 1,
  completed boolean not null default false,
  completed_at timestamptz null
);

insert into public.admin_setup_state (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------
-- System config (1 row)
-- ---------------------------------------------
create table if not exists public.system_config (
  id integer primary key default 1,
  app_name text not null default 'Modena Play',
  admin_email text not null default '',
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Rome',
  max_clickthrough_per_day integer not null default 500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.system_config (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------
-- Affiliate links (MVP)
-- ---------------------------------------------
create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text not null default '',
  -- URL finale verso cui redirigere (Amazon/eBay/Steam ecc.)
  destination_url text not null default '',
  network text not null default 'generic',
  slug text not null,
  is_active boolean not null default true,
  -- denormalizzato per UX/analytics veloci (incrementato via trigger su affiliate_clicks)
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

-- ✅ upgrade idempotente (se la tabella esiste già con schema precedente)
alter table public.affiliate_links add column if not exists destination_url text not null default '';
alter table public.affiliate_links add column if not exists click_count integer not null default 0;


-- ✅ v2 columns (categorie / tags / descrizioni / UTM builder)
alter table public.affiliate_links add column if not exists category text not null default '';
alter table public.affiliate_links add column if not exists tags text[] not null default '{}'::text[];
alter table public.affiliate_links add column if not exists description text not null default '';
alter table public.affiliate_links add column if not exists destination_base_url text not null default '';
alter table public.affiliate_links add column if not exists utm_source text not null default '';
alter table public.affiliate_links add column if not exists utm_medium text not null default '';
alter table public.affiliate_links add column if not exists utm_campaign text not null default '';
alter table public.affiliate_links add column if not exists utm_content text not null default '';
alter table public.affiliate_links add column if not exists utm_term text not null default '';
create index if not exists idx_affiliate_links_active on public.affiliate_links (is_active);
create index if not exists idx_affiliate_links_network on public.affiliate_links (network);
create index if not exists idx_affiliate_links_category on public.affiliate_links (category);
create index if not exists idx_affiliate_links_click_count on public.affiliate_links (click_count desc);
create index if not exists idx_affiliate_links_tags_gin on public.affiliate_links using gin (tags);


-- ---------------------------------------------
-- Click tracking (per affiliate link)
-- ---------------------------------------------
create table if not exists public.affiliate_clicks (
  id bigserial primary key,
  link_id uuid not null references public.affiliate_links(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referrer text null,
  user_agent text null,
  -- non salvare IP in chiaro (privacy). Se serve, salva un hash.
  ip_hash text null
);

create index if not exists idx_affiliate_clicks_link_time on public.affiliate_clicks (link_id, clicked_at desc);

-- ✅ trigger: ogni click incrementa affiliate_links.click_count (atomico, no race)
create or replace function public.inc_affiliate_link_click_count()
returns trigger
language plpgsql
as $$
begin
  update public.affiliate_links
  set click_count = coalesce(click_count,0) + 1,
      updated_at = now()
  where id = new.link_id;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_affiliate_clicks_inc'
  ) then
    create trigger trg_affiliate_clicks_inc
    after insert on public.affiliate_clicks
    for each row execute function public.inc_affiliate_link_click_count();
  end if;
end $$;

-- ---------------------------------------------
-- Content: articoli (draft/published)
-- ---------------------------------------------
create table if not exists public.content_articles (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid null,
  title text not null,
  slug text not null,
  status text not null default 'draft', -- draft | published
  excerpt text not null default '',
  body_md text not null default '',
  tags text[] not null default '{}'::text[],
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create index if not exists idx_content_articles_status on public.content_articles (status);
create index if not exists idx_content_articles_published_at on public.content_articles (published_at desc);

-- ---------------------------------------------
-- Updated_at trigger helper
-- ---------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- triggers (idempotenti)
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_system_config_updated_at'
  ) then
    create trigger trg_system_config_updated_at
    before update on public.system_config
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_affiliate_links_updated_at'
  ) then
    create trigger trg_affiliate_links_updated_at
    before update on public.affiliate_links
    for each row execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'trg_content_articles_updated_at'
  ) then
    create trigger trg_content_articles_updated_at
    before update on public.content_articles
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- ---------------------------------------------
-- (Opzionale) vista analytics giornaliera
-- ---------------------------------------------
create or replace view public.affiliate_clicks_daily as
select
  link_id,
  date_trunc('day', clicked_at) as day,
  count(*) as clicks
from public.affiliate_clicks
group by 1,2;

-- totale per giorno (utile per mini-analytics dashboard)
create or replace view public.affiliate_clicks_daily_total as
select
  date_trunc('day', clicked_at) as day,
  count(*) as clicks
from public.affiliate_clicks
group by 1;
