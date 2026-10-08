/* Offline support: pages are fetched from the network first (so updates arrive),
   and served from the cache when there is no signal. Bump VERSION after edits. */
const VERSION = 'landnav-v1';
const FILES = ['./', 'index.html', 'practice.html', 'practice-short.html', 'game.html', 'game-short.html',
  'poster.html', 'config.js', 'qr.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {           // fonts: cache after first use
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname))
      e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { c.put(req, r.clone()); return r; }))));
    return;                                       // Apps Script etc. go straight to the network
  }
  e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
