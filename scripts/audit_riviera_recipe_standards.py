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
- missing service variants are reported; --all-builtins fails only unregistered gaps
  while explicit NEEDS CONFIRMATION backlog rows remain visible and auditable

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
CATALOG_PATH = ROOT / "riviera_sources" / "current" / "Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json"
MANIFEST_PATH = ROOT / "riviera_sources" / "current" / "manifest.json"
SERVICE_VARIANTS_PATH = ROOT / "riviera_data" / "service_variants.json"
SERVICE_VARIANTS_ADDON_GLOB = "service_variants_*.json"
SERVICE_VARIANT_OVERRIDES_PATH = ROOT / "riviera_data" / "service_variant_source_overrides.json"
SERVICE_VARIANT_BACKLOG_PATH = ROOT / "riviera_data" / "service_variant_backlog.json"
CANONICAL_ALIASES_PATH = ROOT / "riviera_data" / "canonical_recipe_aliases.json"
FUNCTION_PACKAGES_PATH = ROOT / "riviera_data" / "function_packages.json"
RECIPE_USE_LINKS_PATH = ROOT / "riviera_data" / "recipe_use_links.json"
ACTIVE_RELEASE_ID = "RIV-KNOWLEDGE-V15.2"

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

EXPECTED_LIFECYCLE = {
    "arancini": "LOCKED",
    "potato-pave": "LOCKED",
    "riviera-emulsion": "LOCKED",
    "house-scones": "LOCKED",
    "veal-meatballs": "LOCKED",
    "baklava-cheesecake": "LOCKED",
    "house-focaccia": "LOCKED",
    "burnt-butter-mash": "LOCKED",
    "natural-oysters-prosecco-fennel-orange": "TRIAL ONLY",
    "warm-oysters-lemon-oregano-caper": "TRIAL ONLY",
    "oyster-saganaki": "TRIAL ONLY",
    "sicilian-gratin-oysters": "TRIAL ONLY",
    "harissa-oysters-preserved-lemon": "TRIAL ONLY",
    "riviera-blondies-working": "ACTIVE WORKING",
    "flourless-chocolate-torte-working": "ACTIVE WORKING",
    "beef-polpette-canape": "RETIRED",
    "slow-cooked-beef-albondigas-buffet": "RETIRED",
}

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
        status = r.get("status")
        if status not in RECIPE_STATUSES:
            errors.append(f"Recipe {rid!r}: invalid lifecycle status {status!r}")
        version = r.get("version")
        if not isinstance(version, str) or not version.strip():
            errors.append(f"Recipe {rid!r}: version must be a non-empty string")
        provenance = r.get("provenance")
        if not isinstance(provenance, dict):
            errors.append(f"Recipe {rid!r}: provenance must be an object")
        else:
            for key in ("source", "sourceDate", "scope"):
                if not isinstance(provenance.get(key), str) or not provenance[key].strip():
                    errors.append(f"Recipe {rid!r}: provenance.{key} must be a non-empty string")
        flags = r.get("confirmationFlags")
        if not isinstance(flags, list) or any(not isinstance(flag, str) or not flag.strip() for flag in flags):
            errors.append(f"Recipe {rid!r}: confirmationFlags must be an array of non-empty strings")
            flags = []
        aliases = r.get("aliases")
        if not isinstance(aliases, list) or any(
            not isinstance(alias, str) or not alias.strip() for alias in aliases
        ):
            errors.append(f"Recipe {rid!r}: aliases must be an array of non-empty strings")
        links = r.get("links")
        if not isinstance(links, dict):
            errors.append(f"Recipe {rid!r}: links must be an object")
        else:
            for link_kind in ("packages", "events"):
                rows = links.get(link_kind)
                if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
                    errors.append(f"Recipe {rid!r}: links.{link_kind} must be an array of objects")
        allergens = r.get("allergens")
        if not isinstance(allergens, dict):
            errors.append(f"Recipe {rid!r}: allergens must be an object")
        else:
            if allergens.get("status") not in CONTROL_STATUSES:
                errors.append(f"Recipe {rid!r}: allergens.status is invalid")
            for allergen_key in ("contains", "mayContain"):
                values = allergens.get(allergen_key)
                if not isinstance(values, list) or any(
                    not isinstance(value, str) or not value.strip() for value in values
                ):
                    errors.append(
                        f"Recipe {rid!r}: allergens.{allergen_key} must be an array of non-empty strings"
                    )
            if not isinstance(allergens.get("notes"), str):
                errors.append(f"Recipe {rid!r}: allergens.notes must be a string")
            if allergens.get("status") == "NEEDS CONFIRMATION" and not any(
                "allergen" in str(flag).lower() for flag in flags
            ):
                errors.append(f"Recipe {rid!r}: unresolved allergens require an allergen confirmation flag")
        controls = r.get("controls")
        if not isinstance(controls, dict):
            errors.append(f"Recipe {rid!r}: controls must be an object")
        else:
            unresolved_controls = False
            for control_key in ("cooling", "holding", "packing", "service"):
                control = controls.get(control_key)
                if not isinstance(control, dict):
                    errors.append(f"Recipe {rid!r}: controls.{control_key} must be an object")
                    continue
                if control.get("status") not in CONTROL_STATUSES:
                    errors.append(f"Recipe {rid!r}: controls.{control_key}.status is invalid")
                steps = control.get("steps")
                if not isinstance(steps, list) or any(
                    not isinstance(step, str) or not step.strip() for step in steps
                ):
                    errors.append(
                        f"Recipe {rid!r}: controls.{control_key}.steps must be an array of non-empty strings"
                    )
                if control.get("status") == "SOURCE RECORDED" and not steps:
                    errors.append(f"Recipe {rid!r}: source-recorded {control_key} controls require steps")
                if control.get("status") == "NEEDS CONFIRMATION":
                    unresolved_controls = True
            service_control = controls.get("service")
            if isinstance(service_control, dict) and service_control.get("steps") != r.get("service"):
                errors.append(f"Recipe {rid!r}: controls.service.steps must match service")
            if unresolved_controls and not any(
                "control" in str(flag).lower() for flag in flags
            ):
                errors.append(f"Recipe {rid!r}: unresolved controls require a confirmation flag")
        scaling = r.get("scalingBasis")
        if not isinstance(scaling, dict):
            errors.append(f"Recipe {rid!r}: scalingBasis must be an object")
        else:
            if scaling.get("status") not in CONTROL_STATUSES:
                errors.append(f"Recipe {rid!r}: scalingBasis.status is invalid")
            for key in ("basis", "baseYield", "notes"):
                if not isinstance(scaling.get(key), str):
                    errors.append(f"Recipe {rid!r}: scalingBasis.{key} must be a string")
            if scaling.get("status") == "SOURCE RECORDED" and not scaling.get("basis", "").strip():
                errors.append(f"Recipe {rid!r}: source-recorded scalingBasis requires basis")
            if scaling.get("status") == "NEEDS CONFIRMATION" and not any(
                "scaling" in str(flag).lower() for flag in flags
            ):
                errors.append(f"Recipe {rid!r}: unresolved scalingBasis requires a confirmation flag")
        rational = r.get("rationalSettings")
        if not isinstance(rational, dict):
            errors.append(f"Recipe {rid!r}: rationalSettings must be an object")
        else:
            if rational.get("status") not in CONTROL_STATUSES:
                errors.append(f"Recipe {rid!r}: rationalSettings.status is invalid")
            stages = rational.get("stages")
            if not isinstance(stages, list) or any(not isinstance(stage, dict) for stage in stages):
                errors.append(f"Recipe {rid!r}: rationalSettings.stages must be an array of objects")
            if not isinstance(rational.get("notes"), str):
                errors.append(f"Recipe {rid!r}: rationalSettings.notes must be a string")
            if rational.get("status") == "NEEDS CONFIRMATION" and not any(
                "rational" in str(flag).lower() for flag in flags
            ):
                errors.append(f"Recipe {rid!r}: unresolved rationalSettings requires a confirmation flag")
        if r.get("houseStandard") is True and status != "LOCKED":
            errors.append(f"Recipe {rid!r}: houseStandard recipes must have status 'LOCKED'")
        if status == "RETIRED" and r.get("houseStandard") is True:
            errors.append(f"Recipe {rid!r}: retired recipes cannot be house standards")
    return errors


def is_food_portion_recipe(r: dict[str, Any]) -> bool:
    if r.get("status") in {"TRIAL ONLY", "RETIRED"}:
        return False
    rtype = str(r.get("type") or "").strip()
    course = str(r.get("course") or "").strip()
    if rtype in NON_PORTION_RECIPE_TYPES or course in NON_PORTION_COURSES:
        return False
    if not r.get("ingredients"):
        return False
    return True


def validate_locked_corrections(
    recipes_by_id: dict[str, dict[str, Any]],
    service_variants: dict[str, Any],
) -> list[str]:
    errors: list[str] = []

    arancini = recipes_by_id.get("arancini", {})
    if "60 g canapé / 40 g tapas / 40 g entrée" not in str(arancini.get("yield") or ""):
        errors.append("arancini: lifecycle release yield must show 60 g canapé and 40 g tapas/entrée")
    arancini_variants = service_variants.get("arancini", {})
    expected_arancini = {"cocktail": 60, "tapas": 40, "plated_entree": 40}
    for variant, expected_weight in expected_arancini.items():
        record = arancini_variants.get(variant, {}) if isinstance(arancini_variants, dict) else {}
        if record.get("piece_weight_g_pre_crumb") != expected_weight:
            errors.append(
                f"arancini.{variant}: expected piece_weight_g_pre_crumb={expected_weight}"
            )

    polpette = recipes_by_id.get("veal-meatballs", {})
    if polpette.get("yield") != "90 balls @ 80 g; 30 tapas serves of 3":
        errors.append("veal-meatballs: locked yield must be 90 balls @ 80 g; 30 tapas serves of 3")
    polpette_variants = service_variants.get("veal-meatballs", {})
    for variant in ("tapas", "cocktail", "plated_main", "plated_entree", "buffet"):
        record = polpette_variants.get(variant, {}) if isinstance(polpette_variants, dict) else {}
        if record.get("piece_weight_g_pre_crumb") != 80:
            errors.append(f"veal-meatballs.{variant}: expected locked piece weight 80 g")

    emulsion = recipes_by_id.get("riviera-emulsion", {})
    if emulsion.get("yield") != "Approx. 2.4 L batch":
        errors.append("riviera-emulsion: locked yield must be Approx. 2.4 L batch")

    scones = recipes_by_id.get("house-scones", {})
    scone_mix = next(
        (
            ingredient
            for ingredient in scones.get("ingredients", [])
            if isinstance(ingredient, dict) and ingredient.get("item") == "Scone Mix"
        ),
        {},
    )
    if scone_mix.get("qty") != "1.08 kg":
        errors.append("house-scones: locked mix quantity must be 1.08 kg")
    scone_method = " ".join(str(step) for step in scones.get("method_steps", []))
    if "200°C for 12 minutes" not in scone_method or "160°C" not in scone_method:
        errors.append("house-scones: locked two-stage bake must be present")

    potato = recipes_by_id.get("potato-pave", {})
    if potato.get("yield") != "1 tray = 36 triangular serves":
        errors.append("potato-pave: locked yield must be 36 triangular serves")
    if not any(
        isinstance(ingredient, dict) and ingredient.get("item") == "Shortening"
        for ingredient in potato.get("ingredients", [])
    ):
        errors.append("potato-pave: locked shortening standard is missing")

    baklava = recipes_by_id.get("baklava-cheesecake", {})
    if baklava.get("yield") != "100 portions · 2 × 1/1 GN at 40 + 1 × 1/2 GN at 20":
        errors.append("baklava-cheesecake: locked GN production yield is missing")
    expected_baklava_flags = {
        "Confirm exact pecan, walnut, pistachio, cinnamon and butter weights per tray.",
        "Confirm the exact half-GN filo layout.",
        "Confirm the final locked bake time after the next full production run.",
    }
    if not expected_baklava_flags.issubset(set(baklava.get("confirmationFlags") or [])):
        errors.append("baklava-cheesecake: expected locked formula confirmation flags are missing")

    return errors


def build_expected_recipe_links(packages_raw: Any) -> dict[str, dict[str, list[dict[str, str]]]]:
    expected: dict[str, dict[str, list[dict[str, str]]]] = {}
    packages = packages_raw.get("packages", []) if isinstance(packages_raw, dict) else []
    for package in packages:
        if not isinstance(package, dict):
            continue
        package_id = str(package.get("id") or "").strip()
        package_label = str(package.get("label") or package_id).strip()
        event_row = {"eventTypeId": package_id, "label": package_label}
        for section in package.get("sections", []) or []:
            if not isinstance(section, dict):
                continue
            section_id = str(section.get("id") or "").strip()
            section_label = str(section.get("label") or section_id).strip()
            for course in section.get("courses", []) or []:
                if not isinstance(course, dict):
                    continue
                course_label = str(course.get("course") or "").strip()
                for item in course.get("items", []) or []:
                    if not isinstance(item, dict):
                        continue
                    recipe_id = str(item.get("recipeId") or "").strip()
                    if not recipe_id:
                        continue
                    row = {
                        "packageId": package_id,
                        "packageLabel": package_label,
                        "sectionId": section_id,
                        "sectionLabel": section_label,
                        "course": course_label,
                        "item": str(item.get("name") or "").strip(),
                    }
                    record = expected.setdefault(recipe_id, {"packages": [], "events": []})
                    if row not in record["packages"]:
                        record["packages"].append(row)
                    if event_row not in record["events"]:
                        record["events"].append(event_row)
    return expected


def merge_supplemental_recipe_links(
    expected: dict[str, dict[str, list[dict[str, str]]]],
    use_links_raw: Any,
    recipes_by_id: dict[str, dict[str, Any]],
    errors: list[str],
) -> None:
    if not isinstance(use_links_raw, dict):
        errors.append("recipe_use_links.json: root must be an object")
        return
    if use_links_raw.get("releaseId") != ACTIVE_RELEASE_ID:
        errors.append(f"recipe_use_links.json releaseId must be {ACTIVE_RELEASE_ID}")
    uses = use_links_raw.get("links")
    if not isinstance(uses, list):
        errors.append("recipe_use_links.json: links must be an array")
        return
    for index, use in enumerate(uses):
        if not isinstance(use, dict):
            errors.append(f"recipe_use_links.json: links[{index}] must be an object")
            continue
        event_row = {
            "eventTypeId": str(use.get("eventTypeId") or "").strip(),
            "label": str(use.get("label") or "").strip(),
        }
        for recipe_id in use.get("recipeIds") or []:
            recipe_id = str(recipe_id).strip()
            recipe = recipes_by_id.get(recipe_id)
            if recipe is None:
                errors.append(
                    f"recipe_use_links.json: {use.get('useId')!r} references missing recipe {recipe_id!r}"
                )
                continue
            package_row = {
                "packageId": str(use.get("packageId") or "").strip(),
                "packageLabel": str(use.get("packageLabel") or "").strip(),
                "sectionId": str(use.get("sectionId") or "").strip(),
                "sectionLabel": str(use.get("sectionLabel") or "").strip(),
                "course": str(use.get("course") or "").strip(),
                "item": str(recipe.get("name") or "").strip(),
            }
            record = expected.setdefault(recipe_id, {"packages": [], "events": []})
            if package_row not in record["packages"]:
                record["packages"].append(package_row)
            if event_row not in record["events"]:
                record["events"].append(event_row)


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
    *,
    override_existing: bool = False,
) -> None:
    def deep_override(current: dict[str, Any], replacement: dict[str, Any]) -> None:
        for key, value in replacement.items():
            existing_value = current.get(key)
            if isinstance(existing_value, dict) and isinstance(value, dict):
                deep_override(existing_value, value)
            else:
                current[key] = value

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
                if override_existing:
                    current = existing[variant_key]
                    if isinstance(current, dict) and isinstance(variant_record, dict):
                        deep_override(current, variant_record)
                    else:
                        existing[variant_key] = variant_record
                    continue
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

    if SERVICE_VARIANT_OVERRIDES_PATH.is_file():
        source_paths.append(SERVICE_VARIANT_OVERRIDES_PATH)
        override_raw = load_json(SERVICE_VARIANT_OVERRIDES_PATH)
        if not isinstance(override_raw, dict):
            errors.append(f"{rel(SERVICE_VARIANT_OVERRIDES_PATH)}: root must be an object")
        else:
            override_variants = override_raw.get("service_variants", {})
            if not isinstance(override_variants, dict):
                errors.append(
                    f"{rel(SERVICE_VARIANT_OVERRIDES_PATH)}: service_variants must be an object"
                )
            else:
                merge_service_variants(
                    merged,
                    override_variants,
                    SERVICE_VARIANT_OVERRIDES_PATH,
                    errors,
                    override_existing=True,
                )

    return service_raw, merged, source_paths, errors


def validate_service_variant_backlog(
    raw: Any,
    recipe_ids: set[str],
    errors: list[str],
) -> set[str]:
    declared: set[str] = set()
    if not isinstance(raw, dict):
        errors.append("service_variant_backlog.json: root must be an object")
        return declared
    if raw.get("releaseId") != ACTIVE_RELEASE_ID:
        errors.append(f"service_variant_backlog.json releaseId must be {ACTIVE_RELEASE_ID}")
    if raw.get("status") != "ACTIVE WORKING":
        errors.append("service_variant_backlog.json status must be ACTIVE WORKING")
    if not isinstance(raw.get("policy"), str) or not raw["policy"].strip():
        errors.append("service_variant_backlog.json policy must be a non-empty string")
    rows = raw.get("backlog")
    if not isinstance(rows, list):
        errors.append("service_variant_backlog.json backlog must be an array")
        return declared
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f"service_variant_backlog.json backlog[{index}] must be an object")
            continue
        recipe_id = str(row.get("recipeId") or "").strip()
        if not recipe_id:
            errors.append(f"service_variant_backlog.json backlog[{index}] missing recipeId")
            continue
        if recipe_id in declared:
            errors.append(f"service_variant_backlog.json duplicate recipeId {recipe_id!r}")
        declared.add(recipe_id)
        if recipe_id not in recipe_ids:
            errors.append(f"service_variant_backlog.json references missing recipe {recipe_id!r}")
        if row.get("status") != "NEEDS CONFIRMATION":
            errors.append(
                f"service_variant_backlog.json {recipe_id!r} status must be NEEDS CONFIRMATION"
            )
    return declared


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
    parser.add_argument(
        "--all-builtins",
        action="store_true",
        help="also fail strict mode when an active food recipe lacks both a service variant and a declared NEEDS CONFIRMATION backlog row",
    )
    args = parser.parse_args()

    recipes_raw = load_json(BUILTINS_PATH)
    service_raw, service_variants, service_variant_paths, service_variant_errors = load_service_variant_bundle()
    aliases_raw = load_json(CANONICAL_ALIASES_PATH)
    packages_raw = load_json(FUNCTION_PACKAGES_PATH)
    use_links_raw = load_json(RECIPE_USE_LINKS_PATH)
    service_variant_backlog_raw = load_json(SERVICE_VARIANT_BACKLOG_PATH)
    catalog_raw = load_json(CATALOG_PATH)
    manifest_raw = load_json(MANIFEST_PATH)

    if not isinstance(recipes_raw, list):
        print("ERROR: builtins.json must be a list", file=sys.stderr)
        return 1
    recipes = [r for r in recipes_raw if isinstance(r, dict)]
    recipe_ids = {str(r.get("id", "")).strip() for r in recipes}
    recipes_by_id = {str(r.get("id", "")).strip(): r for r in recipes}

    errors = validate_builtin_shape(recipes)
    errors.extend(service_variant_errors)
    declared_variant_backlog = validate_service_variant_backlog(
        service_variant_backlog_raw,
        recipe_ids,
        errors,
    )
    if not isinstance(catalog_raw, dict) or catalog_raw.get("releaseId") != ACTIVE_RELEASE_ID:
        errors.append(f"Structured catalog releaseId must be {ACTIVE_RELEASE_ID}")
    if not isinstance(manifest_raw, dict) or manifest_raw.get("releaseId") != ACTIVE_RELEASE_ID:
        errors.append(f"Recipe bundle manifest releaseId must be {ACTIVE_RELEASE_ID}")
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

    for rid, expected_status in EXPECTED_LIFECYCLE.items():
        recipe = recipes_by_id.get(rid)
        if recipe is None:
            errors.append(f"Required Riviera lifecycle recipe {rid!r} is missing")
            continue
        if recipe.get("status") != expected_status:
            errors.append(
                f"Recipe {rid!r}: expected lifecycle status {expected_status!r}, "
                f"found {recipe.get('status')!r}"
            )

    for key, rec in canonical_recipes.items():
        if not isinstance(rec, dict):
            errors.append(f"canonical_recipes.{key}: must be object")
            continue
        canonical_id = rec.get("canonical_id")
        if canonical_id not in recipe_ids:
            errors.append(f"canonical_recipes.{key}: canonical_id {canonical_id!r} missing from builtins")
        else:
            stored_aliases = set(recipes_by_id[canonical_id].get("aliases") or [])
            mapped_aliases = {
                str(alias).strip()
                for alias in rec.get("aliases", []) or []
                if str(alias).strip()
            }
            if not mapped_aliases.issubset(stored_aliases):
                missing_aliases = sorted(mapped_aliases - stored_aliases)
                errors.append(
                    f"canonical_recipes.{key}: aliases missing from recipe {canonical_id!r}: "
                    + ", ".join(missing_aliases)
                )
        for dup in rec.get("duplicate_recipe_ids", []) or []:
            if dup in recipe_ids and recipe_redirects.get(dup) != canonical_id:
                errors.append(f"Duplicate recipe id {dup!r} exists in builtins but does not redirect to {canonical_id!r}")

    expected_links = build_expected_recipe_links(packages_raw)
    merge_supplemental_recipe_links(expected_links, use_links_raw, recipes_by_id, errors)
    for recipe in recipes:
        rid = str(recipe.get("id") or "")
        actual_links = recipe.get("links")
        expected = expected_links.get(rid, {"packages": [], "events": []})
        if actual_links != expected:
            errors.append(f"Recipe {rid!r}: package/event links drifted from function_packages.json")

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
    missing_variant_ids = {row[0] for row in missing_variants}
    unregistered_missing_variants = [
        row for row in missing_variants if row[0] not in declared_variant_backlog
    ]
    stale_backlog_ids = sorted(declared_variant_backlog - missing_variant_ids)
    if stale_backlog_ids:
        errors.append(
            "service_variant_backlog.json contains recipes that now have coverage: "
            + ", ".join(stale_backlog_ids)
        )

    needs_confirmation, missing_status, not_recommended = service_variant_review(service_raw, service_variants, errors)
    errors.extend(validate_locked_corrections(recipes_by_id, service_variants))

    print("RIVIERA RECIPE STANDARDS AUDIT")
    print("=" * 36)
    print(f"Built-in recipes: {len(recipes)}")
    print(f"Service variant files: {len(service_variant_paths)}")
    for path in service_variant_paths:
        print(f"- {rel(path)}")
    print(f"Service variant records: {len(service_variants)}")
    print(f"Declared NEEDS CONFIRMATION backlog: {len(declared_variant_backlog)}")
    print(f"Canonical recipe groups: {len(canonical_recipes)}")
    print(f"Recipe redirects: {len(recipe_redirects)}")
    print(f"Strict missing variant scope: {'all builtins' if args.all_builtins else 'service variants only'}")
    print()

    print("RECIPE LIFECYCLE")
    print("-" * 16)
    for status in ("LOCKED", "ACTIVE WORKING", "TRIAL ONLY", "RETIRED"):
        count = sum(1 for recipe in recipes if recipe.get("status") == status)
        print(f"{status.lower()}: {count}")
    flagged = [recipe for recipe in recipes if recipe.get("confirmationFlags")]
    print(f"recipes_with_confirmation_flags: {len(flagged)}")
    for recipe in flagged:
        print(f"- {recipe.get('id')}: {len(recipe.get('confirmationFlags') or [])}")
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
            status = (
                "DECLARED NEEDS CONFIRMATION"
                if rid in declared_variant_backlog
                else "UNREGISTERED GAP"
            )
            print(f"- {rid}: {name} [{rtype}] — yield: {yld} — {status}")
    else:
        print("None")
    print()

    print("UNREGISTERED SERVICE-VARIANT GAPS")
    print("-" * 33)
    if unregistered_missing_variants:
        for rid, name, rtype, yld in unregistered_missing_variants:
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
        strict_blockers = strict_blockers or bool(unregistered_missing_variants)

    if errors or (args.strict and strict_blockers):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
