#!/usr/bin/env python3
"""
Split recipe_detail/detail_{L}.json into detail_{L}_{bucket}.json files.

Bucket = hash(recipe id) % DETAIL_BUCKET_COUNT (FNV-1a 32-bit; must match index.html).
Letter L = first ASCII letter of compact index `name` (matches Kitchen buildRecipeIndex);
falls back to detail recipe name if id is missing from claude_index.

Removes monolithic detail_A.json … detail_Z.json after writing sub-shards.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recipe_pipeline_lib import (  # noqa: E402
    ASCII_AZ,
    DETAIL_BUCKET_COUNT,
    DETAIL_SUBSHARD_RE,
    RECIPE_DETAIL,
    detail_bucket_from_id,
    detail_subshard_filename,
    letter_from_name,
    load_all_detail_recipes,
    load_index_id_to_display_name,
    save_detail_file,
)


def load_monolithic_recipes() -> dict[str, dict]:
    """Read legacy detail_{letter}.json only (before sub-shard layout)."""
    out: dict[str, dict] = {}
    for letter in ASCII_AZ:
        p = RECIPE_DETAIL / f"detail_{letter}.json"
        if not p.is_file():
            continue
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            for r in data:
                if isinstance(r, dict) and r.get("id") is not None:
                    out[str(r["id"])] = r
        elif isinstance(data, dict):
            for v in data.values():
                if isinstance(v, dict) and v.get("id") is not None:
                    out[str(v["id"])] = v
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Repartition recipe_detail into letter+bucket sub-shards")
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Print counts only; do not write or delete files",
    )
    args = ap.parse_args()

    all_recipes = load_monolithic_recipes()
    if not all_recipes:
        all_recipes = load_all_detail_recipes()
    if not all_recipes:
        print("ERROR: No recipes found in detail shards.", file=sys.stderr)
        return 1

    idx_name = load_index_id_to_display_name()

    # letter -> bucket -> id -> recipe
    buckets: dict[str, list[dict]] = {L: [{} for _ in range(DETAIL_BUCKET_COUNT)] for L in ASCII_AZ}

    for rid, recipe in all_recipes.items():
        nm = idx_name.get(rid) or recipe.get("name") or ""
        L = letter_from_name(nm)
        b = detail_bucket_from_id(rid)
        buckets[L][b][rid] = recipe

    if args.dry_run:
        for L in ASCII_AZ:
            for b, m in enumerate(buckets[L]):
                n = len(m)
                if n:
                    print(f"{detail_subshard_filename(L, b)}: {n} recipes")
        print(f"Total recipes: {len(all_recipes)}")
        return 0

    for p in RECIPE_DETAIL.glob("detail_*.json"):
        if DETAIL_SUBSHARD_RE.match(p.name):
            p.unlink()

    written = 0
    for L in ASCII_AZ:
        for b, m in enumerate(buckets[L]):
            if not m:
                continue
            path = RECIPE_DETAIL / detail_subshard_filename(L, b)
            save_detail_file(path, m, compact=True)
            written += 1
            print(f"Wrote {path.name} ({len(m)} recipes)")

    removed = 0
    for letter in ASCII_AZ:
        leg = RECIPE_DETAIL / f"detail_{letter}.json"
        if leg.is_file():
            leg.unlink()
            removed += 1
            print(f"Removed monolithic {leg.name}")

    print(f"Done: {written} sub-shard files, removed {removed} monoliths, {len(all_recipes)} recipes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
