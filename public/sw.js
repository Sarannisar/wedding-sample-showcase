// Bump CACHE_VERSION whenever the offline cache should be rebuilt.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `wedding-invite-${CACHE_VERSION}`;

const STATIC_PRECACHE = [
  '/manifest.webmanifest',
  '/photo_circular.png',
  '/fonts/KaushanScript-Regular.ttf',
  '/assets/logo_saad_sheen_crest.png',
  '/assets/fancy_garden_palace.webp',
  '/assets/fancy_door_left.webp',
  '/assets/fancy_door_right.webp',
  '/assets/door_handle_crest_left.webp',
  '/assets/door_handle_crest_right.webp',
  '/assets/invite_card_bg_poster.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(STATIC_PRECACHE).catch((err) => {
          console.warn('Some offline cache items skipped:', err);
        })
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isVersionedAsset(url) {
  return url.pathname.startsWith('/assets/') && /\.[a-f0-9]{8,}\./i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (
    request.method !== 'GET' ||
    request.url.includes('/rest/v1') ||
    request.url.includes('/functions/v1') ||
    request.url.includes('supabase.co')
  ) {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML navigations: always network-first so a freshly published version wins.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Hashed build assets are immutable: cache-first is safe.
  // Everything else is stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => undefined);

      if (cachedResponse) {
        if (!isVersionedAsset(url)) {
          networkFetch.catch(() => {});
        }
        return cachedResponse;
      }

      return networkFetch.then(
        (res) => res || new Response('Offline', { status: 503, statusText: 'Offline' })
      );
    })
  );
});
