// IRVITE Scanner Service Worker (PWA Offline Capability)
const CACHE_NAME = 'irvite-scanner-v1';

const STATIC_ASSETS = [
  '/',
  '/events',
  '/logo.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Fail open if some assets are dynamic
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache mutation APIs or external calls in service worker
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Handle static assets & page navigation
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          // Stale-while-revalidate for static assets
          fetch(event.request)
            .then((res) => {
              if (res.status === 200) {
                const clone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              }
            })
            .catch(() => {});
          return cached;
        }

        return fetch(event.request)
          .then((networkRes) => {
            if (networkRes.status === 200 && event.request.url.startsWith('http')) {
              const clone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkRes;
          })
          .catch(() => {
            // If offline navigation, fall back to cached events or root
            if (event.request.mode === 'navigate') {
              return caches.match('/events') || caches.match('/');
            }
          });
      })
    );
  }
});

