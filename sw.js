/* Prolar service worker: sadece ana ekrana eklenebilmek için. Önbellek yok, güncellemeler hemen gelir. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
