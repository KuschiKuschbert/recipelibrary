#!/usr/bin/env python3
"""Sync canonical recipe package/event backlinks from active package data."""

from __future__ import annotations

import json
from pathlib import Path

from audit_riviera_recipe_standards import (
    build_expected_recipe_links,
    merge_supplemental_recipe_links,
)


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = (
    ROOT
    / "riviera_sources"
    / "current"
    / "Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json"
)
PACKAGES_PATH = ROOT / "riviera_data" / "function_packages.json"
USE_LINKS_PATH = ROOT / "riviera_data" / "recipe_use_links.json"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    catalog = load(CATALOG_PATH)
    recipes = catalog.get("recipes") or []
    recipes_by_id = {
        str(recipe.get("id")): recipe
        for recipe in recipes
        if isinstance(recipe, dict) and recipe.get("id")
    }
    expected = build_expected_recipe_links(load(PACKAGES_PATH))
    errors: list[str] = []
    merge_supplemental_recipe_links(
        expected,
        load(USE_LINKS_PATH),
        recipes_by_id,
        errors,
    )
    if errors:
        raise SystemExit("\n".join(errors))

    changed = 0
    for recipe_id, recipe in recipes_by_id.items():
        links = expected.get(recipe_id, {"packages": [], "events": []})
        if recipe.get("links") != links:
            recipe["links"] = links
            changed += 1

    if changed:
        CATALOG_PATH.write_text(
            json.dumps(catalog, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    print(
        json.dumps(
            {
                "status": "ok",
                "catalog": str(CATALOG_PATH.relative_to(ROOT)),
                "recipes": len(recipes),
                "linksChanged": changed,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
