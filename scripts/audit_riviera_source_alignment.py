#!/usr/bin/env python3
"""
Audit Riviera service variant records against brochure/source alignment standards.

This is deliberately separate from the structural standards audit:
- recipe standards audit checks coverage/schema/status
- source alignment audit checks known brochure counts vs kitchen production counts

Run from repo root:
    python3 scripts/audit_riviera_source_alignment.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RIVIERA_DATA = ROOT / "riviera_data"
BASE_VARIANTS = RIVIERA_DATA / "service_variants.json"
ADDON_GLOB = "service_variants_*.json"
SOURCE_ALIGNMENT = RIVIERA_DATA / "service_variant_source_alignment.json"
SOURCE_OVERRIDES = RIVIERA_DATA / "service_variant_source_overrides.json"

META_KEYS = {"recipe_id", "recipe_id_candidates", "canonical_name", "aliases", "base_prep", "size_rule"}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


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


def values_match(actual: Any, expected: Any) -> bool:
    if actual == expected:
        return True
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        return float(actual) == float(expected)
    return False


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    try:
        alignment = load_json(SOURCE_ALIGNMENT)
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: failed to load {rel(SOURCE_ALIGNMENT)}: {exc}", file=sys.stderr)
        return 1

    variants, merge_errors, variant_paths = merge_service_variants()
    errors.extend(merge_errors)

    checks = alignment.get("checks", []) if isinstance(alignment, dict) else []
    if not isinstance(checks, list):
        errors.append(f"{rel(SOURCE_ALIGNMENT)}: checks must be an array")
        checks = []

    checked_count = 0
    for check in checks:
        if not isinstance(check, dict):
            errors.append(f"{rel(SOURCE_ALIGNMENT)}: each check must be an object")
            continue
        recipe_id = str(check.get("recipe_id", "")).strip()
        variant_key = str(check.get("variant_key", "")).strip()
        expected = check.get("expected", {})
        severity = str(check.get("severity", "error")).strip() or "error"
        source_note = str(check.get("source_note", "")).strip()

        if not recipe_id or not variant_key:
            errors.append(f"{rel(SOURCE_ALIGNMENT)}: check missing recipe_id or variant_key")
            continue
        if not isinstance(expected, dict):
            errors.append(f"{rel(SOURCE_ALIGNMENT)}: {recipe_id}.{variant_key} expected must be an object")
            continue

        group = variants.get(recipe_id)
        if not isinstance(group, dict):
            errors.append(f"Missing service variant recipe group: {recipe_id}")
            continue
        record = group.get(variant_key)
        if not isinstance(record, dict):
            errors.append(f"Missing service variant record: {recipe_id}.{variant_key}")
            continue

        checked_count += 1
        for key, expected_value in expected.items():
            actual_value = record.get(key)
            if values_match(actual_value, expected_value):
                continue
            message = (
                f"{recipe_id}.{variant_key}: expected {key}={expected_value!r}, "
                f"found {actual_value!r}"
            )
            if source_note:
                message += f" — {source_note}"
            if severity == "warning":
                warnings.append(message)
            else:
                errors.append(message)

        if not source_note and not record.get("source_note"):
            warnings.append(f"{recipe_id}.{variant_key}: source_note missing from alignment check and service record")

    print("RIVIERA SOURCE ALIGNMENT AUDIT")
    print("=" * 35)
    print(f"Alignment file: {rel(SOURCE_ALIGNMENT)}")
    print(f"Override file: {rel(SOURCE_OVERRIDES) if SOURCE_OVERRIDES.is_file() else 'None'}")
    print(f"Service variant files: {len([p for p in variant_paths if p not in {SOURCE_ALIGNMENT, SOURCE_OVERRIDES}])}")
    for path in variant_paths:
        if path not in {SOURCE_ALIGNMENT, SOURCE_OVERRIDES}:
            print(f"- {rel(path)}")
    print(f"Alignment checks: {len(checks)}")
    print(f"Checked records: {checked_count}")
    print()

    print("WARNINGS")
    print("-" * 8)
    if warnings:
        for warning in warnings:
            print(f"- {warning}")
    else:
        print("None")
    print()

    print("ERRORS")
    print("-" * 6)
    if errors:
        for error in errors:
            print(f"- {error}")
        print()
        return 1
    print("None")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
