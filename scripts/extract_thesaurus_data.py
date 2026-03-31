#!/usr/bin/env python3
"""
Extract The Flavor Thesaurus (EPUB) → thesaurus_data/wheel.json + pairings.json.

Env: FLAVOR_THESAURUS_EPUB (default: ~/Downloads/dokumen.pub_the-flavor-thesaurus...epub)
Requires: beautifulsoup4, lxml
"""
from __future__ import annotations

import json
import os
import re
import sys
import zipfile
import warnings
from html import unescape

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(REPO_ROOT, "thesaurus_data")

DOWNLOADS = os.path.expanduser("~/Downloads")
DEFAULT_EPUB = os.path.join(
    DOWNLOADS,
    "dokumen.pub_the-flavor-thesaurus-a-compendium-of-pairings-recipes-and-ideas-for-the-creative-cook-1nbsped-9781608193134-2010910372.epub",
)

try:
    from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
except ImportError:
    print("pip3 install beautifulsoup4 lxml", file=sys.stderr)
    sys.exit(1)

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

SKIP_SUBSTR = (
    "cover",
    "title_page",
    "imprint",
    "contents",
    "introduction",
    "bibliography",
    "a_note",
    "it_seems",
    "flavour_wheel",
    "index",
    "dedicate",
)


def _slug(s: str) -> str:
    s = unescape(s).strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-") or "x"


def parse_epub(path: str) -> tuple[list[dict], list[dict]]:
    z = zipfile.ZipFile(path)
    wheel: list[dict] = []
    pairings: list[dict] = []
    pos = 0

    for n in sorted(z.namelist()):
        if not n.startswith("OPF/") or not n.endswith(".html"):
            continue
        base = n.split("/")[-1].replace(".html", "")
        if any(s in base.lower() for s in SKIP_SUBSTR):
            continue
        raw = z.read(n).decode("utf-8", errors="replace")
        if "p_BHeading" not in raw:
            continue
        soup = BeautifulSoup(raw, "lxml")
        fam_el = soup.find("p", class_=re.compile(r"AHeading"))
        family = fam_el.get_text(strip=True) if fam_el else base.replace("_", " ").title()
        family_slug = _slug(base)

        # Walk in order: AHeadingsub1 toc, then BHeading + Entries blocks
        body = soup.body
        if not body:
            continue
        paragraphs = body.find_all("p", recursive=False)
        current_name: str | None = None
        for el in paragraphs:
            classes = " ".join(el.get("class", []))
            if "BHeading" in classes:
                a = el.find("a")
                current_name = a.get_text(strip=True) if a else el.get_text(strip=True)
                if not current_name:
                    continue
                iid = _slug(current_name)
                wheel.append(
                    {
                        "id": iid,
                        "name": unescape(current_name),
                        "family_slug": family_slug,
                        "family": family,
                        "wheel_index": pos,
                        "source_file": n.split("/")[-1],
                    }
                )
                pos += 1
                # Collect all internal chapter links until next BHeading
                nxt = el.find_next_sibling()
                while nxt and getattr(nxt, "name", None) == "p":
                    nclass = " ".join(nxt.get("class", []))
                    if "BHeading" in nclass:
                        break
                    if current_name:
                        from_id = _slug(current_name)
                        for a in nxt.find_all("a", href=True):
                            href = a["href"].strip()
                            if ".html#" not in href:
                                continue
                            label = a.get_text(strip=True)
                            if not label:
                                continue
                            pairings.append(
                                {
                                    "from_id": from_id,
                                    "from_name": unescape(current_name),
                                    "to_href": href,
                                    "to_label": unescape(label),
                                }
                            )
                    nxt = nxt.find_next_sibling()
    z.close()
    return wheel, pairings


def main() -> int:
    path = os.environ.get("FLAVOR_THESAURUS_EPUB", DEFAULT_EPUB)
    if not os.path.isfile(path):
        print(f"Missing EPUB: {path}", file=sys.stderr)
        wheel, pairings = [], []
    else:
        wheel, pairings = parse_epub(path)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "wheel.json"), "w", encoding="utf-8") as f:
        json.dump(wheel, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT_DIR, "pairings.json"), "w", encoding="utf-8") as f:
        json.dump(pairings, f, ensure_ascii=False, indent=2)
    meta = {"thesaurus_epub": path, "ingredient_count": len(wheel), "pairing_links": len(pairings)}
    with open(os.path.join(OUT_DIR, "extract_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
