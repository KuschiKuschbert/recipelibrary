# Riviera Component Module Library v1

**Status:** Working source addendum for Riviera SOP Master Index v6  
**Date:** 2026-06-08  
**Use for:** Fast event prep sheets, production sheets, ordering, quantity checks, food-only run sheets, shared-prep allocation, recipe cards and dispatch checks.

---

## 0. Purpose

This module library turns repeat Riviera items into reusable production blocks.

Use it after reading an event dump but before writing the prep sheet.

The goal is simple:

```text
Event item -> correct module -> exact count -> prep card -> order hook -> dispatch check
```

This prevents the same logic being rebuilt every time.

---

## 1. Module selection rule

Before applying a module, identify the actual product format.

Do not assume that similar wording means the same production item.

Examples:

```text
Corporate fruit box != styled seasonal fruit platter
Grazing box != 1 m grazing table
Seated function focaccia != sliced focaccia box
Corporate sandwich platter != lunch box sandwich component
Hot nibble platter != mixed hot nibble box unless the source confirms mixed
```

If the source wording is unclear, mark:

```text
NEEDS CONFIRMATION — product format unclear
```

---

## 2. Standard module format

Each module should contain:

```text
MODULE NAME:
USE WHEN:
BASE YIELD / UNIT:
COUNT LOGIC:
PRODUCTION CARD:
SEASON / FINISH:
PACK / SERVICE:
DIETARY / ALLERGEN FLAGS:
ORDERING HOOK:
```

Keep production cards food-only and owner-first when they go into a prep sheet.

---

# CORE MODULES

---

## 3. Scones — locked Riviera batch

**USE WHEN:** Scone platter, morning tea, wake catering, corporate catering, high tea, baby shower.

**BASE YIELD:** 12 normal scones.

**INGREDIENTS:**

```text
Scone mix — 1080 g
Water — 600 ml
```

**PRODUCTION CARD:**

```text
ASH | Make **scones** — 12 pieces per batch

Mix scone mix and water in mixer. Do not overmix.
Rest 5 minutes.
Shape and tray.
Bake 200°C for 12 minutes.
Drop oven to 160°C and bake another 10 minutes.
Cool before packing.
```

**PACK / SERVICE:** Pack with jam and Chantilly cream where ordered.

**DIETARY / ALLERGEN FLAGS:** Contains gluten/wheat and dairy from scone mix unless supplier source says otherwise.

**ORDERING HOOK:**

```text
Batches required = total scones / 12
Scone mix required = batches x 1.08 kg
Water required = batches x 600 ml
Jam / cream by platter count
```

---

## 4. House focaccia — standard dough

**USE WHEN:** Grazing, offsite, casual delivery, tapas, seated bread service.

**BASE DOUGH:** Approx. 4.6 kg dough at 75% hydration.

**INGREDIENTS:**

```text
Bread flour — 2400 g
Water — 1800 g
Sourdough starter — 300 g
Instant dry yeast — 15 g
Fine sea salt — 50 g
Olive oil — 50 ml
Honey — 30 g
```

**PRODUCTION CARD:**

```text
ASH | Start **focaccia dough**

Mix water, starter, honey and yeast. Add flour.
Mix low 3 minutes.
Rest 15 minutes.
Add salt and olive oil.
Mix medium 6–8 minutes until smooth/stretchy.
Bulk 45 minutes. Fold.
Rest 45 minutes. Fold again.
Overnight cold proof.

Next day: oil trays, portion cold dough, coat with oil, proof 1–2 hours.
Dimple when puffy.
Bake Rational 220°C, 0% steam, 20–25 minutes.
Drop to 190°C, 0% steam, 10 minutes until golden/crisp.
De-tray and cool on racks.
```

**COUNT LOGIC:**

```text
Casual / delivery / grazing sliced focaccia box = 12 pieces
Seated dinner focaccia = table bread with whipped butter, not piece-counted boxes
1 m grazing table = 1/4 tray sliced focaccia
2 m grazing table = 1/2 tray sliced focaccia
Every grazing box includes focaccia
```

**ORDERING HOOK:** Bread flour, yeast, olive oil, honey, salt, butter if seated service.

---

## 5. Styled seasonal fruit platter / fruit box

**USE WHEN:** Source says seasonal fruit platter, fruit platter, styled fruit box, wake platter fruit, baby shower styled fruit.

**BASE YIELD:** 1 platter / box.

**STANDARD QUANTITY:**

```text
Baby watermelon — 1/2
Pineapple — 1/4
Papaya — 1/2
Kiwi — 2
Grapes — 1/4 vine
Apples — 3
Oranges — 2
Blueberries — 10
Blackberries — 4
Strawberries — 4
Passionfruit — 1
Honeydew or rockmelon — 1/4
Edible flowers — 3
Mint — garnish
Toasted shredded coconut — finish
```

**PRODUCTION CARD:**

```text
ASH | Build **styled seasonal fruit platter** — 1 platter

Cut fruit cleanly. Keep colours separated and high.
Finish with passionfruit, mint, edible flowers and toasted coconut.
```

**SEASON / FINISH:** Lime or passionfruit only if it suits the event and does not shorten holding quality.

**ORDERING HOOK:** Multiply fruit standard by platter count.

---

## 6. Corporate fruit box / corporate fruit component

**USE WHEN:** Corporate breakfast/brunch item says fruit box, seasonal fruit for pax, fruit salad/yoghurt, packed fruit component.

**DO NOT USE:** Full styled fruit platter standard unless source confirms styled platter.

**COUNT LOGIC:** Based on pax count and packaging format.

**WORKING PORTION GUIDE:**

```text
Packed cut fruit component — 120–150 g fruit per person
Fruit + yoghurt cup — 120 g fruit + 100–150 g yoghurt per person
Breakfast box fruit garnish/component — 80–120 g fruit per person
```

**PRODUCTION CARD:**

```text
ASH | Build **corporate fruit boxes** — pax count as ordered

Cut clean breakfast fruit.
Pack as corporate component, not decorative platter.
Keep wet fruit controlled.
Add yoghurt only if ordered.
```

**ORDERING HOOK:** Watermelon, rockmelon/honeydew, pineapple, grapes, berries, yoghurt if ordered.

**NEEDS CONFIRMATION:** Exact cup/box format if not supplied.

---

## 7. 30 cm x 40 cm grazing box

**USE WHEN:** Grazing box / 30 cm x 40 cm box / wake platter grazing box / offsite platter grazing box.

**BASE YIELD:** 1 grazing box, approx. 12 pax platter-style.

**WORKING V1 QUANTITY:** Calibrate after next real box if needed.

```text
Brie — 1 small wheel or 1/2 large wheel
Blue cheese — 100–150 g
Aged cheddar / black-coated cheese — 150–200 g
Prosciutto — 150–200 g
Salami — 150–200 g
PC olives — 250 ml
Dip — 200–250 ml
Grapes — 1/4 vine
Dried apricots/dates — 100 g
Crackers/lavosh — 1 packet or box-fit amount
Focaccia — included, sliced, box-fit amount
Seasonal fruit/garnish — small box-fit amount
Dried citrus / herbs / edible flowers — garnish only
```

**PRODUCTION CARD:**

```text
ASH | Build **30 x 40 grazing box** — 1 box

Portion cheese, deli meats, olives, dip, grapes, dried fruit, crackers and focaccia.
Build with height, clean sections and easy guest access.
Finish restrained: grapes, dried citrus, herbs/flowers where suitable.
```

**DIETARY / ALLERGEN FLAGS:** Gluten/wheat from crackers/focaccia unless GF substitution; dairy; may contain nuts; deli meat; olives; dip allergens depend on dip.

**ORDERING HOOK:** Cheese, deli meats, olives, dip, crackers, focaccia, grapes, dried fruit, garnish.

---

## 8. 1 m grazing table

**USE WHEN:** 1 metre grazing table.

**BASE YIELD:** Approx. 40 pax / 1 metre.

**STANDARD QUANTITY:**

```text
Blue cheese — 1/2 big wheel
Brie — 2 wheels
Aged cheddar / black-coated cheese — 1/2 block
Prosciutto — 1 x 1000 ml PC
Salami — 1 x 1000 ml PC
PC olives — 1 x 1000 ml PC
Grapes — 1 vine
Crackers — 2 varieties
Bread / focaccia — 1/4 tray sliced focaccia
Dried apricots/dates — as needed
Dip — 1
Dried citrus garnish — as needed
```

**PRODUCTION CARD:**

```text
ASH | Portion **1 m grazing table** into PC containers

Portion cheeses, deli meats, olives, crackers, focaccia, grapes, dried fruit, dip and garnish into event PCs.
Keep setup fast and separated by item.
Do not build loose from bulk stock onsite.
```

**PACK / SERVICE:** All offsite graze items portioned into PC containers for the event.

**ORDERING HOOK:** Multiply standard by metre count.

---

## 9. 2 m grazing table

**USE WHEN:** 2 metre grazing table / approx. 75 pax.

**COUNT LOGIC:** Roughly double 1 m standard.

**STANDARD QUANTITY:**

```text
Blue cheese — 1 big wheel or equivalent
Brie — 4 wheels
Aged cheddar / black-coated cheese — 1 block
Prosciutto — 2 x 1000 ml PC
Salami — 2 x 1000 ml PC
PC olives — 2 x 1000 ml PC
Grapes — 2 vines
Crackers — 4 varieties/pack equivalents
Focaccia — 1/2 tray sliced focaccia
Woolworths fresh bread loaves — 3 if applicable
Dried apricots/dates — as needed
Dips — 2
Dried citrus garnish — as needed
```

**PRODUCTION CARD:**

```text
ASH | Portion **2 m grazing table** into PC containers

Portion all graze items into event PCs.
Keep cheeses, meats, olives, dips, fruit, crackers and focaccia separate for clean setup.
```

---

## 10. Sandwich platter

**USE WHEN:** Sandwich platter, mixed classic sandwiches, wake/corporate delivery.

**BASE UNIT:** 1 platter = 24 points / 6 whole sandwiches cut into quarters unless event source says otherwise.

**DEFAULT FILLINGS WHEN UNSPECIFIED:** Use Riviera/tapas-style balanced selection.

```text
Ham / aged cheddar / Dijon emulsion
Roast beef / horseradish cream / rocket
Smoked chicken / bacon dill sour cream / toasted almond / rocket
Roast pumpkin / feta / pesto / rocket
```

**PRODUCTION CARD:**

```text
ASH | Make **sandwich platter** — 24 points

Make 6 whole sandwiches.
Use filling quick-view only in quantity section.
Cut into quarters.
Pack clean and tight.
```

**DIETARY ACTION:** If GF guest is present, specify GF sandwich substitute count.

**ORDERING HOOK:** Bread slices, fillings, spreads, garnish, GF bread if required.

---

## 11. Wrap platter

**USE WHEN:** Premium wraps, corporate lunch wraps, mixed filled wraps.

**BASE UNIT:** 12 wraps unless source states otherwise.

**DEFAULT FILLINGS WHEN UNSPECIFIED:**

```text
Smoked chicken / bacon dill sour cream / almond / rocket
Roast pumpkin / feta / pesto / spinach
Roast beef / beetroot relish / Jarlsberg / rocket
Grilled halloumi / pumpkin / pesto / rocket
```

**PRODUCTION CARD:**

```text
ASH | Make **wrap platter** — 12 wraps

Lay wraps, spread evenly, fill tightly, roll firm.
Cut only if service format requires.
Pack to prevent sogging.
```

**ORDERING HOOK:** Wraps, proteins, cheese, relishes/sauces, leaves, GF wraps if required.

---

## 12. Ham cheddar croissants

**USE WHEN:** Ham & cheese croissants, savoury filled croissants.

**BASE UNIT:** 12 croissants / box or platter unless source says otherwise.

**FILLING:** Smoked ham, aged cheddar, Dijon emulsion.

**PRODUCTION CARD:**

```text
ASH | Make **ham cheddar croissants** — 12 pieces

Split croissants cleanly.
Fill with ham, aged cheddar and Dijon emulsion.
Pack so croissants stay intact.
```

**DIETARY ACTION:** For GF guest, specify GF sandwich/wrap substitute unless GF croissant is confirmed available.

---

## 13. Mixed mini brioche rolls

**USE WHEN:** Filled brioche rolls, mini brioche rolls, lunch box rolls.

**BASE UNIT:** 12 rolls unless source says otherwise.

**DEFAULT FILLINGS WHEN UNSPECIFIED:**

```text
Smoked chicken / bacon / almond / rocket
Chicken schnitzel / slaw
Roast beef / beetroot relish / Jarlsberg / rocket
Grilled halloumi / pesto / pumpkin
```

**PRODUCTION CARD:**

```text
ASH | Make **mixed brioche rolls** — 12 pieces

Fill in clear flavour sets.
Keep saucing controlled.
Pack tight with filling labels only if needed for dietaries/allergens.
```

---

## 14. Mixed hot nibble box

**USE WHEN:** Mixed hot nibble box/platter.

**BASE UNIT:** 48 pieces total.

**STANDARD SPLIT:**

```text
Party pies — 12
Sausage rolls — 12
Mini quiches — 12
Spinach ricotta pastizzis — 12
```

**PRODUCTION CARD:**

```text
ASH | Tray **mixed hot nibbles** — 48 pieces
DAN | Fire **mixed hot nibbles** close to send

Tray by item.
Reheat/fire until hot through and pastry crisp.
Season/finish while hot if suitable.
Pack into hot box.
```

**DIETARY ACTION:** GF hot nibble box uses confirmed bought-in GF pies/sausage rolls first.

---

## 15. Single hot nibble platter

**USE WHEN:** Single item hot nibble platter: sausage rolls, pies, mini quiche, pastizzis.

**BASE UNIT:** 24 pieces working kitchen standard unless source count overrides.

**PRODUCTION CARD:**

```text
ASH | Tray **single hot nibble platter** — 24 pieces
DAN | Fire **single hot nibble platter** close to send

Tray item. Fire hot and crisp.
Pack sauce separately if required.
```

---

## 16. GF hot nibble box

**USE WHEN:** Coeliac/GF hot nibble substitute.

**RULE:** Use confirmed bought-in GF pies and GF sausage rolls from Woolworths first before in-house backup.

**PRODUCTION CARD:**

```text
ASH | Tray **GF hot nibble box** — exact count required
DAN | Fire **GF hot nibble box** separately

Use confirmed GF bought-in items first.
Keep separate from gluten pastry items.
Pack separately.
```

**NEEDS CONFIRMATION:** Exact bought-in GF item count if stock is unknown.

---

## 17. Herbed labneh

**USE WHEN:** Chicken skewers, grazing, dips, Mediterranean sauces, canapés.

**PRODUCTION CARD DAY 1:**

```text
ASH | Start **labneh** — hang yoghurt overnight

Line chinois/cloth.
Hang yoghurt overnight in fridge/coolroom.
```

**PRODUCTION CARD DAY 2:**

```text
ASH | Finish **herbed labneh**

Fold hung yoghurt with lemon, herbs, olive oil and seasoning.
Add garlic only where suitable.
Taste and adjust salt/acid.
Portion for event.
```

**SEASON / FINISH:** Lemon zest/juice, parsley, mint/dill, olive oil, salt. Garlic if suitable.

**DIETARY / ALLERGEN FLAGS:** Dairy.

---

## 18. Zesty limoncello chicken skewers

**USE WHEN:** Tapas chicken skewers, canapés, offsite skewers.

**MARINADE STANDARD:** Limoncello, honey, lemon, garlic, oregano/thyme, olive oil.

**PRODUCTION CARD:**

```text
DAN | Marinate **zesty limoncello chicken skewers**

Marinate chicken with limoncello, honey, lemon zest/juice, garlic, oregano/thyme and olive oil.
Skewer evenly.
Cook/grill for service.
Finish with herbed labneh, feta and herbs where ordered.
```

**DIETARY ACTION:** For dairy-free, serve without labneh/feta; use herb oil/lemon finish.

---

## 19. Arancini — production / service module

**USE WHEN:** Chorizo & mozzarella arancini, canapé arancini, tapas arancini.

**REFERENCE YIELD:** 80 large / 100 g source batch from recipe library.

**PRODUCTION CARD:**

```text
ASH | Roll **arancini** — count required

Portion rice mix evenly.
Crumb using required coating setup.
Freeze solid before bagging/sealing.
Do not vacuum hard; seal only if needed to avoid crushing.
```

**SERVICE CARD:**

```text
DAN | Fire **arancini**

Pull from freezer to fridge/coolroom 2 days before service when frozen.
Fry until hot through and crisp.
Season with salt immediately after frying.
Serve with romesco and aioli as menu requires.
```

**DIETARY / ALLERGEN FLAGS:** Check crumb/flour, dairy, egg, meat depending recipe.

---

## 20. Calamari fritti module

**USE WHEN:** Tapas calamari, calamari canapé/box.

**PRODUCTION CARD:**

```text
ASH | Portion **calamari fritti prep**

Portion calamari/octopus into service PCs as required.
Prepare GF flour mix.
Drain capers and hold dry for frying.
```

**SERVICE CARD:**

```text
DAN | Fire **calamari fritti**

Coat calamari in flour mix.
Fry fast until crisp and cooked.
Season immediately while hot.
Finish with aioli and crispy capers.
```

**SEASON / FINISH:** Lemon, salt, aioli, crispy capers, herbs if suitable.

**DIETARY / ALLERGEN FLAGS:** Seafood; fryer cross-contact risk; sauce allergens depend on aioli.

---

## 21. Friday Tapas freezer pull

**USE WHEN:** Prep window includes Sunday Tapas.

**PRODUCTION CARD:**

```text
ASH | Pull **Sunday Tapas frozen prep** to fridge/coolroom

Pull required frozen tapas items Friday for Sunday service.
Allow 2 days fridge/coolroom thaw.
Check arancini, calamari, skewers, madeleines/cannoli prep and other frozen mise as required.
```

**NOTE:** Write as a prep action only. Do not write policy wording inside the sheet.

---

## 22. Roscoes cryovac run

**USE WHEN:** Offsite proteins or suitable protein prep need cryovac.

**PRODUCTION CARD:**

```text
DAN or ASH | Cryovac **event proteins** at Roscoes — allow 30 minutes

Pack protein bags ready.
Leave Riviera, seal bags at Roscoes, return.
Keep event allocation clear.
```

**RULES:**

```text
Steaks — marinate and cryovac, do not pre-cook unless event plan says so.
Roast chicken/lamb/large proteins — brine or marinate.
Offsite suitable proteins — cryovac where practical.
Non-steak cryovac items — pre-cook one day in advance where suitable.
```

---

## 23. Offsite sous-vide bain reheat

**USE WHEN:** Offsite catering with cryovacced hot food.

**PRODUCTION CARD:**

```text
DAN | Reheat **cryovacced offsite items** in sous-vide bains

Bring sous-vide bains to required temp.
Reheat sealed bags until hot through.
Hold controlled for offsite service.
Open and finish only when service requires.
```

**NEEDS CONFIRMATION:** Exact temperature/time if item-specific temp is not known.

---

## 24. Dietary close-to-menu alternative

**USE WHEN:** Any allergy/dietary affects production.

**RULE:** Stay as close as safely possible to the actual meal.

Examples:

```text
GF/DF chicken plate — same chicken profile, no cream/dairy/gluten, use lemon herb oil.
Garlic/onion allergy — same dish without garlic/onion, 1 extra portion.
Pescatarian alternate — fish/seafood aligned with same sides/sauce style where possible.
GF sandwich substitute — GF sandwich/wrap instead of standard croissant unless GF croissant confirmed.
```

**PRODUCTION CARD:**

```text
DAN | Make **dietary alternate** — exact guest count + buffer if needed

Keep as close to main dish as safely possible.
Remove unsafe component only where practical.
Season properly with safe acid, herbs, oil, relish or sauce.
Pack/plate separately where required.
```

---

## 25. Ready-to-send gate — delivery

**USE WHEN:** Any delivery catering.

**CARD:**

```text
BOTH | Send **delivery order**

Count all food against quantity check.
Hot food fired / held.
Cold food packed.
Sauces packed.
Dietary packed separately.
Focaccia included if required.
Driver has delivery time/location/handoff name if supplied.
```

---

## 26. Ready-to-send gate — offsite buffet

**USE WHEN:** Offsite buffet / carvery / hot catering.

**CARD:**

```text
BOTH | Send **offsite buffet**

Proteins cryovacced / bains ready.
Sous-vide reheat plan clear.
Sauces hot/cold packed.
Dietary alternate separated.
Graze PC containers packed if applicable.
Serving gear packed if required.
Use only this event's allocation.
```

---

## 27. Ready-to-serve gate — plated / onsite

**USE WHEN:** Plated dinner, seated function, wedding reception.

**CARD:**

```text
DAN | Call **ready-to-serve plated menu**

Protein count checked.
Dietary plates separated.
Sauces hot and balanced.
Sides hot/ready.
Garnish ready.
Focaccia/table bread ready if included.
Pass timing confirmed against food times.
```

---

## 28. Debrief module

**USE WHEN:** After any real event.

```text
POST-EVENT 2-MINUTE DEBRIEF:
- What ran short:
- What was overordered:
- What took too long:
- What was unclear on the sheet:
- What needs a new module:
- What should be locked into SOP/module library:
```
