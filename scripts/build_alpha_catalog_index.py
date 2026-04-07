#!/usr/bin/env python3
"""
Build alpha_catalog/*.json — same compact schema as claude_index, split like alpha/.

Each row is taken from claude_index for that id (names + fields match recipe_detail
letter routing). Full alpha/*.json only defines which ids sit in which letter file.

Regenerate after alpha/ or claude_index/ change:

  python3 scripts/build_alpha_catalog_index.py
  python3 scripts/build_pantry_shard_hay_index.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "alpha" / "index.json"
CLAUDE_DIR = ROOT / "claude_index"
OUT_DIR = ROOT / "alpha_catalog"

# Must match index.html legacy list / recipe_pipeline_lib.INDEX_FILES
CLAUDE_SHARDS = [
    "claude_index_01_1-B.json",
    "claude_index_02_B-C.json",
    "claude_index_03_C.json",
    "claude_index_04_C.json",
    "claude_index_05_C-F.json",
    "claude_index_06_F-G.json",
    "claude_index_07_G-H.json",
    "claude_index_08_H-L.json",
    "claude_index_09_L-N.json",
    "claude_index_10_N-P.json",
    "claude_index_11_P-R.json",
    "claude_index_12_R-S.json",
    "claude_index_13_S.json",
    "claude_index_14_S-T.json",
    "claude_index_15_T-Z.json",
]


def load_claude_by_id() -> dict[str, dict]:
    out: dict[str, dict] = {}
    for name in CLAUDE_SHARDS:
        path = CLAUDE_DIR / name
        if not path.is_file():
            print("WARN missing claude shard", path, file=sys.stderr)
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for r in data.get("recipes") or []:
            if isinstance(r, dict) and r.get("id"):
                rid = str(r["id"])
                out[rid] = {k: v for k, v in r.items()}
    return out


def main() -> int:
    if not INDEX_PATH.is_file():
        print("Missing", INDEX_PATH, file=sys.stderr)
        return 1

    claude_by_id = load_claude_by_id()
    if not claude_by_id:
        print("No claude_index recipes loaded", file=sys.stderr)
        return 1

    meta = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    if not isinstance(meta, dict):
        print("Bad alpha/index.json shape", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ordered: list[str] = []
    missing = 0
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
        recipes: list[dict] = []
        for r in data:
            if not isinstance(r, dict) or not r.get("id"):
                continue
            rid = str(r["id"])
            row = claude_by_id.get(rid)
            if row is None:
                missing += 1
                print("WARN alpha id not in claude_index", rid, file=sys.stderr)
                continue
            recipes.append(row)
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
    print(
        "Wrote",
        len(ordered),
        "shards + manifest.json →",
        OUT_DIR,
        f"({missing} alpha ids skipped — not in claude_index)" if missing else "",
    )
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
