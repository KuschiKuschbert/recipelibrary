#!/usr/bin/env python3
"""
Rebuild riviera_data/stocktake_catalog.json from a TSV export:
  Category, Item ID, Item Name, Brand, Unit, Par Level (tab-separated).

Usage:
  python3 scripts/rebuild_stocktake_catalog_from_tsv.py [path/to/source.tsv]
Default source: riviera_data/stocktake_par_levels.tsv

Zones: Freezer -> freezer, Cold Room -> coldroom, Dry Store -> drystore
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TSV = ROOT / "riviera_data" / "stocktake_par_levels.tsv"
OUT_JSON = ROOT / "riviera_data" / "stocktake_catalog.json"

ZONE_MAP = {
    "Freezer": "freezer",
    "Cold Room": "coldroom",
    "Dry Store": "drystore",
}


def norm_brand(s: str) -> str:
    s = (s or "").strip()
    if s in ("—", "–", "-", "Unknown", "unknown", ""):
        return ""
    return s


def norm_par(par: str) -> str:
    par = (par or "").strip()
    if not par:
        return ""
    # "2 that should have..." -> "2"
    m = re.match(r"^([\d.,~×/]+)", par)
    if m and len(par) > len(m.group(1)) + 1:
        tail = par[len(m.group(1)) :].strip()
        if tail and not tail[0].isdigit() and " " in tail:
            return m.group(1).rstrip(".")
    return par


def parse_tsv(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    rows: list[dict] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.lower().startswith("category\t"):
            continue
        parts = line.split("\t")
        if len(parts) < 6:
            parts = re.split(r"\t+", line)
        if len(parts) < 6:
            continue
        cat, iid, name, brand, unit, par = (
            parts[0].strip(),
            parts[1].strip(),
            parts[2].strip(),
            parts[3].strip(),
            parts[4].strip(),
            parts[5].strip(),
        )
        zone = ZONE_MAP.get(cat)
        if not zone:
            continue
        if not iid or not name:
            continue
        if par:
            par = norm_par(par)
        rows.append(
            {
                "id": iid,
                "name": name,
                "zone": zone,
                "category": cat,
                "brand": norm_brand(brand),
                "defaultQty": par,
                "defaultUom": unit,
            }
        )
    return rows


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_TSV
    if not src.is_file():
        print(f"Missing TSV: {src}", file=sys.stderr)
        sys.exit(1)
    data = parse_tsv(src)
    if not data:
        print("No rows parsed.", file=sys.stderr)
        sys.exit(1)
    OUT_JSON.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(data)} items -> {OUT_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
