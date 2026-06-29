'use strict';
const CACHE_NAME = 'kuschi-kitchen-v29';

// App shell: HTML pages + core assets (precache on install)
const SHELL_URLS = [
  './',
  './index.html',
  './riviera.html',
  './kitchen-book.html',
  './pantry.html',
  './aroma.html',
  './flavor.html',
  './pairing-atlas.html',
  './notebooklm-gallery.html',
  './manifest.webmanifest',
  './assets/theme.css',
  './assets/app-nav.js',
  './assets/kuschi-kitchen-mode.js',
  './assets/kuschi-filter-chips.js',
  './assets/kuschi-cook-mode.js',
  './assets/user-recipes.js',
  './assets/order-list.js',
  './assets/aroma-hints.js',
  './assets/recipe-gemini-format.js',
  './assets/recipe-import-helpers.js',
  './assets/screen-wake.js',
  './assets/kuschi-recipe-ui.js',
  './assets/flavor-explorer.js',
  './assets/pairing-atlas.js',
  './assets/prep-list.js',
  './assets/overlay-stack.js',
  './assets/planner-scale.js',
  './assets/package-planner.js',
  './assets/package-prep-sheet.js',
  './assets/stocktake-list.js',
  './assets/riviera-canonical-ingredient.js',
  './assets/riviera-ingredient-merge.js',
  './assets/riviera-init-stocktake.js',
  './assets/riviera-order-override-remap-v2.js',
  './assets/recipe-metric-normalize.js',
  './assets/flavour-toolkit-lookup.js',
  './assets/notebooklm-gallery.js',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon-180.png',
];

// Dynamic data: cache at runtime on first fetch, serve cache-first after
const CACHEABLE = /\/(recipe_detail\/detail_[A-Z](_\d+)?\.json|alpha_catalog\/[^/]+\.json|claude_index\/claude_index_\d+.*\.json|aroma_data\/[a-z_]+\.json|combined_data\/ingredients_unified_modal\.json|riviera_data\/[a-z_]+\.json|flavour_data\/(flavour_knowledge_db_v1\.1\.json|toolkit_pass_static\.json|flavour_hints_by_id\.json)|pantry_data\/[a-z_]+\.json)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_URLS).catch((err) => {
        // Non-fatal: shell might not exist yet (dev env); log and continue.
        console.warn('[sw] shell precache partial failure:', err);
      })
    ).then(() => self.skipWaiting())
  );
});

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

  // Navigation requests: serve from cache (shell), fallback to network, then index.html
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(e.request).then((hit) => {
          if (hit) return hit;
          return fetch(e.request).then((resp) => {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          }).catch(() => cache.match('./index.html'));
        })
      )
    );
    return;
  }

  // Runtime data (recipes, catalog shards, aroma/riviera data): cache-first
  if (CACHEABLE.test(url.pathname)) {
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
    return;
  }

  // Shell assets (CSS, JS, icons): stale-while-revalidate
  const isShell = SHELL_URLS.some((u) => url.pathname.endsWith(u.replace(/^\./, '')));
  if (isShell) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(e.request).then((cached) => {
          const networkFetch = fetch(e.request).then((resp) => {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          });
          return cached || networkFetch;
        })
      )
    );
  }
});
