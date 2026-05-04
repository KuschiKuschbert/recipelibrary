#!/usr/bin/env python3
"""Merge expansion wave recipes into riviera_data/builtins.json (skip existing ids)."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILTINS = ROOT / "riviera_data" / "builtins.json"
VALIDATOR = ROOT / "scripts" / "validate_riviera_builtins.py"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "wave",
        choices=("a", "b", "c", "all"),
        help="Which wave to append (all = a then b then c)",
    )
    args = parser.parse_args()

    sys.path.insert(0, str(ROOT / "scripts"))
    from riviera_expansion_recipes_data import WAVE_A, WAVE_B, WAVE_C

    waves: list[tuple[str, list]]
    if args.wave == "a":
        waves = [("A", WAVE_A)]
    elif args.wave == "b":
        waves = [("B", WAVE_B)]
    elif args.wave == "c":
        waves = [("C", WAVE_C)]
    else:
        waves = [("A", WAVE_A), ("B", WAVE_B), ("C", WAVE_C)]

    data = json.loads(BUILTINS.read_text(encoding="utf-8"))
    existing = {r["id"] for r in data}
    added = 0
    for label, recipes in waves:
        for r in recipes:
            rid = r["id"]
            if rid in existing:
                print(f"skip (exists): {rid}", file=sys.stderr)
                continue
            data.append(r)
            existing.add(rid)
            added += 1
            print(f"+ [{label}] {rid}")

    BUILTINS.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote builtins.json (+{added} recipes)")

    proc = subprocess.run([sys.executable, str(VALIDATOR)], cwd=str(ROOT), capture_output=True, text=True)
    if proc.returncode != 0:
        print(proc.stdout, file=sys.stderr)
        print(proc.stderr, file=sys.stderr)
        sys.exit(proc.returncode)
    print(proc.stdout.strip())


if __name__ == "__main__":
    main()
