---
name: Riviera metric + dedupe
overview: Run all Riviera recipes (built-ins + saved) through the existing metric normalizer, collapse lazy duplicate ingredient lines via canonical names and optional qty merge, and preserve order-list zones by remapping recipeId::index overrides when row counts change.
todos:
  - id: extend-metric-count
    content: Add count units (loaf→pc) in recipe-metric-normalize.js; ensure cup/tbsp convert
  - id: aliases-parsley
    content: Extend INGREDIENT_CANON_ALIASES (flat leaf italian parsley → flat leaf parsley, etc.)
  - id: dedupe-merge
    content: Per-recipe merge ingredients sharing canonicalOrderMergeKey; sum qty where same g/ml unit
  - id: remap-overrides
    content: Remap kuschi_riviera_order_overrides_v1 keys when ingredient indices change
  - id: batch-builtin
    content: Rewrite BUILTIN_RECIPES in riviera.html + migrate loadRiviera() once with version key
  - id: verify-storage
    content: Confirm master list zones unchanged for renamed-but-same-key items; spot-check order list
isProject: true
---

# Riviera: run through metric normaliser + dedupe names (keep storage)

## Goals

1. **Run existing Riviera recipes** (inline `BUILTIN_RECIPES` and `localStorage` Riviera list) through [`KuschiRecipeMetric.normalizeRivieraIngredients`](assets/recipe-metric-normalize.js) so ingredient `qty` strings are **metric** (no cup / tbsp / tsp in stored qty where conversion applies).
2. **Remove duplicate ingredient lines** that are the same thing under different wording (e.g. “Flat Leaf Italian Parsley” vs “Flat Leaf Parsley”) — prefer **one canonical display name** and **one row** per recipe when they share the same [`canonicalOrderMergeKey`](assets/user-recipes.js).
3. **Keep storage locations** — Riviera order overrides use keys `recipeId::ingredientIndex` ([`STORAGE_ORDER_OVERRIDES`](assets/user-recipes.js)). Master default zones use **canonical name**, not index — renames that share the same key after aliases **do not** lose zones. Any **merge that drops rows** must **remap** override keys.

## Why master zones mostly survive

- [`resolveDefaultZone`](assets/user-recipes.js) / [`upsertMasterIngredient`](assets/user-recipes.js) match on `normalizeIngName` (= `canonicalOrderMergeKey` pipeline).
- If two strings collapse to the same canonical key via **aliases**, they already pointed at one master row for ordering; after renaming display text to one preferred label, zones stay aligned.

## Dedupe strategy

1. **Aliases first** — extend `INGREDIENT_CANON_ALIASES` for known lazy pairs (e.g. `/\bflat\s+leaf\s+italian\s+parsley\b/g` → `flat leaf parsley`). Apply **before** or as part of the same normalization pass used for display `item` strings (title-case preserved via existing `titleCaseWords` patterns where needed).
2. **Per-recipe row merge** — after normalizing qty, group consecutive or all ingredients with the same `canonicalOrderMergeKey(item)`:
   - If **same unit** after normalize (both `g`, both `ml`, etc.): **sum** numeric qty and emit one row (combine `prep` with `; ` if both non-empty).
   - If units differ or one is count (`pc`) and one is mass: **prefer manual rule** (e.g. keep both until a human fixes, or convert count to mass only when defined — default: **merge only when units match** to avoid silent errors).
3. **Built-in source** — rewrite [`riviera.html`](riviera.html) `BUILTIN_RECIPES` in-repo so the canonical data matches runtime (no reliance on `mergeRivieraRecipes` alone unless you want a temporary safety net).

## Preserving order overrides when indices change

After merge, build for each `recipeId` a map `oldIndex → newIndex` (or drop keys that merged into another line and **carry** `zone` / `orderQty` / `included` onto the surviving line’s override).

Algorithm sketch:

- Start from **new** ingredient list (post-merge).
- For each **old** index, determine which **new** index absorbed it (same merge group).
- For conflicting patches on merged group, **last-wins** or **prefer explicit zone** — document choice.
- Rewrite `loadOrderOverrides()` object: delete old `recipeId::oldIdx` keys, set `recipeId::newIdx` merged patches.

Run once as part of a **versioned migration** (e.g. `kuschi_riviera_recipe_shape_v2` or bump inside stored Riviera JSON) so repeat visits do not double-remap.

## User-saved Riviera (`kuschi_user_recipes_riviera_v1`)

- Same pipeline: normalize qty, apply alias display names, merge rows, remap overrides for those recipe ids present in localStorage.
- Optional: export backup reminder in migration comment (user can copy JSON from existing UI).

## Files to touch

- [`assets/recipe-metric-normalize.js`](assets/recipe-metric-normalize.js) — count units (`loaf` → `pc`), any edge cases found while batching.
- [`assets/user-recipes.js`](assets/user-recipes.js) — `INGREDIENT_CANON_ALIASES`; migration helper `migrateRivieraRecipesAndOrderOverrides()`; export if needed for tests.
- [`riviera.html`](riviera.html) — rewritten `BUILTIN_RECIPES` ingredient arrays; call migration on load once.

## Out of scope

- Instruction prose that mentions “cup” in method text (optional later cleanup).
- Kitchen book / `recipe_detail` JSON (separate audit).

## Verification

- Grep `riviera.html` (and saved Riviera export): no `cup|tbsp|tsp|tablespoon|teaspoon` in ingredient `qty` fields except unconvertible edge cases (document any leftovers).
- Order list: zones for renamed ingredients unchanged; merged lines show single row with combined qty.
- Manual: recipe that had two parsley lines now has one (when units mergeable).
