#!/usr/bin/env python3
"""
Phase 2 — sync riviera_data/stocktake_par_levels.tsv from Menu Builder Stock List.

Reads reports/reference_sheet_extract_full.json (from parse_menu_builder.py).
- Fixes storage-zone mismatches (workbook is authoritative)
- Appends workbook-only stock items with new f/c/d IDs
- Emits reports/stock_workbook_sync.md

Usage:
  python3 scripts/sync_stock_from_workbook.py          # dry-run report only
  python3 scripts/sync_stock_from_workbook.py --apply  # write TSV + rebuild catalog
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRACT = ROOT / "reports" / "reference_sheet_extract_full.json"
TSV = ROOT / "riviera_data" / "stocktake_par_levels.tsv"
REPORT = ROOT / "reports" / "stock_workbook_sync.md"

ZONE_PREFIX = {"Freezer": "f", "Cold Room": "c", "Dry Store": "d"}


def norm(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", " ", s.lower().strip())
    return s.strip()


def norm_brand(s: str) -> str:
    s = (s or "").strip()
    if s in ("—", "–", "-", "", "None"):
        return "Unknown"
    return s


def format_unit(pack, uom: str) -> str:
    uom = (uom or "").strip()
    if pack is None or pack == "":
        return uom or "—"
    if isinstance(pack, float) and pack.is_integer():
        pack = int(pack)
    pack_s = str(pack).strip()
    if not uom:
        return pack_s
    u = uom.lower()
    if u in ("gm", "g"):
        return f"{pack_s} g"
    if u == "ml":
        return f"{pack_s} mL"
    if u in ("pc", "pcs", "ea"):
        return f"{pack_s} pc"
    return f"{pack_s} {uom}"


def load_workbook_stock() -> dict[str, dict]:
    if not EXTRACT.is_file():
        sys.exit(f"Missing {EXTRACT}. Run: python3 scripts/parse_menu_builder.py")
    data = json.loads(EXTRACT.read_text(encoding="utf-8"))
    rows = data.get("Stock List", {}).get("all_rows", [])
    out: dict[str, dict] = {}
    for row in rows[2:]:
        vals = [v if v is not None else "" for v in row]
        while len(vals) < 8:
            vals.append("")
        storage = str(vals[3]).strip()
        name = str(vals[4]).strip()
        if not name or name in ZONE_PREFIX:
            continue
        out[norm(name)] = {
            "name": name,
            "storage": storage,
            "brand": norm_brand(str(vals[2])),
            "unit": format_unit(vals[5], str(vals[7])),
        }
    return out


def load_tsv() -> list[list[str]]:
    lines: list[list[str]] = []
    for raw in TSV.read_text(encoding="utf-8").splitlines():
        if not raw.strip():
            continue
        lines.append(raw.rstrip("\n").split("\t"))
    return lines


def max_ids(rows: list[list[str]]) -> dict[str, int]:
    mx = {"f": 0, "c": 0, "d": 0}
    for parts in rows:
        if len(parts) < 2:
            continue
        m = re.match(r"^([fcd])(\d+)$", parts[1].strip(), re.I)
        if m:
            mx[m.group(1).lower()] = max(mx[m.group(1).lower()], int(m.group(2)))
    return mx


def next_id(storage: str, counters: dict[str, int]) -> str:
    pre = ZONE_PREFIX[storage]
    counters[pre] += 1
    return f"{pre}{counters[pre]:03d}"


def write_tsv(rows: list[list[str]]) -> None:
    TSV.write_text("\n".join("\t".join(p for p in row) for row in rows) + "\n", encoding="utf-8")


def rebuild_catalog() -> None:
    script = ROOT / "scripts" / "rebuild_stocktake_catalog_from_tsv.py"
    subprocess.run([sys.executable, str(script)], check=True, cwd=ROOT)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Write TSV and rebuild stocktake_catalog.json")
    args = ap.parse_args()

    wb = load_workbook_stock()
    rows = load_tsv()
    if not rows:
        sys.exit(f"Empty TSV: {TSV}")

    # header optional — data rows start with zone names
    data_rows = [r for r in rows if len(r) >= 6 and r[0] in ZONE_PREFIX]
    tsv_by_norm: dict[str, list[str]] = {norm(r[2]): r for r in data_rows}

    zone_fixes: list[tuple[str, str, str, str]] = []
    for key, wb_row in wb.items():
        if key not in tsv_by_norm:
            continue
        tsv_row = tsv_by_norm[key]
        if tsv_row[0] != wb_row["storage"]:
            zone_fixes.append((tsv_row[1], tsv_row[2], tsv_row[0], wb_row["storage"]))

    wb_only = sorted(
        [wb[k] for k in wb if k not in tsv_by_norm],
        key=lambda x: (x["storage"], x["name"]),
    )

    counters = max_ids(data_rows)
    additions: list[list[str]] = []
    for item in wb_only:
        iid = next_id(item["storage"], counters)
        additions.append(
            [item["storage"], iid, item["name"], item["brand"], item["unit"], "1"]
        )

    # Build report
    lines = [
        "# Stock List sync — Menu Builder → stocktake_par_levels.tsv",
        "",
        f"Workbook items parsed: **{len(wb)}**",
        f"TSV items before: **{len(data_rows)}**",
        f"Zone fixes: **{len(zone_fixes)}**",
        f"New rows: **{len(additions)}**",
        "",
        "## Zone fixes (workbook wins)",
        "",
        "| ID | Item | Was | Now |",
        "|---|---|---|---|",
    ]
    for iid, name, old, new in zone_fixes:
        lines.append(f"| `{iid}` | {name} | {old} | {new} |")

    lines += ["", "## New stock items", "", "| Zone | ID | Item | Brand | Unit |", "|---|---|---|---|---|"]
    for row in additions:
        lines.append(f"| {row[0]} | `{row[1]}` | {row[2]} | {row[3]} | {row[4]} |")

    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {REPORT}")
    print(f"Zone fixes: {len(zone_fixes)} | New rows: {len(additions)}")

    if not args.apply:
        print("Dry run only. Pass --apply to write TSV.")
        return

    fix_map = {iid: new for iid, _, _, new in zone_fixes}
    new_rows: list[list[str]] = []
    for parts in rows:
        if len(parts) >= 2 and parts[1] in fix_map:
            parts = parts.copy()
            parts[0] = fix_map[parts[1]]
        new_rows.append(parts)
    new_rows.extend(additions)
    write_tsv(new_rows)
    print(f"Updated {TSV} ({len(additions)} additions, {len(zone_fixes)} zone fixes)")
    rebuild_catalog()


if __name__ == "__main__":
    main()
