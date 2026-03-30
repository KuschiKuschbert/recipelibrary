---
name: kitchen-library
description: Personal Kuschi kitchen library on GitHub Pages — data layout, user recipes, Riviera, theme, and git workflow.
---

# Kitchen library hub

Read before large edits to HTML, JSON recipe data, or `.cursor` rules.

## Purpose

Static **GitHub Pages** site: main catalog ([index.html](index.html)), Riviera prep-chef set ([riviera.html](riviera.html)). Optimized for a small kitchen tablet.

## Directories

| Path | Role |
|------|------|
| `claude_index/` | Search index JSON shards for the main library |
| `recipe_detail/detail_*.json` | Full recipe payloads keyed by first letter of name |
| `kitchen_library_*.json` | Additional library chunks |
| `assets/user-recipes.js` | **localStorage** helpers for user-added recipes (browser-only) |
| `scraped_raw/`, `pdf/` | Source / export artifacts |

## User recipes (client-side)

- **Kitchen** recipes: `localStorage` key `kuschi_user_recipes_kitchen_v1` — merged into the main list; detail view does **not** use `recipe_detail/` fetch for `user-*` ids.
- **Riviera** recipes: `kuschi_user_recipes_riviera_v1` — prepended to `BUILTIN_RECIPES` in [riviera.html](riviera.html).
- **Backup:** Use “Copy JSON backup” in the add-recipe UIs to paste into a file and commit from a dev machine if desired.

## Theme and units

- See `.cursor/rules/theme.mdc` and `.cursor/rules/metric-units.mdc`.

## Git workflow

- See `.cursor/rules/git-workflow.mdc` and [.cursor/rules/git.md](.cursor/rules/git.md).
