const CACHE_NAME = 'falcons-workshop-v2';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Firebase and Google Identity API calls are left completely alone —
  // the app's own online/offline logic (queueing, retrying) handles
  // those, and caching them here would risk serving stale data.
  if (req.method !== 'GET') return;
  if (req.url.includes('firebaseio.com') || req.url.includes('googleapis.com')) return;

  // Page navigations (loading index.html itself): always try the
  // network FIRST so a freshly-deployed update shows immediately for
  // anyone online. Only fall back to the cached copy when the network
  // request genuinely fails — that's the true "no internet" case this
  // is actually for.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Other assets (fonts, etc.): cache-first is fine, they rarely change.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
