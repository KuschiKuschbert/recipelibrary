#!/usr/bin/env python3
"""Flag umlauts / obvious German leftovers in user-facing aroma strings.

Default: all user-facing strings in ingredients and food_pairings (incl. heat_behavior, cuisines, spice_blends).
Use --all is accepted for compatibility (same as default).

Exit 1 if any default-path issue is found.

Also exports scan_aroma_user_strings / apply_string_translations for normalize_aroma_english.py + MT backfill.
"""
from __future__ import annotations

import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(REPO, "aroma_data")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from aroma_i18n import _looks_untranslated_german  # noqa: E402

_UC = re.compile(r"[äöüÄÖÜß]")
# Trailing or mid-list OCR hyphen stubs (Blumen-, Baha- rat) and common ASCII German slips.
_EXTRA_ASCII = re.compile(
    r"(?i)(?:"
    r"\b(leicht|zitrusartig|zitrusartiges)\b|"
    r"\b(Deutschland|Mitteleuropa)\s*:|"
    r"\b(indisches|indische|arabisches)\b|"
    r"\b(deftige|Kartoffelgerichte|Kartoffelsalat|neuen\s+Kartoffeln)\b|"
    r"Baha-\s*rat|"
    r"muf-\s*fig|"
    r"Pfeffernoten|Pilzduft|\bRoher\b"
    r")"
)
_HYPHEN_STUB = re.compile(r",\s*[A-Za-zÀ-ÖØ-öø-ÿ]{1,22}-\s*(?:,|$)")


def suspicious(s: str) -> bool:
    """True if string looks like German / OCR leftovers (user-facing check)."""
    if _UC.search(s) or _looks_untranslated_german(s):
        return True
    if _EXTRA_ASCII.search(s):
        return True
    if _HYPHEN_STUB.search(s):
        return True
    return False


def _note(path: str, label: str, s: str, issues: list[tuple[str, str]], bad: set[str]) -> None:
    if not s or not isinstance(s, str):
        return
    if suspicious(s):
        issues.append((path, f"{label}: {s[:140]}"))
        bad.add(s)


def scan_aroma_user_strings(
    ingredients: list[dict],
    foods: list[dict] | None,
) -> tuple[list[tuple[str, str]], set[str]]:
    """Walk user-visible fields; return (issues for logging, full strings needing fix)."""
    issues: list[tuple[str, str]] = []
    bad_strings: set[str] = set()
    for ing in ingredients:
        iid = ing.get("id", "?")
        _note(iid, "ingredient.name", ing.get("name", ""), issues, bad_strings)
        for h in ing.get("harmonizes_with") or []:
            if isinstance(h, dict):
                _note(iid, "harmonizes_with.name", h.get("name", "") or "", issues, bad_strings)
        for p in ing.get("pairs_with_foods") or []:
            _note(iid, "pairs_with_foods", p, issues, bad_strings)
        for c in ing.get("cuisines") or []:
            _note(iid, "cuisines", c, issues, bad_strings)
        for b in ing.get("spice_blends") or []:
            _note(iid, "spice_blends", b, issues, bad_strings)
        hb = ing.get("heat_behavior") or {}
        for k, v in hb.items():
            _note(iid, f"heat.{k}", v, issues, bad_strings)

    if foods:
        for row in foods:
            fid = row.get("id", "?")
            _note(fid, "food.name", row.get("name", ""), issues, bad_strings)
            for s in row.get("seasonings") or []:
                _note(fid, "seasoning", s.get("name", ""), issues, bad_strings)

    return issues, bad_strings


def collect_issues(
    ingredients: list[dict],
    foods: list[dict] | None = None,
) -> list[tuple[str, str]]:
    """Compatibility wrapper: issue list only."""
    issues, _ = scan_aroma_user_strings(ingredients, foods)
    return issues


def apply_string_translations(
    ingredients: list[dict],
    foods: list[dict] | None,
    tmap: dict[str, str],
) -> int:
    """Replace exact field values when key in tmap. Whitelist paths only. Returns replacement count."""
    n = 0

    def rep(s: str) -> str:
        nonlocal n
        if s in tmap:
            n += 1
            return tmap[s]
        return s

    for ing in ingredients:
        if "name" in ing and isinstance(ing["name"], str):
            ing["name"] = rep(ing["name"])
        for h in ing.get("harmonizes_with") or []:
            if isinstance(h, dict) and isinstance(h.get("name"), str):
                h["name"] = rep(h["name"])
        if ing.get("pairs_with_foods"):
            ing["pairs_with_foods"] = [rep(x) if isinstance(x, str) else x for x in ing["pairs_with_foods"]]
        if ing.get("cuisines"):
            ing["cuisines"] = [rep(x) if isinstance(x, str) else x for x in ing["cuisines"]]
        if ing.get("spice_blends"):
            ing["spice_blends"] = [rep(x) if isinstance(x, str) else x for x in ing["spice_blends"]]
        hb = ing.get("heat_behavior")
        if isinstance(hb, dict):
            for k, v in list(hb.items()):
                if isinstance(v, str):
                    hb[k] = rep(v)

    if foods:
        for row in foods:
            if isinstance(row.get("name"), str):
                row["name"] = rep(row["name"])
            for s in row.get("seasonings") or []:
                if isinstance(s, dict) and isinstance(s.get("name"), str):
                    s["name"] = rep(s["name"])

    return n


def main() -> int:
    ing_path = os.path.join(DATA, "ingredients.json")
    fp_path = os.path.join(DATA, "food_pairings.json")
    if not os.path.isfile(ing_path):
        print("SKIP: no ingredients.json", file=sys.stderr)
        return 0
    with open(ing_path, encoding="utf-8") as f:
        ingredients = json.load(f)
    foods: list[dict] | None = None
    if os.path.isfile(fp_path):
        with open(fp_path, encoding="utf-8") as f:
            foods = json.load(f)
    issues, _ = scan_aroma_user_strings(ingredients, foods)

    if not issues:
        print("check_aroma_english: no German/umlaut issues in checked fields.")
        return 0
    print(f"check_aroma_english: {len(issues)} issues:\n")
    for p, msg in issues[:50]:
        print(f"  [{p}] {msg}")
    if len(issues) > 50:
        print(f"  … and {len(issues) - 50} more")
    return 1


if __name__ == "__main__":
    sys.exit(main())
