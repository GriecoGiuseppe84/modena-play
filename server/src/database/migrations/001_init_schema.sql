-- Modena Play Affiliate Platform MVP 1.0 (Admin + minimo User/Seller area)
begin;

do $$ begin create type public.user_role as enum ('admin','user','seller'); exception when duplicate_object then null; end $$;
do $$ begin create type public.link_status as enum ('active','paused','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.conversion_source as enum ('amazon','ebay','manual_entry'); exception when duplicate_object then null; end $$;
do $$ begin create type public.conversion_status as enum ('pending','confirmed','paid','cancelled'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
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
  status public.link_status not null default 'active',
  click_count integer not null default 0,
  conversion_count integer not null default 0,
  conversion_rate double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_affiliate_links_created_by on public.affiliate_links(created_by_id);
create index if not exists idx_affiliate_links_status on public.affiliate_links(status);

create table if not exists public.link_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.affiliate_links(id) on delete cascade,
  visitor_id text not null,
  referer text,
  user_agent text,
  ip_anonymized text,
  clicked_at timestamptz not null default now()
);

create index if not exists idx_link_clicks_link_id on public.link_clicks(link_id);
create index if not exists idx_link_clicks_clicked_at on public.link_clicks(clicked_at);

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.affiliate_links(id) on delete cascade,
  click_id uuid references public.link_clicks(id) on delete set null,
  amount numeric(12,2),
  commission_earned numeric(12,2),
  source public.conversion_source not null default 'manual_entry',
  external_transaction_id text,
  status public.conversion_status not null default 'pending',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists idx_conversions_link_id on public.conversions(link_id);
create index if not exists idx_conversions_status on public.conversions(status);

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
  resource_id uuid,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_actor on public.audit_log(actor_id);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at);

create table if not exists public.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_refresh_tokens_user on public.refresh_tokens(user_id);

alter table public.profiles enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.link_clicks enable row level security;
alter table public.conversions enable row level security;
alter table public.admin_config enable row level security;
alter table public.audit_log enable row level security;
alter table public.refresh_tokens enable row level security;

do $$ begin
  create policy "profiles_select_own" on public.profiles
    for select using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_insert_own" on public.profiles
    for insert with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_update_own" on public.profiles
    for update using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "links_select_own" on public.affiliate_links
    for select using (auth.uid() = created_by_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "links_insert_own" on public.affiliate_links
    for insert with check (auth.uid() = created_by_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "links_update_own" on public.affiliate_links
    for update using (auth.uid() = created_by_id) with check (auth.uid() = created_by_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "links_delete_own" on public.affiliate_links
    for delete using (auth.uid() = created_by_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admin_config_admin_only" on public.admin_config
    for all using (
      exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    ) with check (
      exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "audit_insert_auth" on public.audit_log
    for insert with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "audit_select_admin" on public.audit_log
    for select using (
      exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "clicks_select_owner" on public.link_clicks
    for select using (
      exists(select 1 from public.affiliate_links l
        where l.id = link_id and l.created_by_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "conversions_select_owner" on public.conversions
    for select using (
      exists(select 1 from public.affiliate_links l
        where l.id = link_id and l.created_by_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "refresh_tokens_admin_only" on public.refresh_tokens
    for all using (
      exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    ) with check (
      exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );
exception when duplicate_object then null; end $$;

commit;
