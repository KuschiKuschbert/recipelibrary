# Riviera Source Of Truth

This folder preserves the verified Riviera source stack and its synchronization evidence.

## Authority contract

GitHub is the only mutable Riviera authority. Active work runs from the ChatGPT local project pointed at this repository. The old ChatGPT Riviera Project is a read-only historical snapshot/mirror because ChatGPT Projects do not expose a supported source-file synchronization API.

Use `current/Riviera_Source_Of_Truth_2026-07-08.md` as the active merged source stack and `current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json` as the canonical editable recipe payload.

Conflict order:

1. A direct user correction becomes authoritative only after it is recorded in a reviewed Git commit.
2. The July 8 tapas/canape overlay overrides older recipe-bank versions for its 16 dishes.
3. The verified 23-file ChatGPT Project snapshot is the baseline for all other legacy rules.
4. The structured catalog is authoritative for Riviera built-in recipe cards.
5. `riviera_data/builtins.json`, package JSON, planner data, and PDFs are generated or operational representations.

## Files

- `sync_contract.json` - machine-readable ownership, transport, and mirror rules.
- `chatgpt_project_sources_2026-07-08/` - verified legacy Project snapshot: text files, PDFs/DOCX/XLSX, extracts, image source record, and captured base64 image payload.
- `current/Riviera_Tapas_House_Standards_Overlay_2026-07-08.md` - the 16 July 8 house-standard tapas/canape recipes.
- `current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json` - canonical structured recipe catalog for the 146 Riviera built-in recipes.
- `current/Riviera_Source_Of_Truth_2026-07-08.md` - one merged file containing the overlay plus ChatGPT source appendices.
- `current/manifest.json` - source list, checksums, structured catalog path, and overlay recipe IDs.
- `current/live_project_audit_2026-07-10.json` - authenticated parity proof for the 23 baseline sources and five legacy Project mirror artifacts.

## One-command workflow

```bash
python3 scripts/riviera_sync.py status --remote
python3 scripts/riviera_sync.py rebuild
python3 scripts/riviera_sync.py verify --remote
```

`verify` is non-mutating and fails on source checksum drift, generated SSOT drift, catalog/built-ins drift, source-alignment failures, recipe-standard failures, stale legacy mirror artifacts, or Git branch divergence. See `docs/riviera/RIVIERA_SYNC_RUNBOOK.md` for imports, mirror replacement, and recovery.
