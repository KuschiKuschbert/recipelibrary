#!/usr/bin/env python3
"""
Audit Riviera recipe library standards.

Checks:
- built-in recipe JSON shape
- service variant records reference real recipes or approved redirects
- service variant add-on files are merged into the audit
- canonical aliases / redirects point to real recipes
- meatball / polpette / albondigas duplicates stay controlled
- service variant statuses follow normal vs strict audit behaviour
- special-purpose service keys are explicit and documented
- missing service variants are reported as backlog; strict only fails them when --all-builtins is used

Run from repo root:
    python3 scripts/audit_riviera_recipe_standards.py

Strict scoped audit:
    python3 scripts/audit_riviera_recipe_standards.py --strict

Full builtins backlog audit:
    python3 scripts/audit_riviera_recipe_standards.py --strict --all-builtins
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
SERVICE_VARIANTS_ADDON_GLOB = "service_variants_*.json"
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
    "Component",
    "Dry Mix",
    "Marinade",
    "Brine",
    "Pickle / Base",
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

SERVICE_VARIANT_META_KEYS = {
    "recipe_id",
    "recipe_id_candidates",
    "canonical_name",
    "aliases",
    "base_prep",
    "size_rule",
}

SERVICE_VARIANT_STATUSES = {
    "confirmed",
    "needs_confirmation",
    "not_recommended",
}

NOT_RECOMMENDED_REASON_KEYS = {
    "reason",
    "note",
    "notes",
    "recommendation",
}

SPECIAL_PURPOSE_REASON_KEYS = {
    "portion",
    "note",
    "reason",
    "service_rule",
    "size_rule",
}


def load_json(path: Path) -> Any:
    if not path.is_file():
        raise FileNotFoundError(f"Missing {path.relative_to(ROOT)}")
    return json.loads(path.read_text(encoding="utf-8"))


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


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


def allowed_polpette_ids(canonical_recipes: dict[str, Any]) -> set[str]:
    polpette_cfg = canonical_recipes.get("polpette", {})
    if not isinstance(polpette_cfg, dict):
        return {CANONICAL_POLPETTE_ID}
    canonical_id = str(polpette_cfg.get("canonical_id") or CANONICAL_POLPETTE_ID)
    duplicate_ids = polpette_cfg.get("duplicate_recipe_ids", []) or []
    return {canonical_id, *[str(x) for x in duplicate_ids]}


def has_any_text(record: dict[str, Any], keys: set[str]) -> bool:
    for key in keys:
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            return True
        if isinstance(value, list) and any(str(x).strip() for x in value):
            return True
    return False


def iter_service_variant_records(service_variants: dict[str, Any]) -> list[tuple[str, str, dict[str, Any]]]:
    records: list[tuple[str, str, dict[str, Any]]] = []
    for recipe_id, variant_group in service_variants.items():
        if not isinstance(variant_group, dict):
            continue
        for variant_key, variant_record in variant_group.items():
            if variant_key in SERVICE_VARIANT_META_KEYS:
                continue
            if isinstance(variant_record, dict):
                records.append((str(recipe_id), str(variant_key), variant_record))
    return records


def get_rule_list(service_raw: dict[str, Any], key: str) -> set[str]:
    rules = service_raw.get("rules", {}) if isinstance(service_raw, dict) else {}
    values = rules.get(key, []) if isinstance(rules, dict) else []
    return {str(v) for v in values} if isinstance(values, list) else set()


def merge_service_variants(
    merged: dict[str, Any],
    incoming: dict[str, Any],
    source_path: Path,
    errors: list[str],
) -> None:
    for recipe_id, variant_group in incoming.items():
        if not isinstance(variant_group, dict):
            errors.append(f"{rel(source_path)}: service_variants.{recipe_id}: must be an object")
            continue
        if recipe_id not in merged:
            merged[recipe_id] = variant_group
            continue
        existing = merged[recipe_id]
        if not isinstance(existing, dict):
            errors.append(f"{rel(source_path)}: service_variants.{recipe_id}: conflicts with non-object existing record")
            continue
        for variant_key, variant_record in variant_group.items():
            if variant_key in existing and existing[variant_key] != variant_record:
                errors.append(
                    f"{rel(source_path)}: service_variants.{recipe_id}.{variant_key}: "
                    "conflicts with an existing service variant definition"
                )
                continue
            existing[variant_key] = variant_record


def load_service_variant_bundle() -> tuple[dict[str, Any], dict[str, Any], list[Path], list[str]]:
    errors: list[str] = []
    service_raw = load_json(SERVICE_VARIANTS_PATH)
    source_paths = [SERVICE_VARIANTS_PATH]
    merged: dict[str, Any] = {}

    if not isinstance(service_raw, dict):
        errors.append(f"{rel(SERVICE_VARIANTS_PATH)}: root must be an object")
        return {}, merged, source_paths, errors

    base_variants = service_raw.get("service_variants", {})
    if not isinstance(base_variants, dict):
        errors.append(f"{rel(SERVICE_VARIANTS_PATH)}: service_variants must be an object")
    else:
        merge_service_variants(merged, base_variants, SERVICE_VARIANTS_PATH, errors)

    addon_paths = sorted(SERVICE_VARIANTS_PATH.parent.glob(SERVICE_VARIANTS_ADDON_GLOB))
    for addon_path in addon_paths:
        source_paths.append(addon_path)
        addon_raw = load_json(addon_path)
        if not isinstance(addon_raw, dict):
            errors.append(f"{rel(addon_path)}: root must be an object")
            continue
        addon_variants = addon_raw.get("service_variants", {})
        if not isinstance(addon_variants, dict):
            errors.append(f"{rel(addon_path)}: service_variants must be an object")
            continue
        merge_service_variants(merged, addon_variants, addon_path, errors)

    return service_raw, merged, source_paths, errors


def service_variant_review(
    service_raw: dict[str, Any],
    service_variants: dict[str, Any],
    errors: list[str],
) -> tuple[list[tuple[str, str]], list[tuple[str, str]], list[tuple[str, str]]]:
    needs_confirmation: list[tuple[str, str]] = []
    missing_status: list[tuple[str, str]] = []
    not_recommended: list[tuple[str, str]] = []

    master_keys = get_rule_list(service_raw, "master_variant_keys")
    special_keys = get_rule_list(service_raw, "special_variant_keys")
    allowed_variant_keys = master_keys | special_keys

    for recipe_id, variant_key, variant_record in iter_service_variant_records(service_variants):
        if allowed_variant_keys and variant_key not in allowed_variant_keys:
            errors.append(
                f"service_variants.{recipe_id}.{variant_key}: variant key is not in master_variant_keys or special_variant_keys"
            )

        if special_keys and variant_key in special_keys:
            if not has_any_text(variant_record, SPECIAL_PURPOSE_REASON_KEYS):
                errors.append(
                    f"service_variants.{recipe_id}.{variant_key}: special-purpose variant requires portion/note/reason/service_rule"
                )

        raw_status = variant_record.get("status")
        status = str(raw_status).strip() if raw_status is not None else ""

        if not status:
            missing_status.append((recipe_id, variant_key))
            continue

        if status not in SERVICE_VARIANT_STATUSES:
            errors.append(
                f"service_variants.{recipe_id}.{variant_key}: invalid status {status!r}; "
                f"expected one of {sorted(SERVICE_VARIANT_STATUSES)}"
            )
            continue

        if status == "needs_confirmation":
            needs_confirmation.append((recipe_id, variant_key))
        elif status == "not_recommended":
            not_recommended.append((recipe_id, variant_key))
            if not has_any_text(variant_record, NOT_RECOMMENDED_REASON_KEYS):
                errors.append(
                    f"service_variants.{recipe_id}.{variant_key}: not_recommended requires a clear reason/note"
                )

    return needs_confirmation, missing_status, not_recommended


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true", help="fail if confirmed service standard statuses are unresolved")
    parser.add_argument("--all-builtins", action="store_true", help="also fail strict mode when any active built-in food recipe lacks a service variant")
    args = parser.parse_args()

    recipes_raw = load_json(BUILTINS_PATH)
    service_raw, service_variants, service_variant_paths, service_variant_errors = load_service_variant_bundle()
    aliases_raw = load_json(CANONICAL_ALIASES_PATH)

    if not isinstance(recipes_raw, list):
        print("ERROR: builtins.json must be a list", file=sys.stderr)
        return 1
    recipes = [r for r in recipes_raw if isinstance(r, dict)]
    recipe_ids = {str(r.get("id", "")).strip() for r in recipes}

    errors = validate_builtin_shape(recipes)
    errors.extend(service_variant_errors)
    recipe_redirects = aliases_raw.get("recipe_id_redirects", {}) if isinstance(aliases_raw, dict) else {}
    canonical_recipes = aliases_raw.get("canonical_recipes", {}) if isinstance(aliases_raw, dict) else {}

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
            if dup in recipe_ids and recipe_redirects.get(dup) != canonical_id:
                errors.append(f"Duplicate recipe id {dup!r} exists in builtins but does not redirect to {canonical_id!r}")

    for rid, value in service_variants.items():
        if rid not in recipe_ids and rid not in recipe_redirects and rid != "cannoli":
            errors.append(f"service_variants key {rid!r} is not a built-in recipe id or redirect")
        if not isinstance(value, dict):
            errors.append(f"service_variants.{rid}: must be an object")

    allowed_ids = allowed_polpette_ids(canonical_recipes)
    polpette_like = [r for r in recipes if any(term in text_blob(r) for term in MEATBALL_TERMS)]
    unexpected_polpette = [r["id"] for r in polpette_like if r.get("id") not in allowed_ids]
    if unexpected_polpette:
        errors.append("Unexpected active meatball-like recipes found: " + ", ".join(sorted(unexpected_polpette)))

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

    needs_confirmation, missing_status, not_recommended = service_variant_review(service_raw, service_variants, errors)

    print("RIVIERA RECIPE STANDARDS AUDIT")
    print("=" * 36)
    print(f"Built-in recipes: {len(recipes)}")
    print(f"Service variant files: {len(service_variant_paths)}")
    for path in service_variant_paths:
        print(f"- {rel(path)}")
    print(f"Service variant records: {len(service_variants)}")
    print(f"Canonical recipe groups: {len(canonical_recipes)}")
    print(f"Recipe redirects: {len(recipe_redirects)}")
    print(f"Strict missing variant scope: {'all builtins' if args.all_builtins else 'service variants only'}")
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

    print("SERVICE VARIANT STATUS REVIEW")
    print("-" * 29)
    print(f"needs_confirmation: {len(needs_confirmation)}")
    for rid, variant in needs_confirmation:
        print(f"- {rid}.{variant}")
    print(f"missing_status: {len(missing_status)}")
    for rid, variant in missing_status:
        print(f"- {rid}.{variant}")
    print(f"not_recommended: {len(not_recommended)}")
    for rid, variant in not_recommended:
        print(f"- {rid}.{variant}")
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

    strict_blockers = bool(needs_confirmation or missing_status)
    if args.all_builtins:
        strict_blockers = strict_blockers or bool(missing_variants)

    if errors or (args.strict and strict_blockers):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
