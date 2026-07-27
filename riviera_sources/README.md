# Riviera Source Of Truth

This folder preserves the verified Riviera source stack and its synchronization evidence.

## Authority contract

Riviera authority is split by domain:

- Google Drive is the editable master for operational SOPs, package rules, live orders, approvals, prices, stock, delivery requirements, and archive records.
- GitHub is the canonical structured recipe database and powers the searchable Riviera recipe page.
- The ChatGPT Riviera Project is the daily kitchen driver. Its knowledge sources are read-optimised published releases; conversation changes are not source updates until the appropriate master is updated and the release is republished and verified.

Use `current/Riviera_Source_Of_Truth_2026-07-08.md` as the GitHub recipe-data bundle with historical source provenance and `current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json` as the canonical editable recipe payload. Do not use this repository bundle to override a newer approved Drive operations master.

Conflict order:

1. A current user correction controls the active task, but is not a published source update until it has a change receipt and the relevant master/release is updated.
2. Approved Drive masters control operational SOPs, packages, live orders, supplier data, stock, delivery requirements, and approvals.
3. The structured GitHub catalog controls Riviera recipe identity, lifecycle, formulas, methods, yields, allergens, and service controls.
4. The July 8 tapas/canape overlay overrides older recipe-bank versions for its 16 dishes; later approved recipe standards are recorded separately in the structured catalog.
5. The verified 23-file ChatGPT Project snapshot is historical provenance for inherited rules, not the current operational master.
6. `riviera_data/builtins.json`, package JSON, planner data, ChatGPT knowledge files, and PDFs are generated, published, or operational representations.

Classify every proposed correction as a permanent Riviera standard, package-specific standard, recipe-specific standard, event-specific instruction, or week-specific instruction. Ask if scope is unclear. A change receipt must retain the old and new rule, scope, effective/expiry dates, affected records, and Drive/GitHub/ChatGPT publication status. Event/week rules must expire and must not be promoted into permanent SOPs.

## Files

- `sync_contract.json` - machine-readable ownership, transport, and mirror rules.
- `chatgpt_project_sources_2026-07-08/` - verified legacy Project snapshot: text files, PDFs/DOCX/XLSX, extracts, image source record, and captured base64 image payload.
- `current/Riviera_Tapas_House_Standards_Overlay_2026-07-08.md` - the 16 July 8 house-standard tapas/canape recipes.
- `current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json` - canonical structured recipe catalog for the 156 Riviera built-in recipes.
- `current/Riviera_Source_Of_Truth_2026-07-08.md` - one merged file containing the overlay plus ChatGPT source appendices.
- `current/manifest.json` - source list, checksums, structured catalog path, and overlay recipe IDs.
- `current/live_project_audit_2026-07-10.json` - authenticated parity proof for the 23 baseline sources and five legacy Project mirror artifacts.

The `2026-07-08` names on the catalog, merged recipe bundle and PDF are retained as stable compatibility paths for existing site and audit tooling. They identify the historical provenance baseline, not the current release date. Always use the embedded `releaseId` and manifest `date` to identify the active release; the current ID is `RIV-KNOWLEDGE-2026-07-27-V13`.

## One-command workflow

```bash
python3 scripts/riviera_sync.py status --remote
python3 scripts/riviera_sync.py rebuild
python3 scripts/riviera_sync.py verify --remote
```

`verify` is non-mutating and fails on source checksum drift, generated recipe-bundle drift, catalog/built-ins drift, source-alignment failures, recipe-standard failures, stale historical-audit artifacts, or Git branch divergence. See `docs/riviera/RIVIERA_SYNC_RUNBOOK.md` for source intake, change receipts, release publishing, historical audits, and recovery.
