const CACHE_NAME = 'gestao-assistencia-cache-v7';
const urlsToCache = [
  './',
  './index.html',
  './lock.js',
  './assets/js/db.js',
  './assets/js/router.js',
  './assets/js/modules/clients.js',
  './assets/js/modules/inventory.js',
  './assets/js/modules/orders.js',
  './assets/js/modules/financial.js',
  './assets/js/modules/pdv.js',
  './assets/js/modules/reports.js',
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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
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
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
