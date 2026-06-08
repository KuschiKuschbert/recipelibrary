# Riviera Count & Ordering Harness v1

**Status:** Working source addendum for Riviera SOP Master Index v6 and Component Module Library v1  
**Date:** 2026-06-08  
**Use for:** Event quantity checks, production buffers, alternate-drop counts, platter counts, supplier order translation, and missing-info checks.

---

## 0. Purpose

This harness turns messy event quantities into:

```text
prep count -> production count -> supplier order count -> dispatch check
```

It should be used before writing the final production sheet.

---

## 1. Count workflow

```text
1. Identify event type and service style.
2. Identify exact food/product format.
3. Pull the correct module.
4. Apply guest count / platter count / piece count.
5. Apply dietaries as food actions.
6. Apply 9% production buffer where relevant.
7. Convert to prep count.
8. Convert to supplier order count.
9. Mark already in-house / ordered / still needed / needs confirmation.
```

---

## 2. Product format check

Before calculating, choose the product format.

```text
Fruit:
- Corporate fruit box / packed fruit component
- Fruit cup
- Fruit + yoghurt cup
- Styled seasonal fruit platter
- Grazing box fruit
- Grazing table fruit

Bread:
- Casual sliced focaccia box
- Grazing table focaccia
- Grazing box focaccia
- Seated table bread focaccia + whipped butter

Hot food:
- Single hot nibble platter
- Mixed hot nibble box
- GF hot nibble box
- Tapas service item
- Offsite buffet protein
- Plated alternate-drop protein
```

If unclear:

```text
NEEDS CONFIRMATION — product format unclear
```

---

## 3. 9% buffer rule

Default production buffer:

```text
Production count = required count x 1.09
Round practically by item.
```

Use for:

```text
- Plated meals
- Buffet serves
- Canapés
- Hot nibbles where production is not fixed by platter module
- Protein portions
- Dietary alternates where failure risk is high
```

Do not blindly use for:

```text
- Fixed purchased unit boxes where exact units already include enough
- Tiny expensive garnish items
- Client-confirmed exact-count premium items unless buffer approved
- Scone platters / fruit platters / grazing boxes where module count already controls output
```

---

## 4. Alternate-drop count logic

Use when two plated mains are served alternate drop.

```text
1. Start with confirmed guest count.
2. Add 9% production buffer.
3. Identify dietary/allergy alternatives.
4. Subtract dietary/allergy alternatives from buffered total.
5. Split remaining standard mains evenly.
6. If odd number, give the extra serve to the safer/easier main unless user specifies.
7. Reduce both normal meals equally where practical.
```

Example:

```text
72 guests x 1.09 = 78.48 -> 79 total serves
Dietaries = 4
Standard mains = 75
Chicken = 38
Beef = 37
Dietary alternates = 4
Total production = 79
```

---

## 5. Canapé count logic

```text
Total pieces = guest count x pieces per guest
Apply 9% buffer if production is in-house and not fixed by purchased count.
Split by canapé item.
Round to tray/fryer/service practical numbers.
```

If package says choose 4 / 6 / 8 canapés, count by package structure and confirmed service style.

---

## 6. Hot nibble count logic

Working kitchen standards:

```text
Single hot nibble platter = 24 pieces
Mixed hot nibble box/platter = 48 pieces total
Mixed hot nibble split = 12 each of 4 items
```

If source gives 20–25 pieces or 40–50 pieces, convert into the working kitchen count for prep sheets:

```text
20–25 -> 24 pieces
40–50 -> 48 pieces
```

GF hot nibbles:

```text
Use confirmed bought-in GF pies/sausage rolls first.
Exact GF count must be shown separately.
```

---

## 7. Scone count logic

```text
1 batch = 12 normal scones
1 platter = 12 scones unless source says otherwise
Scone mix per batch = 1080 g
Water per batch = 600 ml
```

Formula:

```text
Batches = total scones / 12
Scone mix = batches x 1.08 kg
Water = batches x 600 ml
```

---

## 8. Focaccia count logic

```text
Casual/delivery/grazing sliced focaccia box = 12 pieces
Seated dinner focaccia = table bread with whipped butter
1 m grazing table = 1/4 tray focaccia sliced
2 m grazing table = 1/2 tray focaccia sliced
Every grazing box includes focaccia
```

If focaccia appears anywhere, it must appear in prep and order checks.

---

## 9. Fruit count logic

### Styled seasonal fruit platter

Use full standard fruit platter module per platter.

### Corporate fruit box / packed fruit component

Do not use full styled fruit platter module.

Working portion guide:

```text
Packed cut fruit component = 120–150 g fruit per pax
Fruit + yoghurt cup = 120 g fruit + 100–150 g yoghurt per pax
Breakfast box fruit garnish/component = 80–120 g fruit per pax
```

Mark NEEDS CONFIRMATION if box/cup format is unclear.

---

## 10. Sandwich / wrap / croissant / brioche count logic

Default units:

```text
Sandwich platter = 24 points / 6 whole sandwiches cut into quarters
Wrap platter = 12 wraps unless source says otherwise
Croissant box/platter = 12 croissants unless source says otherwise
Mini brioche roll box/platter = 12 rolls unless source says otherwise
```

When fillings are not specified:

```text
Use Riviera/tapas-based balanced fillings.
Show compact filling summary near top.
Include exact filling recipes/methods in production cards where needed.
```

Dietary substitution:

```text
GF guest + croissants = specify GF sandwich/wrap substitute unless GF croissant confirmed.
GF guest + sandwiches/wraps = make separate GF sandwich/wrap count.
DF guest = remove dairy component and use safe sauce/relish/herb oil.
```

---

## 11. Grazing count logic

### 30 x 40 cm grazing box

Use grazing box module. Every grazing box includes focaccia.

### 1 m grazing table

Use 1 m standard.

### 2 m grazing table

Use 2 m standard.

Offsite graze rule:

```text
All graze items must be portioned into PC containers for the event.
Do not build from bulk stock onsite.
```

---

## 12. Frozen thawing rule

```text
Frozen items that need thawing must be pulled from freezer to fridge/coolroom 2 days before use.
```

Use wording:

```text
Pull from freezer to fridge/coolroom 2 days before use.
```

Do not write:

```text
Thaw in freezer
Thaw day before
```

---

## 13. Cryovac / offsite hot food logic

```text
Steaks = marinate and cryovac. Do not pre-cook unless event plan says so.
Roast chicken/lamb/large proteins = brine or marinate.
Offsite suitable proteins = cryovac where practical.
Non-steak cryovac items = pre-cook one day in advance where suitable.
Cryovac happens at Roscoes.
Allow 30 minutes for Dan or Ash to leave Riviera, seal bags at Roscoes and return.
Offsite cryovacced items = sous-vide cooked/reheated and held/reheated in sous-vide bains.
```

If exact sous-vide temperature/time is missing:

```text
NEEDS CONFIRMATION — sous-vide time/temp not locked for this item
```

---

## 14. Supplier ordering translator

After count logic, split into supplier buckets.

```text
DOBLO'S:
Fresh produce, herbs, fruit, vegetables, edible flowers, potatoes, greens.

BIDFOOD:
Dry goods, dairy, bakery, frozen, desserts, meat/fish/finger foods where listed, cleaning/packaging where listed.

WOOLWORTHS / RETAIL:
Backup GF products, urgent small packs, fresh bread loaves, retail-only items.

ALREADY IN HOUSE:
Items confirmed in stock or already prepped.

NEEDS CONFIRMATION:
Pack sizes, allergens, supplier availability, exact product format, missing guest count/menu/dietary.
```

---

## 15. Order list format

Use this order for production documents:

```text
ORDER LIST

DOBLO'S — DELIVERY
- Item — quantity — event/use note

BIDFOOD
- Item — quantity — event/use note

WOOLWORTHS / RETAIL
- Item — quantity — event/use note

ALREADY ORDERED / IN HOUSE
- Item — status

NEEDS CONFIRMATION
- Item — what needs confirming
```

Default Doblo's method: delivery.

---

## 16. Missing-info detector

Run this before finalising any event sheet.

```text
CRITICAL MISSING INFO:
- Date?
- Delivery/service time?
- Guest count?
- Event location?
- Menu/product format?
- Dietaries/allergies?
- Hot holding/reheat needed?
- Offsite power/water/prep space if relevant?
- Driver/delivery handoff if delivery?
- Supplier order status?
```

Only include missing info in the sheet if it affects food, delivery or service.

---

## 17. Sheet QA gate

Before exporting a prep sheet/PDF:

```text
- Quantities before Food Times?
- Correct module used?
- No fruit-format confusion?
- Dietaries turned into food actions?
- Focaccia counted where required?
- Sauce/dessert recipes included where needed?
- Dan/Ash owner-first cards present?
- Shared prep has allocation line?
- Coldroom/allocation block included for multi-event week?
- Order list split by supplier?
- Ready-to-send gate included?
- No admin clutter?
- Card frames consistent?
```
