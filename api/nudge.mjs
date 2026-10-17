// Notifications from Mimi (Vercel serverless function), called every hour by
// .github/workflows/nudge.yml with "Authorization: Bearer <CRON_SECRET>".
// For each device that turned notifications on (push_subscriptions in supabase/schema.sql), in
// that device's own time zone:
//   - at your daily reminder time, one gentle nudge, only on a day you haven't told Mimi anything
//   - your sticky notes, in the hour they're due
// Each is sent once a day (push_subscriptions.sent). Devices that are gone are removed.
// Needs CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel.

import crypto from "node:crypto";
import { sendPush } from "./_push.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://gbcobrwtrbsfdhqvnmow.supabase.co";

const pick = (list) => list[Math.floor(Math.random() * list.length)];

async function db(path, { method = "GET", body } = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=minimal" },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`supabase ${res.status} ${path.split("?")[0]}`);
  return method === "GET" ? res.json() : null;
}

// { day: "YYYY-MM-DD", hour } right now in a time zone (UTC if it's not a real one).
function localNow(tz, now = new Date()) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  } catch {
    return localNow("UTC", now);
  }
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

const hourOf = (time) => Number(String(time ?? "").slice(0, 2));

function dailyNudge(cat, fed, day) {
  if (fed?.food !== day) {
    return pick([
      `${cat} is sitting by their empty bowls… one good thing earns a fish.`,
      `${cat} is looking at their food bowl, then at you. Anything good today?`,
    ]);
  }
  return pick([
    `${cat} is by the window, waiting to hear about your day.`,
    `${cat} saved you a spot. Anything good today, even something tiny?`,
    `${cat} is curious: what was one good thing today?`,
  ]);
}

async function nudge() {
  const subs = await db("push_subscriptions?select=endpoint,user_id,p256dh,auth,tz,time,sent");
  const users = new Map(); // user_id → { state, toldToday } (looked up once per run)
  let sent = 0;
  let removed = 0;

  async function userInfo(uid, day) {
    const key = `${uid}|${day}`;
    if (!users.has(key)) {
      const [state] = await db(`user_state?select=data&user_id=eq.${uid}`);
      const told = await db(`entries?select=id&user_id=eq.${uid}&day=eq.${day}&deleted=eq.false&limit=1`);
      users.set(key, { data: state?.data ?? {}, toldToday: told.length > 0 });
    }
    return users.get(key);
  }

  for (const sub of subs) {
    const { day, hour } = localNow(sub.tz);
    const already = sub.sent?.day === day ? sub.sent.keys ?? [] : [];
    const dailyDue = hour === hourOf(sub.time) && !already.includes("daily");
    const info = await userInfo(sub.user_id, day);
    const cat = String(info.data.settings?.name ?? "").trim().slice(0, 24) || "Mimi";

    const messages = [];
    if (dailyDue && !info.toldToday) {
      messages.push({ key: "daily", title: cat, body: dailyNudge(cat, info.data.fed, day), tag: "mimi-daily" });
    }
    for (const note of info.data.reminders ?? []) {
      const key = `note-${note.id}`;
      if (note.deleted || note.done || note.due !== day || !note.time || hourOf(note.time) !== hour || already.includes(key)) continue;
      messages.push({ key, title: `${cat} is holding a note for you`, body: String(note.text).slice(0, 140), tag: key });
    }
    if (dailyDue && info.toldToday) messages.push({ key: "daily", skip: true }); // nothing to nudge about today

    const keys = [...already];
    for (const m of messages) {
      keys.push(m.key);
      if (m.skip) continue;
      const status = await sendPush(sub, { title: m.title, body: m.body, tag: m.tag, url: "/" }).catch(() => 0);
      if (status === 404 || status === 410) {
        await db(`push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" });
        removed += 1;
        break;
      }
      if (status >= 200 && status < 300) sent += 1;
    }
    if (keys.length !== already.length) {
      await db(`push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, {
        method: "PATCH",
        body: { sent: { day, keys }, updated_at: new Date().toISOString() },
      }).catch(() => {});
    }
  }
  return { devices: subs.length, sent, removed };
}

const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export default async function handler(req, res) {
  const send = (status, data) => res.status(status).json(data);
  const secret = process.env.CRON_SECRET;
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VAPID_PRIVATE_KEY) return send(503, { error: "not set up" });
  const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  if (!same(token, secret)) return send(401, { error: "no" });
  try {
    return send(200, await nudge());
  } catch (err) {
    console.error("nudge:", err?.message ?? err);
    return send(502, { error: "failed" });
  }
}
