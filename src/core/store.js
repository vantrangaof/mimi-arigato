// The app's data, kept in memory for fast synchronous reads and persisted to the
// database (see db.js). Call initStore() once before anything reads the store.
// Change entries with addEntry/removeEntry; change other data then call store.save(...).
// Listeners registered with store.on() re-render after every save.

import { dayKey, daysBetween } from "./dates.js";
import { openDatabase } from "./db.js";

// Named records in the database's key-value store.
export const KEYS = {
  settings: "settings",
  scrapbook: "scrapbook",
  treasures: "treasures",
  pets: "pets",
  treats: "treats",
  visit: "lastVisit",
  firstMet: "firstMet",
  milestones: "milestones",
  surprises: "surprises",
};

const DEFAULT_SETTINGS = {
  name: "", // the cat's name
  userName: "", // what the cat calls you
  nameAsked: false,
  fur: "pink",
  accessory: "none",
  reminder: "20:00",
  sound: true,
};

let db;
let kv = {};
let records = []; // entry records, oldest first

export const store = {
  days: {}, // derived view: { "2026-10-02": ["Coffee was perfect", ...] }
  settings: { ...DEFAULT_SETTINGS },
  scrapbook: [], // [{ at: 25, key, text }]
  treasures: [], // [{ id: "button", key }]

  save(...names) {
    for (const name of names) if (name !== "days") write(KEYS[name], this[name]);
    document.dispatchEvent(new Event("mimi:change"));
  },
  on(listener) {
    document.addEventListener("mimi:change", listener);
  },
};

export const read = (key, fallback) => kv[key] ?? fallback;

export function write(key, value) {
  kv[key] = value;
  db?.setKV(key, value).catch((err) => console.warn("Mimi couldn't save", key, err));
}

function rebuildDays() {
  store.days = {};
  for (const r of records) (store.days[r.day] ??= []).push(r.text);
}

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function addEntry(text, day = dayKey(), createdAt = Date.now()) {
  const record = { id: newId(), day, text, createdAt };
  records.push(record);
  (store.days[day] ??= []).push(text);
  db?.putEntries([record]).catch((err) => console.warn("Mimi couldn't save an entry", err));
  return record;
}

export function removeEntry(day, index) {
  const record = records.filter((r) => r.day === day)[index];
  if (!record) return;
  records = records.filter((r) => r !== record);
  rebuildDays();
  db?.deleteEntry(record.id).catch((err) => console.warn("Mimi couldn't remove an entry", err));
}

// Moves data saved by earlier versions (plain localStorage keys) into the database.
async function migrateFromLocalStorage() {
  const legacy = (key) => {
    try {
      return JSON.parse(localStorage.getItem(`mimi.${key}`));
    } catch {
      return null;
    }
  };
  const days = legacy("days") ?? {};
  const migrated = [];
  for (const day of Object.keys(days).sort()) {
    days[day].forEach((text, i) => migrated.push({ id: newId(), day, text, createdAt: new Date(`${day}T12:00:00`).getTime() + i }));
  }
  if (migrated.length) await db.putEntries(migrated);
  for (const key of Object.values(KEYS)) {
    const value = legacy(key);
    if (value != null) {
      kv[key] = value;
      await db.setKV(key, value);
    }
  }
  return migrated;
}

export async function initStore() {
  db = await openDatabase();
  const loaded = await db.loadAll();
  kv = loaded.kv;
  records = loaded.entries;
  if (!kv.migrated) {
    if (!records.length) records = await migrateFromLocalStorage();
    write("migrated", true);
  }
  records.sort((a, b) => a.createdAt - b.createdAt);
  rebuildDays();
  store.settings = { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
  store.scrapbook = read(KEYS.scrapbook, []);
  store.treasures = read(KEYS.treasures, []);
  return db.kind;
}

// ---- reads ----

export function dailyCount(key) {
  const v = read(key, null);
  return v && v.date === dayKey() ? v.count : 0;
}

export function setDailyCount(key, count) {
  write(key, { date: dayKey(), count });
}

export const catName = () => store.settings.name.trim() || "Mimi";
export const catTitle = () => store.settings.name.trim() || "Mimi Arigato";
export const userName = () => store.settings.userName.trim();

export const entriesFor = (key) => store.days[key] ?? [];
export const entriesToday = () => entriesFor(dayKey());
export const totalThings = () => records.length;
export const allEntries = () => [...records].sort((a, b) => a.day.localeCompare(b.day) || a.createdAt - b.createdAt).map(({ day, text }) => ({ key: day, text }));

// Days since the previous visit (0 on a first visit); records today's visit.
export function daysAway() {
  const prev = read(KEYS.visit, null);
  write(KEYS.visit, dayKey());
  return prev ? daysBetween(prev, dayKey()) : 0;
}

// ---- backup ----

export function exportBackup() {
  return JSON.stringify({
    app: "mimi-arigato",
    version: 3,
    exportedAt: new Date().toISOString(),
    days: store.days,
    entries: records,
    settings: store.settings,
    scrapbook: store.scrapbook,
    treasures: store.treasures,
    firstMet: read(KEYS.firstMet, null),
  }, null, 2);
}

const isDayKey = (k) => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k);

// Merges a backup into what's here and never deletes. Returns how many entries were added.
export function importBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("not-json");
  }
  if (data?.app !== "mimi-arigato" || !data.days || typeof data.days !== "object") throw new Error("not-backup");

  let added = 0;
  for (const [day, list] of Object.entries(data.days)) {
    if (!isDayKey(day) || !Array.isArray(list)) continue;
    for (const item of list) {
      const t = typeof item === "string" ? item.trim().slice(0, 500) : "";
      if (t && !entriesFor(day).includes(t)) {
        addEntry(t, day, new Date(`${day}T12:00:00`).getTime() + added);
        added += 1;
      }
    }
  }

  const s = data.settings;
  if (s && typeof s === "object") {
    for (const key of ["name", "userName"]) if (typeof s[key] === "string") store.settings[key] = s[key].slice(0, 24);
    if (typeof s.fur === "string") store.settings.fur = s.fur;
    if (typeof s.accessory === "string") store.settings.accessory = s.accessory;
    if (typeof s.reminder === "string" && /^\d{2}:\d{2}$/.test(s.reminder)) store.settings.reminder = s.reminder;
    if (typeof s.sound === "boolean") store.settings.sound = s.sound;
    if (store.settings.userName) store.settings.nameAsked = true;
  }

  if (Array.isArray(data.scrapbook)) {
    for (const page of data.scrapbook) {
      if (Number.isInteger(page?.at) && isDayKey(page.key) && typeof page.text === "string"
        && !store.scrapbook.some((p) => p.at === page.at)) {
        store.scrapbook.push({ at: page.at, key: page.key, text: page.text.slice(0, 500) });
      }
    }
    store.scrapbook.sort((a, b) => a.at - b.at);
  }
  if (Array.isArray(data.treasures)) {
    for (const t of data.treasures) {
      if (typeof t?.id === "string" && isDayKey(t.key) && !store.treasures.some((x) => x.id === t.id)) {
        store.treasures.push({ id: t.id, key: t.key });
      }
    }
  }
  if (isDayKey(data.firstMet)) {
    const current = read(KEYS.firstMet, null);
    if (!current || data.firstMet < current) write(KEYS.firstMet, data.firstMet);
  }

  store.save("days", "settings", "scrapbook", "treasures");
  return added;
}
