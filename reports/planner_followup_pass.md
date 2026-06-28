# Planner follow-up parallel pass

Date: 2026-06-28  
Branch: `main` (pending merge of follow-up PR)

## 1. Automated tablet / acceptance smoke

| Check | Result |
|-------|--------|
| `python3 scripts/planner_acceptance_smoke.py` | PASS |
| SW v14 hooks in riviera.html | PASS |
| No `"Scalable"` yields | PASS |
| Package recipe coverage 284/284 | PASS |

**Manual tablet (still recommended on GitHub Pages):** Portofino + carvery + corporate + plated — event date, timeline checkboxes, order list vs Shopping, prep import, print toggle.

## 2. prepPhase beyond Portofino

| Section | Recipes | prepPhase coverage |
|---------|---------|-------------------|
| Portofino | 9 staples | already on main (#26) |
| corporate_lunch | 10 | +10 applied |
| corporate_buffet | 15 | +13 applied (2 shared with Portofino) |
| carvery_buffet | 15 | +15 applied |
| plated_meals | 11 | +8 applied (3 shared) |

Script: `scripts/planner_apply_prep_phases.py` (**47** recipes patched across Portofino + corporate + carvery + plated).

## 3. Ingredient reconciliation

| Metric | Result |
|--------|--------|
| `reconcile_ingredients.py --dry-run` | 0 changes (catalog already aligned) |
| Report | `reports/ingredient_reconcile_changes.md` |

## 4. Stock / par sync

| Metric | Result |
|--------|--------|
| Workbook extract | `reports/reference_sheet_extract_full.json` |
| `sync_stock_from_workbook.py --apply` | +1 row (`c166` Shreedded Mozzarella), 0 zone fixes |
| Catalog rebuild | `riviera_data/stocktake_catalog.json` (417 items) |

## 5. P2 backlog (not implemented — scoped)

See `reports/planner_p2_backlog.md` for Epicure auto-suggest, pricing/GP, PDF export, cloud sync.
