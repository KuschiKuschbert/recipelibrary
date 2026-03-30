#!/usr/bin/env python3
"""
Verify claude_index shard filenames vs INDEX_FILES and that every index recipe
resolves in the detail file the Kitchen page would fetch (ASCII A–Z letter rule).

Exit 1 if index files are missing or any recipe id is missing from its detail shard.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CLAUDE_INDEX = REPO_ROOT / "claude_index"
RECIPE_DETAIL = REPO_ROOT / "recipe_detail"

# Must match index.html INDEX_FILES order and names.
INDEX_FILES = [
    "claude_index_01_1-B.json",
    "claude_index_02_B-C.json",
    "claude_index_03_C.json",
    "claude_index_04_C.json",
    "claude_index_05_C-F.json",
    "claude_index_06_F-G.json",
    "claude_index_07_G-H.json",
    "claude_index_08_H-L.json",
    "claude_index_09_L-N.json",
    "claude_index_10_N-P.json",
    "claude_index_11_P-R.json",
    "claude_index_12_R-S.json",
    "claude_index_13_S.json",
    "claude_index_14_S-T.json",
    "claude_index_15_T-Z.json",
]

ASCII_AZ = set(chr(c) for c in range(ord("A"), ord("Z") + 1))


def letter_from_name(name: str | None) -> str:
    """Match buildRecipeIndex in index.html (first ASCII a–zA–Z, else Z)."""
    if not name:
        return "Z"
    for c in name:
        if ("a" <= c <= "z") or ("A" <= c <= "Z"):
            return c.upper()
    return "Z"


def find_in_payload(payload, rid: str):
    """Match findRecipeInDetailPayload in index.html."""
    if payload is None:
        return None
    sid = str(rid)
    if isinstance(payload, list):
        for r in payload:
            if r and isinstance(r, dict) and str(r.get("id")) == sid:
                return r
        return None
    if isinstance(payload, dict):
        hit = payload.get(sid)
        if isinstance(hit, dict):
            return hit
        for v in payload.values():
            if isinstance(v, dict) and str(v.get("id")) == sid:
                return v
    return None


def load_index_recipes() -> list[dict]:
    recipes: list[dict] = []
    for name in INDEX_FILES:
        path = CLAUDE_INDEX / name
        if not path.is_file():
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        for r in data.get("recipes") or []:
            if r.get("id"):
                recipes.append(r)
    return recipes


def suspicious_filename(path: Path) -> list[str]:
    flags: list[str] = []
    for i, c in enumerate(path.name):
        o = ord(c)
        if o == 0xFE0F:
            flags.append(f"U+FE0F@{i}")
        if c in "\u2018\u2019\u201c\u201d":
            flags.append(f"curly-quote U+{o:04X}@{i}")
    return flags


def main() -> int:
    errors = 0
    warnings: list[str] = []

    # 1) INDEX_FILES exist on disk
    for name in INDEX_FILES:
        p = CLAUDE_INDEX / name
        if not p.is_file():
            print(f"ERROR: missing index shard: {name}", file=sys.stderr)
            errors += 1
        else:
            bad = suspicious_filename(p)
            if bad:
                warnings.append(f"{name}: {'; '.join(bad)}")

    # Extra JSON in claude_index not listed
    listed = set(INDEX_FILES)
    for p in CLAUDE_INDEX.glob("*.json"):
        if p.name not in listed:
            warnings.append(f"extra index file (not in INDEX_FILES): {p.name}")
        bad = suspicious_filename(p)
        if bad and p.name in listed:
            pass  # already could warn above

    # 2) Detail orphans: detail_*.json whose suffix is not exactly one ASCII A–Z
    detail_orphans: list[str] = []
    for p in RECIPE_DETAIL.glob("detail_*.json"):
        suf = p.name[len("detail_") : -len(".json")]
        if not (len(suf) == 1 and suf in ASCII_AZ):
            detail_orphans.append(p.name)
            bad = suspicious_filename(p)
            if bad:
                warnings.append(f"{p.name}: {'; '.join(bad)}")

    # 3) Load detail shards lazily by letter
    detail_cache: dict[str, object] = {}

    def get_detail(letter: str):
        if letter not in detail_cache:
            path = RECIPE_DETAIL / f"detail_{letter}.json"
            if not path.is_file():
                detail_cache[letter] = None
            else:
                with open(path, encoding="utf-8") as f:
                    detail_cache[letter] = json.load(f)
        return detail_cache[letter]

    recipes = load_index_recipes()
    missing: list[tuple[str, str, str]] = []  # id, letter, name

    for r in recipes:
        rid = r["id"]
        letter = letter_from_name(r.get("name"))
        payload = get_detail(letter)
        if payload is None:
            missing.append((str(rid), letter, r.get("name") or ""))
            continue
        if find_in_payload(payload, str(rid)) is None:
            missing.append((str(rid), letter, r.get("name") or ""))

    for w in warnings:
        print(f"WARN: {w}", file=sys.stderr)

    if detail_orphans:
        print(f"ERROR: orphan detail shards (not A–Z ASCII): {len(detail_orphans)}", file=sys.stderr)
        for o in sorted(detail_orphans)[:40]:
            print(f"  {o}", file=sys.stderr)
        if len(detail_orphans) > 40:
            print(f"  ... and {len(detail_orphans) - 40} more", file=sys.stderr)
        errors += 1

    if missing:
        print(f"ERROR: {len(missing)} index recipes missing from expected detail shard", file=sys.stderr)
        for rid, letter, name in missing[:30]:
            print(f"  letter={letter} id={rid!r} name={name[:60]!r}", file=sys.stderr)
        if len(missing) > 30:
            print(f"  ... and {len(missing) - 30} more", file=sys.stderr)
        errors += 1

    if not errors and not missing:
        print(
            f"OK: {len(INDEX_FILES)} index shards present; "
            f"{len(recipes)} index recipes checked; "
            f"detail A–Z only (no orphan shards)."
        )

    return 1 if errors or missing else 0


if __name__ == "__main__":
    sys.exit(main())
