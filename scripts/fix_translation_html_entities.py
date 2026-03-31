#!/usr/bin/env python3
"""
Decode literal HTML entities in recipe_detail strings (e.g. &ccedil; &uuml; &nbsp; &#…).

Optional: --retranslate-tr runs Argos tr→en only on string fields that still contain
Turkish letters, for recipes tagged lezzet / original_language tr.

Then write reports/cleanup_affected_ids.jsonl for sync_claude_index_from_detail.py.

Usage:
  python3 scripts/fix_translation_html_entities.py --dry-run
  python3 scripts/fix_translation_html_entities.py --write
  python3 scripts/fix_translation_html_entities.py --write --retranslate-tr
  python3 scripts/fix_translation_html_entities.py --write --retranslate-tr --skip-entities
"""
from __future__ import annotations

import argparse
import copy
import html
import json
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recipe_pipeline_lib import (  # noqa: E402
    RECIPE_DETAIL,
    REPORTS_DIR,
    letter_from_name,
    load_all_detail_shards,
    save_detail_file,
)

# Named, decimal, or hex numeric entities (conservative)
ENTITY_PATTERN = re.compile(
    r"&(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#[0-9]{1,8}|#x[0-9a-fA-F]{1,8});"
)

# Turkish letters commonly left in partially translated lezzet strings
TURKISH_LETTERS = frozenset("çğıöşüÇĞİÖŞÜ")
TURKISH_ORDS = frozenset({0x0131, 0x0130})  # ı, İ


def has_turkish_script(s: str) -> bool:
    for c in s:
        if c in TURKISH_LETTERS or ord(c) in TURKISH_ORDS:
            return True
    return False


def is_tr_scope_recipe(recipe: dict) -> bool:
    if str(recipe.get("original_language") or "").lower() == "tr":
        return True
    if str(recipe.get("source") or "").lower() == "lezzet":
        return True
    return False


def fix_entities_in_string(s: str) -> tuple[str, bool]:
    if not s or "&" not in s:
        return s, False
    if not ENTITY_PATTERN.search(s):
        return s, False
    out = html.unescape(s)
    if out != s:
        out = re.sub(r" {2,}", " ", out).strip()
        return out, True
    return s, False


def translate_tr_argos(text: str) -> str | None:
    try:
        import argostranslate.translate  # type: ignore[import-untyped]
    except ImportError:
        print("ERROR: pip install argostranslate (tr→en package)", file=sys.stderr)
        return None
    try:
        return argostranslate.translate.translate(text.strip(), "tr", "en")
    except Exception as e:
        print(f"WARN tr→en failed: {e}", file=sys.stderr)
        return None


def mutate_recipe_strings(
    recipe: dict,
    *,
    do_entities: bool,
    do_tr: bool,
) -> tuple[int, bool]:
    """
    Mutate recipe in place. Returns (change_count, name_letter_maybe_changed).
    """
    changes = 0
    name_changed = False
    keys_top = ("name", "category", "cuisine", "yield", "original_name")
    tr_scope = is_tr_scope_recipe(recipe) if do_tr else False

    for key in keys_top:
        if key not in recipe:
            continue
        v = recipe.get(key)
        if not isinstance(v, str):
            continue
        old = v
        if do_entities:
            v, ch = fix_entities_in_string(v)
            if ch:
                changes += 1
        if do_tr and tr_scope and has_turkish_script(v):
            nt = translate_tr_argos(v)
            if nt and nt != v:
                v = nt
                changes += 1
        if v != old:
            recipe[key] = v
            if key == "name":
                name_changed = True

    ings = recipe.get("ingredients")
    if isinstance(ings, list):
        for row in ings:
            if not isinstance(row, dict):
                continue
            for ik in ("item", "prep"):
                if ik not in row:
                    continue
                v = row.get(ik)
                if not isinstance(v, str):
                    continue
                old = v
                if do_entities:
                    v, ch = fix_entities_in_string(v)
                    if ch:
                        changes += 1
                if do_tr and tr_scope and has_turkish_script(v):
                    nt = translate_tr_argos(v)
                    if nt and nt != v:
                        v = nt
                        changes += 1
                if v != old:
                    row[ik] = v

    steps = recipe.get("instructions")
    if isinstance(steps, list):
        new_steps: list[str | Any] = []
        for step in steps:
            if not isinstance(step, str):
                new_steps.append(step)
                continue
            v = step
            old = v
            if do_entities:
                v, ch = fix_entities_in_string(v)
                if ch:
                    changes += 1
            if do_tr and tr_scope and has_turkish_script(v):
                nt = translate_tr_argos(v)
                if nt and nt != v:
                    v = nt
                    changes += 1
            new_steps.append(v)
        if new_steps != steps:
            recipe["instructions"] = new_steps

    return changes, name_changed


def iter_recipes_in_shard(data: dict | list) -> list[dict]:
    out: list[dict] = []
    if isinstance(data, list):
        for r in data:
            if isinstance(r, dict) and r.get("id") is not None:
                out.append(r)
    elif isinstance(data, dict):
        for v in data.values():
            if isinstance(v, dict) and v.get("id") is not None:
                out.append(v)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Fix HTML entities (and optional tr re-translate) in recipe_detail")
    ap.add_argument("--dry-run", action="store_true", help="Print stats only; do not write JSON")
    ap.add_argument(
        "--write",
        action="store_true",
        help="Write modified detail shards and cleanup_affected_ids.jsonl",
    )
    ap.add_argument(
        "--retranslate-tr",
        action="store_true",
        help="After entity fix, Argos tr→en on strings with Turkish letters (lezzet / original_language tr)",
    )
    ap.add_argument(
        "--skip-entities",
        action="store_true",
        help="Skip html.unescape pass (entities already fixed); use with --retranslate-tr to only run Argos",
    )
    ap.add_argument(
        "--affected-out",
        type=Path,
        default=None,
        help="JSONL path for touched ids (default: reports/cleanup_affected_ids.jsonl)",
    )
    args = ap.parse_args()

    if not args.dry_run and not args.write:
        print("ERROR: pass --dry-run or --write", file=sys.stderr)
        return 1

    if args.skip_entities and not args.retranslate_tr:
        print("ERROR: --skip-entities only makes sense with --retranslate-tr", file=sys.stderr)
        return 1

    if args.retranslate_tr:
        try:
            import argostranslate.translate  # type: ignore[import-untyped]  # noqa: F401
        except ImportError:
            print("ERROR: pip install argostranslate and tr→en pair (install_argos_pairs.py tr)", file=sys.stderr)
            return 1
        print(
            "Argos tr→en enabled: first translations may load models; full library can take many minutes.",
            flush=True,
        )

    shards = load_all_detail_shards()
    if args.dry_run:
        shards = copy.deepcopy(shards)
    affected: set[str] = set()
    name_letter_changes: list[tuple[str, str, str]] = []
    entity_recipes = 0
    tr_recipes = 0
    total_field_changes = 0
    modified_letters: set[str] = set()
    n_seen = 0

    for letter, data in sorted(shards.items()):
        for recipe in iter_recipes_in_shard(data):
            n_seen += 1
            if (args.retranslate_tr or not args.skip_entities) and n_seen % 400 == 0:
                print(f"  … processed {n_seen} recipes", flush=True)
            rid = str(recipe["id"])
            old_name = recipe.get("name") or ""
            old_letter = letter_from_name(old_name)

            if args.skip_entities:
                ce = 0
            else:
                ce, _ = mutate_recipe_strings(
                    recipe,
                    do_entities=True,
                    do_tr=False,
                )
            ct = 0
            if args.retranslate_tr and is_tr_scope_recipe(recipe):
                ct, _ = mutate_recipe_strings(
                    recipe,
                    do_entities=False,
                    do_tr=True,
                )

            if ce > 0:
                entity_recipes += 1
            if ct > 0:
                tr_recipes += 1
            ch = ce + ct
            if ch > 0:
                affected.add(rid)
                total_field_changes += ch
                modified_letters.add(letter)
                new_name = recipe.get("name") or ""
                new_letter = letter_from_name(new_name)
                if old_letter != new_letter:
                    name_letter_changes.append((rid, old_letter, new_letter))

    out_path = args.affected_out or (REPORTS_DIR / "cleanup_affected_ids.jsonl")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    print(
        f"Recipes with entity fixes: {entity_recipes}; "
        f"with tr re-translate changes: {tr_recipes}; "
        f"unique affected ids: {len(affected)}; "
        f"total field updates: {total_field_changes}",
        flush=True,
    )
    if name_letter_changes:
        print(f"Name first-letter bucket changes: {len(name_letter_changes)}", flush=True)

    if args.dry_run:
        for rid in sorted(list(affected)[:15]):
            print(f"  sample affected: {rid}")
        if len(affected) > 15:
            print(f"  ... and {len(affected) - 15} more")
        return 0

    with open(out_path, "w", encoding="utf-8") as f:
        for rid in sorted(affected):
            f.write(json.dumps({"id": rid}, ensure_ascii=False) + "\n")
    print(f"Wrote {out_path} ({len(affected)} ids)", flush=True)

    for L in sorted(modified_letters):
        path = RECIPE_DETAIL / f"detail_{L}.json"
        save_detail_file(path, shards[L], compact=True)
        print(f"Wrote {path.name}", flush=True)

    if name_letter_changes:
        print(
            "WARN: Run python3 scripts/repartition_detail_shards.py if detail letter buckets drift.",
            file=sys.stderr,
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
