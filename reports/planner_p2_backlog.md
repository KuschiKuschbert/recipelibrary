# Planner P2 backlog

Deferred feature projects after v1.1 + data accuracy + prepPhase passes.

## Epicure auto-suggest

**Goal:** When selecting package dishes in the planner, surface non-obvious pairings from the Epicure embedding model.

**Touch points:** `assets/package-planner.js` (selection UI), optional MCP/`user-epicure` in agent workflows only — client-side would need a static pairing shard or lazy API.

**Effort:** Medium–large (data pipeline + UI chips).

## Pricing / GP

**Goal:** Attach food cost or GP% to planner shopping lists from par/stock or supplier prices.

**Touch points:** `mergeIngredients` output, `riviera_data/stocktake_catalog.json`, new cost map JSON.

**Effort:** Large (cost SSOT + UI).

## PDF export

**Goal:** One-click PDF of manifest + timeline + shopping (+ optional recipes) instead of browser print.

**Touch points:** `populatePrintRoot`, new print CSS or client PDF lib (jsPDF / print-to-PDF server).

**Effort:** Medium.

## Cloud sync

**Goal:** Shared planner state (selections, event date, timeline checks) across tablets/staff.

**Touch points:** Replace `localStorage` with authenticated backend or sync provider; migrate `kuschi_package_plan_v2` and timeline keys.

**Effort:** Large (infra + auth).

## Suggested order

1. PDF export (staff-facing, no backend)
2. Epicure suggest (differentiation)
3. Pricing/GP (ops value, needs cost data)
4. Cloud sync (multi-user)
