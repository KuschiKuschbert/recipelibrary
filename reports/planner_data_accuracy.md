# Planner data accuracy spot-check

Generated at 120 covers for cocktail and buffet styles.

## Merge paths

- **Shopping tab:** `mergeIngredients` in `package-prep-sheet.js` — canonical key via `KuschiRivieraCanonical`, qty merge via `rivieraQtyToMergeBase`.
- **Order list:** `buildOrderLinesFlat` + `scaleQtyForPlanner` using shared `KuschiPlannerScale` scale map (now awaits `loadServiceData` before open).
- **Shared scaling:** `KuschiPlannerScale.scaleFactorForRecipe` / `scaleQtyStr`.

## Fix applied

`parseYieldNum` now matches `\d[\d.]*` so yields like `Approx. 200 @ 40g` parse as 200 (not `.`).

## Cocktail · 120 covers

## Buffet · 120 covers

## High Tea locked service targets

| Guests | Recipe | Target | Ingredient scale | Status |
|--------|--------|--------|------------------|--------|
| 12 | arancini | 12 pieces | NEEDS CONFIRMATION | PASS |
| 12 | house-scones | 12 pieces | ×0.300 | PASS |
| 12 | ribbon-sandwiches | 24 pieces | ×12.000 | PASS |
| 12 | sweet-petit-fours | 24 pieces | ×12.000 | PASS |
| 100 | arancini | 100 pieces | NEEDS CONFIRMATION | PASS |
| 100 | house-scones | 100 pieces | ×2.500 | PASS |
| 100 | ribbon-sandwiches | 200 pieces | ×100.000 | PASS |
| 100 | sweet-petit-fours | 200 pieces | ×100.000 | PASS |
