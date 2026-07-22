const CACHE_NAME = 'gestao-barbearia-v6';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app_core.js',
  './js/notif_logic.js',
  './js/pdv.js',
  './js/tailwind_config.js',
  './assets/libs/tailwindcss.js',
  './assets/libs/lucide.js',
  './assets/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
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
