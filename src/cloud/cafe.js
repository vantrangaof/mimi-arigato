// The cat café, live: each person hosts a private Supabase Realtime channel, 'cafe:<host id>',
// that only the host and the host's friends can use (mimi_can_enter_cafe in supabase/schema.sql).
// Presence says whose cats are there; broadcasts carry pets and chat. Nothing is stored.

import { cloud } from "./sync.js";

const PEEK_MS = 4000;

async function client() {
  const session = await cloud();
  if (!session) return null;
  const { data } = await session.c.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  session.c.realtime.setAuth(token);
  return session;
}

// presenceState → [{ uid, catName, fur, customFur, wear, at }], oldest arrival first.
const people = (state) => Object.values(state)
  .map((list) => list[0])
  .filter((p) => p?.uid)
  .sort((a, b) => a.at - b.at);

// Joins a café as `me` ({ catName, fur, customFur, wear }). handlers: onPeople(list),
// onJoin(person), onLeave(person), onPet({ from, to }), onChat({ from, text }), onError(reason).
// Returns { uid, pet(to), say(text), leave() } or { error: "signed-out" }.
export async function joinCafe(hostId, me, handlers) {
  const session = await client();
  if (!session) return { error: "signed-out" };
  const { c, uid } = session;
  const channel = c.channel(`cafe:${hostId}`, {
    config: { private: true, broadcast: { self: false }, presence: { key: uid } },
  });
  let joined = false;

  channel
    .on("presence", { event: "sync" }, () => handlers.onPeople(people(channel.presenceState())))
    .on("presence", { event: "join" }, ({ newPresences }) => {
      for (const p of newPresences) if (p.uid !== uid && joined) handlers.onJoin(p);
    })
    .on("presence", { event: "leave" }, ({ leftPresences }) => {
      for (const p of leftPresences) if (p.uid !== uid) handlers.onLeave(p);
    })
    .on("broadcast", { event: "pet" }, ({ payload }) => handlers.onPet(payload))
    .on("broadcast", { event: "chat" }, ({ payload }) => handlers.onChat(payload))
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ ...me, uid, at: Date.now() });
        setTimeout(() => { joined = true; }, 1500); // arrivals before this were already here
      }
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") handlers.onError(status);
    });

  const send = (event, payload) => channel.send({ type: "broadcast", event, payload: { ...payload, from: uid } });
  return {
    uid,
    pet: (to) => send("pet", { to }),
    say: (text) => send("chat", { text }),
    leave: () => c.removeChannel(channel),
  };
}

// How many cats are in each café right now: Map(host id → count). Listens briefly, never tracks.
export async function peekCafes(hostIds) {
  const session = await client();
  const counts = new Map();
  if (!session) return counts;
  const { c } = session;
  await Promise.all(hostIds.map((id) => new Promise((resolve) => {
    const channel = c.channel(`cafe:${id}`, { config: { private: true } });
    const done = () => {
      c.removeChannel(channel);
      resolve();
    };
    const timer = setTimeout(done, PEEK_MS);
    channel.on("presence", { event: "sync" }, () => {
      counts.set(id, people(channel.presenceState()).length);
      clearTimeout(timer);
      done();
    }).subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        done();
      }
    });
  })));
  return counts;
}
