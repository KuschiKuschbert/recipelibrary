#!/usr/bin/env python3
"""Re-apply DE→EN post-processing to committed aroma_data/*.json (no PDFs).

Writes ingredients.json, food_pairings.json, and pairing_matrix.json under aroma_data/.
"""
from __future__ import annotations

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(REPO_ROOT, "aroma_data")

from aroma_i18n import (  # noqa: E402
    pairing_matrix,
    postprocess_food_pairings,
    postprocess_ingredients,
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
    postprocess_ingredients(ingredients)
    matrix = pairing_matrix(ingredients)
    with open(ing_path, "w", encoding="utf-8") as f:
        json.dump(ingredients, f, indent=2, ensure_ascii=False)
    with open(matrix_path, "w", encoding="utf-8") as f:
        json.dump(matrix, f, indent=2, ensure_ascii=False)
    print("Wrote", ing_path, f"({len(ingredients)} spices)")
    print("Wrote", matrix_path, f"({len(matrix)} keys)")
    if os.path.isfile(fp_path):
        with open(fp_path, encoding="utf-8") as f:
            food_pairings: list[dict] = json.load(f)
        postprocess_food_pairings(food_pairings)
        with open(fp_path, "w", encoding="utf-8") as f:
            json.dump(food_pairings, f, indent=2, ensure_ascii=False)
        print("Wrote", fp_path, f"({len(food_pairings)} foods)")
    else:
        print("SKIP:", fp_path, "(not found)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
