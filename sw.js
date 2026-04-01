const CACHE_NAME = 'kuschi-kitchen-v1';
const CACHEABLE = /\/(recipe_detail\/detail_[A-Z](_\d+)?\.json|claude_index\/claude_index_\d+.*\.json|aroma_data\/[a-z_]+\.json)$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (!CACHEABLE.test(url.pathname)) return;
  e.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(e.request).then((hit) => {
        if (hit) return hit;
        return fetch(e.request).then((resp) => {
          if (resp.ok) cache.put(e.request, resp.clone());
          return resp;
        });
      })
    )
  );
});
