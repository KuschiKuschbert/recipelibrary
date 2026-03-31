#!/usr/bin/env python3
"""
Merge aroma_data + flavor_data + thesaurus_data (+ optional sfah) → combined_data/*.json
"""
from __future__ import annotations

import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(REPO_ROOT, "combined_data")


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").lower().strip())


def _slug(s: str) -> str:
    s = _norm(s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


def main() -> int:
    aroma_path = os.path.join(REPO_ROOT, "aroma_data", "ingredients.json")
    flavor_path = os.path.join(REPO_ROOT, "flavor_data", "ingredients.json")
    wheel_path = os.path.join(REPO_ROOT, "thesaurus_data", "wheel.json")
    sfah_prof = os.path.join(REPO_ROOT, "sfah_data", "cuisine_profiles.json")

    with open(aroma_path, encoding="utf-8") as f:
        aroma = json.load(f)
    flavor: list[dict] = []
    if os.path.isfile(flavor_path):
        with open(flavor_path, encoding="utf-8") as f:
            flavor = json.load(f)
    wheel: list[dict] = []
    if os.path.isfile(wheel_path):
        with open(wheel_path, encoding="utf-8") as f:
            wheel = json.load(f)
    cuisine_map: dict = {}
    if os.path.isfile(sfah_prof):
        with open(sfah_prof, encoding="utf-8") as f:
            cuisine_map = json.load(f)

    thes_by_norm: dict[str, dict] = {}
    for w in wheel:
        thes_by_norm[_norm(w.get("name", ""))] = w

    aroma_by_id = {a["id"]: a for a in aroma if a.get("id")}
    aroma_by_name = {_norm(a.get("name", "")): a for a in aroma if a.get("name")}

    unified: list[dict] = []
    seen_ids: set[str] = set()

    # Start from flavor bible entries (richest catalog)
    for fe in flavor:
        fid = fe.get("id") or _slug(fe.get("name", ""))
        name = fe.get("name", fid)
        key = _norm(name)
        ar = aroma_by_name.get(key) or aroma_by_id.get(fid)
        th = thes_by_norm.get(key)
        row = {
            "id": fid,
            "name": name,
            "flavor": {
                "season": fe.get("season"),
                "taste": fe.get("taste"),
                "function": fe.get("function"),
                "weight": fe.get("weight"),
                "volume": fe.get("volume"),
                "techniques": fe.get("techniques"),
                "pairings": fe.get("pairings"),
                "affinities": fe.get("affinities"),
                "avoid": fe.get("avoid"),
                "substitutes": fe.get("substitutes"),
                "botanical_relatives": fe.get("botanical_relatives"),
                "nutritional_profile_raw": fe.get("nutritional_profile_raw"),
                "flavor_notes": fe.get("flavor_notes"),
                "sources": fe.get("sources") or [fe.get("source")],
            },
            "aroma": None,
            "thesaurus": None,
        }
        if ar:
            row["aroma"] = {
                "id": ar.get("id"),
                "name": ar.get("name"),
                "harmonizes_with": ar.get("harmonizes_with"),
                "pairs_with_foods": ar.get("pairs_with_foods"),
                "aroma_groups": ar.get("aroma_groups"),
                "heat_behavior": ar.get("heat_behavior"),
                "cuisines": ar.get("cuisines"),
            }
        if th:
            row["thesaurus"] = {
                "family": th.get("family"),
                "family_slug": th.get("family_slug"),
                "wheel_index": th.get("wheel_index"),
            }
        unified.append(row)
        seen_ids.add(fid)

    # Aroma-only entries
    for ar in aroma:
        aid = ar.get("id")
        if not aid or aid in seen_ids:
            continue
        key = _norm(ar.get("name", ""))
        if any(_norm(u.get("name", "")) == key for u in unified):
            continue
        th0 = thes_by_norm.get(key)
        thes_wrap = None
        if th0 and isinstance(th0, dict):
            thes_wrap = {
                "family": th0.get("family"),
                "family_slug": th0.get("family_slug"),
                "wheel_index": th0.get("wheel_index"),
            }
        unified.append(
            {
                "id": aid,
                "name": ar.get("name"),
                "flavor": None,
                "aroma": {
                    "id": aid,
                    "name": ar.get("name"),
                    "harmonizes_with": ar.get("harmonizes_with"),
                    "pairs_with_foods": ar.get("pairs_with_foods"),
                    "aroma_groups": ar.get("aroma_groups"),
                    "heat_behavior": ar.get("heat_behavior"),
                    "cuisines": ar.get("cuisines"),
                },
                "thesaurus": thes_wrap,
            }
        )
        seen_ids.add(aid)

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "ingredients_unified.json"), "w", encoding="utf-8") as f:
        json.dump(unified, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT_DIR, "cuisine_map.json"), "w", encoding="utf-8") as f:
        json.dump(cuisine_map, f, ensure_ascii=False, indent=2)

    meta = {
        "unified_count": len(unified),
        "flavor_input": len(flavor),
        "aroma_input": len(aroma),
    }
    with open(os.path.join(OUT_DIR, "merge_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
