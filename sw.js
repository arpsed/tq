/*
 * Service worker: makes the app work offline when it is served from a web
 * server (for example GitHub Pages) and opened on a phone. Not used when
 * index.html is opened directly from disk.
 *
 * Strategy: on install, store every file. On each request, answer from the
 * store immediately and refresh the stored copy in the background, so edits
 * you publish reach readers on their next visit.
 */
var CACHE = 'terjemahan-v1';
var FILES = [
  './', './index.html', './style.css', './parser.js', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
for (var i = 1; i <= 114; i++) FILES.push('./surah/' + ('00' + i).slice(-3) + '.js');

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(function () { return cached; });
        if (cached) { event.waitUntil(network); return cached; }
        return network;
      });
    })
  );
});
