#!/usr/bin/env python3
"""
Audit Riviera recipe library standards.

This is stricter than validate_riviera_builtins.py. It checks whether the active
Riviera recipe data is aligned with the working SOP model:
- built-in recipe shape is valid
- service variants reference real recipes
- canonical aliases / redirects point to real recipes
- meatball / polpette / albondigas duplicates are controlled
- active recipes missing service variants are listed for Kuschi confirmation

Run from repo root:
    python3 scripts/audit_riviera_recipe_standards.py

Use --strict to fail when active food recipes are missing service variants:
    python3 scripts/audit_riviera_recipe_standards.py --strict
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BUILTINS_PATH = ROOT / "riviera_data" / "builtins.json"
SERVICE_VARIANTS_PATH = ROOT / "riviera_data" / "service_variants.json"
CANONICAL_ALIASES_PATH = ROOT / "riviera_data" / "canonical_recipe_aliases.json"

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

NON_PORTION_RECIPE_TYPES = {
    "Sauce / Base",
    "Sauce",
    "Condiment",
    "Seasoning",
    "Batter",
    "Prep",
}

NON_PORTION_COURSES = {
    "Sauce",
    "Prep",
}

MEATBALL_TERMS = (
    "meatball",
    "meatballs",
    "polpette",
    "albondigas",
    "albóndigas",
)

CANONICAL_POLPETTE_ID = "veal-meatballs"
OLD_POLPETTE_IDS = {"beef-polpette-canape"}


def load_json(path: Path) -> Any:
    if not path.is_file():
        raise FileNotFoundError(f"Missing {path.relative_to(ROOT)}")
    return json.loads(path.read_text(encoding="utf-8"))


def validate_builtin_shape(recipes: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    for i, r in enumerate(recipes):
        if not isinstance(r, dict):
            errors.append(f"Recipe [{i}] must be an object")
            continue
        rid = str(r.get("id", "")).strip()
        for key in REQUIRED_TOP:
            if key not in r:
                errors.append(f"Recipe [{i}] ({rid or '?'!r}) missing required key {key!r}")
        if not rid:
            errors.append(f"Recipe [{i}] invalid id")
        elif not ID_RE.match(rid):
            errors.append(f"Recipe [{i}] id {rid!r} must be lowercase slug")
        elif rid in seen:
            errors.append(f"Duplicate id {rid!r}")
        seen.add(rid)
        for arr_key in ("protein", "diet", "elements", "method_steps", "service"):
            if arr_key in r and not isinstance(r[arr_key], list):
                errors.append(f"Recipe {rid!r}: {arr_key} must be an array")
        if "ingredients" in r and not isinstance(r["ingredients"], list):
            errors.append(f"Recipe {rid!r}: ingredients must be an array")
    return errors


def is_food_portion_recipe(r: dict[str, Any]) -> bool:
    rtype = str(r.get("type") or "").strip()
    course = str(r.get("course") or "").strip()
    if rtype in NON_PORTION_RECIPE_TYPES or course in NON_PORTION_COURSES:
        return False
    if not r.get("ingredients"):
        return False
    return True


def text_blob(r: dict[str, Any]) -> str:
    parts: list[str] = [
        str(r.get("id", "")),
        str(r.get("name", "")),
        str(r.get("subtitle", "")),
        str(r.get("label", "")),
        str(r.get("note", "")),
    ]
    parts.extend(str(x) for x in r.get("elements", []) if isinstance(x, str))
    return " ".join(parts).lower()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true", help="fail if active food recipes are missing service variants")
    args = parser.parse_args()

    recipes_raw = load_json(BUILTINS_PATH)
    service_raw = load_json(SERVICE_VARIANTS_PATH)
    aliases_raw = load_json(CANONICAL_ALIASES_PATH)

    if not isinstance(recipes_raw, list):
        print("ERROR: builtins.json must be a list", file=sys.stderr)
        return 1
    recipes = [r for r in recipes_raw if isinstance(r, dict)]
    recipe_ids = {str(r.get("id", "")).strip() for r in recipes}

    errors = validate_builtin_shape(recipes)
    service_variants = service_raw.get("service_variants", {}) if isinstance(service_raw, dict) else {}
    recipe_redirects = aliases_raw.get("recipe_id_redirects", {}) if isinstance(aliases_raw, dict) else {}
    canonical_recipes = aliases_raw.get("canonical_recipes", {}) if isinstance(aliases_raw, dict) else {}

    if not isinstance(service_variants, dict):
        errors.append("service_variants.json: service_variants must be an object")
        service_variants = {}
    if not isinstance(recipe_redirects, dict):
        errors.append("canonical_recipe_aliases.json: recipe_id_redirects must be an object")
        recipe_redirects = {}
    if not isinstance(canonical_recipes, dict):
        errors.append("canonical_recipe_aliases.json: canonical_recipes must be an object")
        canonical_recipes = {}

    for rid, target in recipe_redirects.items():
        if target not in recipe_ids:
            errors.append(f"Redirect {rid!r} -> {target!r} points to missing recipe")

    for key, rec in canonical_recipes.items():
        if not isinstance(rec, dict):
            errors.append(f"canonical_recipes.{key}: must be object")
            continue
        canonical_id = rec.get("canonical_id")
        if canonical_id not in recipe_ids:
            errors.append(f"canonical_recipes.{key}: canonical_id {canonical_id!r} missing from builtins")
        for dup in rec.get("duplicate_recipe_ids", []) or []:
            # Duplicate IDs may be legacy expansion drafts outside builtins, but if present in builtins they must redirect.
            if dup in recipe_ids and recipe_redirects.get(dup) != canonical_id:
                errors.append(f"Duplicate recipe id {dup!r} exists in builtins but does not redirect to {canonical_id!r}")

    for rid in service_variants.keys():
        if rid not in recipe_ids and rid not in recipe_redirects and rid != "cannoli":
            errors.append(f"service_variants key {rid!r} is not a built-in recipe id or redirect")

    polpette_like = [r for r in recipes if any(term in text_blob(r) for term in MEATBALL_TERMS)]
    unexpected_polpette = [r["id"] for r in polpette_like if r.get("id") not in {CANONICAL_POLPETTE_ID, *OLD_POLPETTE_IDS}]
    if unexpected_polpette:
        errors.append(
            "Unexpected active meatball-like recipes found: " + ", ".join(sorted(unexpected_polpette))
        )

    missing_variants = []
    for r in recipes:
        rid = str(r.get("id", "")).strip()
        if not is_food_portion_recipe(r):
            continue
        if rid in service_variants:
            continue
        if rid in recipe_redirects:
            continue
        missing_variants.append((rid, r.get("name", ""), r.get("type", ""), r.get("yield", "")))

    print("RIVIERA RECIPE STANDARDS AUDIT")
    print("=" * 36)
    print(f"Built-in recipes: {len(recipes)}")
    print(f"Service variant records: {len(service_variants)}")
    print(f"Canonical recipe groups: {len(canonical_recipes)}")
    print(f"Recipe redirects: {len(recipe_redirects)}")
    print()

    print("MEATBALL / POLPETTE CONTROL")
    print("-" * 31)
    if polpette_like:
        for r in polpette_like:
            status = "canonical" if r.get("id") == CANONICAL_POLPETTE_ID else "legacy/duplicate"
            print(f"{status:16} {r.get('id')} — {r.get('name')} — {r.get('yield')}")
    else:
        print("No meatball-like recipes found in active builtins.")
    print()

    print("ACTIVE FOOD RECIPES MISSING SERVICE VARIANTS")
    print("-" * 47)
    if missing_variants:
        for rid, name, rtype, yld in missing_variants:
            print(f"- {rid}: {name} [{rtype}] — yield: {yld}")
    else:
        print("None")
    print()

    if errors:
        print("ERRORS")
        print("-" * 6)
        for e in errors:
            print(f"- {e}")
        print()

    if errors or (args.strict and missing_variants):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
