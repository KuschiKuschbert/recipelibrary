# Riviera Source Of Truth

This folder preserves the merged Riviera source pack.

## Current authority

Use `current/Riviera_Source_Of_Truth_2026-07-08.md` as the active merged source of truth.

Merge direction:

1. ChatGPT Riviera project sources are the latest baseline.
2. The July 8 tapas/canape house-standard recipes override older ChatGPT recipe-bank versions for those 16 dishes only.
3. Repo JSON and generated PDFs are operational representations. For non-overlay conflicts, reconcile them back to the merged source before treating them as final.

## Files

- `chatgpt_project_sources_2026-07-08/` - raw text sources downloaded or extracted from the ChatGPT Riviera project.
- `current/Riviera_Tapas_House_Standards_Overlay_2026-07-08.md` - the 16 July 8 house-standard tapas/canape recipes.
- `current/Riviera_Source_Of_Truth_2026-07-08.md` - one merged file containing the overlay plus ChatGPT source appendices.
- `current/manifest.json` - source list, checksums, and overlay recipe IDs.

## Rebuild

```bash
python3 scripts/build_riviera_source_of_truth.py
```
