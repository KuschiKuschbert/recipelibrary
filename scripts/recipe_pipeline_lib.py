#!/usr/bin/env python3
"""
Shared helpers for recipe translation pipeline and shard tooling.
Must stay aligned with index.html INDEX_FILES and letter bucketing.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterator

REPO_ROOT = Path(__file__).resolve().parent.parent
RECIPE_DETAIL = REPO_ROOT / "recipe_detail"
CLAUDE_INDEX = REPO_ROOT / "claude_index"
REPORTS_DIR = REPO_ROOT / "reports"

# Must match index.html INDEX_FILES and scripts/check-recipe-shards.py
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

ASCII_AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def letter_from_name(name: str | None) -> str:
    """First ASCII a-zA-Z in name, else Z (matches index.html buildRecipeIndex)."""
    if not name:
        return "Z"
    for c in name:
        if ("a" <= c <= "z") or ("A" <= c <= "Z"):
            return c.upper()
    return "Z"


def find_in_detail_payload(payload: Any, rid: str) -> dict | None:
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


def iter_detail_shard_paths() -> Iterator[Path]:
    for letter in ASCII_AZ:
        p = RECIPE_DETAIL / f"detail_{letter}.json"
        if p.is_file():
            yield p


def load_all_detail_shards() -> dict[str, dict | list]:
    """Letter -> parsed JSON (object map or legacy list)."""
    out: dict[str, dict | list] = {}
    for letter in ASCII_AZ:
        p = RECIPE_DETAIL / f"detail_{letter}.json"
        if p.is_file():
            out[letter] = load_detail_file(p)
    return out


def load_detail_file(path: Path) -> dict | list:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_detail_file(path: Path, data: dict | list, *, compact: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        kwargs: dict[str, Any] = {"separators": (",", ":"), "ensure_ascii": False}
    else:
        kwargs = {"indent": 2, "ensure_ascii": False}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, **kwargs)
        f.write("\n")


def load_all_detail_recipes() -> dict[str, dict]:
    """id -> recipe. Later files overwrite on duplicate id (should not happen)."""
    out: dict[str, dict] = {}
    for path in iter_detail_shard_paths():
        data = load_detail_file(path)
        if isinstance(data, list):
            for r in data:
                if isinstance(r, dict) and r.get("id") is not None:
                    out[str(r["id"])] = r
        elif isinstance(data, dict):
            for v in data.values():
                if isinstance(v, dict) and v.get("id") is not None:
                    out[str(v["id"])] = v
    return out


def load_detail_recipes_subset(wanted_ids: set[str]) -> dict[str, dict]:
    """Load only recipes whose id is in wanted_ids (faster than full merge)."""
    out: dict[str, dict] = {}
    if not wanted_ids:
        return out
    remaining = set(wanted_ids)
    for path in iter_detail_shard_paths():
        if not remaining:
            break
        data = load_detail_file(path)
        if isinstance(data, list):
            for r in data:
                if not isinstance(r, dict) or r.get("id") is None:
                    continue
                sid = str(r["id"])
                if sid in remaining:
                    out[sid] = r
                    remaining.discard(sid)
        elif isinstance(data, dict):
            for v in data.values():
                if not isinstance(v, dict) or v.get("id") is None:
                    continue
                sid = str(v["id"])
                if sid in remaining:
                    out[sid] = v
                    remaining.discard(sid)
    return out


def load_index_shard(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_index_shard(path: Path, data: dict, *, compact: bool = True) -> None:
    if compact:
        kwargs: dict[str, Any] = {"separators": (",", ":"), "ensure_ascii": False}
    else:
        kwargs = {"indent": 2, "ensure_ascii": False}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, **kwargs)
        f.write("\n")


def find_index_entry_location(recipe_id: str) -> tuple[Path, int] | None:
    """Return (shard_path, index_in_recipes) for this id, or None."""
    return build_index_id_locations().get(str(recipe_id))


@lru_cache(maxsize=1)
def build_index_id_locations() -> dict[str, tuple[Path, int]]:
    """Map recipe id -> (claude_index shard path, index in recipes array)."""
    m: dict[str, tuple[Path, int]] = {}
    for name in INDEX_FILES:
        path = CLAUDE_INDEX / name
        if not path.is_file():
            continue
        data = load_index_shard(path)
        recipes = data.get("recipes") or []
        for i, r in enumerate(recipes):
            if r and r.get("id") is not None:
                m[str(r["id"])] = (path, i)
    return m


def detail_to_index_entry(recipe: dict) -> dict:
    """Build compact index record from a detail recipe (matches README schema)."""
    rid = recipe.get("id")
    name = recipe.get("name")
    cat = recipe.get("category")
    cui = recipe.get("cuisine")
    protein = recipe.get("protein")
    if protein is None:
        protein = []
    elif not isinstance(protein, list):
        protein = [protein]
    raw_tags = recipe.get("tags")
    dt = recipe.get("dietary_tags")
    tag_lists: list[list] = []
    if isinstance(raw_tags, list) and raw_tags:
        tag_lists.append(raw_tags)
    if isinstance(dt, list) and dt:
        tag_lists.append(dt)
    if tag_lists:
        seen: set[str] = set()
        tags = []
        for lst in tag_lists:
            for t in lst:
                if isinstance(t, str) and t not in seen:
                    seen.add(t)
                    tags.append(t)
    else:
        tags = []

    ing: list[str] = []
    for row in recipe.get("ingredients") or []:
        if not isinstance(row, dict):
            continue
        item = row.get("item")
        if item:
            ing.append(str(item))

    return {
        "id": rid,
        "name": name,
        "cat": cat,
        "cui": cui,
        "protein": protein,
        "tags": tags,
        "ing": ing,
    }


def collect_translatable_text(recipe: dict) -> str:
    """Concatenate fields used for language detection."""
    parts: list[str] = []
    for key in ("name", "category", "cuisine", "yield", "original_name"):
        v = recipe.get(key)
        if v:
            parts.append(str(v))
    for row in recipe.get("ingredients") or []:
        if isinstance(row, dict):
            for k in ("item", "prep"):
                v = row.get(k)
                if v:
                    parts.append(str(v))
    for step in recipe.get("instructions") or []:
        if step:
            parts.append(str(step))
    return "\n".join(parts)


def to_arr(v: Any) -> list:
    return v if isinstance(v, list) else []
