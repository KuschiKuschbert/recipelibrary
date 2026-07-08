# Riviera Source Of Truth

This folder preserves the merged Riviera source pack.

## Current authority

Use `current/Riviera_Source_Of_Truth_2026-07-08.md` as the active merged source stack, and
`current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json` as the canonical editable
recipe payload.

Merge direction:

1. The 23 live ChatGPT Riviera project sources are the latest baseline.
2. The July 8 tapas/canape house-standard recipes override older ChatGPT recipe-bank versions for those 16 dishes only.
3. The structured recipe catalog is the source for Riviera built-in recipe cards.
4. `riviera_data/builtins.json`, package JSON, and generated PDFs are operational representations. For non-overlay conflicts, reconcile them back to the merged source/catalog before treating them as final.

## Files

- `chatgpt_project_sources_2026-07-08/` - live ChatGPT Riviera project source pack: text files, downloaded PDFs/DOCX/XLSX, extraction markdown, and one image source record.
- `current/Riviera_Tapas_House_Standards_Overlay_2026-07-08.md` - the 16 July 8 house-standard tapas/canape recipes.
- `current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json` - canonical structured recipe catalog for the 146 Riviera built-in recipes.
- `current/Riviera_Source_Of_Truth_2026-07-08.md` - one merged file containing the overlay plus ChatGPT source appendices.
- `current/manifest.json` - source list, checksums, structured catalog path, and overlay recipe IDs.

## Rebuild

```bash
python3 scripts/sync_riviera_recipe_catalog.py --check
python3 scripts/sync_riviera_recipe_catalog.py --write
python3 scripts/build_riviera_source_of_truth.py
```
