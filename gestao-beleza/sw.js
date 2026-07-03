const CACHE_NAME = 'gestao-beleza-v2';
const ASSETS_TO_CACHE = [
    './index.html',
    './css/styles.css',
    './js/app_core.js',
    './manifest.json',
    './assets/libs/lucide.js',
    './assets/libs/tailwindcss.js',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

// Install Event
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Ignorar chamadas de API do cache (por pathname OU por hostname externo)
    const isApiCall = url.pathname.includes('/api_') ||
                      url.pathname.endsWith('.php') ||
                      url.href.includes('api_notificacoes') ||
                      url.hostname !== self.location.hostname;

    if (isApiCall) {
        // Sempre ir direto à rede, sem cache
        e.respondWith(
            fetch(e.request, { cache: 'no-store' }).catch(() => new Response('{}', {
                headers: { 'Content-Type': 'application/json' }
            }))
        );
        return;
    }

    // Network First Strategy for HTML (to get updates)
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => {
                return caches.match('./index.html');
            })
        );
        return;
    }

    // Stale While Revalidate for assets
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});
