const CACHE_NAME = 'aura-cache-v19';
const ASSETS = [
  '/',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: Pre-cache static shell assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets...');
      return cache.addAll(ASSETS);
    })
  );
});

// Allow manual update via postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: Clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache...', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Serve cache-first with network fallback strategy
self.addEventListener('fetch', (e) => {
  // Only handle GET requests (API calls like exchange rate fetch are handled gracefully online)
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Skip caching live currency API calls to always get real rates when online
  if (url.hostname.includes('api.exchangerate-api.com') || url.hostname.includes('open.er-api.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Fetch and cache dynamically for external scripts, styles, flags etc.
      return fetch(e.request).then((networkResponse) => {
        // Do not cache opaque or redirected responses to prevent Safari issues
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !e.request.url.startsWith('https://')) {
          return networkResponse;
        }
        if (networkResponse.redirected) {
            return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Safe fallback for offline requests
        if (e.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
