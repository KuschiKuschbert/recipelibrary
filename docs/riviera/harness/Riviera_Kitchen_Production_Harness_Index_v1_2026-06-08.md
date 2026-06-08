# Riviera Kitchen Production Harness Index v1

**Status:** Active source index  
**Date:** 2026-06-08  
**Use for:** Knowing which Riviera system file controls which part of event prep, ordering, recipes and production sheets.

---

## 0. Purpose

This file ties the whole Riviera prep system together.

Use this as the routing layer before building event prep, ordering, recipe or production documents.

---

## 1. Active source stack

```text
1. User correction in current project
2. Event/client-specific source
3. Riviera SOP Master Index v6
4. Riviera Component Module Library v1
5. Riviera Count & Ordering Harness v1
6. Riviera Production Sheet Template Library v1
7. Riviera Canonical Recipe Bank v1
8. Riviera Supplier Ordering Translator v1
9. Riviera Seasoning Palette v2
10. Riviera package/menu/source PDFs
11. Bidfood / Doblo's supplier references
12. GitHub recipe/aroma data
13. Foodpairing reference layer
14. Kitchen Council final chef judgement
```

If sources conflict, user correction wins. If no safe answer exists, mark NEEDS CONFIRMATION.

---

## 2. Which file to use when

### Event dump / prep sheet

Use:

```text
SOP Master Index v6
Production Sheet Template Library v1
Component Module Library v1
Count & Ordering Harness v1
Real-Event Test Pack v1
```

### Multiple events / overlapping prep

Use:

```text
SOP Master Index v6
Production Sheet Template Library v1
Component Module Library v1
Count & Ordering Harness v1
Real-Event Test Pack v1
```

Key rule: shared prep only if recipe, prep state, dietary status, holding and finish match.

### Ordering

Use:

```text
Supplier Ordering Translator v1
Count & Ordering Harness v1
Component Module Library v1
Doblo's PLU list
Bidfood item/allergen list
```

### Recipes

Use:

```text
Canonical Recipe Bank v1
Recipes for Prep Chef
Seasoning Palette v2
Foodpairing reference layer
Kitchen Council
```

### Seasoning / pairings

Use:

```text
Seasoning Palette v2
Canonical Recipe Bank v1
Foodpairing reference layer
Kitchen Council
```

### PDF / printable production sheets

Use:

```text
SOP Master Index v6
Production Sheet Template Library v1
Real-Event Test Pack v1
```

---

## 3. Current system files

```text
Riviera SOP Master Index v6
Riviera Seasoning Palette v2
Riviera Component Module Library v1
Riviera Count & Ordering Harness v1
Riviera Production Sheet Template Library v1
Riviera Canonical Recipe Bank v1
Riviera Supplier Ordering Translator v1
Riviera Real-Event Test Pack v1
Riviera Kitchen Production Harness Index v1
```

---

## 4. Standard event-processing order

```text
1. Classify as SINGLE EVENT or MULTI-EVENT.
2. Extract food-relevant event snapshot.
3. Run missing-info detector.
4. Resolve product formats.
5. Apply count logic.
6. Pull component modules.
7. Pull recipes if needed.
8. Apply seasoning/pairing check.
9. Apply ordering translator if order list requested.
10. Build sheet from template.
11. Run final QA gate.
12. Use post-event debrief to improve modules.
```

---

## 5. What not to do

```text
Do not rebuild layouts from scratch.
Do not turn food sheets into admin documents.
Do not merge functions without labels.
Do not hide dietaries as notes.
Do not invent prices, guest counts or confirmed menus.
Do not apply full fruit platter standard to corporate fruit boxes.
Do not forget focaccia where grazing requires it.
Do not skip Friday Tapas pull when Sunday is covered.
Do not skip Roscoes cryovac window when cryovac is required.
Do not use unframed loose production text.
Do not use side-by-side cards.
```

---

## 6. Improvement loop

Use small, targeted updates.

```text
Problem appears once: note it.
Problem appears twice: create/update module.
Problem affects safety/event protection: update immediately.
Stable changes: sync SOP/source file.
```
