#!/usr/bin/env python3
"""
Extract structured aroma data from Aroma Bible PDFs → aroma_data/*.json (English).

Env overrides (optional):
  ARAMA_BIBLE_PART1, ARAMA_BIBLE_PART2, ARAMA_BIBLE_PART3, ARAMA_BIBLE_PART4 — absolute paths to PDFs
"""
from __future__ import annotations

import json
import os
import re
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Install PyMuPDF: pip3 install PyMuPDF", file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(REPO_ROOT, "aroma_data")

_DEFAULT_BASE = os.path.expanduser(
    "~/Library/Application Support/Cursor/User/workspaceStorage/"
    "a82ee57f8a2c50fb760ec50da20bdd53/pdfs"
)


def _pdf(part: str, filename: str) -> str:
    env = os.environ.get(f"ARAMA_BIBLE_{part.upper()}")
    if env and os.path.isfile(env):
        return env
    base = os.environ.get("ARAMA_BIBLE_PDF_BASE", _DEFAULT_BASE)
    for root, _dirs, files in os.walk(base):
        if filename in files:
            return os.path.join(root, filename)
    return ""


PDF_PART1 = _pdf("part1", "Aroma Bible_Part1.pdf")
PDF_PART2 = _pdf("part2", "Aroma Bible_Part2.pdf")
PDF_PART3 = _pdf("part3", "Aroma Bible_Part3.pdf")
PDF_PART4 = _pdf("part4", "Aroma Bible_Part4.pdf")


from aroma_i18n import (
    pairing_matrix,
    postprocess_food_pairings,
    postprocess_ingredients,
    to_id,
    translate,
)


def extract_text(path: str) -> str:
    doc = fitz.open(path)
    try:
        return "\n".join(p.get_text() for p in doc)
    finally:
        doc.close()


_SECTION_STOP = {
    "PASST GUT ZU",
    "LÄNDERKÜCHE",
    "LANDESKÜCHE",
    "AROMENENTFALTUNG",
    "EINKAUF",
    "HARMONIE",
    "GEWÜRZMISCHUNGEN",
    "GEWÜRZMISCHUNG",
    "QUALITÄTEN",
    "GESCHICHTE",
    "EXTRA",
}


def parse_harmonie(text: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    pat = re.compile(
        r"HARMONIE\s*\n\s*([A-ZÄÖÜ][A-ZÄÖÜ ,\-()]*?)\s*\n((?:[A-ZÄÖÜ0-9][^\n]*\n)+)",
        re.MULTILINE,
    )
    for m in pat.finditer(text):
        name = m.group(1).strip().title()
        block = m.group(2)
        parts: list[str] = []
        for line in block.split("\n"):
            raw = line.strip()
            if not raw:
                continue
            up = raw.upper().replace("ß", "SS")
            if up in _SECTION_STOP:
                break
            if len(raw) < 2:
                continue
            parts.append(raw.title())
        if name and parts:
            out[name] = parts
    return out


def _nearest_harmonie_ingredient(preceding: str) -> str | None:
    hits = list(
        re.finditer(r"HARMONIE\s*\n\s*([A-ZÄÖÜ][A-ZÄÖÜ ,\-()]*?)\s*\n", preceding)
    )
    if not hits:
        return None
    return hits[-1].group(1).strip().title()


def parse_block_after_harmonie(
    text: str, header: str, stop_re: str
) -> dict[str, str]:
    out: dict[str, str] = {}
    pat = re.compile(
        rf"{header}\s*\n(.*?)(?={stop_re})",
        re.DOTALL | re.IGNORECASE,
    )
    for m in pat.finditer(text):
        body = m.group(1).strip()
        body = re.sub(r"\s+", " ", body.replace("\n", " "))
        ing = _nearest_harmonie_ingredient(text[: m.start()])
        if ing:
            out[ing] = body
    return out


def parse_was_passt_wozu(full_text: str) -> list[dict]:
    start = full_text.find("WAS PASST WOZU")
    if start < 0:
        return []
    chunk = full_text[start:]
    end = chunk.find("REGISTER")
    if end > 0:
        chunk = chunk[:end]
    lines = chunk.split("\n")
    rows: list[dict] = []
    current_food: str | None = None
    spices: list[dict] = []

    for line in lines:
        line = line.strip()
        if not line or line.startswith("WAS PASST"):
            continue
        if re.match(r"^[A-ZÄÖÜÉ\s,\-()]+$", line) and not re.search(r"\d", line) and len(line) > 3:
            if current_food and spices:
                en = translate(current_food.title())
                rows.append(
                    {
                        "id": to_id(en),
                        "name": en,
                        "_de": current_food,
                        "seasonings": spices,
                    }
                )
            current_food = line
            spices = []
        elif current_food and re.search(r"\d{2,3}\s*$", line):
            spice = re.sub(r"\s*\d{2,3}\s*$", "", line).strip()
            if len(spice) > 1:
                en = translate(spice)
                sid = to_id(en)
                if not any(s.get("id") == sid for s in spices):
                    spices.append({"id": sid, "name": en, "_de": spice})

    if current_food and spices:
        en = translate(current_food.title())
        rows.append(
            {
                "id": to_id(en),
                "name": en,
                "_de": current_food,
                "seasonings": spices,
            }
        )
    return rows


def parse_heat(raw: str) -> dict | None:
    out: dict[str, str] = {}
    parts = re.split(r"\b([ABC])\s+", raw)
    key = None
    for p in parts:
        p = p.strip()
        if p in ("A", "B", "C"):
            key = p.lower()
        elif key and p:
            out[key] = translate(p.rstrip("."))
    return out or None


def build_ingredients(
    harmonie: dict[str, list[str]],
    passt: dict[str, str],
    laender: dict[str, str],
    aromen: dict[str, str],
    gewuerz: dict[str, str],
) -> list[dict]:
    ingredients: list[dict] = []
    seen: set[str] = set()

    for de_name, partners in sorted(harmonie.items()):
        en_name = translate(de_name)
        iid = to_id(en_name)
        if iid in seen:
            continue
        seen.add(iid)
        harmonizes = []
        for p in partners:
            pe = translate(p)
            pid = to_id(pe)
            if pid != iid:
                harmonizes.append({"id": pid, "name": pe})
        entry: dict = {
            "id": iid,
            "name": en_name,
            "_de": de_name,
            "harmonizes_with": harmonizes,
            "pairs_with_foods": [],
        }
        if de_name in passt:
            for bit in re.split(r",\s*", passt[de_name]):
                bit = bit.strip()
                if bit and len(bit) > 1:
                    entry["pairs_with_foods"].append(translate(bit))
        if de_name in laender:
            entry["cuisines"] = [c.strip() for c in re.split(r"(?=[A-ZÄÖÜ][a-zäöü]+:)", laender[de_name]) if c.strip() and ":" in c]
        if de_name in aromen:
            hb = parse_heat(aromen[de_name])
            if hb:
                entry["heat_behavior"] = hb
        if de_name in gewuerz:
            entry["spice_blends"] = [b.strip() for b in re.split(r",\s*", gewuerz[de_name]) if len(b.strip()) > 2]
        ingredients.append(entry)
    return ingredients


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if not PDF_PART3 or not os.path.isfile(PDF_PART3):
        print("ERROR: Part3 PDF not found. Set ARAMA_BIBLE_PART3 or ARAMA_BIBLE_PDF_BASE.", file=sys.stderr)
        sys.exit(2)

    print("Reading Part1…", PDF_PART1)
    t1 = extract_text(PDF_PART1) if PDF_PART1 and os.path.isfile(PDF_PART1) else ""
    print("Reading Part2…", PDF_PART2 or "(not found)")
    t2 = extract_text(PDF_PART2) if PDF_PART2 and os.path.isfile(PDF_PART2) else ""
    if not t2 and not os.environ.get("ARAMA_BIBLE_PART2"):
        print("INFO: Part2 optional — add Aroma Bible_Part2.pdf under PDF base or set ARAMA_BIBLE_PART2.")
    print("Reading Part3…", PDF_PART3)
    t3 = extract_text(PDF_PART3)
    combined = "\n".join(x for x in (t1, t2, t3) if x)

    harmonie = parse_harmonie(combined)
    stop = (
        r"\n[A-ZÄÖÜ]{4,}|\nEINKAUF|\nLÄNDERKÜCHE|\nAROMENENTFALTUNG|"
        r"\nGEWÜRZMISCHUNG|\nQUALITÄT|\nPASST GUT|\nHARMONIE|\nGESCHICHTE|\nEXTRA"
    )
    passt = parse_block_after_harmonie(combined, "PASST GUT ZU", stop)
    laender = parse_block_after_harmonie(combined, "LÄNDERKÜCHE", stop)
    aromen = parse_block_after_harmonie(combined, "AROMENENTFALTUNG", stop)
    gewuerz = parse_block_after_harmonie(combined, r"GEWÜRZMISCHUNGEN?", stop)

    ingredients = build_ingredients(harmonie, passt, laender, aromen, gewuerz)
    postprocess_ingredients(ingredients)
    matrix = pairing_matrix(ingredients)

    food_pairings: list[dict] = []
    if PDF_PART4 and os.path.isfile(PDF_PART4):
        print("Reading Part4…", PDF_PART4)
        t4 = extract_text(PDF_PART4)
        food_pairings = parse_was_passt_wozu(t4)
        postprocess_food_pairings(food_pairings)
    else:
        print("WARN: Part4 PDF missing; food_pairings.json will be empty.")

    for path, data in (
        (os.path.join(OUTPUT_DIR, "ingredients.json"), ingredients),
        (os.path.join(OUTPUT_DIR, "food_pairings.json"), food_pairings),
        (os.path.join(OUTPUT_DIR, "pairing_matrix.json"), matrix),
    ):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Wrote", path, f"({len(data) if isinstance(data, list) else len(data)} items)")

    untranslated: set[str] = set()
    for ing in ingredients:
        if ing["name"] == ing["_de"]:
            untranslated.add(ing["_de"])
    if untranslated:
        rev = os.path.join(OUTPUT_DIR, "_review_untranslated.json")
        with open(rev, "w", encoding="utf-8") as f:
            json.dump(sorted(untranslated), f, indent=2, ensure_ascii=False)
        print("Wrote", rev, len(untranslated), "names")


if __name__ == "__main__":
    main()
