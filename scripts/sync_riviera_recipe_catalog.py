#!/usr/bin/env python3
"""Sync/check Riviera's structured recipe catalog against site built-ins.

The canonical editable recipe payload lives in:
  riviera_sources/current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json

The GitHub Pages app still fetches riviera_data/builtins.json, so this script
keeps that operational copy aligned and fails loudly if it drifts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "riviera_sources" / "current" / "Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json"
BUILTINS_PATH = ROOT / "riviera_data" / "builtins.json"
MANIFEST_PATH = ROOT / "riviera_sources" / "current" / "manifest.json"
SOURCE_OF_TRUTH_PATH = ROOT / "riviera_sources" / "current" / "Riviera_Source_Of_Truth_2026-07-08.md"
OVERLAY_PATH = ROOT / "riviera_sources" / "current" / "Riviera_Tapas_House_Standards_Overlay_2026-07-08.md"
CURRENT_STANDARDS_ADDITIONS_PATH = (
    ROOT / "riviera_sources" / "current" / "Riviera_Current_House_Standards_Additions_2026-07-27.md"
)
PDF_PATH = ROOT / "output" / "pdf" / "Riviera_Kitchen_Recipe_Card_Book_2026-07-08.pdf"
HOUSE_STANDARDS_PDF_PATH = ROOT / "output" / "pdf" / "Riviera_House_Standards_Recipe_Manual_2026-07-08.pdf"

EXPECTED_RECIPE_COUNT = 156
ACTIVE_RELEASE_ID = "RIV-KNOWLEDGE-2026-07-27-V13"
JULY_8_OVERLAY_IDS = [
    "arancini",
    "calamari",
    "oysters-kilpatrick",
    "veal-meatballs",
    "chicken-skewer",
    "chorizo-potatoes",
    "lamb-cutlet",
    "fish-slider",
    "romesco",
    "lemon-dill-aioli",
    "lemon-thyme-aioli",
    "vodka-sauce",
    "riviera-emulsion",
    "whipped-butter",
    "camembert-cigars",
    "beef-kofta",
]
CURRENT_HOUSE_STANDARD_IDS = [
    *JULY_8_OVERLAY_IDS,
    "peach-tartare",
    "house-scones",
    "potato-pave",
    "baklava-cheesecake",
    "house-focaccia",
    "burnt-butter-mash",
]
CURRENT_HOUSE_STANDARD_ORDER = {
    recipe_id: idx for idx, recipe_id in enumerate(CURRENT_HOUSE_STANDARD_IDS)
}
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
CONTROL_KEYS = ("cooling", "holding", "packing", "service")

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


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def json_text(data: Any) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def write_json_if_changed(path: Path, data: Any) -> bool:
    text = json_text(data)
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return True


def stable_hash(data: Any) -> str:
    payload = json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def fail(errors: list[str]) -> None:
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    raise SystemExit(1)


def sort_recipes_for_catalog(recipes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    original_order = {str(recipe.get("id")): idx for idx, recipe in enumerate(recipes) if isinstance(recipe, dict)}

    def sort_key(recipe: dict[str, Any]) -> tuple[int, int]:
        recipe_id = str(recipe.get("id") or "")
        if recipe_id in CURRENT_HOUSE_STANDARD_ORDER:
            return (0, CURRENT_HOUSE_STANDARD_ORDER[recipe_id])
        return (1, original_order.get(recipe_id, 999999))

    return sorted(recipes, key=sort_key)


def validate_recipes(recipes: Any, *, require_house_order: bool = True) -> list[str]:
    errors: list[str] = []
    if not isinstance(recipes, list):
        return ["recipes must be a list"]
    if len(recipes) != EXPECTED_RECIPE_COUNT:
        errors.append(f"expected {EXPECTED_RECIPE_COUNT} recipes, found {len(recipes)}")

    seen: set[str] = set()
    for idx, recipe in enumerate(recipes):
        if not isinstance(recipe, dict):
            errors.append(f"recipe [{idx}] must be an object")
            continue
        rid = str(recipe.get("id") or "").strip()
        if not rid:
            errors.append(f"recipe [{idx}] missing id")
            continue
        if rid in seen:
            errors.append(f"duplicate recipe id {rid!r}")
        seen.add(rid)
        for key in REQUIRED_TOP:
            if key not in recipe:
                errors.append(f"recipe {rid!r} missing required key {key!r}")
        for key in ("protein", "diet", "elements", "ingredients", "method_steps", "service"):
            if key in recipe and not isinstance(recipe[key], list):
                errors.append(f"recipe {rid!r}: {key} must be a list")
        status = recipe.get("status")
        if status not in RECIPE_STATUSES:
            errors.append(
                f"recipe {rid!r}: status must be one of {sorted(RECIPE_STATUSES)}, found {status!r}"
            )
        version = recipe.get("version")
        if not isinstance(version, str) or not version.strip():
            errors.append(f"recipe {rid!r}: version must be a non-empty string")
        provenance = recipe.get("provenance")
        if not isinstance(provenance, dict):
            errors.append(f"recipe {rid!r}: provenance must be an object")
        else:
            for key in ("source", "sourceDate", "scope"):
                if not isinstance(provenance.get(key), str) or not provenance[key].strip():
                    errors.append(f"recipe {rid!r}: provenance.{key} must be a non-empty string")
        flags = recipe.get("confirmationFlags")
        if not isinstance(flags, list) or any(not isinstance(flag, str) or not flag.strip() for flag in flags):
            errors.append(f"recipe {rid!r}: confirmationFlags must be an array of non-empty strings")
            flags = []
        aliases = recipe.get("aliases")
        if not isinstance(aliases, list) or any(
            not isinstance(alias, str) or not alias.strip() for alias in aliases
        ):
            errors.append(f"recipe {rid!r}: aliases must be an array of non-empty strings")
        links = recipe.get("links")
        if not isinstance(links, dict):
            errors.append(f"recipe {rid!r}: links must be an object")
        else:
            for link_kind in ("packages", "events"):
                rows = links.get(link_kind)
                if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
                    errors.append(f"recipe {rid!r}: links.{link_kind} must be an array of objects")
        allergens = recipe.get("allergens")
        if not isinstance(allergens, dict):
            errors.append(f"recipe {rid!r}: allergens must be an object")
        else:
            if allergens.get("status") not in CONTROL_STATUSES:
                errors.append(f"recipe {rid!r}: allergens.status is invalid")
            for key in ("contains", "mayContain"):
                values = allergens.get(key)
                if not isinstance(values, list) or any(
                    not isinstance(value, str) or not value.strip() for value in values
                ):
                    errors.append(f"recipe {rid!r}: allergens.{key} must be an array of non-empty strings")
            if not isinstance(allergens.get("notes"), str):
                errors.append(f"recipe {rid!r}: allergens.notes must be a string")
            if allergens.get("status") == "NEEDS CONFIRMATION" and not any(
                "allergen" in str(flag).lower() for flag in flags
            ):
                errors.append(f"recipe {rid!r}: unresolved allergens require an allergen confirmation flag")
        controls = recipe.get("controls")
        if not isinstance(controls, dict):
            errors.append(f"recipe {rid!r}: controls must be an object")
        else:
            unresolved_controls = False
            for control_key in CONTROL_KEYS:
                control = controls.get(control_key)
                if not isinstance(control, dict):
                    errors.append(f"recipe {rid!r}: controls.{control_key} must be an object")
                    continue
                status_value = control.get("status")
                if status_value not in CONTROL_STATUSES:
                    errors.append(f"recipe {rid!r}: controls.{control_key}.status is invalid")
                steps = control.get("steps")
                if not isinstance(steps, list) or any(
                    not isinstance(step, str) or not step.strip() for step in steps
                ):
                    errors.append(
                        f"recipe {rid!r}: controls.{control_key}.steps must be an array of non-empty strings"
                    )
                if status_value == "SOURCE RECORDED" and not steps:
                    errors.append(f"recipe {rid!r}: source-recorded {control_key} controls require steps")
                if status_value == "NEEDS CONFIRMATION":
                    unresolved_controls = True
            service_control = controls.get("service")
            if isinstance(service_control, dict) and service_control.get("steps") != recipe.get("service"):
                errors.append(f"recipe {rid!r}: controls.service.steps must match service")
            if unresolved_controls and not any(
                "control" in str(flag).lower() for flag in flags
            ):
                errors.append(f"recipe {rid!r}: unresolved controls require a confirmation flag")
        scaling = recipe.get("scalingBasis")
        if not isinstance(scaling, dict):
            errors.append(f"recipe {rid!r}: scalingBasis must be an object")
        else:
            if scaling.get("status") not in CONTROL_STATUSES:
                errors.append(f"recipe {rid!r}: scalingBasis.status is invalid")
            for key in ("basis", "baseYield", "notes"):
                if not isinstance(scaling.get(key), str):
                    errors.append(f"recipe {rid!r}: scalingBasis.{key} must be a string")
            if scaling.get("status") == "SOURCE RECORDED" and not scaling.get("basis", "").strip():
                errors.append(f"recipe {rid!r}: source-recorded scalingBasis requires basis")
            if scaling.get("status") == "NEEDS CONFIRMATION" and not any(
                "scaling" in str(flag).lower() for flag in flags
            ):
                errors.append(f"recipe {rid!r}: unresolved scalingBasis requires a confirmation flag")
        rational = recipe.get("rationalSettings")
        if not isinstance(rational, dict):
            errors.append(f"recipe {rid!r}: rationalSettings must be an object")
        else:
            if rational.get("status") not in CONTROL_STATUSES:
                errors.append(f"recipe {rid!r}: rationalSettings.status is invalid")
            stages = rational.get("stages")
            if not isinstance(stages, list) or any(not isinstance(stage, dict) for stage in stages):
                errors.append(f"recipe {rid!r}: rationalSettings.stages must be an array of objects")
            if not isinstance(rational.get("notes"), str):
                errors.append(f"recipe {rid!r}: rationalSettings.notes must be a string")
            if rational.get("status") == "NEEDS CONFIRMATION" and not any(
                "rational" in str(flag).lower() for flag in flags
            ):
                errors.append(f"recipe {rid!r}: unresolved rationalSettings requires a confirmation flag")
        for ing_idx, ingredient in enumerate(recipe.get("ingredients") or []):
            if not isinstance(ingredient, dict):
                errors.append(f"recipe {rid!r}: ingredients[{ing_idx}] must be an object")
            elif not str(ingredient.get("item") or "").strip():
                errors.append(f"recipe {rid!r}: ingredients[{ing_idx}] missing item")

    first_ids = [
        str(recipe.get("id"))
        for recipe in recipes[: len(CURRENT_HOUSE_STANDARD_IDS)]
        if isinstance(recipe, dict)
    ]
    if require_house_order:
        if first_ids != CURRENT_HOUSE_STANDARD_IDS:
            errors.append(
                f"first {len(CURRENT_HOUSE_STANDARD_IDS)} recipes must be the current house-standard order; "
                f"found {first_ids}"
            )
    elif set(first_ids) != set(CURRENT_HOUSE_STANDARD_IDS):
        errors.append(
            f"first {len(CURRENT_HOUSE_STANDARD_IDS)} recipes must be the current house-standard set; "
            f"found {first_ids}"
        )

    marked_house = [str(recipe.get("id")) for recipe in recipes if isinstance(recipe, dict) and recipe.get("houseStandard") is True]
    if require_house_order:
        if marked_house != CURRENT_HOUSE_STANDARD_IDS:
            errors.append(f"houseStandard recipe IDs must match the current house-standard order; found {marked_house}")
    elif set(marked_house) != set(CURRENT_HOUSE_STANDARD_IDS):
        errors.append(f"houseStandard recipe IDs must match the current house-standard set; found {marked_house}")

    for recipe in recipes:
        if not isinstance(recipe, dict):
            continue
        rid = str(recipe.get("id") or "")
        is_house_standard = recipe.get("houseStandard") is True
        if is_house_standard and recipe.get("status") != "LOCKED":
            errors.append(f"recipe {rid!r}: houseStandard recipes must have status 'LOCKED'")
        if recipe.get("status") == "RETIRED" and is_house_standard:
            errors.append(f"recipe {rid!r}: retired recipes cannot be house standards")

    return errors


def build_catalog_from_builtins() -> dict[str, Any]:
    recipes = load_json(BUILTINS_PATH)
    errors = validate_recipes(recipes, require_house_order=False)
    if errors:
        fail(errors)
    recipes = sort_recipes_for_catalog(recipes)
    errors = validate_recipes(recipes)
    if errors:
        fail(errors)

    return {
        "schemaVersion": 2,
        "status": "active",
        "date": "2026-07-27",
        "releaseId": ACTIVE_RELEASE_ID,
        "description": "Canonical structured Riviera recipe database with lifecycle, provenance, aliases, package/event links, allergen review status, scaling basis, Rational settings and operational controls. Edit this file first, then sync riviera_data/builtins.json from it.",
        "authority": {
            "mergeDirection": "GitHub is canonical for structured recipe data; the July 8 overlay and later approved standards supersede historical ChatGPT recipe versions. Drive remains canonical for operations and ChatGPT receives a read-optimised release.",
            "sourceOfTruth": rel(SOURCE_OF_TRUTH_PATH),
            "manifest": rel(MANIFEST_PATH),
            "overlay": rel(OVERLAY_PATH),
            "currentHouseStandardsAdditions": rel(CURRENT_STANDARDS_ADDITIONS_PATH),
            "houseStandardOverlayRecipeIds": JULY_8_OVERLAY_IDS,
            "currentHouseStandardRecipeIds": CURRENT_HOUSE_STANDARD_IDS,
            "initialisedFrom": rel(BUILTINS_PATH),
            "initialisationNote": "Seeded from the verified operational built-ins after ChatGPT source-stack parity was established. From this point forward this catalog is the canonical editable recipe payload.",
        },
        "operationalOutputs": {
            "siteBuiltins": rel(BUILTINS_PATH),
            "recipeCardPdf": rel(PDF_PATH),
            "houseStandardsPdf": rel(HOUSE_STANDARDS_PDF_PATH),
        },
        "recipes": recipes,
    }


def load_catalog() -> dict[str, Any]:
    if not CATALOG_PATH.exists():
        raise SystemExit(f"Missing {rel(CATALOG_PATH)}. Run with --bootstrap-from-builtins once to initialise it.")
    payload = load_json(CATALOG_PATH)
    if not isinstance(payload, dict):
        raise SystemExit(f"{rel(CATALOG_PATH)} must be a JSON object")
    errors = validate_recipes(payload.get("recipes"))
    if payload.get("schemaVersion") != 2:
        errors.append("schemaVersion must be 2")
    if payload.get("releaseId") != ACTIVE_RELEASE_ID:
        errors.append(f"releaseId must be {ACTIVE_RELEASE_ID}")
    authority = payload.get("authority")
    if not isinstance(authority, dict):
        errors.append("authority must be an object")
    else:
        overlay_ids = authority.get("houseStandardOverlayRecipeIds")
        if overlay_ids != JULY_8_OVERLAY_IDS:
            errors.append("authority.houseStandardOverlayRecipeIds must match the July 8 overlay order")
        current_ids = authority.get("currentHouseStandardRecipeIds")
        if current_ids != CURRENT_HOUSE_STANDARD_IDS:
            errors.append("authority.currentHouseStandardRecipeIds must match the current house-standard order")
    if errors:
        fail(errors)
    return payload


def check_builtins_synced(recipes: list[dict[str, Any]]) -> None:
    builtins = load_json(BUILTINS_PATH)
    if builtins == recipes:
        print(
            json.dumps(
                {
                    "status": "ok",
                    "catalog": rel(CATALOG_PATH),
                    "siteBuiltins": rel(BUILTINS_PATH),
                    "recipes": len(recipes),
                    "recipeHash": stable_hash(recipes)[:16],
                },
                indent=2,
            )
        )
        return

    catalog_ids = [str(recipe.get("id")) for recipe in recipes if isinstance(recipe, dict)]
    builtin_ids = [str(recipe.get("id")) for recipe in builtins if isinstance(recipe, dict)] if isinstance(builtins, list) else []
    first_diff = None
    for idx, (left, right) in enumerate(zip(catalog_ids, builtin_ids)):
        if left != right:
            first_diff = f"first differing recipe id at index {idx}: catalog={left!r}, builtins={right!r}"
            break
    if first_diff is None and len(catalog_ids) != len(builtin_ids):
        first_diff = f"recipe count differs: catalog={len(catalog_ids)}, builtins={len(builtin_ids)}"
    fail(
        [
            f"{rel(BUILTINS_PATH)} is not synced from {rel(CATALOG_PATH)}",
            first_diff or "recipe content differs under matching ids",
            f"catalog hash {stable_hash(recipes)[:16]} != builtins hash {stable_hash(builtins)[:16]}",
            "Run: python3 scripts/sync_riviera_recipe_catalog.py --write",
        ]
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bootstrap-from-builtins", action="store_true", help="initialise the catalog from current builtins.json")
    parser.add_argument("--force", action="store_true", help="allow bootstrap to overwrite an existing catalog")
    parser.add_argument("--write", action="store_true", help="write riviera_data/builtins.json from the catalog")
    parser.add_argument("--check", action="store_true", help="check builtins.json matches the catalog (default)")
    args = parser.parse_args()

    if args.bootstrap_from_builtins:
        if CATALOG_PATH.exists() and not args.force:
            raise SystemExit(f"{rel(CATALOG_PATH)} already exists; use --force to rebuild it from builtins")
        catalog = build_catalog_from_builtins()
        changed = write_json_if_changed(CATALOG_PATH, catalog)
        print(json.dumps({"catalog": rel(CATALOG_PATH), "recipes": len(catalog["recipes"]), "changed": changed}, indent=2))
        return 0

    catalog = load_catalog()
    recipes = catalog["recipes"]
    if args.write:
        changed = write_json_if_changed(BUILTINS_PATH, recipes)
        print(json.dumps({"siteBuiltins": rel(BUILTINS_PATH), "recipes": len(recipes), "changed": changed}, indent=2))
        check_builtins_synced(recipes)
        return 0

    check_builtins_synced(recipes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
