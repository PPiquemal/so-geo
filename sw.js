// SO-GEO Field Agent — Service Worker
// Cache-first for assets, network-first for API calls

const CACHE_NAME = 'sogeo-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Noto+Sans+Khmer:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;600&display=swap',
];

// ── INSTALL: mise en cache des assets statiques
self.addEventListener('install', event => {
  console.log('[SW] Installing SO-GEO v1...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: nettoyage des anciens caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: stratégie hybride
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Tuiles de carte OSM/Esri → network-first (pas de cache pour les tuiles)
  if (
    url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('arcgisonline.com')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response('', { status: 503, statusText: 'Offline - Map tiles unavailable' });
      })
    );
    return;
  }

  // API calls → network-only (jamais depuis le cache)
  if (url.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Tout le reste → Cache-first avec fallback réseau
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          // Mettre en cache les nouvelles ressources statiques valides
          if (
            response.status === 200 &&
            event.request.method === 'GET' &&
            !url.hostname.includes('tile.openstreetmap') &&
            !url.hostname.includes('arcgisonline.com')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fallback vers index.html pour la navigation
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// ── MESSAGE: permet de forcer le rechargement du cache depuis l'app
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
