// Educ Bénin service worker — deliberately minimal. Its only job is to
// receive Web Push notifications and route notification clicks to the
// right page; it does NOT intercept `fetch` or cache pages, since this is
// an admin back-office with frequently-changing data (a stale cached
// dossier list would be worse than no offline support at all).
//
// Registered from components/pwa/PushSetup.tsx. Required for
// Notification permission / PushManager.subscribe() to work at all — the
// Push API only exists on a page with an active service worker.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
      icon: '/icon.png',
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
