// sw.js — the service worker: offline, and a home-screen app that opens.
//
// Deliberately network-first for code. A cache-first worker is how a web app
// strands people on a version you have already fixed — the app updates by
// replacing code (decision 10), and a worker that prefers its own copy can
// quietly refuse the replacement for weeks. So: when the network answers, that
// answer wins and is kept; when it does not, the kept copy is served. Offline
// works, and being online means being current.
//
// Nothing here touches IndexedDB. User data is never in a cache, never in a
// request, and never leaves the device.

const CACHE = 'protocol-shell';

// Enough to open the app cold with no network. Everything else the app pulls
// (its modules, its icons) is cached the first time it is fetched.
const SHELL = ['./', './index.html', './src/styles/design.css', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      // A failed precache must not block activation: the app still works
      // online, and the fetch handler will fill the cache as it goes.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch anything off-device

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Only real answers are worth keeping. An error page cached as the
        // app is how "it went blank and stayed blank" happens.
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        // A navigation with nothing cached for that exact URL still opens the
        // app — it is a single page, and the shell is what the person wants.
        if (req.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        throw new Error('offline and not cached');
      }),
  );
});
