#!/usr/bin/env python3
"""
Translate recipe_detail entries using a pluggable backend.

Backends:
  argos          — argostranslate (local, free); install pairs for each source language
  libretranslate — POST to LIBRETRANSLATE_URL (self-hosted or public; optional LIBRETRANSLATE_API_KEY)
  deepl          — DEEPL_AUTH_KEY in environment (free/paid DeepL API)
  none           — dry-run; no writes

Typical flow:
  python3 scripts/detect-nonenglish-recipes.py
  python3 scripts/translate_recipes.py --candidates-file reports/translation_candidates.jsonl --backend argos
  python3 scripts/sync_claude_index_from_detail.py --ids-from reports/translation_candidates.jsonl
  python3 scripts/check-recipe-shards.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable

sys.path.insert(0, str(Path(__file__).resolve().parent))
from recipe_pipeline_lib import (  # noqa: E402
    RECIPE_DETAIL,
    letter_from_name,
    load_all_detail_shards,
    save_detail_file,
)

GLOSSARY_PATH = Path(__file__).resolve().parent / "translation_glossary.json"

# DeepL / LibreTranslate language hints from detect script (ISO 639-1)
DEEPL_LANG = {"el", "es", "pt", "fr", "it", "de", "nl", "pl", "hr", "tr", "ro", "ru", "sv", "da", "fi"}

# Argos has no hr→en; Slovenian is the closest available pair for rough Croatian coverage.
ARGOS_FROM_ALIASES: dict[str, str] = {"hr": "sl"}


def load_glossary() -> list[str]:
    if not GLOSSARY_PATH.is_file():
        return []
    try:
        with open(GLOSSARY_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return list(data.get("preserve_substrings") or [])
    except (json.JSONDecodeError, OSError):
        return []


def protect_phrases(text: str, phrases: list[str]) -> tuple[str, dict[str, str]]:
    """Replace phrases with placeholders; return mapping to restore."""
    out = text
    mapping: dict[str, str] = {}
    for i, phrase in enumerate(phrases):
        if not phrase or phrase not in out:
            continue
        token = f"\ue000{i}\ue001"
        mapping[token] = phrase
        out = out.replace(phrase, token)
    return out, mapping


def restore_phrases(text: str, mapping: dict[str, str]) -> str:
    out = text
    for token, phrase in mapping.items():
        out = out.replace(token, phrase)
    return out


def is_ascii_only(s: str) -> bool:
    return all(ord(c) < 128 for c in s)


def load_candidates_map(path: Path) -> dict[str, str | None]:
    """id -> suggested_lang (ISO 639-1 or None)."""
    m: dict[str, str | None] = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            m[str(row["id"])] = row.get("suggested_lang")
    return m


def make_translator(
    backend: str,
    default_from: str | None,
) -> Callable[[str, str | None], str | None]:
    if backend == "none":

        def _none(text: str, from_lang: str | None) -> str | None:
            return text

        return _none

    if backend == "argos":

        def _argos(text: str, from_lang: str | None) -> str | None:
            try:
                import argostranslate.translate  # type: ignore[import-untyped]
            except ImportError:
                print("ERROR: pip install argostranslate", file=sys.stderr)
                return None
            src = (from_lang or default_from or "es").strip().lower()
            src = ARGOS_FROM_ALIASES.get(src, src)
            try:
                return argostranslate.translate.translate(text, src, "en")
            except Exception as e:
                print(f"WARN argos translate failed ({src}->en): {e}", file=sys.stderr)
                return None

        return _argos

    if backend == "libretranslate":
        base = (os.environ.get("LIBRETRANSLATE_URL") or "").rstrip("/")
        if not base:
            print("ERROR: Set LIBRETRANSLATE_URL for libretranslate backend", file=sys.stderr)

            def _fail(*_a: Any, **_k: Any) -> None:
                return None

            return _fail

        api_key = os.environ.get("LIBRETRANSLATE_API_KEY", "")

        def _libre(text: str, from_lang: str | None) -> str | None:
            src = from_lang if from_lang and from_lang != "auto" else "auto"
            body = json.dumps(
                {
                    "q": text,
                    "source": src,
                    "target": "en",
                    "format": "text",
                    "api_key": api_key,
                }
            ).encode("utf-8")
            req = urllib.request.Request(
                f"{base}/translate",
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    data = json.load(resp)
                return data.get("translatedText")
            except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
                print(f"WARN libretranslate: {e}", file=sys.stderr)
                return None

        return _libre

    if backend == "deepl":
        key = os.environ.get("DEEPL_AUTH_KEY", "").strip()
        if not key:
            print("ERROR: Set DEEPL_AUTH_KEY for deepl backend", file=sys.stderr)

            def _fail2(*_a: Any, **_k: Any) -> None:
                return None

            return _fail2

        host = os.environ.get("DEEPL_API_URL", "").rstrip("/") or (
            "https://api-free.deepl.com"
            if os.environ.get("DEEPL_FREE", "").lower() in ("1", "true", "yes")
            else "https://api.deepl.com"
        )

        def _deepl(text: str, from_lang: str | None) -> str | None:
            params: dict[str, str] = {
                "auth_key": key,
                "text": text,
                "target_lang": "EN",
            }
            if from_lang and from_lang.upper() in {x.upper() for x in DEEPL_LANG}:
                params["source_lang"] = from_lang.upper()
            data = urllib.parse.urlencode(params).encode("utf-8")
            req = urllib.request.Request(f"{host}/v2/translate", data=data, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    payload = json.load(resp)
                return payload["translations"][0]["text"]
            except Exception as e:
                print(f"WARN deepl: {e}", file=sys.stderr)
                return None

        return _deepl

    raise ValueError(f"Unknown backend {backend}")


def translate_string(
    text: str,
    translator: Callable[[str, str | None], str | None],
    from_lang: str | None,
    glossary_phrases: list[str],
    *,
    allow_ascii: bool = False,
) -> str | None:
    t = text.strip()
    if len(t) < 2:
        return None
    if is_ascii_only(t) and not allow_ascii:
        return None
    protected, mapping = protect_phrases(t, glossary_phrases)
    out = translator(protected, from_lang)
    if not out:
        return None
    return restore_phrases(out, mapping)


def translate_recipe_fields(
    recipe: dict,
    translator: Callable[[str, str | None], str | None],
    from_lang: str | None,
    glossary_phrases: list[str],
    *,
    allow_ascii: bool = False,
) -> int:
    """Mutate recipe in place. Returns count of fields changed."""
    changed = 0
    for key in ("name", "category", "cuisine", "yield"):
        if key not in recipe:
            continue
        v = recipe.get(key)
        if not isinstance(v, str):
            continue
        new = translate_string(
            v, translator, from_lang, glossary_phrases, allow_ascii=allow_ascii
        )
        if new and new != v:
            if key == "name" and not recipe.get("original_name"):
                recipe["original_name"] = v
                recipe["original_language"] = from_lang or "unknown"
            recipe[key] = new
            changed += 1

    ings = recipe.get("ingredients")
    if isinstance(ings, list):
        for row in ings:
            if not isinstance(row, dict):
                continue
            for ik in ("item", "prep"):
                v = row.get(ik)
                if not isinstance(v, str):
                    continue
                new = translate_string(
                    v, translator, from_lang, glossary_phrases, allow_ascii=allow_ascii
                )
                if new and new != v:
                    row[ik] = new
                    changed += 1

    steps = recipe.get("instructions")
    if isinstance(steps, list):
        new_steps: list[str] = []
        modified = False
        for step in steps:
            if not isinstance(step, str):
                new_steps.append(step)
                continue
            new = translate_string(
                step, translator, from_lang, glossary_phrases, allow_ascii=allow_ascii
            )
            if new and new != step:
                new_steps.append(new)
                modified = True
                changed += 1
            else:
                new_steps.append(step)
        if modified:
            recipe["instructions"] = new_steps

    return changed


def count_non_ascii_strings(recipe: dict) -> int:
    n = 0
    for key in ("name", "category", "cuisine", "yield"):
        v = recipe.get(key)
        if isinstance(v, str) and v.strip() and not is_ascii_only(v):
            n += 1
    for row in recipe.get("ingredients") or []:
        if not isinstance(row, dict):
            continue
        for ik in ("item", "prep"):
            v = row.get(ik)
            if isinstance(v, str) and v.strip() and not is_ascii_only(v):
                n += 1
    for step in recipe.get("instructions") or []:
        if isinstance(step, str) and step.strip() and not is_ascii_only(step):
            n += 1
    return n


def count_translatable_strings(recipe: dict, *, ascii_ok: bool) -> int:
    """Fields translate_recipe_fields may attempt (len >= 2)."""
    n = 0

    def counts(v: object) -> bool:
        if not isinstance(v, str):
            return False
        if len(v.strip()) < 2:
            return False
        return ascii_ok or not is_ascii_only(v)

    for key in ("name", "category", "cuisine", "yield"):
        if counts(recipe.get(key)):
            n += 1
    for row in recipe.get("ingredients") or []:
        if not isinstance(row, dict):
            continue
        for ik in ("item", "prep"):
            if counts(row.get(ik)):
                n += 1
    for step in recipe.get("instructions") or []:
        if counts(step):
            n += 1
    return n


def build_detail_id_to_recipe(shards: dict[str, dict | list]) -> dict[str, tuple[str, dict]]:
    """id -> (letter, recipe dict)."""
    m: dict[str, tuple[str, dict]] = {}
    for letter, data in shards.items():
        if isinstance(data, dict):
            for v in data.values():
                if isinstance(v, dict) and v.get("id") is not None:
                    m[str(v["id"])] = (letter, v)
        elif isinstance(data, list):
            for r in data:
                if isinstance(r, dict) and r.get("id") is not None:
                    m[str(r["id"])] = (letter, r)
    return m


def main() -> int:
    ap = argparse.ArgumentParser(description="Translate recipes in recipe_detail/")
    ap.add_argument(
        "--candidates-file",
        type=Path,
        help="JSONL from detect-nonenglish-recipes.py (column id, suggested_lang)",
    )
    ap.add_argument(
        "--ids",
        type=str,
        default="",
        help="Comma-separated recipe ids (optional; else use candidates file)",
    )
    ap.add_argument(
        "--backend",
        choices=("argos", "libretranslate", "deepl", "none"),
        default="argos",
        help="Translation backend (default argos)",
    )
    ap.add_argument(
        "--default-from",
        type=str,
        default="es",
        help="Fallback source language for argos when candidate has no suggested_lang",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not write files (still runs translator unless backend none)",
    )
    ap.add_argument(
        "--repartition-after",
        action="store_true",
        help="Run repartition_detail_shards.py after translate if any name changed letter bucket",
    )
    ap.add_argument(
        "--checkpoint-every",
        type=int,
        default=0,
        metavar="N",
        help="After every N recipes, flush modified detail shards to disk (0=only at end)",
    )
    ap.add_argument(
        "--quiet",
        action="store_true",
        help="Only print warnings, checkpoints, and final summary",
    )
    ap.add_argument(
        "--translate-ascii-lingua",
        action="store_true",
        help=(
            "With --candidates-file: also translate ASCII-only text when suggested_lang "
            "is set and not en (Lingua-detected Latin languages). Re-run detect first "
            "for a fresh candidate list."
        ),
    )
    args = ap.parse_args()

    ids: list[str] = []
    lang_by_id: dict[str, str | None] = {}
    if args.ids.strip():
        ids = [x.strip() for x in args.ids.split(",") if x.strip()]
    elif args.candidates_file and args.candidates_file.is_file():
        lang_by_id = load_candidates_map(args.candidates_file)
        ids = sorted(lang_by_id.keys())
    else:
        print("ERROR: Provide --candidates-file or --ids", file=sys.stderr)
        return 1

    glossary = load_glossary()
    shards = load_all_detail_shards()
    id_to_recipe = build_detail_id_to_recipe(shards)

    if args.dry_run:
        total = 0
        touched = 0
        for rid in ids:
            hit = id_to_recipe.get(rid)
            recipe = hit[1] if hit else None
            if not recipe:
                print(f"WARN: id not in detail shards: {rid}", file=sys.stderr)
                continue
            lg = (lang_by_id.get(rid) or "").strip().lower()
            has_na = count_non_ascii_strings(recipe) > 0
            allow_ascii = bool(
                args.translate_ascii_lingua and lg and lg != "en"
            )
            if not has_na and not allow_ascii:
                continue
            c = count_translatable_strings(recipe, ascii_ok=allow_ascii)
            if c:
                touched += 1
                print(f"{rid}: {c} string(s) would be translated (ascii_lingua={allow_ascii})")
                total += c
        print(
            f"Dry-run: {total} string(s) in {touched} recipe(s) of {len(ids)} id(s); "
            "no files written",
            flush=True,
        )
        return 0

    translator = make_translator(args.backend, args.default_from)
    modified_letters: set[str] = set()
    names_changed_letter: list[tuple[str, str, str]] = []  # id, old_letter, new_letter
    done = 0
    changed_recipes = 0
    total_fields = 0

    def flush_shards() -> None:
        for L in sorted(modified_letters):
            if not L:
                continue
            path = RECIPE_DETAIL / f"detail_{L}.json"
            save_detail_file(path, shards[L], compact=True)

    for rid in ids:
        hit = id_to_recipe.get(rid)
        if not hit:
            print(f"WARN: id not in detail shards: {rid}", file=sys.stderr)
            continue
        letter, recipe = hit
        lg = (lang_by_id.get(rid) or "").strip().lower()
        has_na = count_non_ascii_strings(recipe) > 0
        allow_ascii = bool(
            args.translate_ascii_lingua and lg and lg != "en"
        )
        if not has_na and not allow_ascii:
            done += 1
            continue

        from_lang = lang_by_id.get(rid)
        if not from_lang:
            from_lang = args.default_from

        old_name = recipe.get("name") or ""
        old_l = letter_from_name(old_name)

        n = translate_recipe_fields(
            recipe,
            translator,
            from_lang,
            glossary,
            allow_ascii=allow_ascii,
        )
        done += 1

        if n > 0:
            modified_letters.add(letter)
            changed_recipes += 1
            total_fields += n
            new_name = recipe.get("name") or ""
            new_l = letter_from_name(new_name)
            if old_l != new_l:
                names_changed_letter.append((rid, old_l, new_l))
            if not args.quiet:
                print(f"Translated {n} field(s): {rid} ({letter})")

        if (
            args.checkpoint_every > 0
            and done % args.checkpoint_every == 0
            and modified_letters
        ):
            flush_shards()
            print(f"checkpoint: {done}/{len(ids)} recipes, flushed {len(modified_letters)} shard(s)", flush=True)

    flush_shards()

    print(
        f"Saved detail shards: {', '.join(sorted(modified_letters)) or '(none)'} "
        f"({changed_recipes} recipes, {total_fields} fields, {done} processed)",
        flush=True,
    )

    if names_changed_letter and args.repartition_after:
        import subprocess

        script = Path(__file__).resolve().parent / "repartition_detail_shards.py"
        r = subprocess.run([sys.executable, str(script)], check=False)
        if r.returncode != 0:
            print("ERROR: repartition_detail_shards.py failed", file=sys.stderr)
            return r.returncode
    elif names_changed_letter:
        print(
            "WARN: Some names changed first-letter bucket; run: "
            "python3 scripts/repartition_detail_shards.py",
            file=sys.stderr,
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
