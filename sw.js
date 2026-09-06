'use strict';
const CACHE_NAME = 'kuschi-kitchen-v254';

// Install shell: keep first-load precache focused on the main catalog.
const SHELL_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/theme.css',
  './assets/app-nav.js',
  './assets/kuschi-kitchen-mode.js',
  './assets/kuschi-filter-chips.js',
  './assets/kuschi-cook-mode.js',
  './assets/user-recipes.js',
  './assets/aroma-hints.js',
  './assets/screen-wake.js',
  './assets/kuschi-recipe-ui.js',
  './assets/riviera-canonical-ingredient.js',
  './assets/recipe-metric-normalize.js',
  './assets/flavour-toolkit-lookup.js',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon-180.png',
];

// Secondary pages and feature helpers: cache on first use, but do not precache during startup.
const RUNTIME_URLS = [
  './leichhardt.html',
  './assets/leichhardt.css',
  './leichhardt_data/trial-dishes.png',
  './leichhardt_data/Leichhardt_Trial_Dishes_One_Page.pdf',
  './riviera.html',
  './kitchen-book.html',
  './pantry.html',
  './aroma.html',
  './flavor.html',
  './pairing-atlas.html',
  './notebooklm-gallery.html',
  './assets/order-list.js',
  './assets/ingredient-flow-ui.js',
  './assets/flavor-explorer.js',
  './assets/pairing-atlas.js',
  './assets/prep-list.js',
  './assets/overlay-stack.js',
  './assets/planner-scale.js',
  './assets/planner-extras.js',
  './assets/package-planner.js',
  './assets/package-prep-sheet.js',
  './assets/stocktake-list.js',
  './assets/riviera-ingredient-merge.js',
  './assets/riviera-init-stocktake.js',
  './assets/riviera-order-override-remap-v2.js',
  './assets/riviera-event-context.js',
  './assets/riviera-service-variants.js',
  './assets/notebooklm-gallery.js',
  './assets/recipe-gemini-format.js',
  './assets/recipe-import-helpers.js',
  './assets/qrcodejs-1.0.0.min.js',
];

// Dynamic data routing. Riviera operational JSON is handled network-first
// below; larger reference datasets retain the cache-first offline strategy.
const CACHEABLE = /\/(recipe_detail\/detail_[A-Z](_\d+)?\.json|alpha_catalog\/[^/]+\.json|claude_index\/claude_index_\d+.*\.json|aroma_data\/[a-z_]+\.json|combined_data\/ingredients_unified_modal\.json|riviera_data\/[a-z_]+\.json|flavour_data\/(flavour_knowledge_db_v1\.1\.json|toolkit_pass_static\.json|flavour_hints_by_id\.json)|pantry_data\/[a-z_]+\.json)$/;
const NETWORK_FIRST_RIVIERA_DATA = /\/riviera_data\/[a-z_]+\.json$/;

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

  // Navigation requests: refresh from the network, with an offline cache fallback.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(e.request, { cache: 'no-store' }).then((resp) => {
          if (!resp.ok) return resp;
          return cache.put(e.request, resp.clone()).then(() => resp, () => resp);
        }).catch(() =>
          cache.match(e.request).then((hit) => hit || cache.match('./index.html'))
        )
      )
    );
    return;
  }

  // Riviera operational data must refresh when online so newly published
  // recipes, packages and aliases cannot be masked by an older offline copy.
  if (NETWORK_FIRST_RIVIERA_DATA.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(e.request, { cache: 'no-store' }).then((resp) => {
          if (!resp.ok) throw new Error(`Riviera data fetch failed: ${resp.status}`);
          return cache.put(e.request, resp.clone()).then(() => resp, () => resp);
        }).catch(() =>
          cache.match(e.request).then((hit) => hit || Response.error())
        )
      )
    );
    return;
  }

  // Other runtime data (catalog shards and reference data): cache-first.
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
  const isRuntime = RUNTIME_URLS.some((u) => url.pathname.endsWith(u.replace(/^\./, '')));
  if (isShell || isRuntime) {
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
