-- ModenaGiochi Platform - MVP 1.0
-- Apply this in Supabase SQL editor (Database -> SQL Editor)

begin;

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.user_role as enum ('admin','user','seller');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.affiliate_link_status as enum ('active','paused','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.conversion_source as enum ('amazon','ebay','manual_entry');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.conversion_status as enum ('pending','confirmed','paid','cancelled');
exception when duplicate_object then null; end $$;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references public.profiles(id) on delete cascade,
  source_url text not null,
  destination_url text not null,
  title text not null,
  category text not null,
  commission_rate double precision not null default 0,
  status public.affiliate_link_status not null default 'active',
  click_count integer not null default 0,
  conversion_count integer not null default 0,
  conversion_rate double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.link_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.affiliate_links(id) on delete cascade,
  visitor_id text,
  referer text,
  user_agent text,
  ip_anonymized text,
  clicked_at timestamptz not null default now()
);

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.affiliate_links(id) on delete cascade,
  click_id uuid references public.link_clicks(id) on delete set null,
  amount numeric(12,2) not null default 0,
  commission_earned numeric(12,2) not null default 0,
  source public.conversion_source not null default 'manual_entry',
  external_transaction_id text,
  status public.conversion_status not null default 'pending',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create unique index if not exists idx_conversions_external_tx on public.conversions (source, external_transaction_id)
where external_transaction_id is not null;

create table if not exists public.admin_config (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  config_value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  resource_type text not null,
  resource_id text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_links_created_by on public.affiliate_links(created_by_id);
create index if not exists idx_clicks_link_id on public.link_clicks(link_id);
create index if not exists idx_conversions_link_id on public.conversions(link_id);
create index if not exists idx_audit_actor on public.audit_log(actor_id);
create index if not exists idx_audit_action on public.audit_log(action);

-- Updated_at triggers
create or replace function public.mg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.mg_touch_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_links_touch before update on public.affiliate_links
  for each row execute function public.mg_touch_updated_at();
exception when duplicate_object then null; end $$;

-- Auto-create profile on signup
create or replace function public.mg_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role, is_active)
  values (new.id, new.email, 'user', true)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.mg_handle_new_user();

-- RPC: now() check
create or replace function public.mg_now()
returns timestamptz language sql stable as $$
  select now();
$$;

-- RPC: increment click counter safely
create or replace function public.mg_inc_click(p_link_id uuid)
returns void language plpgsql as $$
begin
  update public.affiliate_links
    set click_count = click_count + 1,
        updated_at = now()
  where id = p_link_id;
end $$;

-- RPC: analytics summary
create or replace function public.mg_analytics_summary(p_user_id uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql as $$
declare
  v_clicks int;
  v_conversions int;
  v_revenue numeric(12,2);
  v_commission numeric(12,2);
begin
  if p_user_id is null then
    select count(*) into v_clicks
      from public.link_clicks lc
      where lc.clicked_at >= p_from and lc.clicked_at < p_to;

    select count(*), coalesce(sum(c.amount),0), coalesce(sum(c.commission_earned),0)
      into v_conversions, v_revenue, v_commission
      from public.conversions c
      where c.created_at >= p_from and c.created_at < p_to;
  else
    select count(*) into v_clicks
      from public.link_clicks lc
      join public.affiliate_links al on al.id = lc.link_id
      where al.created_by_id = p_user_id
        and lc.clicked_at >= p_from and lc.clicked_at < p_to;

    select count(*), coalesce(sum(c.amount),0), coalesce(sum(c.commission_earned),0)
      into v_conversions, v_revenue, v_commission
      from public.conversions c
      join public.affiliate_links al on al.id = c.link_id
      where al.created_by_id = p_user_id
        and c.created_at >= p_from and c.created_at < p_to;
  end if;

  return jsonb_build_object(
    'clicks', v_clicks,
    'conversions', v_conversions,
    'revenue', v_revenue,
    'commission', v_commission,
    'conversionRate', case when v_clicks > 0 then round((v_conversions::numeric / v_clicks::numeric) * 100, 2) else 0 end
  );
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.link_clicks enable row level security;
alter table public.conversions enable row level security;
alter table public.admin_config enable row level security;
alter table public.audit_log enable row level security;

-- Policies: profiles (users can read/update own record)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- affiliate_links (users manage own links)
drop policy if exists "links_select_own" on public.affiliate_links;
create policy "links_select_own"
on public.affiliate_links for select
using (auth.uid() = created_by_id);

drop policy if exists "links_insert_own" on public.affiliate_links;
create policy "links_insert_own"
on public.affiliate_links for insert
with check (auth.uid() = created_by_id);

drop policy if exists "links_update_own" on public.affiliate_links;
create policy "links_update_own"
on public.affiliate_links for update
using (auth.uid() = created_by_id)
with check (auth.uid() = created_by_id);

-- link_clicks (insert allowed for all authenticated users? we keep insert open for anon is not supported with auth.uid)
-- We'll allow insert for service role via API; for users we don't expose direct insert.
drop policy if exists "clicks_select_own" on public.link_clicks;
create policy "clicks_select_own"
on public.link_clicks for select
using (
  exists (
    select 1 from public.affiliate_links al
    where al.id = link_id and al.created_by_id = auth.uid()
  )
);

-- conversions (select own, insert own)
drop policy if exists "conv_select_own" on public.conversions;
create policy "conv_select_own"
on public.conversions for select
using (
  exists (
    select 1 from public.affiliate_links al
    where al.id = link_id and al.created_by_id = auth.uid()
  )
);

drop policy if exists "conv_insert_own" on public.conversions;
create policy "conv_insert_own"
on public.conversions for insert
with check (
  exists (
    select 1 from public.affiliate_links al
    where al.id = link_id and al.created_by_id = auth.uid()
  )
);

-- admin_config (admin only) - based on profiles.role
create or replace function public.mg_is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

drop policy if exists "admin_config_admin_only" on public.admin_config;
create policy "admin_config_admin_only"
on public.admin_config for all
using (public.mg_is_admin())
with check (public.mg_is_admin());

-- audit_log (append-only; users can insert; only admin can read)
drop policy if exists "audit_insert_any" on public.audit_log;
create policy "audit_insert_any"
on public.audit_log for insert
with check (auth.uid() = actor_id);

drop policy if exists "audit_select_admin" on public.audit_log;
create policy "audit_select_admin"
on public.audit_log for select
using (public.mg_is_admin());

commit;
