// The app's data, kept in memory for fast synchronous reads and persisted to the
// on-device database (db.js). When signed in, cloud/sync.js mirrors it to Supabase.
// Call initStore() once before anything reads the store.
// Change entries with addEntry/removeEntry; change other data then call store.save(...).
// Listeners registered with store.on() re-render after every change.

import { dayKey, daysBetween } from "./dates.js";
import { openDatabase } from "./db.js";

// Named records in the database's key-value store.
export const KEYS = {
  settings: "settings",
  settingsTimes: "settingsTimes",
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
let records = []; // { id, day, text, createdAt, updatedAt, deleted, synced }, oldest first
let settingsSnapshot = {};

export const store = {
  days: {}, // derived view of live entries: { "2026-10-02": ["Coffee was perfect", ...] }
  settings: { ...DEFAULT_SETTINGS },
  scrapbook: [], // [{ at: 25, key, text }]
  treasures: [], // [{ id: "button", key }]

  save(...names) {
    for (const name of names) {
      if (name === "days") continue;
      if (name === "settings") stampSettingsChanges();
      write(KEYS[name], this[name]);
    }
    emit();
  },
  on(listener) {
    document.addEventListener("mimi:change", listener);
  },
};

const emit = () => document.dispatchEvent(new Event("mimi:change"));

export const read = (key, fallback) => kv[key] ?? fallback;

export function write(key, value) {
  kv[key] = value;
  db?.setKV(key, value).catch((err) => console.warn("Mimi couldn't save", key, err));
}

// Remember when each setting last changed so two devices can merge field by field.
function stampSettingsChanges() {
  const times = { ...read(KEYS.settingsTimes, {}) };
  let changed = false;
  for (const [key, value] of Object.entries(store.settings)) {
    if (settingsSnapshot[key] !== value) {
      times[key] = Date.now();
      changed = true;
    }
  }
  settingsSnapshot = { ...store.settings };
  if (changed) write(KEYS.settingsTimes, times);
}

const live = () => records.filter((r) => !r.deleted);

function rebuildDays() {
  store.days = {};
  for (const r of live()) (store.days[r.day] ??= []).push(r.text);
}

const persistRecords = (list) => db?.putEntries(list).catch((err) => console.warn("Mimi couldn't save entries", err));

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function addEntry(text, day = dayKey(), createdAt = Date.now()) {
  const record = { id: newId(), day, text, createdAt, updatedAt: createdAt, deleted: false, synced: false };
  records.push(record);
  (store.days[day] ??= []).push(text);
  persistRecords([record]);
  return record;
}

// Deletions are kept as tombstones so synced devices hear about them too.
export function removeEntry(day, index) {
  const record = live().filter((r) => r.day === day)[index];
  if (!record) return;
  Object.assign(record, { deleted: true, updatedAt: Date.now(), synced: false });
  rebuildDays();
  persistRecords([record]);
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
    days[day].forEach((text, i) => {
      const at = new Date(`${day}T12:00:00`).getTime() + i;
      migrated.push({ id: newId(), day, text, createdAt: at, updatedAt: at, deleted: false, synced: false });
    });
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

function loadMemory() {
  records.sort((a, b) => a.createdAt - b.createdAt);
  rebuildDays();
  store.settings = { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
  settingsSnapshot = { ...store.settings };
  store.scrapbook = read(KEYS.scrapbook, []);
  store.treasures = read(KEYS.treasures, []);
}

export async function initStore() {
  db = await openDatabase();
  const loaded = await db.loadAll();
  kv = loaded.kv;
  records = loaded.entries.map((r) => ({ deleted: false, synced: false, updatedAt: r.createdAt, ...r }));
  if (!kv.migrated) {
    if (!records.length) records = await migrateFromLocalStorage();
    write("migrated", true);
  }
  loadMemory();
  return db.kind;
}

// Forget everything on this device (used when signing out on a shared device).
export async function clearDevice() {
  await db.clearAll();
  kv = { migrated: true };
  await db.setKV("migrated", true);
  records = [];
  loadMemory();
  emit();
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
export const totalThings = () => live().length;
export const allEntries = () => live()
  .sort((a, b) => a.day.localeCompare(b.day) || a.createdAt - b.createdAt)
  .map(({ day, text }) => ({ key: day, text }));

// Days since the previous visit (0 on a first visit); records today's visit.
export function daysAway() {
  const prev = read(KEYS.visit, null);
  write(KEYS.visit, dayKey());
  return prev ? daysBetween(prev, dayKey()) : 0;
}

// ---- sync support (used by cloud/sync.js) ----

export const unsyncedEntries = () => records.filter((r) => !r.synced);

export function markEntriesSynced(list) {
  for (const r of list) r.synced = true;
  persistRecords(list);
}

// Applies entries from the cloud; the newer edit of each entry wins.
export function mergeRemoteEntries(rows) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const changed = [];
  for (const row of rows) {
    const remote = {
      id: row.id,
      day: row.day,
      text: row.text,
      createdAt: Date.parse(row.created_at),
      updatedAt: Date.parse(row.updated_at),
      deleted: row.deleted,
      synced: true,
    };
    const local = byId.get(row.id);
    if (local && local.updatedAt >= remote.updatedAt) continue;
    if (local) Object.assign(local, remote);
    else records.push(remote);
    changed.push(local ?? remote);
  }
  if (changed.length) {
    persistRecords(changed);
    loadMemory();
    emit();
  }
  return changed.length;
}

// The parts of Mimi's memory that follow you across devices.
export function cloudState() {
  return {
    settings: store.settings,
    settingsTimes: read(KEYS.settingsTimes, {}),
    scrapbook: store.scrapbook,
    treasures: store.treasures,
    milestones: read(KEYS.milestones, []),
    firstMet: read(KEYS.firstMet, null),
  };
}

const unionBy = (a = [], b = [], key) => [...a, ...b.filter((x) => !a.some((y) => key(y) === key(x)))];

// Merges cloud state into this device. Returns the merged state for uploading.
export function mergeCloudState(remote = {}) {
  const local = cloudState();
  const times = { ...local.settingsTimes };
  const settings = { ...local.settings };
  for (const [key, value] of Object.entries(remote.settings ?? {})) {
    const remoteAt = remote.settingsTimes?.[key] ?? 0;
    if (key in DEFAULT_SETTINGS && remoteAt > (times[key] ?? 0)) {
      settings[key] = value;
      times[key] = remoteAt;
    }
  }
  const firstMets = [local.firstMet, remote.firstMet].filter(Boolean).sort();
  const merged = {
    settings,
    settingsTimes: times,
    scrapbook: unionBy(local.scrapbook, remote.scrapbook, (p) => p.at).sort((a, b) => a.at - b.at),
    treasures: unionBy(local.treasures, remote.treasures, (t) => t.id),
    milestones: [...new Set([...local.milestones, ...(remote.milestones ?? [])])],
    firstMet: firstMets[0] ?? null,
  };

  if (JSON.stringify(merged) !== JSON.stringify(local)) {
    store.settings = merged.settings;
    settingsSnapshot = { ...merged.settings };
    store.scrapbook = merged.scrapbook;
    store.treasures = merged.treasures;
    for (const key of ["settings", "settingsTimes", "scrapbook", "treasures", "milestones", "firstMet"]) {
      if (merged[key] != null) write(KEYS[key], merged[key]);
    }
    emit();
  }
  return merged;
}

// ---- backup ----

export function exportBackup() {
  return JSON.stringify({
    app: "mimi-arigato",
    version: 3,
    exportedAt: new Date().toISOString(),
    days: store.days,
    entries: live(),
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
