const CACHE_VERSION = 'v1';
const STATIC_CACHE = `matrimonial-static-${CACHE_VERSION}`;
const API_CACHE = `matrimonial-api-${CACHE_VERSION}`;

// Static assets: JS, CSS, fonts, images bundled by Expo
const STATIC_EXTENSIONS = ['.js', '.css', '.woff', '.woff2', '.ttf', '.png', '.jpg', '.svg', '.ico'];
// API domains to handle with network-first
const API_ORIGINS = [
  'matrimonialserver-production.up.railway.app',
  'matrimonial-preview.up.railway.app',
];

function isStaticAsset(url) {
  const u = new URL(url);
  return (
    u.origin === self.location.origin &&
    STATIC_EXTENSIONS.some((ext) => u.pathname.includes(ext))
  );
}

function isApiRequest(url) {
  const u = new URL(url);
  return API_ORIGINS.some((origin) => u.hostname.includes(origin)) || u.pathname.startsWith('/trpc');
}

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(['/', '/index.html']).catch(() => {}),
    ),
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// Fetch: cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = request.url;

  if (isApiRequest(url)) {
    // Network-first for API: fresh data preferred, fall back to cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  if (isStaticAsset(url)) {
    // Cache-first for static: assets are content-hashed, safe to cache forever
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Navigation requests: network-first, SPA fallback to /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((r) => r || fetch('/index.html')),
      ),
    );
  }
});
