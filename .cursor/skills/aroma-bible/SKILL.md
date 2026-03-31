---
name: aroma-bible
description: Aroma Bible extract for the Kuschi kitchen library — JSON data locations, aroma groups, harmony vs food pairing, seasoning advice, and aroma.html UI.
---

# Aroma Bible (Kuschi kitchen library)

Use when the user asks about **seasoning**, **spice combinations**, **what goes with [food]**, **flavor pairing**, **Aroma Bible**, or **aroma groups** in this repo.

## Data files (English UI; `_de` in JSON is traceability only)

| File | Role |
|------|------|
| [aroma_data/ingredients.json](../../aroma_data/ingredients.json) | ~125 spice/herb profiles: `id`, `name`, `harmonizes_with` (objects `{id,name}`), `pairs_with_foods`, `cuisines`, `spice_blends`, `heat_behavior` `{a,b,c}`, `aroma_groups`, optional `key_aromas` |
| [aroma_data/food_pairings.json](../../aroma_data/food_pairings.json) | Reverse index: `id`, `name`, `seasonings` (objects `{id,name}`) — “I have lamb / lentils — what to season with?” |
| [aroma_data/pairing_matrix.json](../../aroma_data/pairing_matrix.json) | Adjacency: each key is a valid ingredient `id`; values are ids it **harmonizes** with (symmetric, only real profiles) |
| [assets/aroma-hints.js](../../assets/aroma-hints.js) | Browser: `KuschiAromaHints.ensureLoaded`, `recipeLinesForHints`, `buildSuggestions`, `hydrateModal`, add-recipe panel helpers |
| [aroma.html](../../aroma.html) | Standalone lookup: food search, spice profile, browse by group, harmony matrix |
| [scripts/extract_aroma_data.py](../../scripts/extract_aroma_data.py) | Regenerate JSON from PDFs (PyMuPDF); env `ARAMA_BIBLE_PART1`, `PART2`, `PART3`, `PART4` (paths to each PDF) |

## Seven + one aroma groups (volatile → stable)

Principle from the book: ingredients sharing **groups** tend to **reinforce** (same family); **different** groups often **complement** (complete the dish). This is heuristic, not a law.

| Group | Character (short) |
|------:|-------------------|
| 1 | Sulfurous, green, brassica / allium |
| 2 | Citrus, fruity, floral |
| 3 | Balsamic, camphor, terpenic |
| 4 | Dark, heavy floral, clove-like |
| 5 | Nutty, almond/vanilla axis |
| 6 | Cinnamon, nutmeg, phenolic |
| 7 | Roast / Maillard |
| 8 | Trigeminal heat (capsaicin, pepper tingle) |

`aroma_groups` on an ingredient is a small array of group numbers (inferred + curated in extraction).

## How to answer in chat

1. **“What should I season X with?”** — Find a row in `food_pairings.json` whose `name` matches X (fuzzy: meat, fish, pulses, vegetables). List `seasonings` names; optionally open matching entries in `ingredients.json` for `harmonizes_with` and `heat_behavior`.
2. **“What goes with spice Y?”** — Look up `ingredients.json` by `id` or `name`; read `harmonizes_with` and `pairs_with_foods`.
3. **Recipe review** — Map recipe ingredient lines with the same normalization as the site: `KuschiUserRecipes.canonicalOrderMergeKey` when available. Score suggestions: matched spices contribute their harmony partners; food-pairing hits add seasonings from the appendix. Prefer **bridging** spices (suggested by multiple sources). Mention gaps in aroma **groups** only qualitatively unless you’ve loaded the JSON.
4. **Timing** — `heat_behavior.a` / `b` / `c` map to PDF stages **A → B → C** (progressive heat/aroma notes), not arbitrary keys; use them as a rough evolution guide. Wording is abbreviated English from extraction.
5. **UI** — Point users to [aroma.html](aroma.html) for full profiles and the matrix (`?spice=id`, `?food=id` query params).

## Compact reference (~50 ingredients by harmony count)

Auto-derived from the latest `ingredients.json` (top 5 harmonizing partners, up to 3 food pairings). **Prefer the JSON** for authoritative data.

| Ingredient (EN) | Top harmonizing partners | Sample food pairings |
|---|---|---|
| Sichuan Pepper | Basil, Chili, Ginger, Kaffir Lime Leaves, Garlic | nuts, fish, meat |
| Curry Leaves | Asafoetida, Chili, Fenugreek, Clove, Cardamom | most vegetables, fish |
| Cocoa | Anise, Clove, Hazelnut, Coffee, Almond | milk, dark |
| Cardamom | Anise, Bergamot, Fennel, Clove, Ginger | pears, oranges |
| Oregano | Chili, Basil, Garlic, Cumin, Bay Leaf | pizza, tomatoes, eggplants |
| Lemon Balm | Basil, Watercress, Dill, Fennel, Galangal | fish, Chicken |
| Fenugreek | Chili, Curry Leaves, Fennel, Garlic, Cumin | spinach, Yams |
| Southernwood | Anise, Borage, Garlic, Mint, Pepper | roasts, Quark, sauces |
| Ginger | Basil, Clove, Cardamom, Garlic, Coriander | many varieties |
| Turmeric | Fenugreek, Chili, Curry Leaves, Fennel, Galangal | Potatoes, beans, cauliflower |
| Lovage | Dill, Garlic, Coriander, Caraway, Bay Leaf | Soups, salads |
| Nutmeg and mace | Dill, Cardamom, Cilantro, Coriander Seeds, Cubeb Pepper | Vegetables, Soups, Sauce Béchamel |
| Tamarind | Chili, Curry Leaves, Galangal, Ginger, Garlic |  |
| Barberry | Cumin, Long Pepper, Orange Peel, Allspice, Pistachios | Rice, Chicken, game |
| Cranberry | Chili, Clove, Ginger, Cardamom, Garlic | fruit salads, baking |
| Tarragon | Anise, Basil, Dill, Fennel, Chervil | poultry, rabbit, game |
| Coriander Seeds | Basil, Savory, Ginger, Bay Leaf, Marjoram | Carrots, Lentils |
| Caraway | Savory, Dill, Fennel, Garlic, Coriander | cabbage dishes, hearty braised dishes, fried potatoes |
| Pepper | Basil, Clove, Cardamom, Garlic, Caraway | roasted dishes, braised dishes, grilled meat |
| Sage | Savory, Ginger, Garlic, Caraway, Lovage |  |
| dried tomatoes | Basil, Chili, Cloves, Capers, Garlic |  |
| Juniper | Fennel, Clove, Garlic, Bay Leaf, Marjoram | game, Sauerkraut, beef |
| Lemon | Chili, Dill, Fennel, Garlic, Cumin | fish, poultry, light meat |
| Bitter Almond | Basil, Bergamot, Cumin, Bay Leaf, Rose | olive oil, Coffee |
| Savory | Basil, Cumin, Lavender, Bay Leaf, Marjoram | Cabbage, Potatoes, Zucchini |
| Fennel | Anise, Fenugreek, Chervil, Caraway, Lavender | roast pork, Vegetables, Ragouts |
| Cumin | Fenugreek, Curry Leaves, Fennel, Cocoa, Coriander | Cabbage |
| Long Pepper | Basil, Clove, Ginger, Oregano, Allspice | game, red cabbage |
| Bay Leaf | Basil, Cloves, Marjoram, Oregano, Parsley |  |
| Paprika | Fenugreek, Chili, Ginger, Coffee, Garlic | Onion, all meats, Potatoes |
| Allspice | Anise, Basil, Fennel, Clove, Bay Leaf | braised dishes (beef, game), liver |
| arugula | Basil, Borage, Dill, Garlic, Cress | leaf salad, cured ham, Potatoes |
| Thyme | Basil, Capers, Garlic, Bay Leaf, Marjoram | sauces, stews, Soups |
| Raisin | Chili, Dates, Garlic, Coriander, olives | pastries, bread, cucumbers |
| Anise | Basil, Tarragon, Fennel Seeds, Chervil, Nutmeg | Spirits, Liqueurs, oranges |
| Bergamot | Chili, Kaffir Lime Leaves, Cardamom, Turmeric, Thyme | tea, stews, Curry |
| Chili | Amchoor, Asafoetida, Cranberry, Galangal, Oregano | stews, Soups |
| Dates | Ginger, Lime, Mint, nuts, Orange Blossom Water | marzipan, Chocolate, bread |
| Clove | Basil, pomegranate seeds, Long Pepper, Bay Leaf, Nutmeg | dark sauces, braised dishes, game |
| Garlic | Asafoetida, Basil, Ginger, Coriander, Cumin | almost everything, e.g. fish, meat |
| Coconut | Chili, Fenugreek, Clove, Ginger, Cumin | baked goods, Fruit, Vegetables |
| Mint | Basil, Fenugreek, Chili, Dill, Ginger | Fresh: eggplants, Carrots, peas |
| Nigella | Savory, Fennel, Ginger, Cardamom, Garlic | bread |
| oranges | Coffee, Cocoa, Garlic, Coriander, Poppy Seed | duck, dark meat in braised dishes |
| Parsley | Dill, Garlic, Cilantro, Cress, Cumin | sauces, salads, marinades |
| chanterelles | Basil, Chili, Garlic, Coriander Seeds, olives and oil | meat, fish, Shrimps |
| Rosemary | Savory, Garlic, Lavender, Bay Leaf, Marjoram | eggplants, Zucchini, squash |
| Porcini | Garlic, olives and oil, Parsley, Star Anise, Onion | Pasta, meat, Potatoes |
| Sumac | Chili, Pomegranate, Garlic, Marjoram, Mint | poultry, meat (roast, grilled |
| Dried Apricots | Cardamom, Coriander, Cumin, Turmeric, Pepper | lamb, beef, braised dishes |

*(If a row disagrees with `ingredients.json`, trust the file.)*

## Triggers

- Seasoning, herbs, spices, “what goes with…”, flavor pairing, Aroma Bible, under-seasoned recipe, `aroma.html`, `aroma-hints.js`.
