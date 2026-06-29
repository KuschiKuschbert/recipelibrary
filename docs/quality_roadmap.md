# Kitchen Library Quality Roadmap

## Goal

Make the Kitchen Library safe to change quickly: every meaningful edit should have a clear local gate, a known verification path, and enough structure that large HTML/data workflows can evolve without guesswork.

## Current Baseline

- `python3 scripts/ship_check.py` is the default local gate.
- The gate covers JavaScript syntax, planner acceptance, service-worker cache health, static page/data fetches, and UI/docs copy fluff.
- The app remains static GitHub Pages: no backend, no build step, no npm dependency required for core checks.

## Direction

1. **Quality gate first**
   Keep `ship_check.py` fast, dependency-free, and useful enough to run before every commit. Warnings should be rare and actionable; noisy baseline findings should be allowlisted with a reason.

2. **Browser confidence next**
   Add richer browser verification only where static checks cannot prove behavior: recipe modals, planner generation, order lists, search, and localStorage flows.

3. **Modularize by workflow**
   Extract behavior from the largest HTML files one workflow at a time. Prefer stable user workflows over broad refactors: Riviera planner/order list, main recipe modal/search, kitchen books, then flavor/aroma tools.

4. **Guard local data contracts**
   Add small fixture tests for localStorage migrations, order-list export/import, stocktake import/export, and user recipe normalization before changing those helpers.

5. **Keep big data cheap**
   Preserve sharded catalog/detail patterns. Any new static dataset should have a routing/index story before it becomes part of page boot.

## Near-Term Execution Track

- **Slice 1: Quiet baseline checks** - make copy-fluff warnings actionable by allowlisting intentional examples and keeping the default gate green.
- **Slice 2: Browser smoke v1** - add an optional browser-driven smoke for the highest-value flows while keeping `static_smoke.py` as the no-dependency fallback.
- **Slice 3: LocalStorage fixture tests** - cover user recipe, Riviera order, kitchen book, and stocktake helpers with deterministic data fixtures.
- **Slice 4: Riviera workflow extraction** - move planner/order-list glue out of `riviera.html` after fixture coverage is in place.

## Done Means

- `python3 scripts/ship_check.py` passes on a clean tree.
- Any new warnings are either fixed or deliberately allowlisted with a reason.
- README or this roadmap names the new check or workflow so the next agent knows where it belongs.
