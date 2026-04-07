#!/usr/bin/env python3
"""
Build pantry_data/shard_hay_index.json — per-shard lowercase word haystacks for token routing.

Uses **alpha_catalog/manifest.json** `files` (same list as index.html / pantry.html) — not a
directory glob — so hay keys always match fetched catalog parts.

Pantry search can fetch only shards whose hay contains at least one user token (substring),
matching the browser's scoreRecipe() haystack behavior for whole tokens from the textarea.

Regenerate when alpha_catalog changes (after rebuild_catalog_from_detail.py):
  python3 scripts/build_pantry_shard_hay_index.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARDS_DIR = ROOT / "alpha_catalog"
MANIFEST_PATH = SHARDS_DIR / "manifest.json"
OUT_PATH = ROOT / "pantry_data" / "shard_hay_index.json"


def norm_words(s: str) -> list[str]:
    s = re.sub(r"[^a-z0-9\s]", " ", (s or "").lower())
    return [w for w in s.split() if len(w) > 2]


def load_manifest_files() -> list[str]:
    if not MANIFEST_PATH.is_file():
        return []
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    files = data.get("files")
    if not isinstance(files, list) or not files:
        return []
    out: list[str] = []
    for x in files:
        if isinstance(x, str) and x.strip() and x != "manifest.json":
            out.append(x)
    return out


def main() -> int:
    if not SHARDS_DIR.is_dir():
        print("Missing", SHARDS_DIR, file=sys.stderr)
        return 1

    files = load_manifest_files()
    if not files:
        print(
            "ERROR: alpha_catalog/manifest.json missing or has no valid files[]",
            file=sys.stderr,
        )
        return 1

    shards: dict[str, str] = {}
    for name in files:
        path = SHARDS_DIR / name
        if not path.is_file():
            print(f"ERROR: manifest lists missing file: {name}", file=sys.stderr)
            return 1
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        toks: set[str] = set()
        for r in data.get("recipes") or []:
            for w in norm_words(str(r.get("name") or "")):
                toks.add(w)
            for ing in r.get("ing") or []:
                for w in norm_words(str(ing)):
                    toks.add(w)
        # Space-padded blob so substring checks align with recipe text matching.
        hay = " " + " ".join(sorted(toks)) + " "
        shards[name] = hay

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {"v": 1, "shards": shards}
    OUT_PATH.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    raw = OUT_PATH.read_bytes()
    print("Wrote", OUT_PATH, "bytes", len(raw), "shards", len(shards))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
