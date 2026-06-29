#!/usr/bin/env python3
"""Automated smoke checks for Function Package Planner (run from repo root)."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGES_PATH = ROOT / "riviera_data" / "function_packages.json"
PLANNER_SECTIONS = frozenset(
    {
        "portofino",
        "corporate_lunch",
        "corporate_buffet",
        "carvery_buffet",
        "plated_meals",
    }
)


def planner_recipe_ids() -> set[str]:
    data = json.loads(PACKAGES_PATH.read_text(encoding="utf-8"))
    ids: set[str] = set()
    for pkg in data.get("packages", []):
        for sec in pkg.get("sections", []):
            if sec.get("id") not in PLANNER_SECTIONS:
                continue
            for course in sec.get("courses", []):
                for item in course.get("items", []):
                    rid = item.get("recipeId")
                    if rid:
                        ids.add(rid)
    return ids


def ok(msg: str) -> None:
    print(f"PASS  {msg}")


def fail(msg: str) -> None:
    print(f"FAIL  {msg}", file=sys.stderr)


def main() -> int:
    errors = 0

    for rel in (
        "assets/package-planner.js",
        "assets/package-prep-sheet.js",
        "assets/planner-scale.js",
    ):
        path = ROOT / rel
        r = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
        if r.returncode == 0:
            ok(f"node --check {rel}")
        else:
            errors += 1
            fail(f"node --check {rel}: {r.stderr.strip()}")

    html = (ROOT / "riviera.html").read_text(encoding="utf-8")
    for needle in ("fnPlannerEventDate", "plannerPrintIncludeRecipes", "plannerPrintRoot"):
        if needle in html:
            ok(f"riviera.html contains #{needle}" if needle.startswith("fn") or needle.startswith("planner") else needle)
        else:
            errors += 1
            fail(f"riviera.html missing {needle}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    m = re.search(r"const\s+CACHE_NAME\s*=\s*['\"]([^'\"]+)['\"]", sw)
    if m:
        ok(f"sw.js CACHE_NAME {m.group(1)}")
    else:
        errors += 1
        fail("sw.js CACHE_NAME missing")

    extras = ROOT / "assets/planner-extras.js"
    r = subprocess.run(["node", "--check", str(extras)], capture_output=True, text=True)
    if r.returncode == 0:
        ok("node --check assets/planner-extras.js")
    else:
        errors += 1
        fail(f"node --check assets/planner-extras.js: {r.stderr.strip()}")

    for rel in (
        "riviera_data/planner_pairing_hints.json",
        "riviera_data/planner_unit_costs.json",
    ):
        p = ROOT / rel
        if p.is_file():
            json.loads(p.read_text())
            ok(rel)
        else:
            errors += 1
            fail(f"missing {rel}")

    builtins = json.loads((ROOT / "riviera_data/builtins.json").read_text())
    by_id = {r["id"]: r for r in builtins if isinstance(r, dict) and r.get("id")}
    planner_ids = planner_recipe_ids()
    ok(f"planner package recipes to check: {len(planner_ids)}")
    missing_prep = []
    for rid in sorted(planner_ids):
        r = by_id.get(rid)
        if not r:
            errors += 1
            fail(f"builtins missing planner recipe {rid}")
            continue
        if not (r.get("prepPhase") or r.get("prepPhases")):
            missing_prep.append(rid)
    if missing_prep:
        for rid in missing_prep:
            errors += 1
            fail(f"{rid} missing prepPhase/prepPhases")
    else:
        ok("all planner package recipes have prepPhase(s)")

    if "Scalable" in json.dumps(builtins):
        errors += 1
        fail('builtins still contains yield "Scalable"')
    else:
        ok("no Scalable yields in builtins")

    r = subprocess.run([sys.executable, str(ROOT / "scripts/planner_spotcheck.py")], cwd=ROOT)
    if r.returncode == 0:
        ok("planner_spotcheck.py")
    else:
        errors += 1
        fail("planner_spotcheck.py failed")

    if errors:
        fail(f"{errors} check(s) failed")
        return 1
    ok("all planner acceptance smoke checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
