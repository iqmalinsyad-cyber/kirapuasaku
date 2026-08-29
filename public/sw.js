// KiraPuasaKu Service Worker - Resilient PWA Offline Support
const CACHE_NAME = 'kirapuasaku-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Never intercept non-GET, API routes, Vite internal modules, or dev server scripts
  if (
    event.request.method !== 'GET' ||
    url.includes('/api/') ||
    url.includes('/@') ||
    url.includes('/src/') ||
    url.includes('node_modules') ||
    url.includes('vite') ||
    url.includes('hot-update')
  ) {
    return;
  }

  // Network-first strategy for smooth navigation and preventing blank screen
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          }).catch(() => {});
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network is completely offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Network offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
