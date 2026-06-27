const CACHE_VERSION = 'levelup-cache-v2';
const RUNTIME_CACHE = 'levelup-runtime-v2';
const APP_SHELL = ['/manifest.webmanifest', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![CACHE_VERSION, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/** Vite 产物带 hash，部署后必须 network-first，否则缓存旧 JS 会导致白屏/黑屏。 */
function networkFirst(req, cacheName = RUNTIME_CACHE) {
  return fetch(req)
    .then((resp) => {
      if (resp.ok) {
        const copy = resp.clone();
        caches.open(cacheName).then((cache) => cache.put(req, copy));
      }
      return resp;
    })
    .catch(() => caches.match(req));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/build/') || url.pathname === '/sw.js') {
    event.respondWith(networkFirst(req));
    return;
  }

  const isImmutableAsset =
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.glb') ||
    url.pathname.endsWith('.mp3');

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return networkFirst(req);
      })
    );
    return;
  }

  event.respondWith(
    networkFirst(req).catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
  );
});

