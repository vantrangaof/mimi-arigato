-- Mimi Arigato database schema.
-- Run once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again; it only creates what's missing and refreshes the policies.

-- One row per good thing. Deletions are kept as tombstones (deleted = true) so every
-- device learns about them.
create table if not exists public.entries (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day         date not null,
  text        text not null check (char_length(text) between 1 and 500),
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted     boolean not null default false,
  synced_at   timestamptz not null default now()
);

create index if not exists entries_user_synced_at on public.entries (user_id, synced_at);

-- Everything else Mimi remembers about you (settings, scrapbook, treasures, milestones).
create table if not exists public.user_state (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- synced_at is stamped by the server so devices with wrong clocks never miss changes.
create or replace function public.mimi_touch_synced_at() returns trigger
language plpgsql as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

drop trigger if exists entries_touch_synced_at on public.entries;
create trigger entries_touch_synced_at
  before insert or update on public.entries
  for each row execute function public.mimi_touch_synced_at();

-- Row-level security: each person can only ever see and change their own rows.
alter table public.entries enable row level security;
alter table public.user_state enable row level security;

drop policy if exists "own entries" on public.entries;
create policy "own entries" on public.entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own state" on public.user_state;
create policy "own state" on public.user_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
