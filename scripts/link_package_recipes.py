#!/usr/bin/env python3
"""
Add recipeId fields to every item in function_packages.json that maps to a real builtin.
Writes the updated file in-place.

Usage: python3 scripts/link_package_recipes.py [--dry-run]
"""
from __future__ import annotations

import argparse, json, re
from pathlib import Path
from difflib import get_close_matches

ROOT = Path(__file__).resolve().parents[1]


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pkg_data = json.loads((ROOT / "riviera_data" / "function_packages.json").read_text(encoding="utf-8"))
    builtins = json.loads((ROOT / "riviera_data" / "builtins.json").read_text(encoding="utf-8"))
    aliases_data = json.loads((ROOT / "riviera_data" / "canonical_recipe_aliases.json").read_text(encoding="utf-8"))

    builtin_ids = {r["id"] for r in builtins}
    builtin_by_id = {r["id"]: r for r in builtins}

    # Build name/label slug → recipe id from builtins
    name_to_id: dict[str, str] = {}
    for r in builtins:
        for field in ("name", "label", "subtitle"):
            val = r.get(field, "")
            if val:
                name_to_id[slugify(val)] = r["id"]
        for el in r.get("elements", []):
            name_to_id[slugify(el)] = r["id"]
        name_to_id[slugify(r["id"].replace("-", " "))] = r["id"]

    # Add alias map
    for alias_block in aliases_data.get("canonical_recipes", {}).values():
        cid = alias_block.get("canonical_id", "")
        for alias in alias_block.get("aliases", []):
            name_to_id[slugify(alias)] = cid
    for redir_from, redir_to in aliases_data.get("recipe_id_redirects", {}).items():
        if isinstance(redir_to, dict):
            redir_to = redir_to.get("redirect_to", "")
        if redir_to in builtin_ids:
            name_to_id[slugify(redir_from)] = redir_to

    # Full keyword patterns (ordered — most specific first)
    PATTERNS: list[tuple[re.Pattern, str]] = [
        # Specific new recipes first
        (re.compile(r"cotoletta.*pinsa|pinsa.*chicken|crispy.*chicken.*bolognese.*mozzarella"), "cotoletta-pinsa"),
        (re.compile(r"maple.*pumpkin.*ravioli|pumpkin.*ravioli.*burnt.*butter"), "maple-pumpkin-ravioli-burnt-butter"),
        (re.compile(r"herb.*crust.*pork.*cutlet|pork.*cutlet.*cider.*mustard"), "herb-crusted-pork-cutlet-cider-mustard"),
        (re.compile(r"thyme.*garlic.*roast.*beef|roast.*beef.*thyme.*garlic|tempranillo.*gremolata|tender.*thyme.*garlic.*beef"), "roast-beef-thyme-garlic-carvery"),
        (re.compile(r"sous.*vide.*pork|pork.*loin.*apricot.*sage|apricot.*sage.*pork"), "sous-vide-pork-loin-apricot"),
        (re.compile(r"sicilian.*roast.*pork|citrus.*herb.*roast.*pork|roast.*pork.*apricot"), "sicilian-roast-pork-apricot"),
        (re.compile(r"lemon.*thyme.*garlic.*roast.*chicken|roast.*chicken.*lemon.*thyme"), "lemon-thyme-garlic-roast-chicken-carvery"),
        (re.compile(r"honey.*thyme.*roast.*carrot|roast.*carrot.*honey.*thyme|honey.*carrot.*pistachio"), "honey-thyme-roasted-carrots-pistachio"),
        (re.compile(r"mediterranean.*rice.*pilaf|saffron.*rice|rice.*pilaf"), "mediterranean-rice-pilaf"),
        (re.compile(r"roast.*root.*veg.*cinnamon|root.*veg.*maple|cinnamon.*maple.*nut.*veg"), "roast-root-veg-salad-cinnamon-maple"),
        (re.compile(r"roast.*pumpkin.*pepita|pumpkin.*pepita.*balsamic"), "roast-pumpkin-pepita-salad-balsamic"),
        (re.compile(r"roquette.*parmesan|rocket.*parmesan.*balsamic"), "roquette-parmesan-salad"),
        (re.compile(r"french.*green.*bean|green.*bean.*shallot.*mustard"), "french-green-beans-shallots-mustard"),
        (re.compile(r"greek.*green.*bean|green.*bean.*feta.*tomato.*olive"), "greek-green-bean-salad"),
        (re.compile(r"caesar.*salad|cos.*egg.*bacon.*parmesan.*caesar"), "caesar-salad-buffet"),
        (re.compile(r"creamy.*potato.*bake|potato.*bake.*cream"), "creamy-potato-bake"),
        (re.compile(r"garlic.*lemon.*potato|herbed.*fries.*garlic.*lemon|lemon.*potato.*garlic"), "garlic-lemon-potatoes"),
        (re.compile(r"dinner.*roll|bread.*roll.*butter"), "dinner-rolls-butter"),
        (re.compile(r"pork.*italian.*herb.*sausage|italian.*pork.*sausage"), "pork-italian-herb-sausages"),
        (re.compile(r"house.*baked.*muffin|seasonal.*muffin"), "house-baked-muffins"),
        (re.compile(r"house.*baked.*sausage.*roll|gourmet.*beef.*sausage.*roll|gourmet.*sausage.*roll"), "house-baked-sausage-rolls"),
        (re.compile(r"flaky.*beef.*party.*pie|beef.*party.*pie|gourmet.*party.*pie|mini.*beef.*party.*pie"), "beef-party-pies"),
        (re.compile(r"mini.*quiche|quiche.*beetroot|quiche.*house.*relish"), "mini-quiches-beetroot-balsamic"),
        (re.compile(r"beef.*cheeseburger.*slider|classic.*beef.*slider"), "beef-cheeseburger-sliders"),
        (re.compile(r"gourmet.*pizza.*scroll|pizza.*scroll.*pesto|pizza.*scroll.*bocconcini|pizza.*scroll.*casalingo"), "gourmet-pizza-scrolls"),
        (re.compile(r"gourmet.*brioche.*slider|brioche.*slider.*platter"), "gourmet-brioche-sliders"),
        (re.compile(r"chilli.*prawn.*chorizo.*casarecce|prawn.*chorizo.*pasta"), "chilli-prawn-chorizo-casarecce"),
        (re.compile(r"souvlaki.*bread|fluffy.*souvlaki|pita.*tabouli.*tzatziki|gyros.*assembly"), "souvlaki-gyros-assembly"),
        (re.compile(r"spiced.*lamb.*kofta.*offsite|lamb.*kofta.*gyros"), "spiced-lamb-kofta-offsite"),
        (re.compile(r"grilled.*halloumi.*plain|grilled.*halloumi(?!.*hot.*honey)(?!.*grape)"), "grilled-halloumi-plain"),
        (re.compile(r"ribbon.*sandwich|assorted.*ribbon.*sandwich"), "ribbon-sandwiches"),
        (re.compile(r"sweet.*petit.*four|petit.*four.*assorted|delicate.*bite.*sized.*treat"), "sweet-petit-fours"),
        (re.compile(r"spinach.*feta.*pastizzi.*warm|spinach.*feta.*pastizz"), "spinach-feta-pastizzi-warm"),
        (re.compile(r"fruit.*salad.*yoghurt|yoghurt.*fruit|fruit.*salad.*corporate"), "fruit-salad-yoghurt"),
        (re.compile(r"dessert.*graz.*table|dessert.*graz.*assembly|decadent.*cake.*dessert.*graz"), "dessert-grazing-table-assembly"),
        (re.compile(r"roving.*tiramisu.*cup|tiramisu.*cup.*espresso|individual.*tiramisu"), "roving-tiramisu-cups"),
        (re.compile(r"selection.*sweets.*cake|assorted.*sweet.*cake|assorted.*cake"), "platter-sweet-slices-cakes"),
        (re.compile(r"fresh.*fruit(?!.*salad.*yoghurt)|locally.*sourced.*fresh.*fruit|seasonal.*fresh.*fruit"), "platter-sweet-slices-cakes"),
        (re.compile(r"artisan.*chocolate|handcrafted.*slice|petite.*pastry"), "platter-sweet-slices-cakes"),
        (re.compile(r"decadent.*cake"), "dessert-grazing-table-assembly"),
        (re.compile(r"signature.*mocktail|mocktail.*baby.*shower"), "roving-cannoli-tiramisu"),  # link to closest dessert
        (re.compile(r"unlimited.*tea.*coffee|tea.*coffee.*station"), "platter-scones-chantilly-jam"),  # pair with scones
        (re.compile(r"working.*lunch.*box|sandwich.*wrap.*sweet.*drink"), "corporate-mixed-sandwiches"),
        (re.compile(r"roast.*beef.*sliced.*caramelised.*onion|leg.*ham.*bone|ham.*off.*bone"), "platter-roast-beef-beetroot-relish"),
        (re.compile(r"mixed.*filled.*wrap(?!.*premium)|corporate.*wrap"), "platter-wraps-premium"),
        (re.compile(r"oyster.*bar.*fountain|shucked.*oyster"), "natural-oysters-champagne-mignonette"),
        # Existing recipes
        (re.compile(r"arancini"), "arancini"),
        (re.compile(r"calamari"), "calamari"),
        (re.compile(r"kilpatrick|oyster.*kil"), "oysters-kilpatrick"),
        (re.compile(r"polpette|meatball|albondigas"), "veal-meatballs"),
        (re.compile(r"chicken.*skewer|skewer.*chicken|limoncello.*chicken"), "chicken-skewer"),
        (re.compile(r"chorizo.*potat|crispy.*chorizo.*potat"), "chorizo-potatoes"),
        (re.compile(r"lamb.*cutlet|chargrilled.*lamb"), "lamb-cutlet"),
        (re.compile(r"fish.*slider|crispy.*reef.*fish"), "fish-slider"),
        (re.compile(r"beef.*kofta|kofta.*souvlak"), "beef-kofta"),
        (re.compile(r"camembert.*cigar|pecan.*cranberry.*cigar"), "camembert-cigars"),
        (re.compile(r"romesco"), "romesco"),
        (re.compile(r"lemon.*dill.*aioli"), "lemon-dill-aioli"),
        (re.compile(r"lemon.*thyme.*aioli"), "lemon-thyme-aioli"),
        (re.compile(r"whipped.*butter"), "whipped-butter"),
        (re.compile(r"labneh|tzatziki"), "labneh-tzatziki"),
        (re.compile(r"hot.*honey|honey.*hot|mild.*hot.*honey"), "mild-hot-honey"),
        (re.compile(r"kilpatrick.*sauce"), "kilpatrick-sauce-house"),
        (re.compile(r"charcuterie|grazing.*box"), "charcuterie-board-classic"),
        (re.compile(r"bruschetta.*roast.*beef|rare.*roast.*beef.*bruch"), "bruschetta-rare-roast-beef"),
        (re.compile(r"spanner.*crab.*cannoli"), "spanner-crab-cannoli"),
        (re.compile(r"prawn.*brioche.*slider"), "prawn-brioche-slider"),
        (re.compile(r"smoked.*chicken.*bacon.*brioche|chicken.*bacon.*slider|chicken.*bacon.*brioche"), "chicken-bacon-brioche-slider"),
        (re.compile(r"vintage.*beef.*slider|beef.*brioche.*slider"), "vintage-beef-brioche-slider"),
        (re.compile(r"lamb.*shoulder.*provenc"), "lamb-shoulder-provencale-composed"),
        (re.compile(r"beef.*bourguign"), "beef-bourguignon"),
        (re.compile(r"creamy.*lemon.*caper.*chicken|lemon.*caper.*chicken"), "creamy-lemon-caper-chicken"),
        (re.compile(r"champagne.*mignonette|natural.*oyster.*champ"), "natural-oysters-champagne-mignonette"),
        (re.compile(r"greek.*spiced.*roast.*lamb|greek.*roast.*lamb"), "greek-spiced-roast-lamb"),
        (re.compile(r"potato.*gratin|creamy.*potato.*gratin"), "creamy-potato-gratin"),
        (re.compile(r"chat.*potato.*feta|garlic.*herb.*chat"), "garlic-herb-chat-potatoes-feta"),
        (re.compile(r"broccoli.*cauliflower.*gratin"), "broccoli-cauliflower-gratin"),
        (re.compile(r"prosciutto.*chicken|chicken.*prosciutto"), "prosciutto-chicken-lemon-caper"),
        (re.compile(r"fillet.*beef.*tempranillo|beef.*fillet.*temp|tenderloin.*tempranillo"), "fillet-beef-tempranillo"),
        (re.compile(r"stuffed.*mushroom.*romesco|risotto.*mushroom"), "stuffed-mushroom-romesco"),
        (re.compile(r"cannoli.*tiramisu|roving.*cannoli|roving.*dessert"), "roving-cannoli-tiramisu"),
        (re.compile(r"house.*scone|scone.*platter"), "house-scones"),
        (re.compile(r"scone.*chantilly|chantilly.*scone"), "platter-scones-chantilly-jam"),
        (re.compile(r"ham.*cheese.*croissant"), "platter-ham-cheese-croissants"),
        (re.compile(r"sandwich.*platter|mixed.*sandwich"), "platter-sandwiches-standard"),
        (re.compile(r"wrap.*platter|premium.*filled.*wrap"), "platter-wraps-premium"),
        (re.compile(r"filled.*brioche.*roll"), "platter-filled-brioche-rolls"),
        (re.compile(r"roast.*beef.*beetroot.*balsamic"), "platter-roast-beef-beetroot-relish"),
        (re.compile(r"dietary.*graz|gf.*graz"), "platter-dietary-grazing"),
        (re.compile(r"savoury.*filled.*croissant|savoury.*croissant"), "corporate-savoury-croissants"),
        (re.compile(r"sweet.*filled.*croissant|sweet.*croissant"), "corporate-sweet-croissants"),
        (re.compile(r"bircher.*muesli"), "corporate-bircher-muesli-bowls"),
        (re.compile(r"caesar.*salad.*bowl|chicken.*caesar.*bowl"), "corporate-chicken-caesar-bowl"),
        (re.compile(r"lamb.*fattoush"), "corporate-lamb-fattoush-bowl"),
        (re.compile(r"mediterranean.*chicken.*bowl|moroccan.*chicken.*bowl"), "corporate-mediterranean-chicken-bowl"),
        (re.compile(r"beef.*lasagne|lasagne.*side.*salad"), "corporate-beef-lasagne-side-salad"),
        (re.compile(r"breakfast.*wrap"), "corporate-breakfast-wraps"),
        (re.compile(r"gourmet.*filled.*cookie"), "corporate-gourmet-filled-cookies"),
        (re.compile(r"mixed.*filled.*sandwich"), "corporate-mixed-sandwiches"),
        (re.compile(r"roasted.*veg.*salad.*bowl|moroccan.*veg.*medley"), "corporate-roast-veg-salad-bowl"),
        (re.compile(r"chilli.*garlic.*prawn.*chorizo"), "chilli-garlic-prawns-chorizo-rocket"),
        (re.compile(r"heirloom.*tomato.*bruschetta|goat.*cheese.*bruschetta"), "heirloom-tomato-bruschetta-goats-cheese"),
        (re.compile(r"greek.*pulled.*beef|slow.*cooked.*greek.*beef"), "greek-style-pulled-beef-buffet"),
        (re.compile(r"chargrilled.*lemon.*thyme.*chicken|lemon.*thyme.*chicken.*buffet"), "chargrilled-lemon-thyme-chicken-buffet"),
        (re.compile(r"duo.*cannoli|pistachio.*white.*choc.*cannoli"), "duo-cannoli-pistachio-white-chocolate"),
        (re.compile(r"strawberry.*ricotta.*cheesecake|ricotta.*cheesecake"), "strawberry-ricotta-cheesecake-plated"),
        (re.compile(r"riviera.*tiramisu|tiramisu.*hazelnut.*biscotti"), "riviera-tiramisu-biscotti-hazelnut"),
        (re.compile(r"kids.*snack|snack.*pack"), "kids-snack-pack"),
        (re.compile(r"kids.*spagh|spaghetti.*bolognese"), "kids-spaghetti-bolognese"),
        (re.compile(r"bacon.*egg.*muffin"), "corporate-bacon-egg-muffins"),
        (re.compile(r"bacon.*egg.*panini"), "corporate-bacon-egg-paninis"),
        (re.compile(r"waffles"), "corporate-waffles-breakfast"),
        (re.compile(r"pesto.*pasta.*salad|basil.*pesto.*pasta"), "corporate-pesto-pasta-salad"),
        (re.compile(r"moroccan.*cous|couscous.*moroccan"), "corporate-moroccan-couscous-salad"),
        (re.compile(r"pumpkin.*feta.*pepita"), "corporate-pumpkin-feta-pepita-salad"),
        (re.compile(r"garden.*salad|traditional.*garden"), "corporate-traditional-garden-salad"),
        (re.compile(r"potato.*bacon.*herb.*salad|creamy.*potato.*bacon"), "corporate-creamy-potato-bacon-herb-salad"),
        (re.compile(r"spinach.*ricotta.*pastizzi.*platter"), "funeral-spinach-ricotta-pastizzi-platter"),
        (re.compile(r"mixed.*hot.*nibble"), "funeral-mixed-hot-nibbles-box"),
        (re.compile(r"nibble.*platter|sausage.*roll.*party.*pie|party.*pie.*quiche"), "nibble-platter-40"),
        (re.compile(r"sweet.*slice.*cake|sweet.*platter"), "platter-sweet-slices-cakes"),
        (re.compile(r"lemon.*caper.*tartare|tartare.*caper"), "lemon-caper-tartare"),
        (re.compile(r"tarragon.*cream.*sauce"), "tarragon-cream-sauce"),
        (re.compile(r"butterscotch|toffee.*sauce"), "butterscotch-toffee-sauce"),
        (re.compile(r"crispy.*caper"), "crispy-capers"),
        (re.compile(r"focaccia|house.*focaccia"), "house-focaccia"),
        (re.compile(r"burnt.*butter.*mash"), "burnt-butter-mash"),
        (re.compile(r"pistachio.*cannoli.*fill"), "cannoli-pistachio-filling"),
        (re.compile(r"coffee.*nutella.*cannoli"), "cannoli-coffee-nutella-filling"),
        (re.compile(r"benedictine.*custard|caramel.*custard.*pip"), "benedictine-caramel-custard"),
        (re.compile(r"slow.*cooked.*beef.*albondigas"), "slow-cooked-beef-albondigas-buffet"),
        (re.compile(r"date.*madeleine|sticky.*date.*madeleine"), "date-madeleines"),
        (re.compile(r"flourless.*choc|chocolate.*torte"), "riviera-tiramisu-biscotti-hazelnut"),
        (re.compile(r"pavlova(?!.*pistachio)"), "strawberry-ricotta-cheesecake-plated"),
        (re.compile(r"chicken.*nugget.*chip|nugget.*chip|fish.*chip"), "kids-snack-pack"),
        (re.compile(r"tiger.*prawn|purely.*prawn"), "natural-oysters-champagne-mignonette"),
        (re.compile(r"banana.*bread"), "house-baked-muffins"),
        (re.compile(r"house.*baked.*banana"), "house-baked-muffins"),
    ]

    def resolve(name: str, search: str) -> str | None:
        combined = slugify(name + " " + search)
        # Name-to-id exact
        for key in (combined, slugify(name), slugify(search)):
            if key in name_to_id:
                cid = name_to_id[key]
                if cid in builtin_ids:
                    return cid
        # Keyword patterns
        for pattern, recipe_id in PATTERNS:
            if pattern.search(combined):
                if recipe_id in builtin_ids:
                    return recipe_id
        # Fuzzy
        close = get_close_matches(slugify(name), list(name_to_id.keys()), n=1, cutoff=0.82)
        if close:
            cid = name_to_id[close[0]]
            if cid in builtin_ids:
                return cid
        return None

    linked = 0
    unlinked = 0
    for pkg in pkg_data.get("packages", []):
        for section in pkg.get("sections", []):
            for course in section.get("courses", []):
                for item in course.get("items", []):
                    if item.get("recipeId"):
                        continue  # already linked
                    recipe_id = resolve(item.get("name", ""), item.get("search", ""))
                    if recipe_id:
                        item["recipeId"] = recipe_id
                        linked += 1
                    else:
                        unlinked += 1
                        print(f"  UNLINKED: {item.get('name', '')}")

    print(f"\nLinked: {linked} | Still unlinked: {unlinked}")

    if not args.dry_run:
        (ROOT / "riviera_data" / "function_packages.json").write_text(
            json.dumps(pkg_data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print("Wrote riviera_data/function_packages.json")


if __name__ == "__main__":
    main()
