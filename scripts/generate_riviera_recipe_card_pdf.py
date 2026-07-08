#!/usr/bin/env python3
"""Generate the Riviera internal kitchen recipe-card PDF.

Source data stays untouched. This script normalises display text for the PDF
only, builds package/category indexes, and writes a print-friendly A4 book.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Flowable,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
BUILTINS_PATH = ROOT / "riviera_data" / "builtins.json"
PACKAGES_PATH = ROOT / "riviera_data" / "function_packages.json"
DEFAULT_OUTPUT = ROOT / "output" / "pdf" / "Riviera_Kitchen_Recipe_Card_Book_2026-07-08.pdf"
PROBE_OUTPUT = ROOT / "tmp" / "pdfs" / "_riviera_recipe_card_book_probe.pdf"
EXPECTED_RECIPE_COUNT = 146

BRAND_OLIVE = colors.HexColor("#5C6B3A")
BRAND_GOLD = colors.HexColor("#C8A96E")
BRAND_CREAM = colors.HexColor("#FAF8F3")
BRAND_CHARCOAL = colors.HexColor("#2C2C2C")
BRAND_MUTED = colors.HexColor("#6D6A61")
BRAND_LINE = colors.HexColor("#D9CDAE")
BRAND_GREEN_PALE = colors.HexColor("#EAF0DF")
BRAND_GOLD_PALE = colors.HexColor("#F3E8CB")
WARM_WHITE = colors.HexColor("#FFFDF8")

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
HOUSE_STANDARD_ORDER = {recipe_id: idx for idx, recipe_id in enumerate(HOUSE_STANDARD_IDS)}

PACKAGE_LABEL_OVERRIDES = {
    "offsite": "Riviera Table / Offsite",
}
PACKAGE_GROUP_ORDER = [
    "House Standards + Tapas / Canapes",
    "Corporate",
    "Riviera Table / Offsite",
    "Weddings",
    "Parties",
    "Baby Shower",
    "Funeral & Wake",
    "Core / Components / Standalone",
]
PACKAGE_PRIORITY = {label: idx for idx, label in enumerate(PACKAGE_GROUP_ORDER)}


@dataclass
class RecipeMeta:
    group: str
    package_labels: list[str]
    section_labels: list[str]
    group_sort: tuple[Any, ...]


class RecipeAnchor(Flowable):
    """Zero-height marker used to record recipe page starts."""

    def __init__(self, recipe_id: str) -> None:
        super().__init__()
        self.recipe_id = recipe_id
        self.width = 0
        self.height = 0

    def wrap(self, avail_width: float, avail_height: float) -> tuple[int, int]:
        return (0, 0)

    def draw(self) -> None:
        return


class RecordingDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str, *, recipe_pages: dict[str, int], **kwargs: Any) -> None:
        super().__init__(filename, **kwargs)
        self.recipe_pages = recipe_pages
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            id="normal",
            showBoundary=0,
        )
        self.addPageTemplates(
            [
                PageTemplate(
                    id="main",
                    frames=[frame],
                    onPage=draw_page_background,
                )
            ]
        )

    def afterFlowable(self, flowable: Flowable) -> None:
        if isinstance(flowable, RecipeAnchor):
            self.recipe_pages[flowable.recipe_id] = self.page
            self.canv.bookmarkPage(flowable.recipe_id)


def register_fonts() -> dict[str, str]:
    fonts = {
        "title": "Times-Roman",
        "body": "Times-Roman",
        "body_bold": "Times-Bold",
        "body_italic": "Times-Italic",
    }
    candidates = {
        "Cormorant": Path.home() / "Library/Fonts/CormorantGaramond-VariableFont_wght.ttf",
        "Georgia": Path("/System/Library/Fonts/Supplemental/Georgia.ttf"),
        "Georgia-Bold": Path("/System/Library/Fonts/Supplemental/Georgia Bold.ttf"),
        "Georgia-Italic": Path("/System/Library/Fonts/Supplemental/Georgia Italic.ttf"),
    }
    for name, path in candidates.items():
        if not path.exists():
            continue
        try:
            pdfmetrics.registerFont(TTFont(name, str(path)))
        except Exception:
            continue

    if "Cormorant" in pdfmetrics.getRegisteredFontNames():
        fonts["title"] = "Cormorant"
    if "Georgia" in pdfmetrics.getRegisteredFontNames():
        fonts["body"] = "Georgia"
    if "Georgia-Bold" in pdfmetrics.getRegisteredFontNames():
        fonts["body_bold"] = "Georgia-Bold"
    if "Georgia-Italic" in pdfmetrics.getRegisteredFontNames():
        fonts["body_italic"] = "Georgia-Italic"
    return fonts


FONTS = register_fonts()


def fmt_number(value: float) -> str:
    if abs(value - round(value)) < 0.01:
        return str(int(round(value)))
    if value < 10:
        return f"{value:.1f}".rstrip("0").rstrip(".")
    return str(int(round(value)))


def clean_text(value: Any) -> str:
    text = str(value or "")
    replacements = {
        "\u2013": "-",
        "\u2014": "-",
        "\u2011": "-",
        "\u2010": "-",
        "\u2212": "-",
        "\u00d7": "x",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u00b0C": "deg C",
        "\u00b0": " deg",
        "\u00bd": "1/2",
        "\u00bc": "1/4",
        "\u00be": "3/4",
        "\u2153": "1/3",
        "\u2154": "2/3",
        "\u215b": "1/8",
        "\u215c": "3/8",
        "\u215d": "5/8",
        "\u215e": "7/8",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_mixed_number(raw: str) -> float | None:
    raw = clean_text(raw).strip().lower()
    word_numbers = {
        "one": 1.0,
        "two": 2.0,
        "three": 3.0,
        "four": 4.0,
        "five": 5.0,
        "six": 6.0,
        "seven": 7.0,
        "eight": 8.0,
        "nine": 9.0,
        "ten": 10.0,
    }
    if raw in word_numbers:
        return word_numbers[raw]
    m = re.match(r"^(\d+(?:\.\d+)?)\s+(\d+)/(\d+)$", raw)
    if m:
        return float(m.group(1)) + float(m.group(2)) / float(m.group(3))
    m = re.match(r"^(\d+)/(\d+)$", raw)
    if m:
        return float(m.group(1)) / float(m.group(2))
    m = re.match(r"^\d+(?:\.\d+)?$", raw)
    if m:
        return float(raw)
    return None


def replace_volume_units(text: str) -> str:
    text = clean_text(text)

    def replace_fraction(match: re.Match[str], ml_per: float) -> str:
        value = parse_mixed_number(match.group(1))
        if value is None:
            return match.group(0)
        return f"{fmt_number(value * ml_per)} ml"

    patterns = [
        (r"\b((?:\d+(?:\.\d+)?\s+)?\d+/\d+|\d+(?:\.\d+)?)\s*(?:tsp|teaspoons?)\b", 5.0),
        (r"\b((?:\d+(?:\.\d+)?\s+)?\d+/\d+|\d+(?:\.\d+)?)\s*(?:tbsp|tablespoons?)\b", 15.0),
        (r"\b((?:\d+(?:\.\d+)?\s+)?\d+/\d+|\d+(?:\.\d+)?)\s*cups?\b", 250.0),
    ]
    for pattern, ml_per in patterns:
        text = re.sub(pattern, lambda m, p=ml_per: replace_fraction(m, p), text, flags=re.I)

    word_num = r"(one|two|three|four|five|six|seven|eight|nine|ten)"
    text = re.sub(
        rf"\b{word_num}\s+(?:level\s+|heaped\s+)?(?:tsp|teaspoons?)\b",
        lambda m: f"{fmt_number((parse_mixed_number(m.group(1)) or 1) * 5)} ml",
        text,
        flags=re.I,
    )
    text = re.sub(
        rf"\b{word_num}\s+(?:level\s+|heaped\s+)?(?:tbsp|tablespoons?)\b",
        lambda m: f"{fmt_number((parse_mixed_number(m.group(1)) or 1) * 15)} ml",
        text,
        flags=re.I,
    )
    text = re.sub(
        r"\b(?:a\s+)?(?:level\s+|heaped\s+)?teaspoon\b",
        "5 ml",
        text,
        flags=re.I,
    )
    text = re.sub(
        r"\b(?:a\s+)?(?:level\s+|heaped\s+)?tablespoon\b",
        "15 ml",
        text,
        flags=re.I,
    )
    text = re.sub(r"\bshot cups?\b", "small shot glasses", text, flags=re.I)
    text = re.sub(r"\bfoil cups?\b", "foil ramekins", text, flags=re.I)
    text = re.sub(r"\bcups or bowls\b", "ramekins or bowls", text, flags=re.I)
    text = re.sub(r"\broving tiramisu cups\b", "Roving Tiramisu Portions", text, flags=re.I)
    text = re.sub(r"\btiramisu cups\b", "tiramisu portions", text, flags=re.I)
    text = re.sub(r"\bindividual cups\b", "individual bowls", text, flags=re.I)
    text = re.sub(r"\bespresso cups\b", "espresso glasses", text, flags=re.I)
    text = re.sub(r"\bglass cups\b", "small glasses", text, flags=re.I)
    text = re.sub(r"\bcups\b", "small bowls", text, flags=re.I)
    text = re.sub(r"\bif cup allows\b", "if the glass allows", text, flags=re.I)
    text = re.sub(r"\btiramisu cup format\b", "tiramisu portion format", text, flags=re.I)
    text = re.sub(r"\bcup mushroom\b", "medium mushroom", text, flags=re.I)
    text = re.sub(r"\bcup mushrooms\b", "medium mushrooms", text, flags=re.I)
    text = re.sub(r"\bthe cup to sever\b", "the shell well to sever", text, flags=re.I)
    text = re.sub(r"\bcup/tsp\b", "volume measures", text, flags=re.I)
    text = re.sub(r"\btsp measurements\b", "small leavening measures", text, flags=re.I)
    return text


def herb_bunch_weight(item: str) -> int:
    n = item.lower()
    if "parsley" in n or "coriander" in n:
        return 60
    if "basil" in n:
        return 50
    if "dill" in n or "mint" in n:
        return 30
    if "thyme" in n or "rosemary" in n:
        return 25
    if "shallot" in n:
        return 100
    return 50


def sprig_weight(item: str) -> int:
    n = item.lower()
    if "thyme" in n:
        return 1
    if "rosemary" in n:
        return 2
    return 2


def normalise_qty(qty: Any, item: Any) -> str:
    raw = clean_text(qty)
    item_text = clean_text(item)
    if not raw:
        return ""
    lower = raw.lower()
    if lower in {"as needed", "to taste", "pinch", "pinch and a bit"}:
        return raw
    if lower == "canola or rice bran oil":
        return "as needed"
    if re.match(r"^\d+\s*jar\s*2\s*kg$", lower):
        return "2 kg"
    if re.match(r"^\d+\s*large\s*tin$", lower):
        unit = "L" if any(x in item_text.lower() for x in ["passata", "sugo"]) else "kg"
        return f"2.5 {unit}"

    raw = replace_volume_units(raw)
    lower = raw.lower()

    m = re.match(r"^((?:\d+(?:\.\d+)?\s+)?\d+/\d+|\d+(?:\.\d+)?)\s*bunch(?:es)?$", lower)
    if m:
        count = parse_mixed_number(m.group(1)) or 1
        return f"{fmt_number(count * herb_bunch_weight(item_text))} g (approx. {fmt_number(count)} bunch)"

    m = re.match(r"^((?:\d+(?:\.\d+)?\s+)?\d+/\d+|\d+(?:\.\d+)?)\s*punnets?$", lower)
    if m:
        count = parse_mixed_number(m.group(1)) or 1
        return f"{fmt_number(count * 30)} g (approx. {fmt_number(count)} punnets)"

    m = re.match(r"^((?:\d+(?:\.\d+)?\s+)?\d+/\d+|\d+(?:\.\d+)?)\s*bags?$", lower)
    if m and any(x in item_text.lower() for x in ["rocket", "spinach", "leaf", "leaves"]):
        count = parse_mixed_number(m.group(1)) or 1
        return f"{fmt_number(count * 125)} g (approx. {fmt_number(count)} bags)"

    m = re.match(r"^((?:\d+(?:\.\d+)?\s+)?\d+/\d+|\d+(?:\.\d+)?)\s*cloves?$", lower)
    if m and "garlic" in item_text.lower():
        count = parse_mixed_number(m.group(1)) or 1
        return f"{fmt_number(count * 5)} g (approx. {fmt_number(count)} cloves)"

    m = re.match(r"^((?:\d+(?:\.\d+)?\s+)?\d+/\d+|\d+(?:\.\d+)?)\s*heads?$", lower)
    if m and "garlic" in item_text.lower():
        count = parse_mixed_number(m.group(1)) or 1
        return f"{fmt_number(count * 60)} g (approx. {fmt_number(count)} heads)"

    m = re.match(r"^((?:\d+(?:\.\d+)?\s+)?\d+/\d+|\d+(?:\.\d+)?)\s*sprigs?$", lower)
    if m:
        count = parse_mixed_number(m.group(1)) or 1
        return f"{fmt_number(count * sprig_weight(item_text))} g (approx. {fmt_number(count)} sprigs)"

    if re.match(r"^\d+(?:\.\d+)?$", lower):
        return f"{raw} pc"
    return raw


def normalise_display_text(value: Any) -> str:
    return replace_volume_units(clean_text(value))


def para(text: Any, style: ParagraphStyle) -> Paragraph:
    safe = escape(normalise_display_text(text))
    return Paragraph(safe, style)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def recipe_ref_from_item(item: dict[str, Any]) -> str | None:
    for key in ("recipeId", "recipe_id", "id", "builtin_id"):
        rid = item.get(key)
        if isinstance(rid, str) and rid.strip():
            return rid.strip()
    return None


def build_package_membership(packages: dict[str, Any], recipe_ids: set[str]) -> tuple[dict[str, list[str]], dict[str, list[str]], dict[tuple[str, str], int]]:
    recipe_to_packages: dict[str, list[str]] = {rid: [] for rid in recipe_ids}
    recipe_to_sections: dict[str, list[str]] = {rid: [] for rid in recipe_ids}
    first_occurrence: dict[tuple[str, str], int] = {}
    sequence = 0

    for pkg in packages.get("packages", []):
        package_id = str(pkg.get("id") or "")
        package_label = PACKAGE_LABEL_OVERRIDES.get(package_id, str(pkg.get("label") or package_id or "Package"))
        for section in pkg.get("sections", []) or []:
            section_label = normalise_display_text(section.get("label") or section.get("id") or "Package section")
            for course in section.get("courses", []) or []:
                for item in course.get("items", []) or []:
                    if not isinstance(item, dict):
                        continue
                    rid = recipe_ref_from_item(item)
                    if rid not in recipe_ids:
                        continue
                    sequence += 1
                    if package_label not in recipe_to_packages[rid]:
                        recipe_to_packages[rid].append(package_label)
                    section_ref = f"{package_label}: {section_label}"
                    if section_ref not in recipe_to_sections[rid]:
                        recipe_to_sections[rid].append(section_ref)
                    first_occurrence.setdefault((package_label, rid), sequence)

    def package_sort(label: str) -> tuple[int, str]:
        return (PACKAGE_PRIORITY.get(label, 99), label)

    for rid in recipe_ids:
        recipe_to_packages[rid].sort(key=package_sort)
        recipe_to_sections[rid].sort(key=lambda s: (PACKAGE_PRIORITY.get(s.split(": ", 1)[0], 99), s))

    return recipe_to_packages, recipe_to_sections, first_occurrence


def is_house_standard(recipe: dict[str, Any]) -> bool:
    return bool(recipe.get("houseStandard")) or str(recipe.get("id")) in HOUSE_STANDARD_ORDER


def is_tapas_or_canape(recipe: dict[str, Any]) -> bool:
    hay = " ".join(
        str(recipe.get(key) or "")
        for key in ("type", "course", "name", "subtitle")
    ).lower()
    return any(
        token in hay
        for token in (
            "canape",
            "tapas",
            "hot nibble",
            "warm bite",
            "substantial",
            "slider",
        )
    )


def course_rank(recipe: dict[str, Any]) -> tuple[int, str]:
    hay = f"{recipe.get('course', '')} {recipe.get('type', '')}".lower()
    order = [
        ("canape", 0),
        ("tapas", 1),
        ("starter", 2),
        ("main", 3),
        ("side", 4),
        ("sauce", 5),
        ("base", 5),
        ("component", 6),
        ("prep", 6),
        ("dessert", 7),
        ("bakery", 8),
        ("bread", 8),
        ("breakfast", 9),
        ("lunch", 10),
    ]
    for token, rank in order:
        if token in hay:
            return (rank, normalise_display_text(recipe.get("name")))
    return (99, normalise_display_text(recipe.get("name")))


def group_for_recipe(recipe: dict[str, Any], package_labels: list[str]) -> str:
    if is_house_standard(recipe) or is_tapas_or_canape(recipe):
        return "House Standards + Tapas / Canapes"
    for label in ("Corporate", "Riviera Table / Offsite", "Weddings", "Parties", "Baby Shower", "Funeral & Wake"):
        if label in package_labels:
            return label
    return "Core / Components / Standalone"


def build_recipe_meta(
    recipes: list[dict[str, Any]],
    packages: dict[str, Any],
) -> dict[str, RecipeMeta]:
    recipe_ids = {str(r.get("id")) for r in recipes}
    package_map, section_map, first_occurrence = build_package_membership(packages, recipe_ids)
    meta: dict[str, RecipeMeta] = {}
    for index, recipe in enumerate(recipes):
        rid = str(recipe["id"])
        package_labels = package_map.get(rid, [])
        group = group_for_recipe(recipe, package_labels)
        if group == "House Standards + Tapas / Canapes":
            house_rank = HOUSE_STANDARD_ORDER.get(rid, len(HOUSE_STANDARD_ORDER) + index)
            group_sort = (0 if is_house_standard(recipe) else 1, house_rank, *course_rank(recipe))
        elif group in package_labels:
            group_sort = (first_occurrence.get((group, rid), 99999), *course_rank(recipe))
        else:
            group_sort = (*course_rank(recipe), index)
        meta[rid] = RecipeMeta(
            group=group,
            package_labels=package_labels,
            section_labels=section_map.get(rid, []),
            group_sort=group_sort,
        )
    return meta


def sorted_recipes(recipes: list[dict[str, Any]], meta: dict[str, RecipeMeta]) -> list[dict[str, Any]]:
    return sorted(
        recipes,
        key=lambda r: (
            PACKAGE_PRIORITY.get(meta[str(r["id"])].group, 99),
            meta[str(r["id"])].group_sort,
            normalise_display_text(r.get("name")),
        ),
    )


def group_recipes(recipes: list[dict[str, Any]], meta: dict[str, RecipeMeta]) -> list[tuple[str, list[dict[str, Any]]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for recipe in recipes:
        grouped[meta[str(recipe["id"])].group].append(recipe)
    return [(group, grouped[group]) for group in PACKAGE_GROUP_ORDER if grouped.get(group)]


def short_list(values: list[str], limit: int = 5) -> str:
    if not values:
        return "Standalone"
    if len(values) <= limit:
        return ", ".join(values)
    return ", ".join(values[:limit]) + f", +{len(values) - limit} more"


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    styles = {
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName=FONTS["title"],
            fontSize=34,
            leading=38,
            textColor=BRAND_OLIVE,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["Normal"],
            fontName=FONTS["body"],
            fontSize=14,
            leading=18,
            textColor=BRAND_MUTED,
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName=FONTS["title"],
            fontSize=24,
            leading=28,
            textColor=BRAND_OLIVE,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName=FONTS["body_bold"],
            fontSize=11,
            leading=13,
            textColor=BRAND_OLIVE,
            spaceBefore=8,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName=FONTS["body"],
            fontSize=8.2,
            leading=10.2,
            textColor=BRAND_CHARCOAL,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontName=FONTS["body"],
            fontSize=6.7,
            leading=8.0,
            textColor=BRAND_CHARCOAL,
        ),
        "small_muted": ParagraphStyle(
            "SmallMuted",
            parent=base["Normal"],
            fontName=FONTS["body"],
            fontSize=6.5,
            leading=7.7,
            textColor=BRAND_MUTED,
        ),
        "small_right": ParagraphStyle(
            "SmallRight",
            parent=base["Normal"],
            fontName=FONTS["body"],
            fontSize=6.6,
            leading=7.8,
            textColor=BRAND_CHARCOAL,
            alignment=TA_RIGHT,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=base["Normal"],
            fontName=FONTS["body_bold"],
            fontSize=6.8,
            leading=8.2,
            textColor=WARM_WHITE,
        ),
        "recipe_title": ParagraphStyle(
            "RecipeTitle",
            parent=base["Heading1"],
            fontName=FONTS["title"],
            fontSize=19,
            leading=21,
            textColor=BRAND_OLIVE,
            spaceAfter=2,
        ),
        "recipe_subtitle": ParagraphStyle(
            "RecipeSubtitle",
            parent=base["Normal"],
            fontName=FONTS["body_italic"],
            fontSize=8,
            leading=9.5,
            textColor=BRAND_MUTED,
        ),
        "tag": ParagraphStyle(
            "Tag",
            parent=base["Normal"],
            fontName=FONTS["body_bold"],
            fontSize=6.4,
            leading=7.4,
            textColor=BRAND_OLIVE,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading3"],
            fontName=FONTS["body_bold"],
            fontSize=8.1,
            leading=9.5,
            textColor=BRAND_OLIVE,
            spaceBefore=5,
            spaceAfter=3,
        ),
        "note": ParagraphStyle(
            "Note",
            parent=base["Normal"],
            fontName=FONTS["body_italic"],
            fontSize=7.1,
            leading=8.4,
            textColor=BRAND_MUTED,
        ),
    }
    return styles


STYLES = make_styles()


def draw_page_background(canvas: Any, doc: BaseDocTemplate) -> None:
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(BRAND_CREAM)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setStrokeColor(BRAND_LINE)
    canvas.setLineWidth(0.4)
    canvas.line(doc.leftMargin, 13 * mm, width - doc.rightMargin, 13 * mm)
    canvas.setFillColor(BRAND_MUTED)
    canvas.setFont(FONTS["body"], 6.5)
    canvas.drawString(doc.leftMargin, 8.5 * mm, "Riviera Kitchen - internal recipe cards")
    canvas.drawRightString(width - doc.rightMargin, 8.5 * mm, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def table_cell(text: Any, style_name: str = "small") -> Paragraph:
    return para(text, STYLES[style_name])


def build_cover(recipes: list[dict[str, Any]]) -> list[Any]:
    house_count = sum(1 for r in recipes if is_house_standard(r))
    story: list[Any] = [Spacer(1, 62 * mm)]
    story.append(Paragraph("Riviera Kitchen", STYLES["cover_title"]))
    story.append(Paragraph("Recipe Card Book", STYLES["cover_title"]))
    story.append(HRFlowable(width="62%", thickness=1.2, color=BRAND_GOLD, spaceBefore=5, spaceAfter=12))
    story.append(Paragraph("Internal kitchen reference - metric, package-tagged, tapas first", STYLES["cover_subtitle"]))
    summary = [
        ["Recipes", str(len(recipes))],
        ["House standards", str(house_count)],
        ["Layout", "A4 portrait, compact kitchen cards"],
        ["Source", "riviera_data/builtins.json"],
    ]
    t = Table(
        [[table_cell(a, "table_header"), table_cell(b, "small")] for a, b in summary],
        colWidths=[50 * mm, 70 * mm],
        hAlign="CENTER",
    )
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), BRAND_OLIVE),
                ("BACKGROUND", (1, 0), (1, -1), WARM_WHITE),
                ("BOX", (0, 0), (-1, -1), 0.6, BRAND_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, BRAND_LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 16 * mm))
    story.append(
        Paragraph(
            "Use the index first: house standards and tapas/canapes lead the book, followed by Corporate, Riviera Table / Offsite, Weddings, Parties, Baby Shower, Funeral & Wake, then standalone core components.",
            STYLES["body"],
        )
    )
    story.append(PageBreak())
    return story


def build_quick_index(
    grouped: list[tuple[str, list[dict[str, Any]]]],
    recipe_pages: dict[str, int],
) -> list[Any]:
    story: list[Any] = [Paragraph("Quick-use category index", STYLES["h1"])]
    rows = [[table_cell("Category", "table_header"), table_cell("Recipes", "table_header"), table_cell("Starts", "table_header")]]
    for group, recipes in grouped:
        first_id = str(recipes[0]["id"])
        rows.append(
            [
                table_cell(group, "small"),
                table_cell(str(len(recipes)), "small_right"),
                table_cell(str(recipe_pages.get(first_id, "...")), "small_right"),
            ]
        )
    table = Table(rows, colWidths=[116 * mm, 25 * mm, 25 * mm], repeatRows=1)
    table.setStyle(index_table_style())
    story.append(table)
    story.append(Spacer(1, 5 * mm))
    story.append(
        Paragraph(
            "Package labels show where a recipe is used. A recipe appears once only, even when it belongs to multiple packages.",
            STYLES["small_muted"],
        )
    )
    story.append(PageBreak())
    return story


def build_master_index(
    grouped: list[tuple[str, list[dict[str, Any]]]],
    meta: dict[str, RecipeMeta],
    recipe_pages: dict[str, int],
) -> list[Any]:
    story: list[Any] = [Paragraph("Master recipe index", STYLES["h1"])]
    for group, recipes in grouped:
        story.append(Paragraph(group, STYLES["h2"]))
        rows = [
            [
                table_cell("Page", "table_header"),
                table_cell("Recipe", "table_header"),
                table_cell("Course / Type", "table_header"),
                table_cell("Packages", "table_header"),
            ]
        ]
        for recipe in recipes:
            rid = str(recipe["id"])
            rows.append(
                [
                    table_cell(str(recipe_pages.get(rid, "...")), "small_right"),
                    table_cell(normalise_display_text(recipe.get("name")), "small"),
                    table_cell(
                        " / ".join(
                            x
                            for x in [
                                normalise_display_text(recipe.get("course")),
                                normalise_display_text(recipe.get("type")),
                            ]
                            if x
                        ),
                        "small_muted",
                    ),
                    table_cell(short_list(meta[rid].package_labels, 4), "small_muted"),
                ]
            )
        table = Table(rows, colWidths=[14 * mm, 60 * mm, 37 * mm, 55 * mm], repeatRows=1)
        table.setStyle(index_table_style())
        story.append(table)
        story.append(Spacer(1, 2 * mm))
    story.append(PageBreak())
    return story


def index_table_style() -> TableStyle:
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_OLIVE),
            ("TEXTCOLOR", (0, 0), (-1, 0), WARM_WHITE),
            ("BACKGROUND", (0, 1), (-1, -1), WARM_WHITE),
            ("BOX", (0, 0), (-1, -1), 0.45, BRAND_LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, BRAND_LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]
    )


def recipe_tags(recipe: dict[str, Any], meta: RecipeMeta) -> list[str]:
    tags: list[str] = []
    if is_house_standard(recipe):
        tags.append("House Standard")
    for key in ("course", "type", "method"):
        value = normalise_display_text(recipe.get(key))
        if value and value not in tags:
            tags.append(value)
    for value in recipe.get("diet") or []:
        value = normalise_display_text(value)
        if value and value not in tags:
            tags.append(value)
    for value in recipe.get("protein") or []:
        value = normalise_display_text(value)
        if value and value not in tags:
            tags.append(value)
    for value in meta.package_labels:
        if value not in tags:
            tags.append(value)
    return tags


def build_recipe_card(recipe: dict[str, Any], meta: RecipeMeta) -> list[Any]:
    rid = str(recipe["id"])
    story: list[Any] = [PageBreak(), RecipeAnchor(rid)]

    title = normalise_display_text(recipe.get("name"))
    subtitle = normalise_display_text(recipe.get("subtitle"))
    yield_text = normalise_display_text(recipe.get("yield"))
    method_text = normalise_display_text(recipe.get("method"))
    label_text = normalise_display_text(recipe.get("label"))

    tag_text = "  |  ".join(recipe_tags(recipe, meta))
    section_text = short_list(meta.section_labels, 6)
    meta_rows = [
        [table_cell("Yield", "table_header"), table_cell(yield_text or "-", "small")],
        [table_cell("Method", "table_header"), table_cell(method_text or "-", "small")],
        [table_cell("Label", "table_header"), table_cell(label_text or "-", "small")],
        [table_cell("Recipe ID", "table_header"), table_cell(rid, "small")],
    ]
    meta_table = Table(meta_rows, colWidths=[20 * mm, 41 * mm])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), BRAND_OLIVE),
                ("BACKGROUND", (1, 0), (1, -1), WARM_WHITE),
                ("BOX", (0, 0), (-1, -1), 0.35, BRAND_LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, BRAND_LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ]
        )
    )
    header = Table(
        [
            [
                [
                    Paragraph(title, STYLES["recipe_title"]),
                    Paragraph(subtitle, STYLES["recipe_subtitle"]) if subtitle else Spacer(1, 0),
                    Spacer(1, 1.5 * mm),
                    Paragraph(escape(tag_text), STYLES["tag"]),
                    Paragraph(escape("Sections: " + section_text), STYLES["small_muted"]),
                ],
                meta_table,
            ]
        ],
        colWidths=[105 * mm, 65 * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WARM_WHITE),
                ("BOX", (0, 0), (-1, -1), 0.7, BRAND_OLIVE),
                ("LINEBEFORE", (1, 0), (1, 0), 0.5, BRAND_LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("LEFTPADDING", (1, 0), (1, 0), 2),
                ("RIGHTPADDING", (1, 0), (1, 0), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(KeepTogether([header, Spacer(1, 3 * mm)]))

    elements = [normalise_display_text(x) for x in recipe.get("elements") or [] if normalise_display_text(x)]
    if elements:
        story.append(Paragraph("Elements", STYLES["section"]))
        story.append(Paragraph(escape(" | ".join(elements)), STYLES["small"]))

    ingredients = recipe.get("ingredients") or []
    if ingredients:
        story.append(Paragraph("Ingredients", STYLES["section"]))
        rows = [[table_cell("Qty", "table_header"), table_cell("Ingredient / prep", "table_header")]]
        for ing in ingredients:
            item = normalise_display_text(ing.get("item"))
            item = re.sub(r"\bCup Mushrooms\b", "Medium Mushrooms", item, flags=re.I)
            qty = normalise_qty(ing.get("qty"), item)
            prep = normalise_display_text(ing.get("prep"))
            detail = item if not prep else f"{item} - {prep}"
            rows.append([table_cell(qty or "-", "small"), table_cell(detail, "small")])
        table = Table(rows, colWidths=[31 * mm, 139 * mm], repeatRows=1)
        table.setStyle(ingredients_table_style())
        story.append(table)

    method_steps = [normalise_display_text(x) for x in recipe.get("method_steps") or [] if normalise_display_text(x)]
    if method_steps:
        story.append(Paragraph("Prep method", STYLES["section"]))
        for idx, step in enumerate(method_steps, 1):
            story.append(Paragraph(escape(f"{idx}. {step}"), STYLES["body"]))
            story.append(Spacer(1, 0.6 * mm))

    service_steps = [normalise_display_text(x) for x in recipe.get("service") or [] if normalise_display_text(x)]
    if service_steps:
        story.append(Paragraph("On the day / service", STYLES["section"]))
        for idx, step in enumerate(service_steps, 1):
            story.append(Paragraph(escape(f"{idx}. {step}"), STYLES["body"]))
            story.append(Spacer(1, 0.6 * mm))

    note = normalise_display_text(recipe.get("note"))
    if note:
        story.append(Paragraph("Notes", STYLES["section"]))
        story.append(Paragraph(escape(note), STYLES["note"]))

    return story


def ingredients_table_style() -> TableStyle:
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_OLIVE),
            ("BACKGROUND", (0, 1), (-1, -1), WARM_WHITE),
            ("BOX", (0, 0), (-1, -1), 0.45, BRAND_LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, BRAND_LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
            ("TOPPADDING", (0, 0), (-1, -1), 2.4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.4),
        ]
    )


def build_story(
    recipes: list[dict[str, Any]],
    grouped: list[tuple[str, list[dict[str, Any]]]],
    meta: dict[str, RecipeMeta],
    recipe_pages: dict[str, int],
) -> list[Any]:
    story: list[Any] = []
    story.extend(build_cover(recipes))
    story.extend(build_quick_index(grouped, recipe_pages))
    story.extend(build_master_index(grouped, meta, recipe_pages))
    for _, group_recipes_ in grouped:
        for recipe in group_recipes_:
            story.extend(build_recipe_card(recipe, meta[str(recipe["id"])]))
    return story


def build_pdf(output: Path, recipes: list[dict[str, Any]], grouped: list[tuple[str, list[dict[str, Any]]]], meta: dict[str, RecipeMeta]) -> dict[str, int]:
    output.parent.mkdir(parents=True, exist_ok=True)
    PROBE_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    page_map: dict[str, int] = {}

    for pass_idx in range(3):
        target = PROBE_OUTPUT if pass_idx < 2 else output
        recorded: dict[str, int] = {}
        doc = RecordingDocTemplate(
            str(target),
            recipe_pages=recorded,
            pagesize=A4,
            leftMargin=13 * mm,
            rightMargin=13 * mm,
            topMargin=13 * mm,
            bottomMargin=17 * mm,
            title="Riviera Kitchen Recipe Card Book",
            author="Riviera Yeppoon",
            subject="Internal kitchen recipe cards",
        )
        story = build_story(recipes, grouped, meta, page_map)
        doc.build(story)
        if pass_idx > 0 and recorded == page_map:
            if target != output:
                continue
        page_map = recorded

    return page_map


def validate_inputs(recipes: list[dict[str, Any]], grouped: list[tuple[str, list[dict[str, Any]]]]) -> None:
    if len(recipes) != EXPECTED_RECIPE_COUNT:
        raise SystemExit(f"Expected {EXPECTED_RECIPE_COUNT} recipes, found {len(recipes)}")
    seen = [str(recipe.get("id")) for _, group_items in grouped for recipe in group_items]
    if len(seen) != len(set(seen)):
        duplicates = sorted({rid for rid in seen if seen.count(rid) > 1})
        raise SystemExit(f"Duplicate recipes in output order: {duplicates[:10]}")
    expected = {str(recipe.get("id")) for recipe in recipes}
    if set(seen) != expected:
        missing = sorted(expected - set(seen))
        extra = sorted(set(seen) - expected)
        raise SystemExit(f"Recipe ordering mismatch. Missing={missing[:10]} extra={extra[:10]}")
    first_ids = seen[: len(HOUSE_STANDARD_IDS)]
    if first_ids != HOUSE_STANDARD_IDS:
        raise SystemExit(f"House standards are not first in expected order: {first_ids}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    recipes = load_json(BUILTINS_PATH)
    packages = load_json(PACKAGES_PATH)
    if not isinstance(recipes, list):
        raise SystemExit("builtins.json must be a list")
    meta = build_recipe_meta(recipes, packages)
    ordered = sorted_recipes(recipes, meta)
    grouped = group_recipes(ordered, meta)
    validate_inputs(recipes, grouped)
    page_map = build_pdf(args.output, ordered, grouped, meta)
    if len(page_map) != len(recipes):
        raise SystemExit(f"Expected page markers for {len(recipes)} recipes, got {len(page_map)}")

    if PROBE_OUTPUT.exists():
        PROBE_OUTPUT.unlink()

    print(
        json.dumps(
            {
                "output": str(args.output),
                "recipes": len(recipes),
                "houseStandards": len(HOUSE_STANDARD_IDS),
                "groups": {group: len(items) for group, items in grouped},
                "firstRecipePages": {rid: page_map.get(rid) for rid in HOUSE_STANDARD_IDS[:5]},
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
