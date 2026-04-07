#!/usr/bin/env python3
"""
Shared helpers for recipe translation pipeline and shard tooling.
Must stay aligned with index.html INDEX_FILES and letter bucketing.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterator

REPO_ROOT = Path(__file__).resolve().parent.parent
RECIPE_DETAIL = REPO_ROOT / "recipe_detail"
CLAUDE_INDEX = REPO_ROOT / "claude_index"
REPORTS_DIR = REPO_ROOT / "reports"

# Must match scripts/build_alpha_catalog_index.py CLAUDE_SHARDS and offline checks
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

# Sub-shards: hash(id) % N → recipe_detail/detail_{L}_{bucket}.json (matches index.html)
DETAIL_BUCKET_COUNT = 64
DETAIL_SUBSHARD_RE = re.compile(r"^detail_([A-Z])_(\d+)\.json$")
DETAIL_LEGACY_RE = re.compile(r"^detail_([A-Z])\.json$")
_FNV_OFFSET = 2166136261
_FNV_PRIME = 16777619


def detail_bucket_pad_width() -> int:
    return max(2, len(str(DETAIL_BUCKET_COUNT - 1)))


def detail_subshard_filename(letter: str, bucket: int) -> str:
    w = detail_bucket_pad_width()
    return f"detail_{letter}_{str(bucket).zfill(w)}.json"


def detail_bucket_from_id(rid: str | int, n: int | None = None) -> int:
    """FNV-1a 32-bit, same algorithm as detailBucketFromId in index.html."""
    if n is None:
        n = DETAIL_BUCKET_COUNT
    h = _FNV_OFFSET
    for c in str(rid):
        h ^= ord(c)
        h = (h * _FNV_PRIME) & 0xFFFFFFFF
    return h % n


def detail_repo_uses_subshards() -> bool:
    if not RECIPE_DETAIL.is_dir():
        return False
    for p in RECIPE_DETAIL.glob("detail_*.json"):
        if DETAIL_SUBSHARD_RE.match(p.name):
            return True
    return False


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
    if not RECIPE_DETAIL.is_dir():
        return
    paths = list(RECIPE_DETAIL.glob("detail_*.json"))
    subs = sorted(p for p in paths if DETAIL_SUBSHARD_RE.match(p.name))
    if subs:
        yield from subs
        return
    legs = sorted(p for p in paths if DETAIL_LEGACY_RE.match(p.name))
    yield from legs


def letter_from_detail_path(path: Path) -> str | None:
    """Shard letter from filename detail_{L}_{bucket}.json or detail_{L}.json."""
    m = DETAIL_SUBSHARD_RE.match(path.name)
    if m:
        return m.group(1)
    m2 = DETAIL_LEGACY_RE.match(path.name)
    if m2:
        return m2.group(1)
    return None


def build_id_to_detail_letter() -> dict[str, str]:
    """Map recipe id → shard letter from recipe_detail path (modal router truth)."""
    m: dict[str, str] = {}
    for path in iter_detail_shard_paths():
        letter = letter_from_detail_path(path)
        if not letter:
            continue
        data = load_detail_file(path)
        if isinstance(data, list):
            for r in data:
                if isinstance(r, dict) and r.get("id") is not None:
                    m[str(r["id"])] = letter
        elif isinstance(data, dict):
            for v in data.values():
                if isinstance(v, dict) and v.get("id") is not None:
                    m[str(v["id"])] = letter
    return m


def load_all_detail_shards() -> dict[str, dict | list]:
    """Letter -> parsed JSON (object map or legacy list), merging all buckets per letter."""
    out: dict[str, dict | list] = {}
    if not RECIPE_DETAIL.is_dir():
        return out
    if detail_repo_uses_subshards():
        for letter in ASCII_AZ:
            merged: dict[str, dict] = {}
            for p in sorted(RECIPE_DETAIL.glob(f"detail_{letter}_*.json")):
                if not DETAIL_SUBSHARD_RE.match(p.name):
                    continue
                data = load_detail_file(p)
                if isinstance(data, list):
                    for r in data:
                        if isinstance(r, dict) and r.get("id") is not None:
                            merged[str(r["id"])] = r
                elif isinstance(data, dict):
                    for v in data.values():
                        if isinstance(v, dict) and v.get("id") is not None:
                            merged[str(v["id"])] = v
            if merged:
                out[letter] = merged
        return out
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


def _merge_detail_payload_into_out(
    data: dict | list, remaining: set[str], out: dict[str, dict]
) -> None:
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


def load_detail_recipes_subset(wanted_ids: set[str]) -> dict[str, dict]:
    """Load only recipes whose id is in wanted_ids (faster than full merge)."""
    out: dict[str, dict] = {}
    if not wanted_ids:
        return out
    remaining = set(wanted_ids)
    if detail_repo_uses_subshards():
        loc_map = build_index_id_locations()
        idx_cache: dict[Path, dict] = {}
        by_path: dict[Path, set[str]] = {}
        for rid in remaining:
            loc = loc_map.get(rid)
            if not loc:
                continue
            ipath, iidx = loc
            if ipath not in idx_cache:
                idx_cache[ipath] = load_index_shard(ipath)
            recs = idx_cache[ipath].get("recipes") or []
            if iidx >= len(recs):
                continue
            name = recs[iidx].get("name")
            L = letter_from_name(name)
            b = detail_bucket_from_id(rid)
            p = RECIPE_DETAIL / detail_subshard_filename(L, b)
            by_path.setdefault(p, set()).add(rid)
        for p, want in by_path.items():
            if not p.is_file():
                continue
            data = load_detail_file(p)
            sub_rem = set(want)
            _merge_detail_payload_into_out(data, sub_rem, out)
        return out
    for path in iter_detail_shard_paths():
        if not remaining:
            break
        data = load_detail_file(path)
        _merge_detail_payload_into_out(data, remaining, out)
    return out


def load_index_shard(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_index_id_to_display_name() -> dict[str, str]:
    """id -> compact index `name` (matches Kitchen list / buildRecipeIndex letter rule)."""
    m: dict[str, str] = {}
    for name in INDEX_FILES:
        path = CLAUDE_INDEX / name
        if not path.is_file():
            continue
        data = load_index_shard(path)
        for r in data.get("recipes") or []:
            if r and r.get("id") is not None:
                m[str(r["id"])] = str(r.get("name") or "")
    return m


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


def detail_to_index_entry(recipe: dict, *, router_letter: str | None = None) -> dict:
    """Build compact index record from a detail recipe (matches README schema).

    router_letter: optional A–Z from recipe_detail filename; stored as _detailLetter
    so the browser opens the correct detail sub-shard when display name first letter differs.
    """
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

    out: dict[str, Any] = {
        "id": rid,
        "name": name,
        "cat": cat,
        "cui": cui,
        "protein": protein,
        "tags": tags,
        "ing": ing,
    }
    if router_letter and len(str(router_letter)) == 1:
        out["_detailLetter"] = str(router_letter).upper()
    return out


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
