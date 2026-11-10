/*
 * Retires the service worker of the old React version of this site.
 *
 * Visitors of the old site still have that worker installed; it keeps serving
 * the old app from its cache. Their browser re-checks this file, finds this
 * version, and runs it once: it deletes the old caches, unregisters itself and
 * reloads the open pages, which then load the new app (whose own worker is sw.js).
 * Keep this file until old visitors have had time to return (a few months).
 */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys
          .filter(function (k) { return k.indexOf('sw-precache') === 0; }) // only the old app's caches
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (clients) {
        clients.forEach(function (client) { client.navigate(client.url); });
      })
  );
});
