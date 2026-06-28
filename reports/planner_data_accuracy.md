# Planner data accuracy spot-check

Generated at 120 covers for cocktail and buffet styles.

## Merge paths

- **Shopping tab:** `mergeIngredients` in `package-prep-sheet.js` — canonical key via `KuschiRivieraCanonical`, qty merge via `rivieraQtyToMergeBase`.
- **Order list:** `buildOrderLinesFlat` + `scaleQtyForPlanner` using shared `KuschiPlannerScale` scale map (now awaits `loadServiceData` before open).
- **Shared scaling:** `KuschiPlannerScale.scaleFactorForRecipe` / `scaleQtyStr`.

## Fix applied

`parseYieldNum` now matches `\d[\d.]*` so yields like `Approx. 200 @ 40g` parse as 200 (not `.`).

## Cocktail · 120 covers

| Recipe | Factor | Sample scaled qty | Status |
|--------|--------|-------------------|--------|
| arancini | 0.600 | 3 kg · Arborio Rice | PASS |
| calamari | 6.000 | 12 kg · Pineapple Cut Squid Strips | PASS |
| roast-beef-thyme-garlic-carvery | 3.000 | 24 kg · Carvery Beef, Cooked | PASS |

## Buffet · 120 covers

| Recipe | Factor | Sample scaled qty | Status |
|--------|--------|-------------------|--------|
| arancini | 0.600 | 3 kg · Arborio Rice | PASS |
| calamari | 6.000 | 12 kg · Pineapple Cut Squid Strips | PASS |
| roast-beef-thyme-garlic-carvery | 3.000 | 24 kg · Carvery Beef, Cooked | PASS |
