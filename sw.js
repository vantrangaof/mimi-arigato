// Mimi Arigato — works offline by keeping a copy of the app shell.
// Add new files to SHELL so they are available offline from the first visit.

const CACHE_VERSION = "mimi-v7";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./sprite.js",
  "./store.js",
  "./mimi.js",
  "./journal.js",
  "./calendar.js",
  "./play.js",
  "./settings.js",
  "./share.js",
  "./sound.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network first so edits show up immediately; the cache is the offline fallback.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
