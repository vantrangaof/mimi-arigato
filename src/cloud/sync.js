// Cloud sync with Supabase. The on-device database stays the source Mimi reads from;
// this module mirrors it to Postgres when you're signed in:
//   push  entries changed on this device (including deletions, as tombstones)
//   pull  entries other devices changed since our last pull (by server time, synced_at)
//   merge settings/scrapbook/treasures/milestones both ways (see store.mergeCloudState)
//   diary   one private page per day, upserted by (user, day); the newer edit wins
//   photos: details sync like entries; image files live in a private Storage bucket
//   ("photos/<user id>/<photo id>.jpg" and "-thumb.jpg"). Thumbnails download right away,
//   full images only when opened.
//   room    a snapshot of your room that friends can visit (see world/room-snapshot.js)
// Sync runs on sign-in, on open, shortly after changes, when back online, and every few minutes.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";
import {
  store, read, write, unsyncedEntries, markEntriesSynced, mergeRemoteEntries, cloudState, mergeCloudState, clearDevice,
  unsyncedPhotos, markPhotosSynced, mergeRemotePhotos, photoFile, savePhotoFile, photoById,
  unsyncedDiary, markDiarySynced, mergeRemoteDiary,
} from "../core/store.js";
import { roomSnapshot } from "../world/room-snapshot.js";

const CLIENT_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const PAGE = 1000;
const PUSH_DELAY_MS = 1500;
const POLL_MS = 5 * 60_000;
const BUCKET = "photos";

let client = null;
let session = null;
let syncing = false;
let again = false;
let pushTimer;
let status = { state: "off" }; // off | signed-out | syncing | synced | error

export const cloudConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const cloudStatus = () => ({ ...status, email: session?.user?.email ?? null });
export const onCloudChange = (fn) => document.addEventListener("mimi:cloud", fn);

// The client and your user id while signed in, for the friends features (cloud/friends.js).
export async function cloud() {
  if (!session) return null;
  return { c: await getClient(), uid: session.user.id };
}

function setStatus(next) {
  status = next;
  document.dispatchEvent(new Event("mimi:cloud"));
}

async function getClient() {
  if (!client) {
    const { createClient } = await import(CLIENT_URL);
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

function friendly(err) {
  if (!navigator.onLine) return "You're offline. Mimi will sync when you're back.";
  const msg = String(err?.message ?? err ?? "");
  if (/fetch|network|load/i.test(msg)) return "Couldn't reach the cloud. Mimi will try again soon.";
  if (/relation .* does not exist|schema cache|column .* does not exist|bucket not found/i.test(msg)) return "The cloud database needs an update. Run supabase/schema.sql again in your Supabase project.";
  return msg || "Something went wrong while syncing.";
}

export async function initCloud() {
  if (!cloudConfigured()) return;
  try {
    const c = await getClient();
    const { data } = await c.auth.getSession();
    session = data.session;
    c.auth.onAuthStateChange((event, next) => {
      session = next;
      if (event === "SIGNED_IN") syncNow();
      if (event === "SIGNED_OUT") setStatus({ state: "signed-out" });
    });
    setStatus({ state: session ? "synced" : "signed-out" });
    if (session) syncNow();
    store.on(schedulePush);
    addEventListener("online", syncNow);
    setInterval(syncNow, POLL_MS);
  } catch (err) {
    setStatus({ state: "error", error: friendly(err) });
  }
}

function schedulePush() {
  if (!session) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncNow, PUSH_DELAY_MS);
}

function authError(err) {
  const msg = String(err?.message ?? err ?? "");
  if (/invalid login credentials/i.test(msg)) return "That email and password don't match.";
  if (/already registered|already exists/i.test(msg)) return "There's already an account with that email. Sign in instead.";
  if (/email not confirmed/i.test(msg)) return "Confirm your email first (check your inbox), then sign in.";
  if (/password should be|weak password/i.test(msg)) return "Pick a longer password (at least 6 characters).";
  if (/rate limit|too many/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  return friendly(err);
}

// Returns { error, existing? } or { notice } (sign-up needs an email confirmation) or {} when signed in.
export async function signIn(email, password) {
  try {
    const { error } = await (await getClient()).auth.signInWithPassword({ email, password });
    return error ? { error: authError(error) } : {};
  } catch (err) {
    return { error: authError(err) };
  }
}

export async function signUp(email, password) {
  try {
    const { data, error } = await (await getClient()).auth.signUp({
      email,
      password,
      options: { emailRedirectTo: location.origin + location.pathname },
    });
    // With email confirmation on, Supabase hides existing accounts behind a user with no identities.
    if (/already registered|already exists/i.test(error?.message ?? "") || (data?.user && !data.user.identities?.length)) {
      return { error: authError("already registered"), existing: true };
    }
    if (error) return { error: authError(error) };
    if (!data.session) return { notice: `Almost there: confirm your email (check ${email}), then sign in here.` };
    return {};
  } catch (err) {
    return { error: authError(err) };
  }
}

export async function signOut({ forgetDevice = false } = {}) {
  try {
    await (await getClient()).auth.signOut();
  } catch {}
  session = null;
  if (forgetDevice) await clearDevice();
  setStatus({ state: "signed-out" });
}

const lastPullKey = (table = "entries") => `lastPull${table === "entries" ? "" : `:${table}`}:${session.user.id}`;
const filePath = (id, size) => `${session.user.id}/${id}${size === "thumb" ? "-thumb" : ""}.jpg`;

async function pushEntries(c) {
  const pending = unsyncedEntries();
  for (let i = 0; i < pending.length; i += PAGE) {
    const batch = pending.slice(i, i + PAGE);
    const { error } = await c.from("entries").upsert(batch.map((r) => ({
      id: r.id,
      user_id: session.user.id,
      day: r.day,
      text: r.text,
      created_at: new Date(r.createdAt).toISOString(),
      updated_at: new Date(r.updatedAt).toISOString(),
      deleted: Boolean(r.deleted),
      photo_id: r.photoId ?? null,
    })));
    if (error) throw error;
    markEntriesSynced(batch);
  }
}

async function pullEntries(c) {
  let since = read(lastPullKey(), "1970-01-01T00:00:00Z");
  for (;;) {
    const { data, error } = await c.from("entries")
      .select("id,day,text,created_at,updated_at,deleted,photo_id,synced_at")
      .gt("synced_at", since)
      .order("synced_at", { ascending: true })
      .range(0, PAGE - 1);
    if (error) throw error;
    if (!data.length) break;
    mergeRemoteEntries(data);
    since = data.at(-1).synced_at;
    write(lastPullKey(), since);
    if (data.length < PAGE) break;
  }
}

// Postgres jsonb reorders keys, so compare with keys sorted.
const stable = (v) => JSON.stringify(v, (_, x) => (x && typeof x === "object" && !Array.isArray(x)
  ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)))
  : x));

async function pushPhotos(c) {
  const pending = unsyncedPhotos();
  if (!pending.length) return;
  const files = c.storage.from(BUCKET);
  for (const p of pending) {
    if (p.deleted) {
      await files.remove([filePath(p.id, "full"), filePath(p.id, "thumb")]); // best effort
      continue;
    }
    if (p.uploaded) continue;
    for (const size of ["full", "thumb"]) {
      const blob = await photoFile(p.id, size);
      if (!blob) continue;
      const { error } = await files.upload(filePath(p.id, size), blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
    }
  }
  const { error } = await c.from("photos").upsert(pending.map((p) => ({
    id: p.id,
    user_id: session.user.id,
    day: p.day,
    caption: p.caption ?? "",
    entry_id: p.entryId ?? null,
    created_at: new Date(p.createdAt).toISOString(),
    updated_at: new Date(p.updatedAt).toISOString(),
    deleted: Boolean(p.deleted),
  })));
  if (error) throw error;
  markPhotosSynced(pending);
}

async function pullPhotos(c) {
  let since = read(lastPullKey("photos"), "1970-01-01T00:00:00Z");
  let missing = [];
  for (;;) {
    const { data, error } = await c.from("photos")
      .select("id,day,caption,entry_id,created_at,updated_at,deleted,synced_at")
      .gt("synced_at", since)
      .order("synced_at", { ascending: true })
      .range(0, PAGE - 1);
    if (error) throw error;
    if (!data.length) break;
    missing = mergeRemotePhotos(data);
    since = data.at(-1).synced_at;
    write(lastPullKey("photos"), since);
    if (data.length < PAGE) break;
  }
  for (const p of missing) await downloadFile(c, p.id, "thumb");
}

async function downloadFile(c, id, size) {
  const { data, error } = await c.storage.from(BUCKET).download(filePath(id, size));
  if (error || !data) return null;
  await savePhotoFile(id, size, data);
  return data;
}

// Gets a photo's image from the cloud when this device doesn't have it yet.
export async function fetchPhotoFile(id, size = "full") {
  if (!session || !photoById(id)) return null;
  try {
    return await downloadFile(await getClient(), id, size);
  } catch {
    return null;
  }
}

async function pushDiary(c) {
  const pending = unsyncedDiary();
  for (let i = 0; i < pending.length; i += PAGE) {
    const batch = pending.slice(i, i + PAGE);
    const { error } = await c.from("diary_pages").upsert(batch.map((d) => ({
      user_id: session.user.id,
      day: d.day,
      text: d.text,
      mood: d.mood,
      updated_at: new Date(d.updatedAt).toISOString(),
    })), { onConflict: "user_id,day" });
    if (error) throw error;
    markDiarySynced(batch);
  }
}

async function pullDiary(c) {
  let since = read(lastPullKey("diary"), "1970-01-01T00:00:00Z");
  for (;;) {
    const { data, error } = await c.from("diary_pages")
      .select("day,text,mood,updated_at,synced_at")
      .gt("synced_at", since)
      .order("synced_at", { ascending: true })
      .range(0, PAGE - 1);
    if (error) throw error;
    if (!data.length) break;
    mergeRemoteDiary(data);
    since = data.at(-1).synced_at;
    write(lastPullKey("diary"), since);
    if (data.length < PAGE) break;
  }
}

async function syncState(c) {
  const { data, error } = await c.from("user_state").select("data,updated_at").maybeSingle();
  if (error) throw error;
  const merged = mergeCloudState(data?.data ?? {});
  if (stable(merged) !== stable(data?.data ?? null)) {
    const { error: upsertError } = await c.from("user_state").upsert({
      user_id: session.user.id,
      data: cloudState(),
      updated_at: new Date().toISOString(),
    });
    if (upsertError) throw upsertError;
  }
}

// Uploads the room snapshot when it changed since the last upload.
async function pushRoom(c) {
  const snapshot = roomSnapshot();
  const key = `roomPushed:${session.user.id}`;
  if (read(key, null) === stable(snapshot)) return;
  const { error } = await c.from("rooms").upsert({
    user_id: session.user.id,
    snapshot,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  write(key, stable(snapshot));
}

export async function syncNow() {
  if (!session) return;
  if (syncing) {
    again = true;
    return;
  }
  syncing = true;
  setStatus({ ...status, state: "syncing" });
  try {
    const c = await getClient();
    await pushPhotos(c);
    await pushEntries(c);
    await pullEntries(c);
    await pullPhotos(c);
    await syncState(c);
    await pushDiary(c);
    await pullDiary(c);
    await pushRoom(c);
    setStatus({ state: "synced", lastSync: Date.now() });
  } catch (err) {
    setStatus({ state: "error", error: friendly(err), lastSync: status.lastSync });
  } finally {
    syncing = false;
    if (again) {
      again = false;
      syncNow();
    }
  }
}
