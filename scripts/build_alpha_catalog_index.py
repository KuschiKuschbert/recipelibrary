#!/usr/bin/env python3
"""
Build alpha_catalog/*.json — compact rows matching claude_index schema from full alpha/*.json.

The browser loads these (~similar total size to claude_index/) instead of full alpha shards (~93MB).
Regenerate after alpha letter files change:

  python3 scripts/build_alpha_catalog_index.py
  python3 scripts/build_pantry_shard_hay_index.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "alpha" / "index.json"
OUT_DIR = ROOT / "alpha_catalog"


def compact_row(r: dict) -> dict:
    ings = r.get("ingredients") or []
    ing_strs: list[str] = []
    for i in ings:
        if isinstance(i, str):
            ing_strs.append(i)
            continue
        if not isinstance(i, dict):
            ing_strs.append(str(i))
            continue
        parts = [i.get("qty"), i.get("unit"), i.get("item"), i.get("prep")]
        s = " ".join(str(p) for p in parts if p).strip()
        ing_strs.append(s or str(i.get("item") or ""))

    prot = r.get("protein")
    if isinstance(prot, list):
        protein = prot
    elif prot:
        protein = [prot]
    else:
        protein = []

    return {
        "id": r.get("id"),
        "name": r.get("name") or "",
        "cat": r.get("category") or "",
        "cui": r.get("cuisine") or "",
        "protein": protein,
        "tags": list(r.get("dietary_tags") or []),
        "ing": ing_strs,
    }


def main() -> int:
    if not INDEX_PATH.is_file():
        print("Missing", INDEX_PATH, file=sys.stderr)
        return 1

    meta = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    if not isinstance(meta, dict):
        print("Bad alpha/index.json shape", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ordered: list[str] = []
    for _key, entry in meta.items():
        if not isinstance(entry, dict):
            continue
        rel = entry.get("file") or ""
        if not rel.startswith("alpha/"):
            continue
        bn = rel.split("/", 1)[-1]
        src = ROOT / rel
        if not src.is_file():
            print("WARN missing source", src, file=sys.stderr)
            continue
        data = json.loads(src.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            print("WARN skip non-list", src, file=sys.stderr)
            continue
        recipes = [compact_row(r) for r in data if isinstance(r, dict) and r.get("id")]
        out_path = OUT_DIR / bn
        out_path.write_text(
            json.dumps({"recipes": recipes}, separators=(",", ":")),
            encoding="utf-8",
        )
        ordered.append(bn)

    manifest = {"v": 1, "files": ordered}
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(manifest, separators=(",", ":")),
        encoding="utf-8",
    )
    print("Wrote", len(ordered), "shards + manifest.json →", OUT_DIR)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
