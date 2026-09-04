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

create index if not exists items_library_created_idx on public.items (library_id, created_at desc);
create index if not exists items_library_status_idx on public.items (library_id, status);
create index if not exists items_library_dedup_idx on public.items (library_id, dedup_key);
create index if not exists items_owner_idx on public.items (owner_user_id);
create index if not exists items_image_path_idx on public.items (image_path);
create index if not exists login_attempts_locked_idx on public.login_attempts (locked_until);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.login_attempts enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists items_owner on public.items;
create policy items_owner on public.items for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

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