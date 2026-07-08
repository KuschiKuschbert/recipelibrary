# Riviera Sunday Tapas Pull Matrix SOP Addendum v1

**Status:** Active SOP addendum / pending master-index sync  
**Date:** 2026-06-16  
**Use for:** Sunday tapas freezer pull, service-fridge setup, backup planning, tapas prep sheets and kitchen wall matrix.

---

## 0. Purpose

This addendum turns the Sunday tapas sales/bookings model into a repeatable SOP.

It prevents over-defrosting by separating:

```text
SERVICE FRIDGE PULL = current booked-cover tier
BACKUP = next tier minus current tier, counted but kept frozen
```

The kitchen wall sheet remains the practical service reference.

---

## 1. Source position

Use this addendum after confirmed current-week booking numbers and before general judgement.

Source order inside Sunday tapas work:

```text
1. User correction in current project
2. Current Sunday booking number
3. Riviera Sunday Tapas Pull Matrix — A4 Kitchen Sheet v1
4. This SOP addendum
5. Riviera SOP Master Index
6. Count & Ordering Harness
7. Component Module Library
8. Recipes for Prep Chef / Canonical Recipe Bank
9. Kitchen Council final chef judgement
```

If the current POS/booking model is updated, regenerate the pull matrix and replace this addendum.

---

## 2. Model basis

Current model basis:

```text
13 matched Sundays
856 booked covers
1050 POS food serves
Average: 1.23 food serves per booked cover
```

Do not use the old placeholder `0.6 per 5 guests`. It is retired.

---

## 3. Tapas pull rule

Use booked-cover tiers:

```text
1–20 booked = use 20 column
21–40 booked = use 40 column
41–60 booked = use 60 column
61–80 booked = use 80 column
81–100 booked = use 100 column
101–120 booked = use 120 column
```

Main pull units must be:

```text
serves / PCs / portions / bowls / trays / meals
```

Do not list individual skewers or pieces in the main matrix. Put conversions only in the footer or recipe/service notes.

---

## 4. Service fridge and backup rule

```text
SERVICE FRIDGE:
Pull only the current booked-cover tier.

BACKUP:
Count next tier minus current tier.
Keep backup frozen unless trade is running hot.
```

Example:

```text
37 booked covers = use 40 column.
Backup = 60 column minus 40 column.
```

Do not defrost the backup by default.

---

## 5. Current active pull matrix

```text
ITEM / PULL UNIT             20   40   60   80   100  120
-----------------------------------------------------------
Chicken skewers (serves)      3    6    8   11    14   17
Calamari (500 ml PC)          2    5    7   10    12   14
Arancini (serves)             2    5    7    9    11   14
Chorizo potatoes (port.)      2    4    6    8    10   12
Lamb cutlets (serves)         2    4    6    8    10   12
Chips (bowls)                 2    4    5    7     9   11
Veal olives (serves)          2    3    5    6     8    9
Saganaki (serves)             1    3    4    6     7    9
Cauliflower (port.)           1    3    4    5     7    8
Fish sliders (serves)         1    3    4    5     6    8
Cannoli trio (serves)         1    2    3    4     5    7
Oysters (serves)              1    2    3    3     4    5
Polpette (serves)             1    2    2    3     4    5
Sticky date (serves)          1    1    2    3     4    4
Kids nuggets (meals)          1    1    2    2     3    3
Charcuterie for 2 (trays)     0    1    1    1     2    2
Red grape focaccia (serves)   0    1    1    1     1    2
Kids fish & chips (meals)     0    0    1    1     1    1
```

---

## 6. Conversion footer

Use this as small footer text only:

```text
1 serve = menu serve.
Chicken / arancini / lamb / saganaki / fish sliders / cannoli / polpette = 3 pcs per serve.
Oysters = 6 pcs per serve.
Calamari = 1 x 500 ml PC.
```

---

## 7. Prep-sheet integration

If a prep sheet covers Sunday tapas:

```text
FRIDAY — Pull Sunday Tapas freezer prep to fridge/coolroom.
Use latest booked-cover number and pull matrix tier.
Pull service fridge only.
Count backup as next tier minus current tier and keep frozen.
```

If an event overlaps Sunday tapas, include a **Tapas Ready** block:

```text
TAPAS READY:
- Current booked-cover tier checked.
- Service fridge pull completed from matrix.
- Backup counted and kept frozen.
- Sauces ready.
- Focaccia accounted for.
- Dessert mise ready.
- High-risk shelf first: chicken, fish, calamari, oysters, lamb.
```

---

## 8. Count Harness insert

Add under Sunday Tapas / Hot Food count logic:

```text
Sunday Tapas uses the active data-based pull matrix, not a fixed per-head guess.
Use booked-cover tiers and round up to the next tier.
Main matrix units are serves / PCs / portions / bowls / trays / meals.
Backup is next tier minus current tier and stays frozen unless trade is running hot.
```

---

## 9. Component Module insert

Add as a module:

```text
MODULE NAME:
Sunday Tapas data-based service pull

USE WHEN:
Sunday tapas service or any prep sheet covering Sunday tapas.

BASE UNIT:
Booked covers, rounded up to 20 / 40 / 60 / 80 / 100 / 120 tier.

COUNT LOGIC:
Use active pull matrix. Pull current tier only into service fridge. Count backup as next tier minus current tier; keep frozen unless needed.

PRODUCTION CARD:
ASH | Pull **Sunday Tapas service fridge prep** — booked-cover tier
Use pull matrix. Pull service fridge only. Keep backup frozen and counted.

PACK / SERVICE:
High-risk shelf first: chicken, fish, calamari, oysters, lamb.
Fryer-close items grouped for service: calamari, arancini, potatoes, cauliflower, fish, chips.

DIETARY / ALLERGEN FLAGS:
Use item recipe/allergen source. Do not claim allergen-free unless controlled.

ORDERING HOOK:
Use sales trends and current stock. Do not over-order from a single high-booking Sunday.
```

---

## 10. QA before printing or using

```text
□ Current Sunday booking number entered
□ Correct tier selected
□ Matrix shown in serves / PCs / trays / meals
□ No individual skewers/pieces in main matrix
□ Backup rule visible
□ High-risk shelf note visible
□ Model note/date visible
□ PDF is A4 portrait, black/white/grey and readable from 2 metres
```
