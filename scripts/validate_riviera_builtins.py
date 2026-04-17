#!/usr/bin/env python3
"""
Validate riviera_data/builtins.json — unique ids, required fields, ingredient rows.

Run from repo root: python3 scripts/validate_riviera_builtins.py
Exit 0 if OK, exit 1 with stderr messages if invalid.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILTINS_PATH = ROOT / "riviera_data" / "builtins.json"

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}$")

REQUIRED_TOP = (
    "id",
    "name",
    "type",
    "course",
    "protein",
    "diet",
    "method",
    "yield",
    "label",
    "elements",
    "ingredients",
    "method_steps",
    "service",
)


def die(msg: str) -> None:
    print(msg, file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if not BUILTINS_PATH.is_file():
        die(f"Missing {BUILTINS_PATH.relative_to(ROOT)}")

    raw = json.loads(BUILTINS_PATH.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        die("builtins.json must be a JSON array")
    if len(raw) == 0:
        die("builtins.json must contain at least one recipe")

    seen: set[str] = set()
    for i, r in enumerate(raw):
        if not isinstance(r, dict):
            die(f"Recipe [{i}] must be an object")
        for k in REQUIRED_TOP:
            if k not in r:
                die(f"Recipe [{i}] ({r.get('id', '?')!r}) missing required key {k!r}")

        rid = r["id"]
        if not isinstance(rid, str) or not rid.strip():
            die(f"Recipe [{i}] invalid id (non-empty string required)")
        rid = rid.strip()
        if not ID_RE.match(rid):
            die(
                f"Recipe [{i}] id {rid!r} must match lowercase slug "
                r"pattern /^[a-z0-9][a-z0-9-]{0,62}$/"
            )
        if rid in seen:
            die(f"Duplicate id {rid!r}")
        seen.add(rid)

        name = r["name"]
        if not isinstance(name, str) or not str(name).strip():
            die(f"Recipe {rid!r}: name must be a non-empty string")

        for key in ("subtitle", "type", "course", "method", "yield", "label"):
            val = r.get(key)
            if val is not None and not isinstance(val, str):
                die(f"Recipe {rid!r}: {key} must be string or null")

        for arr_key in ("protein", "diet", "elements", "method_steps", "service"):
            arr = r[arr_key]
            if not isinstance(arr, list):
                die(f"Recipe {rid!r}: {arr_key} must be an array")
            for j, item in enumerate(arr):
                if not isinstance(item, str):
                    die(f"Recipe {rid!r}: {arr_key}[{j}] must be a string")

        ings = r["ingredients"]
        if not isinstance(ings, list):
            die(f"Recipe {rid!r}: ingredients must be an array")
        for j, row in enumerate(ings):
            if not isinstance(row, dict):
                die(f"Recipe {rid!r}: ingredients[{j}] must be an object")
            item = row.get("item")
            if not isinstance(item, str) or not item.strip():
                die(f"Recipe {rid!r}: ingredients[{j}] needs non-empty string item")
            q = row.get("qty")
            if q is not None and not isinstance(q, str):
                die(f"Recipe {rid!r}: ingredients[{j}].qty must be string if present")
            prep = row.get("prep")
            if prep is not None and not isinstance(prep, str):
                die(f"Recipe {rid!r}: ingredients[{j}].prep must be string if present")

        note = r.get("note")
        if note is not None and not isinstance(note, str):
            die(f"Recipe {rid!r}: note must be string or null")

    print(f"OK — {len(raw)} Riviera built-in recipes in {BUILTINS_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
