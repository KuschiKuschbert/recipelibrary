# Riviera Real-Event Test Pack v2

**Status:** Active test and QA pack for Riviera production harness  
**Date:** 2026-06-16  
**Use for:** Testing real event dumps against SOP v6, Component Module Library v1, Count & Ordering Harness v1, Template Library v1 and Recipe Bank v1.

---

## 0. Purpose

This pack turns every real event dump into a repeatable workflow.

The goal is not to add more sheet clutter. The goal is to catch missing food details before the kitchen is under pressure.

---

## 0A. v2 prep-list baseline

For prep-list / production-sheet testing, assume orders are complete and stock has arrived unless the user asks for ordering.

The missing-info detector should not add ordering tasks to a prep list by default. If stock, supplier timing or order status is not part of the user request, leave it out.

Use only a short **Sort delivered stock by event/use** action where it protects multi-event separation or dietaries.

If the user requests a sheet from a specific day, test and build only from that day onward.

---

## 1. Event intake pass

When the user gives an event dump, extract only food-relevant data first.

```text
EVENT:
DATE:
DELIVERY / SERVICE TIME:
LOCATION:
GUEST COUNT:
EVENT TYPE:
SERVICE STYLE:
MENU:
DIETARIES:
HOT FOOD:
COLD FOOD:
BREAD / FOCACCIA:
SAUCES / DRESSINGS:
DESSERTS:
OFFSITE REQUIREMENTS:
SUNDAY TAPAS OVERLAP:
SOURCE / PACKAGE:
```

If details are missing, use NEEDS CONFIRMATION only where it changes food, count, prep, delivery or risk.

---

## 2. Missing-info detector

Run this before building any production sheet.

```text
CRITICAL MISSING INFO
- Event date missing?
- Delivery/service time missing?
- Guest count missing?
- Menu missing?
- Dietaries missing or unclear?
- Location/delivery handoff missing?
- Hot vs cold service unclear?
- Offsite power/water/prep/hot holding unclear, if offsite?
- Food times missing for run sheet?
- Source/package conflict?
```

Do not ask ten questions if only one missing item matters. Mark non-critical items as NEEDS CONFIRMATION inside the sheet.

---

## 3. Product-format pass

Before counting, resolve format.

```text
Fruit: corporate fruit box / fruit cup / fruit bowl / styled platter / grazing fruit
Bread: sliced focaccia / seated focaccia with butter / croissant / brioche / wrap / sandwich
Hot nibbles: single 24 piece platter / mixed 48 piece box / GF box
Graze: grazing box / 1 m table / 2 m table / 3 m table
Dessert: bought-in / in-house / strict recipe needed
Dietary: close-to-menu modification / full substitute / NEEDS CONFIRMATION
```

---

## 4. Count pass

Use Count & Ordering Harness v1.

```text
- Apply guest count.
- Add 9% production buffer where relevant.
- Convert platter/box counts to actual pieces.
- Include dietaries inside total production.
- Reduce alternate-drop mains evenly when dietary alternatives are added.
- Add focaccia where required.
- Add sauce/dressing/relish quantities.
- Add garnish/finish only where it improves presentation without overcomplicating service.
```

---

## 5. Module pass

Pull modules before writing freehand tasks.

```text
Scones
Focaccia
Fruit format
Grazing box/table
Sandwich/wrap/croissant/brioche
Hot nibbles / GF hot nibbles
Labneh
Sauces/dressings
Desserts
Dietary alternatives
Friday Tapas pull
Roscoes cryovac
Offsite sous-vide bain
Ready-to-send gate
```

If no module exists, create a temporary DRAFT MODULE and add it to the post-event debrief.

---

## 6. Sheet-build pass

Choose one template.

```text
SINGLE EVENT — delivery catering
SINGLE EVENT — onsite plated dinner
SINGLE EVENT — onsite buffet
SINGLE EVENT — offsite buffet/carvery
SINGLE EVENT — wake/memorial delivery
SINGLE EVENT — corporate breakfast/lunch
SINGLE EVENT — grazing table/offsite graze
MULTI-EVENT — delivery-heavy week
MULTI-EVENT — wedding + Sunday Tapas
MULTI-EVENT — cold assembly week
MULTI-EVENT — offsite hot holding week
MULTI-EVENT — mixed nightmare week
```

Do not build layout from scratch unless no template fits.

---

## 7. Production sequencing pass

Cards must follow real production order.

```text
1. Longest lead-time tasks first
2. Thawing / overnight cold proof / yoghurt hanging / brines / marinades
3. Batch cooking and cooling
4. Sauces / fillings / dressings
5. Cold assembly
6. Hot firing / reheating
7. Garnish / finish
8. Packing / delivery / service
9. Reset / debrief
```

Dependency logic:

```text
If stuffing is done → stuffing/rolling can start.
If sauce is cooked/chilled → final seasoning/check can happen.
If hot nibbles are thawed → firing plan can start.
If all components are ready → assembly/packing can start.
```

---

## 8. Owner pass

Every active production/fire/pack card starts with owner.

```text
ASH | Start **fruit boxes**
DAN | Finish **sauce**
BOTH | Pack **delivery order**
```

Use Dan for:

```text
Final calls
Seasoning balance
Proteins
High-risk cooking
Sauces
Pass/fire decisions
Ordering/service decisions
```

Use Ash for:

```text
Structured prep
Weighing/portioning
Cold assembly
Filling prep
Packing support
Garnish prep
Cleaning/reset
Active cooking support
```

Crockery/smallware only appears if it affects food service or delivery.

---

## 9. Dietary pass

Dietary notes must become food actions.

```text
BAD:
- 1 GF

GOOD:
- GF guest x 1 — make 1 GF sandwich box instead of croissant. Use GF bread, safe filling, separate packing.
```

Closeness rule:

```text
Keep dietary/allergy alternatives as close as possible to the actual meal.
Remove or replace only the unsafe component where practical.
Garlic/onion allergy = one extra same-style portion without garlic/onion.
```

---

## 10. Offsite pass

For offsite catering, check:

```text
- Suitable proteins brined/marinated?
- Suitable proteins cryovacced?
- Roscoes 30-minute cryovac window included?
- Non-steak cryovac items cooked one day in advance where suitable?
- Sous-vide bain reheat/hold plan included?
- 2-day thaw plan included for frozen items?
- Graze portioned into PC containers?
- Delivery/handoff time clear?
```

---

## 11. Sunday Tapas pass

If the sheet covers Sunday, include:

```text
FRIDAY:
- Pull Sunday Tapas frozen/prepped items from freezer to fridge/coolroom.

SUNDAY:
- Tapas ready block if event overlaps with tapas service.
```

Do not over-explain policy. Put the action where it belongs.

---

## 12. Final QA gate before sending PDF / sheet

Check every sheet:

```text
- Food-only: no admin clutter
- Quantity check appears before food times
- Bullet list quantity section
- Food items bold in cards
- Owner-first command cards
- Full-width stacked cards only
- Card frames visible
- Font readable from 2 metres
- No side-by-side cards
- Dietaries are actual food actions
- Sauce/dessert recipes included where needed
- Focaccia counted where required
- Shared prep has allocation line
- Day-of allocation warnings where shared prep exists
- Optional delivered-stock sort line for multi-event weeks where useful
- Friday Tapas pull if Sunday included
- Ready-to-send gate included
```

---

## 13. Post-event debrief pass

After real events, capture:

```text
WHAT RAN SHORT:
WHAT WAS OVERPRODUCED:
WHAT TOOK TOO LONG:
WHAT WAS UNCLEAR:
WHAT NEEDS A MODULE:
WHAT SHOULD BE LOCKED INTO SOP:
```

Use this to update modules, not to rewrite the whole SOP every time.

---

## 14. Real-event test routine

For the next real event week:

```text
1. Build sheet using this pack.
2. Mark any guessed/draft modules.
3. Use the sheet in kitchen.
4. Debrief after event.
5. Update only the module that failed.
6. Sync SOP only when changes are stable.
```

---

## 15. Failure triggers

If any of these happen, update the module/harness:

```text
- Same missing info appears twice
- Same item over/under ordered twice
- Same recipe lacks quantity twice
- Same dietary type needs custom thinking twice
- Same page layout issue happens twice
- Same prep task starts too late twice
- Same item gets forgotten twice
```

The system improves by locking repeated fixes into modules.


---

## v2 changelog

- Prep-list tests now assume ordering is complete and stock has arrived unless order mode is requested.
- Coldroom/rack allocation checks are removed from final QA.
- Added optional delivered-stock sort check.
- Start-from-requested-day logic added.
