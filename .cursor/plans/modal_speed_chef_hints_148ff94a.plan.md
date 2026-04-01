---
name: Modal speed chef hints
overview: Keep seasoning, flavour, and pairing tips in the recipe modal, but make loading fast and reliable—defer the heavy unified JSON, prefetch small aroma data, and add timeouts/fallbacks so the UI never hangs on a spinner.
todos:
  - id: lazy-unified
    content: "aroma-hints.js: defer ensureUnifiedLoaded + buildFlavorExtrasHtml to first expand of a dedicated details block; never block main seasoning chips on unified"
    status: completed
  - id: anti-stuck
    content: "aroma-hints.js: fetch timeouts or AbortController + always clear loading placeholders on error; optional Promise.race for unified (~1.9MB) with friendly fallback message"
    status: completed
  - id: modal-open-default
    content: "index.html: seasoningSectionHtml openByDefault false; loader copy reflects two-phase load (quick ideas vs optional deeper notes)"
    status: completed
  - id: chef-copy
    content: "aroma-hints.js (secondary): shorter labels, plain pivot lists instead of JSON pre, drop G badges on chips—only if time in same PR"
    status: completed
  - id: prefetch-aroma
    content: "index.html: idle prefetch KuschiAromaHints.ensureLoaded() after catalog load"
    status: completed
  - id: skill-note
    content: Brief doc in kitchen-library or aroma-bible SKILL.md (lazy unified + no blocking fetches)
    status: completed
  - id: ship
    content: node --check aroma-hints.js; spot-check modal on slow throttling; commit push
    status: completed
isProject: false
---

# Recipe modal: fast loading, no stuck spinner — keep all tips

## Product intent

- **Keep** seasoning suggestions, flavour notes, and pairing-style tips in the modal.
- **Prioritise** fast first paint and **never** leaving the user on a dead “Loading…” state (slow network, failed fetch, huge JSON parse).

## Why it feels slow / stuck today

Same as before: [`appendFlavorExtras`](assets/aroma-hints.js) runs from [`fillHintWrap`](assets/aroma-hints.js) after aroma loads and pulls [**~1.9MB** `combined_data/ingredients_unified.json`](combined_data/ingredients_unified.json). That blocks the “full” seasoning block and can feel like a hang on GitHub Pages or mobile.

There is no **timeout** today: a stalled fetch can leave **“Loading seasoning ideas…”** or flavour loading text indefinitely.

```mermaid
sequenceDiagram
  participant Modal
  participant Aroma as ingredients_pairings
  participant Unified as ingredients_unified
  Modal->>Aroma: ensureLoaded
  Modal->>Unified: ensureUnifiedLoaded
  Note over Unified: blocks or stalls perceived UX
```

## Performance + reliability plan

1. **Lazy unified (required)**  
   - Do **not** call `appendFlavorExtras` / `ensureUnifiedLoaded` from the initial `fillHintWrap` path.  
   - Main **seasoning chips** (from `ensureLoaded` + `buildSuggestions`) appear as soon as the small aroma JSON pair is ready.  
   - Add a **second `<details>`**, closed by default: e.g. **“More flavour & pairing notes”** — on first open, run `ensureUnifiedLoaded()` once (`data-kuschi-flavor-hydrated`), then inject `buildFlavorExtrasHtml` + wire pivot. If that fails or times out, show a **short error + link to flavor.html** and clear loading state.

2. **Anti-stuck (required)**  
   - Wrap critical fetches (`ensureLoaded`, `ensureUnifiedLoaded`) with **`AbortController` + timeout** (e.g. 12–20s for unified, shorter for aroma) or `Promise.race` against a reject timer.  
   - In **`catch` / `finally`**: always replace loading nodes with either content or **actionable fallback** (“Couldn’t load flavour data — try again” / link).  
   - Ensure **`fillHintWrap`** `.catch` removes **“Loading seasoning ideas…”** and shows the same failure pattern as today but **guaranteed**.

3. **Prefetch aroma only (required)**  
   - After index catalog load, `requestIdleCallback` → `KuschiAromaHints.ensureLoaded()` so first tap often skips the 200KB cold start.

4. **Modal defaults**  
   - [`seasoningSectionHtml`](assets/aroma-hints.js) / [`index.html`](index.html): **`openByDefault: false`** so the modal opens on recipe body first; expanding hints is explicit (also avoids feeling “stuck” above the fold).

5. **Chef-friendly copy (optional same PR)**  
   - Shorter titles, no raw JSON in `<pre>`, plain lists for pivot — **only if** bundled without delaying the lazy + timeout work.

## Out of scope

- Removing seasoning / flavour / pairing tips from the modal.  
- Rewriting `recipe_detail` shard strategy (unless a separate perf project).
