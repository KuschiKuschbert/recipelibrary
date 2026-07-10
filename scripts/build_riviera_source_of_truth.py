#!/usr/bin/env python3
"""Build Riviera's merged source-of-truth bundle.

The verified ChatGPT Riviera Project snapshot is the legacy baseline. GitHub is
the mutable authority. The only overlay applied here is the July 8
tapas/canape house-standard recipe update represented in the structured Riviera
recipe catalog.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from collections import defaultdict
from html import unescape
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "riviera_sources" / "chatgpt_project_sources_2026-07-08"
OUTPUT_DIR = ROOT / "riviera_sources" / "current"
RECIPE_CATALOG_PATH = OUTPUT_DIR / "Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json"
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

SOURCE_FILES: list[dict[str, str]] = [
    {"file": "Baclava-Cheesecake.txt", "kind": "text", "liveName": "Baclava-Cheesecake.txt"},
    {"file": "Riviera_Sunday_Tapas_Pull_Matrix_SOP_Addendum_v1_2026-06-16.md", "kind": "text", "liveName": "Riviera_Sunday_Tapas_Pull_Matrix_SOP_Addendum_v1_2026-06-16.md"},
    {
        "file": "Riviera_Sunday_Tapas_Pull_Matrix_A4_Kitchen_Sheet_v1_2026-06-16.txt",
        "kind": "text",
        "liveName": "Riviera-Sunday-Tapas-Pull-Matrix-—-A4-Kitchen-Sheet-v1.txt",
    },
    {"file": "kitchen_pull_matrix.pdf", "kind": "pdf", "extract": "extracted/kitchen_pull_matrix.pdf.extracted.md", "liveName": "kitchen_pull_matrix.pdf"},
    {"file": "Riviera_SOP_Master_Index_v10_2026-06-16.md", "kind": "text", "liveName": "Riviera_SOP_Master_Index_v10_2026-06-16.md"},
    {"file": "Riviera_Kitchen_Production_Harness_Index_v5_2026-06-16.md", "kind": "text", "liveName": "Riviera_Kitchen_Production_Harness_Index_v5_2026-06-16.md"},
    {"file": "Riviera_Count_Ordering_Harness_v3_2026-06-16.md", "kind": "text", "liveName": "Riviera_Count_Ordering_Harness_v3_2026-06-16.md"},
    {"file": "Riviera_Component_Module_Library_v3_2026-06-16.md", "kind": "text", "liveName": "Riviera_Component_Module_Library_v3_2026-06-16.md"},
    {"file": "Riviera_Real_Event_Test_Pack_v2_2026-06-16.md", "kind": "text", "liveName": "Riviera_Real_Event_Test_Pack_v2_2026-06-16.md"},
    {"file": "Riviera_Production_Sheet_Template_Library_v2_2026-06-16.md", "kind": "text", "liveName": "Riviera_Production_Sheet_Template_Library_v2_2026-06-16.md"},
    {"file": "MYO bars and Buffets.pdf", "kind": "pdf", "extract": "extracted/MYO bars and Buffets.pdf.extracted.md", "liveName": "MYO bars and Buffets.pdf"},
    {"file": "Updated_Riviera_instructions_2026-06-09_extracted.md", "kind": "text", "liveName": "Updated Riviera instructions"},
    {"file": "foodpairing_condensed_riviera_reference.md", "kind": "text", "liveName": "foodpairing_condensed_riviera_reference.md"},
    {"file": "Riviera_Weekly_Order_Workflow_v1_2026-06-09.md", "kind": "text", "liveName": "Riviera_Weekly_Order_Workflow_v1_2026-06-09.md"},
    {"file": "Riviera_Package_Source_Digest_v1_2026-06-09.md", "kind": "text", "liveName": "Riviera_Package_Source_Digest_v1_2026-06-09.md"},
    {"file": "Riviera_Order_Template_v1_2026-06-09.md", "kind": "text", "liveName": "Riviera_Order_Template_v1_2026-06-09.md"},
    {"file": "Riviera_Canonical_Recipe_Bank_v1_2026-06-08.md", "kind": "text", "liveName": "Riviera_Canonical_Recipe_Bank_v1_2026-06-08.md"},
    {"file": "Riviera_Supplier_Ordering_Translator_v1_2026-06-08.md", "kind": "text", "liveName": "Riviera_Supplier_Ordering_Translator_v1_2026-06-08.md"},
    {"file": "Riviera_Seasoning_Palette_v2_2026-06-08.md", "kind": "text", "liveName": "Riviera_Seasoning_Palette_v2_2026-06-08.md"},
    {"file": "Recipes for Prep Chef.docx", "kind": "docx", "extract": "extracted/Recipes for Prep Chef.docx.extracted.md", "liveName": "Recipes for Prep Chef.docx"},
    {
        "file": "Olive+Green+on+White+Background.webp.source-record.md",
        "kind": "image-source-record",
        "liveName": "Olive+Green+on+White+Background.webp",
    },
    {"file": "Bidfood_Item_List.pdf", "kind": "pdf", "extract": "extracted/Bidfood_Item_List.pdf.extracted.md", "liveName": "Bidfood_Item_List.pdf"},
    {
        "file": "OrderForm11579311 - 1098368202605251257349179710.xlsx",
        "kind": "xlsx",
        "extract": "extracted/OrderForm11579311 - 1098368202605251257349179710.xlsx.extracted.md",
        "liveName": "OrderForm11579311 - 1098368202605251257349179710.xlsx",
    },
]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_recipe_catalog() -> list[dict[str, Any]]:
    if not RECIPE_CATALOG_PATH.exists():
        raise SystemExit(f"Missing structured Riviera recipe catalog: {RECIPE_CATALOG_PATH.relative_to(ROOT)}")
    payload = load_json(RECIPE_CATALOG_PATH)
    if not isinstance(payload, dict) or not isinstance(payload.get("recipes"), list):
        raise SystemExit(f"{RECIPE_CATALOG_PATH.relative_to(ROOT)} must be an object with a recipes list")
    return payload["recipes"]


def clean(value: Any) -> str:
    return " ".join(str(value or "").split())


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def line_count(text: str) -> int:
    return text.count("\n") + (0 if text.endswith("\n") else 1)


def write_if_changed(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return
    path.write_text(content, encoding="utf-8")


def extract_pdf(path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    lines = [f"# Extracted Text: {path.name}", "", f"Pages: {len(reader.pages)}", ""]
    for page_num, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        text = re.sub(r"[ \t]+", " ", text).strip()
        if text:
            lines.extend([f"## Page {page_num}", "", text, ""])
    return "\n".join(lines).rstrip() + "\n"


def extract_docx(path: Path) -> str:
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    lines = [f"# Extracted Text: {path.name}", ""]
    with zipfile.ZipFile(path) as zf:
        xml = zf.read("word/document.xml")
    root = ET.fromstring(xml)
    for para in root.findall(".//w:p", ns):
        bits = []
        for node in para.findall(".//w:t", ns):
            if node.text:
                bits.append(node.text)
        text = clean(unescape("".join(bits)))
        if text:
            lines.append(text)
    return "\n\n".join(lines).rstrip() + "\n"


def extract_xlsx(path: Path) -> str:
    from openpyxl import load_workbook

    workbook = load_workbook(path, read_only=True, data_only=False)
    lines = [f"# Extracted Workbook Preview: {path.name}", ""]
    for sheet in workbook.worksheets:
        lines.extend([f"## Sheet: {sheet.title}", ""])
        for row in sheet.iter_rows(values_only=True):
            values = [clean(cell) for cell in row]
            while values and not values[-1]:
                values.pop()
            if not any(values):
                continue
            lines.append("| " + " | ".join(value.replace("|", "\\|") or "-" for value in values) + " |")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def ensure_extract(source: dict[str, str], source_path: Path, *, write: bool) -> str | None:
    extract_rel = source.get("extract")
    if not extract_rel:
        return None
    extract_path = SOURCE_DIR / extract_rel
    if not write:
        if not extract_path.is_file():
            raise SystemExit(f"Missing source extract: {extract_path.relative_to(ROOT)}")
        return extract_rel
    kind = source["kind"]
    if kind == "pdf":
        content = extract_pdf(source_path)
    elif kind == "docx":
        content = extract_docx(source_path)
    elif kind == "xlsx":
        content = extract_xlsx(source_path)
    else:
        raise SystemExit(f"Unsupported extract kind {kind!r} for {source_path}")
    write_if_changed(extract_path, content)
    return extract_rel


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
        "**Source:** `Tapas Canape Recipe Cards.docx`, standardised into the structured Riviera recipe catalog on 2026-07-08.",
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


def source_inventory(*, write_extracts: bool) -> list[dict[str, Any]]:
    rows = []
    for source in SOURCE_FILES:
        filename = source["file"]
        path = SOURCE_DIR / filename
        if not path.exists():
            raise SystemExit(f"Missing ChatGPT source file: {path}")
        extract_rel = ensure_extract(source, path, write=write_extracts)
        text_path = SOURCE_DIR / (extract_rel or filename)
        text: str | None = None
        lines: int | None = None
        if text_path.suffix.lower() in {".md", ".txt"}:
            text = text_path.read_text(encoding="utf-8")
            lines = line_count(text)
        rows.append(
            {
                "file": filename,
                "liveName": source.get("liveName", filename),
                "kind": source["kind"],
                "bytes": path.stat().st_size,
                "lines": lines,
                "sha256": sha256(path),
                "extract": extract_rel,
                "extractLines": line_count(text) if text is not None and extract_rel else None,
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
        "4. `riviera_sources/current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json` is the canonical structured recipe payload derived from this source stack and the July 8 overlay.",
        "5. `riviera_data/builtins.json`, `riviera_data/function_packages.json`, and generated PDFs are operational representations. For non-overlay conflicts, reconcile them back to this merged source and structured catalog before treating them as final.",
        "6. Do not silently invent missing recipe, package, dietary, ordering, or service rules. Mark `NEEDS CONFIRMATION` when sources conflict or a required detail is absent.",
        "",
        "## Active Source Stack",
        "",
        "| Order | Live project source | Stored file | Kind | Lines | SHA-256 |",
        "| ---: | --- | --- | --- | ---: | --- |",
    ]
    for idx, row in enumerate(inventory, 1):
        row_lines = row["lines"] if row["lines"] is not None else "-"
        lines.append(
            f"| {idx} | {md_escape(row['liveName'])} | `{row['file']}` | {md_escape(row['kind'])} | {row_lines} | `{row['sha256'][:16]}` |"
        )
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
        content_rel = row.get("extract") or row["file"]
        content_path = SOURCE_DIR / content_rel
        content = content_path.read_text(encoding="utf-8").strip()
        lines.extend(
            [
                f"### Source: {row['liveName']}",
                "",
                f"- Stored file: `{row['file']}`",
                f"- Kind: {row['kind']}",
                f"- Lines: {row['lines']}",
                f"- SHA-256: `{row['sha256']}`",
            "",
            ]
        )
        if row.get("extract"):
            lines.append(f"- Text extract: `{row['extract']}`")
            lines.append("")
        else:
            lines.append("")
        lines.extend(
            [
                "````markdown",
                content,
                "````",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def expected_manifest(inventory: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "status": "active",
        "date": "2026-07-08",
        "mergeDirection": "ChatGPT Riviera project sources are baseline; July 8 tapas/canape house standards overlay only.",
        "sourceOfTruth": str(SOURCE_OF_TRUTH_PATH.relative_to(ROOT)),
        "structuredRecipeCatalog": str(RECIPE_CATALOG_PATH.relative_to(ROOT)),
        "overlay": str(TAPAS_OVERLAY_PATH.relative_to(ROOT)),
        "chatgptSourceDir": str(SOURCE_DIR.relative_to(ROOT)),
        "houseStandardOverlayRecipeIds": HOUSE_STANDARD_IDS,
        "chatgptSources": inventory,
    }


def check_generated_file(path: Path, expected: str, errors: list[str]) -> None:
    if not path.is_file():
        errors.append(f"missing generated file: {path.relative_to(ROOT)}")
        return
    actual = path.read_text(encoding="utf-8")
    if actual != expected:
        errors.append(
            f"generated drift: {path.relative_to(ROOT)}; "
            "run python3 scripts/build_riviera_source_of_truth.py --write"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="verify generated SSOT files without writing")
    mode.add_argument("--write", action="store_true", help="rebuild generated SSOT files")
    args = parser.parse_args()

    write = not args.check
    recipes = load_recipe_catalog()
    packages = load_json(PACKAGES_PATH)
    inventory = source_inventory(write_extracts=write)
    overlay = build_tapas_overlay(recipes, packages)
    source_of_truth = build_source_of_truth(overlay, inventory)
    manifest_text = json.dumps(expected_manifest(inventory), indent=2) + "\n"

    if args.check:
        errors: list[str] = []
        check_generated_file(TAPAS_OVERLAY_PATH, overlay, errors)
        check_generated_file(SOURCE_OF_TRUTH_PATH, source_of_truth, errors)
        check_generated_file(MANIFEST_PATH, manifest_text, errors)
        if errors:
            for error in errors:
                print(f"ERROR: {error}", file=sys.stderr)
            return 1
        print(
            json.dumps(
                {
                    "status": "ok",
                    "mode": "check",
                    "sourceOfTruth": str(SOURCE_OF_TRUTH_PATH.relative_to(ROOT)),
                    "sources": len(inventory),
                    "overlayRecipes": len(HOUSE_STANDARD_IDS),
                },
                indent=2,
            )
        )
        return 0

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    write_if_changed(TAPAS_OVERLAY_PATH, overlay)
    write_if_changed(SOURCE_OF_TRUTH_PATH, source_of_truth)
    write_if_changed(MANIFEST_PATH, manifest_text)
    print(
        json.dumps(
            {
                "status": "ok",
                "mode": "write",
                "sourceOfTruth": str(SOURCE_OF_TRUTH_PATH.relative_to(ROOT)),
                "sources": len(inventory),
                "overlayRecipes": len(HOUSE_STANDARD_IDS),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
