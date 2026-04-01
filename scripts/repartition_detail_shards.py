#!/usr/bin/env python3
"""
Rebuild recipe_detail/detail_A.json … detail_Z.json from all current shards.

Assigns each recipe to detail_{L}.json where L is the first ASCII letter of name,
or Z if none (matches index.html / check-recipe-shards.py).

Use after translate_recipes.py when translated names change first-letter buckets.
Output format: object maps keyed by recipe id (same as existing shards).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recipe_pipeline_lib import (  # noqa: E402
    ASCII_AZ,
    RECIPE_DETAIL,
    letter_from_name,
    load_all_detail_recipes,
    load_index_id_to_display_name,
    save_detail_file,
)


def main() -> int:
    ap = argparse.ArgumentParser(description="Repartition recipe_detail/*.json by name letter")
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Print bucket counts only; do not write files",
    )
    ap.add_argument(
        "--empty-delete",
        action="store_true",
        help="Remove detail_*.json files that would be empty (default: write {})",
    )
    args = ap.parse_args()

    all_recipes = load_all_detail_recipes()
    idx_name = load_index_id_to_display_name()
    buckets: dict[str, dict] = {L: {} for L in ASCII_AZ}

    for rid, recipe in all_recipes.items():
        nm = idx_name.get(rid) or recipe.get("name") or ""
        L = letter_from_name(nm)
        buckets[L][rid] = recipe

    if args.dry_run:
        for L in ASCII_AZ:
            n = len(buckets[L])
            if n:
                print(f"detail_{L}.json: {n} recipes")
        print(f"Total recipes: {len(all_recipes)}")
        return 0

    for L in ASCII_AZ:
        path = RECIPE_DETAIL / f"detail_{L}.json"
        data = buckets[L]
        if not data and args.empty_delete and path.is_file():
            path.unlink()
            print(f"Removed empty {path.name}")
            continue
        save_detail_file(path, data, compact=True)
        print(f"Wrote {path.name} ({len(data)} recipes)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
