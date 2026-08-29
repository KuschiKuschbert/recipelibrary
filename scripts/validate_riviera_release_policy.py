#!/usr/bin/env python3
"""Validate locked Riviera v15.2 package, buffer and recipe-release policy."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "riviera_data"
CATALOG_PATH = (
    ROOT
    / "riviera_sources"
    / "current"
    / "Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json"
)
PACKAGES_PATH = DATA_DIR / "function_packages.json"
SERVICE_VARIANT_PATHS = tuple(
    DATA_DIR / filename
    for filename in (
        "service_variants.json",
        "service_variants_canapes.json",
        "service_variants_corporate.json",
        "service_variants_mains_sides.json",
    )
)
PLANNER_SCALE_PATH = ROOT / "assets" / "planner-scale.js"
RELEASE_ID = "RIV-KNOWLEDGE-V15.2"

EVENT_SERVICE_KEYS = {
    "buffet",
    "cocktail",
    "dessert_buffet",
    "plated_dessert",
    "plated_entree",
    "plated_main",
    "roving_dessert",
}
FIXED_SERVICE_KEYS = {"corporate_boxed", "high_tea", "platter"}
EXCLUDED_SERVICE_KEYS = {"tapas"}
EXPECTED_BUFFERED_RECORDS = 69
EXPECTED_LIFECYCLE_COUNTS = {
    "LOCKED": 22,
    "ACTIVE WORKING": 128,
    "TRIAL ONLY": 5,
    "RETIRED": 2,
}
FOCACCIA_INCLUDED_SECTIONS = {
    "weddings.taormina",
    "weddings.amalfi",
    "weddings.la_tavola",
    "corporate.corporate_buffet",
    "offsite.carvery_buffet",
    "offsite.bbq_buffet",
    "offsite.plated_meals",
    "offsite.feasting",
}
FOCACCIA_EXCLUDED_SECTIONS = {
    "weddings.gyros",
    "offsite.gyros_offsite",
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def expect(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def section(packages: dict[str, Any], package_id: str, section_id: str) -> dict[str, Any]:
    for package in packages.get("packages") or []:
        if package.get("id") != package_id:
            continue
        for row in package.get("sections") or []:
            if row.get("id") == section_id:
                return row
    return {}


def package_items(packages: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        item
        for package in packages.get("packages") or []
        for package_section in package.get("sections") or []
        for course in package_section.get("courses") or []
        for item in course.get("items") or []
        if isinstance(item, dict)
    ]


def recipe_map(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(recipe.get("id")): recipe
        for recipe in catalog.get("recipes") or []
        if isinstance(recipe, dict) and recipe.get("id")
    }


def scan_for_forbidden_fields(
    value: Any,
    path: str,
    errors: list[str],
) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key == "production_buffer_multiplier":
                errors.append(f"{child_path}: obsolete buffer field is forbidden")
            if key.startswith("production_") and key.endswith("_per_guest"):
                errors.append(f"{child_path}: derived production-per-guest field is forbidden")
            scan_for_forbidden_fields(child, child_path, errors)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            scan_for_forbidden_fields(child, f"{path}[{index}]", errors)


def validate_buffer_policy(errors: list[str]) -> None:
    buffered_records = 0
    for path in SERVICE_VARIANT_PATHS:
        payload = load_json(path)
        policy = payload.get("buffer_policy") or {}
        expect(policy.get("releaseId") == RELEASE_ID, f"{path.name}: release ID drift", errors)
        expect(policy.get("eventMultiplier") == 1.09, f"{path.name}: event buffer must be 1.09", errors)
        expect(policy.get("applyOnce") is True, f"{path.name}: event buffer must apply once", errors)
        expect(
            set(policy.get("eventServiceKeys") or []) == EVENT_SERVICE_KEYS,
            f"{path.name}: event service-key policy drift",
            errors,
        )
        expect(
            policy.get("fixedModuleMultiplier") == 1.0,
            f"{path.name}: fixed-module multiplier must be 1.0",
            errors,
        )
        expect(
            set(policy.get("fixedModuleServiceKeys") or []) == FIXED_SERVICE_KEYS,
            f"{path.name}: fixed-module service-key policy drift",
            errors,
        )
        expect(
            set(policy.get("excludedServiceKeys") or []) == EXCLUDED_SERVICE_KEYS,
            f"{path.name}: excluded service-key policy drift",
            errors,
        )
        scan_for_forbidden_fields(payload, path.name, errors)

        variants = payload.get("service_variants") or {}
        for recipe_id, service_rows in variants.items():
            if not isinstance(service_rows, dict):
                continue
            for service_key, record in service_rows.items():
                if not isinstance(record, dict) or "automatic_event_buffer_multiplier" not in record:
                    continue
                buffered_records += 1
                multiplier = record.get("automatic_event_buffer_multiplier")
                row_label = f"{path.name}:{recipe_id}.{service_key}"
                if service_key in EVENT_SERVICE_KEYS:
                    expect(multiplier == 1.09, f"{row_label}: event multiplier must be 1.09", errors)
                elif service_key in FIXED_SERVICE_KEYS:
                    expect(multiplier == 1.0, f"{row_label}: fixed multiplier must be 1.0", errors)
                elif service_key in EXCLUDED_SERVICE_KEYS:
                    errors.append(f"{row_label}: Sunday Tapas must not have an automatic buffer")
                else:
                    errors.append(f"{row_label}: multiplier is attached to an undeclared service key")

    expect(
        buffered_records == EXPECTED_BUFFERED_RECORDS,
        f"expected {EXPECTED_BUFFERED_RECORDS} explicit planner buffer records, found {buffered_records}",
        errors,
    )

    planner = PLANNER_SCALE_PATH.read_text(encoding="utf-8")
    for marker in (
        "'afternoon tea': 'high_tea'",
        "'high tea': 'high_tea'",
        "'sunday tapas': 'tapas'",
        "rec.automatic_event_buffer_multiplier",
        "(pax * ppg * buffer) / basePieces",
        "(pax * buffer) / basePieces",
    ):
        expect(marker in planner, f"planner-scale.js missing buffer marker: {marker}", errors)
    expect(
        "production_buffer_multiplier" not in planner,
        "planner-scale.js still reads the obsolete production buffer",
        errors,
    )


def validate_feasting(packages: dict[str, Any], errors: list[str]) -> None:
    standards = packages.get("operationalStandards") or {}
    feasting = standards.get("feasting") or {}
    expect(feasting.get("status") == "LOCKED", "Feasting scaling standard must be LOCKED", errors)
    expect(feasting.get("sourceRef") == "FEAST-001 v1.2", "Feasting source reference drift", errors)

    protein = feasting.get("selectedProteinPortions") or {}
    expect(
        protein.get("formula") == "ceil(guestCount * 4 / 3)",
        "Feasting selected-protein formula drift",
        errors,
    )
    expect(
        protein.get("example") == {"guestCount": 90, "portions": 120},
        "Feasting 90-guest example must produce 120 portions",
        errors,
    )
    expect(
        protein.get("standardEventBufferAlreadyIncluded") is True
        and protein.get("additionalStandardNinePercentBuffer") is False,
        "Feasting uplift must replace, not stack with, the standard 9% buffer",
        errors,
    )

    dietary = feasting.get("dietaryAlternatives") or {}
    expect(
        dietary.get("basis") == "exact confirmed count"
        and dietary.get("includedInSelectedProteinPortions") is False,
        "Feasting dietary alternatives must stay outside the shared protein total",
        errors,
    )
    beans = feasting.get("frenchGreenBeans") or {}
    expect(
        beans.get("rawKgPerGuests") == {"kilograms": 10, "guestCount": 90},
        "Feasting French-green-bean raw standard drift",
        errors,
    )

    feast_section = section(packages, "offsite", "feasting")
    rules = feast_section.get("operationalRules") or {}
    expect(
        rules.get("feastingScalingRef") == "operationalStandards.feasting",
        "Offsite feasting package must reference the locked scaling standard",
        errors,
    )
    lines = rules.get("displayLines") or []
    expect(
        any("90 guests = 120 portions" in str(line) for line in lines),
        "Feasting package must display the 90-to-120 example",
        errors,
    )
    expect(
        any("do not add the standard 9%" in str(line) for line in lines),
        "Feasting package must display the no-double-buffer control",
        errors,
    )

    planner = PLANNER_SCALE_PATH.read_text(encoding="utf-8")
    expect(
        "'shared feast': 'feasting'" in planner,
        "Shared-feast planner style must not fall back to buffered buffet scaling",
        errors,
    )


def validate_high_tea(
    packages: dict[str, Any],
    recipes: dict[str, dict[str, Any]],
    errors: list[str],
) -> None:
    high_tea = section(packages, "baby_shower", "high_tea")
    rules = high_tea.get("operationalRules") or {}
    expect(rules.get("status") == "LOCKED", "High Tea operational standard must be LOCKED", errors)
    expect(
        rules.get("countMode") == "fixed_per_confirmed_guest",
        "High Tea must count per confirmed guest",
        errors,
    )
    expect(
        rules.get("automaticEventBufferMultiplier") == 1.0,
        "High Tea must have no automatic event buffer",
        errors,
    )
    expected_lines = [
        "2 sandwich fingers per guest: 1 cream-cheese-and-cucumber; 1 curried-egg-and-lettuce.",
        "1 chorizo and roasted-capsicum arancini per guest with romesco and lemon-thyme aioli.",
        "1 small scone per guest with jam, lemon curd and whipped cream.",
        "2 small sweets per guest: petit fours when available; otherwise 1 pistachio slice and 1 Cherry Ripe slice.",
        "Unlimited tea and coffee with high-tea china.",
        "No automatic event buffer.",
    ]
    expect(rules.get("displayLines") == expected_lines, "High Tea display standard drift", errors)

    high_tea_items = {
        item.get("recipeId"): item
        for course in high_tea.get("courses") or []
        for item in course.get("items") or []
        if isinstance(item, dict) and item.get("recipeId")
    }
    ribbon = high_tea_items.get("ribbon-sandwiches") or {}
    expect(ribbon.get("quantityPerGuest") == 2, "High Tea needs two sandwich fingers per guest", errors)
    expect(
        ribbon.get("allocation")
        == [
            "1 cream-cheese-and-cucumber finger",
            "1 curried-egg-and-lettuce finger",
        ],
        "High Tea ribbon-sandwich allocation drift",
        errors,
    )
    arancini = high_tea_items.get("arancini") or {}
    expect(arancini.get("quantityPerGuest") == 1, "High Tea needs one arancini per guest", errors)
    expect(
        arancini.get("components") == ["Romesco", "Lemon-Thyme Aioli"],
        "High Tea arancini sauces drift",
        errors,
    )
    scone = high_tea_items.get("house-scones") or {}
    expect(scone.get("quantityPerGuest") == 1, "High Tea needs one small scone per guest", errors)
    expect(
        scone.get("components") == ["Jam", "Lemon curd", "Whipped cream"],
        "High Tea scone condiments drift",
        errors,
    )
    sweets = high_tea_items.get("sweet-petit-fours") or {}
    expect(sweets.get("quantityPerGuest") == 2, "High Tea needs two small sweets per guest", errors)
    expect(
        "one pistachio slice and one Cherry Ripe slice"
        in str(sweets.get("selectionRule") or ""),
        "High Tea sweet fallback drift",
        errors,
    )
    tea_rows = [
        item
        for course in high_tea.get("courses") or []
        for item in course.get("items") or []
        if "Unlimited Tea & Coffee" in str(item.get("name") or "")
    ]
    expect(len(tea_rows) == 1, "High Tea tea-and-coffee inclusion is missing", errors)
    expect(
        bool(tea_rows) and "recipeId" not in tea_rows[0],
        "High Tea tea-and-coffee inclusion must not use a placeholder recipe",
        errors,
    )

    base_variants = load_json(SERVICE_VARIANT_PATHS[0])
    variant_rows = base_variants.get("service_variants") or {}
    expected_per_guest = {
        "ribbon-sandwiches": 2,
        "arancini": 1,
        "house-scones": 1,
        "sweet-petit-fours": 2,
    }
    declared_keys = set((base_variants.get("rules") or {}).get("special_variant_keys") or [])
    expect("high_tea" in declared_keys, "high_tea must be a declared service-variant key", errors)
    for recipe_id, per_guest in expected_per_guest.items():
        package_item = high_tea_items.get(recipe_id) or {}
        service_record = (variant_rows.get(recipe_id) or {}).get("high_tea") or {}
        expect(
            package_item.get("quantityPerGuest") == per_guest,
            f"{recipe_id}: High Tea package count drift",
            errors,
        )
        expect(
            package_item.get("automaticEventBufferMultiplier") == 1.0,
            f"{recipe_id}: High Tea package buffer must be 1.0",
            errors,
        )
        expect(
            service_record.get("pieces_per_guest") == per_guest,
            f"{recipe_id}.high_tea: service count drift",
            errors,
        )
        expect(
            service_record.get("automatic_event_buffer_multiplier") == 1.0,
            f"{recipe_id}.high_tea: automatic buffer must be 1.0",
            errors,
        )
        expect(
            service_record.get("status") == "confirmed",
            f"{recipe_id}.high_tea: sourced service count must be confirmed",
            errors,
        )
        for guests in (12, 100):
            expect(
                guests * service_record.get("pieces_per_guest", 0) == guests * per_guest,
                f"{recipe_id}.high_tea: {guests}-guest service-target regression",
                errors,
            )
    expect(
        ((variant_rows.get("arancini") or {}).get("high_tea") or {}).get(
            "ingredient_scaling_status"
        )
        == "NEEDS CONFIRMATION",
        "arancini High Tea ingredient scaling must remain NEEDS CONFIRMATION until batch yield is locked",
        errors,
    )

    planner_scale = PLANNER_SCALE_PATH.read_text(encoding="utf-8")
    for marker in (
        "return null;",
        "rec.ingredient_scaling_status",
        "if (factor == null) return 'NEEDS CONFIRMATION';",
    ):
        expect(marker in planner_scale, f"planner-scale.js missing unscalable marker: {marker}", errors)
    prep_sheet = (ROOT / "assets" / "package-prep-sheet.js").read_text(encoding="utf-8")
    for marker in ("Service target", "Ingredient scale", "ingredient scaling NEEDS CONFIRMATION"):
        expect(marker in prep_sheet, f"package-prep-sheet.js missing High Tea marker: {marker}", errors)

    for recipe_id, expected_yield in (
        ("ribbon-sandwiches", "1 guest · 2 ribbon-sandwich fingers"),
        ("sweet-petit-fours", "1 guest · 2 small sweets"),
    ):
        recipe = recipes.get(recipe_id) or {}
        expect(
            recipe.get("status") == "ACTIVE WORKING",
            f"{recipe_id}: recipe stays ACTIVE WORKING until batch detail is confirmed",
            errors,
        )
        expect(recipe.get("yield") == expected_yield, f"{recipe_id}: High Tea yield drift", errors)
        standard = recipe.get("serviceStandard") or {}
        expect(
            standard.get("status") == "LOCKED"
            and standard.get("scope") == "package-specific"
            and standard.get("sectionId") == "high_tea",
            f"{recipe_id}: locked package-specific service standard is missing",
            errors,
        )


def validate_grazing_and_focaccia(
    packages: dict[str, Any],
    recipes: dict[str, dict[str, Any]],
    errors: list[str],
) -> None:
    standards = packages.get("operationalStandards") or {}
    two_metre = standards.get("twoMetreGrazingTable") or {}
    expect(two_metre.get("status") == "LOCKED", "2 m grazing table standard must be LOCKED", errors)
    expect(two_metre.get("approximateGuests") == 80, "2 m grazing table must reference about 80 guests", errors)
    actual_items = [
        (
            item.get("quantity"),
            item.get("unit"),
            item.get("item"),
            item.get("condition"),
        )
        for item in two_metre.get("items") or []
    ]
    expected_items = [
        (8, "packets", "Varied Olina crackers", None),
        (2, "punnets", "Blueberries", None),
        (1, "punnet", "Blackberries", None),
        (1, "punnet", "Strawberries", None),
        (1, "bag", "Dates", None),
        (4, "each", "Kiwifruit", None),
        (2, "each", "Fresh figs", "when available"),
        (
            1,
            "packet",
            "Dried figs",
            "use with four passionfruit when fresh figs are unavailable",
        ),
        (
            4,
            "each",
            "Passionfruit",
            "use with one packet dried figs when fresh figs are unavailable",
        ),
        (0.5, "tray", "House focaccia", None),
    ]
    expect(actual_items == expected_items, "2 m grazing table item matrix drift", errors)
    for package_id, section_id in (("parties", "grazing"), ("funeral_wake", "wake_grazing")):
        rules = (section(packages, package_id, section_id).get("operationalRules") or {})
        expect(rules.get("status") == "LOCKED", f"{package_id}.{section_id}: grazing rule is not LOCKED", errors)
        expect(
            rules.get("twoMetreStandardRef") == "operationalStandards.twoMetreGrazingTable",
            f"{package_id}.{section_id}: 2 m standard reference drift",
            errors,
        )

    focaccia = standards.get("focaccia") or {}
    expected_focaccia = {
        "casualDeliveryOrGrazingBoxPieces": 12,
        "oneMetreGrazingTableTrayFraction": 0.25,
        "twoMetreGrazingTableTrayFraction": 0.5,
        "everyGrazingBoxIncludesFocaccia": True,
        "platedDinnerIncluded": True,
        "nonDiyMyoBuffetIncluded": True,
        "diyMyoAutomaticInclusion": False,
    }
    for key, expected in expected_focaccia.items():
        expect(focaccia.get(key) == expected, f"focaccia standard drift: {key}", errors)
    expect(
        set(focaccia.get("includedPackageSections") or []) == FOCACCIA_INCLUDED_SECTIONS,
        "focaccia included-section registry drift",
        errors,
    )
    expect(
        set(focaccia.get("excludedMyoDiySections") or []) == FOCACCIA_EXCLUDED_SECTIONS,
        "focaccia MYO/DIY exclusion registry drift",
        errors,
    )
    for section_key in sorted(FOCACCIA_INCLUDED_SECTIONS):
        package_id, section_id = section_key.split(".", 1)
        package_section = section(packages, package_id, section_id)
        rules = package_section.get("operationalRules") or {}
        expect(
            rules.get("status") == "LOCKED"
            and rules.get("focacciaIncluded") is True
            and rules.get("automaticPlannerInclusion") is True,
            f"{section_key}: included focaccia rule is not locked/actionable",
            errors,
        )
        expect(
            any("House focaccia" in str(line) and "included" in str(line) for line in rules.get("displayLines") or []),
            f"{section_key}: visible focaccia inclusion line is missing",
            errors,
        )
        actionable_rows = [
            (course, item)
            for course in package_section.get("courses") or []
            for item in course.get("items") or []
            if item.get("recipeId") == "house-focaccia"
            and (course.get("selection") or {}).get("mode") == "all"
        ]
        expect(
            bool(actionable_rows),
            f"{section_key}: house-focaccia is not auto-selected by the planner",
            errors,
        )
    for section_key in sorted(FOCACCIA_EXCLUDED_SECTIONS):
        package_id, section_id = section_key.split(".", 1)
        package_section = section(packages, package_id, section_id)
        rules = package_section.get("operationalRules") or {}
        expect(
            rules.get("status") == "LOCKED"
            and rules.get("focacciaIncluded") is False
            and rules.get("automaticPlannerInclusion") is False,
            f"{section_key}: MYO/DIY focaccia exclusion is not explicit",
            errors,
        )
        expect(
            not any(
                item.get("recipeId") == "house-focaccia"
                for course in package_section.get("courses") or []
                for item in course.get("items") or []
            ),
            f"{section_key}: excluded MYO/DIY section links house focaccia",
            errors,
        )
    grazing_boxes = [
        item for item in package_items(packages) if "grazing box" in str(item.get("name") or "").lower()
    ]
    expect(bool(grazing_boxes), "no grazing-box package records found", errors)
    for item in grazing_boxes:
        expect(
            item.get("focacciaPieces") == 12 and "12 pieces house focaccia" in item.get("name", "").lower(),
            f"grazing box missing 12-piece focaccia control: {item.get('name')}",
            errors,
        )
        expect(
            item.get("recipeId") == "grazing-box-standard",
            f"grazing box must link the exact grazing-box recipe: {item.get('name')}",
            errors,
        )
    focaccia_recipe = recipes.get("house-focaccia") or {}
    expect(focaccia_recipe.get("status") == "LOCKED", "house focaccia recipe must be LOCKED", errors)
    recipe_standard = focaccia_recipe.get("serviceStandard") or {}
    for key, expected in expected_focaccia.items():
        expect(recipe_standard.get(key) == expected, f"house-focaccia service standard drift: {key}", errors)


def validate_platter_counts(
    packages: dict[str, Any],
    recipes: dict[str, dict[str, Any]],
    errors: list[str],
) -> None:
    defaults = (packages.get("operationalStandards") or {}).get("platterDefaults") or {}
    expected_defaults = {
        "singleHotNibble": {"totalPieces": 24},
        "mixedHotNibble": {"totalPieces": 48, "itemTypes": 4, "piecesPerType": 12},
        "sandwich": {"points": 24, "wholeSandwiches": 6},
        "wrap": {"totalPieces": 12},
        "brioche": {"totalPieces": 12},
        "scone": {"totalPieces": 12},
    }
    for key, expected in expected_defaults.items():
        expect(defaults.get(key) == expected, f"platter default drift: {key}", errors)
    expect(
        (defaults.get("croissant") or {}).get("totalPieces") == 12
        and "grazing add-on" in str((defaults.get("croissant") or {}).get("exception") or ""),
        "croissant platter default/exception drift",
        errors,
    )
    for package_id, section_id in (("parties", "platters"), ("funeral_wake", "wake_platters")):
        rules = (section(packages, package_id, section_id).get("operationalRules") or {})
        lines = rules.get("displayLines") or []
        expect(
            rules.get("status") == "LOCKED"
            and rules.get("platterDefaultsRef") == "operationalStandards.platterDefaults",
            f"{package_id}.{section_id}: platter defaults are not locked at section level",
            errors,
        )
        for marker in (
            "Single hot-nibble platter: 24 pieces.",
            "Mixed hot-nibble box/platter: 48 pieces — 12 each of 4 items.",
            "Sandwich platter: 24 points from 6 whole sandwiches.",
            "Wrap, standard croissant, filled-brioche and scone platters: 12 pieces each.",
        ):
            expect(marker in lines, f"{package_id}.{section_id}: missing display line: {marker}", errors)

    base_variants = load_json(SERVICE_VARIANT_PATHS[0])
    variant_rows = base_variants.get("service_variants") or {}
    expected_variant_counts = {
        ("nibble-platter-40", "platter"): (48, 12),
        ("funeral-mixed-hot-nibbles-box", "platter"): (48, 12),
        ("house-baked-sausage-rolls", "platter"): (24, None),
        ("beef-party-pies", "platter"): (24, None),
        ("mini-quiches-beetroot-balsamic", "platter"): (24, None),
        ("funeral-spinach-ricotta-pastizzi-platter", "platter"): (24, None),
        ("platter-scones-chantilly-jam", "platter"): (12, None),
        ("platter-sandwiches-standard", "platter"): (24, None),
        ("platter-wraps-premium", "platter"): (12, None),
        ("platter-filled-brioche-rolls", "platter"): (12, None),
        ("platter-ham-cheese-croissants", "platter"): (12, None),
        ("platter-ham-cheese-croissants", "grazing_add_on_40"): (40, None),
    }
    for (recipe_id, service_key), (pieces, items_per_type) in expected_variant_counts.items():
        record = (variant_rows.get(recipe_id) or {}).get(service_key) or {}
        expect(
            record.get("total_pieces") == pieces,
            f"{recipe_id}.{service_key}: expected {pieces} pieces",
            errors,
        )
        if items_per_type is not None:
            expect(
                record.get("items_per_type") == items_per_type,
                f"{recipe_id}.{service_key}: expected {items_per_type} pieces per type",
                errors,
            )

    declared_keys = set((base_variants.get("rules") or {}).get("special_variant_keys") or [])
    expect(
        "grazing_add_on_40" in declared_keys,
        "grazing_add_on_40 must be declared as a special service-variant key",
        errors,
    )
    expected_yields = {
        "platter-sandwiches-standard": "24 sandwich points · 6 whole sandwiches per platter",
        "platter-wraps-premium": "12 wrap pieces per platter",
        "platter-ham-cheese-croissants": (
            "12 croissants per standard platter · 40 only for an explicitly named grazing add-on"
        ),
        "platter-filled-brioche-rolls": "12 filled brioche rolls per platter",
        "nibble-platter-40": "48 mixed hot nibbles · 12 each of 4 items",
        "funeral-mixed-hot-nibbles-box": "48 mixed hot nibbles · 12 each of 4 items",
    }
    for recipe_id, expected_yield in expected_yields.items():
        recipe = recipes.get(recipe_id) or {}
        expect(recipe.get("yield") == expected_yield, f"{recipe_id}: recipe yield drift", errors)
        expect(
            (recipe.get("serviceStandard") or {}).get("status") == "LOCKED",
            f"{recipe_id}: locked package service standard is missing",
            errors,
        )


def validate_no_placeholder_links(
    packages: dict[str, Any],
    recipes: dict[str, dict[str, Any]],
    errors: list[str],
) -> None:
    expected_unlinked = {
        "Signature Mocktail",
        "Signature Grazing Table",
        "3-Tier Seafood Fountain — Prawns",
        "3-Tier Seafood Fountain — Mixed",
        "Selection of Gourmet Pizzas",
        "Tiger Prawn Spring Rolls, Sweet Chilli",
        "Chicken Nuggets & Chips, Sauce",
        "Fish & Chips, Sauce",
        "Gelato & Toppings (dessert)",
        "Seasonal Fruit Platter",
        "Seasonal Cut Fruit Bowl",
        "Purely Prawns — Fresh Tiger Prawns, Cocktail Sauce, Lemon",
        "Mixed — Tiger Prawns & Oysters",
        "House Baked Banana Bread",
        "Seasonal Fruit",
        "Sandwich/Wrap/Roll + Sweet Treat + Savoury Snack + Drink",
        "Breakfast Box — Savoury Croissant + Breakfast Sweet + Mini Quiche + Juice",
        "Fresh Fruit",
        "Pavlova, White Chocolate Mousse, Lemon Curd, Raspberry Coulis, Freeze Dried Strawberry",
        "Locally Sourced Fresh Fruit",
    }
    items = package_items(packages)
    for item in items:
        recipe_id = item.get("recipeId")
        if recipe_id:
            expect(
                recipe_id in recipes,
                f"package item links missing recipe {recipe_id!r}: {item.get('name')}",
                errors,
            )
        if item.get("name") in expected_unlinked:
            expect(
                not recipe_id
                and item.get("recipeLinkStatus") == "NEEDS EXACT RECIPE CONFIRMATION",
                f"package item must not use a placeholder recipe: {item.get('name')}",
                errors,
            )
    flourless = next(
        (
            item
            for item in items
            if str(item.get("name") or "").startswith("Flourless Chocolate Torte")
        ),
        {},
    )
    expect(
        flourless.get("recipeId") == "flourless-chocolate-torte-working",
        "Flourless Chocolate Torte package item must link its exact working recipe",
        errors,
    )

    package_planner = (ROOT / "assets" / "package-planner.js").read_text(encoding="utf-8")
    cached_branch = re.search(
        r"if \(_aliasRedirects\) \{(?P<body>.*?)\n\s*\}",
        package_planner,
        flags=re.DOTALL,
    )
    expect(cached_branch is not None, "package planner cached-alias branch is missing", errors)
    if cached_branch is not None:
        expect(
            cached_branch.group("body").count("cb(_aliasRedirects);") == 1,
            "package planner cached-alias branch must invoke its callback exactly once",
            errors,
        )


def main() -> int:
    errors: list[str] = []
    packages = load_json(PACKAGES_PATH)
    catalog = load_json(CATALOG_PATH)
    recipes = recipe_map(catalog)

    expect(packages.get("releaseId") == RELEASE_ID, "function package release ID drift", errors)
    expect(catalog.get("releaseId") == RELEASE_ID, "recipe catalog release ID drift", errors)
    expect(len(recipes) == 157, f"expected 157 recipes, found {len(recipes)}", errors)
    lifecycle_counts = Counter(str(recipe.get("status")) for recipe in recipes.values())
    expect(
        dict(lifecycle_counts) == EXPECTED_LIFECYCLE_COUNTS,
        f"recipe lifecycle counts drifted: {dict(lifecycle_counts)}",
        errors,
    )

    validate_buffer_policy(errors)
    validate_feasting(packages, errors)
    validate_high_tea(packages, recipes, errors)
    validate_grazing_and_focaccia(packages, recipes, errors)
    validate_platter_counts(packages, recipes, errors)
    validate_no_placeholder_links(packages, recipes, errors)

    if errors:
        print("RIVIERA V15.2 RELEASE POLICY: FAIL", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("RIVIERA V15.2 RELEASE POLICY: OK")
    print(f"- release: {RELEASE_ID}")
    print(f"- recipes: {len(recipes)}")
    print(f"- lifecycle: {dict(lifecycle_counts)}")
    print(f"- explicit planner buffer records: {EXPECTED_BUFFERED_RECORDS}")
    print("- Feasting, High Tea, platter, grazing and focaccia standards: locked and aligned")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
