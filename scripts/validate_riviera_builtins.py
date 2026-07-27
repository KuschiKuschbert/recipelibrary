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
CATALOG_PATH = ROOT / "riviera_sources" / "current" / "Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json"

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
    "status",
    "version",
    "provenance",
    "confirmationFlags",
    "aliases",
    "links",
    "allergens",
    "controls",
    "scalingBasis",
    "rationalSettings",
)

RECIPE_STATUSES = {
    "LOCKED",
    "ACTIVE WORKING",
    "TRIAL ONLY",
    "RETIRED",
}
CONTROL_STATUSES = {
    "CONFIRMED",
    "SOURCE RECORDED",
    "NEEDS CONFIRMATION",
    "NOT REQUIRED",
}


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

        status = r["status"]
        if status not in RECIPE_STATUSES:
            die(f"Recipe {rid!r}: invalid status {status!r}")

        version = r["version"]
        if not isinstance(version, str) or not version.strip():
            die(f"Recipe {rid!r}: version must be a non-empty string")

        provenance = r["provenance"]
        if not isinstance(provenance, dict):
            die(f"Recipe {rid!r}: provenance must be an object")
        for key in ("source", "sourceDate", "scope"):
            if not isinstance(provenance.get(key), str) or not provenance[key].strip():
                die(f"Recipe {rid!r}: provenance.{key} must be a non-empty string")

        confirmation_flags = r["confirmationFlags"]
        if not isinstance(confirmation_flags, list):
            die(f"Recipe {rid!r}: confirmationFlags must be an array")
        for j, flag in enumerate(confirmation_flags):
            if not isinstance(flag, str) or not flag.strip():
                die(f"Recipe {rid!r}: confirmationFlags[{j}] must be a non-empty string")

        aliases = r["aliases"]
        if not isinstance(aliases, list) or any(
            not isinstance(alias, str) or not alias.strip() for alias in aliases
        ):
            die(f"Recipe {rid!r}: aliases must be an array of non-empty strings")

        links = r["links"]
        if not isinstance(links, dict):
            die(f"Recipe {rid!r}: links must be an object")
        for link_kind in ("packages", "events"):
            link_rows = links.get(link_kind) if isinstance(links, dict) else None
            if not isinstance(link_rows, list) or any(not isinstance(row, dict) for row in link_rows):
                die(f"Recipe {rid!r}: links.{link_kind} must be an array of objects")

        allergens = r["allergens"]
        if not isinstance(allergens, dict):
            die(f"Recipe {rid!r}: allergens must be an object")
        if allergens.get("status") not in CONTROL_STATUSES:
            die(f"Recipe {rid!r}: allergens.status is invalid")
        for allergen_key in ("contains", "mayContain"):
            values = allergens.get(allergen_key)
            if not isinstance(values, list) or any(
                not isinstance(value, str) or not value.strip() for value in values
            ):
                die(f"Recipe {rid!r}: allergens.{allergen_key} must be an array of non-empty strings")
        if not isinstance(allergens.get("notes"), str):
            die(f"Recipe {rid!r}: allergens.notes must be a string")
        if allergens.get("status") == "NEEDS CONFIRMATION" and not any(
            "allergen" in flag.lower() for flag in confirmation_flags
        ):
            die(f"Recipe {rid!r}: unresolved allergens require an allergen confirmation flag")

        controls = r["controls"]
        if not isinstance(controls, dict):
            die(f"Recipe {rid!r}: controls must be an object")
        unresolved_controls = False
        for control_key in ("cooling", "holding", "packing", "service"):
            control = controls.get(control_key)
            if not isinstance(control, dict):
                die(f"Recipe {rid!r}: controls.{control_key} must be an object")
            if control.get("status") not in CONTROL_STATUSES:
                die(f"Recipe {rid!r}: controls.{control_key}.status is invalid")
            control_steps = control.get("steps")
            if not isinstance(control_steps, list) or any(
                not isinstance(step, str) or not step.strip() for step in control_steps
            ):
                die(f"Recipe {rid!r}: controls.{control_key}.steps must be an array of non-empty strings")
            if control.get("status") == "SOURCE RECORDED" and not control_steps:
                die(f"Recipe {rid!r}: source-recorded {control_key} controls require steps")
            if control.get("status") == "NEEDS CONFIRMATION":
                unresolved_controls = True
        if controls["service"]["steps"] != r["service"]:
            die(f"Recipe {rid!r}: controls.service.steps must match service")
        if unresolved_controls and not any("control" in flag.lower() for flag in confirmation_flags):
            die(f"Recipe {rid!r}: unresolved controls require a confirmation flag")

        scaling = r["scalingBasis"]
        if not isinstance(scaling, dict):
            die(f"Recipe {rid!r}: scalingBasis must be an object")
        if scaling.get("status") not in CONTROL_STATUSES:
            die(f"Recipe {rid!r}: scalingBasis.status is invalid")
        for scaling_key in ("basis", "baseYield", "notes"):
            if not isinstance(scaling.get(scaling_key), str):
                die(f"Recipe {rid!r}: scalingBasis.{scaling_key} must be a string")
        if scaling.get("status") == "SOURCE RECORDED" and not scaling.get("basis", "").strip():
            die(f"Recipe {rid!r}: source-recorded scalingBasis requires basis")
        if scaling.get("status") == "NEEDS CONFIRMATION" and not any(
            "scaling" in flag.lower() for flag in confirmation_flags
        ):
            die(f"Recipe {rid!r}: unresolved scalingBasis requires a confirmation flag")

        rational = r["rationalSettings"]
        if not isinstance(rational, dict):
            die(f"Recipe {rid!r}: rationalSettings must be an object")
        if rational.get("status") not in CONTROL_STATUSES:
            die(f"Recipe {rid!r}: rationalSettings.status is invalid")
        stages = rational.get("stages")
        if not isinstance(stages, list) or any(not isinstance(stage, dict) for stage in stages):
            die(f"Recipe {rid!r}: rationalSettings.stages must be an array of objects")
        if not isinstance(rational.get("notes"), str):
            die(f"Recipe {rid!r}: rationalSettings.notes must be a string")
        if rational.get("status") == "NEEDS CONFIRMATION" and not any(
            "rational" in flag.lower() for flag in confirmation_flags
        ):
            die(f"Recipe {rid!r}: unresolved rationalSettings requires a confirmation flag")

        if r.get("houseStandard") is True and status != "LOCKED":
            die(f"Recipe {rid!r}: houseStandard recipes must have status 'LOCKED'")
        if status == "RETIRED" and r.get("houseStandard") is True:
            die(f"Recipe {rid!r}: retired recipes cannot be house standards")

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

    if CATALOG_PATH.exists():
        catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        catalog_recipes = catalog.get("recipes") if isinstance(catalog, dict) else None
        if catalog_recipes != raw:
            die(
                f"{BUILTINS_PATH.relative_to(ROOT)} is not synced from "
                f"{CATALOG_PATH.relative_to(ROOT)}. Run: "
                "python3 scripts/sync_riviera_recipe_catalog.py --write"
            )

    print(f"OK — {len(raw)} Riviera built-in recipes in {BUILTINS_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
