#!/usr/bin/env python3
"""
Extract structured data from The Flavor Bible (EPUB) and The Vegetarian Flavor Bible (PDF)
into flavor_data/*.json.

Env (optional):
  FLAVOR_BIBLE_EPUB   — path to Flavor Bible .epub
  VEG_FLAVOR_BIBLE_PDF — path to Vegetarian Flavor Bible .pdf

Defaults: ~/Downloads/ with known filenames (see DEFAULT_* below).

Requires: pip install PyMuPDF beautifulsoup4 lxml
"""
from __future__ import annotations

import json
import os
import re
import sys
import zipfile
from html import unescape

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(REPO_ROOT, "flavor_data")

DOWNLOADS = os.path.expanduser("~/Downloads")

DEFAULT_EPUB = os.path.join(
    DOWNLOADS,
    "Karen Page, Andrew Dornenburg - The Flavor Bible_ The Essential Guide to Culinary Creativity, Based on the Wisdom of America's Most Imaginative Chefs (2008, Little, Brown and Company) - libgen.li copy.epub",
)
DEFAULT_VEG_PDF = os.path.join(
    DOWNLOADS,
    "Page, Karen - The Vegetarian Flavor Bible (2014, Little, Brown and Company) - libgen.li copy.pdf",
)

import warnings

try:
    from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning, Tag
except ImportError:
    print("Install beautifulsoup4: pip3 install beautifulsoup4 lxml", file=sys.stderr)
    sys.exit(1)

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None  # type: ignore


def _slug(s: str) -> str:
    s = unescape(s).strip().lower()
    s = re.sub(r"[*:]+", " ", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "x"


def _norm_name(s: str) -> str:
    return re.sub(r"\s+", " ", unescape(s).strip().lower())


def _pairing_tier_from_element(bq: Tag) -> tuple[str, str]:
    """Return (tier, plain_text) for a pairing blockquote."""
    text = bq.get_text(" ", strip=True)
    if not text or text.lower().startswith("season:"):
        return ("skip", text)
    if text.lower().startswith(("taste:", "function:", "weight:", "volume:", "techniques:", "tip:", "botanical", "nutritional", "calories:", "protein:", "what it is", "flavor:", "possible substitutes")):
        return ("skip", text)
    if "flavor affinities" in text.lower():
        return ("skip", text)
    if text.upper().startswith("AVOID"):
        return ("avoid", text)

    inner = bq.decode_contents() if bq else ""
    has_bold = "bold" in inner or "<b>" in inner
    stripped = text.lstrip()
    holy = stripped.startswith("*") or stripped.startswith("＊")
    core = stripped.lstrip("*＊ ").strip()
    letters = re.sub(r"[^A-Za-z]", "", core)
    caps_ratio = (sum(1 for c in letters if c.isupper()) / len(letters)) if letters else 0

    if holy:
        return ("holy_grail", text)
    if has_bold and caps_ratio > 0.75 and len(letters) >= 3:
        return ("very_highly_recommended", text)
    if has_bold:
        return ("highly_recommended", text)
    return ("recommended", text)


def parse_flavor_bible_epub(path: str) -> list[dict]:
    if not os.path.isfile(path):
        print(f"Missing EPUB: {path}", file=sys.stderr)
        return []

    z = zipfile.ZipFile(path)
    html_names = sorted(n for n in z.namelist() if n.endswith(".html"))
    combined: list[str] = []
    for n in html_names:
        raw = z.read(n).decode("utf-8", errors="replace")
        combined.append(raw)
    z.close()

    big = "\n".join(combined)
    warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)
    soup = BeautifulSoup(big, "lxml")

    entries: list[dict] = []
    # Main ingredient headings: p.calibre17 > span > span.bold
    for p in soup.find_all("p", class_=re.compile(r"calibre17")):
        bold = p.find("span", class_=re.compile(r"bold"))
        if not bold:
            continue
        name = bold.get_text(strip=True)
        if not name or len(name) < 2:
            continue
        if name.upper() in ("CONTENTS", "INDEX", "PREFACE", "INTRODUCTION"):
            continue
        # Skip if looks like prose (too long)
        if len(name) > 120:
            continue

        block: list[Tag] = []
        for sib in p.find_next_siblings():
            if sib.name == "p" and sib.get("class") and "calibre17" in " ".join(sib.get("class", [])):
                inner_b = sib.find("span", class_=re.compile(r"bold"))
                if inner_b and inner_b.get_text(strip=True) and len(inner_b.get_text(strip=True)) < 100:
                    break
            if sib.name == "blockquote":
                block.append(sib)
            elif sib.name == "div":
                break

        meta: dict[str, str | list[str]] = {}
        pairings: dict[str, list[str]] = {
            "recommended": [],
            "highly_recommended": [],
            "very_highly_recommended": [],
            "holy_grail": [],
        }
        affinities: list[list[str]] = []
        avoid: list[str] = []
        mode = "body"  # body | affinities | avoid_list

        for bq in block:
            txt = bq.get_text(" ", strip=True)
            low = txt.lower()
            inner_low = (bq.decode_contents() or "").lower()

            if low == "flavor affinities" or (low.startswith("flavor affinit") and "bold" in inner_low):
                mode = "affinities"
                continue
            if low == "avoid" or low.startswith("avoid"):
                mode = "avoid_list"
                if ":" in txt:
                    part = re.sub(r"^avoid:?\s*", "", txt, flags=re.I).strip()
                    if part and part.lower() != "avoid":
                        avoid.extend([a.strip() for a in re.split(r",|\band\b", part) if a.strip()])
                continue

            if mode == "affinities":
                if "+" in txt:
                    parts = [p.strip() for p in txt.split("+") if p.strip()]
                    if len(parts) >= 2:
                        affinities.append(parts)
                    continue
                mode = "body"

            if mode == "avoid_list":
                if txt and not txt.endswith(":"):
                    avoid.append(txt)
                continue

            tier, txt2 = _pairing_tier_from_element(bq)
            if tier == "skip":
                if low.startswith("season:"):
                    meta["season"] = txt.split(":", 1)[-1].strip()
                elif low.startswith("taste:"):
                    meta["taste"] = [t.strip() for t in txt.split(":", 1)[-1].split(",") if t.strip()]
                elif low.startswith("function:"):
                    meta["function"] = txt.split(":", 1)[-1].strip()
                elif low.startswith("weight:"):
                    meta["weight"] = txt.split(":", 1)[-1].strip()
                elif low.startswith("volume:"):
                    meta["volume"] = txt.split(":", 1)[-1].strip()
                elif low.startswith("techniques:"):
                    rest = txt.split(":", 1)[-1]
                    meta["techniques"] = [t.strip() for t in re.split(r",|\band\b", rest) if t.strip()]
                continue
            if tier == "avoid":
                part = re.sub(r"^avoid:?\s*", "", txt2, flags=re.I).strip()
                if part:
                    avoid.extend([a.strip() for a in re.split(r",|\band\b", part) if a.strip()])
                continue
            if tier in pairings and txt2:
                pairings[tier].append(txt2)

        if not any(pairings.values()) and not meta.get("season") and not meta.get("weight"):
            continue

        entries.append(
            {
                "id": _slug(name),
                "name": unescape(name).strip(),
                "source": "flavor_bible",
                "season": meta.get("season"),
                "taste": meta.get("taste") if isinstance(meta.get("taste"), list) else None,
                "function": meta.get("function"),
                "weight": meta.get("weight"),
                "volume": meta.get("volume"),
                "techniques": meta.get("techniques") if isinstance(meta.get("techniques"), list) else None,
                "pairings": {k: v for k, v in pairings.items() if v},
                "affinities": affinities,
                "avoid": avoid,
            }
        )

    # Dedupe by id (keep richest)
    by_id: dict[str, dict] = {}
    for e in entries:
        cur = by_id.get(e["id"])
        if not cur:
            by_id[e["id"]] = e
            continue
        c1 = sum(len(v) for v in cur.get("pairings", {}).values())
        c2 = sum(len(v) for v in e.get("pairings", {}).values())
        if c2 >= c1:
            by_id[e["id"]] = e
    return list(by_id.values())


def parse_vegetarian_pdf(path: str) -> list[dict]:
    if not fitz:
        print("PyMuPDF not installed; skipping Vegetarian PDF", file=sys.stderr)
        return []
    if not os.path.isfile(path):
        print(f"Missing PDF: {path}", file=sys.stderr)
        return []

    doc = fitz.open(path)
    full = "\n".join(doc[i].get_text() for i in range(doc.page_count))
    doc.close()

    entries: list[dict] = []
    # Title line followed by Season: or Volume: (veg bible uses both)
    pat = re.compile(
        r"(?:^|\n)\s*([A-Z][A-Za-z0-9 ,\-–—\/\(\)\';:&]+?)\s*\n(?=(?:Season|Volume|Flavor|What it is):)",
        re.MULTILINE,
    )
    starts = list(pat.finditer(full))
    for i, m in enumerate(starts):
        title = m.group(1).strip()
        if len(title) < 2 or len(title) > 120:
            continue
        if title.isupper() and " " not in title and len(title) < 4:
            continue
        end = starts[i + 1].start() if i + 1 < len(starts) else len(full)
        block = full[m.start() : end]

        def grab(label: str) -> str | None:
            mm = re.search(rf"{label}\s*:\s*([^\n]+)", block, re.I)
            return mm.group(1).strip() if mm else None

        season = grab("Season")
        vol = grab("Volume")
        flavor_desc = grab("Flavor")
        substitutes = grab("Possible substitutes")
        nut = grab("Nutritional profile")
        botanical = grab("Botanical relatives")
        techniques_line = grab("Techniques")
        techniques = (
            [t.strip() for t in re.split(r",|\band\b", techniques_line) if t.strip()]
            if techniques_line
            else None
        )

        # Pairings: lines after substitutes / techniques until blank-heavy or next SECTION
        pair_lines: list[str] = []
        tail = block
        if techniques_line:
            idx = tail.find(techniques_line)
            tail = tail[idx + len(techniques_line) :]
        lines = [ln.strip() for ln in tail.split("\n") if ln.strip()]
        skip_prefixes = (
            "tip:",
            "season:",
            "volume:",
            "flavor:",
            "what it is",
            "nutritional",
            "calories:",
            "protein:",
            "botanical",
            "possible substitutes",
            "techniques:",
        )
        for ln in lines:
            low = ln.lower()
            if any(low.startswith(p) for p in skip_prefixes):
                continue
            if ln.endswith(":") and len(ln) < 40:
                continue
            if re.match(r"^[A-Z][A-Z\s,\-]{3,}$", ln) and len(ln) < 80 and ":" not in ln:
                # next ingredient title
                break
            if len(ln) > 2:
                pair_lines.append(ln)

        if not season and not vol and not substitutes:
            continue

        entries.append(
            {
                "id": _slug(title.split("(")[0]),
                "name": title.split("(")[0].strip(),
                "source": "vegetarian_flavor_bible",
                "season": season,
                "volume": vol,
                "flavor_notes": flavor_desc,
                "techniques": techniques,
                "nutritional_profile_raw": nut,
                "botanical_relatives": (
                    [b.strip() for b in re.split(r",|\band\b", botanical)] if botanical else []
                ),
                "substitutes": (
                    [s.strip() for s in re.split(r",|\band\b", substitutes)] if substitutes else []
                ),
                "pairings": {"recommended": pair_lines[:400]},
            }
        )

    by_id: dict[str, dict] = {}
    for e in entries:
        if e["id"] in by_id:
            continue
        by_id[e["id"]] = e
    return list(by_id.values())


def merge_entries(fb: list[dict], veg: list[dict]) -> list[dict]:
    by_key: dict[str, dict] = {}
    for e in fb:
        by_key[_norm_name(e["name"])] = dict(e)

    for v in veg:
        k = _norm_name(v["name"])
        if k in by_key:
            base = by_key[k]
            if v.get("substitutes"):
                base["substitutes"] = v["substitutes"]
            if v.get("botanical_relatives"):
                base["botanical_relatives"] = v["botanical_relatives"]
            if v.get("nutritional_profile_raw"):
                base["nutritional_profile_raw"] = v["nutritional_profile_raw"]
            if v.get("flavor_notes"):
                base["flavor_notes"] = v["flavor_notes"]
            base["sources"] = list(
                dict.fromkeys([base.get("source", "flavor_bible"), "vegetarian_flavor_bible"])
            )
        else:
            v2 = dict(v)
            v2["sources"] = ["vegetarian_flavor_bible"]
            by_key[k] = v2

    return list(by_key.values())


def build_affinities(ingredients: list[dict]) -> list[dict]:
    out: list[dict] = []
    for ing in ingredients:
        for combo in ing.get("affinities") or []:
            out.append({"ingredient_id": ing["id"], "ingredient_name": ing["name"], "combo": combo})
    return out


def build_avoid_matrix(ingredients: list[dict]) -> dict[str, list[str]]:
    m: dict[str, list[str]] = {}
    for ing in ingredients:
        av = ing.get("avoid") or []
        if av:
            m[ing["id"]] = av
    return m


def main() -> int:
    epub = os.environ.get("FLAVOR_BIBLE_EPUB", DEFAULT_EPUB)
    pdf = os.environ.get("VEG_FLAVOR_BIBLE_PDF", DEFAULT_VEG_PDF)

    fb = parse_flavor_bible_epub(epub)
    veg = parse_vegetarian_pdf(pdf)
    merged = merge_entries(fb, veg)

    os.makedirs(OUT_DIR, exist_ok=True)
    ing_path = os.path.join(OUT_DIR, "ingredients.json")
    with open(ing_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    aff = build_affinities(merged)
    with open(os.path.join(OUT_DIR, "affinities.json"), "w", encoding="utf-8") as f:
        json.dump(aff, f, ensure_ascii=False, indent=2)

    av = build_avoid_matrix(merged)
    with open(os.path.join(OUT_DIR, "avoid_matrix.json"), "w", encoding="utf-8") as f:
        json.dump(av, f, ensure_ascii=False, indent=2)

    meta = {
        "flavor_bible_epub": epub,
        "vegetarian_pdf": pdf,
        "counts": {
            "flavor_bible_raw": len(fb),
            "vegetarian_raw": len(veg),
            "merged": len(merged),
            "affinity_rows": len(aff),
            "avoid_ingredients": len(av),
        },
    }
    with open(os.path.join(OUT_DIR, "extract_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(json.dumps(meta["counts"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
