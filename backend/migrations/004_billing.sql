-- Migration: 004_billing
-- Additive Dodo billing fields + webhook idempotency.
-- user_subscriptions may already exist from supabase_schema.sql; this is safe to re-run.

create table if not exists public.user_subscriptions (
    user_id uuid primary key references auth.users(id) on delete cascade,
    stripe_customer_id text unique,
    stripe_subscription_id text unique,
    plan_type text not null default 'free',
    status text not null default 'none',
    current_period_end timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.user_subscriptions add column if not exists dodo_customer_id text;
alter table public.user_subscriptions add column if not exists dodo_subscription_id text;
alter table public.user_subscriptions add column if not exists dodo_payment_id text;
alter table public.user_subscriptions add column if not exists provider text default 'dodo';

alter table public.user_subscriptions drop constraint if exists user_subscriptions_plan_type_check;
alter table public.user_subscriptions add constraint user_subscriptions_plan_type_check
    check (plan_type in ('free', 'pro', 'lifetime'));

alter table public.user_subscriptions drop constraint if exists user_subscriptions_status_check;
alter table public.user_subscriptions add constraint user_subscriptions_status_check
    check (status in ('none', 'trial', 'active_pro', 'lifetime', 'canceled', 'expired', 'on_hold', 'failed'));

alter table public.user_subscriptions enable row level security;
drop policy if exists user_subscriptions_self on public.user_subscriptions;
create policy user_subscriptions_self on public.user_subscriptions
    for select using (user_id = auth.uid());

create table if not exists public.dodo_webhook_events (
    webhook_id text primary key,
    event_type text not null,
    status text not null default 'processing' check (status in ('processing', 'processed', 'ignored', 'failed')),
    received_at timestamptz not null default now(),
    processed_at timestamptz
);

alter table public.dodo_webhook_events enable row level security;
