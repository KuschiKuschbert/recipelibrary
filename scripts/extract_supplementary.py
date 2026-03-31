#!/usr/bin/env python3
"""
Art of Flavor (EPUB) + Art of Fermentation PDF (summary or full) → supplementary_data/*.json

Env:
  ART_OF_FLAVOR_EPUB
  ART_OF_FERMENTATION_PDF
"""
from __future__ import annotations

import json
import os
import re
import sys
import warnings
import zipfile
from html import unescape

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(REPO_ROOT, "supplementary_data")

D = os.path.expanduser("~/Downloads")
DEFAULT_EPUB = os.path.join(
    D,
    "dokumen.pub_the-art-of-flavor-2017006190-2017016707-9781594634307-9780698197169.epub",
)
DEFAULT_FERM = os.path.join(D, "The Art of Fermentation PDF.pdf")

try:
    from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
except ImportError:
    print("pip3 install beautifulsoup4 lxml", file=sys.stderr)
    sys.exit(1)

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None  # type: ignore

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)


def flavor_epub_text(path: str) -> str:
    if not os.path.isfile(path):
        return ""
    z = zipfile.ZipFile(path)
    parts: list[str] = []
    for n in sorted(z.namelist()):
        if n.endswith(".html"):
            parts.append(z.read(n).decode("utf-8", errors="replace"))
    z.close()
    return "\n".join(parts)


def extract_seven_dials(text: str) -> dict:
    dials = {
        "salt": "Enhances and balances other tastes",
        "sweet": "Rounds harsh edges",
        "sour": "Brightens and cuts richness",
        "bitter": "Adds complexity",
        "umami": "Depth and savoriness",
        "fat": "Carries aroma and mouthfeel",
        "heat": "Cooking transformation / capsaicin heat",
    }
    return {"dials": dials, "source": "art_of_flavor_curated"}


def extract_intensity_mentions(text: str) -> list[dict]:
    """Find patterns like 'intensity of 7' or '1–10'."""
    rows: list[dict] = []
    for m in re.finditer(
        r"intensity(?:\s+of)?\s*(\d(?:\s*[-–]\s*\d)?)",
        text,
        re.I,
    ):
        rows.append({"note": m.group(0), "source": "art_of_flavor"})
    return rows[:100]


def fermentation_chunks(path: str) -> list[dict]:
    if not fitz or not os.path.isfile(path):
        return []
    doc = fitz.open(path)
    text = "\n".join(doc[i].get_text() for i in range(doc.page_count))
    doc.close()
    chunks: list[dict] = []
    for para in re.split(r"\n{2,}", text):
        p = para.strip()
        if 40 < len(p) < 500 and re.search(r"ferment", p, re.I):
            chunks.append({"text": p[:400]})
    return chunks[:200]


def main() -> int:
    epub = os.environ.get("ART_OF_FLAVOR_EPUB", DEFAULT_EPUB)
    ferm = os.environ.get("ART_OF_FERMENTATION_PDF", DEFAULT_FERM)

    html = flavor_epub_text(epub)
    soup = BeautifulSoup(html, "lxml") if html else BeautifulSoup("<html></html>", "lxml")
    plain = soup.get_text("\n", strip=True)

    seven = extract_seven_dials(plain)
    intensity = extract_intensity_mentions(plain)
    ferm_chunks = fermentation_chunks(ferm)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "seven_dials.json"), "w", encoding="utf-8") as f:
        json.dump(seven, f, indent=2)
    with open(os.path.join(OUT_DIR, "intensity_scale.json"), "w", encoding="utf-8") as f:
        json.dump(intensity, f, indent=2)
    with open(os.path.join(OUT_DIR, "fermentation_matrix.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "categories": [
                    "vegetables",
                    "dairy",
                    "grains",
                    "beverages",
                    "meat_fish",
                ],
                "snippets": ferm_chunks,
            },
            f,
            indent=2,
        )

    meta = {
        "art_of_flavor_epub": epub,
        "fermentation_pdf": ferm,
        "intensity_mentions": len(intensity),
        "fermentation_snippets": len(ferm_chunks),
    }
    with open(os.path.join(OUT_DIR, "extract_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
