#!/usr/bin/env python3
"""
Merge recipe_detail/detail_*.json shards whose filename suffix is not exactly
one ASCII A–Z into the correct detail_[A-Z].json buckets (letter from first
ASCII a-zA-Z in recipe name, else Z). Matches Kitchen index.html behavior.

Removes source shard files after a successful merge. Skips ids already present
in the target (keeps existing).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
RECIPE_DETAIL = REPO_ROOT / "recipe_detail"

ASCII_AZ = set(chr(c) for c in range(ord("A"), ord("Z") + 1))


def letter_from_name(name: str | None) -> str:
    if not name:
        return "Z"
    for c in name:
        if ("a" <= c <= "z") or ("A" <= c <= "Z"):
            return c.upper()
    return "Z"


def recipes_from_payload(data) -> list[dict]:
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict) and x.get("id")]
    if isinstance(data, dict):
        return [v for v in data.values() if isinstance(v, dict) and v.get("id")]
    return []


def as_id_map(data) -> dict[str, dict]:
    """Normalize to id -> recipe object."""
    if isinstance(data, dict) and data:
        first = next(iter(data.values()), None)
        if isinstance(first, dict) and first.get("id") is not None:
            out = {}
            for k, v in data.items():
                if isinstance(v, dict) and v.get("id"):
                    out[str(v["id"])] = v
            return out
    if isinstance(data, list):
        return {str(r["id"]): r for r in data if isinstance(r, dict) and r.get("id")}
    return {}


def main() -> int:
    dry = "--dry-run" in sys.argv
    targets_touched: set[str] = set()
    merged = 0
    skipped_dup = 0
    sources_removed = 0

    orphan_files = []
    for p in sorted(RECIPE_DETAIL.glob("detail_*.json")):
        suf = p.name[len("detail_") : -len(".json")]
        if len(suf) == 1 and suf in ASCII_AZ:
            continue
        orphan_files.append(p)

    if not orphan_files:
        print("Nothing to merge (no non–A–Z detail shards).")
        return 0

    # Load targets lazily
    target_maps: dict[str, dict[str, dict]] = {}

    def get_target(letter: str) -> dict[str, dict]:
        if letter not in target_maps:
            path = RECIPE_DETAIL / f"detail_{letter}.json"
            if not path.is_file():
                raise SystemExit(f"Missing target {path.name} — cannot merge.")
            with open(path, encoding="utf-8") as f:
                target_maps[letter] = as_id_map(json.load(f))
        return target_maps[letter]

    for src in orphan_files:
        with open(src, encoding="utf-8") as f:
            payload = json.load(f)
        items = recipes_from_payload(payload)
        print(f"{src.name}: {len(items)} recipe(s)")
        for r in items:
            rid = str(r["id"])
            letter = letter_from_name(r.get("name"))
            tgt = get_target(letter)
            if rid in tgt:
                skipped_dup += 1
                continue
            tgt[rid] = r
            merged += 1
            targets_touched.add(letter)
        if not dry:
            src.unlink()
            sources_removed += 1

    for letter in sorted(targets_touched):
        path = RECIPE_DETAIL / f"detail_{letter}.json"
        data = target_maps[letter]
        if dry:
            print(f"[dry-run] would write {path.name} ({len(data)} recipes)")
            continue
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        print(f"Wrote {path.name} ({len(data)} recipes)")

    print(f"Done: merged {merged} new ids, skipped {skipped_dup} duplicates, removed {sources_removed} orphan files.")
    if dry:
        print("(dry-run: no files written or deleted)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
