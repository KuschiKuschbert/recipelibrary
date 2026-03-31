#!/usr/bin/env python3
"""
Extract heuristic geography / element cues from Salt Fat Acid Heat PDF → sfah_data/*.json.

Env: SALT_FAT_ACID_HEAT_PDF (default ~/Downloads/salt-fat-acid-heat.pdf)
"""
from __future__ import annotations

import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(REPO_ROOT, "sfah_data")

DEFAULT_PDF = os.path.expanduser("~/Downloads/salt-fat-acid-heat.pdf")

try:
    import fitz  # PyMuPDF
except ImportError:
    print("pip3 install PyMuPDF", file=sys.stderr)
    sys.exit(1)


def pdf_text(path: str) -> str:
    doc = fitz.open(path)
    try:
        return "\n".join(doc[i].get_text() for i in range(doc.page_count))
    finally:
        doc.close()


def extract_section_spans(text: str) -> list[dict]:
    """Lines that look like ALL CAPS section titles."""
    rows: list[dict] = []
    for line in text.split("\n"):
        s = line.strip()
        if 4 < len(s) < 80 and s.upper() == s and s.isascii() and re.search(r"[A-Z]{3,}", s):
            if not re.search(r"\d", s):
                rows.append({"title": s})
    # dedupe preserving order
    seen = set()
    out: list[dict] = []
    for r in rows:
        if r["title"] in seen:
            continue
        seen.add(r["title"])
        out.append(r)
    return out[:200]


def seed_matrices() -> tuple[dict, dict, dict]:
    """Curated starter matrices (expand via NotebookLM / manual edits)."""
    fat = {
        "West Africa": ["palm oil", "coconut oil"],
        "France": ["butter", "olive oil", "lard"],
        "Italy": ["olive oil", "butter"],
        "Mexico": ["lard", "vegetable oil"],
        "Japan": ["sesame oil", "neutral oil"],
        "India": ["ghee", "coconut oil", "mustard oil"],
        "USA South": ["butter", "bacon fat"],
    }
    acid = {
        "Mexico": ["lime", "tomatillo", "vinegar"],
        "France": ["wine vinegar", "lemon", "mustard"],
        "Italy": ["lemon", "wine vinegar", "tomatoes"],
        "Japan": ["rice vinegar", "citrus", "miso tang"],
        "India": ["tamarind", "yogurt", "lime"],
        "Thailand": ["lime", "fish sauce", "tamarind"],
        "Korea": ["fermented chili", "rice vinegar"],
    }
    profiles = {}
    for region in set(fat) | set(acid):
        profiles[region] = {
            "fats": fat.get(region, []),
            "acids": acid.get(region, []),
            "salt": ["sea salt", "kosher salt"],
            "heat_notes": ["regional techniques vary"],
        }
    return fat, acid, profiles


def main() -> int:
    path = os.environ.get("SALT_FAT_ACID_HEAT_PDF", DEFAULT_PDF)
    text = pdf_text(path) if os.path.isfile(path) else ""
    sections = extract_section_spans(text)
    fat, acid, profiles = seed_matrices()

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "fat_matrix.json"), "w", encoding="utf-8") as f:
        json.dump(fat, f, indent=2)
    with open(os.path.join(OUT_DIR, "acid_matrix.json"), "w", encoding="utf-8") as f:
        json.dump(acid, f, indent=2)
    with open(os.path.join(OUT_DIR, "cuisine_profiles.json"), "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2)
    with open(os.path.join(OUT_DIR, "pdf_sections.json"), "w", encoding="utf-8") as f:
        json.dump(sections, f, indent=2)
    with open(
        os.path.join(OUT_DIR, "four_elements.json"),
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            {
                "salt": "enhances and amplifies flavor",
                "fat": "carries flavor and creates texture",
                "acid": "balances richness and brightens",
                "heat": "transforms ingredients through cooking",
            },
            f,
            indent=2,
        )

    meta = {"pdf": path, "pdf_chars": len(text), "section_titles": len(sections)}
    with open(os.path.join(OUT_DIR, "extract_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
