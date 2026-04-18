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
  const raw = event.notification.data?.url || '/historique';
  // Sécurité : open redirect prevention — on n'accepte que les chemins relatifs
  // de la même origine (commence par "/" mais pas "//", et n'est pas une URL absolue).
  const url = (
    typeof raw === 'string' &&
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !/^[a-z][a-z0-9+.-]*:/i.test(raw)
  ) ? raw : '/historique';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.includes(url) && 'focus' in win) return win.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
