#!/usr/bin/env python3
"""
Apply authoritative Stock List ingredient name corrections to builtins.json.
Only applies clear product-naming corrections (not recipe-level quantity/unit changes).
Emits reports/ingredient_reconcile_changes.md.

Usage: python3 scripts/reconcile_ingredients.py [--dry-run]
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
REPORTS.mkdir(exist_ok=True)

# Authoritative Stock List name → corrected builtins name
# Conservative: only apply where the stock list product name is clearly more precise/correct
CORRECTIONS: dict[str, str] = {
    # Format corrections (builtins has the order reversed vs stock catalogue)
    "GF Breadcrumbs":           "Breadcrumbs GF",
    "GF Flour":                 "Flour GF",
    # Product name precision
    "Kewpie Mayonnaise":        "Kewpie Mayo",
    "Greek Yogurt":             "Greek Style Yogurt",
    "Full-Cream Milk":          "Full Cream Milk",
    "Mini Brioche Buns":        "Mini Brioche Slider Buns",
    "Mini Cannoli Shells":      "Cannoli Shells",
    # Pluralisation to match stock list product names
    "Chicken Thigh Fillets":    "Chicken Thighs Fillets",
    # Minor formatting
    "Chicken Stock Concentrate": "Chicken Stock Concentrate",  # keep — already matches
}

# Also normalise case for exact matches
CASE_FIXES: dict[str, str] = {}  # populated below


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    builtins_path = ROOT / "riviera_data" / "builtins.json"
    raw = json.loads(builtins_path.read_text(encoding="utf-8"))

    changes: list[dict] = []

    for recipe in raw:
        for ing in recipe.get("ingredients", []):
            old = ing.get("item", "")
            new = CORRECTIONS.get(old)
            if new and new != old:
                changes.append({
                    "recipe_id": recipe["id"],
                    "recipe_name": recipe["name"],
                    "old_item": old,
                    "new_item": new,
                })
                if not args.dry_run:
                    ing["item"] = new

    # Report
    lines = [
        "# Ingredient Reconciliation Changes",
        "",
        f"Total corrections: {len(changes)}",
        f"Mode: {'DRY RUN' if args.dry_run else 'APPLIED'}",
        "",
        "| Recipe | Old Name | New Name |",
        "|---|---|---|",
    ]
    for c in changes:
        lines.append(f"| `{c['recipe_id']}` | {c['old_item']} | {c['new_item']} |")

    if not changes:
        lines.append("| — | No changes needed | — |")

    out_md = REPORTS / "ingredient_reconcile_changes.md"
    out_md.write_text("\n".join(lines), encoding="utf-8")
    print(f"Changes: {len(changes)}")
    for c in changes:
        print(f"  [{c['recipe_id']}] {c['old_item']!r} -> {c['new_item']!r}")

    if not args.dry_run and changes:
        builtins_path.write_text(json.dumps(raw, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {builtins_path}")

    print(f"Wrote {out_md}")


if __name__ == "__main__":
    main()
