# Agents

Personal **Kuschi Kitchen Library** (GitHub Pages, public repo).

1. Read [.cursor/skills/kitchen-library/SKILL.md](.cursor/skills/kitchen-library/SKILL.md) for data layout, user-recipe storage, workflow, **ship-after-change** checklist, and **“Aroma modal data — when to shard further”** (apply that escalation yourself when thresholds are hit). **Recipe catalog SSOT:** `recipe_detail/`; after bulk edits run `python3 scripts/rebuild_catalog_from_detail.py` so `claude_index/`, `alpha_catalog/`, and pantry hay stay aligned.
2. Read [.cursor/skills/big-static-data-frontend/SKILL.md](.cursor/skills/big-static-data-frontend/SKILL.md) when changing **large static JSON**, **sharding**, **Pantry-style routing**, or **client-side catalog performance** on GitHub Pages.
3. Follow `.cursor/rules/ship-after-change.mdc` (test → commit → push) and `.cursor/rules/git-workflow.mdc` (branches, Conventional Commits).
4. Follow `.cursor/rules/token-efficiency.mdc` to limit **LLM context** usage (discovery, large JSON/HTML, tool output).
5. Match existing HTML theme ([index.html](index.html)) per `theme.mdc`.

## Browser verification (agents)

When using **Cursor’s browser MCP** or similar automation to smoke-test pages:

- **`file:///…`** — Use an absolute path, e.g. `file:///Users/you/recipelibrary-1/riviera.html`. Handy when the tool’s browser can read your disk. **Limitations:** `fetch()` for JSON (e.g. `riviera_data/builtins.json`, recipe shards) and **service workers** often behave differently than on GitHub Pages; not a full fidelity check.
- **`http://localhost` / `127.0.0.1`** — From the repo root run e.g. `python3 -m http.server 8765` and open `http://localhost:8765/riviera.html`. **Good** for same-origin `fetch` and SW. **Note:** Some remote or sandboxed browser tools **cannot** reach your machine’s localhost; if navigation fails, that’s an environment limit, not necessarily the site.
- **Production** — Testing the live **GitHub Pages** URL matches what users get.

Prefer **local static server** or **Pages** when verifying data load, modals, and search; use **`file://`** only for quick layout/DOM checks when it works in your setup.
