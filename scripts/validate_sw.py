#!/usr/bin/env python3
"""Validate the service-worker cache list and runtime data coverage."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SW_PATH = ROOT / "sw.js"

CRITICAL_SHELL = {
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./assets/theme.css",
    "./assets/app-nav.js",
    "./assets/user-recipes.js",
    "./assets/aroma-hints.js",
    "./assets/kuschi-recipe-ui.js",
    "./assets/kuschi-kitchen-mode.js",
    "./assets/kuschi-filter-chips.js",
    "./assets/kuschi-cook-mode.js",
    "./assets/screen-wake.js",
    "./assets/riviera-canonical-ingredient.js",
    "./assets/recipe-metric-normalize.js",
    "./assets/flavour-toolkit-lookup.js",
    "./icon-192.png",
    "./icon-512.png",
    "./apple-touch-icon-180.png",
}

CRITICAL_RUNTIME = {
    "./leichhardt.html",
    "./assets/leichhardt.css",
    "./leichhardt_data/trial-dishes.png",
    "./leichhardt_data/Leichhardt_Trial_Dishes_One_Page.pdf",
    "./riviera.html",
    "./kitchen-book.html",
    "./pantry.html",
    "./aroma.html",
    "./flavor.html",
    "./pairing-atlas.html",
    "./notebooklm-gallery.html",
    "./assets/order-list.js",
    "./assets/flavor-explorer.js",
    "./assets/pairing-atlas.js",
    "./assets/prep-list.js",
    "./assets/overlay-stack.js",
    "./assets/planner-scale.js",
    "./assets/planner-extras.js",
    "./assets/package-planner.js",
    "./assets/package-prep-sheet.js",
    "./assets/stocktake-list.js",
    "./assets/riviera-ingredient-merge.js",
    "./assets/riviera-init-stocktake.js",
    "./assets/riviera-order-override-remap-v2.js",
    "./assets/riviera-event-context.js",
    "./assets/riviera-service-variants.js",
    "./assets/notebooklm-gallery.js",
    "./assets/recipe-gemini-format.js",
    "./assets/recipe-import-helpers.js",
    "./assets/qrcodejs-1.0.0.min.js",
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


def parse_url_array(source: str, const_name: str) -> list[str]:
    m = re.search(rf"const\s+{re.escape(const_name)}\s*=\s*\[(.*?)\];", source, re.DOTALL)
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

    shell_urls = parse_url_array(source, "SHELL_URLS")
    runtime_urls = parse_url_array(source, "RUNTIME_URLS")
    if shell_urls:
        ok(f"SHELL_URLS entries: {len(shell_urls)}")
    else:
        errors += 1
        fail("SHELL_URLS missing or unparsable")
    if runtime_urls:
        ok(f"RUNTIME_URLS entries: {len(runtime_urls)}")
    else:
        errors += 1
        fail("RUNTIME_URLS missing or unparsable")

    shell_set = set(shell_urls)
    for url in sorted(CRITICAL_SHELL - shell_set):
        errors += 1
        fail(f"SHELL_URLS missing critical URL {url}")
    runtime_set = set(runtime_urls)
    for url in sorted(CRITICAL_RUNTIME - runtime_set):
        errors += 1
        fail(f"RUNTIME_URLS missing critical URL {url}")

    missing_files: list[str] = []
    for url in shell_urls + runtime_urls:
        p = path_for_shell_url(url)
        if p is not None and not p.is_file():
            missing_files.append(f"{url} -> {rel(p)}")
    if missing_files:
        errors += len(missing_files)
        for item in missing_files:
            fail(f"SHELL_URLS file missing: {item}")
    elif shell_urls:
        ok("all service-worker URL files exist")

    missing_cacheable = [frag for frag in REQUIRED_CACHEABLE_FRAGMENTS if frag not in source]
    if missing_cacheable:
        errors += len(missing_cacheable)
        for frag in missing_cacheable:
            fail(f"CACHEABLE missing fragment {frag!r}")
    else:
        ok("CACHEABLE covers core data directories")

    riviera_network_decl = source.find("const NETWORK_FIRST_RIVIERA_DATA")
    riviera_network_route = source.find("if (NETWORK_FIRST_RIVIERA_DATA.test(url.pathname))")
    cache_first_route = source.find("if (CACHEABLE.test(url.pathname))")
    if (
        riviera_network_decl >= 0
        and riviera_network_route >= 0
        and cache_first_route >= 0
        and riviera_network_route < cache_first_route
        and "fetch(e.request, { cache: 'no-store' })"
        in source[riviera_network_route:cache_first_route]
        and "return cache.put(e.request, resp.clone())"
        in source[riviera_network_route:cache_first_route]
    ):
        ok("Riviera operational data is network-first with offline fallback")
    else:
        errors += 1
        fail("Riviera operational data must bypass cache-first handling")

    navigation_start = source.find("if (e.request.mode === 'navigate')")
    navigation_end = source.find("NETWORK_FIRST_RIVIERA_DATA.test", navigation_start)
    if (
        navigation_start >= 0
        and navigation_end > navigation_start
        and "fetch(e.request, { cache: 'no-store' })"
        in source[navigation_start:navigation_end]
        and "return cache.put(e.request, resp.clone())"
        in source[navigation_start:navigation_end]
    ):
        ok("navigation refreshes online before using the offline cache")
    else:
        errors += 1
        fail("navigation must be network-first with an offline cache fallback")

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
