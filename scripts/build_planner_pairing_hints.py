#!/usr/bin/env python3
"""Build planner_pairing_hints.json from package recipes (Epicure optional)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "riviera_data/planner_pairing_hints.json"
PACKAGES = ROOT / "riviera_data/function_packages.json"

# Fallback when Epicure MCP unavailable — extend manually or wire MCP in CI.
FALLBACK: dict[str, list[str]] = {
    "arancini": ["saffron", "romesco", "lemon", "pecorino"],
    "calamari": ["capers", "fennel", "parsley", "aioli"],
}


def planner_recipe_ids() -> set[str]:
    data = json.loads(PACKAGES.read_text())
    ids: set[str] = set()
    for pkg in data.get("packages", []):
        for sec in pkg.get("sections", []):
            for course in sec.get("courses", []):
                for item in course.get("items", []):
                    rid = item.get("recipeId")
                    if rid:
                        ids.add(rid)
    return ids


def main() -> None:
    hints = dict(FALLBACK)
    existing = {}
    if OUT.is_file():
        existing = json.loads(OUT.read_text()).get("hints", {})
    hints.update(existing)
    for rid in sorted(planner_recipe_ids()):
        hints.setdefault(rid, [])
    OUT.write_text(
        json.dumps(
            {
                "version": 1,
                "note": "Pairing bridges for planner chips. Regenerate with Epicure when MCP available.",
                "hints": {k: v for k, v in sorted(hints.items()) if v},
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT} ({len(hints)} recipes with hints)")


if __name__ == "__main__":
    main()
