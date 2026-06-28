#!/usr/bin/env python3
"""Apply prepPhase / prepPhases to package planner recipes missing explicit phases."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILTINS = ROOT / "riviera_data" / "builtins.json"
PACKAGES = ROOT / "riviera_data" / "function_packages.json"

TARGET_SECTIONS = frozenset(
    {
        "portofino",
        "carvery_buffet",
        "corporate_lunch",
        "corporate_buffet",
        "plated_meals",
    }
)


def classify_heuristic(text: str, recipe_type: str = "") -> str:
    t = (text or "").lower()
    typ = (recipe_type or "").lower()
    if re.search(
        r"overnight|refrigerat|marinat|day before|24 hour|defrost|freeze|"
        r"batch ahead|make ahead|prepare in advance|coldroom|vacuum|seal only|"
        r"label and freeze|store in",
        t,
    ):
        return "day_before"
    if re.search(r"component|sauce|base|stock|bakery|dough|pastry|prep only", typ + " " + t):
        return "day_before"
    if re.search(r"bring.*room temp|room temperature for|before service|morning of", t):
        return "morning_of"
    if re.search(
        r"roast|bake|fry|grill|char|oven|crumb|portion|smash|slice|combine|mix|"
        r"toss|wash|prep|marinade|brine|cool|chill|hang|fold|roll|shape|"
        r"assemble|portion into",
        t,
    ):
        return "day_before"
    if re.search(r"service|plate|garnish|pass|to order|serve immediately", t):
        return "service"
    return "day_before"


def target_recipe_ids(packages: dict) -> set[str]:
    ids: set[str] = set()
    for pkg in packages.get("packages", []):
        for sec in pkg.get("sections", []):
            if sec.get("id") not in TARGET_SECTIONS:
                continue
            for course in sec.get("courses", []):
                for item in course.get("items", []):
                    rid = item.get("recipeId")
                    if rid:
                        ids.add(rid)
    return ids


def suggest_phases(recipe: dict) -> dict | None:
    if recipe.get("prepPhase") or recipe.get("prepPhases"):
        return None
    steps = recipe.get("method_steps") or []
    if not steps:
        return {"prepPhase": "day_before"}
    phases = [classify_heuristic(s, recipe.get("type", "")) for s in steps]
    if len(set(phases)) == 1:
        return {"prepPhase": phases[0]}
    return {"prepPhases": phases}


def main() -> int:
    packages = json.loads(PACKAGES.read_text(encoding="utf-8"))
    recipes = json.loads(BUILTINS.read_text(encoding="utf-8"))
    targets = target_recipe_ids(packages)
    by_id = {r["id"]: r for r in recipes if isinstance(r, dict) and r.get("id")}

    applied = []
    missing = []
    for rid in sorted(targets):
        r = by_id.get(rid)
        if not r:
            missing.append(rid)
            continue
        patch = suggest_phases(r)
        if not patch:
            continue
        r.pop("prepPhase", None)
        r.pop("prepPhases", None)
        r.update(patch)
        if "prepPhases" in patch:
            if len(patch["prepPhases"]) != len(r.get("method_steps") or []):
                print(f"ERROR {rid}: prepPhases length mismatch", file=sys.stderr)
                return 1
        applied.append(rid)

    BUILTINS.write_text(json.dumps(recipes, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Applied prepPhase(s) to {len(applied)} recipes")
    if missing:
        print(f"Missing builtins: {', '.join(missing)}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
