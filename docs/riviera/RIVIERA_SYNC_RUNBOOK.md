# Riviera Synchronization Runbook

## Refined goal

Keep every Riviera fact traceable to one Git commit and make drift fail visibly before shipping. The system is complete when:

1. GitHub is the only mutable authority.
2. The 23-source legacy ChatGPT Project snapshot is checksum-verifiable.
3. The July 8 overlay remains limited to its 16 house-standard recipes.
4. The merged SSOT, structured catalog, site built-ins, source-alignment rules, recipe standards, and legacy mirror artifacts pass one command.
5. `main` matches `origin/main`.
6. Active ChatGPT work uses the local project folder instead of editing a second Project copy.

## System design

| Layer | Owner | Write path | Check |
|---|---|---|---|
| Legacy Project snapshot | Git | `riviera_sources/chatgpt_project_sources_2026-07-08/` | Manifest bytes and SHA-256 |
| Tapas house overlay | Git | `riviera_sources/current/Riviera_Tapas_House_Standards_Overlay_2026-07-08.md` | Deterministic builder check |
| Built-in recipe authority | Git | Structured recipe catalog | Catalog-to-built-ins equality |
| Site/runtime data | Generator | `riviera_data/` | Schema and source-alignment audits |
| Recipe-card PDF | Generator | `output/pdf/` | Legacy mirror audit hash |
| Old ChatGPT Project | Read-only mirror | Manual replace-only boundary | Authenticated audit record |
| Active ChatGPT/Codex work | Local project | This repository | Git status and CI |

The uncomfortable truth is that bidirectional synchronization is not available here. OpenAI's [Projects documentation](https://learn.chatgpt.com/docs/projects) distinguishes ChatGPT Projects, which carry uploaded/connected context, from local projects that directly use a folder. The public API's “projects” endpoints are API Platform administration, not ChatGPT Project-source access. Automating the web UI would create a brittle second writer and silent conflict risk.

## Daily operation

Run before and after Riviera source or recipe work:

```bash
python3 scripts/riviera_sync.py status --remote
```

Edit only the repo authority. For built-in recipe changes, edit the structured catalog first. Then run:

```bash
python3 scripts/riviera_sync.py rebuild
python3 scripts/riviera_sync.py verify --remote
```

Use `python3 scripts/riviera_sync.py rebuild --include-pdf` only when the recipe-card PDF must be regenerated. A changed mirror artifact intentionally makes verification fail until the legacy Project audit is refreshed.

## Legacy Project import boundary

The old Project is not polled automatically. If it contains a correction that must survive:

1. Download or copy that single source into a staging folder outside the repository.
2. Compare it with the matching manifest entry and identify the exact changed rule.
3. Apply the correction to the Git authority in the correct canonical file.
4. Run rebuild and verification.
5. Commit and push the reviewed change.
6. Do not edit both copies or merge by “newest file wins.”

New Project source files require an explicit source-registry/manifest change and review. Missing, renamed, or additional sources are a stop condition, not an automatic merge.

## Legacy Project mirror boundary

Generate the exact upload set and checksums:

```bash
python3 scripts/riviera_sync.py mirror-manifest
```

If the old Project must remain usable, replace its five mirror artifacts with that exact set. Do not append duplicates. Then perform an authenticated read-only inventory/hash audit and commit a new dated `live_project_audit_YYYY-MM-DD.json`. Until that audit exists, the old Project is stale by design; the Git/local-project authority remains valid.

## CI and failure recovery

`.github/workflows/riviera-sync.yml` runs the non-mutating verification command on relevant pushes and pull requests.

| Failure | Recovery |
|---|---|
| Source checksum drift | Confirm the source change, update the snapshot/manifest intentionally, rebuild |
| Generated SSOT drift | Run `python3 scripts/build_riviera_source_of_truth.py --write` |
| Catalog/built-ins drift | Run `python3 scripts/sync_riviera_recipe_catalog.py --write` |
| Mirror artifact stale | Keep Git authoritative; replace legacy mirror files and refresh the audit |
| `main` behind/ahead | Reconcile Git normally; never use Project timestamps as merge authority |
| Service variant audit failure | Correct the canonical service rule or mark it explicitly as needing confirmation |

The 32 recipes without service-variant records remain a separate content-completeness backlog. They do not invalidate the verified source snapshot, but they must not be presented as confirmed service standards.
