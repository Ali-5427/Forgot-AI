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
alter table public.items add column if not exists embedding vector(2048);


create or replace function hybrid_search_items(
  query_embedding vector(2048),
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


-- BILLING / SUBSCRIPTIONS (Stripe-named columns kept unused; Dodo is the provider)
create table if not exists public.user_subscriptions (
    user_id uuid primary key references auth.users(id) on delete cascade,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    dodo_customer_id text,
    dodo_subscription_id text,
    dodo_payment_id text,
    provider text default 'dodo',
    plan_type text not null default 'free' check (plan_type in ('free', 'pro', 'lifetime')),
    status text not null default 'none' check (status in ('none', 'trial', 'active_pro', 'lifetime', 'canceled', 'expired', 'on_hold', 'failed')),
    current_period_end timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.user_subscriptions enable row level security;
drop policy if exists user_subscriptions_self on public.user_subscriptions;
create policy user_subscriptions_self on public.user_subscriptions for select using (user_id = auth.uid());

create table if not exists public.dodo_webhook_events (
    webhook_id text primary key,
    event_type text not null,
    status text not null default 'processing' check (status in ('processing', 'processed', 'ignored', 'failed')),
    received_at timestamptz not null default now(),
    processed_at timestamptz
);
alter table public.dodo_webhook_events enable row level security;


-- FTS Column for items
alter table public.items add column if not exists fts tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(keywords::text, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(searchable_text, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(extracted_text, '')), 'D')
) stored;

create index if not exists items_fts_idx on public.items using gin (fts);

-- Conversations Table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  summary text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_conversations_user_id on public.conversations(user_id, updated_at desc);
alter table public.conversations enable row level security;
drop policy if exists conversations_owner on public.conversations;
create policy conversations_owner on public.conversations for all using (auth.uid() = user_id);

-- Messages Table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  cited_item_ids uuid[] default '{}',
  created_at timestamptz default now()
);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id, created_at);
alter table public.messages enable row level security;
drop policy if exists messages_owner on public.messages;
create policy messages_owner on public.messages for all using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()
  )
);




-- ==========================================
-- Migration: 003_feedback
-- Creates table to store user feedback
-- ==========================================

create table if not exists public.feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) not null,
    user_email text,
    message text not null,
    created_at timestamptz default now()
);

-- Enable Row Level Security for safety
alter table public.feedback enable row level security;

-- Policy: Users can only insert feedback tied to their own auth ID
drop policy if exists "Users can insert own feedback" on public.feedback;
create policy "Users can insert own feedback" 
    on public.feedback 
    for insert 
    with check (auth.uid() = user_id);

-- Policy: Users can only see their own feedback (if they ever need to query it)
drop policy if exists "Users can read own feedback" on public.feedback;
create policy "Users can read own feedback" 
    on public.feedback 
    for select 
    using (auth.uid() = user_id);
