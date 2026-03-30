---
name: kitchen-library
description: Personal Kuschi kitchen library on GitHub Pages — data layout, user recipes, Riviera, theme.css, order list, master ingredients, and git workflow.
---

# Kitchen library hub

Read before large edits to HTML, JSON recipe data, or `.cursor` rules.

## Purpose

Static **GitHub Pages** site: main catalog ([index.html](index.html)), Riviera prep-chef set ([riviera.html](riviera.html)). Optimized for a small kitchen tablet.

## Agent shipping (after you change code)

Matches [.cursor/rules/ship-after-change.mdc](../../rules/ship-after-change.mdc) — do this by default when finishing a task unless the user says not to commit/push.

1. **Test** — `node --check` on any edited `assets/*.js`; when HTML/behaviour changed, quick static server from repo root + browser spot-check on affected pages if you can.
2. **Commit** — Conventional Commits; small, focused messages.
3. **Push** — `git push origin` the current branch (`main` is normal for small updates).

Skip only if the user explicitly opts out.

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

## Riviera “Prep Chef” PDF vs built-ins (dedupe on add)

The house **Recipes for Prep Chef** PDF uses longer titles than the site cards. Saving a new Riviera recipe from the add modal runs **dedupe** so PDF-style names do not create a second copy of an existing built-in or an existing user-saved Riviera recipe.

- **Logic:** [assets/user-recipes.js](assets/user-recipes.js) — `normalizeRivieraNameForDedupe`, `coreRivieraNameForDedupe` (text before first ` with `), `findRivieraDuplicate(name, BUILTIN_RECIPES)`, optional third arg overrides the user list (defaults to `loadRiviera()`). Explicit `RIVIERA_PREP_CHEF_ALIAS_TO_ID` maps normalized PDF headings to built-in `id`.
- **Hook:** [riviera.html](riviera.html) `submitRivieraRecipe()` calls `findRivieraDuplicate` before `addRivieraRecipe`; on match, shows an alert and does not save.

| PDF-style title (concept) | Built-in `id` in `BUILTIN_RECIPES` |
|---------------------------|-------------------------------------|
| Chorizo and Mozzarella Arancini… | `arancini` |
| Calamari Fritti… | `calamari` |
| Kilpatrick Oyster… | `oysters-kilpatrick` |
| Slow Cooked Veal Meatballs… | `veal-meatballs` |
| Lemon Pepper Chicken Skewer with Tzatziki… | `chicken-skewer` (site card: Herbed Labneh) |
| Crispy Fried Chorizo Potatoes… | `chorizo-potatoes` |
| Chargrilled Lamb Cutlet… | `lamb-cutlet` |
| Crispy Reef Fish Slider… | `fish-slider` |
| Romesco | `romesco` |
| Lemon & Dill Aioli | `lemon-dill-aioli` |
| Lemon & Thyme Aioli | `lemon-thyme-aioli` |
| Vodka Sauce | `vodka-sauce` |
| Whipped Butter | `whipped-butter` |
| Riviera House Emulsion | `riviera-emulsion` |
| Camembert, Pecan & Cranberry Cigars… | `camembert-cigars` |
| Beef Kofta… | `beef-kofta` |

## Theme and units

- **Theme:** [.cursor/rules/theme.mdc](.cursor/rules/theme.mdc) — canonical shared styles live in [assets/theme.css](assets/theme.css).
- **Units:** [.cursor/rules/metric-units.mdc](.cursor/rules/metric-units.mdc).

## Git workflow

- See [.cursor/rules/git-workflow.mdc](.cursor/rules/git-workflow.mdc) and [.cursor/rules/git.md](.cursor/rules/git.md).

## Delivery status (hub note)

Phases 1–2: Cursor rules, hub skill, user recipes, Riviera modals, git workflow, title casing on save.  
Phase 3: `theme.css` + README refresh; Riviera order list by zone + master DB + JSON export; hub doc updates (this file).
