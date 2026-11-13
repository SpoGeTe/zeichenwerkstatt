// Offline-Unterstützung: erst Netz, bei fehlendem WLAN der gespeicherte Stand.
const CACHE = 'zeichenwerkstatt-v2';
const FILES = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png',
  'js/main.js', 'js/state.js', 'js/ui.js', 'js/pad.js', 'js/geom.js', 'js/glyphs.js', 'js/drawings.js', 'js/label.js', 'js/gridtask.js',
  'js/stations/s1.js', 'js/stations/s2.js', 'js/stations/s3.js', 'js/stations/s4.js', 'js/stations/s5.js',
  'js/stations/s6.js', 'js/stations/s7.js', 'js/stations/s8.js', 'js/stations/s9.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
