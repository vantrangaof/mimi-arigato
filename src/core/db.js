// Persistence: an IndexedDB database with four object stores.
//   entries     { id, day: "YYYY-MM-DD", text, createdAt, updatedAt, deleted, synced, photoId }
//   kv          small named records: settings, scrapbook, treasures, counters…
//   photos      photo details { id, day, caption, entryId, createdAt, updatedAt, deleted, synced, … }
//   photoFiles  image blobs keyed "<photoId>:full" and "<photoId>:thumb"
// Falls back to localStorage if IndexedDB is unavailable (some private-browsing modes);
// there, photos are stored as data URLs and may not fit.

const DB_NAME = "mimi-arigato";
const DB_VERSION = 2;

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (event.oldVersion < 1) {
        db.createObjectStore("entries", { keyPath: "id" }).createIndex("day", "day");
        db.createObjectStore("kv");
      }
      if (event.oldVersion < 2) {
        db.createObjectStore("photos", { keyPath: "id" });
        db.createObjectStore("photoFiles");
      }
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
      const tx = db.transaction(["entries", "kv", "photos"]);
      const kvStore = tx.objectStore("kv");
      const [entries, keys, values, photos] = await Promise.all([
        request(tx.objectStore("entries").getAll()),
        request(kvStore.getAllKeys()),
        request(kvStore.getAll()),
        request(tx.objectStore("photos").getAll()),
      ]);
      return { entries, photos, kv: Object.fromEntries(keys.map((k, i) => [k, values[i]])) };
    },
    putEntries: (list) => run("entries", "readwrite", (s) => list.forEach((e) => s.put(e))),
    putPhotos: (list) => run("photos", "readwrite", (s) => list.forEach((p) => s.put(p))),
    putFile: (key, blob) => run("photoFiles", "readwrite", (s) => s.put(blob, key)),
    getFile: (key) => request(db.transaction("photoFiles").objectStore("photoFiles").get(key)).then((b) => b ?? null),
    deleteFiles: (keys) => run("photoFiles", "readwrite", (s) => keys.forEach((k) => s.delete(k))),
    setKV: (key, value) => run("kv", "readwrite", (s) => s.put(value, key)),
    clearAll: async () => {
      for (const name of ["entries", "kv", "photos", "photoFiles"]) await run(name, "readwrite", (s) => s.clear());
    },
  };
}

function localStorageAdapter() {
  const ENTRIES = "mimi.db.entries";
  const PHOTOS = "mimi.db.photos";
  const kvKey = (k) => `mimi.db.kv.${k}`;
  const fileKey = (k) => `mimi.db.file.${k}`;
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
  const merge = (key, list) => {
    const byId = new Map(get(key, []).map((x) => [x.id, x]));
    for (const x of list) byId.set(x.id, x);
    set(key, [...byId.values()]);
  };
  const toDataURL = (blob) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  return {
    kind: "localstorage",
    async loadAll() {
      const kv = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith("mimi.db.kv.")) kv[k.slice("mimi.db.kv.".length)] = get(k, null);
      }
      return { entries: get(ENTRIES, []), photos: get(PHOTOS, []), kv };
    },
    async putEntries(list) {
      merge(ENTRIES, list);
    },
    async putPhotos(list) {
      merge(PHOTOS, list);
    },
    async putFile(key, blob) {
      set(fileKey(key), await toDataURL(blob));
    },
    async getFile(key) {
      const url = get(fileKey(key), null);
      return url ? (await fetch(url)).blob() : null;
    },
    async deleteFiles(keys) {
      for (const k of keys) localStorage.removeItem(fileKey(k));
    },
    async setKV(key, value) {
      set(kvKey(key), value);
    },
    async clearAll() {
      for (const k of Object.keys(localStorage)) if (k.startsWith("mimi.db.")) localStorage.removeItem(k);
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
