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