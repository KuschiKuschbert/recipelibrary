---
name: big-static-data-frontend
description: >-
  Patterns for large read-only datasets in static sites (GitHub Pages, no backend):
  shard JSON catalogs, lazy detail loads, routing indexes, precomputed search haystacks,
  and cache priming. Use when the user mentions big databases, huge JSON, 10k+ rows,
  slow first load, static hosting, sharding, Pantry-style routing, or client-side search
  at scale without a server or MiniSearch bundle.
---

# Big static data in the browser

## When this applies

- **Tens of thousands to millions of rows** served as static files (CDN / GitHub Pages).
- **No app server** — only `fetch()` + `JSON.parse()` + in-memory structures.
- **Search/filter** must stay interactive on mid-tier phones and kitchen tablets.

## Core patterns (use in combination)

### 1. Shard the catalog

- Split the **index** (id, title, filter facets, short ingredient strings) into **many small JSON files** (e.g. by letter range or hash prefix).
- Load shards with **`Promise.all`** (or batched concurrency) and merge; dedupe by stable id.
- **Never** ship the full catalog as one giant inline `<script>` constant — parse cost blocks TTI.

### 2. Lazy full records

- Keep **heavy bodies** (long instructions, full ingredient lists) in **separate JSON** keyed by id or shard letter (`detail_A.json`, …).
- **First paint / list** uses index only; **open card** triggers one `fetch` for that shard.

### 3. O(1) or O(log n) lookup map

- After merge, build **`id → { shardKey, … }`** (plain object or `Map`) so modal code never scans 38k rows to find one recipe.

### 4. Precomputed per-row search string

- Once per row, build a **single lowercase haystack** string (name + tags + ingredient snippets + facets).
- Filter with **token AND** over that string; avoid rebuilding strings on every keystroke.
- Optional: small **LRU memo** on filter signature (query + facet values) for backspace-heavy typing.

### 5. Routing index for “query-shaped” subsets (Pantry pattern)

- When you might otherwise **load every shard** just to run a cheap predicate:
  - Ship a **small sidecar** (per-shard bloom of tokens / concatenated normalized words).
  - **Pick candidate shards** by substring or token overlap with the user query.
  - **Fetch only those shards**; **fallback to all shards** if the index is missing or no candidate matches (avoid false negatives).
- Regenerate the sidecar with a **build script** whenever source shards change; commit the artifact for static hosting.

### 6. Smaller auxiliary datasets

- **Parallel fetch** two medium JSON files (e.g. ~100KB each); **`preload` as fetch** in `<head>` optional.
- **Prime** `ensureLoaded()` at **script end** (not only on first UI interaction) so first modal overlaps with page boot.

### 7. Optional later

- **Service Worker** cache for versioned JSON URLs on repeat visits.
- **True inverted index** (token → id lists) if profiling shows filter still slow — trades memory/build complexity for speed.

## Anti-patterns

- One **multi‑MB** JSON for initial shell unless you stream or chunk.
- **Synchronous** parse of huge strings on the critical path.
- **Linear scan** of full catalog on every modal open to resolve id.
- **Idle-only** data that **order lists / merges** depend on without a safe intermediate (empty slice window).

## Checklist before shipping

- [ ] Index split into sharded files + merge path tested on slow 3G (DevTools).
- [ ] Detail path: one fetch per open; errors surfaced in UI.
- [ ] `siteBaseUrl()`-style base for **`/repo/`** GitHub Pages paths on fetches.
- [ ] Build script + short note in repo **how to regenerate** routing or sidecar JSON.
- [ ] `node --check` on any edited `.js` assets.

## Reference implementation (example)

The Kuschi kitchen library repo uses: `alpha_catalog/*.json` + `manifest.json` (browser), `claude_index/` (script-maintained), `recipe_detail/detail_{L}_{bucket}.json` (lazy per-recipe modal fetch; 64 FNV-1a buckets), index `_searchHay` + filter memo, `pantry_data/shard_hay_index.json` + `scripts/build_pantry_shard_hay_index.py`, external Riviera builtins + aroma preload/prime.
