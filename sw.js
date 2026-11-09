/* Lingua — service worker: офлайн-режим для установленного приложения.
   Файлы приложения кэшируются при установке, CDN (Tailwind, шрифты) — при первом открытии.
   При обновлении файлов увеличьте VERSION, чтобы телефоны получили новую версию. */
const VERSION = 'lingua-v2';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './words-b1.js',
  './words-b2.js',
  './words-c1.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: сразу отдаём из кэша, в фоне обновляем
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
