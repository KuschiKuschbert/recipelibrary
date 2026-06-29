---
name: Stocktake checklist feature
overview: Per-context stocktake UI reusing the order-list ingredient merge, with quantity/brand/UOM (UOM lock), stocktake-only extras, and versioned saved stocktakes each tagged with date/time so users can start a new count while keeping history.
todos:
  - id: storage-api
    content: Add Riviera + per-book stocktake storage with versioned documents (id, createdAt ISO, optional label); helpers for list/create/save/delete/archive; extend deleteCustomBook
  - id: stocktake-js
    content: Implement assets/stocktake-list.js using orderList.buildOrderLinesFlat(), row ids, UOM lock, extras, and active-document selector + New stocktake / Save
  - id: riviera-kb-ui
    content: Add modals, hero entry points, script tag, ESC/scroll parity, UI for picking past stocktakes vs current draft
  - id: theme-css
    content: Add stocktake row layout and version picker styling in assets/theme.css
  - id: verify-ship
    content: node --check edited JS; spot-check both pages; commit/push per repo rules
---

# Stocktake checklist (Riviera + kitchen books)

## Context (what exists today)

- **Order list** is implemented in [`assets/order-list.js`](assets/order-list.js): it builds merged lines via `buildOrderLinesFlat()`, grouped by zone, with manual extras. The factory **exposes** `buildOrderLinesFlat` on the returned object so stocktake can reuse the same ingredient set.
- **Riviera** / **kitchen books** wire order lists in [`riviera.html`](riviera.html) and [`kitchen-book.html`](kitchen-book.html); storage lives in [`assets/user-recipes.js`](assets/user-recipes.js).
- **`deleteCustomBook`** must remove stocktake storage for that book.

## Product behaviour

| Area | Behaviour |
|------|-----------|
| **Row source** | Same as order list: `orderListInstance.buildOrderLinesFlat()` for that context. |
| **Fields per row** | Counted **quantity**, **brand**, **UOM**; optional default UOM from order list `orderUnit`; **Confirm UOM** locks UOM for that row (optional **Unlock** for mistaps). |
| **Extra lines** | Stocktake-only manual lines (name, zone, qty/brand/uom)—**not** written to order extras. |
| **Saved stocktakes + new ones** | Users can **save** the current checklist as a snapshot **with date and time** (and optional short label, e.g. “Week 12”). **New stocktake** creates a fresh working document: same underlying ingredient *template* (from current recipes/order merge) but **empty or reset** counted fields (configurable: default empty counts, carry forward locked UOM from last save—pick one; recommended **empty counts**, **reuse locked UOM** from a “preferences” map or last saved doc if you want less re-entry). Each **saved** document is immutable or soft-sealed (recommended: **sealed on save**—editing only on the **active draft**). |
| **History** | List of past stocktakes (newest first): show **createdAt** (local date/time), optional label; open **read-only** view or duplicate into new draft (optional enhancement). |

## Data model (localStorage) — versioned

Single key per context, holding a **small archive** (cap optional, e.g. last 50) to avoid unbounded growth:

- **Riviera:** `kuschi_riviera_stocktake_archive_v1`
- **Book:** `kuschi_book_<id>_stocktake_archive_v1`

JSON shape (illustrative):

```json
{
  "activeDraftId": "draft-…",
  "drafts": [
    {
      "id": "st-1730…",
      "createdAt": "2026-03-31T14:22:00.000Z",
      "label": "Optional label",
      "sealed": true,
      "lines": { "recipe:…": { "qty", "brand", "uom", "uomLocked" } },
      "extras": [ { "id", "name", "zone", "qty", "brand", "uom", "uomLocked" } ]
    }
  ]
}
```

- **`activeDraftId`**: the document currently being edited (always one draft with `sealed: false`), or create on first open.
- **Save**: set `sealed: true`, persist `createdAt` = now (ISO 8601; display in **local** timezone in UI), append to list; then **spawn** a new empty draft with new `id` and `sealed: false` for the next weekly count.
- **New stocktake** (without full save): same as spawn new draft; optionally prompt “Discard unsaved changes?” if the current draft has data.

Row **stable ids** unchanged: `recipe:` + `canonicalOrderMergeKey(item)`, `extra:` + order-extra id for lines coming from order extras; stocktake-only extras use generated ids.

## Implementation shape

1. **[`assets/user-recipes.js`](assets/user-recipes.js)** — load/save archive, `createStocktakeDraft`, `sealCurrentStocktake` (save + new draft), `listStocktakes`, `getStocktakeById`, book/Riviera variants; **`deleteCustomBook`** removes book archive key.

2. **`assets/stocktake-list.js`** — `create({ orderList, storage, overlayId, bodyId, … })`; render from `buildOrderLinesFlat()` merged with **active draft** lines; header: **Save stocktake** (date/time shown after save), **New stocktake**, dropdown **Past stocktakes** (read-only view).

3. **[`riviera.html`](riviera.html)** / **[`kitchen-book.html`](kitchen-book.html)** — modal + hero link; ESC/body scroll parity with order list.

4. **[`assets/theme.css`](assets/theme.css)** — layout for columns + compact history UI.

5. **Verify** — `node --check`; static spot-check save → appears in history → new draft is empty; book delete clears archive.

## Out of scope

- Main [`index.html`](index.html) unless you add a book-scoped order list there later.
- Server sync (remains client-only).
