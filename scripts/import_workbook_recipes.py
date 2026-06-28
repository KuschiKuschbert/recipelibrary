#!/usr/bin/env python3
"""Import the 9 component recipes sourced from the Riviera Menu Builder workbook."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILTINS = ROOT / "riviera_data" / "builtins.json"

NEW_RECIPES = [
  {
    "id": "lemon-caper-tartare",
    "name": "Lemon Caper Tartare",
    "subtitle": "For fish sliders and calamari",
    "type": "Sauce / Base",
    "course": "Component",
    "protein": [],
    "diet": ["Gluten-Free"],
    "method": "No-Cook",
    "yield": "Approx. 1.5 kg — sufficient for 50 serves of fish slider / calamari garnish",
    "label": "Lemon Caper Tartare",
    "elements": ["Lemon Caper Tartare"],
    "ingredients": [
      {"qty": "1 kg",   "item": "Kewpie Mayo"},
      {"qty": "300 g",  "item": "Sweet Mustard Pickles",  "prep": "roughly chopped"},
      {"qty": "200 g",  "item": "Baby Capers",            "prep": "drained, roughly chopped"},
      {"qty": "2",      "item": "Lemons",                 "prep": "zest and juice"},
      {"qty": "1 pkt",  "item": "Fresh Dill",             "prep": "fronds picked and chopped"},
      {"qty": "0.5 pkt","item": "Flat Leaf Parsley",      "prep": "finely chopped"},
      {"qty": "10 g",   "item": "Table Salt"},
      {"qty": "5 g",    "item": "Ground Black Pepper"}
    ],
    "method_steps": [
      "Drain and roughly chop Sweet Mustard Pickles and Baby Capers. Pick and finely chop Fresh Dill and Flat Leaf Parsley.",
      "Combine Kewpie Mayo, chopped pickles, capers, dill and parsley in a mixing bowl. Mix well.",
      "Add lemon zest and juice. Season with Table Salt and Ground Black Pepper. Mix thoroughly.",
      "Taste and adjust seasoning — tartare should be tangy, creamy and fresh.",
      "Transfer to a sealed container. Label and refrigerate. Holds 5 days under refrigeration."
    ],
    "service": [
      "Serve cold directly from refrigerator.",
      "For fish sliders: pipe or spoon 20–25 g onto the base of each bun before assembling.",
      "For calamari: serve as a dipping ramekin (30–40 ml) alongside the calamari plate."
    ],
    "note": "Source: Riviera Menu Builder workbook / Toppers tab. Used for fish sliders and calamari. Keep refrigerated; do not freeze."
  },
  {
    "id": "tarragon-cream-sauce",
    "name": "Tarragon Cream Sauce",
    "subtitle": "Rich velouté-style sauce for chicken and plated mains",
    "type": "Sauce / Base",
    "course": "Component",
    "protein": [],
    "diet": [],
    "method": "Sauté / Simmer",
    "yield": "Approx. 2.3–2.4 L — 35 portions @ 65 ml",
    "label": "Tarragon Cream Sauce",
    "elements": ["Tarragon Cream Sauce"],
    "ingredients": [
      {"qty": "250 g",   "item": "Butter Unsalted",          "prep": "cubed"},
      {"qty": "12",      "item": "Shallots",                  "prep": "finely diced"},
      {"qty": "50 g",    "item": "Rice Flour (Fine)"},
      {"qty": "45 g",    "item": "Corn Flour Maize"},
      {"qty": "1 L",     "item": "Full Cream Milk"},
      {"qty": "1 L",     "item": "Water"},
      {"qty": "40 g",    "item": "Chicken Booster"},
      {"qty": "360 ml",  "item": "White Wine Cooking Wine"},
      {"qty": "1 pkt",   "item": "Tarragon",                 "prep": "leaves stripped, finely chopped"},
      {"qty": "650 ml",  "item": "Thickened Cream"},
      {"qty": "4",       "item": "Lemons",                   "prep": "juice only"},
      {"qty": "3 g",     "item": "Ground Black Pepper"},
      {"qty": "5 g",     "item": "Table Salt"}
    ],
    "method_steps": [
      "Melt butter in a heavy-based saucepan over medium heat. Add finely diced shallots and sweat without colouring for 5–6 minutes until soft and translucent.",
      "Add white wine and reduce by two-thirds, approximately 4–5 minutes.",
      "Whisk rice flour and corn flour together with a small amount of cold water to form a slurry. Set aside.",
      "Add full cream milk, water and chicken booster to the pan. Bring to a gentle simmer, stirring.",
      "Whisk in the flour slurry gradually, stirring constantly to prevent lumps. Simmer over low heat for 8–10 minutes until the sauce thickens and no raw flour taste remains.",
      "Stir in thickened cream. Return to a gentle simmer for 3–4 minutes.",
      "Add lemon juice, chopped tarragon, salt and pepper. Taste and adjust seasoning.",
      "Pass through a fine sieve if a smooth result is needed. Transfer to a hotel pan, cover surface with cling film and refrigerate."
    ],
    "service": [
      "Reheat gently over low heat or in a bain marie, stirring regularly. Do not boil once cream has been added.",
      "Serve at 75°C. Portion 60–70 ml per plate for plated chicken mains.",
      "Holds 3 days under refrigeration. Do not freeze."
    ],
    "note": "Source: Riviera Menu Builder workbook / Toppers tab. LOCKED HOUSE SOP per Recipe Migration Ledger. Use for Prosciutto Wrapped Chicken Breast and other plated chicken mains."
  },
  {
    "id": "butterscotch-toffee-sauce",
    "name": "Butterscotch Toffee Sauce",
    "subtitle": "For sticky date madeleines and desserts",
    "type": "Sauce / Base",
    "course": "Component",
    "protein": [],
    "diet": ["Gluten-Free", "Vegetarian"],
    "method": "Simmer",
    "yield": "Approx. 1 kg — 40–50 dessert serves at 20–25 g per serve",
    "label": "Butterscotch Sauce",
    "elements": ["Butterscotch Toffee Sauce"],
    "ingredients": [
      {"qty": "500 g",  "item": "Brown Sugar"},
      {"qty": "250 g",  "item": "Butter Unsalted",   "prep": "cubed"},
      {"qty": "500 ml", "item": "Thickened Cream"},
      {"qty": "20 g",   "item": "Vanilla Sugar"},
      {"qty": "6 g",    "item": "Table Salt"}
    ],
    "method_steps": [
      "Combine brown sugar and butter in a heavy-based saucepan over medium heat. Stir constantly until the butter melts and the sugar dissolves — do not allow to burn.",
      "Once sugar is fully dissolved and mixture is bubbling, cook a further 2–3 minutes stirring constantly until slightly deepened in colour (light toffee colour).",
      "Carefully add thickened cream — mixture will spit. Stir well to combine.",
      "Add vanilla sugar and salt. Bring back to a simmer and cook 3–4 minutes until smooth, glossy and coating the back of a spoon.",
      "Remove from heat. Cool slightly. Transfer to a labelled container. Refrigerate."
    ],
    "service": [
      "Reheat gently in a small saucepan over low heat or in a bain marie, stirring. Do not boil.",
      "For madeleines: pour 25 ml warm sauce into the base of the serving dish before placing the warm madeleine on top.",
      "For dessert buffet: serve in a warm sauce pot with a ladle — refresh every 20 minutes."
    ],
    "note": "Source: Riviera Menu Builder workbook / Desserts tab. Active dessert component for sticky date madeleines. Holds 10 days refrigerated."
  },
  {
    "id": "crispy-capers",
    "name": "Crispy Capers",
    "subtitle": "Fried baby capers for calamari, tartare and garnish",
    "type": "Component",
    "course": "Component",
    "protein": [],
    "diet": ["Gluten-Free", "Vegan"],
    "method": "Deep Fry",
    "yield": "500 g batch — approx. 200 garnish portions",
    "label": "Crispy Capers",
    "elements": ["Crispy Capers"],
    "ingredients": [
      {"qty": "500 g", "item": "Baby Capers", "prep": "drained well, patted completely dry on chux"}
    ],
    "method_steps": [
      "Drain baby capers thoroughly. Spread on a chux-lined tray and pat completely dry — any moisture causes violent spitting when fried.",
      "Heat fryer oil to 190°C.",
      "Fry capers in small batches (2–3 tablespoons) for 60–90 seconds until golden and crisp. They will pop and spit — stand back and use a splatter guard.",
      "Remove with a spider or slotted spoon. Drain on a fresh chux-lined tray.",
      "Cool completely before storing. Do not cover while hot."
    ],
    "service": [
      "Serve at room temperature, sprinkled over calamari fritti, fish dishes or salads.",
      "Best used same day — capers lose crunch after a few hours.",
      "Store uncovered at room temperature for up to 4 hours only."
    ],
    "note": "Source: Riviera Menu Builder workbook / Toppers tab. Critical component for Calamari Fritti garnish. Must be completely dry before frying."
  },
  {
    "id": "house-focaccia",
    "name": "House Focaccia",
    "subtitle": "Table bread for plated functions",
    "type": "Bakery",
    "course": "Bread",
    "protein": [],
    "diet": ["Vegan"],
    "method": "Bake",
    "yield": "Approx. 40 serves — makes 4.6 kg dough / 3–4 large tray focaccias",
    "label": "Focaccia",
    "elements": ["Focaccia Portions"],
    "ingredients": [
      {"qty": "2.55 kg",  "item": "Pizza Flour"},
      {"qty": "1.95 L",   "item": "Water",        "prep": "warm (35–40°C)"},
      {"qty": "15 g",     "item": "Dry Yeast"},
      {"qty": "50 g",     "item": "Table Salt"},
      {"qty": "50 ml",    "item": "Tuscan Oil",   "prep": "plus extra for drizzling"},
      {"qty": "21 ml",    "item": "Pure Honey"}
    ],
    "method_steps": [
      "Dissolve dry yeast in warm water with honey. Stand 5 minutes until frothy.",
      "Combine pizza flour and salt in a large mixing bowl or commercial mixer. Add yeast mixture and Tuscan Oil. Mix on low speed until a shaggy dough forms, then on medium for 8–10 minutes until smooth and elastic.",
      "Transfer to an oiled container. Cover and prove at room temperature for 60–90 minutes until doubled.",
      "Generously oil two deep oven trays (approximately 60 × 40 cm each). Divide dough equally and press out to fill each tray. Dimple aggressively with fingers all over the surface.",
      "Cover loosely and prove a further 45–60 minutes until puffy and jiggly.",
      "Before baking, drizzle generously with Tuscan Oil and season with flaked salt. Press in red grapes or rosemary for the house version.",
      "Bake at 220°C (conventional) for 20–25 minutes until deep golden brown and the base sounds hollow when tapped. Cool on a rack."
    ],
    "service": [
      "Cut into portions approximately 6–8 cm × 4–5 cm.",
      "Serve warm or at room temperature — reheat at 180°C for 5 minutes if pre-baked.",
      "For function bread service: basket-lined portions on the table before the entrée.",
      "Bread must be fresh same day — do not hold overnight once cut."
    ],
    "note": "Source: Riviera Menu Builder workbook / Breads tab. LOCKED HOUSE SOP per Recipe Migration Ledger. Primary bread for table service at plated functions."
  },
  {
    "id": "burnt-butter-mash",
    "name": "Burnt Butter Mash",
    "subtitle": "Rich potato mash for plated mains and buffet",
    "type": "Side",
    "course": "Side",
    "protein": [],
    "diet": ["Gluten-Free", "Vegetarian"],
    "method": "Simmer",
    "yield": "35 serves @ approx. 170–180 g per serve",
    "label": "Burnt Butter Mash",
    "elements": ["Burnt Butter Mash"],
    "ingredients": [
      {"qty": "784 g",   "item": "Instant Mash",         "prep": "potato flakes"},
      {"qty": "3.53 L",  "item": "Water",                "prep": "boiling"},
      {"qty": "1.57 L",  "item": "Thickened Cream",      "prep": "heated"},
      {"qty": "1.12 kg", "item": "Butter Unsalted",      "prep": "cubed"},
      {"qty": "1 pkt",   "item": "Thyme",                "prep": "leaves stripped"},
      {"qty": "25 g",    "item": "Table Salt"},
      {"qty": "5 g",     "item": "Ground Black Pepper"}
    ],
    "method_steps": [
      "Combine boiling water and hot thickened cream in a large bowl. Add potato flakes and mix well until absorbed and lump-free. Cover and rest 2 minutes.",
      "In a heavy-based saucepan, melt butter over medium-high heat. Cook until the milk solids turn golden brown and smell nutty (beurre noisette stage), approximately 4–5 minutes. Watch closely and remove from heat immediately.",
      "Pour the browned butter over the mash — include the brown solids. Add thyme leaves, salt and pepper. Mix vigorously until smooth and silky.",
      "Taste and adjust seasoning. Mash should be rich, creamy and well-seasoned.",
      "Transfer to a deep hotel pan. Cover surface directly with cling film to prevent a skin. Hold in a bain marie at 75°C, or refrigerate and reheat."
    ],
    "service": [
      "Serve in a bain marie at 75°C or pipe/quenelle per plate.",
      "For plated: portion 150–180 g per plate using a piping bag or large spoon.",
      "For buffet: serve from hotel pan. Stir every 20 minutes and top with a small knob of butter.",
      "Holds 4 days refrigerated. Reheat gently with a splash of cream, stirring constantly."
    ],
    "note": "Source: Riviera Menu Builder workbook / Sides tab. LOCKED HOUSE SOP per Recipe Migration Ledger. Uses instant mash for speed and consistency at volume."
  },
  {
    "id": "cannoli-pistachio-filling",
    "name": "Cannoli Pistachio Filling",
    "subtitle": "White chocolate & pistachio — for roving cannoli service",
    "type": "Component",
    "course": "Component",
    "protein": [],
    "diet": ["Gluten-Free", "Vegetarian"],
    "method": "No-Cook / Mix",
    "yield": "Approx. 1 kg filling — sufficient for 80–100 filled cannoli",
    "label": "Pistachio Cannoli Filling",
    "elements": ["Pistachio Cannoli Filling"],
    "ingredients": [
      {"qty": "500 g",    "item": "Ricotta",            "prep": "drained overnight if wet"},
      {"qty": "300 g",    "item": "Mascarpone 1Kg"},
      {"qty": "120 g",    "item": "Pistachio Spread 200G"},
      {"qty": "70 g",     "item": "Icing Sugar",        "prep": "sifted"},
      {"qty": "30 g",     "item": "Pistachios Kernels", "prep": "roughly chopped"},
      {"qty": "0.5",      "item": "Lemons",             "prep": "zest only"},
      {"qty": "2 g",      "item": "Table Salt"}
    ],
    "method_steps": [
      "If ricotta is wet, drain in a fine sieve lined with muslin in the refrigerator for a minimum 4 hours or overnight. Wet ricotta will make filling too loose.",
      "Beat mascarpone briefly until smooth. Add drained ricotta and mix on medium speed until well combined and lump-free.",
      "Add pistachio spread and sifted icing sugar. Mix until fully incorporated and filling is smooth and thick.",
      "Fold in chopped pistachios and lemon zest. Add salt. Taste and adjust sweetness.",
      "Transfer to a piping bag fitted with a round tip. Refrigerate until service — filling must be cold before filling shells."
    ],
    "service": [
      "Fill cannoli shells immediately before service — filled shells soften within 20–30 minutes.",
      "For roving service: keep filling in chilled piping bags and fill on request or in small batches.",
      "Garnish filled end with crushed pistachios or a dusting of icing sugar.",
      "Filling holds 3 days refrigerated in sealed piping bag."
    ],
    "note": "Source: Riviera Menu Builder workbook / Desserts tab. One of two roving cannoli filling flavours. Fill only within 15 minutes of service."
  },
  {
    "id": "cannoli-coffee-nutella-filling",
    "name": "Cannoli Coffee-Nutella Filling",
    "subtitle": "Espresso & Nutella — for roving cannoli service",
    "type": "Component",
    "course": "Component",
    "protein": [],
    "diet": ["Gluten-Free", "Vegetarian"],
    "method": "No-Cook / Mix",
    "yield": "Approx. 1 kg filling — sufficient for 80–100 filled cannoli",
    "label": "Coffee-Nutella Cannoli Filling",
    "elements": ["Coffee-Nutella Cannoli Filling"],
    "ingredients": [
      {"qty": "500 g",   "item": "Ricotta",              "prep": "drained overnight if wet"},
      {"qty": "300 g",   "item": "Mascarpone 1Kg"},
      {"qty": "160 g",   "item": "Nutella"},
      {"qty": "40 g",    "item": "Icing Sugar",          "prep": "sifted"},
      {"qty": "8 g",     "item": "Freeze Dried Coffee",  "prep": "dissolved in 10 ml warm water"},
      {"qty": "80 ml",   "item": "Thickened Cream",      "prep": "lightly whipped"},
      {"qty": "2 g",     "item": "Table Salt"}
    ],
    "method_steps": [
      "Drain ricotta in a fine sieve for a minimum 4 hours or overnight if wet.",
      "Beat mascarpone until smooth. Add ricotta and mix until lump-free.",
      "Dissolve freeze-dried coffee in 10 ml of warm water to form a concentrated espresso paste.",
      "Add Nutella, coffee paste and sifted icing sugar. Mix on medium until fully incorporated and glossy.",
      "Fold in lightly whipped thickened cream to lighten the texture. Add salt. Taste.",
      "Transfer to a piping bag. Refrigerate until service."
    ],
    "service": [
      "Fill cannoli immediately before service — same rule as pistachio filling.",
      "For roving service: alternate between pistachio and coffee-Nutella flavours on each tray.",
      "Garnish with a dusting of cocoa powder or coffee sugar on the filled ends.",
      "Holds 3 days refrigerated."
    ],
    "note": "Source: Riviera Menu Builder workbook / Desserts tab. Second roving cannoli filling. Pairs with the Pistachio filling for the duo roving dessert service."
  },
  {
    "id": "benedictine-caramel-custard",
    "name": "Benedictine Caramel Custard",
    "subtitle": "Pipeable dessert component for plated service",
    "type": "Dessert",
    "course": "Dessert",
    "protein": [],
    "diet": ["Gluten-Free", "Vegetarian"],
    "method": "Simmer / Set",
    "yield": "35 plated dessert serves — approx. 1.2–1.4 L finished custard",
    "label": "Caramel Custard",
    "elements": ["Benedictine Caramel Custard"],
    "ingredients": [
      {"qty": "300 g",  "item": "Caster Sugar"},
      {"qty": "60 ml",  "item": "Water"},
      {"qty": "1 L",    "item": "Full Cream Milk",        "prep": "warmed"},
      {"qty": "90 ml",  "item": "Benedictine Liqueur"},
      {"qty": "140 g",  "item": "Custard Powder"},
      {"qty": "100 g",  "item": "Butter Unsalted",        "prep": "cubed, cold"}
    ],
    "method_steps": [
      "Dissolve custard powder in a small amount of cold milk to form a smooth slurry. Set aside.",
      "Combine caster sugar and water in a heavy-based saucepan. Cook over medium-high heat without stirring until deep amber (approx. 175°C). Brush down any sugar crystals on the sides with a wet pastry brush.",
      "Carefully add the warmed milk to the caramel — mixture will spit. Stir constantly until the caramel dissolves fully into the milk.",
      "Add Benedictine Liqueur. Return to medium heat.",
      "Whisk the custard powder slurry in and stir continuously until the mixture thickens to a pipeable custard consistency, approximately 5–7 minutes.",
      "Remove from heat. Add cold butter pieces and stir until fully melted and incorporated.",
      "Cool slightly. Transfer to a piping bag or container. Press cling film directly on the surface. Refrigerate."
    ],
    "service": [
      "Use cold directly from the piping bag — custard holds its shape well when chilled.",
      "Pipe a pool or quenelle onto each dessert plate as a base or accent.",
      "Pairs with sticky date desserts, caramel-based sauces and pastry items.",
      "Holds 4 days refrigerated."
    ],
    "note": "Source: Riviera Menu Builder workbook / Desserts tab. ACTIVE WORKING SOP per Recipe Migration Ledger."
  }
]


def main():
    b = json.loads(BUILTINS.read_text(encoding="utf-8"))
    existing_ids = {r["id"] for r in b}

    added = []
    for recipe in NEW_RECIPES:
        if recipe["id"] not in existing_ids:
            b.append(recipe)
            added.append(recipe["id"])
            print(f"  Added: {recipe['id']}")
        else:
            print(f"  SKIP (exists): {recipe['id']}")

    BUILTINS.write_text(json.dumps(b, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nAdded {len(added)} recipes. Total builtins: {len(b)}")


if __name__ == "__main__":
    main()
