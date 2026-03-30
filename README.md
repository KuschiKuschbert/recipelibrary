# Kuschi Kitchen Library

Personal recipe library hosted on **GitHub Pages**: searchable catalog, metric-oriented data, and a **Riviera House** prep-chef subset for batch and service workflows. Tuned for quick use on a kitchen tablet.

## What’s in the repo

| Area | Purpose |
|------|---------|
| [index.html](index.html) | Main library UI — loads `claude_index/` shards, recipe detail from `recipe_detail/`, merges **user recipes** from the browser |
| [riviera.html](riviera.html) | Riviera prep set (built-in cards + user-added Riviera recipes), **order list by storage** (freezer → cold room → dry store → other) with local master ingredients |
| [assets/theme.css](assets/theme.css) | Shared dark theme tokens, search shell, filters, modal shell, footer |
| [assets/user-recipes.js](assets/user-recipes.js) | `localStorage` helpers: kitchen recipes, Riviera recipes, master ingredients, Riviera order overrides / extras, JSON export |
| [assets/recipe-gemini-format.js](assets/recipe-gemini-format.js) | Gemini JSON extraction for add-recipe (Kitchen + Riviera); optional fetch proxy helpers |
| [assets/recipe-import-helpers.js](assets/recipe-import-helpers.js) | File upload (PDF / DOCX / image) and HTML→text for URL import |
| [workers/recipe-fetch-proxy.js](workers/recipe-fetch-proxy.js) | Optional Cloudflare Worker to fetch recipe URLs (bypass browser CORS) |
| `claude_index/` | Compact index JSON shards for search |
| `recipe_detail/detail_*.json` | Full recipe payloads (main library), keyed by first letter of name |
| `pdf/` | Category reference PDFs |

## Local and device data

There is **no server**. “Save” actions write to **this browser’s** `localStorage`:

- Kitchen recipes: `kuschi_user_recipes_kitchen_v1`
- Riviera recipes: `kuschi_user_recipes_riviera_v1`
- Master ingredients (default storage zone per name): `kuschi_master_ingredients_v1`
- Riviera order line overrides: `kuschi_riviera_order_overrides_v1`
- Manual order lines: `kuschi_riviera_order_extras_v1`

Use **Copy JSON backup** / **Copy order data JSON** / **Copy master ingredients JSON** in the UIs to paste into files and commit from a dev machine if you want git-backed backups.

- Gemini API key (add-recipe **Paste & format**): `kuschi_gemini_api_key_v1`
- Optional recipe **fetch proxy** URL (same tab, for importing from recipe URLs when the site blocks browser `fetch`): `kuschi_recipe_fetch_proxy_v1`

### Recipe URL import (CORS)

GitHub Pages cannot fetch most third-party recipe sites directly. To use **Recipe page URL** in the add-recipe modal, deploy the optional worker in [`workers/recipe-fetch-proxy.js`](workers/recipe-fetch-proxy.js) to **Cloudflare Workers** (or similar), then paste the worker’s **base URL** (e.g. `https://your-worker.workers.dev`) into the modal’s proxy field and click **Save proxy**. The app calls `GET {proxy}?url={encoded recipe URL}` and sends the returned HTML through Gemini.

## Index schema (`claude_index`)

Each index entry is shaped like:

```json
{
  "id": "recipe-slug",
  "name": "Recipe Name",
  "cat": "Meat & Poultry",
  "cui": "Greek",
  "protein": ["chicken"],
  "tags": ["gluten-free", "high-protein"],
  "ing": ["Chicken thigh", "Lemon", "Garlic"]
}
```

Counts in the HTML hero update from loaded data; README stats are illustrative — regenerate from your shards if you need exact numbers.

## Claude / search

Add `claude_index/` to a Claude Project knowledge base, then ask things like: “Search my library for Mediterranean chicken” or “Gluten-free pork that scales to 80 pax.”

## Cursor / agents

See [.cursor/skills/kitchen-library/SKILL.md](.cursor/skills/kitchen-library/SKILL.md) for layout, storage keys, and workflow notes.
