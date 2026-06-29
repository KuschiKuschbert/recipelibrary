#!/usr/bin/env python3
"""Validate the service-worker cache list and runtime data coverage."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SW_PATH = ROOT / "sw.js"

CRITICAL_SHELL = {
    "./index.html",
    "./riviera.html",
    "./kitchen-book.html",
    "./pantry.html",
    "./aroma.html",
    "./flavor.html",
    "./pairing-atlas.html",
    "./notebooklm-gallery.html",
    "./manifest.webmanifest",
    "./assets/theme.css",
    "./assets/app-nav.js",
    "./assets/user-recipes.js",
    "./assets/order-list.js",
    "./assets/aroma-hints.js",
    "./assets/package-planner.js",
    "./assets/package-prep-sheet.js",
    "./assets/planner-scale.js",
    "./assets/stocktake-list.js",
    "./assets/riviera-canonical-ingredient.js",
    "./assets/riviera-ingredient-merge.js",
}

REQUIRED_CACHEABLE_FRAGMENTS = (
    "recipe_detail",
    "alpha_catalog",
    "claude_index",
    "aroma_data",
    "combined_data",
    "ingredients_unified_modal",
    "riviera_data",
    "flavour_data",
    "pantry_data",
)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def ok(msg: str) -> None:
    print(f"PASS  {msg}")


def fail(msg: str) -> None:
    print(f"FAIL  {msg}", file=sys.stderr)


def parse_cache_name(source: str) -> str | None:
    m = re.search(r"const\s+CACHE_NAME\s*=\s*['\"]([^'\"]+)['\"]", source)
    return m.group(1) if m else None


def parse_shell_urls(source: str) -> list[str]:
    m = re.search(r"const\s+SHELL_URLS\s*=\s*\[(.*?)\];", source, re.DOTALL)
    if not m:
        return []
    body = m.group(1)
    return re.findall(r"['\"](\./[^'\"]*|\./)['\"]", body)


def path_for_shell_url(url: str) -> Path | None:
    if url == "./":
        return None
    clean = url[2:] if url.startswith("./") else url
    return ROOT / clean


def main() -> int:
    errors = 0
    if not SW_PATH.is_file():
        fail("missing sw.js")
        return 1

    source = SW_PATH.read_text(encoding="utf-8")
    cache_name = parse_cache_name(source)
    if cache_name:
        ok(f"CACHE_NAME {cache_name}")
        if not re.fullmatch(r"kuschi-kitchen-v\d+", cache_name):
            errors += 1
            fail("CACHE_NAME should match kuschi-kitchen-vN")
    else:
        errors += 1
        fail("CACHE_NAME missing")

    shell_urls = parse_shell_urls(source)
    if shell_urls:
        ok(f"SHELL_URLS entries: {len(shell_urls)}")
    else:
        errors += 1
        fail("SHELL_URLS missing or unparsable")

    shell_set = set(shell_urls)
    for url in sorted(CRITICAL_SHELL - shell_set):
        errors += 1
        fail(f"SHELL_URLS missing critical URL {url}")

    missing_files: list[str] = []
    for url in shell_urls:
        p = path_for_shell_url(url)
        if p is not None and not p.is_file():
            missing_files.append(f"{url} -> {rel(p)}")
    if missing_files:
        errors += len(missing_files)
        for item in missing_files:
            fail(f"SHELL_URLS file missing: {item}")
    elif shell_urls:
        ok("all SHELL_URLS files exist")

    missing_cacheable = [frag for frag in REQUIRED_CACHEABLE_FRAGMENTS if frag not in source]
    if missing_cacheable:
        errors += len(missing_cacheable)
        for frag in missing_cacheable:
            fail(f"CACHEABLE missing fragment {frag!r}")
    else:
        ok("CACHEABLE covers core data directories")

    if "self.skipWaiting()" in source and "self.clients.claim()" in source:
        ok("install/activate lifecycle claims clients")
    else:
        errors += 1
        fail("service worker should call skipWaiting() and clients.claim()")

    if errors:
        fail(f"{errors} service-worker validation issue(s)")
        return 1
    ok("service-worker validation passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
