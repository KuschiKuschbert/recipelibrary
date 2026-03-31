#!/usr/bin/env python3
"""Flag umlauts / obvious German leftovers in user-facing aroma strings.

Default: food_pairings names, seasoning names, ingredient names, pairs_with_foods.
Use --all to include heat_behavior, cuisines, spice_blends (noisy; many mixed OCR lines).

Exit 1 if any default-path issue is found.
"""
from __future__ import annotations

import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(REPO, "aroma_data")

_UC = re.compile(r"[äöüÄÖÜß]")


def _flag(path: str, label: str, s: str, issues: list[tuple[str, str]]) -> None:
    if not s or not isinstance(s, str):
        return
    if _UC.search(s):
        issues.append((path, f"{label}: {s[:140]}"))


def main() -> int:
    all_fields = "--all" in sys.argv
    issues: list[tuple[str, str]] = []
    ing_path = os.path.join(DATA, "ingredients.json")
    fp_path = os.path.join(DATA, "food_pairings.json")
    if not os.path.isfile(ing_path):
        print("SKIP: no ingredients.json", file=sys.stderr)
        return 0
    with open(ing_path, encoding="utf-8") as f:
        ingredients = json.load(f)
    for ing in ingredients:
        iid = ing.get("id", "?")
        _flag(iid, "ingredient.name", ing.get("name", ""), issues)
        for p in ing.get("pairs_with_foods") or []:
            _flag(iid, "pairs_with_foods", p, issues)
        if all_fields:
            for c in ing.get("cuisines") or []:
                _flag(iid, "cuisines", c, issues)
            for b in ing.get("spice_blends") or []:
                _flag(iid, "spice_blends", b, issues)
            hb = ing.get("heat_behavior") or {}
            for k, v in hb.items():
                _flag(iid, f"heat.{k}", v, issues)

    if os.path.isfile(fp_path):
        with open(fp_path, encoding="utf-8") as f:
            foods = json.load(f)
        for row in foods:
            fid = row.get("id", "?")
            _flag(fid, "food.name", row.get("name", ""), issues)
            for s in row.get("seasonings") or []:
                _flag(fid, "seasoning", s.get("name", ""), issues)

    if not issues:
        print("check_aroma_english: no umlauts in checked fields.")
        return 0
    print(f"check_aroma_english: {len(issues)} umlaut issues:\n")
    for p, msg in issues[:50]:
        print(f"  [{p}] {msg}")
    if len(issues) > 50:
        print(f"  … and {len(issues) - 50} more")
    return 1


if __name__ == "__main__":
    sys.exit(main())
