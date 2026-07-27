#!/usr/bin/env python3
"""
Smoke-test the service-size strings that the recipe modal should show for key Riviera samples.

This does not render a browser. It checks the same merged service-variant data path used by the frontend:
- base service variants
- addon files
- source-aligned overrides

Run from repo root:
    python3 scripts/audit_riviera_service_variant_display_samples.py
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RIVIERA_DATA = ROOT / "riviera_data"
BASE_VARIANTS = RIVIERA_DATA / "service_variants.json"
ADDON_GLOB = "service_variants_*.json"
SOURCE_ALIGNMENT = RIVIERA_DATA / "service_variant_source_alignment.json"
SOURCE_OVERRIDES = RIVIERA_DATA / "service_variant_source_overrides.json"


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def pretty_key(key: str) -> str:
    return " ".join(part.capitalize() for part in key.split("_"))


def deep_merge_override(existing: dict[str, Any], incoming: dict[str, Any]) -> None:
    for key, value in incoming.items():
        if isinstance(value, dict) and isinstance(existing.get(key), dict):
            deep_merge_override(existing[key], value)
        else:
            existing[key] = value


def merge_service_variants() -> tuple[dict[str, Any], list[str], list[Path]]:
    errors: list[str] = []
    merged: dict[str, Any] = {}
    paths = [BASE_VARIANTS, *sorted(RIVIERA_DATA.glob(ADDON_GLOB))]

    for path in paths:
        if path in {SOURCE_ALIGNMENT, SOURCE_OVERRIDES}:
            continue
        try:
            data = load_json(path)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{rel(path)}: failed to load JSON: {exc}")
            continue
        service_variants = data.get("service_variants", {}) if isinstance(data, dict) else {}
        if not isinstance(service_variants, dict):
            errors.append(f"{rel(path)}: service_variants must be an object")
            continue
        for recipe_id, group in service_variants.items():
            if not isinstance(group, dict):
                errors.append(f"{rel(path)}: service_variants.{recipe_id} must be an object")
                continue
            existing = merged.setdefault(recipe_id, {})
            for key, value in group.items():
                if key in existing and existing[key] != value:
                    errors.append(f"{rel(path)}: conflicting definition for {recipe_id}.{key}")
                    continue
                existing[key] = value

    if SOURCE_OVERRIDES.is_file():
        paths.append(SOURCE_OVERRIDES)
        try:
            override_data = load_json(SOURCE_OVERRIDES)
            override_variants = override_data.get("service_variants", {}) if isinstance(override_data, dict) else {}
            if not isinstance(override_variants, dict):
                errors.append(f"{rel(SOURCE_OVERRIDES)}: service_variants must be an object")
            else:
                for recipe_id, group in override_variants.items():
                    if not isinstance(group, dict):
                        errors.append(f"{rel(SOURCE_OVERRIDES)}: service_variants.{recipe_id} must be an object")
                        continue
                    existing = merged.setdefault(recipe_id, {})
                    deep_merge_override(existing, group)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{rel(SOURCE_OVERRIDES)}: failed to load JSON: {exc}")

    return merged, errors, paths


def normalise_scalar(value: Any) -> str:
    if value is None or value == "" or value is False:
        return ""
    if isinstance(value, list):
        return ", ".join(str(x) for x in value)
    if isinstance(value, bool):
        return "true" if value else ""
    return str(value)


def variant_line(record: dict[str, Any]) -> str:
    bits: list[str] = []
    used: set[str] = set()

    if record.get("brochure_range_min") is not None and record.get("brochure_range_max") is not None:
        bits.append(f"Brochure range: {record['brochure_range_min']}-{record['brochure_range_max']}")
        used.update({"brochure_range_min", "brochure_range_max"})

    priority = [
        "portion",
        "brochure_count",
        "kitchen_production_count",
        "total_pieces",
        "whole_sandwiches",
        "items_per_type",
        "minimum_order_pieces",
        "minimum_order_bowls",
        "minimum_order_serves",
        "piece_weight_g_pre_crumb",
        "piece_weight_g_raw",
        "automatic_event_buffer_multiplier",
        "buffer_rule",
        "sauce_ml_per_guest",
        "aioli_ml_per_guest",
        "premium_garnish_option",
        "standard_garnish",
        "service_rule",
        "hold",
        "recommendation",
        "reason",
        "note",
        "source_note",
    ]

    for key in priority:
        if key in used or key not in record:
            continue
        used.add(key)
        value = record[key]
        if key == "brochure_count":
            bits.append(f"Brochure count: {value}")
        elif key == "kitchen_production_count":
            bits.append(f"Kitchen production: {value}")
        elif key == "total_pieces":
            bits.append(f"Total pieces: {value}")
        elif key == "whole_sandwiches":
            bits.append(f"Whole sandwiches: {value}")
        elif key == "items_per_type":
            bits.append(f"Items per type: {value}")
        elif key == "minimum_order_pieces":
            bits.append(f"Minimum order pieces: {value}")
        elif key == "minimum_order_bowls":
            bits.append(f"Minimum order bowls: {value}")
        elif key == "minimum_order_serves":
            bits.append(f"Minimum order serves: {value}")
        elif key == "piece_weight_g_pre_crumb":
            bits.append(f"{value}g pre-crumb")
        elif key == "piece_weight_g_raw":
            bits.append(f"{value}g raw")
        elif key == "automatic_event_buffer_multiplier":
            bits.append(f"{value}x automatic event buffer")
        elif key == "buffer_rule":
            bits.append(f"Buffer rule: {value}")
        elif key == "sauce_ml_per_guest":
            bits.append(f"{value}ml sauce per guest")
        elif key == "aioli_ml_per_guest":
            bits.append(f"{value}ml aioli per guest")
        elif key == "source_note":
            bits.append(f"Source note: {value}")
        else:
            text = normalise_scalar(value)
            if text:
                label = "" if key in {"portion", "recommendation", "reason", "note", "hold"} else pretty_key(key) + ": "
                bits.append(label + text)

    return " · ".join(bit for bit in bits if bit)


SAMPLES = [
    {
        "label": "Scone platter override display",
        "recipe_id": "platter-scones-chantilly-jam",
        "variant_key": "platter",
        "must_contain": [
            "12 scones per platter",
            "Brochure count: 12",
            "Kitchen production: 12",
            "Total pieces: 12",
            "Source note: Brochure/source count is 12 pieces per scone platter",
        ],
    },
    {
        "label": "Sandwich platter override display",
        "recipe_id": "platter-sandwiches-standard",
        "variant_key": "platter",
        "must_contain": [
            "24 sandwich points per platter from 6 whole sandwiches",
            "Brochure count: 24",
            "Kitchen production: 24",
            "Total pieces: 24",
            "Whole sandwiches: 6",
        ],
    },
    {
        "label": "Mixed hot nibble override display",
        "recipe_id": "nibble-platter-40",
        "variant_key": "platter",
        "must_contain": [
            "48 mixed hot nibbles per platter, 12 each of 4 items",
            "Brochure range: 40-50",
            "Kitchen production: 48",
            "Total pieces: 48",
            "Items per type: 12",
        ],
    },
    {
        "label": "Corporate croissant display",
        "recipe_id": "corporate-savoury-croissants",
        "variant_key": "corporate_boxed",
        "must_contain": [
            "1 savoury croissant per guest or box",
            "Minimum order pieces: 12",
            "Fill split must be set on the event prep sheet",
        ],
    },
    {
        "label": "Base calamari buffet display",
        "recipe_id": "calamari",
        "variant_key": "buffet",
        "must_contain": [
            "4 calamari strips + 1 baby octopus per guest",
            "1.09x automatic event buffer",
            "Buffer rule: Apply the Riviera 9% event buffer once",
            "Premium Garnish Option: Micro herbs",
        ],
    },
    {
        "label": "Main course display",
        "recipe_id": "beef-bourguignon",
        "variant_key": "buffet",
        "must_contain": [
            "180 g bourguignon per guest",
            "1.09x automatic event buffer",
            "Buffer rule: Apply the Riviera 9% event buffer once",
            "Each scoop should include beef, sauce, mushroom, lardon and onion",
        ],
    },
]


def main() -> int:
    variants, errors, paths = merge_service_variants()
    checked = 0
    rendered: list[tuple[str, str, str, str]] = []

    for sample in SAMPLES:
        label = sample["label"]
        recipe_id = sample["recipe_id"]
        variant_key = sample["variant_key"]
        group = variants.get(recipe_id)
        if not isinstance(group, dict):
            errors.append(f"{label}: missing recipe group {recipe_id}")
            continue
        record = group.get(variant_key)
        if not isinstance(record, dict):
            errors.append(f"{label}: missing variant {recipe_id}.{variant_key}")
            continue
        line = variant_line(record)
        checked += 1
        rendered.append((label, recipe_id, variant_key, line))
        for expected in sample["must_contain"]:
            if expected not in line:
                errors.append(f"{label}: display line missing {expected!r}. Rendered: {line}")

    print("RIVIERA SERVICE VARIANT DISPLAY SAMPLE AUDIT")
    print("=" * 48)
    print(f"Service variant files merged: {len(paths)}")
    for path in paths:
        print(f"- {rel(path)}")
    print(f"Sample records checked: {checked}")
    print()

    print("SAMPLE DISPLAY LINES")
    print("-" * 20)
    for label, recipe_id, variant_key, line in rendered:
        print(f"{label}")
        print(f"{recipe_id}.{variant_key}: {line}")
        print()

    print("ERRORS")
    print("-" * 6)
    if errors:
        for error in errors:
            print(f"- {error}")
        return 1
    print("None")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
