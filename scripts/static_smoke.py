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
    "riviera_data/recipe_use_links.json",
    "riviera_data/sunday_tapas_menu_map.json",
    "riviera_data/service_variant_backlog.json",
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


def check_riviera_lifecycle(base: str) -> int:
    errors = 0
    release_id = "RIV-KNOWLEDGE-2026-07-27-V13"
    allowed_statuses = {"LOCKED", "ACTIVE WORKING", "TRIAL ONLY", "RETIRED"}
    expected_statuses = {
        "arancini": "LOCKED",
        "potato-pave": "LOCKED",
        "baklava-cheesecake": "LOCKED",
        "house-focaccia": "LOCKED",
        "burnt-butter-mash": "LOCKED",
        "riviera-blondies-working": "ACTIVE WORKING",
        "flourless-chocolate-torte-working": "ACTIVE WORKING",
        "ribbon-sandwiches": "ACTIVE WORKING",
        "sweet-petit-fours": "ACTIVE WORKING",
        "veal-prosciutto-stuffed-olives": "ACTIVE WORKING",
        "natural-oysters-prosecco-fennel-orange": "TRIAL ONLY",
        "warm-oysters-lemon-oregano-caper": "TRIAL ONLY",
        "oyster-saganaki": "TRIAL ONLY",
        "sicilian-gratin-oysters": "TRIAL ONLY",
        "harissa-oysters-preserved-lemon": "TRIAL ONLY",
    }

    recipes = json.loads(fetch(base, "riviera_data/builtins.json").decode("utf-8"))
    by_id = {
        str(recipe.get("id")): recipe
        for recipe in recipes
        if isinstance(recipe, dict) and recipe.get("id")
    }
    if len(recipes) != 157:
        fail(f"Riviera lifecycle catalog: expected 157 recipes, found {len(recipes)}")
        errors += 1
    for recipe_id, recipe in by_id.items():
        if recipe.get("status") not in allowed_statuses:
            fail(f"Riviera lifecycle catalog: {recipe_id} has invalid status")
            errors += 1
        for key in (
            "version",
            "provenance",
            "confirmationFlags",
            "aliases",
            "links",
            "allergens",
            "controls",
            "scalingBasis",
            "rationalSettings",
        ):
            if key not in recipe:
                fail(f"Riviera lifecycle catalog: {recipe_id} missing {key}")
                errors += 1
    for recipe_id, expected_status in expected_statuses.items():
        recipe = by_id.get(recipe_id)
        if recipe is None:
            fail(f"Riviera lifecycle catalog: missing {recipe_id}")
            errors += 1
        elif recipe.get("status") != expected_status:
            fail(
                f"Riviera lifecycle catalog: {recipe_id} expected "
                f"{expected_status}, found {recipe.get('status')}"
            )
            errors += 1

    catalog = json.loads(
        fetch(
            base,
            "riviera_sources/current/Riviera_Recipe_Catalog_Source_Of_Truth_2026-07-08.json",
        ).decode("utf-8")
    )
    recipe_manifest = json.loads(
        fetch(base, "riviera_sources/current/manifest.json").decode("utf-8")
    )
    if catalog.get("releaseId") != release_id:
        fail("Riviera structured catalog releaseId drift")
        errors += 1
    if recipe_manifest.get("releaseId") != release_id:
        fail("Riviera recipe manifest releaseId drift")
        errors += 1

    expected_allergens = {
        "baklava-cheesecake": {"Wheat", "Gluten", "Dairy", "Egg", "Pecan", "Pistachio", "Walnut"},
        "natural-oysters-prosecco-fennel-orange": {"Molluscs", "Sulphites"},
        "oyster-saganaki": {"Molluscs", "Dairy", "Sulphites"},
        "sicilian-gratin-oysters": {"Molluscs", "Fish", "Dairy", "Gluten"},
        "harissa-oysters-preserved-lemon": {"Molluscs", "Dairy"},
    }
    for recipe_id, allergen_set in expected_allergens.items():
        actual = set((by_id.get(recipe_id, {}).get("allergens") or {}).get("contains") or [])
        if not allergen_set.issubset(actual):
            fail(f"Riviera allergens: {recipe_id} lost source-recorded declarations")
            errors += 1

    if (by_id["natural-oysters-prosecco-fennel-orange"].get("rationalSettings") or {}).get(
        "status"
    ) != "NOT REQUIRED":
        fail("Raw Prosecco oyster must mark Rational settings NOT REQUIRED")
        errors += 1
    for recipe_id in (
        "warm-oysters-lemon-oregano-caper",
        "oyster-saganaki",
        "sicilian-gratin-oysters",
        "harissa-oysters-preserved-lemon",
        "riviera-blondies-working",
        "baklava-cheesecake",
        "veal-meatballs",
    ):
        if not (by_id[recipe_id].get("rationalSettings") or {}).get("stages"):
            fail(f"Riviera Rational settings: {recipe_id} lost source-recorded stages")
            errors += 1

    for recipe_id in ("house-focaccia", "burnt-butter-mash"):
        if by_id[recipe_id].get("houseStandard") is not True:
            fail(f"Riviera house standards: {recipe_id} must be marked houseStandard")
            errors += 1

    sunday_ids = {
        recipe_id
        for recipe_id, recipe in by_id.items()
        if any(
            link.get("label") == "Sunday Tapas"
            for link in (recipe.get("links") or {}).get("events", [])
            if isinstance(link, dict)
        )
    }
    if len(sunday_ids) < 10 or {
        "beef-polpette-canape",
        "slow-cooked-beef-albondigas-buffet",
    } & sunday_ids:
        fail("Sunday Tapas backlinks are incomplete or include quarantined duplicates")
        errors += 1
    if not {"veal-meatballs", "veal-prosciutto-stuffed-olives"}.issubset(sunday_ids):
        fail("Sunday Tapas backlinks must include distinct Polpette and stuffed-olive recipes")
        errors += 1

    tapas_map = json.loads(
        fetch(base, "riviera_data/sunday_tapas_menu_map.json").decode("utf-8")
    )
    menu_items = {
        str(item.get("menu_item_id")): item
        for item in tapas_map.get("menu_items", [])
        if isinstance(item, dict) and item.get("menu_item_id")
    }
    polpette_item = menu_items.get("polpette") or {}
    olive_item = menu_items.get("veal-prosciutto-stuffed-olives") or {}
    if (
        tapas_map.get("no_auto_buffer") is not True
        or tapas_map.get("service_window") != "Sunday 11:00-17:00"
        or polpette_item.get("recipe_id") != "veal-meatballs"
        or polpette_item.get("pieces_per_serve") != 3
        or polpette_item.get("piece_weight_g") != 80
        or olive_item.get("recipe_id") != "veal-prosciutto-stuffed-olives"
        or olive_item.get("pieces_per_serve") != 6
        or not polpette_item.get("active")
        or not olive_item.get("active")
    ):
        fail("Sunday Tapas menu mapping drifted for Polpette or stuffed olives")
        errors += 1
    for recipe_id in (
        "arancini",
        "house-scones",
        "romesco",
        "lemon-thyme-aioli",
        "ribbon-sandwiches",
        "sweet-petit-fours",
    ):
        if not any(
            link.get("sectionLabel") == "High Tea"
            for link in (by_id[recipe_id].get("links") or {}).get("packages", [])
            if isinstance(link, dict)
        ):
            fail(f"High Tea backlinks missing {recipe_id}")
            errors += 1
    if not any(
        link.get("label") == "Arabian Long Lunch — 8 Aug 2026"
        for link in (by_id["baklava-cheesecake"].get("links") or {}).get("events", [])
        if isinstance(link, dict)
    ):
        fail("Baklava Cheesecake event backlink is missing")
        errors += 1

    aliases = json.loads(
        fetch(base, "riviera_data/canonical_recipe_aliases.json").decode("utf-8")
    )
    redirects = aliases.get("recipe_id_redirects") or {}
    if redirects.get("baklava-cheesecake-gn-100") != "baklava-cheesecake":
        fail("Legacy V13 recipe ID redirects are missing")
        errors += 1

    packages = json.loads(fetch(base, "riviera_data/function_packages.json").decode("utf-8"))
    if packages.get("releaseId") != release_id:
        fail("Function package data releaseId drift")
        errors += 1
    package_sections = [
        section
        for package in packages.get("packages", [])
        for section in package.get("sections", [])
    ]
    if not package_sections or any(
        section.get("salesStatus") != "NEEDS CURRENT SALES CONFIRMATION"
        for section in package_sections
    ):
        fail("Function package sales confirmation flags are incomplete")
        errors += 1

    riviera_html = fetch(base, "riviera.html").decode("utf-8", errors="replace")
    for marker in (
        'id="filterStatus"',
        'id="chipStatus"',
        'id="filterType"',
        'id="chipType"',
        'id="filterPackage"',
        'id="chipPackage"',
        'id="filterEventUse"',
        'id="chipEventUse"',
        "rivieraStatusBadge",
        "confirmationFlags",
        "rivieraRecipeStructuredMetaHtml",
        "RIVIERA_ACTIVE_RELEASE_ID",
        "replace(/_/g, ' ')",
        "if (!status && rivieraRecipeStatus(r) === 'RETIRED')",
        "status: 'TRIAL ONLY'",
    ):
        if marker not in riviera_html:
            fail(f"riviera.html missing lifecycle UI marker: {marker}")
            errors += 1
    user_recipes_js = fetch(base, "assets/user-recipes.js").decode("utf-8", errors="replace")
    for marker in (
        "status: payload.status || 'TRIAL ONLY'",
        "Epicure pairing review and Kitchen Council review are not yet recorded.",
        "rationalSettings:",
        "scalingBasis:",
    ):
        if marker not in user_recipes_js:
            fail(f"user-recipes.js missing new-draft lifecycle marker: {marker}")
            errors += 1
    if errors == 0:
        ok("Riviera lifecycle data and status-filter UI")
    return errors


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
        errors += check_riviera_lifecycle(base)

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
