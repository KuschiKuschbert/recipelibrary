#!/usr/bin/env python3
"""Automated smoke checks for Function Package Planner (run from repo root)."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


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
    if "kuschi-kitchen-v14" in sw:
        ok("sw.js CACHE_NAME v14")
    else:
        errors += 1
        fail("sw.js not on v14")

    builtins = json.loads((ROOT / "riviera_data/builtins.json").read_text())
    portofino_ids = {
        "arancini",
        "calamari",
        "oysters-kilpatrick",
        "veal-meatballs",
        "chicken-skewer",
        "chorizo-potatoes",
        "lamb-cutlet",
        "camembert-cigars",
        "fish-slider",
    }
    by_id = {r["id"]: r for r in builtins if isinstance(r, dict) and r.get("id")}
    for rid in sorted(portofino_ids):
        r = by_id.get(rid)
        if not r:
            errors += 1
            fail(f"builtins missing {rid}")
            continue
        if r.get("prepPhase") or r.get("prepPhases"):
            ok(f"{rid} has prepPhase(s)")
        else:
            errors += 1
            fail(f"{rid} missing prepPhase/prepPhases")

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
