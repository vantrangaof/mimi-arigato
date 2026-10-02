// Persistence: an IndexedDB database with two object stores.
//   entries  { id, day: "YYYY-MM-DD", text, createdAt }  (index: day)
//   kv       small named records: settings, scrapbook, treasures, counters…
// Falls back to localStorage if IndexedDB is unavailable (some private-browsing modes).

const DB_NAME = "mimi-arigato";
const DB_VERSION = 1;

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("entries", { keyPath: "id" }).createIndex("day", "day");
      db.createObjectStore("kv");
    };
    req.onsuccess = () => {
      // If another tab needs to upgrade or delete the database, step aside instead of blocking it.
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("database blocked"));
  });
}

function indexedDBAdapter(db) {
  const run = (name, mode, fn) => new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    fn(tx.objectStore(name));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return {
    kind: "indexeddb",
    async loadAll() {
      const tx = db.transaction(["entries", "kv"]);
      const kvStore = tx.objectStore("kv");
      const [entries, keys, values] = await Promise.all([
        request(tx.objectStore("entries").getAll()),
        request(kvStore.getAllKeys()),
        request(kvStore.getAll()),
      ]);
      return { entries, kv: Object.fromEntries(keys.map((k, i) => [k, values[i]])) };
    },
    putEntries: (list) => run("entries", "readwrite", (s) => list.forEach((e) => s.put(e))),
    clearAll: async () => {
      await run("entries", "readwrite", (s) => s.clear());
      await run("kv", "readwrite", (s) => s.clear());
    },
    setKV: (key, value) => run("kv", "readwrite", (s) => s.put(value, key)),
  };
}

function localStorageAdapter() {
  const ENTRIES = "mimi.db.entries";
  const kvKey = (k) => `mimi.db.kv.${k}`;
  const get = (k, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const set = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };

  return {
    kind: "localstorage",
    async loadAll() {
      const kv = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith("mimi.db.kv.")) kv[k.slice("mimi.db.kv.".length)] = get(k, null);
      }
      return { entries: get(ENTRIES, []), kv };
    },
    async putEntries(list) {
      const byId = new Map(get(ENTRIES, []).map((e) => [e.id, e]));
      for (const e of list) byId.set(e.id, e);
      set(ENTRIES, [...byId.values()]);
    },
    async clearAll() {
      for (const k of Object.keys(localStorage)) if (k.startsWith("mimi.db.")) localStorage.removeItem(k);
    },
    async setKV(key, value) {
      set(kvKey(key), value);
    },
  };
}

export async function openDatabase() {
  try {
    return indexedDBAdapter(await openIndexedDB());
  } catch {
    return localStorageAdapter();
  }
}
