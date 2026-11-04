const CACHE_NAME = 'mmp-v1';
const NETWORK_TIMEOUT_MS = 4000;
const OFFLINE_HTML =
  '<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline</title><body style="font-family:system-ui,sans-serif;padding:2rem;line-height:1.5"><h1>Je bent offline</h1><p>Deze pagina is nog niet opgeslagen. Maak verbinding met internet en probeer het opnieuw.</p></body></html>';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

// Cache requests made before activation.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS') return;
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        event.data.urls
          .filter((url) => new URL(url, self.location.origin).origin === self.location.origin)
          .map((url) => cache.add(url).catch(() => {}))
      )
    )
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  network.catch(() => {});

  // Weak signal: fall back after timeout.
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  try {
    const response = await Promise.race([network, timeout]);
    if (response) return response;
  } catch {}

  const cached = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
  if (cached) return cached;

  if (request.mode !== 'navigate') return network;
  const home = await cache.match('/');
  if (home) return home;
  return new Response(OFFLINE_HTML, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // shortcut: no eviction, cap later
  event.respondWith(url.pathname.startsWith('/_astro/') ? cacheFirst(request) : networkFirst(request));
});
