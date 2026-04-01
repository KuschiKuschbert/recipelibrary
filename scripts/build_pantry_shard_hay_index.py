#!/usr/bin/env python3
"""
Build pantry_data/shard_hay_index.json — per-shard lowercase word haystacks for token routing.

Pantry search can fetch only shards whose hay contains at least one user token (substring),
matching the browser's scoreRecipe() haystack behavior for whole tokens from the textarea.

Regenerate when claude_index shards change:
  python3 scripts/build_pantry_shard_hay_index.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARDS_DIR = ROOT / "claude_index"
OUT_PATH = ROOT / "pantry_data" / "shard_hay_index.json"

SHARD_GLOB = "claude_index_*.json"


def norm_words(s: str) -> list[str]:
    s = re.sub(r"[^a-z0-9\s]", " ", (s or "").lower())
    return [w for w in s.split() if len(w) > 2]


def main() -> int:
    if not SHARDS_DIR.is_dir():
        print("Missing", SHARDS_DIR, file=sys.stderr)
        return 1

    files = sorted(p.name for p in SHARDS_DIR.glob(SHARD_GLOB) if p.suffix == ".json")
    if not files:
        print("No shards in", SHARDS_DIR, file=sys.stderr)
        return 1

    shards: dict[str, str] = {}
    for name in files:
        path = SHARDS_DIR / name
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
