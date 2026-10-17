// Notifications from Mimi: this device subscribes to Web Push and saves the subscription (with
// its time zone and your daily reminder time) to push_subscriptions in Supabase. api/nudge.mjs
// sends from there. Needs you to be signed in; on iPhone, Mimi must be added to the Home Screen.

import { VAPID_PUBLIC_KEY } from "../config.js";
import { cloud } from "./sync.js";

const key = () => Uint8Array.from(atob(VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const installed = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
// On iPhone, notifications only work from the Home Screen app.
export const needsInstall = () => isIOS() && !installed();

async function current() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// "on" | "off" | "blocked" (the browser said no) | "unsupported"
export async function pushState() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return (await current()) ? "on" : "off";
}

async function save(sub, time) {
  const session = await cloud();
  if (!session) throw new Error("signed-out");
  const json = sub.toJSON();
  const { error } = await session.c.from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? b64url(sub.getKey("p256dh")),
    auth: json.keys?.auth ?? b64url(sub.getKey("auth")),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    time,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// Turns notifications on for this device. Throws Error("signed-out" | "denied") or a sync error.
export async function enablePush(time) {
  if (!(await cloud())) throw new Error("signed-out");
  if ((await Notification.requestPermission()) !== "granted") throw new Error("denied");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key() });
  await save(sub, time);
}

export async function disablePush() {
  const sub = await current();
  if (!sub) return;
  const session = await cloud();
  if (session) await session.c.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

// Your daily reminder time or time zone changed: tell the server (quietly; it's fine if offline).
export async function refreshPush(time) {
  const sub = await current().catch(() => null);
  if (sub) await save(sub, time).catch(() => {});
}
