#!/usr/bin/env python3
"""
Author all remaining gap recipes for the Riviera function package browser.
Grouped by category: carvery mains, sides/salads, platters, pasta/veg, gyros, events, desserts.
All recipes follow the builtins.json audit schema.

Usage: python3 scripts/author_gap_recipes.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILTINS = ROOT / "riviera_data" / "builtins.json"

# fmt: off
GAP_RECIPES = [

# ─────────────────────────────────────────────────────────────────────────────
# CARVERY / ROAST MAINS
# ─────────────────────────────────────────────────────────────────────────────
{
  "id": "roast-beef-thyme-garlic-carvery",
  "name": "Tender Thyme & Garlic Roast Beef",
  "subtitle": "Tempranillo Reduction, Gremolata — carvery and feasting format",
  "type": "Main",
  "course": "Main",
  "protein": ["beef"],
  "diet": ["Gluten-Free", "Dairy-Free"],
  "method": "Roast",
  "yield": "40 serves @ 150–180 g each — approx. 3 whole roasts",
  "label": "Roast Beef",
  "elements": ["Sliced Roast Beef", "Tempranillo Reduction", "Gremolata"],
  "ingredients": [
    {"qty": "8 kg",   "item": "Carvery Beef, Cooked",        "prep": "defrosted in coldroom 24h"},
    {"qty": "200 g",  "item": "Crushed Garlic"},
    {"qty": "1 pkt",  "item": "Thyme",                       "prep": "leaves stripped"},
    {"qty": "100 ml", "item": "Tuscan Oil"},
    {"qty": "20 g",   "item": "Table Salt"},
    {"qty": "10 g",   "item": "Ground Black Pepper"},
    {"qty": "750 ml", "item": "Red Wine Cooking Wine",        "prep": "for reduction"},
    {"qty": "500 ml", "item": "Jus",                          "prep": "from freezer, defrosted"},
    {"qty": "1 pkt",  "item": "Flat Leaf Parsley",            "prep": "finely chopped"},
    {"qty": "3",      "item": "Lemons",                       "prep": "zest and juice"},
    {"qty": "100 g",  "item": "Crushed Garlic",               "prep": "for gremolata"},
  ],
  "method_steps": [
    "Defrost carvery beef in the coldroom for a minimum 24 hours. Pat dry with paper towel.",
    "Combine Tuscan Oil, crushed garlic, thyme leaves, salt and pepper. Rub mixture all over the beef. Allow to marinate refrigerated for a minimum 2 hours or overnight.",
    "Preheat oven to 180°C (fan). Roast beef on a rack over a deep tray for approximately 45–60 minutes until internal temperature reaches 58–60°C (medium-rare finish for carvery). Rest covered with foil for a minimum 20 minutes — temperature will rise to 62–65°C.",
    "Tempranillo Reduction: Combine red wine cooking wine and defrosted jus in a saucepan. Bring to a boil then reduce over medium heat by approximately half until glossy and sauce-like. Season to taste.",
    "Gremolata: Combine finely chopped flat leaf parsley, lemon zest, lemon juice and crushed garlic. Season with salt and pepper.",
    "Slice beef against the grain at service — for carvery carve thick slices (12–15mm); for feasting cut thinner (8–10mm)."
  ],
  "service": [
    "Carvery: present whole roast on a carving station. Carve to order, 2–3 thick slices per guest. Serve jus and gremolata separately.",
    "Feasting/buffet: slice in kitchen, fan out on a hotel pan lined with parchment. Drizzle with reduction. Garnish with gremolata and serve warm.",
    "Hold at 65°C in bain marie. Carve no more than 20 minutes ahead of service — beef dries quickly once sliced."
  ],
  "note": "Uses pre-cooked carvery beef from stock (Bidfood) for speed and volume consistency. Rest is critical — do not slice before minimum 20 minutes resting."
},
{
  "id": "lemon-thyme-garlic-roast-chicken-carvery",
  "name": "Lemon, Thyme & Garlic Roast Chicken",
  "subtitle": "Golden whole-bird roast — carvery and buffet format",
  "type": "Main",
  "course": "Main",
  "protein": ["chicken"],
  "diet": ["Gluten-Free", "Dairy-Free"],
  "method": "Roast",
  "yield": "40 serves @ 150 g — approx. 10–12 whole birds",
  "label": "Roast Chicken",
  "elements": ["Roast Chicken Portions", "Roasting Jus"],
  "ingredients": [
    {"qty": "12",     "item": "Chicken Thighs Fillets",       "prep": "or 10–12 whole birds (1.4–1.6 kg)"},
    {"qty": "200 g",  "item": "Crushed Garlic"},
    {"qty": "2 pkt",  "item": "Thyme",                        "prep": "leaves stripped"},
    {"qty": "4",      "item": "Lemons",                       "prep": "zest and juice"},
    {"qty": "150 ml", "item": "Tuscan Oil"},
    {"qty": "25 g",   "item": "Table Salt"},
    {"qty": "10 g",   "item": "Ground Black Pepper"},
    {"qty": "500 ml", "item": "Jus",                          "prep": "for serving"},
  ],
  "method_steps": [
    "Combine Tuscan Oil, crushed garlic, thyme leaves, lemon zest and juice, salt and pepper to form a marinade.",
    "If using whole birds: loosen skin from breast with fingers and push marinade under the skin as well as coating the outside. If using thigh fillets: coat well and marinate overnight in coldroom.",
    "Preheat oven to 200°C. Place birds/fillets on oven trays with a wire rack. Roast whole birds 60–75 minutes, thigh fillets 25–30 minutes, until skin is deep golden and internal temperature reaches 82°C at the thickest point.",
    "Rest for 10–15 minutes. For whole birds: carve breast from bone and separate legs/thighs. For fillets: slice on the bias.",
    "Heat jus from frozen and season. Skim any fat."
  ],
  "service": [
    "Carvery: present golden portions in gastronorm pan. Serve jus alongside in a sauce boat or ladle.",
    "Buffet: fan portions on hotel pan, drizzle with pan juices. Garnish with thyme sprigs and lemon wedges.",
    "Hold at 65°C maximum 30 minutes before quality declines. Do not cover tightly — steam softens the skin."
  ],
  "note": "Key carvery, buffet, and feasting format. Works with whole birds for presentation, or thigh fillets for volume speed."
},
{
  "id": "sicilian-roast-pork-apricot",
  "name": "Sicilian Citrus & Herb Roast Pork",
  "subtitle": "Apricot Compote — carvery buffet main",
  "type": "Main",
  "course": "Main",
  "protein": ["pork"],
  "diet": ["Gluten-Free", "Dairy-Free"],
  "method": "Roast",
  "yield": "40 serves @ 150–180 g — approx. 1 × 7–8 kg pork leg or 2 × 4 kg bellies",
  "label": "Roast Pork",
  "elements": ["Sliced Roast Pork", "Apricot Compote"],
  "ingredients": [
    {"qty": "7 kg",    "item": "Pork Belly (Frozen)",          "prep": "defrosted 24h in coldroom"},
    {"qty": "4",       "item": "Oranges",                      "prep": "zest and juice"},
    {"qty": "4",       "item": "Lemons",                       "prep": "zest and juice"},
    {"qty": "200 g",   "item": "Crushed Garlic"},
    {"qty": "1 pkt",   "item": "Thyme",                        "prep": "leaves stripped"},
    {"qty": "1 pkt",   "item": "Fresh Oregano",                "prep": "leaves stripped"},
    {"qty": "150 ml",  "item": "Tuscan Oil"},
    {"qty": "20 g",    "item": "Table Salt"},
    {"qty": "10 g",    "item": "Ground Black Pepper"},
    {"qty": "500 g",   "item": "Dried Apricots",               "prep": "finely chopped, for compote"},
    {"qty": "200 ml",  "item": "Orange Juice",                  "prep": "for compote"},
    {"qty": "100 ml",  "item": "White Wine Cooking Wine",       "prep": "for compote"},
    {"qty": "30 g",    "item": "Brown Sugar",                   "prep": "for compote"},
  ],
  "method_steps": [
    "Combine Tuscan Oil, citrus zest and juice, garlic, thyme, oregano, salt and pepper. Rub marinade over the pork, working it into any natural pockets or scoring. Marinate overnight in coldroom.",
    "Preheat oven to 160°C. Place pork on a rack in a deep roasting tray. Roast belly for 2.5–3 hours until completely tender and internal temperature reaches 82°C. In the final 20 minutes, increase oven to 220°C to crisp the surface.",
    "Apricot Compote: Combine dried apricots, orange juice, white wine and brown sugar in a saucepan. Simmer over low heat for 15–20 minutes until the apricots are soft and the compote is jammy. Cool and adjust sweetness.",
    "Rest pork for 20 minutes under loose foil before slicing. Slice 12–15 mm thick for carvery or thinner for buffet."
  ],
  "service": [
    "Carvery: carve at the station, 2–3 slices per guest. Serve apricot compote alongside in a ramekin or sauce boat.",
    "Buffet: arrange slices on hotel pan. Serve apricot compote in a small gastro alongside.",
    "Hold at 65°C. Pork belly is robust — holds quality well for 45–60 minutes in bain marie."
  ],
  "note": "Carvery buffet format. Sicilian refers to the citrus-herb marinade style — orange and lemon with oregano and thyme."
},
{
  "id": "sous-vide-pork-loin-apricot",
  "name": "Sous Vide Pork Loin",
  "subtitle": "Apricot & Sage Compote — plated alternate drop main",
  "type": "Main",
  "course": "Main",
  "protein": ["pork"],
  "diet": ["Gluten-Free"],
  "method": "Sous Vide / Sear",
  "yield": "40 plated serves @ 180 g pork loin each",
  "label": "Pork Loin",
  "elements": ["Seared Pork Loin", "Apricot & Sage Compote", "Pan Jus"],
  "ingredients": [
    {"qty": "8 kg",   "item": "Pork Belly (Frozen)",           "prep": "defrosted — use pork loin/tenderloin if available; belly can substitute"},
    {"qty": "100 ml", "item": "Tuscan Oil"},
    {"qty": "100 g",  "item": "Crushed Garlic"},
    {"qty": "1 pkt",  "item": "Thyme",                         "prep": "leaves stripped"},
    {"qty": "20 g",   "item": "Table Salt"},
    {"qty": "8 g",    "item": "Ground Black Pepper"},
    {"qty": "300 g",  "item": "Dried Apricots",                "prep": "finely diced"},
    {"qty": "150 ml", "item": "White Wine Cooking Wine"},
    {"qty": "100 ml", "item": "Orange Juice"},
    {"qty": "20 g",   "item": "Brown Sugar"},
    {"qty": "1 pkt",  "item": "Thyme",                         "prep": "for compote"},
    {"qty": "30 g",   "item": "Butter Unsalted",               "prep": "to finish compote"},
  ],
  "method_steps": [
    "Portion pork loin into 180–200 g steaks. Season with salt, pepper, thyme and garlic. Seal in vacuum bags.",
    "Sous vide at 63°C for 1.5–2 hours. Remove from bags; reserve any juices.",
    "Apricot & Sage Compote: Sweat dried apricots with white wine, orange juice and brown sugar over medium heat for 12–15 minutes until jammy. Add thyme, season, finish with cold butter for gloss.",
    "At service: Sear pork steaks in a screaming hot pan or flat-top for 60–90 seconds per side until caramelised. Rest 3 minutes.",
    "Combine bag juices with a splash of stock or jus and reduce briefly for a pan sauce."
  ],
  "service": [
    "Plate pork on a warm plate. Spoon 40–50 ml apricot compote beside or over the pork.",
    "Drizzle with reduced pan jus. Garnish with a picked thyme sprig.",
    "Alternate drop: pair with Chargrilled Lamb Cutlet or Prosciutto Chicken as the second option."
  ],
  "note": "Plated format. Needs_confirmation on exact portion weights for event tables. Can substitute pork tenderloin for a cleaner presentation."
},
{
  "id": "herb-crusted-pork-cutlet-cider-mustard",
  "name": "Herb Crusted Pork Cutlet",
  "subtitle": "Confit Garlic Pomme Purée, Greens, Cider & Mustard Cream",
  "type": "Main",
  "course": "Main",
  "protein": ["pork"],
  "diet": [],
  "method": "Pan-Fry / Oven",
  "yield": "40 plated serves",
  "label": "Pork Cutlet",
  "elements": ["Herb Crusted Pork Cutlet", "Pomme Purée", "Cider Mustard Cream"],
  "ingredients": [
    {"qty": "40",     "item": "Pork Belly (Frozen)",           "prep": "use bone-in pork cutlets if available, approx. 220–250 g each"},
    {"qty": "200 g",  "item": "Breadcrumbs GF"},
    {"qty": "1 pkt",  "item": "Flat Leaf Parsley",             "prep": "finely chopped"},
    {"qty": "1 pkt",  "item": "Thyme",                         "prep": "leaves stripped"},
    {"qty": "100 g",  "item": "Crushed Garlic"},
    {"qty": "100 ml", "item": "Tuscan Oil"},
    {"qty": "15 g",   "item": "Table Salt"},
    {"qty": "8 g",    "item": "Ground Black Pepper"},
    {"qty": "4 kg",   "item": "Instant Mash",                  "prep": "potato flakes for pomme purée"},
    {"qty": "2 L",    "item": "Thickened Cream",               "prep": "for pomme purée"},
    {"qty": "500 g",  "item": "Butter Unsalted",               "prep": "for pomme purée"},
    {"qty": "200 g",  "item": "Confit Garlic",                 "prep": "for pomme purée"},
    {"qty": "500 ml", "item": "White Wine Cooking Wine",        "prep": "for sauce"},
    {"qty": "500 ml", "item": "Thickened Cream",               "prep": "for sauce"},
    {"qty": "80 g",   "item": "Seeded Mustard",                "prep": "for sauce"},
  ],
  "method_steps": [
    "Herb crust: Combine breadcrumbs GF, finely chopped parsley, thyme leaves, crushed garlic, Tuscan Oil, salt and pepper until just combined. It should hold together when pressed.",
    "Season pork cutlets. Sear in a hot pan with Tuscan Oil for 2–3 minutes per side until golden. Transfer to a baking tray.",
    "Press herb crust firmly on top of each cutlet. Roast at 180°C for 8–12 minutes until internal temperature reaches 65°C. Rest 5 minutes.",
    "Confit Garlic Pomme Purée: Rehydrate instant mash with hot cream and water. Fold in confit garlic (squeezing cloves from their skins), butter, salt and pepper until very smooth. Pass through a fine sieve for ultra-smooth result.",
    "Cider & Mustard Cream: Deglaze pan with white wine and reduce by half. Add thickened cream and bring to a simmer. Stir in seeded mustard. Season and reduce to a light coating consistency."
  ],
  "service": [
    "Quenelle or pipe pomme purée onto warm plate. Lean pork cutlet against the purée.",
    "Sauce over and around the cutlet — approximately 50 ml per plate.",
    "Finish with a picked herb sprig. Serve with dressed greens alongside."
  ],
  "note": "Plated plated main. Needs_confirmation on exact pork portion size for event tables."
},

# ─────────────────────────────────────────────────────────────────────────────
# SALADS AND SIDES
# ─────────────────────────────────────────────────────────────────────────────
{
  "id": "greek-green-bean-salad",
  "name": "Greek Green Bean Salad",
  "subtitle": "Tomato, Olives, Feta, Herbed Vinaigrette — buffet and platter salad",
  "type": "Side",
  "course": "Side",
  "protein": [],
  "diet": ["Gluten-Free", "Vegetarian"],
  "method": "Blanch / Dress",
  "yield": "40 serves @ 80–100 g each — approx. 4 kg finished salad",
  "label": "Greek Green Bean Salad",
  "elements": ["Green Beans", "Tomato, Olives & Feta", "Herbed Vinaigrette"],
  "ingredients": [
    {"qty": "3 kg",   "item": "Peas",                          "prep": "use green beans — fresh, topped and tailed"},
    {"qty": "500 g",  "item": "Cherry Tomatoes",               "prep": "halved"},
    {"qty": "350 g",  "item": "Pitted Green Olives",           "prep": "halved"},
    {"qty": "400 g",  "item": "Feta Cheese Block",             "prep": "crumbled"},
    {"qty": "1",      "item": "Red Onions",                    "prep": "finely sliced"},
    {"qty": "1 pkt",  "item": "Fresh Oregano",                 "prep": "leaves only"},
    {"qty": "150 ml", "item": "EVOO"},
    {"qty": "80 ml",  "item": "White Wine Vinegar"},
    {"qty": "1",      "item": "Lemons",                        "prep": "juice only"},
    {"qty": "15 g",   "item": "Table Salt"},
    {"qty": "5 g",    "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Blanch green beans in rapidly boiling salted water for 2–3 minutes until just tender but still vivid green. Immediately refresh in iced water. Drain and pat dry.",
    "Whisk EVOO, white wine vinegar, lemon juice, salt and pepper to make the vinaigrette.",
    "Combine green beans, halved cherry tomatoes, sliced red onion and olives in a large bowl. Dress with vinaigrette and toss to combine.",
    "Transfer to service dish. Top with crumbled feta and fresh oregano leaves.",
    "Taste and adjust seasoning — this salad should be bright, savoury and tangy."
  ],
  "service": [
    "Serve at room temperature. Do not dress more than 2 hours ahead — beans become soggy.",
    "For buffet: present in a GN pan lined with paper. Top with feta and herbs at service.",
    "For plated: portion 80 g as a side. Add feta garnish last."
  ],
  "note": "High-frequency salad appearing across carvery buffet, funeral/wake platters, corporate build-your-own and party menus."
},
{
  "id": "caesar-salad-buffet",
  "name": "Caesar Salad",
  "subtitle": "Cos, Egg, Crispy Bacon, Parmesan, Caesar Dressing — buffet format",
  "type": "Side",
  "course": "Side",
  "protein": ["chicken", "pork"],
  "diet": ["Gluten-Free option"],
  "method": "Dress / Toss",
  "yield": "40 serves @ 80–100 g each",
  "label": "Caesar Salad",
  "elements": ["Cos Lettuce", "Crispy Bacon", "Parmesan", "Caesar Dressing", "Egg"],
  "ingredients": [
    {"qty": "8",      "item": "Cos",                            "prep": "hearts only, trimmed and torn"},
    {"qty": "800 g",  "item": "Diced Bacon",                    "prep": "cooked until crispy"},
    {"qty": "400 g",  "item": "Parmesan Cheese Shaved"},
    {"qty": "20",     "item": "Eggs",                           "prep": "hard-boiled, quartered"},
    {"qty": "1 kg",   "item": "Kewpie Mayo",                    "prep": "for dressing base"},
    {"qty": "4",      "item": "Lemons",                         "prep": "juice only"},
    {"qty": "80 g",   "item": "Crushed Garlic"},
    {"qty": "60 ml",  "item": "Balsamic Dressing",              "prep": "or Worcestershire sauce"},
    {"qty": "20 g",   "item": "Table Salt"},
    {"qty": "10 g",   "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Crispy Bacon: Pan-fry or oven-roast diced bacon at 200°C for 12–15 minutes until golden and crisp. Drain on paper towels. Reserve.",
    "Caesar Dressing: Combine Kewpie Mayo, lemon juice, crushed garlic, balsamic or Worcestershire sauce, salt and pepper. Whisk until smooth. Taste — dressing should be tangy, garlicky and rich.",
    "Hard-boil eggs (8–9 minutes), cool in iced water and peel. Quarter.",
    "Tear cos hearts into bite-size pieces. Do not wash until immediately before service.",
    "At service: Toss cos with dressing (use 30–40 ml per serve). Arrange on serving dish. Top with crispy bacon, parmesan shavings and egg quarters."
  ],
  "service": [
    "Assemble immediately before service — Caesar does not hold once dressed.",
    "For buffet: dress in batches so lettuce stays crisp. Use 2–3 smaller serving bowls rather than one large.",
    "Offer extra dressing and parmesan on the side."
  ],
  "note": "Corporate build-your-own buffet salad. Does not hold well — dress to order or in small batches."
},
{
  "id": "honey-thyme-roasted-carrots-pistachio",
  "name": "Honey-Thyme Roasted Carrots",
  "subtitle": "With Pistachios — carvery buffet side",
  "type": "Side",
  "course": "Side",
  "protein": [],
  "diet": ["Gluten-Free", "Vegan"],
  "method": "Roast",
  "yield": "40 serves @ 80–100 g each",
  "label": "Roasted Carrots",
  "elements": ["Roasted Carrots", "Honey-Thyme Glaze", "Pistachios"],
  "ingredients": [
    {"qty": "5 kg",   "item": "Roasted Sweet Potatoes",         "prep": "use whole carrots — peeled, halved lengthwise"},
    {"qty": "150 ml", "item": "Pure Honey"},
    {"qty": "80 ml",  "item": "Tuscan Oil"},
    {"qty": "2 pkt",  "item": "Thyme",                          "prep": "leaves stripped"},
    {"qty": "200 g",  "item": "Pistachios Kernels",             "prep": "roughly chopped"},
    {"qty": "20 g",   "item": "Table Salt"},
    {"qty": "5 g",    "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Peel and halve carrots lengthwise. Toss well with Tuscan Oil, salt and pepper.",
    "Spread in a single layer on lined baking trays. Roast at 200°C for 25–30 minutes until tender and beginning to caramelise at the edges.",
    "In the final 5 minutes, drizzle honey over the carrots and scatter thyme leaves. Return to oven and roast until sticky and glazed.",
    "Remove from oven. Scatter over chopped pistachios while still warm."
  ],
  "service": [
    "Serve warm in a hotel pan. Can hold at 65°C for up to 30 minutes.",
    "Garnish with extra thyme and pistachios at service.",
    "For plated: fan 4–5 carrot halves on the plate. Drizzle with any collected honey from the pan."
  ],
  "note": "Carvery and feasting buffet side. Sweet, nutty and aromatic — pairs well with roast lamb and chicken."
},
{
  "id": "mediterranean-rice-pilaf",
  "name": "Mediterranean Rice Pilaf",
  "subtitle": "Saffron, Almonds, Raisins & Herbs — carvery buffet side",
  "type": "Side",
  "course": "Side",
  "protein": [],
  "diet": ["Gluten-Free", "Vegan"],
  "method": "Simmer",
  "yield": "40 serves @ 100–120 g each",
  "label": "Rice Pilaf",
  "elements": ["Saffron Rice", "Toasted Almonds", "Golden Raisins"],
  "ingredients": [
    {"qty": "3 kg",   "item": "Arborio Rice",                   "prep": "or use basmati — rinse until water runs clear"},
    {"qty": "4.5 L",  "item": "Water",                          "prep": "boiling"},
    {"qty": "60 g",   "item": "Chicken Booster"},
    {"qty": "1 g",    "item": "Turmeric",                       "prep": "for colour if saffron unavailable"},
    {"qty": "200 g",  "item": "Almond Slivered Toasted"},
    {"qty": "200 g",  "item": "Pumpkin Seeds",                  "prep": "or use sultanas/golden raisins"},
    {"qty": "2 pkt",  "item": "Flat Leaf Parsley",              "prep": "roughly chopped"},
    {"qty": "1 pkt",  "item": "Mint",                           "prep": "leaves only, roughly torn"},
    {"qty": "100 ml", "item": "Tuscan Oil"},
    {"qty": "3",      "item": "Lemons",                         "prep": "zest and juice"},
    {"qty": "20 g",   "item": "Table Salt"},
    {"qty": "8 g",    "item": "Ground Black Pepper"},
    {"qty": "2",      "item": "Lemons",                         "prep": "wedges for service"},
  ],
  "method_steps": [
    "Rinse rice until water runs clear. Heat Tuscan Oil in a large rondeau. Toast the rice for 2–3 minutes stirring constantly until opaque.",
    "Add boiling water, chicken booster and turmeric. Stir once to combine. Cover tightly and cook on lowest heat for 18–20 minutes until all liquid is absorbed and rice is tender.",
    "Remove from heat. Place a clean tea towel under the lid and leave to steam for 10 minutes — this absorbs excess moisture and keeps grains separate.",
    "Fork through the rice gently. Fold in slivered almonds, pumpkin seeds/sultanas, chopped parsley and mint.",
    "Dress with lemon zest and juice, additional Tuscan Oil, salt and pepper. Toss to combine. Taste and adjust."
  ],
  "service": [
    "Serve warm or at room temperature. Pilaf holds well at either temperature.",
    "For buffet: mound in a hotel pan and garnish with extra herbs and lemon wedges.",
    "Pairs well with Greek Spiced Roast Lamb, Roast Chicken and Chargrilled Lamb Cutlets."
  ],
  "note": "High-frequency carvery buffet side. The aromatic herb and almond finish makes it a Riviera signature."
},
{
  "id": "roast-root-veg-salad-cinnamon-maple",
  "name": "Roast Root Vegetable Salad",
  "subtitle": "Cinnamon-Maple Nuts — warm salad for carvery buffet",
  "type": "Side",
  "course": "Side",
  "protein": [],
  "diet": ["Gluten-Free", "Vegan"],
  "method": "Roast",
  "yield": "40 serves @ 100 g each",
  "label": "Roast Root Veg Salad",
  "elements": ["Roasted Root Vegetables", "Cinnamon-Maple Nuts", "Herb Dressing"],
  "ingredients": [
    {"qty": "2 kg",   "item": "Roasted Sweet Potatoes",         "prep": "use kumara/sweet potato — peeled, 3 cm dice"},
    {"qty": "1.5 kg", "item": "Pumpkin Seeds",                  "prep": "use pumpkin/butternut — peeled, 3 cm dice"},
    {"qty": "1 kg",   "item": "Red Onions",                     "prep": "quartered"},
    {"qty": "150 ml", "item": "Tuscan Oil"},
    {"qty": "20 g",   "item": "Table Salt"},
    {"qty": "8 g",    "item": "Ground Black Pepper"},
    {"qty": "200 g",  "item": "Walnuts",                        "prep": "roughly chopped"},
    {"qty": "60 ml",  "item": "Maple Syrup"},
    {"qty": "5 g",    "item": "Ground Cinnamon"},
    {"qty": "2 pkt",  "item": "Flat Leaf Parsley",              "prep": "roughly chopped"},
    {"qty": "80 ml",  "item": "Balsamic Glaze"},
  ],
  "method_steps": [
    "Toss sweet potato, pumpkin and red onion with Tuscan Oil, salt and pepper. Spread in single layers on lined baking trays.",
    "Roast at 200°C for 30–40 minutes until caramelised and tender, turning halfway.",
    "Cinnamon-Maple Nuts: Toss walnuts with maple syrup and cinnamon. Spread on a lined tray and bake at 180°C for 8–10 minutes until caramelised. Cool completely.",
    "Combine roasted vegetables in a serving dish. Drizzle with balsamic glaze.",
    "Scatter cinnamon-maple nuts and flat leaf parsley over the top."
  ],
  "service": [
    "Serve warm or at room temperature. Drizzle extra balsamic glaze at service.",
    "Can be pre-roasted and re-warmed in the oven at 160°C for 10 minutes before serving.",
    "Scatter nuts last minute to maintain crunch."
  ],
  "note": "Carvery buffet and BBQ buffet side. The cinnamon-maple nuts are the signature element — prepare them ahead and keep in an airtight container."
},
{
  "id": "roast-pumpkin-pepita-salad-balsamic",
  "name": "Roast Pumpkin & Pepita Salad",
  "subtitle": "Balsamic Glaze — buffet salad",
  "type": "Side",
  "course": "Side",
  "protein": [],
  "diet": ["Gluten-Free", "Vegan"],
  "method": "Roast",
  "yield": "40 serves @ 80–100 g each",
  "label": "Pumpkin Pepita Salad",
  "elements": ["Roast Pumpkin", "Toasted Pepitas", "Balsamic Glaze"],
  "ingredients": [
    {"qty": "5 kg",   "item": "Roasted Sweet Potatoes",         "prep": "use Kent/Jap pumpkin — peeled, 3 cm wedges"},
    {"qty": "300 g",  "item": "Toasted Pepitas"},
    {"qty": "400 g",  "item": "Feta Cheese Block",              "prep": "crumbled — optional"},
    {"qty": "100 ml", "item": "Tuscan Oil"},
    {"qty": "100 ml", "item": "Balsamic Glaze"},
    {"qty": "1 pkt",  "item": "Fresh Oregano",                  "prep": "leaves only"},
    {"qty": "20 g",   "item": "Table Salt"},
    {"qty": "8 g",    "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Toss pumpkin wedges with Tuscan Oil, salt and pepper. Spread on lined baking trays.",
    "Roast at 200°C for 30–35 minutes until tender and caramelised at edges.",
    "Arrange roasted pumpkin on a serving platter or hotel pan. Drizzle generously with balsamic glaze.",
    "Scatter toasted pepitas, oregano leaves and optional crumbled feta."
  ],
  "service": [
    "Serve warm or room temperature. Drizzle with extra balsamic at service.",
    "For buffet: can hold at room temperature for up to 2 hours. Do not refrigerate — pumpkin becomes watery."
  ],
  "note": "Appears across carvery buffet and BBQ buffet menus. Simple, visual and crowd-pleasing."
},
{
  "id": "roquette-parmesan-salad",
  "name": "Roquette & Parmesan Salad",
  "subtitle": "Balsamic Glaze — plated and feasting side",
  "type": "Side",
  "course": "Side",
  "protein": [],
  "diet": ["Gluten-Free", "Vegetarian"],
  "method": "Dress",
  "yield": "40 serves @ 40–50 g each",
  "label": "Roquette Salad",
  "elements": ["Roquette", "Shaved Parmesan", "Balsamic Glaze"],
  "ingredients": [
    {"qty": "1.5 kg", "item": "Rocket, Baby Leaf"},
    {"qty": "400 g",  "item": "Parmesan Cheese Shaved"},
    {"qty": "100 ml", "item": "Balsamic Glaze"},
    {"qty": "80 ml",  "item": "Tuscan Oil"},
    {"qty": "2",      "item": "Lemons",                         "prep": "juice only"},
    {"qty": "10 g",   "item": "Table Salt"},
    {"qty": "5 g",    "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Whisk Tuscan Oil, lemon juice, salt and pepper to make a light dressing.",
    "At service: toss rocket lightly with the dressing — just enough to coat, not wilt.",
    "Arrange on serving plate or feasting board. Scatter shaved parmesan over the top.",
    "Drizzle balsamic glaze in a fine zigzag over the salad."
  ],
  "service": [
    "Dress immediately before service — rocket wilts quickly once dressed.",
    "For feasting/shared: pile high on a board and serve in the centre of the table.",
    "For plated: nest 40–50 g beside the main as a bright, peppery contrast."
  ],
  "note": "Simple but visual — the balsamic drizzle must be applied at service for presentation. Standard side for Amalfi, La Tavola and feasting menus."
},
{
  "id": "french-green-beans-shallots-mustard",
  "name": "French Green Beans",
  "subtitle": "Shallots, Mustard Vinaigrette & Toasted Almonds",
  "type": "Side",
  "course": "Side",
  "protein": [],
  "diet": ["Gluten-Free", "Vegan"],
  "method": "Blanch / Dress",
  "yield": "40 serves @ 60–80 g each",
  "label": "Green Beans",
  "elements": ["Blanched Green Beans", "Shallot Mustard Vinaigrette", "Toasted Almonds"],
  "ingredients": [
    {"qty": "4 kg",   "item": "Peas",                          "prep": "use fine green beans (haricots verts) — topped"},
    {"qty": "6",      "item": "Shallots",                       "prep": "finely sliced into rings"},
    {"qty": "100 g",  "item": "Almond Slivered Toasted"},
    {"qty": "100 ml", "item": "Tuscan Oil"},
    {"qty": "60 ml",  "item": "White Wine Vinegar"},
    {"qty": "30 g",   "item": "Dijon Mustard"},
    {"qty": "10 g",   "item": "Brown Sugar"},
    {"qty": "15 g",   "item": "Table Salt"},
    {"qty": "5 g",    "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Blanch green beans in heavily salted boiling water for 2–3 minutes. Refresh immediately in iced water. Drain and pat dry thoroughly.",
    "Mustard Vinaigrette: Whisk Dijon mustard, white wine vinegar, brown sugar, salt and pepper together. Slowly whisk in Tuscan Oil until emulsified.",
    "Combine beans with finely sliced shallots. Dress with vinaigrette and toss well.",
    "Transfer to serving dish. Scatter toasted almond slivers over the top."
  ],
  "service": [
    "Serve at room temperature. Dress no more than 1 hour ahead — beans continue to soften.",
    "Scatter almonds at service to keep crunch.",
    "Standard included side for Amalfi and feasting shared plates."
  ],
  "note": "Elegant, classic green bean salad — appears across feasting and Amalfi menus. The shallot rings must be thin so they don't overpower."
},
{
  "id": "creamy-potato-bake",
  "name": "Creamy Potato Bake",
  "subtitle": "Classic gratin-style potato bake for platters and buffet",
  "type": "Side",
  "course": "Side",
  "protein": [],
  "diet": ["Gluten-Free", "Vegetarian"],
  "method": "Bake",
  "yield": "40 serves @ 150 g each — approx. 2 × full GN pans",
  "label": "Potato Bake",
  "elements": ["Creamy Potato Bake"],
  "ingredients": [
    {"qty": "6 kg",   "item": "Potato",                         "prep": "peeled and thinly sliced (2–3mm)"},
    {"qty": "2 L",    "item": "Thickened Cream"},
    {"qty": "500 ml", "item": "Full Cream Milk"},
    {"qty": "300 g",  "item": "Crushed Garlic"},
    {"qty": "2 pkt",  "item": "Thyme",                          "prep": "leaves stripped"},
    {"qty": "600 g",  "item": "Shreedded Mozzarella"},
    {"qty": "25 g",   "item": "Table Salt"},
    {"qty": "10 g",   "item": "Ground Black Pepper"},
    {"qty": "5 g",    "item": "Ground Cinnamon",                "prep": "optional — adds warmth"},
  ],
  "method_steps": [
    "Combine thickened cream, milk, garlic, thyme, salt and pepper in a large pot. Bring to a gentle simmer. Add potato slices and cook for 5 minutes until just beginning to soften.",
    "Transfer to deep greased GN pans, pressing potatoes into even layers. Pour cream mixture over to just cover.",
    "Top with shredded mozzarella. Cover tightly with foil.",
    "Bake at 160°C for 45–50 minutes covered, then remove foil and bake a further 20 minutes until top is golden and bubbling.",
    "Rest 10 minutes before portioning. Score into squares before service."
  ],
  "service": [
    "Portion into squares using a sharp spatula. Serve from the baking pan.",
    "Hold at 65°C in a bain marie for up to 1 hour.",
    "For platters/buffet: pre-portion into individual foil cups or serve from the pan."
  ],
  "note": "High-frequency platter/buffet side appearing across party and funeral/wake menus. Can be baked a day ahead, refrigerated, and reheated."
},
{
  "id": "garlic-lemon-potatoes",
  "name": "Garlic Lemon Potatoes",
  "subtitle": "Greek-style roasted chat potatoes for gyros and buffet",
  "type": "Side",
  "course": "Side",
  "protein": [],
  "diet": ["Gluten-Free", "Vegan"],
  "method": "Roast",
  "yield": "40 serves @ 120 g each",
  "label": "Garlic Lemon Potatoes",
  "elements": ["Roasted Garlic Lemon Potatoes"],
  "ingredients": [
    {"qty": "6 kg",   "item": "Potato",                         "prep": "chat or sebago — halved, skin on"},
    {"qty": "200 g",  "item": "Crushed Garlic"},
    {"qty": "4",      "item": "Lemons",                         "prep": "juice only"},
    {"qty": "150 ml", "item": "Tuscan Oil"},
    {"qty": "500 ml", "item": "Water",                          "prep": "for roasting"},
    {"qty": "1 pkt",  "item": "Fresh Oregano",                  "prep": "leaves stripped"},
    {"qty": "25 g",   "item": "Table Salt"},
    {"qty": "10 g",   "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Halve chat potatoes. In a large bowl, toss with Tuscan Oil, crushed garlic, lemon juice, oregano, salt and pepper.",
    "Spread in a single layer in deep roasting trays. Add 500 ml water to the base of each tray — this creates steam for the first part of cooking.",
    "Roast at 200°C for 35–40 minutes. The water will evaporate and the potatoes will begin to crisp and absorb the garlic-lemon flavour.",
    "Toss potatoes halfway through. Once water has evaporated, continue roasting until potatoes are golden and crispy on the outside, tender inside.",
    "Season with additional salt at service."
  ],
  "service": [
    "Serve hot from the oven in a hotel pan. Squeeze a little extra lemon juice over at service.",
    "Ideal alongside the Gyros Bar as the included starch component.",
    "Can hold at 65°C for 30 minutes. Do not cover — steam softens the crispy exterior."
  ],
  "note": "Essential side for the MYO Gyros Bar at both party and offsite menus."
},
{
  "id": "dinner-rolls-butter",
  "name": "Dinner Rolls & Butter",
  "subtitle": "Warmed dinner rolls with whipped butter for buffet service",
  "type": "Bakery",
  "course": "Bread",
  "protein": [],
  "diet": ["Vegetarian"],
  "method": "Warm / Serve",
  "yield": "40 serves — 2 rolls per guest",
  "label": "Dinner Rolls",
  "elements": ["Dinner Rolls", "Whipped Butter"],
  "ingredients": [
    {"qty": "96",     "item": "Bread Rolls Dinner",             "prep": "from freezer — defrost overnight in coldroom or at room temp 2h"},
    {"qty": "500 g",  "item": "Butter Unsalted",               "prep": "softened — see Whipped Butter recipe (whipped-butter)"},
    {"qty": "5 g",    "item": "Table Salt",                    "prep": "flaked, for butter"},
  ],
  "method_steps": [
    "Defrost dinner rolls in coldroom overnight or at room temperature for 2 hours.",
    "Preheat oven to 160°C. Place rolls on a lined tray and warm for 6–8 minutes until soft and just heated through — do not allow to dry out or brown.",
    "Whip softened butter with flaked salt until light and airy (see Whipped Butter recipe).",
    "Transfer warm rolls to a lined bread basket. Serve whipped butter alongside in a ramekin."
  ],
  "service": [
    "Place basket on the table before entrée service. Refresh with warm rolls as needed.",
    "For buffet: arrange rolls in lined baskets or on a wooden board. Keep covered with a cloth napkin between refreshes.",
    "Butter in a cold ramekin — allow guests to serve themselves."
  ],
  "note": "Standard bread service item for all seated functions. Two rolls per guest is the standard count; allocate 2.2 per guest for production to allow for attrition."
},
{
  "id": "pork-italian-herb-sausages",
  "name": "Pork & Italian Herb Sausages",
  "subtitle": "Grilled for BBQ buffet service",
  "type": "Main",
  "course": "Main",
  "protein": ["pork"],
  "diet": ["Gluten-Free option"],
  "method": "Grill / BBQ",
  "yield": "40 serves — 2 sausages per guest",
  "label": "Pork Sausages",
  "elements": ["Grilled Pork Sausages"],
  "ingredients": [
    {"qty": "80",     "item": "Sausage Rolls GF/DF",            "prep": "use Italian-style pork sausages — 80–100 g each; purchase ready-made"},
    {"qty": "2 pkt",  "item": "Fresh Oregano",                  "prep": "for garnish"},
    {"qty": "1 pkt",  "item": "Flat Leaf Parsley",              "prep": "for garnish"},
    {"qty": "2",      "item": "Lemons",                         "prep": "wedges for service"},
  ],
  "method_steps": [
    "Use premium Italian herb pork sausages (sourced — see stock list). Do not prick sausages before cooking.",
    "Preheat grill/BBQ to medium-high. Brush with Tuscan Oil.",
    "Cook sausages for 12–15 minutes, turning regularly, until cooked through (internal temp 75°C) and evenly browned all over.",
    "Rest 3 minutes off heat before service."
  ],
  "service": [
    "Serve on a hotel pan or wooden board. Garnish with fresh oregano and parsley. Lemon wedges alongside.",
    "For BBQ buffet: keep warm at 65°C in bain marie or on the grill edge with lid.",
    "Two sausages per guest is standard for BBQ buffet. Allocate 2.2 per guest production."
  ],
  "note": "BBQ buffet main. Sourced from Bidfood premium range — do not substitute with cheap sausages for event service."
},

# ─────────────────────────────────────────────────────────────────────────────
# PLATTERS
# ─────────────────────────────────────────────────────────────────────────────
{
  "id": "house-baked-muffins",
  "name": "House Baked Muffins",
  "subtitle": "Chef's rotating seasonal flavours — morning/afternoon tea",
  "type": "Bakery",
  "course": "Morning Tea",
  "protein": [],
  "diet": ["Vegetarian"],
  "method": "Bake",
  "yield": "40 muffins — 40 serves of 1 each, or 20 serves of 2",
  "label": "Muffins",
  "elements": ["Seasonal Muffins"],
  "ingredients": [
    {"qty": "600 g",  "item": "Self-Raising Flour"},
    {"qty": "200 g",  "item": "Raw Sugar"},
    {"qty": "2",      "item": "Eggs"},
    {"qty": "300 ml", "item": "Full Cream Milk"},
    {"qty": "150 ml", "item": "Tuscan Oil",                    "prep": "or melted butter"},
    {"qty": "5 ml",   "item": "Vanilla Sugar"},
    {"qty": "SEASON", "item": "Seasonal additions",             "prep": "e.g. 200g blueberries, 200g choc chips, 150g diced banana + 100g walnut"},
    {"qty": "5 g",    "item": "Table Salt"},
  ],
  "method_steps": [
    "Preheat oven to 180°C. Line two 12-hole muffin trays with paper cases.",
    "Whisk eggs, milk, oil and vanilla together in a jug.",
    "Sift self-raising flour, sugar and salt into a large bowl. Make a well in the centre.",
    "Pour wet ingredients into dry. Fold GENTLY until just combined — do not overmix, lumps are fine. Overmixing creates tough muffins.",
    "Fold in seasonal additions (blueberries, choc chips, etc.) with the last few strokes.",
    "Scoop into prepared trays filling ¾ full. Top with a small amount of seasonal ingredient for visual appeal.",
    "Bake 20–22 minutes until golden and a skewer inserted comes out clean. Cool in tin 5 minutes then on a rack."
  ],
  "service": [
    "Serve at room temperature in a lined basket or on a tiered stand.",
    "Label the flavour clearly — especially for dietary awareness (nut-containing, etc.).",
    "Can be baked day before and stored in an airtight container. Refresh briefly in the oven if needed."
  ],
  "note": "High-frequency morning/afternoon tea item. Appears across parties, corporate, and funeral/wake menus. Rotate flavours per season and event style."
},
{
  "id": "house-baked-sausage-rolls",
  "name": "House Baked Sausage Rolls",
  "subtitle": "Gourmet beef sausage rolls — hot nibble platter",
  "type": "Platter",
  "course": "Hot Nibble",
  "protein": ["beef", "pork"],
  "diet": [],
  "method": "Bake",
  "yield": "40–48 pieces per platter — 20–24 serves of 2 each",
  "label": "Sausage Rolls",
  "elements": ["Sausage Rolls", "Tomato Sauce"],
  "ingredients": [
    {"qty": "48",     "item": "Sausage Rolls",                  "prep": "from freezer — premium sausage rolls (Bidfood / see stock list)"},
    {"qty": "400 ml", "item": "Tomato Sauce",                   "prep": "for serving"},
    {"qty": "60 ml",  "item": "Seeded Mustard",                 "prep": "optional serve-alongside"},
  ],
  "method_steps": [
    "Defrost sausage rolls in the coldroom for minimum 2 hours or overnight.",
    "Preheat oven to 200°C. Place sausage rolls on lined baking trays, spaced slightly apart.",
    "Bake for 18–22 minutes until pastry is golden brown, flaky and fully cooked through. Internal temperature should reach 75°C.",
    "Rest 2 minutes before serving."
  ],
  "service": [
    "Arrange on a lined platter or in a lined hotel pan. Serve immediately — sausage rolls lose crispness as they cool.",
    "Serve tomato sauce and mustard in separate ramekins alongside.",
    "For events: cook in staggered batches of 12–15 every 15–20 minutes to ensure fresh, hot supply."
  ],
  "note": "Hot nibble platter item appearing across parties, funeral/wake and late-night snack menus. Use premium pastry brand — not GF sausage rolls for this standard platter."
},
{
  "id": "beef-party-pies",
  "name": "Flaky Beef Party Pies",
  "subtitle": "Hot nibble platter",
  "type": "Platter",
  "course": "Hot Nibble",
  "protein": ["beef"],
  "diet": [],
  "method": "Bake",
  "yield": "48 pieces per platter — 24 serves of 2 each",
  "label": "Beef Party Pies",
  "elements": ["Beef Party Pies", "Tomato Sauce"],
  "ingredients": [
    {"qty": "48",     "item": "Pies",                           "prep": "from freezer — premium beef party pies (see stock list)"},
    {"qty": "400 ml", "item": "Tomato Sauce"},
    {"qty": "60 ml",  "item": "Seeded Mustard",                 "prep": "optional"},
  ],
  "method_steps": [
    "Defrost party pies in coldroom 2 hours or overnight.",
    "Preheat oven to 200°C. Place on lined baking trays.",
    "Bake 18–20 minutes until pastry is golden and filling is steaming hot. Check internal temperature reaches 75°C.",
    "Rest 2 minutes before serving."
  ],
  "service": [
    "Serve hot on a lined platter with tomato sauce and mustard in ramekins.",
    "Stagger cooking batches for long events. Do not hold more than 20 minutes before quality drops.",
    "Serve alongside sausage rolls as part of the mixed nibble platter."
  ],
  "note": "Pairs with house baked sausage rolls and mini quiches as the hot nibble platter trio."
},
{
  "id": "mini-quiches-beetroot-balsamic",
  "name": "Mini Quiches with Beetroot Balsamic Relish",
  "subtitle": "Hot nibble platter",
  "type": "Platter",
  "course": "Hot Nibble",
  "protein": ["egg", "dairy"],
  "diet": ["Vegetarian"],
  "method": "Bake",
  "yield": "48 pieces per platter — 24 serves of 2 each",
  "label": "Mini Quiches",
  "elements": ["Mini Quiches", "Beetroot Balsamic Relish"],
  "ingredients": [
    {"qty": "48",     "item": "Quiche Lorraine",                "prep": "from freezer — use house-made or premium Bidfood mini quiches"},
    {"qty": "300 g",  "item": "Cherry Jam",                     "prep": "use beetroot balsamic relish if available, otherwise cherry/berry relish"},
    {"qty": "50 ml",  "item": "Balsamic Glaze"},
  ],
  "method_steps": [
    "Defrost mini quiches in coldroom 2 hours or overnight.",
    "Preheat oven to 180°C. Place on lined trays.",
    "Bake 12–15 minutes until heated through and pastry is golden. Internal temperature 75°C.",
    "Rest 2 minutes.",
    "If making beetroot relish: combine chopped cooked beetroot with balsamic glaze and a small amount of sugar. Cook down until jammy. Season."
  ],
  "service": [
    "Serve hot on a lined platter. Place a small amount of relish on or beside each quiche.",
    "The beetroot balsamic relish is the garnish and flavour contrast — do not serve plain.",
    "Pairs with sausage rolls and beef pies as the hot nibble platter trio."
  ],
  "note": "Key party and corporate hot nibble item. The beetroot balsamic relish is specified in all catering brochures as the standard accompaniment."
},
{
  "id": "beef-cheeseburger-sliders",
  "name": "Classic Beef Cheeseburger Sliders",
  "subtitle": "Substantial platter — parties and late-night snacks",
  "type": "Platter",
  "course": "Substantial",
  "protein": ["beef"],
  "diet": [],
  "method": "Grill / Assemble",
  "yield": "40 sliders — 20–40 serves depending on portion context",
  "label": "Cheeseburger Sliders",
  "elements": ["Beef Patty", "Aged Cheddar", "Brioche Bun", "House Sauces"],
  "ingredients": [
    {"qty": "40",     "item": "Angus Beef Sliders, Par-Cooked",  "prep": "from freezer"},
    {"qty": "40",     "item": "Mini Brioche Slider Buns",        "prep": "halved and lightly toasted"},
    {"qty": "400 g",  "item": "Natural Sliced Cheddar",          "prep": "slices"},
    {"qty": "200 g",  "item": "Seeded Mustard"},
    {"qty": "200 ml", "item": "Hickory Smoked BBQ Sauce"},
    {"qty": "200 g",  "item": "Kewpie Mayo"},
    {"qty": "200 g",  "item": "Mild Chunky Salsa"},
    {"qty": "1",      "item": "Cos",                             "prep": "shredded or baby leaves"},
    {"qty": "250 g",  "item": "Cherry Tomatoes",                 "prep": "sliced"},
  ],
  "method_steps": [
    "Defrost Angus slider patties in coldroom 2 hours.",
    "Preheat flat-top grill or pan to high. Cook slider patties 2–3 minutes per side until well seared. Place a slice of cheddar on each and cover briefly to melt.",
    "Toast brioche buns on the flat-top until golden.",
    "Assemble: Spread mustard on base bun, mayonnaise on lid. Place patty + melted cheese, then shredded cos and sliced tomato. Secure with a skewer if needed.",
    "Serve immediately — assembled sliders hold for 10 minutes maximum."
  ],
  "service": [
    "Assemble close to service. Do not pre-assemble more than 10 sliders at a time.",
    "Arrange on a lined board or platter. Serve BBQ sauce and extra mayo in separate ramekins.",
    "For late-night snacks: plate on a board, serve hot and casual — no skewers needed."
  ],
  "note": "Substantial platter and late-night snack item. Par-cooked patties from Bidfood ensure speed at volume — finish on the flat-top at service."
},
{
  "id": "gourmet-pizza-scrolls",
  "name": "Gourmet Pizza Scrolls",
  "subtitle": "Roast pumpkin, feta & pesto — for grazing table add-on",
  "type": "Platter",
  "course": "Grazing Add-On",
  "protein": [],
  "diet": ["Vegetarian option"],
  "method": "Bake",
  "yield": "40 pieces",
  "label": "Pizza Scrolls",
  "elements": ["Gourmet Pizza Scrolls"],
  "ingredients": [
    {"qty": "2 kg",   "item": "Pizza Flour",                    "prep": "see House Focaccia dough method for base dough"},
    {"qty": "600 g",  "item": "Roasted Sweet Potatoes",         "prep": "use roasted pumpkin — cooled and diced"},
    {"qty": "400 g",  "item": "Feta Cheese Block",              "prep": "crumbled"},
    {"qty": "200 g",  "item": "Basil Purée",                    "prep": "pesto base"},
    {"qty": "400 g",  "item": "Shreedded Mozzarella"},
    {"qty": "200 g",  "item": "Sugo Per Pasta",                 "prep": "for casalingo variety"},
    {"qty": "200 g",  "item": "Mozzarella",                     "prep": "for casalingo variety"},
    {"qty": "15 g",   "item": "Table Salt"},
    {"qty": "5 g",    "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Make a batch of enriched pizza/focaccia dough (see house-focaccia recipe). Prove until doubled.",
    "Divide dough into 2 equal pieces. Roll each piece into a rectangle approximately 40 × 30 cm.",
    "Pumpkin & Feta: Spread basil purée over dough. Top with roasted pumpkin, crumbled feta and shredded mozzarella. Season. Roll into a tight log and slice into 3–4 cm rounds.",
    "Casalingo: Spread sugo per pasta. Top with torn mozzarella and season. Roll and slice as above.",
    "Place scrolls cut-side up on lined trays with 2 cm space between. Prove 20 minutes.",
    "Bake at 200°C for 16–18 minutes until deep golden and cooked through."
  ],
  "service": [
    "Serve warm on lined trays or wicker baskets.",
    "For grazing tables: nest scrolls cut-side up in rows as a grazing add-on.",
    "Can be baked 4 hours ahead and refreshed at 160°C for 5 minutes."
  ],
  "note": "Grazing table add-on item. The two varieties (pumpkin-feta-pesto and casalingo) can be mixed on the platter for visual interest."
},
{
  "id": "gourmet-brioche-sliders",
  "name": "Gourmet Brioche Sliders",
  "subtitle": "Mixed filled — grazing table add-on",
  "type": "Platter",
  "course": "Grazing Add-On",
  "protein": ["beef", "chicken"],
  "diet": [],
  "method": "Assemble",
  "yield": "40 sliders",
  "label": "Brioche Sliders",
  "elements": ["Filled Brioche Sliders"],
  "ingredients": [
    {"qty": "40",     "item": "Mini Brioche Slider Buns",        "prep": "halved"},
    {"qty": "1.5 kg", "item": "Shredded Chicken",               "prep": "from freezer — pulled/shredded"},
    {"qty": "500 g",  "item": "Diced Bacon",                    "prep": "cooked until just golden"},
    {"qty": "200 g",  "item": "Kewpie Mayo"},
    {"qty": "100 ml", "item": "Hickory Smoked BBQ Sauce"},
    {"qty": "1",      "item": "Cos",                             "prep": "shredded"},
    {"qty": "10 g",   "item": "Table Salt"},
    {"qty": "5 g",    "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Defrost shredded chicken and cook diced bacon until golden. Cool. Mix chicken with mayo, a splash of lemon juice, salt and pepper.",
    "Split brioche buns. Toast lightly on a flat-top.",
    "Smoked Chicken & Bacon: Fill with chicken mayo mixture, crispy bacon, shredded cos. Drizzle BBQ sauce.",
    "Assemble sliders no more than 20 minutes before service — brioche absorbs moisture quickly."
  ],
  "service": [
    "Arrange on a lined slate or wooden board. Secure with a small skewer if needed.",
    "For grazing table add-on: display on a tiered riser or at one end of the grazing table.",
    "Keep covered with a light domed cover until service if assembling ahead."
  ],
  "note": "Grazing table add-on substantial item. Mix 2–3 filling varieties if making 40+ pieces (e.g. chicken & bacon + beef & cheddar)."
},

# ─────────────────────────────────────────────────────────────────────────────
# PASTA / VEG MAINS
# ─────────────────────────────────────────────────────────────────────────────
{
  "id": "chilli-prawn-chorizo-casarecce",
  "name": "Chilli Prawn & Chorizo Casarecce",
  "subtitle": "Substantial canapé — Portofino package",
  "type": "Canape",
  "course": "Substantial Canape",
  "protein": ["seafood", "pork"],
  "diet": ["Gluten-Free option"],
  "method": "Sauté",
  "yield": "40 substantial canapé serves",
  "label": "Chilli Prawn & Chorizo Casarecce",
  "elements": ["Casarecce Pasta", "Chilli Prawn & Chorizo Sauce"],
  "ingredients": [
    {"qty": "3 kg",   "item": "Cooked Aussie Tiger Prawns",      "prep": "peeled and deveined"},
    {"qty": "1 kg",   "item": "Chorizo",                         "prep": "finely diced 5mm"},
    {"qty": "2 kg",   "item": "Sugo Per Pasta"},
    {"qty": "150 g",  "item": "Crushed Garlic"},
    {"qty": "60 g",   "item": "Crispy Chili Oil"},
    {"qty": "200 ml", "item": "White Wine Cooking Wine"},
    {"qty": "100 ml", "item": "Tuscan Oil"},
    {"qty": "500 g",  "item": "Couscous",                        "prep": "use casarecce pasta — GF pasta available"},
    {"qty": "1 pkt",  "item": "Flat Leaf Parsley",               "prep": "roughly chopped"},
    {"qty": "3",      "item": "Lemons",                          "prep": "juice and zest"},
    {"qty": "20 g",   "item": "Table Salt"},
    {"qty": "10 g",   "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Cook casarecce pasta in heavily salted boiling water until al dente. Drain — reserve 200 ml pasta water.",
    "In a large wide pan, render chorizo in Tuscan Oil until fat released and beginning to crisp, approximately 4–5 minutes.",
    "Add crushed garlic and chilli oil. Cook 1 minute.",
    "Add white wine and reduce by half. Add sugo per pasta and simmer 5 minutes.",
    "Add tiger prawns and toss until just pink and cooked through — do not overcook.",
    "Add cooked pasta and a splash of pasta water. Toss vigorously to coat and gloss. Add lemon juice, salt and pepper.",
    "Fold through flat leaf parsley and lemon zest. Taste and adjust."
  ],
  "service": [
    "Serve in individual cups or small ceramic dishes (60–70 g per serve) for substantial canapé service.",
    "Garnish with a parsley leaf and lemon zest.",
    "Cook to order in batches for cocktail service — do not pre-batch as pasta absorbs sauce quickly."
  ],
  "note": "Portofino Package substantial canapé. Elegant and punchy — ensure prawns are not overcooked. GF pasta available on request."
},
{
  "id": "cotoletta-pinsa",
  "name": "Cotoletta Pinsa",
  "subtitle": "Crispy Chicken, House Bolognese, Mozzarella, Roquette & Balsamic on Pinsa Roll — house specialty substantial canapé",
  "type": "Canape",
  "course": "Substantial Canape",
  "protein": ["chicken"],
  "diet": [],
  "method": "Fry / Assemble",
  "yield": "40 substantial canapé serves",
  "label": "Cotoletta Pinsa",
  "elements": ["Cotoletta Pinsa Roll", "Bolognese Sauce", "Mozzarella", "Roquette"],
  "ingredients": [
    {"qty": "40",     "item": "Chicken Thighs Fillets",          "prep": "pounded to 1 cm even thickness"},
    {"qty": "400 g",  "item": "Breadcrumbs GF"},
    {"qty": "8",      "item": "Eggs",                            "prep": "beaten for crumbing"},
    {"qty": "200 g",  "item": "Flour GF",                        "prep": "for crumbing"},
    {"qty": "1 kg",   "item": "Bolognese",                       "prep": "from freezer — defrost"},
    {"qty": "800 g",  "item": "Mozzarella Shredded"},
    {"qty": "400 g",  "item": "Rocket, Baby Leaf"},
    {"qty": "100 ml", "item": "Balsamic Glaze"},
    {"qty": "40",     "item": "Bread Batard Petit White",         "prep": "use pinsa pizza rolls or petit bread rolls, split"},
    {"qty": "100 ml", "item": "Tuscan Oil",                      "prep": "for frying"},
    {"qty": "15 g",   "item": "Table Salt"},
    {"qty": "8 g",    "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Pound chicken thigh fillets to an even 1 cm thickness. Season with salt and pepper.",
    "Set up crumbing station: GF flour, beaten egg, GF breadcrumbs. Crumb each chicken fillet — flour first, egg wash, then breadcrumbs. Press firmly to adhere. Double crumb if needed.",
    "Shallow or deep fry in Tuscan Oil at 180°C for 3–4 minutes per side until golden brown and cooked through (internal temp 82°C). Drain on paper towels.",
    "Warm bolognese gently. Warm or toast pinsa rolls briefly.",
    "Assemble: spread a layer of warm bolognese on the bottom roll. Place cotoletta on top. Add shredded mozzarella, pile of rocket, and a drizzle of balsamic glaze. Place lid on top or serve open."
  ],
  "service": [
    "Assemble to order or in small batches of 5–6 for cocktail service.",
    "Serve whole or halved — depending on event style.",
    "The cotoletta must be freshly cooked and hot. Do not hold assembled for more than 5 minutes."
  ],
  "note": "Riviera house specialty and Portofino Package substantial canapé. The pinsa/cotoletta combination is unique to Riviera. Crumbed chicken must be fried fresh."
},
{
  "id": "maple-pumpkin-ravioli-burnt-butter",
  "name": "Maple Pumpkin Ravioli",
  "subtitle": "Burnt Butter & Sage — vegetarian substantial canapé and plated entrée",
  "type": "Canape",
  "course": "Substantial Canape",
  "protein": [],
  "diet": ["Vegetarian"],
  "method": "Boil / Sauté",
  "yield": "40 serves as canapé — 4 ravioli per serve; or 20 serves as an entrée",
  "label": "Pumpkin Ravioli",
  "elements": ["Pumpkin Ravioli", "Burnt Butter Sage Sauce", "Parmesan"],
  "ingredients": [
    {"qty": "3 kg",   "item": "Roasted Sweet Potatoes",          "prep": "use Kent pumpkin — roasted, flesh scooped"},
    {"qty": "400 g",  "item": "Ricotta",                         "prep": "drained"},
    {"qty": "200 g",  "item": "Parmesan Cheese",                 "prep": "grated"},
    {"qty": "60 ml",  "item": "Maple Syrup"},
    {"qty": "5 g",    "item": "Ground Cinnamon"},
    {"qty": "5 g",    "item": "Ground Coriander"},
    {"qty": "10 g",   "item": "Table Salt"},
    {"qty": "5 g",    "item": "Ground Black Pepper"},
    {"qty": "600 g",  "item": "Butter Unsalted",                 "prep": "for burnt butter sauce"},
    {"qty": "2 pkt",  "item": "Thyme",                           "prep": "leaves stripped — for sage substitute if no fresh sage"},
    {"qty": "100 g",  "item": "Parmesan Cheese Shaved",          "prep": "for service"},
    {"qty": "2",      "item": "Lemons",                          "prep": "juice for sauce"},
    {"qty": "40",     "item": "Wonton Wrappers",                 "prep": "use fresh pasta sheets or gyoza wrappers — 2 per ravioli"},
  ],
  "method_steps": [
    "Pumpkin Filling: Combine roasted pumpkin flesh with ricotta, grated parmesan, maple syrup, cinnamon, coriander, salt and pepper. Mix well. Taste — filling should be sweet, savoury and aromatic.",
    "Place a wonton wrapper on the bench. Add 30 g filling to the centre. Brush edges with water. Place a second wrapper on top and press firmly to seal, removing all air pockets. Trim with a round cutter if desired.",
    "Lay finished ravioli on a lightly floured tray. Refrigerate if not cooking immediately.",
    "Cook ravioli in batches in large volumes of salted boiling water for 2–3 minutes until they float and wrappers are tender.",
    "Burnt Butter Sauce: Melt butter in a wide pan until golden brown and nutty (beurre noisette). Add thyme leaves, lemon juice, salt and pepper. Swirl to combine — sauce will foam."
  ],
  "service": [
    "For canapé: plate 4 ravioli in a small ceramic bowl. Drizzle burnt butter sauce over. Garnish with shaved parmesan.",
    "For plated entrée: plate 6–8 ravioli, generous sauce, parmesan and a thyme sprig.",
    "Do not hold assembled — ravioli absorbs sauce quickly. Cook and sauce to order in small batches."
  ],
  "note": "Portofino and Taormina Package vegetarian substantial canapé and plated entrée option. Wonton/gyoza wrappers are the volume shortcut — hand-made pasta for premium events."
},

# ─────────────────────────────────────────────────────────────────────────────
# GYROS / SOUVLAKI ASSEMBLY
# ─────────────────────────────────────────────────────────────────────────────
{
  "id": "souvlaki-gyros-assembly",
  "name": "MYO Gyros Bar — Souvlaki Assembly",
  "subtitle": "Souvlaki breads, fillings and sauces for build-your-own service",
  "type": "Buffet",
  "course": "Main",
  "protein": ["chicken", "lamb", "beef"],
  "diet": ["Gluten-Free option"],
  "method": "Assemble",
  "yield": "40 guests — each builds their own gyros",
  "label": "Gyros Bar Assembly",
  "elements": ["Souvlaki Breads", "Tabouli", "Tzatziki", "Garlic Aioli", "Capsicum Cream", "Feta", "Lettuce", "Tomato", "Red Onion"],
  "ingredients": [
    {"qty": "80",     "item": "Greek Pitta Bread",               "prep": "from freezer — 2 per guest, warm before service"},
    {"qty": "500 g",  "item": "Feta Cheese Block",               "prep": "crumbled"},
    {"qty": "800 g",  "item": "Labneh Tzatziki",                 "prep": "see labneh-tzatziki recipe"},
    {"qty": "500 g",  "item": "Kewpie Mayo",                     "prep": "mixed with garlic for garlic aioli"},
    {"qty": "100 g",  "item": "Crushed Garlic",                  "prep": "for garlic aioli"},
    {"qty": "500 g",  "item": "Spicy Capsicum & Feta Dip",       "prep": "capsicum cream"},
    {"qty": "3",      "item": "Cos",                             "prep": "shredded"},
    {"qty": "500 g",  "item": "Cherry Tomatoes",                 "prep": "halved"},
    {"qty": "2",      "item": "Red Onions",                      "prep": "finely sliced"},
    {"qty": "400 g",  "item": "Couscous",                        "prep": "prepared as tabouli — with parsley, mint, lemon"},
    {"qty": "1 pkt",  "item": "Flat Leaf Parsley",               "prep": "for tabouli"},
    {"qty": "1 pkt",  "item": "Mint",                            "prep": "for tabouli"},
    {"qty": "3",      "item": "Lemons",                          "prep": "juice for tabouli"},
    {"qty": "80 ml",  "item": "Tuscan Oil",                      "prep": "for tabouli"},
    {"qty": "20 g",   "item": "Table Salt"},
  ],
  "method_steps": [
    "Tabouli: Prepare couscous as per packet (use 1:1 boiling water:couscous). Fork through and cool. Mix with finely chopped flat leaf parsley, mint, lemon juice, Tuscan Oil, salt and pepper.",
    "Garlic Aioli: Mix Kewpie Mayo with crushed garlic, salt and a squeeze of lemon. Adjust to taste.",
    "Warm pitta breads in a dry pan or oven at 160°C for 5 minutes until soft and pliable.",
    "Set up the Gyros Bar: arrange protein options (see linked protein recipes) in hotel pans at 65°C. Place all fillings and sauces in individual GN pans or ramekins.",
    "Label every component clearly — especially for allergens (feta: dairy; pitta: gluten)."
  ],
  "service": [
    "Staff-served: carving station style where a team member builds gyros per guest request.",
    "Or self-serve: arrange all components in order of build (bread, protein, fillings, sauces) with tongs and ladles.",
    "Refresh protein every 20 minutes. Keep pitta warm under a cloth napkin."
  ],
  "note": "MYO Gyros Bar assembly guide — pairs with Greek Style Pulled Beef, Chargrilled Chicken, Spiced Lamb Kofta and Grilled Halloumi protein options."
},
{
  "id": "spiced-lamb-kofta-offsite",
  "name": "Spiced Lamb Kofta",
  "subtitle": "For MYO Gyros Bar — offsite and party format",
  "type": "Main",
  "course": "Main",
  "protein": ["lamb"],
  "diet": ["Gluten-Free", "Dairy-Free"],
  "method": "Grill",
  "yield": "40 serves — 2 kofta per guest",
  "label": "Spiced Lamb Kofta",
  "elements": ["Lamb Kofta", "Spicy Capsicum Cream"],
  "ingredients": [
    {"qty": "5 kg",   "item": "Greek-Style Lamb Meat",           "prep": "from freezer — or use lamb mince"},
    {"qty": "200 g",  "item": "Crushed Garlic"},
    {"qty": "30 g",   "item": "Moroccan Seasoning"},
    {"qty": "10 g",   "item": "Ground Coriander"},
    {"qty": "10 g",   "item": "Ground Cumin"},
    {"qty": "10 g",   "item": "Smoky Paprika"},
    {"qty": "1 pkt",  "item": "Flat Leaf Parsley",               "prep": "finely chopped"},
    {"qty": "1 pkt",  "item": "Mint",                            "prep": "finely chopped"},
    {"qty": "20 g",   "item": "Table Salt"},
    {"qty": "10 g",   "item": "Ground Black Pepper"},
    {"qty": "600 g",  "item": "Spicy Capsicum & Feta Dip",       "prep": "for serving — capsicum cream"},
  ],
  "method_steps": [
    "Combine lamb mince with crushed garlic, Moroccan seasoning, ground coriander, cumin, smoked paprika, flat leaf parsley, mint, salt and pepper. Mix well — the mixture should be cohesive.",
    "Weigh into 80 g portions. Shape into elongated kofta cylinders around metal or soaked wooden skewers. Alternatively, shape into ovals.",
    "Refrigerate kofta for minimum 30 minutes to firm up.",
    "Grill on a hot flat-top or BBQ grill at medium-high heat, turning every 2–3 minutes for 10–12 minutes total until cooked through (internal temp 75°C) and nicely charred.",
    "Rest 3 minutes off heat."
  ],
  "service": [
    "Serve hot for the Gyros Bar protein station alongside spicy capsicum cream.",
    "For plated: 2 kofta per serve in a mini pita with sauce and salad.",
    "Hold in bain marie at 65°C. Do not hold more than 30 minutes — lamb dries quickly."
  ],
  "note": "Gyros Bar protein option for offsite events. Note: the existing beef-kofta recipe covers the Riviera tapas version. This is the lamb format for the gyros context."
},
{
  "id": "grilled-halloumi-plain",
  "name": "Grilled Halloumi",
  "subtitle": "Gyros Bar vegetarian protein option",
  "type": "Main",
  "course": "Main",
  "protein": ["dairy"],
  "diet": ["Gluten-Free", "Vegetarian"],
  "method": "Grill",
  "yield": "40 serves — 2 slices per guest",
  "label": "Grilled Halloumi",
  "elements": ["Grilled Halloumi Slices"],
  "ingredients": [
    {"qty": "17",     "item": "Halloumi",                        "prep": "sliced 8mm thick — 17 pc standard pack / 3–4 slices per pack"},
    {"qty": "50 ml",  "item": "Tuscan Oil"},
    {"qty": "2",      "item": "Lemons",                          "prep": "wedges for service"},
    {"qty": "5 g",    "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Pat halloumi slices dry with paper towel. Brush lightly with Tuscan Oil.",
    "Heat a flat-top grill, cast iron or BBQ grill to high heat.",
    "Grill halloumi slices 2–3 minutes per side until golden char marks and softened throughout. Do not move while grilling — allows proper caramelisation.",
    "Season with a grind of black pepper immediately off the heat. Squeeze a little lemon over."
  ],
  "service": [
    "Serve immediately — halloumi firms up as it cools and loses its best texture within 5 minutes.",
    "For Gyros Bar: grill in batches of 8–10 and refresh every 10 minutes throughout service.",
    "Serve with lemon wedges alongside the other protein options."
  ],
  "note": "Vegetarian protein for the MYO Gyros Bar. Also the base for Hot Honey Saganaki (tapas menu) — that is the dressed version. This is the plain gyros-bar version."
},

# ─────────────────────────────────────────────────────────────────────────────
# BABY SHOWER / HIGH TEA ITEMS
# ─────────────────────────────────────────────────────────────────────────────
{
  "id": "ribbon-sandwiches",
  "name": "Assorted Ribbon Sandwiches",
  "subtitle": "Finger sandwiches for high tea and baby shower graze",
  "type": "Platter",
  "course": "High Tea",
  "protein": ["chicken", "dairy"],
  "diet": [],
  "method": "Assemble",
  "yield": "48 sandwich points (24 strips cut in half) — serves 12–16",
  "label": "Ribbon Sandwiches",
  "elements": ["Ribbon Sandwiches"],
  "ingredients": [
    {"qty": "2",      "item": "Loaf   thick sliced toast",       "prep": "thin-sliced white or wholemeal sandwich bread"},
    {"qty": "400 g",  "item": "Kewpie Mayo",                     "prep": "for fillings base"},
    {"qty": "300 g",  "item": "Shredded Chicken",               "prep": "from freezer — pulled and seasoned"},
    {"qty": "150 g",  "item": "Dill",                            "prep": "finely chopped — fresh"},
    {"qty": "200 g",  "item": "Cucumber Continental",            "prep": "thinly sliced"},
    {"qty": "100 g",  "item": "Natural Sliced Cheddar",          "prep": "thinly sliced"},
    {"qty": "150 g",  "item": "Australian Leg Ham",              "prep": "thinly sliced"},
    {"qty": "500 g",  "item": "Butter Unsalted",                 "prep": "softened"},
    {"qty": "10 g",   "item": "Table Salt"},
    {"qty": "5 g",    "item": "Ground Black Pepper"},
  ],
  "method_steps": [
    "Prepare fillings: (1) Chicken & Dill Mayo — mix shredded chicken with kewpie mayo, chopped dill, salt and pepper. (2) Cucumber & Cream Cheese — mix cream cheese (or labneh) with dill, season. (3) Ham & Cheese — layer ham and cheddar with a scrape of seeded mustard.",
    "Lay out bread slices. Spread each slice edge-to-edge with softened butter.",
    "Build sandwiches 2–3 slices thick, alternating bread and filling for striped effect if stacking.",
    "Press gently. Use a serrated knife to trim all crusts cleanly.",
    "Cut each sandwich into fingers (3 per slice) or into neat points.",
    "Cover with a damp cloth and refrigerate until service. Do not refrigerate assembled for more than 2 hours."
  ],
  "service": [
    "Arrange on a tiered high-tea stand or rectangular platter. Arrange by filling type for clarity.",
    "For high tea: serve with scones, arancini and petit fours as part of the set high tea service.",
    "Cover with cling film until the moment of service — bread dries quickly once cut."
  ],
  "note": "Baby Shower High Tea and Custom Graze item. Ribbon refers to the layered look. Three filling varieties is standard for the Riviera high tea presentation."
},
{
  "id": "sweet-petit-fours",
  "name": "Sweet Petit Fours",
  "subtitle": "Assorted bite-sized sweet treats for high tea service",
  "type": "Bakery",
  "course": "Dessert",
  "protein": [],
  "diet": ["Vegetarian"],
  "method": "Bake / Assemble",
  "yield": "48 pieces — 12 serves of 4",
  "label": "Petit Fours",
  "elements": ["Petit Fours Selection"],
  "ingredients": [
    {"qty": "1 pkt",  "item": "Lemon Lime Cheesecake GF",        "prep": "use for pre-made petit four base"},
    {"qty": "200 g",  "item": "Vanilla Mousse Mix",              "prep": "prepared as per packet"},
    {"qty": "100 g",  "item": "Icing Sugar",                     "prep": "for dusting"},
    {"qty": "100 g",  "item": "Frozen Strawberries",             "prep": "thawed, for coulis"},
    {"qty": "100 g",  "item": "Pumpkin Seeds",                   "prep": "or use pepitas/almonds as decoration"},
    {"qty": "50 g",   "item": "Pistachios Kernels",              "prep": "roughly chopped"},
    {"qty": "200 g",  "item": "Chocolate Dark Buttons",          "prep": "melted — for dipping/drizzling"},
  ],
  "method_steps": [
    "The petit four selection for Riviera events typically draws from 4 styles: (1) mini cheesecake bites, (2) chocolate-dipped fruit or biscuit, (3) mousse cups, (4) nut-and-spice balls (rum balls from stock).",
    "Mini Cheesecake Bites: Cut pre-made cheesecake into 2–3 cm squares or rounds. Dip base in melted chocolate. Top with a slice of strawberry.",
    "Chocolate Bark Bites: Melt chocolate. Spread thin on baking paper. Scatter with pistachios and icing sugar. Refrigerate until set. Break into irregular shards.",
    "Mousse Cups: Prepare vanilla mousse as per packet. Pipe into small shot glasses or espresso cups. Top with a strawberry coulis (blended thawed strawberries + icing sugar).",
    "Arrange 4 different pieces per person on the high tea stand."
  ],
  "service": [
    "Plate on the top tier of the high-tea stand.",
    "Present with a dusting of icing sugar and edible flower garnish if available.",
    "Keep refrigerated until 15 minutes before service."
  ],
  "note": "High Tea Petit Fours — the assortment should vary per event. Four varieties minimum is the Riviera standard. Can be supplemented with premium bought-in petit fours (Bidfood range)."
},
{
  "id": "spinach-feta-pastizzi-warm",
  "name": "Spinach & Feta Pastizzis with Tzatziki",
  "subtitle": "Warm pastry for baby shower graze and hot nibble platters",
  "type": "Platter",
  "course": "Warm Bite",
  "protein": ["dairy"],
  "diet": ["Vegetarian"],
  "method": "Bake",
  "yield": "40–48 pieces",
  "label": "Spinach & Feta Pastizzi",
  "elements": ["Spinach & Feta Pastizzis", "Tzatziki"],
  "ingredients": [
    {"qty": "48",     "item": "Sausage Rolls GF/DF",             "prep": "use spinach and feta pastizzis — Bidfood or house-made"},
    {"qty": "500 g",  "item": "Labneh Tzatziki",                 "prep": "see labneh-tzatziki recipe"},
    {"qty": "2",      "item": "Lemons",                          "prep": "wedges"},
    {"qty": "1 pkt",  "item": "Mint",                            "prep": "for garnish"},
  ],
  "method_steps": [
    "Defrost pastizzis in coldroom overnight.",
    "Preheat oven to 200°C. Place on lined baking trays.",
    "Bake 18–22 minutes until pastry is golden and flaky and filling is hot through. Internal temp 75°C.",
    "Rest 2 minutes."
  ],
  "service": [
    "Arrange on a platter with tzatziki in a ramekin alongside.",
    "Garnish with mint leaves and lemon wedges.",
    "For baby shower graze: place as a warm element alongside the cold graze components.",
    "Serve immediately — filo/pastry pastizzis lose texture quickly."
  ],
  "note": "Baby Shower Custom Graze and hot nibble platter item. The tzatziki garnish is specified in the catering brochure."
},
{
  "id": "fruit-salad-yoghurt",
  "name": "Fruit Salad & Yoghurt",
  "subtitle": "Corporate breakfast item",
  "type": "Corporate",
  "course": "Breakfast",
  "protein": [],
  "diet": ["Gluten-Free", "Vegetarian"],
  "method": "Prep / Assemble",
  "yield": "40 serves @ 150 g each",
  "label": "Fruit Salad & Yoghurt",
  "elements": ["Fresh Seasonal Fruit", "Greek Style Yogurt", "Honey Drizzle"],
  "ingredients": [
    {"qty": "2 kg",   "item": "Frozen Strawberries",             "prep": "use fresh seasonal fruit — see note"},
    {"qty": "1.5 kg", "item": "Roasted Sweet Potatoes",          "prep": "use watermelon, rockmelon or tropical fruit"},
    {"qty": "1 kg",   "item": "Red Grapes",                      "prep": "halved"},
    {"qty": "1 kg",   "item": "Greek Style Yogurt"},
    {"qty": "80 ml",  "item": "Pure Honey"},
    {"qty": "1 pkt",  "item": "Mint",                            "prep": "small leaves for garnish"},
  ],
  "method_steps": [
    "Prepare fresh seasonal fruit: wash, peel and dice into uniform bite-size pieces. Halve grapes.",
    "Mix fruit gently in a large bowl. Do not add any dressing — the natural fruit juice is the dressing.",
    "At service: portion fruit into glasses, cups or bowls. Top with a spoonful of Greek style yogurt.",
    "Drizzle with pure honey. Garnish with a small fresh mint leaf."
  ],
  "service": [
    "Prepare fruit maximum 2 hours before service — cut fruit oxidises and weeps juice.",
    "For corporate breakfast: plate individually into glass cups or small bowls.",
    "Keep refrigerated until 5 minutes before service."
  ],
  "note": "Corporate breakfast item. Fruit selection adjusts to season — use whatever is peak quality."
},

# ─────────────────────────────────────────────────────────────────────────────
# DESSERT GRAZING TABLE ITEMS
# ─────────────────────────────────────────────────────────────────────────────
{
  "id": "dessert-grazing-table-assembly",
  "name": "Dessert Grazing Table",
  "subtitle": "Styled display of cakes, pastries, slices, chocolates and fruit — from $22pp",
  "type": "Platter",
  "course": "Dessert",
  "protein": [],
  "diet": ["Vegetarian — GF and DF options within"],
  "method": "Assemble / Style",
  "yield": "1 m table feeds 40 guests | 2 m table feeds 80–100 | 3 m table feeds 120–150",
  "label": "Dessert Grazing Table",
  "elements": ["Decadent Cakes", "Petite Pastries", "Handcrafted Slices", "Artisan Chocolates", "Fresh Fruit"],
  "ingredients": [
    {"qty": "3",      "item": "Raspberry Choc Gâteau (VG/GF)",  "prep": "from freezer — 1 whole cake per 15 guests"},
    {"qty": "1",      "item": "Lemon Lime Cheesecake GF",        "prep": "from freezer"},
    {"qty": "12",     "item": "Cannoli Shells",                  "prep": "filled with Pistachio and Coffee-Nutella fillings"},
    {"qty": "500 g",  "item": "Frozen Strawberries",             "prep": "use fresh strawberries at peak season"},
    {"qty": "500 g",  "item": "Red Grapes",                      "prep": "cut into small bunches"},
    {"qty": "300 g",  "item": "Chocolate Dark Buttons",          "prep": "use premium artisan chocolate bar — broken into pieces"},
    {"qty": "200 g",  "item": "Pumpkin Seeds",                   "prep": "or toasted pepitas for crunch element"},
    {"qty": "6",      "item": "Madeleine",                       "prep": "from freezer — warm briefly before styling"},
    {"qty": "200 g",  "item": "Persian Fairy Floss, Pistachio",  "prep": "for visual texture height"},
    {"qty": "100 g",  "item": "Rose Petals",                     "prep": "dried or fresh — for styling"},
    {"qty": "50 g",   "item": "Icing Sugar",                     "prep": "for dusting"},
  ],
  "method_steps": [
    "Defrost all frozen dessert items overnight in coldroom. Note: bring to room temperature 30 minutes before styling.",
    "Slice whole cakes into portions (8–10 per cake) using a clean hot knife. Separate slices slightly for display.",
    "Fill cannoli shells with pistachio and coffee-nutella fillings close to service — within 30 minutes.",
    "Arrange items on the table with varying heights using white plinths. Cluster by colour and texture.",
    "Fill gaps with fresh fruit bunches, chocolates, and smaller elements.",
    "Top with Persian fairy floss and scattered rose petals for the Riviera signature look.",
    "Dust with icing sugar over the whole display just before the table opens."
  ],
  "service": [
    "Table is styled by the catering team, not self-service arranged by guests.",
    "Include: small plates, napkins and cake forks at each end of the table.",
    "Refresh every 30 minutes — replace consumed items with pre-cut backup from the kitchen.",
    "Items with a limited hold time (madeleines, filled cannoli) go out in small batches, not all at once."
  ],
  "note": "Offsite Riviera Table dessert package. The table is styled as a visual experience first, flavour second. Stylist must be briefed on the Riviera aesthetic — gold tones, organic flow, no straight lines."
},
{
  "id": "roving-tiramisu-cups",
  "name": "Roving Tiramisu Cups",
  "subtitle": "Individual espresso-soaked mascarpone cups — roving dessert service",
  "type": "Dessert",
  "course": "Dessert",
  "protein": [],
  "diet": ["Vegetarian"],
  "method": "Assemble / No-Cook",
  "yield": "40 individual 80–100 ml cups",
  "label": "Tiramisu Cups",
  "elements": ["Tiramisu Cup"],
  "ingredients": [
    {"qty": "1 kg",   "item": "Mascarpone 1Kg"},
    {"qty": "500 g",  "item": "Ricotta",                         "prep": "drained"},
    {"qty": "200 g",  "item": "Icing Sugar",                     "prep": "sifted"},
    {"qty": "8 g",    "item": "Freeze Dried Coffee",             "prep": "dissolved in 100 ml warm water — concentrate"},
    {"qty": "200 ml", "item": "Thickened Cream",                 "prep": "lightly whipped"},
    {"qty": "1 pkt",  "item": "Savoiardi biscuits",             "prep": "use vanilla wafer or sponge fingers"},
    {"qty": "100 ml", "item": "Coffee Chocolate Cream",          "prep": "or Kahlua — for soaking"},
    {"qty": "20 g",   "item": "Dukkah Mix",                     "prep": "use cocoa powder for dusting — not dukkah"},
    {"qty": "30 g",   "item": "Vanilla Sugar",                  "prep": "for assembly"},
  ],
  "method_steps": [
    "Tiramisu Cream: Beat mascarpone and drained ricotta together until smooth. Add sifted icing sugar and coffee concentrate. Fold in lightly whipped cream. Chill.",
    "Soak sponge fingers briefly in coffee liqueur (1–2 seconds per side — do not over-soak or they disintegrate).",
    "Assembly: In each cup, place 1 soaked sponge finger broken to fit. Pipe or spoon a generous layer of cream. Place another half sponge finger. Add another cream layer to the rim.",
    "Dust with cocoa powder through a fine sieve.",
    "Cover and refrigerate minimum 2 hours before service — cream firms up."
  ],
  "service": [
    "Serve on a tray with small dessert spoons. Pass through the crowd for roving service.",
    "Cups should be chilled — serve directly from a refrigerated tray or ice bath.",
    "For roving dessert service: send out 2 trays of 20 cups, alternating with roving cannoli.",
    "Garnish with a dusting of extra cocoa at service if cups have been refrigerated."
  ],
  "note": "Separate from the Roving Cannoli & Tiramisu combined service. This is the standalone tiramisu cup format for when tiramisu is served solo roving."
},

]  # END GAP_RECIPES
# fmt: on


def main():
    b = json.loads(BUILTINS.read_text(encoding="utf-8"))
    existing_ids = {r["id"] for r in b}

    added = []
    for recipe in GAP_RECIPES:
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
