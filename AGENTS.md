# Agents

Personal **Kuschi Kitchen Library** (GitHub Pages, public repo).

1. Read [.cursor/skills/kitchen-library/SKILL.md](.cursor/skills/kitchen-library/SKILL.md) for data layout, user-recipe storage, workflow, **ship-after-change** checklist, and **“Aroma modal data — when to shard further”** (apply that escalation yourself when thresholds are hit). **Recipe catalog SSOT:** `recipe_detail/`; after bulk edits run `python3 scripts/rebuild_catalog_from_detail.py` so `claude_index/`, `alpha_catalog/`, and pantry hay stay aligned.
2. Read [.cursor/skills/big-static-data-frontend/SKILL.md](.cursor/skills/big-static-data-frontend/SKILL.md) when changing **large static JSON**, **sharding**, **Pantry-style routing**, or **client-side catalog performance** on GitHub Pages.
3. Follow `.cursor/rules/ship-after-change.mdc` (test → commit → push) and `.cursor/rules/git-workflow.mdc` (branches, Conventional Commits).
4. Follow **`~/.cursor/rules/token-efficiency.mdc`** (global Cursor rule) to limit **LLM context** usage (discovery, large JSON/HTML, tool output).
5. Match existing HTML theme ([index.html](index.html)) per `theme.mdc`.

## Global culinary routing

- Treat `kitchen-council` as a **global default skill** for this workspace whenever the user asks anything kitchen/food related (recipes, flavour, prep, technique, menu ideas, service feasibility, ingredient swaps, "what's missing", "improve/elevate/fix this dish", etc.).
- Auto-activate the skill even when the user does **not** explicitly write `@kitchen-council`.
- Use the skill's tiering/output rules as the response contract for culinary questions.
- Only skip `kitchen-council` when the user clearly requests non-culinary technical work (code/data/site operations) with no food decision involved.
- **Riviera locked-recipe qualifier:** retrieval or scaling of an existing `LOCKED` Riviera recipe must search the canonical Riviera/GitHub record and use it as written. Do not redesign it through Epicure or Kitchen Council unless the user explicitly requests an improvement.
- For a new Riviera recipe or material improvement, search Riviera/GitHub first, then use Epicure pairing evidence, then Kitchen Council practicality review. Publish the result as `TRIAL ONLY`; promotion to `ACTIVE WORKING` requires a kitchen trial and promotion to `LOCKED` requires explicit approval.

## Epicure MCP pairing evidence

- The project-scoped `epicure` MCP is configured in [`.codex/config.toml`](.codex/config.toml). When it is available, call `find_pairings` on the primary ingredient(s) before designing, creating, suggesting, or substantially reworking a recipe or dish, then use the result as evidence within the `kitchen-council` workflow.
- Use Epicure for ingredient co-occurrence, pairing, cuisine-direction, and flavour-space exploration. Do not treat embedding similarity as authority for food safety, allergen safety, nutrition, authenticity, or service feasibility.
- If the remote MCP is unavailable, continue with `kitchen-council`; Epicure is an enhancement, not a blocker.

## Canonical clone (kitchen library)

**Primary working copy:** this repo (`recipelibrary-1` on disk). Other paths such as `~/recipelibrary` or `~/Desktop/recipelibrary` may be older duplicates—confirm `git remote -v` and path before large edits or agent-wide search so work is not applied to the wrong tree.

## Riviera authority and publishing

**GitHub recipe-data bundle:** [riviera_sources/current/Riviera_Source_Of_Truth_2026-07-08.md](riviera_sources/current/Riviera_Source_Of_Truth_2026-07-08.md).
**Canonical structured Riviera recipe catalog:** [riviera_sources/current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json](riviera_sources/current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json).

Riviera authority is split by domain:

- **Google Drive** is the editable master for operational SOPs, package rules, live orders, approvals, prices, stock, delivery requirements, and archive records.
- **GitHub** is the canonical structured recipe database and the source for the searchable Riviera recipe page. Edit the structured recipe catalog first for built-in recipe changes, then run `python3 scripts/sync_riviera_recipe_catalog.py --write`; `python3 scripts/sync_riviera_recipe_catalog.py --check` must pass before PDF generation or shipping.
- **The ChatGPT Riviera Project** is the daily kitchen driver. Its knowledge files are read-optimised published releases, not independently edited master copies. A correction made in conversation is not a completed source update until the affected Drive/GitHub source is updated, the ChatGPT bundle is republished, and all targets are verified.
- The 23 files in [riviera_sources/chatgpt_project_sources_2026-07-08/](riviera_sources/chatgpt_project_sources_2026-07-08/) are historical provenance from the verified 2026-07-08 ChatGPT Project snapshot. They are not the current operational master.
- Apply [riviera_sources/current/Riviera_Tapas_House_Standards_Overlay_2026-07-08.md](riviera_sources/current/Riviera_Tapas_House_Standards_Overlay_2026-07-08.md) to the 16 recipes it names. Later approved standards live in the structured catalog and generated current-standards additions file.

Before promoting a correction, classify it as `PERMANENT RIVIERA STANDARD`, `PACKAGE-SPECIFIC STANDARD`, `RECIPE-SPECIFIC STANDARD`, `EVENT-SPECIFIC INSTRUCTION`, or `WEEK-SPECIFIC INSTRUCTION`. If scope is unclear, stop and ask. Record a change receipt with the previous rule, new rule, scope, effective/expiry dates where applicable, affected records, and Drive/GitHub/ChatGPT publication status. Temporary event/week rules must never be written into a permanent supplier or kitchen SOP.

Treat `riviera_data/builtins.json` and generated PDFs as recipe-data representations. Treat package JSON as a site representation that must be reconciled to the approved Drive package master before publication. Use `python3 scripts/riviera_sync.py verify --remote` for the repository recipe-data chain and historical-audit checks. Rebuild that deterministic chain with `python3 scripts/riviera_sync.py rebuild`.

Follow [docs/riviera/RIVIERA_SYNC_RUNBOOK.md](docs/riviera/RIVIERA_SYNC_RUNBOOK.md) for source intake, change receipts, cross-system release order, historical Project audits, and recovery.

## Browser verification (agents)

When using **Cursor’s browser MCP** or similar automation to smoke-test pages:

- **`file:///…`** — Use an absolute path, e.g. `file:///Users/you/recipelibrary-1/riviera.html`. Handy when the tool’s browser can read your disk. **Limitations:** `fetch()` for JSON (e.g. `riviera_data/builtins.json`, recipe shards) and **service workers** often behave differently than on GitHub Pages; not a full fidelity check.
- **`http://localhost` / `127.0.0.1`** — From the repo root run e.g. `python3 -m http.server 8765` and open `http://localhost:8765/riviera.html`. **Good** for same-origin `fetch` and SW. **Note:** Some remote or sandboxed browser tools **cannot** reach your machine’s localhost; if navigation fails, that’s an environment limit, not necessarily the site.
- **Production** — Testing the live **GitHub Pages** URL matches what users get.

Prefer **local static server** or **Pages** when verifying data load, modals, and search; use **`file://`** only for quick layout/DOM checks when it works in your setup.
