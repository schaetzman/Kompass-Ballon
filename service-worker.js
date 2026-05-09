/* Kompass Service Worker
   ----------------------------------------------------------------
   Drei-Strategie-Ansatz:
   1) App-Shell (HTML, Manifest, Icons, Leaflet von CDN) — Cache-First.
   2) Wetter-API (Open-Meteo) — Network-First mit Cache-Fallback. Beim "Fly"-
      Klick wird einmal komplett geladen; danach steht im Cache eine
      verwendbare Vorhersage für 6h, auch im Funkloch.
   3) Karten-Tiles (OSM, Esri-Satellit) — Stale-While-Revalidate.
   ---------------------------------------------------------------- */

const CACHE_VERSION = 'kompass-v2';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const TILES_CACHE = `${CACHE_VERSION}-tiles`;
const API_CACHE = `${CACHE_VERSION}-api`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.ico',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('Pre-cache fail:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isTileRequest(url) {
  return /tile\.openstreetmap\.org|server\.arcgisonline\.com|api\.maptiler\.com/.test(url);
}
function isApiRequest(url) {
  return /api\.open-meteo\.com/.test(url);
}
function isShellRequest(url) {
  return url.origin === self.location.origin
      || /unpkg\.com\/leaflet/.test(url.href);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (isTileRequest(url.href)) {
    event.respondWith(
      caches.open(TILES_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        return cached || fetchPromise || Response.error();
      })
    );
    return;
  }

  if (isApiRequest(url.href)) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(API_CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  if (isShellRequest(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200 && req.url.startsWith('http')) {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }
});
