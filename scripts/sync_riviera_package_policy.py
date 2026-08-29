#!/usr/bin/env python3
"""Apply/check Riviera v15.2 package-level operational controls."""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PACKAGES_PATH = ROOT / "riviera_data" / "function_packages.json"
RELEASE_ID = "RIV-KNOWLEDGE-V15.2"

PLATTER_SECTIONS = (
    ("parties", "platters"),
    ("funeral_wake", "wake_platters"),
)
FOCACCIA_INCLUDED_SECTIONS = (
    ("weddings", "taormina"),
    ("weddings", "amalfi"),
    ("weddings", "la_tavola"),
    ("corporate", "corporate_buffet"),
    ("offsite", "carvery_buffet"),
    ("offsite", "bbq_buffet"),
    ("offsite", "plated_meals"),
    ("offsite", "feasting"),
)
FOCACCIA_EXCLUDED_SECTIONS = (
    ("weddings", "gyros"),
    ("offsite", "gyros_offsite"),
)

FALSE_RECIPE_LINKS = {
    ("weddings", "portofino", "Signature Grazing Table"),
    ("weddings", "portofino", "3-Tier Seafood Fountain — Prawns"),
    ("weddings", "portofino", "3-Tier Seafood Fountain — Mixed"),
    ("weddings", "late_night", "Selection of Gourmet Pizzas"),
    ("weddings", "late_night", "Tiger Prawn Spring Rolls, Sweet Chilli"),
    ("weddings", "kids", "Chicken Nuggets & Chips, Sauce"),
    ("weddings", "kids", "Fish & Chips, Sauce"),
    ("weddings", "kids", "Gelato & Toppings (dessert)"),
    ("parties", "platters", "Seasonal Fruit Platter"),
    ("parties", "grazing", "Seasonal Cut Fruit Bowl"),
    (
        "parties",
        "seafood_fountain",
        "Purely Prawns — Fresh Tiger Prawns, Cocktail Sauce, Lemon",
    ),
    ("parties", "seafood_fountain", "Mixed — Tiger Prawns & Oysters"),
    ("corporate", "morning_afternoon_tea", "House Baked Banana Bread"),
    ("corporate", "morning_afternoon_tea", "Seasonal Fruit"),
    (
        "corporate",
        "corporate_lunch",
        "Sandwich/Wrap/Roll + Sweet Treat + Savoury Snack + Drink",
    ),
    (
        "corporate",
        "corporate_lunch",
        "Breakfast Box — Savoury Croissant + Breakfast Sweet + Mini Quiche + Juice",
    ),
    ("baby_shower", "baby_graze", "Fresh Fruit"),
    ("funeral_wake", "wake_platters", "Seasonal Fruit Platter"),
    ("funeral_wake", "wake_grazing", "Seasonal Cut Fruit Bowl"),
    (
        "offsite",
        "plated_meals",
        "Pavlova, White Chocolate Mousse, Lemon Curd, Raspberry Coulis, Freeze Dried Strawberry",
    ),
    ("offsite", "dessert_grazing", "Locally Sourced Fresh Fruit"),
}
EXACT_RECIPE_LINKS = {
    (
        "parties",
        "platters",
        "Grazing Box (cheese, deli meats, fruit, nuts, crackers, dips, olives + 12 pieces house focaccia)",
    ): "grazing-box-standard",
    (
        "funeral_wake",
        "wake_platters",
        "Grazing Box (cheese, deli meats, fruit, nuts, crackers, dips, olives + 12 pieces house focaccia)",
    ): "grazing-box-standard",
    (
        "offsite",
        "plated_meals",
        "Flourless Chocolate Torte, Hazelnut Mousse, Raspberry Compote, Frangelico Ganache",
    ): "flourless-chocolate-torte-working",
}


def find_section(payload: dict[str, Any], package_id: str, section_id: str) -> dict[str, Any]:
    for package in payload.get("packages") or []:
        if package.get("id") != package_id:
            continue
        for section in package.get("sections") or []:
            if section.get("id") == section_id:
                return section
    raise ValueError(f"missing package section {package_id}.{section_id}")


def find_item(
    payload: dict[str, Any],
    package_id: str,
    section_id: str,
    item_name: str,
) -> dict[str, Any]:
    section = find_section(payload, package_id, section_id)
    for course in section.get("courses") or []:
        for item in course.get("items") or []:
            if item.get("name") == item_name:
                return item
    raise ValueError(f"missing package item {package_id}.{section_id}: {item_name}")


def platter_rules() -> dict[str, Any]:
    return {
        "status": "LOCKED",
        "scope": "package-specific",
        "effectiveDate": "2026-07-27",
        "platterDefaultsRef": "operationalStandards.platterDefaults",
        "displayLines": [
            "Single hot-nibble platter: 24 pieces.",
            "Mixed hot-nibble box/platter: 48 pieces — 12 each of 4 items.",
            "Sandwich platter: 24 points from 6 whole sandwiches.",
            "Wrap, standard croissant, filled-brioche and scone platters: 12 pieces each.",
            "Use 40 croissants only for an explicitly named 40-piece grazing add-on.",
            "Every grazing box includes 12 pieces house focaccia.",
        ],
    }


def focaccia_rules(*, included: bool, butter_label: str = "whipped butter") -> dict[str, Any]:
    if included:
        return {
            "status": "LOCKED",
            "scope": "package-specific",
            "effectiveDate": "2026-07-27",
            "focacciaIncluded": True,
            "focacciaRecipeId": "house-focaccia",
            "automaticPlannerInclusion": True,
            "displayLines": [
                f"House focaccia with {butter_label} is included.",
                "The house-focaccia recipe is automatically included in the planner.",
            ],
        }
    return {
        "status": "LOCKED",
        "scope": "package-specific",
        "effectiveDate": "2026-07-27",
        "focacciaIncluded": False,
        "automaticPlannerInclusion": False,
        "displayLines": [
            "MYO/DIY package — no automatic house-focaccia inclusion.",
        ],
    }


def feasting_scaling_rules() -> dict[str, Any]:
    return {
        "status": "LOCKED",
        "scope": "package-specific",
        "effectiveDate": "2026-08-29",
        "sourceRef": "FEAST-001 v1.2",
        "selectedProteinPortions": {
            "formula": "ceil(guestCount * 4 / 3)",
            "example": {"guestCount": 90, "portions": 120},
            "standardEventBufferAlreadyIncluded": True,
            "additionalStandardNinePercentBuffer": False,
        },
        "dietaryAlternatives": {
            "basis": "exact confirmed count",
            "includedInSelectedProteinPortions": False,
        },
        "frenchGreenBeans": {
            "rawKgPerGuests": {"kilograms": 10, "guestCount": 90},
            "equivalent": "1 kg raw per 9 guests",
        },
        "displayLines": [
            "Selected feasting proteins: total portions = guests × 4 ÷ 3, rounded up (90 guests = 120 portions).",
            "That feasting uplift is applied once; do not add the standard 9% event buffer again.",
            "Dietary alternatives are produced to the exact confirmed count and sit outside the shared protein total.",
            "French green beans: 10 kg raw per 90 guests (1 kg per 9 guests).",
        ],
    }


def ensure_house_bread_course(section: dict[str, Any], *, butter_label: str) -> None:
    linked_rows: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for course in section.get("courses") or []:
        for item in course.get("items") or []:
            if item.get("recipeId") == "house-focaccia":
                linked_rows.append((course, item))

    for course, _item in linked_rows:
        if (course.get("selection") or {}).get("mode") == "all":
            return

    for course, item in linked_rows:
        course["items"].remove(item)

    section.setdefault("courses", []).append(
        {
            "course": "House Bread (included)",
            "items": [
                {
                    "name": f"House Focaccia with {butter_label.title()}",
                    "search": "house focaccia whipped butter",
                    "tags": ["veg"],
                    "recipeId": "house-focaccia",
                    "included": True,
                }
            ],
            "selection": {"mode": "all"},
        }
    )


def apply_policy(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("releaseId") != RELEASE_ID:
        raise ValueError(f"function package releaseId must be {RELEASE_ID}")

    for package_id, section_id in PLATTER_SECTIONS:
        find_section(payload, package_id, section_id)["operationalRules"] = platter_rules()

    focaccia = (payload.get("operationalStandards") or {}).get("focaccia")
    if not isinstance(focaccia, dict):
        raise ValueError("operationalStandards.focaccia is missing")
    focaccia["includedPackageSections"] = [
        f"{package_id}.{section_id}" for package_id, section_id in FOCACCIA_INCLUDED_SECTIONS
    ]
    focaccia["excludedMyoDiySections"] = [
        f"{package_id}.{section_id}" for package_id, section_id in FOCACCIA_EXCLUDED_SECTIONS
    ]
    payload.setdefault("operationalStandards", {})["feasting"] = feasting_scaling_rules()

    for package_id, section_id in FOCACCIA_INCLUDED_SECTIONS:
        section = find_section(payload, package_id, section_id)
        butter_label = "whipped herb butter" if (package_id, section_id) == ("weddings", "amalfi") else "whipped butter"
        section["operationalRules"] = focaccia_rules(included=True, butter_label=butter_label)
        if (package_id, section_id) == ("offsite", "feasting"):
            feast_rules = feasting_scaling_rules()
            section["operationalRules"]["feastingScalingRef"] = "operationalStandards.feasting"
            section["operationalRules"]["displayLines"].extend(feast_rules["displayLines"])
        ensure_house_bread_course(section, butter_label=butter_label)

    for package_id, section_id in FOCACCIA_EXCLUDED_SECTIONS:
        find_section(payload, package_id, section_id)["operationalRules"] = focaccia_rules(included=False)

    for package_id, section_id, item_name in FALSE_RECIPE_LINKS:
        item = find_item(payload, package_id, section_id, item_name)
        item.pop("recipeId", None)
        item["recipeLinkStatus"] = "NEEDS EXACT RECIPE CONFIRMATION"

    for key, recipe_id in EXACT_RECIPE_LINKS.items():
        item = find_item(payload, *key)
        item["recipeId"] = recipe_id
        item.pop("recipeLinkStatus", None)

    mocktail = find_item(payload, "baby_shower", "baby_graze", "Signature Mocktail")
    mocktail.pop("recipeId", None)
    mocktail["recipeLinkStatus"] = "NEEDS EXACT RECIPE CONFIRMATION"
    return payload


def serialise(payload: dict[str, Any]) -> str:
    return json.dumps(payload, indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()

    original = json.loads(PACKAGES_PATH.read_text(encoding="utf-8"))
    expected = apply_policy(copy.deepcopy(original))
    expected_text = serialise(expected)
    current_text = PACKAGES_PATH.read_text(encoding="utf-8")
    changed = current_text != expected_text

    if args.check:
        if changed:
            raise SystemExit(
                "Riviera package policy drifted. Run: "
                "python3 scripts/sync_riviera_package_policy.py --write"
            )
        print("RIVIERA PACKAGE POLICY: OK")
        return 0

    if changed:
        PACKAGES_PATH.write_text(expected_text, encoding="utf-8")
    print(
        json.dumps(
            {
                "status": "ok",
                "changed": changed,
                "package": str(PACKAGES_PATH.relative_to(ROOT)),
                "platterSections": len(PLATTER_SECTIONS),
                "focacciaIncludedSections": len(FOCACCIA_INCLUDED_SECTIONS),
                "focacciaExcludedSections": len(FOCACCIA_EXCLUDED_SECTIONS),
                "falseRecipeLinksRemoved": len(FALSE_RECIPE_LINKS) + 1,
                "exactRecipeLinksRepaired": len(EXACT_RECIPE_LINKS),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
