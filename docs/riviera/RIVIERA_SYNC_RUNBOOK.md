# Riviera Synchronization Runbook

## Refined goal

Keep every Riviera fact traceable to its domain master and make drift fail visibly before shipping. The system is complete when:

1. Google Drive is the editable operational master for SOPs, packages, live orders, approvals, prices, stock, delivery requirements, and archive records.
2. GitHub is the canonical structured recipe database and the source for the searchable Riviera recipe page.
3. The ChatGPT Riviera Project is the daily kitchen driver using a read-optimised published knowledge release.
4. A conversation correction has a scope classification and change receipt before it is promoted into any master.
5. The 23-source 2026-07-08 ChatGPT Project snapshot remains checksum-verifiable as historical provenance.
6. The July 8 overlay remains limited to its 16 historical house-standard recipes; later direct user-approved standards are recorded separately in the structured catalog and current-standards additions file.
7. The GitHub recipe bundle, structured catalog, current house standards, site built-ins, source-alignment rules, recipe standards, and historical audit artifacts pass one command.
8. `main` matches `origin/main`.

## System design

| Layer | Owner | Write path | Check |
|---|---|---|---|
| Operational SOPs/packages/orders | Google Drive | Approved masters and live sheets | Drive control register and release manifest |
| Structured recipe authority | Git | Structured recipe catalog | Catalog schema, standards audit and Git review |
| Tapas house overlay | Git | `riviera_sources/current/Riviera_Tapas_House_Standards_Overlay_2026-07-08.md` | Deterministic builder check |
| Later house standards | Git | Structured recipe catalog + `riviera_sources/current/Riviera_Current_House_Standards_Additions_2026-07-27.md` | Current-standard ID/order validation |
| Site/runtime data | Generator | `riviera_data/` | Schema and source-alignment audits |
| Recipe-card PDF | Generator | `output/pdf/` | Legacy mirror audit hash |
| ChatGPT knowledge release | Publisher | Explicit replacement from approved release bundle | Release ID and source inventory verification |
| ChatGPT daily work | ChatGPT Riviera Project | Conversations using the published release | Change receipt for corrections |
| Historical Project snapshot | Git | `riviera_sources/chatgpt_project_sources_2026-07-08/` | Manifest bytes and SHA-256 |

This is a controlled publication flow, not bidirectional synchronization. Drive and GitHub remain editable in their own domains. ChatGPT knowledge files are compiled releases for retrieval and daily work; a conversation can create a correction or change receipt, but it does not silently rewrite the source files.

## Correction scope and change receipts

Before publishing a user correction, classify it as exactly one of:

1. `PERMANENT RIVIERA STANDARD`
2. `PACKAGE-SPECIFIC STANDARD`
3. `RECIPE-SPECIFIC STANDARD`
4. `EVENT-SPECIFIC INSTRUCTION`
5. `WEEK-SPECIFIC INSTRUCTION`

Ask when scope is unclear. Every receipt records the previous rule, new rule, scope, effective and expiry dates where applicable, affected SOP/package/recipe/event records, and Drive/GitHub/ChatGPT publication status.

Temporary event/week instructions must carry an expiry and stay in the affected event or week record. They must not be promoted into a permanent kitchen or supplier SOP. For example, a delivery restriction for one wedding week does not change the normal rule that Friday orders and deliveries are allowed.

## Daily operation

For recipe changes, run before and after work in this repository:

```bash
python3 scripts/riviera_sync.py status --remote
```

Edit the structured catalog first. Then run:

```bash
python3 scripts/riviera_sync.py rebuild
python3 scripts/riviera_sync.py verify --remote
```

When adding a house standard after 2026-07-08, keep the fixed July 8 overlay list unchanged. Add the recipe to the structured catalog with `houseStandard: true`, lifecycle status/version/provenance/confirmation flags, extend the current house-standard order used by the sync/PDF generators, and rebuild. The additions file and GitHub recipe bundle are generated from that catalog state.

Use `python3 scripts/riviera_sync.py rebuild --include-pdf` when the full recipe-card book and house-standards manual must be regenerated. A changed mirror artifact remains visible as a warning until the legacy Project audit is refreshed.

Repository and CI verification report a stale historical Project artifact as a warning because that audit is provenance evidence, not the current ChatGPT publication status. When reproducing the historical audit, enforce byte-for-byte freshness explicitly:

```bash
python3 scripts/riviera_sync.py verify --enforce-live-mirror
```

## Cross-system release order

For every approved correction:

1. Confirm the correction and scope classification.
2. Create or update the change receipt.
3. Update the Drive master when operational SOP, package, order, approval, price, stock, delivery, or archive data changed.
4. Update the GitHub structured catalog when recipe data changed, then rebuild and verify the recipe bundle.
5. Regenerate the ChatGPT read-optimised source bundle.
6. Update the active release manifest so Drive, GitHub, and ChatGPT share the same release ID.
7. Replace stale ChatGPT knowledge sources, verify the source inventory, and only then mark ChatGPT publication complete.
8. Report per-target completion. Never report a source as updated merely because the correction appeared in conversation.

## Historical Project import boundary

The 2026-07-08 snapshot is not polled or merged automatically. If a correction is discovered in historical Project material:

1. Download or copy that single source into a staging folder outside the repository.
2. Compare it with the matching manifest entry and identify the exact changed rule.
3. Classify the scope and create a change receipt.
4. Apply it to the correct Drive or GitHub domain master.
5. Run the applicable rebuild and verification.
6. Publish a new ChatGPT release if the active knowledge bundle is affected.
7. Do not merge copies by “newest file wins.”

New Project source files require an explicit source-registry/manifest change and review. Missing, renamed, or additional sources are a stop condition, not an automatic merge.

## Historical audit boundary

Generate the exact artifact set and checksums recorded by the historical audit:

```bash
python3 scripts/riviera_sync.py mirror-manifest
```

This command is retained for audit reproducibility. It is not the active ChatGPT knowledge-release publisher. Active releases follow the cross-system order above and must use the approved Riviera Active Release Manifest.

## CI and failure recovery

`.github/workflows/riviera-sync.yml` runs the non-mutating repository verification command on relevant pushes and pull requests. CI blocks recipe-source, generated-data, schema, alignment, standards, and audit-record integrity failures. ChatGPT publication status is verified in the cross-system release process, not inferred from a Git push.

| Failure | Recovery |
|---|---|
| Source checksum drift | Confirm the source change, update the snapshot/manifest intentionally, rebuild |
| Generated recipe-bundle drift | Run `python3 scripts/build_riviera_source_of_truth.py --write` |
| Catalog/built-ins drift | Run `python3 scripts/sync_riviera_recipe_catalog.py --write` |
| Historical audit artifact stale | Refresh it only when reproducing the historical audit; do not treat it as active release status |
| ChatGPT release stale | Rebuild from approved Drive/GitHub masters, replace sources, verify inventory and update the release manifest |
| `main` behind/ahead | Reconcile Git normally; never use ChatGPT or Drive timestamps as merge authority |
| Service variant audit failure | Correct the canonical service rule or mark it explicitly as needing confirmation |

The 26 recipes without sourced service-variant records remain a separate content-completeness backlog in `riviera_data/service_variant_backlog.json`. Every row is explicitly `NEEDS CONFIRMATION`; the all-builtins audit fails on any unregistered gap or stale backlog row, but never invents quantities merely to satisfy coverage. These recipes remain available, but must not be presented as confirmed service standards.
