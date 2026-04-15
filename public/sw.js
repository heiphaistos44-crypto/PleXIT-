// ── PleXIT Service Worker — Push Notifications ───────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const title   = data.title   || 'PleXIT';
  const options = {
    body:  data.body  || 'Nouvelle notification',
    icon:  '/favicon.ico',
    badge: '/favicon.ico',
    tag:   data.tag   || 'plexit-notif',
    data:  { url: data.url || '/historique' },
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/historique';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.includes(url) && 'focus' in win) return win.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
