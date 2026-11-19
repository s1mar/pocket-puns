var CACHE = 'pocket-puns-v2';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL.concat(['jokes.enc'])); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Network first, cache fallback: a rebuilt jokes.enc and new shell arrive when online, everything works offline.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  var u = new URL(req.url);
  // Fonts (Google Fonts CSS and files): cache first, refreshed in the background, so type survives offline after one online visit.
  if (req.method === 'GET' && (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com')) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (m) {
        var net = fetch(req).then(function (res) { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; });
        return m || net.catch(function () { return Response.error(); });
      });
    }));
    return;
  }
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (m) {
        return m || (req.mode === 'navigate' ? caches.match('index.html') : Response.error());
      });
    })
  );
});
