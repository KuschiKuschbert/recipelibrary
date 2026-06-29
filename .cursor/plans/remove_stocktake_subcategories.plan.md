---
name: Remove stocktake sub-categories
overview: Drop sub-category section headers in the Riviera stocktake modal; show built-in catalog items in a single flat list per zone (sorted by name).
todos:
  - id: flatten-stocktake-builtins
    content: Update assets/stocktake-list.js — remove BUILTIN_CATEGORY_ORDER, stkt-category-head rendering; group builtins by zone only, sort by item name
    status: completed
  - id: cleanup-copy-export
    content: Adjust copyText() to omit category bracket lines for builtins; keep copyJson catalogCategory on lines if useful or remove for consistency
    status: completed
  - id: optional-css-skill
    content: Remove unused .stkt-category-head from theme.css; trim SKILL.md catalog wording if it mentions sub-categories
    status: completed
  - id: ship
    content: node --check edited JS; commit and push
    status: completed
isProject: false
---

# Remove stocktake sub-categories

## Goal

Keep the **four zones only** (Freezer, Cold room, Dry store, Other) with **no** intermediate headings such as "Pastry, bread, desserts" or "Prepared/freezer portions" in the stocktake UI or plain-text export.

## Behaviour after change

- Within each zone block: recipe-derived rows and order extras (unchanged), then stocktake-only extras (unchanged), then **all** built-in catalog rows for that zone in **one** list sorted **A–Z by `name`** (case-insensitive).
- [`assets/stocktake-data.js`](assets/stocktake-data.js) can keep the `category` field for possible future use or regeneration scripts; the **UI will not show it**. No mandatory data regen.

## Code changes

### 1. [`assets/stocktake-list.js`](assets/stocktake-list.js)

- Remove `BUILTIN_CATEGORY_ORDER` and `builtinsForZone()` logic that returns grouped `{ category, items }[]`.
- Replace with something like `builtinsForZoneFlat(zone, catalog, recipeKeys, k)` that filters by `zone`, dedupes against `canonicalOrderMergeKey`, returns a **sorted** array of catalog items.
- In `renderBody()`, drop the `stkt-category-head` div; loop flat items and render the same `stkt-line-row--builtin` rows as today.
- In `copyText()`, remove the `{ isCategory: true, title: ... }` pushes for builtins; only emit `- name: qty …` lines under each zone (builtins still after recipe/stx content, or merge sort — **simplest**: append builtin lines per zone in name order to match on-screen order).

### 2. [`buildExportDocWithBuiltins`](assets/stocktake-list.js) / JSON export

- Optionally keep `catalogCategory` on exported line objects for spreadsheet use, or remove for parity with UI — **recommend keep** in JSON only (no UX impact); user asked UI/text only.

### 3. [`assets/theme.css`](assets/theme.css)

- Remove `.stkt-category-head` rules (unused).

### 4. [`.cursor/skills/kitchen-library/SKILL.md`](.cursor/skills/kitchen-library/SKILL.md)

- One-line edit: drop "sub-category headers" from the Riviera stocktake catalog bullet.

## Out of scope

- Reordering recipe-derived rows (still alpha within zone).
- Changing zone assignment of catalog items in `stocktake-data.js`.
