/* Wapsell service worker — makes the panel installable and shows a page when there is no connection.
 * It never caches pages or API answers (they carry the Business's data and the session): navigations always go
 * to the network and fall back to /offline.html. Only static files are cached. */
const VERSION = 'wapsell-v1';
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStatic = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith('/build/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/'));

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(VERSION);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  // Hashed build files and icons: cache first (they never change under the same name).
  if (isStatic(url)) event.respondWith(cacheFirst(request));
  // Everything else (data, API, session): straight to the network, untouched.
});
