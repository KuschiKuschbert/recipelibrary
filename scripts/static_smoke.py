#!/usr/bin/env python3
"""Dependency-free static-site smoke test via a local HTTP server."""
from __future__ import annotations

import json
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from functools import partial
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CORE_PAGES = (
    "index.html",
    "riviera.html",
    "kitchen-book.html",
    "pantry.html",
    "aroma.html",
    "flavor.html",
    "pairing-atlas.html",
    "notebooklm-gallery.html",
)

CRITICAL_JSON = (
    "alpha_catalog/manifest.json",
    "riviera_sources/current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json",
    "riviera_data/builtins.json",
    "riviera_data/function_packages.json",
    "riviera_data/planner_pairing_hints.json",
    "riviera_data/planner_unit_costs.json",
    "riviera_data/stocktake_catalog.json",
    "aroma_data/ingredients_modal_core.json",
    "combined_data/ingredients_unified_modal.json",
    "pantry_data/shard_hay_index.json",
    "notebooklm/manifest.json",
    "manifest.webmanifest",
)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        return


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.assets: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {k.lower(): v for k, v in attrs if v}
        if tag.lower() == "script" and attr_map.get("src"):
            self.assets.add(attr_map["src"] or "")
        elif tag.lower() in {"link", "img", "source"}:
            href = attr_map.get("href") or attr_map.get("src")
            if href:
                self.assets.add(href)


def ok(msg: str) -> None:
    print(f"PASS  {msg}")


def fail(msg: str) -> None:
    print(f"FAIL  {msg}", file=sys.stderr)


def is_local_url(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme in {"http", "https", "data", "mailto", "tel", "javascript"}:
        return False
    return not url.startswith("#")


def start_server() -> tuple[ThreadingHTTPServer, str]:
    handler = partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    return server, f"http://{host}:{port}/"


def fetch(base: str, path: str) -> bytes:
    url = urllib.parse.urljoin(base, path)
    with urllib.request.urlopen(url, timeout=10) as resp:
        status = getattr(resp, "status", 200)
        if status < 200 or status >= 300:
            raise urllib.error.HTTPError(url, status, "bad status", resp.headers, None)
        return resp.read()


def check_page(base: str, page: str) -> tuple[int, set[str]]:
    try:
        body = fetch(base, page)
    except Exception as e:  # noqa: BLE001 - smoke output should include the concrete request failure.
        fail(f"{page}: {e}")
        return 1, set()
    text = body.decode("utf-8", errors="replace")
    if "<html" not in text.lower():
        fail(f"{page}: response does not look like HTML")
        return 1, set()
    parser = AssetParser()
    parser.feed(text)
    ok(f"{page} loads")
    return 0, parser.assets


def check_asset(base: str, owner_page: str, asset_url: str) -> int:
    if not is_local_url(asset_url):
        return 0
    resolved = urllib.parse.urljoin(owner_page, asset_url)
    parsed = urllib.parse.urlparse(resolved)
    path = parsed.path.lstrip("/")
    if not path:
        return 0
    try:
        body = fetch(base, path)
    except Exception as e:  # noqa: BLE001
        fail(f"{owner_page}: linked asset {asset_url!r} failed: {e}")
        return 1
    if len(body) == 0:
        fail(f"{owner_page}: linked asset {asset_url!r} is empty")
        return 1
    return 0


def check_json(base: str, path: str) -> int:
    try:
        body = fetch(base, path)
        json.loads(body.decode("utf-8"))
    except Exception as e:  # noqa: BLE001
        fail(f"{path}: {e}")
        return 1
    ok(f"{path} parses as JSON")
    return 0


def main() -> int:
    errors = 0
    server, base = start_server()
    try:
        page_assets: dict[str, set[str]] = {}
        for page in CORE_PAGES:
            err, assets = check_page(base, page)
            errors += err
            page_assets[page] = assets

        checked_assets: set[tuple[str, str]] = set()
        for page, assets in page_assets.items():
            for asset in sorted(assets):
                key = (page, asset)
                if key in checked_assets:
                    continue
                checked_assets.add(key)
                errors += check_asset(base, page, asset)
        if checked_assets:
            ok(f"linked local assets checked: {len(checked_assets)}")

        for path in CRITICAL_JSON:
            errors += check_json(base, path)

        manifest = json.loads(fetch(base, "alpha_catalog/manifest.json").decode("utf-8"))
        for filename in manifest.get("files", []):
            errors += check_json(base, f"alpha_catalog/{filename}")

    finally:
        server.shutdown()
        server.server_close()

    if errors:
        fail(f"{errors} static smoke issue(s)")
        return 1
    ok("static smoke passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
