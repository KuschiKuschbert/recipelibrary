#!/usr/bin/env python3
"""Spot-check planner scaling for known dishes (mirrors assets/planner-scale.js)."""
from __future__ import annotations

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VARIANT_PATHS = [
    ROOT / "riviera_data/service_variants.json",
    ROOT / "riviera_data/service_variants_canapes.json",
    ROOT / "riviera_data/service_variants_corporate.json",
    ROOT / "riviera_data/service_variants_mains_sides.json",
    ROOT / "riviera_data/service_variant_source_overrides.json",
]
STYLE_TO_SERVICE = {
    "cocktail": "cocktail",
    "buffet": "buffet",
    "plated": "plated_main",
    "afternoon tea": "high_tea",
    "high tea": "high_tea",
}


def parse_yield_num(y: str) -> float:
    m = re.search(r"\d[\d.]*", str(y or ""))
    if not m:
        return 1.0
    n = float(m.group())
    return n if n > 0 else 1.0


def first_num(v) -> float | None:
    m = re.search(r"[\d.]+", str(v or ""))
    return float(m.group()) if m else None


def load_variants() -> dict:
    merged: dict = {"service_variants": {}}
    for path in VARIANT_PATHS:
        data = json.loads(path.read_text())
        for rid, grp in (data.get("service_variants") or {}).items():
            if rid not in merged["service_variants"]:
                merged["service_variants"][rid] = grp
            elif isinstance(grp, dict) and isinstance(merged["service_variants"][rid], dict):
                for k, v in grp.items():
                    if k not in merged["service_variants"][rid]:
                        merged["service_variants"][rid][k] = v
    return merged


def scale_factor(
    recipe: dict,
    pax: int,
    style: str,
    variants: dict,
    redirects: dict,
) -> float | None:
    rid = redirects.get(recipe["id"], recipe["id"])
    svc = STYLE_TO_SERVICE.get(style, "buffet")
    group = variants["service_variants"].get(rid, {})
    rec = group.get(svc) if isinstance(group, dict) else None
    if rec and rec.get("status") != "not_recommended":
        buf = first_num(rec.get("automatic_event_buffer_multiplier")) or 1
        ppg = (
            first_num(rec.get("pieces_per_guest"))
            or first_num(rec.get("piece_count"))
            or first_num(rec.get("sliders_per_guest"))
            or first_num(rec.get("prawns_per_guest"))
            or first_num(rec.get("cutlets_per_guest"))
            or first_num(rec.get("skewers_per_guest"))
            or first_num(rec.get("madeleines_per_guest"))
            or first_num(rec.get("portion_count_per_guest"))
        )
        confirmed_base = first_num((group.get("base_prep") or {}).get("base_yield_pieces"))
        if not confirmed_base and str(rec.get("ingredient_scaling_status") or "").upper() == "NEEDS CONFIRMATION":
            return None
        base = confirmed_base or parse_yield_num(recipe.get("yield", ""))
        if ppg and base and pax:
            return (pax * ppg * buf) / base
        if base and pax:
            return (pax * buf) / base
    base = parse_yield_num(recipe.get("yield", ""))
    return pax / base


def scale_qty(qty: str, factor: float | None) -> str:
    if factor is None:
        return "NEEDS CONFIRMATION"
    if not qty or factor == 1:
        return qty or ""
    s = str(qty).strip()
    for sym, val in {"½": "0.5", "¼": "0.25", "¾": "0.75"}.items():
        s = s.replace(sym, val)
    m = re.match(r"^([\d.]+)(.*)$", s)
    if not m:
        return qty
    num = float(m.group(1)) * factor
    disp = str(int(num)) if abs(num - round(num)) < 1e-6 else f"{num:.2f}".rstrip("0").rstrip(".")
    return disp + m.group(2)


def main() -> None:
    builtins = json.loads((ROOT / "riviera_data/builtins.json").read_text())
    ids = [
        "arancini",
        "calamari",
        "roast-beef-thyme-garlic-carvery",
        "oysters-kilpatrick",
        "chicken-skewer",
        "chorizo-potatoes",
    ]
    all_recipes = {r["id"]: r for r in builtins if r.get("id")}
    recipes = {recipe_id: all_recipes[recipe_id] for recipe_id in ids}
    variants = load_variants()
    redirects = json.loads((ROOT / "riviera_data/canonical_recipe_aliases.json").read_text()).get(
        "recipe_id_redirects", {}
    )
    pax = 120
    lines = [
        "# Planner data accuracy spot-check",
        "",
        f"Generated at {pax} covers for cocktail and buffet styles.",
        "",
        "## Merge paths",
        "",
        "- **Shopping tab:** `mergeIngredients` in `package-prep-sheet.js` — canonical key via `KuschiRivieraCanonical`, qty merge via `rivieraQtyToMergeBase`.",
        "- **Order list:** `buildOrderLinesFlat` + `scaleQtyForPlanner` using shared `KuschiPlannerScale` scale map (now awaits `loadServiceData` before open).",
        "- **Shared scaling:** `KuschiPlannerScale.scaleFactorForRecipe` / `scaleQtyStr`.",
        "",
        "## Fix applied",
        "",
        "`parseYieldNum` now matches `\\d[\\d.]*` so yields like `Approx. 200 @ 40g` parse as 200 (not `.`).",
        "",
    ]
    for style in ("cocktail", "buffet"):
        lines.append(f"## {style.title()} · {pax} covers")
        lines.append("")

    high_tea_ids = {
        "arancini": 1,
        "house-scones": 1,
        "ribbon-sandwiches": 2,
        "sweet-petit-fours": 2,
    }
    lines.extend(
        [
            "## High Tea locked service targets",
            "",
            "| Guests | Recipe | Target | Ingredient scale | Status |",
            "|--------|--------|--------|------------------|--------|",
        ]
    )
    high_tea_errors = []
    for guests in (12, 100):
        for rid, pieces_per_guest in high_tea_ids.items():
            recipe = all_recipes[rid]
            record = variants["service_variants"][rid]["high_tea"]
            actual_ppg = first_num(record.get("pieces_per_guest"))
            target = guests * (actual_ppg or 0)
            expected_target = guests * pieces_per_guest
            factor = scale_factor(recipe, guests, "high tea", variants, redirects)
            if target != expected_target:
                high_tea_errors.append(
                    f"{rid} @ {guests}: expected target {expected_target}, found {target}"
                )
            if rid == "arancini":
                expected_scale = None
                status = "PASS" if factor is None else "FAIL"
                if factor is not None:
                    high_tea_errors.append(
                        f"arancini @ {guests}: ingredient scale must be NEEDS CONFIRMATION"
                    )
            else:
                expected_scale = guests / 40 if rid == "house-scones" else float(guests)
                status = (
                    "PASS"
                    if factor is not None and math.isclose(factor, expected_scale)
                    else "FAIL"
                )
                if status == "FAIL":
                    high_tea_errors.append(
                        f"{rid} @ {guests}: expected factor {expected_scale}, found {factor}"
                    )
            scale_label = "NEEDS CONFIRMATION" if factor is None else f"×{factor:.3f}"
            lines.append(
                f"| {guests} | {rid} | {target:g} pieces | {scale_label} | {status} |"
            )
    lines.append("")
    if high_tea_errors:
        raise SystemExit("\n".join(high_tea_errors))
        lines.append("| Recipe | Factor | Sample scaled qty | Status |")
        lines.append("|--------|--------|-------------------|--------|")
        for rid in ids:
            r = recipes[rid]
            f = scale_factor(r, pax, style, variants, redirects)
            sample = (r.get("ingredients") or [{}])[0]
            sq = scale_qty(sample.get("qty", ""), f)
            status = "PASS" if 0.05 <= f <= 20 else "REVIEW"
            lines.append(f"| {rid} | {f:.3f} | {sq} · {sample.get('item', '')} | {status} |")
        lines.append("")
    out = ROOT / "reports/planner_data_accuracy.md"
    out.write_text("\n".join(lines))
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
