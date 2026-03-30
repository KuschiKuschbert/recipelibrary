---
name: kitchen-library
description: Personal Kuschi kitchen library on GitHub Pages — data layout, user recipes, Riviera, theme.css, order list, master ingredients, and git workflow.
---

# Kitchen library hub

Read before large edits to HTML, JSON recipe data, or `.cursor` rules.

## Purpose

Static **GitHub Pages** site: main catalog ([index.html](index.html)), Riviera prep-chef set ([riviera.html](riviera.html)). Optimized for a small kitchen tablet.

## Directories

| Path | Role |
|------|------|
| `assets/theme.css` | **Shared** theme: `:root` tokens, search, filters, modal shell, footer, spin, form helpers, base `.grid` |
| `claude_index/` | Search index JSON shards for the main library |
| `recipe_detail/detail_*.json` | Full recipe payloads keyed by first letter of name |
| `kitchen_library_*.json` | Additional library chunks |
| `assets/user-recipes.js` | **localStorage** helpers (browser-only) — see keys below |
| `scraped_raw/`, `pdf/` | Source / export artifacts |

## User data (client-side)

- **Kitchen** recipes: `kuschi_user_recipes_kitchen_v1` — merged into the main list; detail view does **not** use `recipe_detail/` fetch for `user-*` ids.
- **Riviera** recipes: `kuschi_user_recipes_riviera_v1` — prepended to `BUILTIN_RECIPES` in [riviera.html](riviera.html).
- **Master ingredients:** `kuschi_master_ingredients_v1` — `{ id, name, defaultZone }` with `defaultZone` in `freezer` \| `coldroom` \| `drystore` \| `other`. Used to default zones for matching ingredient names on the Riviera order list.
- **Riviera order overrides:** `kuschi_riviera_order_overrides_v1` — map `recipeId::ingredientIndex` → `{ zone?, orderQty?, included? }`.
- **Riviera order extras:** `kuschi_riviera_order_extras_v1` — manual lines from “Add ingredient” on the order list modal.
- **Riviera order list UI:** [riviera.html](riviera.html) — ingredients grouped **by storage zone** (not by recipe); per-line order qty, zone, include checkbox; “Add to master & list”; copy plain text, **Copy order data JSON** (`exportOrderBundle`), **Copy master ingredients JSON** (`exportMaster`).
- **Casing on save:** [assets/user-recipes.js](assets/user-recipes.js) applies title case to names, ingredient lines, labels, etc.; method/service lines get a leading capital only; **yield** and **qty** strings are left as typed; **protein** / **tags** on the kitchen page stay lowercase for filters.
- **Backup:** Use JSON copy buttons in the UIs to paste into files and commit from a dev machine if desired.

## Theme and units

- **Theme:** [.cursor/rules/theme.mdc](.cursor/rules/theme.mdc) — canonical shared styles live in [assets/theme.css](assets/theme.css).
- **Units:** [.cursor/rules/metric-units.mdc](.cursor/rules/metric-units.mdc).

## Git workflow

- See [.cursor/rules/git-workflow.mdc](.cursor/rules/git-workflow.mdc) and [.cursor/rules/git.md](.cursor/rules/git.md).

## Delivery status (hub note)

Phases 1–2: Cursor rules, hub skill, user recipes, Riviera modals, git workflow, title casing on save.  
Phase 3: `theme.css` + README refresh; Riviera order list by zone + master DB + JSON export; hub doc updates (this file).
