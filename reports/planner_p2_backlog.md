# Planner P2 backlog — status

## PDF export — **v1 shipped (client-side)**

- **Print / PDF** — browser print dialog (`plannerPrint`)
- **Download HTML** — offline file for print-to-PDF (`plannerDownloadHtml` + `KuschiPlannerExtras.downloadPlannerHtml`)

Future: jsPDF for true `.pdf` binary if needed.

## Epicure auto-suggest — **v1 shipped (static hints)**

- `riviera_data/planner_pairing_hints.json` — curated bridge chips on selected planner dishes
- Regenerate: `scripts/build_planner_pairing_hints.py` (wire Epicure MCP when available)

Future: live Epicure API or richer static shard.

## Pricing / GP — **v1 shipped (partial estimates)**

- `riviera_data/planner_unit_costs.json` — merge-key → AUD per unit
- Shopping tab shows partial total when priced lines exist

Future: full cost SSOT from supplier feeds; GP% target per package.

## Cloud sync — **v1 shipped (file-based)**

- **Export / Import** plan JSON on planner bar (`fnPlannerExport` / `fnPlannerImport`)
- **Export bundle** from planner list (state + timeline localStorage keys)

Future: authenticated multi-user backend sync.
