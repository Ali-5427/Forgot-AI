create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    name text not null default '',
    token_version integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.items (
    id uuid primary key default gen_random_uuid(),
    owner_user_id uuid references auth.users(id) on delete cascade,
    library_id text not null,
    content_type text not null check (content_type in ('image', 'text', 'url')),
    original_text text,
    source_url text,
    source_title text,
    source_domain text,
    image_path text,
    title text not null default 'Untitled',
    summary text not null default '',
    why_saved text,
    keywords jsonb not null default '[]'::jsonb,
    category text not null default 'Uncategorized',
    extracted_text text not null default '',
    searchable_text text not null default '',
    dedup_key text,
    status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
    pinned boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.login_attempts (
    identifier text primary key,
    count integer not null default 0,
    locked_until timestamptz,
    updated_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    token_hash text not null unique,
    token_version integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists items_library_created_idx on public.items (library_id, created_at desc);
create index if not exists items_library_status_idx on public.items (library_id, status);
create index if not exists items_library_dedup_idx on public.items (library_id, dedup_key);
create index if not exists items_owner_idx on public.items (owner_user_id);
create index if not exists items_image_path_idx on public.items (image_path);
create index if not exists login_attempts_locked_idx on public.login_attempts (locked_until);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.login_attempts enable row level security;
alter table public.user_sessions enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists items_owner on public.items;
create policy items_owner on public.items for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists user_sessions_self on public.user_sessions;
create policy user_sessions_self on public.user_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('forgot-ai-assets', 'forgot-ai-assets', false)
on conflict (id) do update set public = false;

drop policy if exists assets_owner_read on storage.objects;
create policy assets_owner_read on storage.objects for select to authenticated
using (bucket_id = 'forgot-ai-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists assets_owner_insert on storage.objects;
create policy assets_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'forgot-ai-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists assets_owner_delete on storage.objects;
create policy assets_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'forgot-ai-assets' and (storage.foldername(name))[1] = auth.uid()::text);
-- VECTOR SEARCH & HYBRID RPC
create extension if not exists vector;
alter table public.items add column if not exists embedding vector(1024);
create index if not exists items_embedding_idx on public.items 
using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function hybrid_search_items(
  query_embedding vector(1024),
  query_text text,
  time_filter text,
  match_count int,
  p_library_id text
)
returns setof public.items
language plpgsql
as $body
declare
  time_cutoff timestamptz;
begin
  if time_filter = 'yesterday' then
    time_cutoff := date_trunc('day', now()) - interval '1 day';
  elsif time_filter = 'today' then
    time_cutoff := date_trunc('day', now());
  elsif time_filter = 'week' then
    time_cutoff := now() - interval '7 days';
  else
    time_cutoff := '1970-01-01'::timestamptz;
  end if;

  return query
  with vector_matches as (
    select
      items.id,
      1 - (items.embedding <=> query_embedding) as vector_score
    from items
    where items.library_id = p_library_id
      and items.status = 'ready'
      and items.embedding is not null
      and items.created_at >= time_cutoff
  ),
  keyword_matches as (
    select
      items.id,
      1.0 as kw_score
    from items
    where items.library_id = p_library_id
      and items.status = 'ready'
      and items.created_at >= time_cutoff
      and (
        items.title ilike '%' || query_text || '%'
        or items.summary ilike '%' || query_text || '%'
        or items.extracted_text ilike '%' || query_text || '%'
        or items.searchable_text ilike '%' || query_text || '%'
      )
  )
  select i.*
  from items i
  left join vector_matches vm on vm.id = i.id
  left join keyword_matches km on km.id = i.id
  where i.library_id = p_library_id
    and i.status = 'ready'
    and i.created_at >= time_cutoff
    and (vm.id is not null or km.id is not null)
  order by coalesce(vm.vector_score, 0) + coalesce(km.kw_score, 0) desc
  limit match_count;
end;
$body;


-- STRIPE SUBSCRIPTIONS
create table if not exists public.user_subscriptions (
    user_id uuid primary key references auth.users(id) on delete cascade,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    plan_type text not null default 'free' check (plan_type in ('free', 'pro', 'lifetime')),
    status text not null default 'none' check (status in ('none', 'trial', 'active_pro', 'lifetime', 'canceled', 'expired')),
    current_period_end timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.user_subscriptions enable row level security;
drop policy if exists user_subscriptions_self on public.user_subscriptions;
create policy user_subscriptions_self on public.user_subscriptions for select using (user_id = auth.uid());

