const CACHE_NAME = 'gestao-assistencia-cache-v8';
const urlsToCache = [
  './',
  './index.html',
  './lock.js',
  './access_denied.html',
  './assets/js/db.js',
  './assets/js/router.js',
  './assets/js/notif_logic.js',
  './assets/js/modules/clients.js',
  './assets/js/modules/inventory.js',
  './assets/js/modules/orders.js',
  './assets/js/modules/financial.js',
  './assets/js/modules/pdv.js',
  './assets/js/modules/reports.js',
  './assets/js/modules/evolution.js',
  './assets/js/app.js',
  './manifest.json',
  './assets/css/styles.css',
  './assets/js/tailwind_config.js',
  './assets/libs/tailwindcss.js',
  './assets/libs/lucide.js',
  './assets/img/icons/icon-192.png',
  './assets/img/icons/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar chamadas de API do cache (por pathname OU por hostname externo)
  const isApiCall = url.pathname.includes('/api_') ||
                    url.pathname.endsWith('.php') ||
                    url.href.includes('api_notificacoes') ||
                    url.hostname !== self.location.hostname;

  if (isApiCall) {
    // Sempre ir direto à rede, sem cache
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => new Response('{}', {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  // Network First para navegação
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Stale While Revalidate para assets locais
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
