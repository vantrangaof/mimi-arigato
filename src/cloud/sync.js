// Cloud sync with Supabase. The on-device database stays the source Mimi reads from;
// this module mirrors it to Postgres when you're signed in:
//   push  entries changed on this device (including deletions, as tombstones)
//   pull  entries other devices changed since our last pull (by server time, synced_at)
//   merge settings/scrapbook/treasures/milestones both ways (see store.mergeCloudState)
// Sync runs on sign-in, on open, shortly after changes, when back online, and every few minutes.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";
import {
  store, read, write, unsyncedEntries, markEntriesSynced, mergeRemoteEntries, cloudState, mergeCloudState, clearDevice,
} from "../core/store.js";

const CLIENT_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const PAGE = 1000;
const PUSH_DELAY_MS = 1500;
const POLL_MS = 5 * 60_000;

let client = null;
let session = null;
let syncing = false;
let again = false;
let pushTimer;
let status = { state: "off" }; // off | signed-out | syncing | synced | error

export const cloudConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const cloudStatus = () => ({ ...status, email: session?.user?.email ?? null });
export const onCloudChange = (fn) => document.addEventListener("mimi:cloud", fn);

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
  if (/relation .* does not exist|schema cache/i.test(msg)) return "The database tables are missing. Run supabase/schema.sql in your Supabase project.";
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

export async function sendSignInLink(email) {
  try {
    const c = await getClient();
    const { error } = await c.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + location.pathname },
    });
    return error ? friendly(error) : null;
  } catch (err) {
    return friendly(err);
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

const lastPullKey = () => `lastPull:${session.user.id}`;

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
    })));
    if (error) throw error;
    markEntriesSynced(batch);
  }
}

async function pullEntries(c) {
  let since = read(lastPullKey(), "1970-01-01T00:00:00Z");
  for (;;) {
    const { data, error } = await c.from("entries")
      .select("id,day,text,created_at,updated_at,deleted,synced_at")
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
    await pushEntries(c);
    await pullEntries(c);
    await syncState(c);
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
