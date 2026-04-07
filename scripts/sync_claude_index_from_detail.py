#!/usr/bin/env python3
"""
Update claude_index compact entries from recipe_detail for given ids (or all index ids).

Does not move recipes between index shards — updates the existing object in the shard
that already holds that id (correct for English titles and body-only translation).

Run after translate_recipes.py so name, cat, cui, ing, tags, protein match detail.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recipe_pipeline_lib import (  # noqa: E402
    INDEX_FILES,
    CLAUDE_INDEX,
    build_id_to_detail_letter,
    build_index_id_locations,
    detail_to_index_entry,
    load_all_detail_recipes,
    load_detail_recipes_subset,
    load_index_shard,
    save_index_shard,
)


def load_ids_from_jsonl(path: Path) -> list[str]:
    ids: list[str] = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            ids.append(str(row["id"]))
    return ids


def load_all_index_ids() -> list[str]:
    ids: list[str] = []
    for name in INDEX_FILES:
        p = CLAUDE_INDEX / name
        if not p.is_file():
            continue
        data = load_index_shard(p)
        for r in data.get("recipes") or []:
            if r and r.get("id"):
                ids.append(str(r["id"]))
    return ids


def main() -> int:
    ap = argparse.ArgumentParser(description="Sync claude_index from recipe_detail")
    ap.add_argument(
        "--ids-from",
        type=Path,
        help="JSONL file with id field per line (e.g. translation_candidates.jsonl)",
    )
    ap.add_argument(
        "--ids",
        type=str,
        default="",
        help="Comma-separated ids",
    )
    ap.add_argument(
        "--all-in-index",
        action="store_true",
        help="Sync every id that appears in claude_index (slow; large write set)",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Print counts only; do not write shards",
    )
    args = ap.parse_args()

    if args.all_in_index:
        target = load_all_index_ids()
    elif args.ids_from and args.ids_from.is_file():
        target = load_ids_from_jsonl(args.ids_from)
    elif args.ids.strip():
        target = [x.strip() for x in args.ids.split(",") if x.strip()]
    else:
        print("ERROR: Provide --all-in-index, --ids-from, or --ids", file=sys.stderr)
        return 1

    if args.all_in_index:
        detail = load_all_detail_recipes()
    else:
        detail = load_detail_recipes_subset(set(target))
    id_to_letter = build_id_to_detail_letter()
    loc_map = build_index_id_locations()
    shard_cache: dict[Path, dict] = {}
    touched_paths: set[Path] = set()
    missing_detail: list[str] = []
    missing_index: list[str] = []

    for rid in target:
        loc = loc_map.get(rid)
        if not loc:
            missing_index.append(rid)
            continue
        path, idx = loc
        drec = detail.get(rid)
        if not drec:
            missing_detail.append(rid)
            continue
        if path not in shard_cache:
            shard_cache[path] = load_index_shard(path)
        shard = shard_cache[path]
        new_entry = detail_to_index_entry(
            drec, router_letter=id_to_letter.get(rid)
        )
        old = shard["recipes"][idx]
        new_entry["id"] = old.get("id") or new_entry.get("id")
        shard["recipes"][idx] = new_entry
        touched_paths.add(path)

    if missing_index:
        print(f"WARN: {len(missing_index)} id(s) not in claude_index", file=sys.stderr)
    if missing_detail:
        print(f"WARN: {len(missing_detail)} id(s) not in recipe_detail", file=sys.stderr)

    if args.dry_run:
        print(f"Would update {len(touched_paths)} index shard file(s) for {len(target)} target id(s)")
        return 0

    for path in sorted(touched_paths, key=lambda p: p.name):
        save_index_shard(path, shard_cache[path], compact=True)
        print(f"Wrote {path.name}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
