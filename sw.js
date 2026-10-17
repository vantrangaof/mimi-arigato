// Offline support: keeps a copy of the app shell. Network first, so edits show up
// immediately; the cached copy is the fallback when offline.
// Add new files to SHELL so they're available offline from the first visit.

const CACHE_VERSION = "mimi-v33";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
  "./assets/sounds/meow.m4a",
  "./assets/sounds/purr.m4a",
  "./styles/tokens.css",
  "./styles/base.css",
  "./styles/layout.css",
  "./styles/cat.css",
  "./styles/panels.css",
  "./styles/games.css",
  "./src/main.js",
  "./src/config.js",
  "./src/cloud/sync.js",
  "./src/cloud/friends.js",
  "./src/core/dates.js",
  "./src/core/db.js",
  "./src/core/dom.js",
  "./src/core/pixel.js",
  "./src/core/store.js",
  "./src/core/images.js",
  "./src/cat/sprite.js",
  "./src/cat/mimi.js",
  "./src/cat/sound.js",
  "./src/cat/music.js",
  "./src/cat/fur-photo.js",
  "./src/world/world.js",
  "./src/world/surprises.js",
  "./src/world/seasons.js",
  "./src/world/room-snapshot.js",
  "./src/memory/insights.js",
  "./src/memory/relationship.js",
  "./src/memory/themes.js",
  "./src/memory/theories.js",
  "./src/memory/wishes.js",
  "./src/memory/year-ago.js",
  "./src/memory/reminders.js",
  "./src/core/ics.js",
  "./src/ui/reminders.js",
  "./src/ui/streak.js",
  "./src/ui/install.js",
  "./src/ui/year-ago.js",
  "./src/memory/scrapbook.js",
  "./src/memory/quotes.js",
  "./src/memory/mimi-good.js",
  "./src/memory/postcard.js",
  "./src/memory/about.js",
  "./src/memory/remember.js",
  "./src/memory/needs.js",
  "./src/memory/challenges.js",
  "./src/memory/streak.js",
  "./src/ui/habitat.js",
  "./src/ui/topbar.js",
  "./src/ui/intro.js",
  "./src/ui/journal.js",
  "./src/ui/tabs.js",
  "./src/ui/memories.js",
  "./src/ui/scrapbook.js",
  "./src/ui/month.js",
  "./src/ui/calendar.js",
  "./src/ui/play.js",
  "./src/ui/settings.js",
  "./src/ui/share.js",
  "./src/ui/account.js",
  "./src/ui/note.js",
  "./src/ui/wardrobe.js",
  "./src/ui/photos.js",
  "./src/ui/diary.js",
  "./src/ui/jar.js",
  "./src/ui/bedtime.js",
  "./src/ui/postcard.js",
  "./src/ui/about.js",
  "./src/ui/guide.js",
  "./src/ui/good-reminder.js",
  "./src/ui/challenge.js",
  "./src/ui/cat-diary.js",
  "./src/ui/push.js",
  "./src/ui/thanks.js",
  "./src/ui/friends.js",
  "./src/ui/visit.js",
  "./src/ui/theme.js",
  "./src/ui/chat.js",
  "./src/cloud/ai.js",
  "./src/cloud/push.js",
  "./src/ui/games.js",
  "./src/games/catch.js",
  "./src/games/pairs.js",
  "./src/games/song.js",
  "./src/games/shuffle.js",
  "./src/games/belly.js",
  "./src/games/tower.js",
  "./src/games/toss.js",
  "./src/games/pumpkins.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

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

// Notifications from Mimi (api/nudge.mjs): show it, and open the app when it's tapped.
self.addEventListener("push", (event) => {
  let msg = {};
  try {
    msg = event.data?.json() ?? {};
  } catch {
    msg = { body: event.data?.text() };
  }
  event.waitUntil(self.registration.showNotification(msg.title || "Mimi", {
    body: msg.body || "Mimi is thinking about you.",
    tag: msg.tag || "mimi",
    icon: "assets/icons/icon-192.png",
    badge: "assets/icons/icon-192.png",
    data: { url: msg.url || "./" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) return open.focus();
    return self.clients.openWindow(event.notification.data?.url || "./");
  })());
});
