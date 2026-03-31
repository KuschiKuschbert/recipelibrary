#!/usr/bin/env python3
"""Re-apply DE→EN post-processing to committed aroma_data/*.json (no PDFs).

Writes ingredients.json, food_pairings.json, and pairing_matrix.json under aroma_data/.

Optional machine translation for strings that still fail the English checker (after rules):
  DEEPL_API_KEY     — preferred
  OPENAI_API_KEY    — fallback (OPENAI_MT_MODEL optional, default gpt-4o-mini)
  DEEPL_API_ENDPOINT=pro — use api.deepl.com instead of api-free.deepl.com

Without API keys, runs deterministic postprocess only; exits 1 if check_aroma_english would fail.
"""
from __future__ import annotations

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(REPO_ROOT, "aroma_data")

sys.path.insert(0, SCRIPT_DIR)

from aroma_i18n import (  # noqa: E402
    pairing_matrix,
    postprocess_food_pairings,
    postprocess_ingredients,
)
from aroma_mt_backfill import translate_failing_strings  # noqa: E402
from check_aroma_english import (  # noqa: E402
    apply_string_translations,
    scan_aroma_user_strings,
)


def _has_mt_credentials() -> bool:
    return bool(
        (os.environ.get("DEEPL_API_KEY") or "").strip()
        or (os.environ.get("OPENAI_API_KEY") or "").strip()
    )


def main() -> int:
    ing_path = os.path.join(DATA_DIR, "ingredients.json")
    fp_path = os.path.join(DATA_DIR, "food_pairings.json")
    matrix_path = os.path.join(DATA_DIR, "pairing_matrix.json")
    if not os.path.isfile(ing_path):
        print("ERROR: missing", ing_path, file=sys.stderr)
        return 1
    with open(ing_path, encoding="utf-8") as f:
        ingredients: list[dict] = json.load(f)
    food_pairings: list[dict] | None = None
    if os.path.isfile(fp_path):
        with open(fp_path, encoding="utf-8") as f:
            food_pairings = json.load(f)

    postprocess_ingredients(ingredients)
    if food_pairings is not None:
        postprocess_food_pairings(food_pairings)

    mt_rounds = 0
    max_mt = 3
    while mt_rounds < max_mt:
        _issues, bad = scan_aroma_user_strings(ingredients, food_pairings)
        if not bad:
            break
        if not _has_mt_credentials():
            print(
                "normalize_aroma_english: MT backfill skipped "
                "(set DEEPL_API_KEY or OPENAI_API_KEY to translate remaining strings).",
                file=sys.stderr,
            )
            break
        tmap = translate_failing_strings(list(bad))
        if not tmap:
            print(
                "normalize_aroma_english: machine translation returned nothing; stopping MT loop.",
                file=sys.stderr,
            )
            break
        n = apply_string_translations(ingredients, food_pairings, tmap)
        print(f"normalize_aroma_english: applied {n} MT replacement(s), round {mt_rounds + 1}.")
        postprocess_ingredients(ingredients)
        if food_pairings is not None:
            postprocess_food_pairings(food_pairings)
        mt_rounds += 1

    # Final deterministic pass before write
    postprocess_ingredients(ingredients)
    if food_pairings is not None:
        postprocess_food_pairings(food_pairings)

    matrix = pairing_matrix(ingredients)
    with open(ing_path, "w", encoding="utf-8") as f:
        json.dump(ingredients, f, indent=2, ensure_ascii=False)
    with open(matrix_path, "w", encoding="utf-8") as f:
        json.dump(matrix, f, indent=2, ensure_ascii=False)
    print("Wrote", ing_path, f"({len(ingredients)} spices)")
    print("Wrote", matrix_path, f"({len(matrix)} keys)")
    if food_pairings is not None:
        with open(fp_path, "w", encoding="utf-8") as f:
            json.dump(food_pairings, f, indent=2, ensure_ascii=False)
        print("Wrote", fp_path, f"({len(food_pairings)} foods)")
    else:
        print("SKIP:", fp_path, "(not found)")

    _issues, bad = scan_aroma_user_strings(ingredients, food_pairings)
    if bad:
        print(
            f"normalize_aroma_english: {len(bad)} unique string(s) still fail English check "
            f"({len(_issues)} occurrences). Run with API key or extend aroma_i18n / checker.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
