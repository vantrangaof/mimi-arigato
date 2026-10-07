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
-- What Mimi's AI noticed in a good thing: { people: [...], places: [...], things: [...] } (null if not read).
alter table public.entries add column if not exists tags jsonb;

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

-- ---------------------------------------------------------------------------
-- Diary (added later; re-running this whole file is safe)
-- ---------------------------------------------------------------------------

-- One private page per day: free writing plus an optional mood weather.
create table if not exists public.diary_pages (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day         date not null,
  text        text not null default '' check (char_length(text) <= 20000),
  mood        text check (mood in ('sunny', 'cloudy', 'rainy', 'stormy')),
  updated_at  timestamptz not null,
  synced_at   timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists diary_pages_user_synced_at on public.diary_pages (user_id, synced_at);

-- A whole page is one row, so an older edit (say, from a phone that was offline) must
-- never overwrite a newer one: such updates are ignored and the newer page stays.
create or replace function public.mimi_diary_keep_newer() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return old;
  end if;
  new.synced_at := now();
  return new;
end;
$$;

drop trigger if exists diary_pages_touch_synced_at on public.diary_pages;
create trigger diary_pages_touch_synced_at
  before insert or update on public.diary_pages
  for each row execute function public.mimi_diary_keep_newer();

alter table public.diary_pages enable row level security;

drop policy if exists "own diary" on public.diary_pages;
create policy "own diary" on public.diary_pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Friends and visiting (added later; re-running this whole file is safe)
-- ---------------------------------------------------------------------------

-- Invite codes: one person makes a code, a friend uses it once within 7 days.
create table if not exists public.friend_invites (
  code        text primary key check (code ~ '^[A-Z0-9]{6}$'),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_by     uuid references auth.users (id) on delete set null
);

-- One row each way: (me, my friend) and (my friend, me).
create table if not exists public.friends (
  user_id     uuid not null references auth.users (id) on delete cascade,
  friend_id   uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, friend_id)
);

-- What friends see when they visit: only the room (cat, unlocks, treasures, your things).
-- Never any good things, diary, photos or theories.
create table if not exists public.rooms (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  snapshot    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.friend_invites enable row level security;
alter table public.friends enable row level security;
alter table public.rooms enable row level security;

drop policy if exists "own invites" on public.friend_invites;
create policy "own invites" on public.friend_invites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id and used_by is null);

-- Friendships are only made by accept_invite below; either side can end one.
drop policy if exists "see own friends" on public.friends;
create policy "see own friends" on public.friends
  for select using (auth.uid() = user_id);

drop policy if exists "remove own friends" on public.friends;
create policy "remove own friends" on public.friends
  for delete using (auth.uid() = user_id);

drop policy if exists "own room" on public.rooms;
create policy "own room" on public.rooms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "friends visit rooms" on public.rooms;
create policy "friends visit rooms" on public.rooms
  for select using (exists (
    select 1 from public.friends f where f.user_id = auth.uid() and f.friend_id = rooms.user_id
  ));

-- Ending a friendship removes it for both people.
create or replace function public.mimi_unfriend_both() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.friends where user_id = old.friend_id and friend_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists friends_unfriend_both on public.friends;
create trigger friends_unfriend_both
  after delete on public.friends
  for each row execute function public.mimi_unfriend_both();

-- The inviter's cat name, so the app can ask "Be friends with Mochi's human?" first
-- (own = true when it's your own code). Returns null when the code is wrong, used or expired.
create or replace function public.peek_invite(invite_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('cat_name', coalesce(r.snapshot ->> 'catName', 'Mimi'), 'own', i.user_id = auth.uid())
  from public.friend_invites i
  left join public.rooms r on r.user_id = i.user_id
  where i.code = upper(invite_code)
    and i.used_by is null
    and i.expires_at > now();
$$;

-- Uses an invite: both people become friends. Returns the inviter's id, or raises an error.
create or replace function public.accept_invite(invite_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inviter uuid;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  select user_id into inviter from public.friend_invites
    where code = upper(invite_code) and used_by is null and expires_at > now()
    for update;
  if inviter is null then
    raise exception 'invite not found';
  end if;
  if inviter = auth.uid() then
    raise exception 'own invite';
  end if;
  update public.friend_invites set used_by = auth.uid() where code = upper(invite_code);
  insert into public.friends (user_id, friend_id) values (auth.uid(), inviter), (inviter, auth.uid())
    on conflict do nothing;
  return inviter;
end;
$$;

revoke execute on function public.peek_invite(text) from public, anon;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.peek_invite(text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Mimi's AI usage (added later; re-running this whole file is safe)
-- ---------------------------------------------------------------------------

-- How many AI calls (good-thing checks and chat) each person made per day. The Vercel
-- function api/mimi.mjs calls mimi_ai_call() with the person's own sign-in token, so
-- a bad token is refused and everyone's count only ever goes up.
create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null,
  checks   integer not null default 0,
  chats    integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists "see own ai usage" on public.ai_usage;
create policy "see own ai usage" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Counts one call and returns today's total (checks + chats).
create or replace function public.mimi_ai_call(call_kind text) returns integer
language plpgsql security definer set search_path = public as $$
declare
  total integer;
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  insert into public.ai_usage (user_id, day, checks, chats)
    values (auth.uid(), current_date, (call_kind = 'check')::int, (call_kind = 'chat')::int)
    on conflict (user_id, day) do update
      set checks = ai_usage.checks + (call_kind = 'check')::int,
          chats = ai_usage.chats + (call_kind = 'chat')::int
    returning checks + chats into total;
  return total;
end;
$$;

revoke execute on function public.mimi_ai_call(text) from public, anon;
grant execute on function public.mimi_ai_call(text) to authenticated;
