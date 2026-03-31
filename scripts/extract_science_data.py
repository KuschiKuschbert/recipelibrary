#!/usr/bin/env python3
"""
Heuristic extraction from Science of Cooking PDFs → science_data/*.json.

Env:
  SCIENCE_COOKING_FARRIMOND_PDF
  SCIENCE_COOKING_PROVOST_PDF

Defaults: ~/Downloads/pdfcoffee.com_the-science-of-cooking-pdf-free.pdf
          ~/Downloads/pdfcoffee.com_the-science-of-cooking-understanding...pdf
"""
from __future__ import annotations

import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(REPO_ROOT, "science_data")

D = os.path.expanduser("~/Downloads")
DEFAULT_F = os.path.join(D, "pdfcoffee.com_the-science-of-cooking-pdf-free.pdf")
DEFAULT_P = os.path.join(D, "pdfcoffee.com_the-science-of-cooking-understanding-the-biology-and-chemistry-behind-food-and-cooking-2016-pdf-free.pdf")

try:
    import fitz  # PyMuPDF
except ImportError:
    print("pip3 install PyMuPDF", file=sys.stderr)
    sys.exit(1)


def pdf_text(path: str) -> str:
    if not path or not os.path.isfile(path):
        return ""
    doc = fitz.open(path)
    try:
        return "\n".join(doc[i].get_text() for i in range(doc.page_count))
    finally:
        doc.close()


def extract_temperatures(text: str, source: str) -> list[dict]:
    out: list[dict] = []
    # 140°C, 284°F, 68 °C
    for m in re.finditer(
        r"(\d+)\s*°\s*([CF])(?:\s*\(\s*(\d+)\s*°\s*([CF])\s*\))?",
        text,
    ):
        val = int(m.group(1))
        unit = m.group(2).upper()
        out.append({"value": val, "unit": unit, "context": "", "source": source})
    # Deduplicate by value+unit
    seen = set()
    uniq: list[dict] = []
    for row in out:
        k = (row["value"], row["unit"])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(row)
    return uniq[:500]


def extract_percent_retention(text: str, source: str) -> list[dict]:
    rows: list[dict] = []
    for m in re.finditer(
        r"(\d+)\s*%\s*(?:of\s+)?([A-Za-z][A-Za-z\s]{2,40}?)\s*(?:retained|lost|remains)",
        text,
        re.I,
    ):
        rows.append(
            {
                "percent": int(m.group(1)),
                "nutrient": m.group(2).strip(),
                "source": source,
            }
        )
    return rows[:300]


def extract_tastant_mentions(text: str, source: str) -> list[dict]:
    """Lines like Quinine = 1 or NaCl = 1 (very heuristic)."""
    rows: list[dict] = []
    for m in re.finditer(
        r"([A-Za-z][A-Za-z0-9\-]{1,30})\s*[=:]\s*([0-9.]+)",
        text,
    ):
        rows.append(
            {
                "compound": m.group(1).strip(),
                "value": m.group(2),
                "source": source,
            }
        )
    return rows[:400]


def main() -> int:
    f_path = os.environ.get("SCIENCE_COOKING_FARRIMOND_PDF", DEFAULT_F)
    p_path = os.environ.get("SCIENCE_COOKING_PROVOST_PDF", DEFAULT_P)

    tf = pdf_text(f_path)
    tp = pdf_text(p_path)

    temps = extract_temperatures(tf, "farrimond") + extract_temperatures(tp, "provost")
    nutrients = extract_percent_retention(tf, "farrimond") + extract_percent_retention(tp, "provost")
    tastants = extract_tastant_mentions(tp, "provost")

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "temperatures.json"), "w", encoding="utf-8") as f:
        json.dump(temps, f, indent=2)
    with open(os.path.join(OUT_DIR, "nutrient_retention.json"), "w", encoding="utf-8") as f:
        json.dump(nutrients, f, indent=2)
    with open(os.path.join(OUT_DIR, "tastant_indices.json"), "w", encoding="utf-8") as f:
        json.dump(tastants, f, indent=2)
    with open(os.path.join(OUT_DIR, "storage_timelines.json"), "w", encoding="utf-8") as f:
        json.dump([], f)

    meta = {
        "farrimond_pdf": f_path,
        "provost_pdf": p_path,
        "chars_farrimond": len(tf),
        "chars_provost": len(tp),
        "temperature_rows": len(temps),
        "nutrient_rows": len(nutrients),
        "tastant_rows": len(tastants),
    }
    with open(os.path.join(OUT_DIR, "extract_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
