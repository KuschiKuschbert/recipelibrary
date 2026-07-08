#!/usr/bin/env python3
"""Build Riviera's merged source-of-truth bundle.

The ChatGPT Riviera project sources are treated as the authoritative baseline.
The only overlay applied here is the July 8 tapas/canape house-standard recipe
update already represented in riviera_data/builtins.json.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "riviera_sources" / "chatgpt_project_sources_2026-07-08"
OUTPUT_DIR = ROOT / "riviera_sources" / "current"
BUILTINS_PATH = ROOT / "riviera_data" / "builtins.json"
PACKAGES_PATH = ROOT / "riviera_data" / "function_packages.json"

SOURCE_OF_TRUTH_PATH = OUTPUT_DIR / "Riviera_Source_Of_Truth_2026-07-08.md"
TAPAS_OVERLAY_PATH = OUTPUT_DIR / "Riviera_Tapas_House_Standards_Overlay_2026-07-08.md"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"

HOUSE_STANDARD_IDS = [
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

SOURCE_FILES = [
    "Updated_Riviera_instructions_2026-06-09_extracted.md",
    "Riviera_Kitchen_Production_Harness_Index_v5_2026-06-16.md",
    "Riviera_SOP_Master_Index_v10_2026-06-16.md",
    "Riviera_Component_Module_Library_v3_2026-06-16.md",
    "Riviera_Count_Ordering_Harness_v3_2026-06-16.md",
    "Riviera_Production_Sheet_Template_Library_v2_2026-06-16.md",
    "Riviera_Real_Event_Test_Pack_v2_2026-06-16.md",
    "Riviera_Package_Source_Digest_v1_2026-06-09.md",
    "Riviera_Canonical_Recipe_Bank_v1_2026-06-08.md",
    "Riviera_Sunday_Tapas_Pull_Matrix_SOP_Addendum_v1_2026-06-16.md",
    "Riviera_Sunday_Tapas_Pull_Matrix_A4_Kitchen_Sheet_v1_2026-06-16.txt",
    "Riviera_Order_Template_v1_2026-06-09.md",
    "Riviera_Supplier_Ordering_Translator_v1_2026-06-08.md",
    "Riviera_Seasoning_Palette_v2_2026-06-08.md",
    "foodpairing_condensed_riviera_reference.md",
    "Baclava-Cheesecake.txt",
]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def clean(value: Any) -> str:
    return " ".join(str(value or "").split())


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def recipe_ref_from_item(item: dict[str, Any]) -> str | None:
    for key in ("recipeId", "recipe_id", "id", "builtin_id"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def build_package_map(packages: dict[str, Any]) -> dict[str, list[str]]:
    mapping: dict[str, list[str]] = defaultdict(list)
    for package in packages.get("packages", []):
        package_id = clean(package.get("id"))
        package_label = "Riviera Table / Offsite" if package_id == "offsite" else clean(package.get("label") or package_id)
        for section in package.get("sections", []) or []:
            section_label = clean(section.get("label") or section.get("id"))
            for course in section.get("courses", []) or []:
                for item in course.get("items", []) or []:
                    if not isinstance(item, dict):
                        continue
                    recipe_id = recipe_ref_from_item(item)
                    if not recipe_id:
                        continue
                    ref = f"{package_label}: {section_label}" if section_label else package_label
                    if ref not in mapping[recipe_id]:
                        mapping[recipe_id].append(ref)
    return dict(mapping)


def md_escape(text: Any) -> str:
    value = clean(text)
    return value.replace("|", "\\|")


def recipe_tags(recipe: dict[str, Any], package_refs: list[str]) -> list[str]:
    tags = ["House Standard"]
    for key in ("course", "type", "method"):
        value = clean(recipe.get(key))
        if value and value not in tags:
            tags.append(value)
    for key in ("diet", "protein"):
        for value in recipe.get(key) or []:
            value = clean(value)
            if value and value not in tags:
                tags.append(value)
    for ref in package_refs:
        package = ref.split(":", 1)[0]
        if package and package not in tags:
            tags.append(package)
    return tags


def recipe_to_markdown(recipe: dict[str, Any], package_refs: list[str]) -> str:
    lines: list[str] = []
    lines.append(f"### {md_escape(recipe.get('name'))}")
    lines.append("")
    lines.append(f"- Recipe ID: `{recipe['id']}`")
    lines.append(f"- Yield: {md_escape(recipe.get('yield') or '-')}")
    lines.append(f"- Label: {md_escape(recipe.get('label') or '-')}")
    lines.append(f"- Tags: {md_escape(' | '.join(recipe_tags(recipe, package_refs)))}")
    if package_refs:
        lines.append(f"- Package / section refs: {md_escape('; '.join(package_refs))}")
    subtitle = clean(recipe.get("subtitle"))
    if subtitle:
        lines.append(f"- Menu description: {md_escape(subtitle)}")
    elements = [clean(x) for x in recipe.get("elements") or [] if clean(x)]
    if elements:
        lines.append(f"- Elements: {md_escape(' | '.join(elements))}")
    lines.append("")

    ingredients = recipe.get("ingredients") or []
    if ingredients:
        lines.append("#### Ingredients")
        lines.append("")
        lines.append("| Qty | Ingredient / prep |")
        lines.append("| --- | --- |")
        for ing in ingredients:
            item = clean(ing.get("item"))
            prep = clean(ing.get("prep"))
            detail = item if not prep else f"{item} - {prep}"
            lines.append(f"| {md_escape(ing.get('qty') or '-')} | {md_escape(detail)} |")
        lines.append("")

    method_steps = [clean(x) for x in recipe.get("method_steps") or [] if clean(x)]
    if method_steps:
        lines.append("#### Prep method")
        lines.append("")
        for idx, step in enumerate(method_steps, 1):
            lines.append(f"{idx}. {step}")
        lines.append("")

    service_steps = [clean(x) for x in recipe.get("service") or [] if clean(x)]
    if service_steps:
        lines.append("#### On the day / service")
        lines.append("")
        for idx, step in enumerate(service_steps, 1):
            lines.append(f"{idx}. {step}")
        lines.append("")

    note = clean(recipe.get("note"))
    if note:
        lines.append("#### Notes")
        lines.append("")
        lines.append(note)
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def build_tapas_overlay(recipes: list[dict[str, Any]], packages: dict[str, Any]) -> str:
    by_id = {str(recipe["id"]): recipe for recipe in recipes}
    missing = [recipe_id for recipe_id in HOUSE_STANDARD_IDS if recipe_id not in by_id]
    if missing:
        raise SystemExit(f"Missing house-standard recipes: {missing}")

    package_map = build_package_map(packages)
    lines: list[str] = [
        "# Riviera Tapas House Standards Overlay 2026-07-08",
        "",
        "**Status:** Active overlay on top of the ChatGPT Riviera source pack.",
        "**Source:** `Tapas Canape Recipe Cards.docx`, standardised into `riviera_data/builtins.json` on 2026-07-08.",
        "**Use for:** House-standard tapas/canape recipe cards, kitchen PDFs, prep sheets, Sunday tapas planning, and package-linked canape/tapas pulls.",
        "",
        "## Authority",
        "",
        "These 16 recipes override older ChatGPT project recipe-bank versions for the same dishes. For every other Riviera recipe, package rule, production rule, ordering workflow, and document format, use the ChatGPT Riviera project source pack as the baseline.",
        "",
        "## Overlay Recipe Index",
        "",
        "| Recipe ID | Recipe | Yield | Package refs |",
        "| --- | --- | --- | --- |",
    ]
    for recipe_id in HOUSE_STANDARD_IDS:
        recipe = by_id[recipe_id]
        refs = package_map.get(recipe_id, [])
        lines.append(
            f"| `{recipe_id}` | {md_escape(recipe.get('name'))} | {md_escape(recipe.get('yield') or '-')} | {md_escape('; '.join(refs) or 'Standalone / base')} |"
        )
    lines.extend(["", "## Full Overlay Recipes", ""])
    for recipe_id in HOUSE_STANDARD_IDS:
        lines.append(recipe_to_markdown(by_id[recipe_id], package_map.get(recipe_id, [])))
    return "\n".join(lines).rstrip() + "\n"


def source_inventory() -> list[dict[str, Any]]:
    rows = []
    for filename in SOURCE_FILES:
        path = SOURCE_DIR / filename
        if not path.exists():
            raise SystemExit(f"Missing ChatGPT source file: {path}")
        text = path.read_text(encoding="utf-8")
        rows.append(
            {
                "file": filename,
                "bytes": path.stat().st_size,
                "lines": text.count("\n") + (0 if text.endswith("\n") else 1),
                "sha256": sha256(path),
            }
        )
    return rows


def build_source_of_truth(overlay: str, inventory: list[dict[str, Any]]) -> str:
    lines: list[str] = [
        "# Riviera Source Of Truth 2026-07-08",
        "",
        "**Status:** Active merged source of truth.",
        "**Merge direction:** ChatGPT Riviera project sources are the latest baseline; July 8 tapas/canape recipes are the only overlay.",
        "**Generated by:** `scripts/build_riviera_source_of_truth.py`.",
        "",
        "## Authority And Conflict Rules",
        "",
        "1. Direct user corrections in a current event or recipe task outrank this file.",
        "2. The July 8 Tapas House Standards Overlay in this file outranks older ChatGPT recipe-bank content for the same 16 dishes.",
        "3. The ChatGPT Riviera project source pack downloaded on 2026-07-08 is the baseline for all other Riviera operations, production sheets, package logic, ordering, supplier translation, formatting, and source-routing decisions.",
        "4. `riviera_data/builtins.json`, `riviera_data/function_packages.json`, and generated PDFs are operational representations. For non-overlay conflicts, reconcile them back to this merged source before treating them as final.",
        "5. Do not silently invent missing recipe, package, dietary, ordering, or service rules. Mark `NEEDS CONFIRMATION` when sources conflict or a required detail is absent.",
        "",
        "## Active Source Stack",
        "",
        "| Order | Source file | Lines | SHA-256 |",
        "| ---: | --- | ---: | --- |",
    ]
    for idx, row in enumerate(inventory, 1):
        lines.append(f"| {idx} | `{row['file']}` | {row['lines']} | `{row['sha256'][:16]}` |")
    lines.extend(
        [
            "",
            "## July 8 Tapas Overlay",
            "",
            "The following section is embedded from `Riviera_Tapas_House_Standards_Overlay_2026-07-08.md`.",
            "",
            overlay.strip(),
            "",
            "## ChatGPT Baseline Source Appendices",
            "",
            "The appendices below preserve the ChatGPT Riviera project sources used as the baseline for this merge.",
            "",
        ]
    )
    for row in inventory:
        path = SOURCE_DIR / row["file"]
        content = path.read_text(encoding="utf-8").strip()
        lines.extend(
            [
                f"### Source: {row['file']}",
                "",
                f"- Lines: {row['lines']}",
                f"- SHA-256: `{row['sha256']}`",
                "",
                "````markdown",
                content,
                "````",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    recipes = load_json(BUILTINS_PATH)
    packages = load_json(PACKAGES_PATH)
    inventory = source_inventory()
    overlay = build_tapas_overlay(recipes, packages)
    source_of_truth = build_source_of_truth(overlay, inventory)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TAPAS_OVERLAY_PATH.write_text(overlay, encoding="utf-8")
    SOURCE_OF_TRUTH_PATH.write_text(source_of_truth, encoding="utf-8")
    manifest = {
        "status": "active",
        "date": "2026-07-08",
        "mergeDirection": "ChatGPT Riviera project sources are baseline; July 8 tapas/canape house standards overlay only.",
        "sourceOfTruth": str(SOURCE_OF_TRUTH_PATH.relative_to(ROOT)),
        "overlay": str(TAPAS_OVERLAY_PATH.relative_to(ROOT)),
        "chatgptSourceDir": str(SOURCE_DIR.relative_to(ROOT)),
        "houseStandardOverlayRecipeIds": HOUSE_STANDARD_IDS,
        "chatgptSources": inventory,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"sourceOfTruth": str(SOURCE_OF_TRUTH_PATH), "sources": len(inventory), "overlayRecipes": len(HOUSE_STANDARD_IDS)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
