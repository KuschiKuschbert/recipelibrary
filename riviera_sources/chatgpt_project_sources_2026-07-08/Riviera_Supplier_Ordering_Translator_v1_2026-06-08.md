# Riviera Supplier Ordering Translator v1

**Status:** Active source addendum for Riviera SOP Master Index v6  
**Date:** 2026-06-08  
**Use for:** Turning prep quantities into supplier orders, purchase checks, already-ordered lists and missing-item flags.

---

## 0. Purpose

This translator turns event prep into orderable supplier buckets.

It should answer:

```text
What do we need?
How much?
Which supplier?
What pack size?
Already ordered or still needed?
What is missing or unclear?
What is over-order risk?
```

Do not invent prices. Use source pricing where available. Mark missing pricing as price not found in current source.

---

## 1. Supplier bucket order

Every order list should separate:

```text
DOBLO'S — produce / herbs / fruit / vegetables
BIDFOOD — dry goods / dairy / bakery / frozen / desserts / meat / fish / finger foods / cleaning / packaging
WOOLWORTHS / COLES — small retail top-ups / urgent specialty / GF bought-in items when already used as standard
BUTCHER / SEAFOOD / SPECIALTY — if source or user specifies
ALREADY ORDERED
STILL NEEDED
NEEDS CONFIRMATION
```

Doblo's default order method is delivery.

---

## 2. Ordering workflow

```text
1. Identify event and menu.
2. Resolve product format before applying module.
3. Calculate prep count.
4. Add 9% production buffer where relevant.
5. Add dietary alternates inside production count.
6. Convert to ingredient requirement.
7. Convert ingredient requirement to supplier pack/order size.
8. Split by supplier.
9. Flag already ordered / still needed / missing.
10. Check allergens where supplier data exists.
```

---

## 3. Count-to-order rules

### Scones

```text
12 scones = 1080 g scone mix + 600 ml water
```

Order logic:

```text
Total scones / 12 = batch count
Batch count x 1080 g = scone mix required
Round scone mix to available pack size
Add jam + cream unless already in house or event says otherwise
```

### Focaccia

```text
Casual/delivery/grazing/offsite/corporate: sliced focaccia box = 12 pieces
Seated plated dinner: focaccia with whipped butter, not sliced-box logic
1 m graze = 1/4 tray sliced focaccia
Every grazing box includes focaccia
```

Order/prep logic:

```text
If focaccia is required, show it in prep and ordering.
Do not assume stock.
If baking in-house, order flour/yeast/oil/honey/salt if short.
```

### Hot nibbles

```text
Single hot nibble platter = 24 pieces
Mixed hot nibble box/platter = 48 pieces
Mixed split = 12 pieces each of 4 items
```

Order logic:

```text
Total boxes x 12 = pieces per item for mixed box
Check frozen item pack size
Round up to pack size
GF hot nibbles: use confirmed GF bought-in pies/sausage rolls first
```

### Alternate-drop plated mains

```text
Guest count + 9% buffer = total production target
Dietaries included in total
Normal mains reduced evenly to account for dietary alternates
```

Example:

```text
72 guests + 9% = 79 serves
4 dietary serves
75 normal serves remaining
Chicken 38 / Beef 37
```

### Canapés

```text
Confirm pieces per person or package count.
If unclear, NEEDS CONFIRMATION.
Do not assume canapés replace dinner unless source says so.
```

---

## 4. Product-format detector

Before ordering, identify the exact product type.

### Fruit

```text
Corporate fruit box / pax-based fruit = packed corporate fruit component
Fruit cup = individual fruit cups
Seasonal cut fruit bowl = bulk bowl
Styled seasonal fruit platter = full Riviera fruit platter standard
Grazing box fruit = graze garnish/component
Grazing table fruit = graze garnish/component
Breakfast fruit + yoghurt = corporate breakfast item
```

Do not apply styled fruit platter ordering to corporate fruit boxes unless the source says styled fruit platter.

### Bread / bakery

```text
Sliced focaccia boxes = casual/delivery/grazing/corporate
Focaccia with whipped butter = seated/plated formal
Croissants = breakfast/morning tea/lunch package item
Mini croissants = morning/afternoon tea item
Brioche rolls = finger-food/lunch option
Sandwich platter = 6 whole sandwiches cut into 24 points unless source says otherwise
Wrap platter = 12 wraps unless source says otherwise
```

---

## 5. Doblo's produce bucket

Use Doblo's for produce where available and practical.

Typical Doblo's items:

```text
Fruit for fruit platters/boxes
Grapes for graze
Lemons / limes / oranges
Herbs: dill, parsley, mint, oregano, thyme, tarragon if available
Leaf: rocket, lettuce, spinach
Vegetables: pumpkin, potatoes, broccolini/baby broccoli, tomatoes, onions
Edible flowers
```

Order format:

```text
DOBLO'S — DELIVERY — [DATE]
- Item — quantity — event/use note
```

Example:

```text
DOBLO'S — DELIVERY — Wednesday
- Lemons — 2 kg — sauces, aioli, garnish
- Grapes — 2 vines / qty to match availability — 2 m graze
- Edible flowers — 3 punnets — fruit/graze garnish
```

---

## 6. Bidfood bucket

Use Bidfood for dry goods, dairy, bakery, frozen, desserts, meat/fish/finger foods, cleaning and packaging where available.

Common categories:

```text
Scone mix
Flour / rice flour / cornflour / GF breadcrumbs
Sugar / custard powder / chocolate / nuts
Cream / dairy / butter / cheeses where available
Frozen hot nibbles
Brioche buns / bakery items
Seafood/meat items where listed
Packaging / PC containers if supplied
Cleaning items
```

Order format:

```text
BIDFOOD
- Product — required qty — pack size if known — event/use note — allergen flag if relevant
```

Allergen checks must use Bidfood item/allergen list where available.

---

## 7. Woolworths / Coles bucket

Use for:

```text
Urgent top-ups
GF bought-in pies/sausage rolls where already accepted
Retail items not worth supplier order
Small garnish/fresh items unavailable from Doblo's
Savoiardi/lady fingers when supplier availability is uncertain
```

Order format:

```text
WOOLWORTHS / COLES
- Product — qty — reason/event note
```

---

## 8. Already ordered / still needed ledger

Every order sheet should include:

```text
ALREADY ORDERED
- Supplier — item — qty — event

STILL NEEDED
- Supplier — item — qty — event

NEEDS CONFIRMATION
- Item — why unclear — decision needed
```

Do not hide missing items inside prose.

---

## 9. Allergen ordering check

For every dietary-sensitive item:

```text
Check supplier allergen line.
Check may contain where relevant.
Check cross-contact risk.
Do not call allergen-free unless controlled and source supports it.
```

High-watch allergens:

```text
gluten / wheat / dairy / egg / soy / seafood / crustaceans / peanuts / sesame / tree nuts / sulphites
```

---

## 10. Over-order and shortage flags

Add flags when useful:

```text
SHORTAGE RISK — exact pack/count unclear
OVER-ORDER RISK — supplier pack much larger than event need
DIETARY RISK — allergen status unclear
TIMING RISK — thawing/cryovac/overnight proof/hanging needed
DELIVERY RISK — supplier delivery date close to event
```

---

## 11. Ordering output template

```text
ORDERING REQUIRED

DOBLO'S — DELIVERY — [DATE]
- **Item** — qty — event/use note

BIDFOOD
- **Item** — qty / pack — event/use note — allergen flag

WOOLWORTHS / COLES
- **Item** — qty — event/use note

ALREADY ORDERED
- **Item** — qty — supplier — event

STILL NEEDED
- **Item** — qty — supplier — event

NEEDS CONFIRMATION
- **Item** — missing pack size / source / count / dietary status

RISKS
- Shortage / over-order / allergen / timing / delivery flags
```

---

## 12. Final order QA gate

Before giving the order list, check:

```text
- Guest count applied
- Buffer applied where relevant
- Dietaries accounted for as food
- Fruit format resolved
- Focaccia counted if required
- Hot nibble counts converted to pieces
- Frozen items have 2-day thaw plan if needed
- Cryovac/Roscoes window included if needed
- Supplier buckets separated
- Already ordered separated
- Missing info flagged
- Allergen-sensitive items checked where source exists
```
