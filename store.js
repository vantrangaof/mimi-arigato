// Everything Mimi remembers lives in this browser's localStorage.

export const KEYS = {
  days: "mimi.days",
  pets: "mimi.pets",
  treats: "mimi.treats",
  settings: "mimi.settings",
  visit: "mimi.lastVisit",
};

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function dayKey(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const shortFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
export const formatShort = (key) => shortFmt.format(parseDay(key));

const DEFAULT_SETTINGS = { name: "", fur: "pink", accessory: "none", reminder: "20:00", sound: true };

export const store = {
  days: load(KEYS.days, {}),
  settings: { ...DEFAULT_SETTINGS, ...load(KEYS.settings, {}) },
  daily(key) {
    const v = load(key, null);
    return v && v.date === dayKey() ? v.count : 0;
  },
  setDaily(key, count) {
    save(key, { date: dayKey(), count });
  },
  saveDays() {
    save(KEYS.days, this.days);
    this.emit();
  },
  saveSettings() {
    save(KEYS.settings, this.settings);
    this.emit();
  },
  emit() {
    document.dispatchEvent(new Event("mimi:change"));
  },
  on(fn) {
    document.addEventListener("mimi:change", fn);
  },
};

export const catName = () => store.settings.name.trim() || "Mimi";
export const catTitle = () => store.settings.name.trim() || "Mimi Arigato";

export const entriesFor = (key) => store.days[key] ?? [];

export function streak() {
  const d = new Date();
  const doneToday = entriesFor(dayKey(d)).length > 0;
  if (!doneToday) d.setDate(d.getDate() - 1);
  let days = 0;
  while (entriesFor(dayKey(d)).length) {
    days += 1;
    d.setDate(d.getDate() - 1);
  }
  return { days, doneToday };
}

export function totalThings() {
  return Object.values(store.days).reduce((n, list) => n + list.length, 0);
}

export function randomMemory() {
  const today = dayKey();
  const pool = Object.entries(store.days)
    .filter(([key]) => key < today)
    .flatMap(([key, list]) => list.map((text) => ({ key, text })));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// Days since the previous visit (0 on the first visit); records today's visit.
export function daysAway() {
  const prev = load(KEYS.visit, null);
  save(KEYS.visit, dayKey());
  if (!prev) return 0;
  return Math.round((parseDay(dayKey()) - parseDay(prev)) / 86400000);
}

export function exportBackup() {
  return JSON.stringify({
    app: "mimi-arigato",
    version: 1,
    exportedAt: new Date().toISOString(),
    days: store.days,
    settings: store.settings,
  }, null, 2);
}

// Merges a backup into what's here; never deletes. Returns how many entries were added.
export function importBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("not-json");
  }
  if (data?.app !== "mimi-arigato" || !data.days || typeof data.days !== "object") throw new Error("not-backup");

  let added = 0;
  for (const [key, list] of Object.entries(data.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(list)) continue;
    const merged = [...entriesFor(key)];
    for (const item of list) {
      if (typeof item !== "string") continue;
      const t = item.trim().slice(0, 500);
      if (t && !merged.includes(t)) {
        merged.push(t);
        added += 1;
      }
    }
    if (merged.length) store.days[key] = merged;
  }

  const s = data.settings;
  if (s && typeof s === "object") {
    if (typeof s.name === "string") store.settings.name = s.name.slice(0, 16);
    if (typeof s.fur === "string") store.settings.fur = s.fur;
    if (typeof s.accessory === "string") store.settings.accessory = s.accessory;
    if (typeof s.reminder === "string" && /^\d{2}:\d{2}$/.test(s.reminder)) store.settings.reminder = s.reminder;
    if (typeof s.sound === "boolean") store.settings.sound = s.sound;
    save(KEYS.settings, store.settings);
  }
  store.saveDays();
  return added;
}
