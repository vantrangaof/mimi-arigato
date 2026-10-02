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

-- ---------------------------------------------------------------------------
-- Photos (added later; re-running this whole file is safe)
-- ---------------------------------------------------------------------------

-- A good thing can have one photo attached.
alter table public.entries add column if not exists photo_id uuid;

-- Photo details. The images themselves live in the "photos" Storage bucket below.
create table if not exists public.photos (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day         date not null,
  caption     text not null default '' check (char_length(caption) <= 500),
  entry_id    uuid,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted     boolean not null default false,
  synced_at   timestamptz not null default now()
);

create index if not exists photos_user_synced_at on public.photos (user_id, synced_at);

drop trigger if exists photos_touch_synced_at on public.photos;
create trigger photos_touch_synced_at
  before insert or update on public.photos
  for each row execute function public.mimi_touch_synced_at();

alter table public.photos enable row level security;

drop policy if exists "own photos" on public.photos;
create policy "own photos" on public.photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Image files: a private bucket (5 MB per file, JPEG only). Files are stored as
-- "<user id>/<photo id>.jpg", and each person can only touch their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "own photo files: read" on storage.objects;
create policy "own photo files: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photo files: add" on storage.objects;
create policy "own photo files: add" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photo files: replace" on storage.objects;
create policy "own photo files: replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photo files: delete" on storage.objects;
create policy "own photo files: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
