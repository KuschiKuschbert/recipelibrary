#!/usr/bin/env python3
"""
Import remaining real Menu Builder dish cards into riviera_data/builtins.json.

Source: reports/reference_sheet_extract_full.json (Toppers / Italian Long Lunch / etc.)
Skips demo rows (kburger, beef thingamajigs) and broken workbook stubs (hot dogs, brownie).

Usage: python3 scripts/import_workbook_dish_gaps.py [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILTINS = ROOT / "riviera_data" / "builtins.json"

GAP_RECIPES: list[dict] = [
    {
        "id": "margherita-pizza",
        "name": "Margherita Pizza",
        "subtitle": "Classic · Parmi Sauce · Mozzarella · Basil",
        "type": "Main",
        "course": "Main",
        "protein": ["vegetarian"],
        "diet": ["Vegetarian"],
        "method": "Bake",
        "yield": "1 pizza · scale base batch for volume",
        "label": "Margherita Pizza",
        "elements": ["Pizza Base", "Parmi Sauce", "Mozzarella", "Basil"],
        "ingredients": [
            {"qty": "1", "item": "Pizza Base 10 Classic"},
            {"qty": "160 g", "item": "Parmi Sauce"},
            {"qty": "240 g", "item": "Shredded Mozzarella"},
            {"qty": "0.25 pkt", "item": "Thai Basil", "prep": "leaves picked"},
        ],
        "method_steps": [
            "Spread Parmi Sauce evenly over pizza base to within 1 cm of the edge.",
            "Scatter shredded mozzarella evenly — do not overload the centre.",
            "Bake in pizza oven at 280–320°C until base is crisp and cheese is bubbling with light colour — approximately 6–8 minutes depending on oven.",
            "Remove from oven. Rest 1 minute. Tear basil leaves and scatter over the top. Serve immediately.",
        ],
        "service": [
            "Cut into 6 wedges for individual serve or 8 for shared table.",
            "For function pizza scrolls or mixed pizza platters, hold completed bases briefly at pass only — do not stack hot pizzas.",
        ],
        "note": "Source: Riviera Menu Builder / Pizzas tab (Margareta). Workbook lists Thai basil — use sweet basil if Thai basil unavailable.",
    },
    {
        "id": "pumpkin-soup",
        "name": "Pumpkin Soup",
        "subtitle": "Roasted Pumpkin · Leek · Veg Stock",
        "type": "Starter",
        "course": "Starter",
        "protein": ["vegetarian"],
        "diet": ["Gluten-Free", "Vegetarian"],
        "method": "Simmer / Blend",
        "yield": "Approx. 4–5 L — 20–25 serves @ 200 ml",
        "label": "Pumpkin Soup",
        "elements": ["Pumpkin Soup Base"],
        "ingredients": [
            {"qty": "200 g", "item": "Pumpkin", "prep": "peeled, diced"},
            {"qty": "0.16 pc", "item": "Leeks", "prep": "white part only, sliced"},
            {"qty": "20 g", "item": "Brown Onions", "prep": "diced"},
            {"qty": "10 g", "item": "Garlic", "prep": "crushed"},
            {"qty": "6 g", "item": "Table Salt"},
            {"qty": "4 g", "item": "Ground Black Pepper"},
            {"qty": "10 g", "item": "Gourmet Veggie Stock Powder"},
            {"qty": "100 ml", "item": "Water", "prep": "per workbook portion line — scale batch for volume"},
        ],
        "method_steps": [
            "Sweat leek, onion and garlic in a little oil without colour until soft.",
            "Add pumpkin and stock powder dissolved in water. Simmer until pumpkin is completely tender.",
            "Blend until smooth. Season with salt and pepper. Adjust consistency with water or cream if required.",
            "Hold hot at 75°C for service or chill rapidly for reheat.",
        ],
        "service": [
            "Serve 200 ml per bowl. Garnish with pepitas, cream swirl or sourdough croutons if offered on the menu.",
            "Do not hold more than 90 minutes in bain marie — refresh surface with a stir every 20 minutes.",
        ],
        "note": "Source: Riviera Menu Builder / Breads tab. Workbook card is a single-portion costing sheet — scale ingredients proportionally for batch production.",
    },
    {
        "id": "stuffed-squid",
        "name": "Stuffed Squid",
        "subtitle": "Prosciutto · Guanciale · Baby Octopus · Pecorino",
        "type": "Main",
        "course": "Main",
        "protein": ["seafood"],
        "diet": [],
        "method": "Roast / Grill",
        "yield": "1 serve — scale for Italian Long Lunch covers",
        "label": "Stuffed Squid",
        "elements": ["Stuffed Squid Tube", "Lemon Zest", "Herbs"],
        "ingredients": [
            {"qty": "100 g", "item": "Squid Tubes U/10"},
            {"qty": "20 g", "item": "Prosciutto Sliced", "prep": "fine dice"},
            {"qty": "15 g", "item": "Guanciale", "prep": "fine dice"},
            {"qty": "40 g", "item": "Baby Octopus", "prep": "cleaned, chopped"},
            {"qty": "15 g", "item": "Olives", "prep": "chopped"},
            {"qty": "20 g", "item": "Garlic", "prep": "minced"},
            {"qty": "5 g", "item": "Lemon Zest Extra"},
            {"qty": "0.25 pkt", "item": "Flat Leaf Parsley", "prep": "chopped"},
            {"qty": "5 g", "item": "Pecorino", "prep": "grated"},
        ],
        "method_steps": [
            "Combine prosciutto, guanciale, octopus, olives, garlic, lemon zest, parsley and pecorino for the stuffing.",
            "Fill squid tubes loosely — do not overpack or tubes will burst during cooking.",
            "Secure open end with a toothpick if needed.",
            "Char on a hot grill or roast at 200°C until squid is just opaque and stuffing is hot through — approximately 8–10 minutes.",
            "Rest 2 minutes. Slice on the bias. Finish with extra lemon zest and parsley.",
        ],
        "service": [
            "Plate immediately — squid toughens quickly on hold.",
            "Italian Long Lunch format: 1 stuffed squid serve per cover unless menu specifies shared.",
        ],
        "note": "Source: Riviera Menu Builder / Italian Long Lunch tab.",
    },
    {
        "id": "cannelloni-ricotta-spinach",
        "name": "Cannelloni Ricotta & Spinach",
        "subtitle": "Béchamel · Pecorino · Basil",
        "type": "Main",
        "course": "Main",
        "protein": ["vegetarian"],
        "diet": ["Vegetarian"],
        "method": "Bake",
        "yield": "2 shells per serve — scale batch for covers",
        "label": "Cannelloni",
        "elements": ["Cannelloni", "Ricotta Filling", "Béchamel"],
        "ingredients": [
            {"qty": "2", "item": "Cannelloni Shells"},
            {"qty": "60 g", "item": "Ricotta"},
            {"qty": "60 g", "item": "Pecorino", "prep": "grated"},
            {"qty": "30 g", "item": "Spinach", "prep": "wilted, squeezed dry, chopped"},
            {"qty": "50 g", "item": "Pizza Flour"},
            {"qty": "50 g", "item": "Butter Unsalted"},
            {"qty": "100 ml", "item": "Full Cream Milk"},
            {"qty": "0.0125 pkt", "item": "Basil Fresh", "prep": "chopped"},
        ],
        "method_steps": [
            "Mix ricotta, half the pecorino, spinach and basil for the filling. Season.",
            "Pipe or spoon filling into cannelloni shells.",
            "Make a quick béchamel: melt butter, whisk in flour, cook 1 minute, whisk in milk until smooth. Season.",
            "Lay filled cannelloni in a buttered baking dish. Cover with béchamel and remaining pecorino.",
            "Bake at 180°C until bubbling and golden — approximately 25–30 minutes.",
        ],
        "service": [
            "Rest 5 minutes before portioning. Serve 2 cannelloni per guest for Italian Long Lunch.",
            "Hold covered in bain marie no more than 20 minutes after baking.",
        ],
        "note": "Source: Riviera Menu Builder / Italian Long Lunch tab.",
    },
    {
        "id": "porchetta-salsa-verde",
        "name": "Porchetta with Salsa Verde",
        "subtitle": "Rolled Belly & Fillet · Herb Salt · Salsa Verde",
        "type": "Main",
        "course": "Main",
        "protein": ["pork"],
        "diet": [],
        "method": "Roast",
        "yield": "Approx. 12 kg rolled porchetta — 40–50 serves",
        "label": "Porchetta",
        "elements": ["Porchetta Roll", "Salsa Verde", "Crackle"],
        "ingredients": [
            {"qty": "4 kg", "item": "Pork Belly", "prep": "skin on, butterflied"},
            {"qty": "8 kg", "item": "Pork Fillet", "prep": "trimmed"},
            {"qty": "300 g", "item": "Garlic", "prep": "minced"},
            {"qty": "100 g", "item": "Rosemary Leaves", "prep": "chopped"},
            {"qty": "200 g", "item": "Oregano", "prep": "dried"},
            {"qty": "80 g", "item": "Sage", "prep": "chopped"},
            {"qty": "8 pkt", "item": "Flat Leaf Parsley", "prep": "for salsa verde"},
            {"qty": "2", "item": "Lemon Zest Extra"},
        ],
        "method_steps": [
            "Score pork belly skin deeply in a crosshatch. Dry skin thoroughly overnight uncovered in coldroom if possible.",
            "Combine garlic, rosemary, oregano and sage with salt for the herb paste. Rub over fillet and inside belly.",
            "Lay fillet along belly and roll tightly. Tie at 3 cm intervals with butcher's twine.",
            "Roast low initially to render fat, then finish high to crackle skin — target 68°C internal at the loin.",
            "Rest minimum 20 minutes before carving.",
            "Prepare salsa verde with parsley, capers, anchovy, lemon and olive oil. Serve separately.",
        ],
        "service": [
            "Carve 150–180 g cooked pork per guest for Italian Long Lunch.",
            "Crackle skin served separately or on top — do not hold carved meat more than 15 minutes without jus.",
        ],
        "note": "Source: Riviera Menu Builder / Italian Long Lunch tab. Large-format batch recipe — confirm roll size with oven capacity before service.",
    },
    {
        "id": "cannellini-beans-pancetta-asparagus",
        "name": "Cannellini Beans with Pancetta & Asparagus",
        "subtitle": "Charred Asparagus · Lemon · Sage",
        "type": "Side",
        "course": "Side",
        "protein": ["pork"],
        "diet": ["Gluten-Free"],
        "method": "Braise / Grill",
        "yield": "Approx. 8–10 kg finished beans — 40 serves @ 200 g",
        "label": "Cannellini Beans",
        "elements": ["Cannellini Beans", "Pancetta", "Asparagus"],
        "ingredients": [
            {"qty": "6.5 kg", "item": "Cannellini Beans in Brine", "prep": "drained, rinsed"},
            {"qty": "2.2 kg", "item": "Pancetta", "prep": "diced"},
            {"qty": "20 pkt", "item": "Broccolini", "prep": "or asparagus — charred"},
            {"qty": "600 g", "item": "Garlic", "prep": "minced"},
            {"qty": "40", "item": "Lemons", "prep": "zest and juice"},
            {"qty": "110 g", "item": "Sage", "prep": "chopped"},
            {"qty": "100 ml", "item": "Tuscan Oil"},
            {"qty": "40 g", "item": "Table Salt"},
        ],
        "method_steps": [
            "Render pancetta until crisp. Remove half for garnish; leave fat in pan.",
            "Sweat garlic in pancetta fat. Add beans, sage and enough water to just cover. Simmer 20 minutes until creamy.",
            "Char broccolini or asparagus on grill. Fold through beans with lemon zest and juice. Season.",
            "Finish with remaining crisp pancetta and a drizzle of Tuscan oil.",
        ],
        "service": [
            "Serve 180–200 g per guest as Italian Long Lunch side.",
            "Hold in GN at 75°C; stir before service to refresh consistency.",
        ],
        "note": "Source: Riviera Menu Builder / Italian Long Lunch tab (workbook spelling: asparagud).",
    },
    {
        "id": "chicken-ballotine-stuffing",
        "name": "Chicken Ballotine Stuffing",
        "subtitle": "Mascarpone · Spinach · Prosciutto · Breadcrumb",
        "type": "Component",
        "course": "Component",
        "protein": ["chicken"],
        "diet": [],
        "method": "Mix / Fill",
        "yield": "Approx. 4.5 kg stuffing — 8–10 ballotines",
        "label": "Ballotine Stuffing",
        "elements": ["Ballotine Filling"],
        "ingredients": [
            {"qty": "1.12 kg", "item": "Chicken Thighs Fillets", "prep": "minced or finely diced"},
            {"qty": "560 g", "item": "Mascarpone"},
            {"qty": "1.65 kg", "item": "Spinach", "prep": "wilted, squeezed dry, chopped"},
            {"qty": "290 g", "item": "Sun Dried Tomato Halves", "prep": "drained, chopped"},
            {"qty": "290 g", "item": "Pitted Green Olives", "prep": "chopped"},
            {"qty": "290 g", "item": "Prosciutto Sliced", "prep": "fine dice"},
            {"qty": "320 g", "item": "Breadcrumbs GF"},
            {"qty": "16", "item": "Eggs"},
        ],
        "method_steps": [
            "Combine mascarpone, minced thigh, spinach, sun-dried tomato, olives, prosciutto and breadcrumbs.",
            "Beat eggs and fold through until mixture binds — should hold shape when squeezed.",
            "Season with salt and pepper. Chill until firm before filling ballotines.",
        ],
        "service": [
            "Use as filling for chicken ballotine mains — pipe or spoon into boned chicken maryland or breast.",
            "Hold filled raw ballotines refrigerated maximum 24 hours before cook.",
        ],
        "note": "Source: Riviera Menu Builder / Mains tab. Component only — ballotine cook method on separate plated main card.",
    },
    {
        "id": "rib-fillet-300",
        "name": "Rib Fillet 300 g",
        "subtitle": "Chargrilled · Chips · Side Salad",
        "type": "Main",
        "course": "Main",
        "protein": ["beef"],
        "diet": ["Gluten-Free"],
        "method": "Grill",
        "yield": "1 serve @ 300 g raw rib fillet",
        "label": "Rib Fillet 300",
        "elements": ["Rib Fillet", "Chips", "Side Salad"],
        "ingredients": [
            {"qty": "300 g", "item": "Rib Fillet"},
            {"qty": "160 g", "item": "Chip Stay Crisp", "prep": "cooked chips portion"},
            {"qty": "1", "item": "Side Salad", "prep": "dressed leaves — see roquette or garden salad standard"},
        ],
        "method_steps": [
            "Temper rib fillet 30 minutes at room temperature. Season generously with salt and cracked pepper.",
            "Chargrill over high heat to desired doneness — medium-rare target 52°C internal before rest.",
            "Rest minimum 8 minutes before serving.",
            "Serve with hot chips and side salad.",
        ],
        "service": [
            "Steaks + Grill menu format — plate at pass only, do not hold sliced beef in bain marie.",
            "Offer sauce optional — peppercorn or red wine jus if on function menu.",
        ],
        "note": "Source: Riviera Menu Builder / Steaks + Grill tab. Distinct from eye fillet main (fillet-beef-tempranillo).",
    },
    {
        "id": "oysters-florentine",
        "name": "Oysters Florentine",
        "subtitle": "Spinach · Blue Cheese · Cream",
        "type": "Starter",
        "course": "Starter",
        "protein": ["seafood"],
        "diet": [],
        "method": "Grill / Bake",
        "yield": "1 oyster per serve — scale for dozen orders",
        "label": "Oysters Florentine",
        "elements": ["Oyster", "Florentine Topping"],
        "ingredients": [
            {"qty": "1", "item": "Oysters", "prep": "shucked on half shell"},
            {"qty": "4 g", "item": "Spinach", "prep": "wilted, finely chopped, squeezed dry"},
            {"qty": "5 g", "item": "Blue Cheese", "prep": "crumbled"},
            {"qty": "2 ml", "item": "Cooking Cream"},
        ],
        "method_steps": [
            "Wilt spinach and squeeze completely dry. Mix with blue cheese and cream to a thick paste.",
            "Spoon a small amount of topping onto each oyster on the half shell.",
            "Grill under salamander until topping bubbles and oyster is just set — approximately 3–4 minutes.",
            "Serve immediately on rock salt or crushed ice.",
        ],
        "service": [
            "Best for immediate service — do not hold finished oysters more than 5 minutes.",
            "For functions, shuck and top to order or use a staffed oyster station.",
        ],
        "note": "Source: Riviera Menu Builder / Oysters tab.",
    },
    {
        "id": "poached-salmon",
        "name": "Poached Salmon",
        "subtitle": "125 g Fillet · Dill · Lemon",
        "type": "Main",
        "course": "Main",
        "protein": ["seafood"],
        "diet": ["Gluten-Free", "Dairy-Free"],
        "method": "Poach",
        "yield": "1 serve @ 125 g salmon fillet",
        "label": "Poached Salmon",
        "elements": ["Salmon Fillet", "Poaching Liquor", "Herbs"],
        "ingredients": [
            {"qty": "125 g", "item": "Salmon Fillets"},
            {"qty": "80 ml", "item": "Tuscan Oil"},
            {"qty": "12 g", "item": "Table Salt"},
            {"qty": "4 g", "item": "Cracked Black Pepper"},
            {"qty": "0.3 pkt", "item": "Fresh Dill"},
            {"qty": "4 g", "item": "Parsley", "prep": "dried"},
            {"qty": "1", "item": "Lemons", "prep": "juice and wedge"},
        ],
        "method_steps": [
            "Bring a shallow poaching pan of salted water to a gentle simmer with lemon, dill and parsley.",
            "Submerge salmon fillet. Poach at a bare simmer until just cooked — 6–8 minutes for 125 g piece.",
            "Remove carefully. Drain. Finish with a drizzle of Tuscan oil and lemon wedge.",
        ],
        "service": [
            "Plate with seasonal greens or asparagus if offered on the menu.",
            "Do not hold poached salmon hot more than 10 minutes — dries quickly.",
        ],
        "note": "Source: Riviera Menu Builder / Oysters tab (listed alongside oyster dishes on workbook sheet).",
    },
    {
        "id": "sweet-potato-topper",
        "name": "Sweet Potato Topper",
        "subtitle": "Roasted Sweet Potato · Function garnish",
        "type": "Component",
        "course": "Component",
        "protein": ["vegetarian"],
        "diet": ["Gluten-Free", "Vegetarian"],
        "method": "Roast",
        "yield": "150 g per topper portion",
        "label": "Sweet Potato Topper",
        "elements": ["Roasted Sweet Potato"],
        "ingredients": [
            {"qty": "150 g", "item": "Sweet Potato", "prep": "peeled, diced 2 cm"},
        ],
        "method_steps": [
            "Toss sweet potato with a little Tuscan oil, salt and pepper.",
            "Roast at 200°C until caramelised and tender — approximately 18–22 minutes.",
            "Hold hot for pass garnish or buffet topper use.",
        ],
        "service": [
            "Workbook Toppers tab — use as a plated garnish or side topper alongside proteins.",
            "Refresh every 20 minutes on buffet — sweet potato dries on open hold.",
        ],
        "note": "Source: Riviera Menu Builder / Toppers tab (the other topper).",
    },
    {
        "id": "white-bread-roll-dough",
        "name": "White Bread Roll Dough",
        "subtitle": "Not Sourdough · Dinner Roll Batch",
        "type": "Bakery",
        "course": "Component",
        "protein": ["vegetarian"],
        "diet": ["Vegetarian"],
        "method": "Bake",
        "yield": "775 g dough batch — approx. 8–10 rolls",
        "label": "White Bread Rolls",
        "elements": ["Roll Dough", "Baked Rolls"],
        "ingredients": [
            {"qty": "500 g", "item": "Pizza Flour"},
            {"qty": "7 g", "item": "Dry Yeast", "prep": "workbook lists 200 g — verify against house roll standard"},
            {"qty": "50 ml", "item": "Water"},
            {"qty": "25 ml", "item": "Tuscan Oil"},
        ],
        "method_steps": [
            "Combine flour, yeast, water and oil. Mix to a soft dough.",
            "Knead 8–10 minutes until smooth and elastic.",
            "Prove until doubled. Shape into rolls. Prove again.",
            "Bake at 200°C until golden and hollow-sounding — approximately 15–18 minutes.",
        ],
        "service": [
            "Use for hot dog rolls or dinner bread service where sourdough is not specified.",
            "Validate yeast quantity against house bakery standards before locking batch size.",
        ],
        "note": "Source: Riviera Menu Builder / Breads tab (not sourdough). Workbook yeast line likely needs kitchen verification.",
    },
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    recipes = json.loads(BUILTINS.read_text(encoding="utf-8"))
    existing = {r["id"] for r in recipes}
    added = []
    for recipe in GAP_RECIPES:
        if recipe["id"] in existing:
            print(f"Skip existing: {recipe['id']}")
            continue
        recipes.append(recipe)
        added.append(recipe["id"])
        print(f"Add: {recipe['id']} — {recipe['name']}")

    if not added:
        print("Nothing to add.")
        return

    if args.dry_run:
        print(f"Dry run — would add {len(added)} recipes.")
        return

    BUILTINS.write_text(json.dumps(recipes, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(recipes)} recipes to {BUILTINS}")


if __name__ == "__main__":
    main()
