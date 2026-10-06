// Friends: invite codes, the friends list, and visiting a friend's room.
// Friendships live in Supabase (see the "Friends and visiting" part of supabase/schema.sql);
// this device keeps the last list so Friends can show names offline.

import { read, write } from "../core/store.js";
import { cloud } from "./sync.js";

// No 0/O, 1/I/L, so codes are easy to read out and type.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const DAY_MS = 86_400_000;

export const formatCode = (code) => `${code.slice(0, 3)}-${code.slice(3)}`;
export const normalizeCode = (text) => String(text ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const isCode = (code) => code.length === CODE_LENGTH && [...code].every((ch) => ALPHABET.includes(ch));
export const inviteLink = (code) => `${location.origin}${location.pathname}#invite=${code}`;

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

function friendlyError(err) {
  const msg = String(err?.message ?? err ?? "");
  if (!navigator.onLine || /fetch|network|load/i.test(msg)) return "Couldn't reach the cloud. Check your connection and try again.";
  if (/invite not found/i.test(msg)) return "That code didn't work. It may already be used or more than 7 days old.";
  if (/own invite/i.test(msg)) return "That's your own invite. Send it to a friend!";
  if (/sign in first/i.test(msg)) return "Sign in first.";
  if (/relation .* does not exist|schema cache|function .* does not exist/i.test(msg)) return "The cloud database needs an update. Run supabase/schema.sql again in your Supabase project.";
  return msg || "Something went wrong.";
}

async function run(fn) {
  const session = await cloud();
  if (!session) return { error: "Sign in first." };
  try {
    return await fn(session);
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

// ---- invites ----

// Your invite code: an unused one with at least a day left, or a new one. Returns { code } or { error }.
export const myInvite = () => run(async ({ c, uid }) => {
  const { data, error } = await c.from("friend_invites")
    .select("code,expires_at")
    .eq("user_id", uid)
    .is("used_by", null)
    .gt("expires_at", new Date(Date.now() + DAY_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (data?.length) return { code: data[0].code };
  for (let tries = 0; tries < 3; tries++) {
    const code = randomCode();
    const { error: insertError } = await c.from("friend_invites").insert({ code, user_id: uid });
    if (!insertError) return { code };
    if (insertError.code !== "23505") throw insertError; // 23505: that code is taken, try another
  }
  throw new Error("Couldn't make a code. Try again.");
});

// The cat name behind an invite code ({ catName }), or { error } if it can't be used.
export const peekInvite = (code) => run(async ({ c }) => {
  const { data, error } = await c.rpc("peek_invite", { invite_code: code });
  if (error) throw error;
  if (!data) throw new Error("invite not found");
  if (data.own) throw new Error("own invite");
  return { catName: data.cat_name };
});

export const acceptInvite = (code) => run(async ({ c }) => {
  const { data, error } = await c.rpc("accept_invite", { invite_code: code });
  if (error) throw error;
  return { friendId: data };
});

// An invite that arrived in a link (#invite=CODE) waits here until you're signed in and say yes.
export function takeInviteFromLink() {
  const match = location.hash.match(/invite=([A-Za-z0-9-]+)/);
  if (!match) return;
  const code = normalizeCode(match[1]);
  if (isCode(code)) write("pendingInvite", code);
  history.replaceState(null, "", location.pathname + location.search);
}
export const pendingInvite = () => read("pendingInvite", null);
export const clearPendingInvite = () => write("pendingInvite", null);

// ---- friends ----

const cacheKey = (uid) => `friends:${uid}`;

// What Friends shows offline: [{ id, catName, fur, customFur, since }]
export async function cachedFriends() {
  const session = await cloud();
  return session ? read(cacheKey(session.uid), null) : null;
}

const summary = (id, since, snap) => ({
  id,
  since,
  catName: snap?.catName || "A friend's cat",
  fur: snap?.fur ?? "pink",
  customFur: snap?.customFur ?? null,
});

// Your friends with their rooms. Returns { friends, added } (added: friends that weren't in
// the last list on this device) or { error }.
export const loadFriends = () => run(async ({ c, uid }) => {
  const { data: rows, error } = await c.from("friends").select("friend_id,created_at").order("created_at");
  if (error) throw error;
  const ids = rows.map((r) => r.friend_id);
  let rooms = [];
  if (ids.length) {
    const { data, error: roomError } = await c.from("rooms").select("user_id,snapshot").in("user_id", ids);
    if (roomError) throw roomError;
    rooms = data;
  }
  const friends = rows.map((r) => summary(r.friend_id, r.created_at, rooms.find((x) => x.user_id === r.friend_id)?.snapshot));
  const before = read(cacheKey(uid), null);
  const added = before ? friends.filter((f) => !before.some((b) => b.id === f.id)) : [];
  write(cacheKey(uid), friends);
  return { friends, added };
});

// A friend's room snapshot ({ room }), or { error }.
export const visitRoom = (friendId) => run(async ({ c }) => {
  const { data, error } = await c.from("rooms").select("snapshot").eq("user_id", friendId).maybeSingle();
  if (error) throw error;
  return { room: data?.snapshot ?? null };
});

export const removeFriend = (friendId) => run(async ({ c, uid }) => {
  const { error } = await c.from("friends").delete().eq("user_id", uid).eq("friend_id", friendId);
  if (error) throw error;
  write(cacheKey(uid), (read(cacheKey(uid), []) ?? []).filter((f) => f.id !== friendId));
  return {};
});
