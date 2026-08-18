const CACHE_NAME = 'dokita-ai-cache-v1';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[DokitaAI PWA] Pre-caching offline assets');
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[DokitaAI PWA] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass non-GET requests directly through
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Optionally cache visited assets
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.url.startsWith(self.location.origin) &&
          !event.request.url.includes('/api/')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for document navigation when offline
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Web Push Event Listener
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || '⏰ DokitaAI Medication Reminder';
  const options = {
    body: data.body || "It's time to take your medication!",
    icon: data.icon || '/icon-192.svg',
    badge: data.badge || '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/chat',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Event Listener (Opens the app or navigates to specified url)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Or open new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
