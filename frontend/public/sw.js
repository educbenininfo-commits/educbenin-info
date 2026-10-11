// Educ Bénin service worker — two jobs:
//
// 1. Instant launch of the installed app (and fast repeat visits): the
//    app's static files (/_next/static, icons, logo) are kept on the device
//    cache-first — they are content-hashed, so a cached copy is always
//    correct — and every page already visited is served straight from the
//    device, then refreshed in the background (stale-while-revalidate),
//    like a native app opening on its last screen. API calls (/api/*), Next
//    client-navigation data (RSC) and token / one-time pages are never
//    cached here: live data is the app's job (lib/useApi.ts keeps its own
//    device copy of back-office data, wiped on logout).
// 2. Web Push: receive notifications and route clicks to the right page.
//
// Registered for every visitor by components/pwa/ServiceWorkerRegister.tsx
// (and by components/pwa/PushSetup.tsx when push is enabled). Bump
// CACHE_VERSION when this caching strategy changes: activation then drops
// every older cache.

const CACHE_VERSION = 'v1';
const STATIC_CACHE = 'eb-static-' + CACHE_VERSION;
const PAGE_CACHE = 'eb-pages-' + CACHE_VERSION;
const STATIC_MAX_ENTRIES = 300;

// Pages that carry a one-time token or are mid-auth: always from the network.
const NO_CACHE_PAGES =
  /^\/(api|auth|authentification-diplome|corriger-ma-demande|invitation|settings)(\/|$)/;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
      for (const key of await caches.keys()) {
        if (key.startsWith('eb-') && !keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/logo/') ||
    url.pathname === '/icon.png' ||
    url.pathname === '/apple-icon.png'
  );
}

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    await cache.put(request, res.clone());
    void trimCache(STATIC_CACHE, STATIC_MAX_ENTRIES);
  }
  return res;
}

async function staleWhileRevalidate(event) {
  const { request } = event;
  const key = request.url.split('?')[0];
  const cache = await caches.open(PAGE_CACHE);
  const hit = await cache.match(key);
  const network = fetch(request)
    .then(async (res) => {
      // Only plain successful HTML is kept (no redirects, errors or opaque).
      const type = res.headers.get('content-type') || '';
      if (res.ok && res.type === 'basic' && !res.redirected && type.includes('text/html')) {
        await cache.put(key, res.clone());
      }
      return res;
    })
    .catch(() => hit || Response.error());
  if (hit) {
    event.waitUntil(network);
    return hit;
  }
  return network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Next client navigation payloads change with every deploy — network only.
  if (request.headers.get('RSC') || url.searchParams.has('_rsc')) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (request.mode === 'navigate' && !NO_CACHE_PAGES.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Educ Bénin', body: '', url: '/admin/tableau-de-bord' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Non-JSON push payload — fall back to the defaults above.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icon.png',
      data: { url: payload.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : '/admin/tableau-de-bord';

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        // Reuse an already-open tab/window instead of stacking new ones.
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(targetUrl);
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
