# Riviera Production System

This folder contains the Riviera kitchen production, event prep, ordering, recipe and source-routing system.

## Current committed files

### Harness / routing

- `harness/Riviera_Kitchen_Production_Harness_Index_v1_2026-06-08.md`

Use this first. It routes event prep, ordering, recipes, seasoning and PDF production to the correct source files.

### Ordering

- `orders/Riviera_Order_Template_v1_2026-06-09.md`
- `orders/Riviera_Weekly_Order_Workflow_v1_2026-06-09.md`

Use these for event orders, weekly supplier ledgers, Doblo's/Bidfood/Woolworths split, already ordered/still needed lists, and supplier-ready order messages.

## Active source pack still to commit

The following files are active in the ChatGPT Riviera project sources and should be committed in the next source-pack PR:

```text
riviera_sop_master_index_v6_2026-06-08.md
Riviera_Seasoning_Palette_v2_2026-06-08.md
Riviera_Component_Module_Library_v1_2026-06-08.md
Riviera_Count_Ordering_Harness_v1_2026-06-08.md
Riviera_Production_Sheet_Template_Library_v1_2026-06-08.md
Riviera_Canonical_Recipe_Bank_v1_2026-06-08.md
Riviera_Supplier_Ordering_Translator_v1_2026-06-08.md
Riviera_Real_Event_Test_Pack_v1_2026-06-08.md
Riviera_Package_Source_Digest_v1_2026-06-09.md
foodpairing_condensed_riviera_reference.md
```

## Source priority

Use this priority when sources conflict:

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
10. Riviera package/menu/source digest
11. Bidfood / Doblo's supplier references
12. GitHub recipe/aroma data
13. Foodpairing reference layer
14. Kitchen Council final chef judgement
```

If no safe answer exists, mark `NEEDS CONFIRMATION`.

## Event-sheet build order

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

## Non-negotiables

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

## Regression test target

Use the Italian Long Lunch production sheet as the first real-event regression test:

```text
Event: Italian Long Lunch
Date: Saturday 13 June
Guest count: 85 pax
Production target: 93 portions
Service style: plated 5-course long lunch
Course order: squid, cannelloni, porchetta, cannellini, tiramisu
Dietaries: none
Food start: 13:30, then every 40 minutes
```

Check:

```text
- food-only sheet
- quantity-first section
- stacked full-width cards
- readable font / greyscale style
- owner-first cards
- ordering workflow compatible
- garnish/seasoning layer included without theory clutter
```
