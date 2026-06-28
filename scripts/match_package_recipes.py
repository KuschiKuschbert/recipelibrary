#!/usr/bin/env python3
"""
Cross-reference function_packages.json dishes against builtins.json + aliases.
Resolves each package dish to a canonical recipe id where possible.
Emits reports/package_recipe_coverage.json + .md.

Usage: python3 scripts/match_package_recipes.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from difflib import get_close_matches

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
REPORTS.mkdir(exist_ok=True)


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return s.strip()


def load_json(p: Path) -> dict | list:
    return json.loads(p.read_text(encoding="utf-8"))


def main():
    # Load data
    pkg_data = load_json(ROOT / "riviera_data" / "function_packages.json")
    builtins = load_json(ROOT / "riviera_data" / "builtins.json")
    aliases_data = load_json(ROOT / "riviera_data" / "canonical_recipe_aliases.json")

    # Build lookup structures
    builtin_ids = {r["id"] for r in builtins}
    builtin_by_id = {r["id"]: r for r in builtins}

    # Build name → id map (from builtins names, labels, subtitles, elements)
    name_to_id: dict[str, str] = {}
    for r in builtins:
        for field in ("name", "label", "subtitle"):
            val = r.get(field)
            if val:
                name_to_id[slugify(val)] = r["id"]
        for el in r.get("elements", []):
            name_to_id[slugify(el)] = r["id"]

    # Add aliases
    for alias_block in aliases_data.get("canonical_recipes", {}).values():
        cid = alias_block.get("canonical_id")
        if not cid:
            continue
        for alias in alias_block.get("aliases", []):
            name_to_id[slugify(alias)] = cid

    for redir_from, redir_to in aliases_data.get("recipe_id_redirects", {}).items():
        if isinstance(redir_to, dict):
            redir_to = redir_to.get("redirect_to", "")
        if redir_to in builtin_ids:
            name_to_id[slugify(redir_from)] = redir_to

    # Keyword pattern → recipe id  (hand-crafted from audit knowledge)
    KEYWORD_MAP: list[tuple[re.Pattern, str]] = [
        # Existing recipes
        (re.compile(r"arancini"),               "arancini"),
        (re.compile(r"calamari"),               "calamari"),
        (re.compile(r"kilpatrick|oyster.*kil"), "oysters-kilpatrick"),
        (re.compile(r"polpette|meatball|albondigas"), "veal-meatballs"),
        (re.compile(r"chicken.*skewer|skewer.*chicken|limoncello.*chicken"), "chicken-skewer"),
        (re.compile(r"chorizo.*potat|crispy.*chorizo.*potat"), "chorizo-potatoes"),
        (re.compile(r"lamb.*cutlet|chargrilled.*lamb"), "lamb-cutlet"),
        (re.compile(r"fish.*slider|crispy.*reef.*fish"), "fish-slider"),
        (re.compile(r"beef.*kofta|kofta.*souvlak"), "beef-kofta"),
        (re.compile(r"camembert.*cigar|pecan.*cranberry.*cigar"), "camembert-cigars"),
        (re.compile(r"romesco"),                "romesco"),
        (re.compile(r"lemon.*dill.*aioli"),     "lemon-dill-aioli"),
        (re.compile(r"lemon.*thyme.*aioli"),    "lemon-thyme-aioli"),
        (re.compile(r"whipped.*butter"),        "whipped-butter"),
        (re.compile(r"labneh"),                 "labneh-tzatziki"),
        (re.compile(r"hot.*honey|honey.*hot"),  "mild-hot-honey"),
        (re.compile(r"kilpatrick.*sauce"),      "kilpatrick-sauce-house"),
        (re.compile(r"charcuterie|grazing.*box|graz.*box"), "charcuterie-board-classic"),
        (re.compile(r"charcuterie.*board|cheese.*deli.*meat"), "charcuterie-board-classic"),
        (re.compile(r"bruschetta.*roast.*beef|roast.*beef.*bruschetta|rare.*roast.*beef"), "bruschetta-rare-roast-beef"),
        (re.compile(r"spanner.*crab.*cannoli"),  "spanner-crab-cannoli"),
        (re.compile(r"prawn.*brioche.*slider"),  "prawn-brioche-slider"),
        (re.compile(r"smoked.*chicken.*bacon.*brioche|chicken.*bacon.*slider"), "chicken-bacon-brioche-slider"),
        (re.compile(r"vintage.*beef.*slider|beef.*brioche.*slider"), "vintage-beef-brioche-slider"),
        (re.compile(r"lamb.*shoulder.*provenc"), "lamb-shoulder-provencale-composed"),
        (re.compile(r"beef.*bourguign"),         "beef-bourguignon"),
        (re.compile(r"creamy.*lemon.*caper.*chicken|lemon.*caper.*chicken"), "creamy-lemon-caper-chicken"),
        (re.compile(r"champagne.*mignonette|natural.*oyster"), "natural-oysters-champagne-mignonette"),
        (re.compile(r"greek.*spiced.*roast.*lamb|greek.*roast.*lamb"), "greek-spiced-roast-lamb"),
        (re.compile(r"potato.*gratin|creamy.*potato.*gratin"), "creamy-potato-gratin"),
        (re.compile(r"chat.*potato.*feta|garlic.*herb.*chat.*potato"), "garlic-herb-chat-potatoes-feta"),
        (re.compile(r"broccoli.*cauliflower.*gratin"), "broccoli-cauliflower-gratin"),
        (re.compile(r"prosciutto.*chicken|chicken.*prosciutto"), "prosciutto-chicken-lemon-caper"),
        (re.compile(r"fillet.*beef.*tempranillo|beef.*fillet.*tempranillo|tenderloin.*tempranillo"), "fillet-beef-tempranillo"),
        (re.compile(r"stuffed.*mushroom.*romesco|risotto.*mushroom"), "stuffed-mushroom-romesco"),
        (re.compile(r"cannoli.*tiramisu|roving.*cannoli|tiramisu.*cannoli"), "roving-cannoli-tiramisu"),
        (re.compile(r"house.*scone|scone.*platter"), "house-scones"),
        (re.compile(r"scone.*chantilly|chantilly.*scone"), "platter-scones-chantilly-jam"),
        (re.compile(r"grazing.*box"),            "grazing-box-standard"),
        (re.compile(r"ham.*cheese.*croissant"),  "platter-ham-cheese-croissants"),
        (re.compile(r"sandwich.*platter|mixed.*sandwich"), "platter-sandwiches-standard"),
        (re.compile(r"wrap.*platter|premium.*wrap"), "platter-wraps-premium"),
        (re.compile(r"brioche.*roll.*platter|filled.*brioche.*roll"), "platter-filled-brioche-rolls"),
        (re.compile(r"roast.*beef.*beetroot|beetroot.*balsamic.*platter"), "platter-roast-beef-beetroot-relish"),
        (re.compile(r"dietary.*graz|gf.*graz"),  "platter-dietary-grazing"),
        (re.compile(r"savoury.*filled.*croissant|savoury.*croissant"), "corporate-savoury-croissants"),
        (re.compile(r"sweet.*filled.*croissant|sweet.*croissant"), "corporate-sweet-croissants"),
        (re.compile(r"bircher.*muesli"),         "corporate-bircher-muesli-bowls"),
        (re.compile(r"caesar.*salad.*bowl|chicken.*caesar.*bowl"), "corporate-chicken-caesar-bowl"),
        (re.compile(r"lamb.*fattoush"),          "corporate-lamb-fattoush-bowl"),
        (re.compile(r"mediterranean.*chicken.*bowl|moroccan.*chicken.*bowl|grilled.*chicken.*cous"), "corporate-mediterranean-chicken-bowl"),
        (re.compile(r"beef.*lasagne|lasagne.*side.*salad"), "corporate-beef-lasagne-side-salad"),
        (re.compile(r"breakfast.*wrap"),         "corporate-breakfast-wraps"),
        (re.compile(r"gourmet.*filled.*cookie"),  "corporate-gourmet-filled-cookies"),
        (re.compile(r"mixed.*filled.*sandwich|mixed.*sandwich"),  "corporate-mixed-sandwiches"),
        (re.compile(r"roasted.*veg.*salad.*bowl|moroccan.*veg.*medley"), "corporate-roast-veg-salad-bowl"),
        (re.compile(r"chilli.*garlic.*prawn.*chorizo|prawn.*chorizo.*chilli"), "chilli-garlic-prawns-chorizo-rocket"),
        (re.compile(r"heirloom.*tomato.*bruschetta|goat.*cheese.*bruschetta"), "heirloom-tomato-bruschetta-goats-cheese"),
        (re.compile(r"greek.*pulled.*beef|slow.*cooked.*greek.*beef"), "greek-style-pulled-beef-buffet"),
        (re.compile(r"chargrilled.*lemon.*thyme.*chicken|lemon.*thyme.*chicken.*buffet"), "chargrilled-lemon-thyme-chicken-buffet"),
        (re.compile(r"duo.*cannoli|pistachio.*white.*choc.*cannoli"), "duo-cannoli-pistachio-white-chocolate"),
        (re.compile(r"strawberry.*ricotta.*cheesecake|ricotta.*cheesecake"), "strawberry-ricotta-cheesecake-plated"),
        (re.compile(r"riviera.*tiramisu|tiramisu.*hazelnut"), "riviera-tiramisu-biscotti-hazelnut"),
        (re.compile(r"kids.*snack|snack.*pack"),  "kids-snack-pack"),
        (re.compile(r"kids.*spagh|spaghetti.*bolognese"), "kids-spaghetti-bolognese"),
        (re.compile(r"bacon.*egg.*muffin"),      "corporate-bacon-egg-muffins"),
        (re.compile(r"bacon.*egg.*panini"),      "corporate-bacon-egg-paninis"),
        (re.compile(r"waffles"),                 "corporate-waffles-breakfast"),
        (re.compile(r"pesto.*pasta.*salad"),     "corporate-pesto-pasta-salad"),
        (re.compile(r"moroccan.*cous|couscous.*moroccan|moroccan.*couscous"), "corporate-moroccan-couscous-salad"),
        (re.compile(r"pumpkin.*feta.*pepita"),   "corporate-pumpkin-feta-pepita-salad"),
        (re.compile(r"garden.*salad|traditional.*garden"), "corporate-traditional-garden-salad"),
        (re.compile(r"potato.*bacon.*herb.*salad|creamy.*potato.*bacon"), "corporate-creamy-potato-bacon-herb-salad"),
        (re.compile(r"spinach.*ricotta.*pastizzi|pastizzi.*platter"), "funeral-spinach-ricotta-pastizzi-platter"),
        (re.compile(r"mixed.*hot.*nibble|nibble.*box"), "funeral-mixed-hot-nibbles-box"),
        # New component recipes
        (re.compile(r"lemon.*caper.*tartare|tartare.*caper"), "lemon-caper-tartare"),
        (re.compile(r"tarragon.*cream.*sauce"),  "tarragon-cream-sauce"),
        (re.compile(r"butterscotch|toffee.*sauce"), "butterscotch-toffee-sauce"),
        (re.compile(r"crispy.*caper"),           "crispy-capers"),
        (re.compile(r"focaccia|house.*focaccia"), "house-focaccia"),
        (re.compile(r"burnt.*butter.*mash"),     "burnt-butter-mash"),
        (re.compile(r"pistachio.*cannoli.*fill|cannoli.*pistachio.*fill"), "cannoli-pistachio-filling"),
        (re.compile(r"coffee.*nutella.*cannoli|nutella.*cannoli"), "cannoli-coffee-nutella-filling"),
        (re.compile(r"benedictine.*custard|caramel.*custard"), "benedictine-caramel-custard"),
        # Grazing / seafood
        (re.compile(r"graz.*table|graz.*platter|charcuterie.*graz"), "charcuterie-board-classic"),
        (re.compile(r"tiger.*prawn|purely.*prawn|oyster.*bar.*fountain|seafood.*fountain"), "natural-oysters-champagne-mignonette"),
        (re.compile(r"nibble.*platter|sausage.*roll.*party.*pie|party.*pie.*quiche"), "nibble-platter-40"),
        (re.compile(r"sweet.*slice.*cake|sweet.*platter"), "platter-sweet-slices-cakes"),
        (re.compile(r"seasonal.*fruit|fruit.*platter"), "platter-sweet-slices-cakes"),
        (re.compile(r"slow.*cooked.*beef.*albondigas"), "slow-cooked-beef-albondigas-buffet"),
        # Corporate buffet mains
        (re.compile(r"leg.*ham.*bone|ham.*off.*bone"), "platter-ham-cheese-croissants"),
        (re.compile(r"pulled.*lamb|moroccan.*pull.*lamb"), "lamb-shoulder-provencale-composed"),
        # Desserts
        (re.compile(r"date.*madeleine|sticky.*date.*madeleine"), "date-madeleines"),
        (re.compile(r"flourless.*choc|chocolate.*torte"), "riviera-tiramisu-biscotti-hazelnut"),
        (re.compile(r"pavlova"), "strawberry-ricotta-cheesecake-plated"),
        # Kids
        (re.compile(r"chicken.*nugget.*chip|nugget.*chip|fish.*chip"), "kids-snack-pack"),
        (re.compile(r"gelato|ice.*cream"), "kids-snack-pack"),
    ]

    def match_dish(name: str, search: str) -> str | None:
        combined = slugify(name + " " + search)
        # 1. Exact slug match on name/label
        if combined in name_to_id:
            return name_to_id[combined]
        for key in (slugify(name), slugify(search)):
            if key in name_to_id:
                return name_to_id[key]
        # 2. Keyword pattern
        for pattern, recipe_id in KEYWORD_MAP:
            if pattern.search(combined):
                if recipe_id in builtin_ids:
                    return recipe_id
        # 3. Fuzzy match on builtin names
        all_keys = list(name_to_id.keys())
        close = get_close_matches(slugify(name), all_keys, n=1, cutoff=0.80)
        if close:
            return name_to_id[close[0]]
        return None

    # Walk all package items
    results: list[dict] = []
    matched_count = 0
    gap_count = 0

    for pkg in pkg_data.get("packages", []):
        for section in pkg.get("sections", []):
            for course in section.get("courses", []):
                for item in course.get("items", []):
                    item_name = item.get("name", "")
                    search = item.get("search", "")
                    recipe_id = match_dish(item_name, search)

                    entry = {
                        "event": pkg["label"],
                        "section": section["label"],
                        "course": course["course"],
                        "item_name": item_name,
                        "search": search,
                        "recipe_id": recipe_id,
                        "matched": recipe_id is not None,
                        "recipe_name": builtin_by_id[recipe_id]["name"] if recipe_id else None,
                    }
                    results.append(entry)
                    if recipe_id:
                        matched_count += 1
                    else:
                        gap_count += 1

    # Write JSON
    out_json = REPORTS / "package_recipe_coverage.json"
    out_json.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")

    # Write Markdown
    lines = [
        "# Function Package Recipe Coverage",
        "",
        f"Total package dishes: {len(results)}",
        f"Matched to a real recipe: {matched_count}",
        f"Genuine gaps (no recipe yet): {gap_count}",
        "",
        "## Gaps — dishes with no matching recipe",
        "",
        "| Event | Section | Course | Dish | Search terms |",
        "|---|---|---|---|---|",
    ]
    for r in results:
        if not r["matched"]:
            lines.append(f"| {r['event']} | {r['section']} | {r['course']} | {r['item_name']} | `{r['search']}` |")

    lines += [
        "",
        "## Matched — dishes with a real recipe",
        "",
        "| Event | Dish | Recipe |",
        "|---|---|---|",
    ]
    for r in results:
        if r["matched"]:
            lines.append(f"| {r['event']} | {r['item_name']} | `{r['recipe_id']}` — {r['recipe_name']} |")

    out_md = REPORTS / "package_recipe_coverage.md"
    out_md.write_text("\n".join(lines), encoding="utf-8")

    print(f"Total: {len(results)} | Matched: {matched_count} | Gaps: {gap_count}")
    print(f"Wrote {out_json}")
    print(f"Wrote {out_md}")

    print("\nGAPS:")
    for r in results:
        if not r["matched"]:
            print(f"  [{r['event']:12s} / {r['section'][:25]:25s}] {r['item_name']}")


if __name__ == "__main__":
    main()
