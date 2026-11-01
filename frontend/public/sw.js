// Smart Granite PWA Service Worker
// Provides offline caching and capture queue support for field operators

const CACHE_NAME = 'smart-granite-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/track',
];

// ── Install: pre-cache shell assets ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ─────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't intercept cross-origin or chrome-extension requests
  if (url.origin !== location.origin) return;

  // API requests: network-first (no offline fallback — just let it fail naturally)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'Offline — request queued for sync' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache successful GET responses for static assets
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback: return cached index.html for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/index.html').then((res) => res || Response.error());
        }
        return Response.error();
      });
    })
  );
});

// ── Background Sync: replay queued capture forms ──────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'granite-capture-sync') {
    event.waitUntil(replayQueuedCaptures());
  }
});

async function replayQueuedCaptures() {
  // Notify all clients to trigger IndexedDB queue replay
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_QUEUE', payload: 'replay' });
  });
}
