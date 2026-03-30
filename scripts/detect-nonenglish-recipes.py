#!/usr/bin/env python3
"""
Scan recipe_detail shards for likely non-English content.

Outputs reports/translation_candidates.jsonl with id, reasons, suggested_lang, sample.

Unicode script detection works without extra deps. Optional lingua-language-detector
improves Latin-script recall (es/pt/hr/tr, etc.) — pip install -r scripts/requirements-translation.txt
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# Allow running as script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from recipe_pipeline_lib import (  # noqa: E402
    REPORTS_DIR,
    collect_translatable_text,
    load_all_detail_recipes,
)

try:
    from lingua import Language
    from lingua import LanguageDetectorBuilder

    _LINGUA_DETECTOR = (
        LanguageDetectorBuilder.from_languages(
            Language.ENGLISH,
            Language.SPANISH,
            Language.PORTUGUESE,
            Language.FRENCH,
            Language.ITALIAN,
            Language.GERMAN,
            Language.CROATIAN,
            Language.GREEK,
            Language.TURKISH,
            Language.DUTCH,
            Language.POLISH,
            Language.ROMANIAN,
        )
        .with_minimum_relative_distance(0.25)
        .build()
    )
    HAS_LINGUA = True
except ImportError:
    HAS_LINGUA = False
    _LINGUA_DETECTOR = None


def unicode_script_flags(text: str) -> list[str]:
    """Return human-readable script flags for non-Latin scripts we care about."""
    flags: list[str] = []
    for c in text:
        o = ord(c)
        if 0x0370 <= o <= 0x03FF or 0x1F00 <= o <= 0x1FFF:
            flags.append("greek")
        elif 0x0400 <= o <= 0x04FF or 0x0500 <= o <= 0x052F:
            flags.append("cyrillic")
        elif 0x0600 <= o <= 0x06FF:
            flags.append("arabic")
        elif 0x0590 <= o <= 0x05FF:
            flags.append("hebrew")
        elif 0x3040 <= o <= 0x30FF or 0x4E00 <= o <= 0x9FFF:
            flags.append("cjk")
    return list(dict.fromkeys(flags))


def lingua_detect(text: str) -> tuple[str | None, float]:
    if not HAS_LINGUA or not _LINGUA_DETECTOR or len(text.strip()) < 12:
        return None, 0.0
    conf = _LINGUA_DETECTOR.compute_language_confidence_values(text)
    if not conf:
        return None, 0.0
    top = conf[0]
    code = top.language.iso_code_639_1.name.lower() if top.language else None
    return code, top.value


def sample_text(recipe: dict, max_len: int = 200) -> str:
    blob = collect_translatable_text(recipe)
    blob = re.sub(r"\s+", " ", blob).strip()
    return blob[:max_len] + ("…" if len(blob) > max_len else "")


def main() -> int:
    ap = argparse.ArgumentParser(description="Detect non-English recipes in recipe_detail/")
    ap.add_argument(
        "--output",
        type=Path,
        default=None,
        help="JSONL output path (default: reports/translation_candidates.jsonl)",
    )
    ap.add_argument(
        "--no-lingua",
        action="store_true",
        help="Skip lingua even if installed (Unicode heuristics only)",
    )
    ap.add_argument(
        "--min-lingua-confidence",
        type=float,
        default=0.65,
        help="Minimum lingua confidence to treat as non-English (default 0.65)",
    )
    args = ap.parse_args()
    out_path = args.output or (REPORTS_DIR / "translation_candidates.jsonl")

    use_lingua = HAS_LINGUA and not args.no_lingua
    if not HAS_LINGUA and not args.no_lingua:
        print(
            "Note: lingua-language-detector not installed; Latin-script languages may be missed. "
            "pip install -r scripts/requirements-translation.txt",
            file=sys.stderr,
        )

    recipes = load_all_detail_recipes()
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    with open(out_path, "w", encoding="utf-8") as out:
        for rid, recipe in sorted(recipes.items(), key=lambda x: x[0]):
            blob = collect_translatable_text(recipe)
            if not blob.strip():
                continue
            reasons: list[str] = []
            scripts = unicode_script_flags(blob)
            for s in scripts:
                reasons.append(f"unicode:{s}")

            suggested_lang: str | None = None
            lingua_conf = 0.0
            if use_lingua:
                code, lingua_conf = lingua_detect(blob)
                if code and code != "en" and lingua_conf >= args.min_lingua_confidence:
                    reasons.append(f"lingua:{code}:{lingua_conf:.2f}")
                    suggested_lang = code

            if scripts:
                # Map script to rough BCP-47 for translators
                if "greek" in scripts:
                    suggested_lang = suggested_lang or "el"
                elif "cyrillic" in scripts:
                    suggested_lang = suggested_lang or "ru"

            if not reasons:
                continue

            row = {
                "id": rid,
                "reasons": reasons,
                "suggested_lang": suggested_lang,
                "sample": sample_text(recipe),
            }
            out.write(json.dumps(row, ensure_ascii=False) + "\n")
            count += 1

    print(f"Wrote {count} candidate rows to {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
