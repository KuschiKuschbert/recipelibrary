#!/usr/bin/env python3
"""
Single rebuild path: recipe_detail/ → claude_index/ + alpha_catalog/ + pantry hay.

- **Source of truth:** full recipes in recipe_detail/*.json only.
- **claude_index:** compact rows (15 legacy shards, deduped by id, sorted by id).
- **alpha_catalog:** same compact rows split into letter buckets; bucket list comes from
  alpha/index.json only (no recipe bodies required under alpha/).
- Then runs build_pantry_shard_hay_index.py.

Run after editing recipe_detail:

  python3 scripts/rebuild_catalog_from_detail.py
"""
from __future__ import annotations

import json
import subprocess
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from recipe_pipeline_lib import (  # noqa: E402
    CLAUDE_INDEX,
    INDEX_FILES,
    build_id_to_detail_letter,
    build_index_id_locations,
    detail_to_index_entry,
    letter_from_name,
    load_all_detail_recipes,
    save_index_shard,
)

ALPHA_INDEX = ROOT / "alpha" / "index.json"
OUT_CATALOG = ROOT / "alpha_catalog"
PANTRY_SCRIPT = ROOT / "scripts" / "build_pantry_shard_hay_index.py"


def load_alpha_bucket_map() -> tuple[list[str], dict[str, str]]:
    """Ordered shard basenames + stem ('A', '#', 'İ') → 'A.json'."""
    meta = json.loads(ALPHA_INDEX.read_text(encoding="utf-8"))
    ordered: list[str] = []
    stem_to_bn: dict[str, str] = {}
    if not isinstance(meta, dict):
        raise ValueError("alpha/index.json must be an object")
    for _key, entry in meta.items():
        if not isinstance(entry, dict):
            continue
        rel = entry.get("file") or ""
        if not rel.startswith("alpha/"):
            continue
        bn = rel.split("/", 1)[-1]
        ordered.append(bn)
        stem = Path(bn).stem
        stem_to_bn[stem] = bn
    if not ordered or "#" not in stem_to_bn:
        raise ValueError("alpha/index.json: need at least #.json in manifest")
    return ordered, stem_to_bn


def bucket_basename(name: str | None, stem_to_bn: dict[str, str]) -> str:
    s = unicodedata.normalize("NFC", (name or "").strip())
    for ch in s:
        if not ch.isalpha():
            continue
        if ch in stem_to_bn:
            return stem_to_bn[ch]
        if len(ch) == 1 and ch.isascii():
            u = ch.upper()
            if u in stem_to_bn:
                return stem_to_bn[u]
        u2 = ch.upper()
        if len(u2) == 1 and u2 in stem_to_bn:
            return stem_to_bn[u2]
        if len(u2) > 1 and u2[0] in stem_to_bn:
            return stem_to_bn[u2[0]]
        return stem_to_bn["#"]
    return stem_to_bn["#"]


def shard_sizes_15(total: int, n: int = 15) -> list[int]:
    base, rem = divmod(total, n)
    return [base + (1 if i < rem else 0) for i in range(n)]


def main() -> int:
    if not ALPHA_INDEX.is_file():
        print("Missing", ALPHA_INDEX, file=sys.stderr)
        return 1

    ordered_bn, stem_to_bn = load_alpha_bucket_map()

    detail = load_all_detail_recipes()
    if not detail:
        print("No recipes in recipe_detail/", file=sys.stderr)
        return 1

    id_to_letter = build_id_to_detail_letter()
    rows = []
    for rid in sorted(detail, key=str):
        rec = detail[rid]
        router = id_to_letter.get(rid) or letter_from_name(rec.get("name"))
        rows.append(detail_to_index_entry(rec, router_letter=router))
    n = len(rows)

    sizes = shard_sizes_15(n, len(INDEX_FILES))
    if len(sizes) != len(INDEX_FILES):
        print("INDEX_FILES length mismatch", file=sys.stderr)
        return 1

    offset = 0
    for i, name in enumerate(INDEX_FILES):
        chunk = rows[offset : offset + sizes[i]]
        offset += sizes[i]
        save_index_shard(CLAUDE_INDEX / name, {"recipes": chunk})
    print("Wrote", len(INDEX_FILES), "claude_index shards,", n, "unique recipes")

    buckets: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        bn = bucket_basename(row.get("name"), stem_to_bn)
        buckets[bn].append(row)
    for bn in buckets:
        buckets[bn].sort(key=lambda r: str(r.get("id") or ""))

    OUT_CATALOG.mkdir(parents=True, exist_ok=True)
    for bn in ordered_bn:
        recs = buckets.get(bn, [])
        (OUT_CATALOG / bn).write_text(
            json.dumps({"recipes": recs}, separators=(",", ":")),
            encoding="utf-8",
        )

    manifest = {"v": 1, "files": ordered_bn}
    (OUT_CATALOG / "manifest.json").write_text(
        json.dumps(manifest, separators=(",", ":")),
        encoding="utf-8",
    )
    print("Wrote", len(ordered_bn), "alpha_catalog shards + manifest.json")

    build_index_id_locations.cache_clear()

    r = subprocess.run(
        [sys.executable, str(PANTRY_SCRIPT)],
        cwd=str(ROOT),
        check=False,
    )
    if r.returncode != 0:
        print("WARN: build_pantry_shard_hay_index.py exited", r.returncode, file=sys.stderr)
        return r.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
