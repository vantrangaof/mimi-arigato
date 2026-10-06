// Mimi's AI: asks api/mimi.mjs (a Vercel function) to check a good thing or to chat.
// Only while signed in (the function counts calls per person). Everything here fails soft:
// if the AI can't be reached, good things are accepted as before and chat says so kindly.

import { cloud } from "./sync.js";

const ENDPOINT = "/api/mimi";
const CHECK_TIMEOUT_MS = 6_000;
const CHAT_TIMEOUT_MS = 15_000;

async function ask(body, timeout) {
  const session = await cloud();
  if (!session) return { error: "signed-out" };
  const { data } = await session.c.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "signed-out" };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (res.status === 429) return { error: "sleepy" };
    if (res.status === 401) return { error: "signed-out" };
    if (!res.ok) return { error: "unavailable" };
    return await res.json();
  } catch {
    return { error: navigator.onLine ? "unavailable" : "offline" };
  }
}

// { verdict: "good" | "unclear" | "hard", reply } or { error }. Callers accept the good thing on error.
export const checkGoodThing = (text, { catName, userName }) =>
  ask({ kind: "check", text, catName, userName }, CHECK_TIMEOUT_MS);

// messages: [{ role: "you" | "mimi", text }], context: what Mimi knows (see ui/chat.js). → { reply } or { error }
export const chatWithMimi = (messages, context) =>
  ask({ kind: "chat", messages, context }, CHAT_TIMEOUT_MS);
