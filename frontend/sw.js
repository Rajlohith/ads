/* ═══════════════════════════════════════════════════════════════════
   MABlytic Service Worker  —  v3
   Strategy: Network-first for HTML/JS/CSS  |  Cache-first for images
   Push notifications for ad alerts
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'mablytic-v3';
const API_ORIGIN    = 'http://127.0.0.1:8000';

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/index.html',
  '/register.html',
  '/feed.html',
  '/admin.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install — pre-cache shell ───────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately — no need to close old tabs
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(PRECACHE_URLS.map(url => {
        return new Request(url, { cache: 'reload' });
      })).catch(err => {
        // Don't fail install if optional assets are missing (e.g. screenshots)
        console.warn('[SW] Pre-cache partial failure:', err);
      });
    })
  );
});

// ── Activate — remove stale caches ─────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(key => key !== CACHE_VERSION)
        .map(key => { console.log('[SW] Deleting old cache:', key); return caches.delete(key); })
      )
    ).then(() => self.clients.claim()) // Take control of all open clients immediately
  );
});

// ── Fetch — network-first with background cache update ─────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET requests entirely (POST, DELETE, etc.)
  if (request.method !== 'GET') return;

  // 2. Skip API calls — always pass through to network, never cache
  if (url.origin === API_ORIGIN || url.pathname.startsWith('/api/')) return;

  // 3. Skip cross-origin requests (CDN fonts, etc.)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // 4. Images & icons — cache-first (they rarely change)
  if (request.destination === 'image' || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // 5. HTML, JS, CSS, manifest — NETWORK FIRST
  //    • Try network → serve fresh response AND update cache in background
  //    • If network fails → serve cached version (offline fallback)
  event.respondWith(
    fetch(request)
      .then(response => {
        // Only cache valid 200 responses from same origin
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Clone the response — one for browser, one for cache
        const responseToCache = response.clone();
        caches.open(CACHE_VERSION).then(cache => {
          cache.put(request, responseToCache);
        });
        return response;
      })
      .catch(async () => {
        // Network failed — serve from cache
        const cached = await caches.match(request);
        if (cached) return cached;
        // Ultimate fallback for navigation
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Network error — offline.', { status: 503 });
      })
  );
});

// ── Push Notifications ──────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {
    title: 'MABlytic',
    body:  'A new personalized ad is waiting for you!',
    url:   '/feed.html',
    tag:   'mablytic-ad',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body:    data.body,
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-96.png',
    tag:     data.tag,
    renotify: true,
    vibrate: [200, 100, 200],
    data:    { url: data.url },
    actions: [
      { action: 'view',    title: '👁 View Ad'   },
      { action: 'dismiss', title: '✕ Dismiss'   },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Notification Click ──────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/feed.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Background Sync (queue offline interactions) ────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-interactions') {
    event.waitUntil(syncOfflineInteractions());
  }
});

async function syncOfflineInteractions() {
  // Read queued interactions from IndexedDB and POST them when back online
  // (Requires IDB setup in the frontend — see feed.html offline queue)
  console.log('[SW] Syncing offline interactions…');
}