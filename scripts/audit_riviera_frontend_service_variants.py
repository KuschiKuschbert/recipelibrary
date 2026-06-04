#!/usr/bin/env python3
"""
Audit that the Riviera frontend recipe modal loads every service variant file.

Run from repo root:
    python3 scripts/audit_riviera_frontend_service_variants.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RIVIERA_DATA = ROOT / "riviera_data"
FRONTEND_PATH = ROOT / "assets" / "screen-wake.js"
BASE_VARIANTS = RIVIERA_DATA / "service_variants.json"
ADDON_GLOB = "service_variants_*.json"


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError(f"{rel(path)} root must be an object")
    if not isinstance(data.get("service_variants"), dict):
        raise ValueError(f"{rel(path)} must contain a service_variants object")
    return data


def main() -> int:
    errors: list[str] = []

    expected_paths = [BASE_VARIANTS, *sorted(RIVIERA_DATA.glob(ADDON_GLOB))]

    if not FRONTEND_PATH.is_file():
        errors.append(f"Missing frontend file: {rel(FRONTEND_PATH)}")
        frontend = ""
    else:
        frontend = FRONTEND_PATH.read_text(encoding="utf-8")

    total_records = 0
    for path in expected_paths:
        if not path.is_file():
            errors.append(f"Missing service variant file: {rel(path)}")
            continue
        try:
            data = load_json(path)
            total_records += len(data.get("service_variants", {}))
        except Exception as exc:  # noqa: BLE001 - audit should report file-specific parse failures
            errors.append(str(exc))
            continue

        frontend_path = rel(path).replace("\\", "/")
        if frontend_path not in frontend:
            errors.append(f"Frontend does not load {frontend_path}")

    required_frontend_markers = [
        "const VARIANT_URLS = [",
        "mergeVariantPayloads",
        "Service Sizes",
        "rivieraServiceVariantsBlock",
    ]
    for marker in required_frontend_markers:
        if marker not in frontend:
            errors.append(f"Frontend missing service variant marker: {marker}")

    print("RIVIERA FRONTEND SERVICE VARIANT AUDIT")
    print("=" * 43)
    print(f"Frontend file: {rel(FRONTEND_PATH)}")
    print(f"Expected service variant files: {len(expected_paths)}")
    for path in expected_paths:
        print(f"- {rel(path)}")
    print(f"Service variant records visible to frontend audit: {total_records}")
    print()

    if errors:
        print("ERRORS")
        print("-" * 6)
        for error in errors:
            print(f"- {error}")
        print()
        return 1

    print("Frontend service variant file coverage: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
