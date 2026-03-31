#!/usr/bin/env python3
"""Optional machine translation for aroma JSON strings that still fail the English checker.

Uses only the standard library for HTTP. Set one of:
  DEEPL_API_KEY   — preferred; https://www.deepl.com/pro-api
  OPENAI_API_KEY  — fallback; model via OPENAI_MT_MODEL (default gpt-4o-mini)

Translate only exact strings passed in; caller dedupes and applies via apply_string_translations.
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Final

_MAX_DEEPL_BATCH: Final[int] = 45
_MAX_OPENAI_CHUNK: Final[int] = 40


def _strip_wrapping_quotes(s: str) -> str:
    s = s.strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()
    return s


def translate_with_deepl(strings: list[str], api_key: str) -> dict[str, str]:
    """DE→EN via DeepL. Returns map original -> translation (best effort)."""
    if not strings:
        return {}
    out: dict[str, str] = {}
    url = "https://api-free.deepl.com/v2/translate"
    # Paid tier uses api.deepl.com; free uses api-free.deepl.com
    if os.environ.get("DEEPL_API_ENDPOINT") == "pro":
        url = "https://api.deepl.com/v2/translate"
    i = 0
    while i < len(strings):
        chunk = strings[i : i + _MAX_DEEPL_BATCH]
        body = [("auth_key", api_key), ("target_lang", "EN"), ("source_lang", "DE")]
        for t in chunk:
            body.append(("text", t))
        data = urllib.parse.urlencode(body).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, json.JSONDecodeError) as e:
            print("aroma_mt_backfill: DeepL request failed:", e, file=sys.stderr)
            return out
        translations = payload.get("translations") or []
        for j, tr in enumerate(translations):
            if j < len(chunk):
                orig = chunk[j]
                text = (tr.get("text") or "").strip()
                if text:
                    out[orig] = text
        i += len(chunk)
    return out


def translate_with_openai(strings: list[str], api_key: str) -> dict[str, str]:
    """DE→EN via OpenAI chat; returns map original -> translation."""
    if not strings:
        return {}
    model = os.environ.get("OPENAI_MT_MODEL", "gpt-4o-mini")
    url = "https://api.openai.com/v1/chat/completions"
    out: dict[str, str] = {}
    i = 0
    while i < len(strings):
        chunk = strings[i : i + _MAX_OPENAI_CHUNK]
        lines = "\n".join(f"{k}\t{v}" for k, v in enumerate(chunk))
        user = (
            "Each line is INDEX<TAB>GERMAN_OR_MIXED_TEXT for a spice reference book UI.\n"
            "Translate to concise English (culinary). Keep proper nouns (dishes, regions) in natural English.\n"
            "Reply with ONLY a JSON object: {\"0\":\"translation\", ...} mapping each index string to translation.\n"
            "No markdown fences.\n\n"
            f"LINES:\n{lines}"
        )
        body = json.dumps(
            {
                "model": model,
                "temperature": 0.2,
                "messages": [
                    {
                        "role": "system",
                        "content": "You output only valid JSON objects mapping string keys to strings.",
                    },
                    {"role": "user", "content": user},
                ],
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, json.JSONDecodeError) as e:
            print("aroma_mt_backfill: OpenAI request failed:", e, file=sys.stderr)
            return out
        try:
            content = payload["choices"][0]["message"]["content"]
            content = content.strip()
            if content.startswith("```"):
                content = re.sub(r"^```(?:json)?\s*", "", content)
                content = re.sub(r"\s*```$", "", content)
            mapping = json.loads(content)
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            print("aroma_mt_backfill: bad OpenAI response:", e, file=sys.stderr)
            i += len(chunk)
            continue
        for idx_str, trans in mapping.items():
            try:
                idx = int(idx_str)
            except (TypeError, ValueError):
                continue
            if 0 <= idx < len(chunk):
                t = str(trans).strip() if trans is not None else ""
                t = _strip_wrapping_quotes(t)
                if t:
                    out[chunk[idx]] = t
        i += len(chunk)
    return out


def translate_failing_strings(strings: list[str]) -> dict[str, str]:
    """Pick DeepL if DEEPL_API_KEY set, else OpenAI if OPENAI_API_KEY set; else {}."""
    uniq = list(dict.fromkeys(strings))
    deepl = os.environ.get("DEEPL_API_KEY", "").strip()
    if deepl:
        return translate_with_deepl(uniq, deepl)
    oa = os.environ.get("OPENAI_API_KEY", "").strip()
    if oa:
        return translate_with_openai(uniq, oa)
    return {}
