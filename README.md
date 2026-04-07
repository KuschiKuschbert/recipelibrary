# Kuschi Kitchen Library

Personal recipe library hosted on **GitHub Pages**: searchable catalog, metric-oriented data, and a **Riviera** prep-chef subset for batch and service workflows. Tuned for quick use on a kitchen tablet.

## What’s in the repo

| Area | Purpose |
|------|---------|
| [index.html](index.html) | Main library UI — loads **`alpha_catalog/`** compact shards (claude_index rows split like `alpha/`), recipe detail from `recipe_detail/`, merges **user recipes** from the browser; **+ Kitchen book** and pills for custom books |
| [kitchen-book.html](kitchen-book.html) | User-created **kitchen books** (`?b=book-id`): local recipes only, same add-recipe flow as the main library (manual + Gemini) |
| [riviera.html](riviera.html) | Riviera prep set (built-in cards + user-added Riviera recipes), **order list by storage** (freezer → cold room → dry store → other) with local master ingredients |
| [flavor.html](flavor.html) | **Flavor explorer** — merged Flavor Bible + Vegetarian Bible + Aroma + Flavor Thesaurus wheel (`combined_data/ingredients_unified.json`); **Kitchen toolkit** tab loads [`flavour_data/flavour_knowledge_db_v1.1.json`](flavour_data/flavour_knowledge_db_v1.1.json) (fix-the-dish, cuisines, blends, balance rules). Explore merges **harmony / contrast / spice** hints when IDs match. `?q=` deep-links; `?toolkit=1` opens the toolkit tab |
| [pairing-atlas.html](pairing-atlas.html) | **Aroma matrix** — G1–G8 × spices ([`aroma_data/ingredients.json`](aroma_data/ingredients.json) + [`aroma_matrix_meta.json`](aroma_data/aroma_matrix_meta.json)); lazy-loads [`combined_data/ingredients_unified.json`](combined_data/ingredients_unified.json), [`aroma_data/pairing_matrix.json`](aroma_data/pairing_matrix.json), [`aroma_data/food_pairings.json`](aroma_data/food_pairings.json) for **H/Src columns**, **harmony heatmap** layer, **row detail drawer** (Flavor Bible / Thesaurus / Aroma), and **food × spice** matrix |
| [notebooklm-gallery.html](notebooklm-gallery.html) | **Visual guides** — static NotebookLM (or other) infographics listed in [notebooklm/manifest.json](notebooklm/manifest.json); see [notebooklm/README.md](notebooklm/README.md) |
| [pantry.html](pantry.html) | **Pantry search** — match typed ingredients against **`alpha_catalog/`** `ing` fields; opens hits via `index.html?open=` |
| [assets/theme.css](assets/theme.css) | Shared dark theme tokens, search shell, filters, modal shell, footer |
| [assets/user-recipes.js](assets/user-recipes.js) | `localStorage` helpers: kitchen recipes, Riviera recipes, master ingredients, Riviera order overrides / extras, JSON export |
| [assets/recipe-gemini-format.js](assets/recipe-gemini-format.js) | Gemini JSON extraction for add-recipe (Kitchen + Riviera); optional fetch proxy helpers |
| [assets/recipe-import-helpers.js](assets/recipe-import-helpers.js) | File upload (PDF / DOCX / image) and HTML→text for URL import |
| [workers/recipe-fetch-proxy.js](workers/recipe-fetch-proxy.js) | Optional Cloudflare Worker to fetch recipe URLs (bypass browser CORS) |
| `alpha_catalog/` | **Browser catalog** — compact shards + `manifest.json`; **generated** from `recipe_detail/` via `scripts/rebuild_catalog_from_detail.py` |
| `claude_index/` | Compact shards — **generated** from `recipe_detail/` (same script); kept for pipelines / Claude / backups |
| `alpha/` | Only **`index.json`** is required (defines letter filenames); full `alpha/*.json` bodies are optional archives |
| `recipe_detail/detail_*.json` | Full recipe payloads (main library): `detail_{L}_{bucket}.json` sub-shards (`hash(id) % 64`, FNV-1a — see `index.html` + `scripts/recipe_pipeline_lib.py`); letter **L** from compact index `name` (same as the Kitchen list). Optional legacy `detail_{L}.json` fallback on 404. |
| `scripts/detect-nonenglish-recipes.py`, `translate_recipes.py`, `sync_claude_index_from_detail.py`, `repartition_detail_shards.py`, `repartition_detail_subshards.py` | Optional pipeline to translate catalog text and keep index/detail aligned; sub-shard repartition after index/name changes (see below) |
| `scripts/rebuild_catalog_from_detail.py` | **Regenerate `claude_index/` + `alpha_catalog/` + pantry hay** from `recipe_detail/` (single source of truth) |
| `scripts/build_alpha_catalog_index.py` | Wrapper → calls `rebuild_catalog_from_detail.py` |
| `scripts/build_pantry_shard_hay_index.py` | Regenerate `pantry_data/shard_hay_index.json` (also run by rebuild script) |
| `scripts/check-recipe-shards.py` | Verify every `alpha_catalog` recipe resolves in the expected `recipe_detail` shard |
| `scripts/run_all_extractions.sh` | Regenerate `flavor_data/`, `thesaurus_data/`, `science_data/`, `sfah_data/`, `supplementary_data/`, `combined_data/` from EPUBs/PDFs in `~/Downloads` (see each `extract_*.py` for env overrides) |
| `scripts/build_flavour_hints_modal.mjs` | After updating `flavour_data/flavour_knowledge_db_v1.1.json`, run `node scripts/build_flavour_hints_modal.mjs` to refresh `flavour_data/flavour_hints_by_id.json` (slim matrix hints for modals + pairing atlas). `toolkit_pass_static.json` is extractable the same way from the full DB if you add fields to `fix_the_dish` / `balance_rules`. |
| `combined_data/ingredients_unified.json` | **Schema v2** object: `ingredients` (merged Flavor + Aroma + Thesaurus rows) + `kitchen_context` (bundled `cuisine_map`, SFAH acid/fat/four-elements, science temps/tastants/storage/nutrients, supplementary seven-dials / fermentation / intensity). Regenerate with `python3 scripts/merge_all_sources.py`. Legacy **array-only** files are still accepted by the site JS. |
| `pdf/` | Category reference PDFs |

### Main index performance (optional dev flags)

- **`alpha_catalog`** shards load with **bounded concurrency** (10 parallel fetches on [index.html](index.html) and [pantry.html](pantry.html)) so weak devices are not hit with dozens of simultaneous responses. Building **`_searchHay`** and the **`recipeIndex`** map is **chunked** with `requestAnimationFrame` yields so the main thread can still paint during load.
- Search precomputes a normalised **`_searchHay`** string per recipe, uses a small **filter-result LRU** (8 entries), and caps **fuzzy** Levenshtein to the first 32 eligible words per recipe with a bounded Levenshtein memo. Full-text libraries (MiniSearch, FlexSearch, …) are intentionally not bundled unless profiling shows a need.
- **`localStorage.kuschiShowFilterMs=1`** — show filter duration next to the results count.
- **`localStorage.kuschiDebugPerf=1`** — log each filter pass to the browser console.

## Local and device data

There is **no server**. “Save” actions write to **this browser’s** `localStorage`:

- Kitchen recipes: `kuschi_user_recipes_kitchen_v1`
- Custom kitchen book registry: `kuschi_custom_kitchen_books_v1`
- Per-book recipes: `kuschi_book_<id>_recipes_v1` (one key per book)
- Riviera recipes: `kuschi_user_recipes_riviera_v1`
- Master ingredients (default storage zone per name): `kuschi_master_ingredients_v1`
- Riviera order line overrides: `kuschi_riviera_order_overrides_v1`
- Manual order lines: `kuschi_riviera_order_extras_v1`

Use **Copy JSON backup** / **Copy order data JSON** / **Copy master ingredients JSON** in the UIs to paste into files and commit from a dev machine if you want git-backed backups.

- Gemini API key (add-recipe **Paste & format**): `kuschi_gemini_api_key_v1`
- Optional recipe **fetch proxy** URL (same tab, for importing from recipe URLs when the site blocks browser `fetch`): `kuschi_recipe_fetch_proxy_v1`

### Recipe URL import (CORS)

GitHub Pages cannot fetch most third-party recipe sites directly. To use **Recipe page URL** in the add-recipe modal, deploy the optional worker in [`workers/recipe-fetch-proxy.js`](workers/recipe-fetch-proxy.js) to **Cloudflare Workers** (or similar), then paste the worker’s **base URL** (e.g. `https://your-worker.workers.dev`) into the modal’s proxy field and click **Save proxy**. The app calls `GET {proxy}?url={encoded recipe URL}` and sends the returned HTML through Gemini.

## Index schema (`alpha_catalog/` and `claude_index/`)

Each index entry is shaped like:

```json
{
  "id": "recipe-slug",
  "name": "Recipe Name",
  "cat": "Meat & Poultry",
  "cui": "Greek",
  "protein": ["chicken"],
  "tags": ["gluten-free", "high-protein"],
  "ing": ["Chicken thigh", "Lemon", "Garlic"],
  "_detailLetter": "F"
}
```

`_detailLetter` (A–Z) is the **`recipe_detail/` filename letter** for that id. It is set by `rebuild_catalog_from_detail.py` so the modal loads the correct sub-shard when the display `name` starts with a different letter than the file the recipe lives in.

Counts in the HTML hero update from loaded data; README stats are illustrative — regenerate from your shards if you need exact numbers.

## Alpha letter layout (`alpha/index.json`)

`alpha/index.json` lists which **filenames** exist under `alpha_catalog/` (e.g. `#.json`, `A.json`, `À.json`). The rebuild script assigns each recipe to a bucket from the **first letter of `name`**, falling back to `#.json` when needed. You do **not** need the large `alpha/*.json` full-recipe copies for the site to work.

## Translating non-English recipes (offline pipeline)

**Single source of truth:** **`recipe_detail/`** holds every full recipe. After any batch of detail edits, run **`python3 scripts/rebuild_catalog_from_detail.py`** to refresh **`claude_index/`**, **`alpha_catalog/`**, and **`pantry_data/shard_hay_index.json`**, then commit. The live site reads **`alpha_catalog/`** only. The main site does not call translation APIs.

For **targeted** text fixes, you can still run **`sync_claude_index_from_detail.py`** for specific ids; a full rebuild is safer after large merges.

### Translation cleanup (HTML entities + optional Turkish re-pass)

Some imported strings still contain literal HTML entities (`&ccedil;`, `&nbsp;`, …) or leftover Turkish in lezzet-style recipes. Suggested order:

1. **Decode entities:** `python3 scripts/fix_translation_html_entities.py --dry-run`, then `python3 scripts/fix_translation_html_entities.py --write`.
2. **Optional Turkish re-translate:** `python3 scripts/fix_translation_html_entities.py --write --retranslate-tr` — Argos **tr→en** only for recipes with `source: lezzet` or `original_language: tr`, and only on fields that still contain Turkish letters (`çğıöşü` etc.). Install the Argos **tr** pair first (`python3 scripts/install_argos_pairs.py tr`). After you have already run step 1, use `--skip-entities` with `--retranslate-tr` so the script does not rescan every recipe for HTML entities (much faster): `python3 scripts/fix_translation_html_entities.py --write --retranslate-tr --skip-entities`. Expect a long run on a full library either way.
3. **Sync index:** `python3 scripts/sync_claude_index_from_detail.py --ids-from reports/cleanup_affected_ids.jsonl` (or `--all-in-index` for a full refresh).
4. **Repartition** (only if the cleanup script warned about **name** first-letter bucket drift): `python3 scripts/repartition_detail_shards.py`, then `python3 scripts/repartition_detail_subshards.py` to refresh `detail_{L}_{bucket}.json` files.
5. **Rebuild catalog:** `python3 scripts/rebuild_catalog_from_detail.py` (refreshes `claude_index/`, `alpha_catalog/`, pantry hay).
6. **Verify:** `python3 scripts/check-recipe-shards.py` (must exit 0).

Running `--write` writes `reports/cleanup_affected_ids.jsonl` (gitignored); regenerate it whenever you run a cleanup write.

**Initial translation run (detect → translate → sync):**

1. **Optional:** `pip install argostranslate` (or `pip install -r scripts/requirements-translation.txt` — note `lingua` may need a newer Python than 3.9 on some systems). After Argos is installed, fetch models: `python3 scripts/install_argos_pairs.py es pt` (add `fr it de` etc. as needed).
2. **Detect:** `python3 scripts/detect-nonenglish-recipes.py` → writes `reports/translation_candidates.jsonl` (add `--no-lingua` if you skip pip).
3. **Translate:** install Argos language pairs you need, then e.g.  
   `python3 scripts/translate_recipes.py --candidates-file reports/translation_candidates.jsonl --backend argos`  
   By default only **non-ASCII** strings are sent to the translator. To also translate **ASCII-only** text when Lingua set `suggested_lang` (e.g. Spanish without accents), re-run **detect** for a fresh list, then add **`--translate-ascii-lingua`** (can re-touch already-English lines if Lingua is wrong — spot-check).  
   Alternatives: `--backend libretranslate` (set `LIBRETRANSLATE_URL`, optional `LIBRETRANSLATE_API_KEY`) or `--backend deepl` (`DEEPL_AUTH_KEY`, optional `DEEPL_FREE=1` for api-free host). Use `--dry-run` on translate to count strings without writing. Glossary: [`scripts/translation_glossary.json`](scripts/translation_glossary.json).
4. **Sync index (optional):** `python3 scripts/sync_claude_index_from_detail.py --ids-from reports/translation_candidates.jsonl`  
   Or `--all-in-index` to refresh every catalog entry from detail (slow, loads all detail files). **Skip this** if you will run step 6 — the rebuild overwrites `claude_index/` from `recipe_detail/` anyway.
5. **Repartition detail (only if a compact index `name`’s first ASCII letter changed):**  
   `python3 scripts/repartition_detail_shards.py`  
   then `python3 scripts/repartition_detail_subshards.py`  
   Otherwise the site may fetch the wrong `recipe_detail/detail_{letter}_{bucket}.json` slice for that id.
6. **Rebuild catalog:** `python3 scripts/rebuild_catalog_from_detail.py` (refreshes `claude_index/`, `alpha_catalog/`, pantry hay).
7. **Verify:** `python3 scripts/check-recipe-shards.py` (must exit 0).

Shared helpers: [`scripts/recipe_pipeline_lib.py`](scripts/recipe_pipeline_lib.py). One-shot full run (detect → Argos models → translate → repartition → **rebuild catalog** → verify): [`scripts/run_full_translation.sh`](scripts/run_full_translation.sh).

## Claude / search

Add `claude_index/` to a Claude Project knowledge base, then ask things like: “Search my library for Mediterranean chicken” or “Gluten-free pork that scales to 80 pax.”

## Cursor / agents

See [.cursor/skills/kitchen-library/SKILL.md](.cursor/skills/kitchen-library/SKILL.md) for layout, storage keys, and workflow notes.
