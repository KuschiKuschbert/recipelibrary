#!/usr/bin/env python3
"""
Phase 3 prep — compare Menu Builder live_dish_card tabs to Riviera builtins + aliases.

Reads reports/reference_sheet_extract_full.json, extracts dish names per tab,
reports matched vs gap. Emits reports/workbook_dish_gaps.md.

Usage: python3 scripts/report_workbook_dish_gaps.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRACT = ROOT / "reports" / "reference_sheet_extract_full.json"
BUILTINS = ROOT / "riviera_data" / "builtins.json"
ALIASES = ROOT / "riviera_data" / "canonical_recipe_aliases.json"
REPORT = ROOT / "reports" / "workbook_dish_gaps.md"

CATERING_DISH_TABS = {
    "Breads", "Starters", "Oysters", "Salads", "Pizzas",
    "Lunch", "Chef Selection", "Italian Long Lunch",
    "Steaks + Grill", "Mains", "Sides", "Toppers",
    "Kids Meals", "Desserts",
}
SKIP_NAMES = {
    "the riviera", "sp", "menu item", "beef thingamajigs", "pork thingies",
    "kburger", "ksteak", "flap flaps", "chicken tiddies",
}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s.lower())).strip()


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def load_lookup() -> tuple[set[str], dict[str, str]]:
    builtins = json.loads(BUILTINS.read_text(encoding="utf-8"))
    alias_data = json.loads(ALIASES.read_text(encoding="utf-8"))

    names: set[str] = set()
    name_to_id: dict[str, str] = {}

    for r in builtins:
        rid = r["id"]
        name_to_id[rid] = rid
        for field in ("name", "label", "subtitle"):
            val = r.get(field)
            if val:
                names.add(norm(val))
                name_to_id[norm(val)] = rid
        for el in r.get("elements", []):
            names.add(norm(el))
            name_to_id[norm(el)] = rid
        names.add(norm(rid.replace("-", " ")))
        name_to_id[norm(rid.replace("-", " "))] = rid

    for block in alias_data.get("canonical_recipes", {}).values():
        cid = block.get("canonical_id", "")
        for alias in block.get("aliases", []):
            names.add(norm(alias))
            name_to_id[norm(alias)] = cid

    for alias, target in alias_data.get("alias_to_canonical", {}).items():
        names.add(norm(alias))
        canon = alias_data["canonical_recipes"].get(target, {})
        name_to_id[norm(alias)] = canon.get("canonical_id", target)

    for src, dst in alias_data.get("recipe_id_redirects", {}).items():
        if isinstance(dst, str):
            name_to_id[norm(src.replace("-", " "))] = dst

    return names, name_to_id


def extract_dish_names(rows: list[list]) -> list[str]:
    found: list[str] = []
    for row in rows:
        vals = [str(v).strip() if v is not None else "" for v in row]
        for i, v in enumerate(vals):
            if v == "Menu Item:" and i + 1 < len(vals):
                name = vals[i + 1].strip()
                if name:
                    found.append(name)
    return found


def match_dish(name: str, names: set[str], name_to_id: dict[str, str]) -> str | None:
    n = norm(name)
    if n in SKIP_NAMES or len(n) < 3:
        return None
    if n in names:
        return name_to_id.get(n)
    s = slug(name)
    if s in name_to_id:
        return name_to_id[s]
    # substring: builtin name contained in dish or vice versa
    for key, rid in name_to_id.items():
        if len(key) >= 6 and (key in n or n in key):
            return rid
    return None


def main() -> None:
    if not EXTRACT.is_file():
        sys.exit(f"Missing {EXTRACT}")

    names, name_to_id = load_lookup()
    data = json.loads(EXTRACT.read_text(encoding="utf-8"))

    rows_out: list[dict] = []
    for tab in sorted(CATERING_DISH_TABS):
        if tab not in data:
            continue
        dish_names = extract_dish_names(data[tab].get("all_rows", []))
        seen: set[str] = set()
        for dish in dish_names:
            key = norm(dish)
            if key in seen:
                continue
            seen.add(key)
            rid = match_dish(dish, names, name_to_id)
            rows_out.append({"tab": tab, "dish": dish, "recipe_id": rid, "matched": rid is not None})

    matched = sum(1 for r in rows_out if r["matched"])
    gaps = [r for r in rows_out if not r["matched"]]

    lines = [
        "# Workbook dish cards vs Riviera builtins",
        "",
        f"Tabs scanned: **{len(CATERING_DISH_TABS)}**",
        f"Unique dishes found: **{len(rows_out)}**",
        f"Matched: **{matched}** | Gaps: **{len(gaps)}**",
        "",
        "Gaps are mostly à la carte naming variants, demo rows, or dishes not yet in builtins.",
        "Catering package coverage is tracked separately in `package_recipe_coverage.md`.",
        "",
        "## Gaps",
        "",
        "| Tab | Dish |",
        "|---|---|",
    ]
    for r in gaps:
        lines.append(f"| {r['tab']} | {r['dish']} |")

    lines += ["", "## Matched", "", "| Tab | Dish | Recipe |", "|---|---|---|"]
    for r in rows_out:
        if r["matched"]:
            lines.append(f"| {r['tab']} | {r['dish']} | `{r['recipe_id']}` |")

    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {REPORT}")
    print(f"Matched: {matched} | Gaps: {len(gaps)}")


if __name__ == "__main__":
    main()
