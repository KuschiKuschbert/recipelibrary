# Riviera Tapas Orchestrator — Acceptance Contract

The orchestrator is ready to use only when the following tests pass against a
copy of the Drive control workbook.

## Intake safety

1. Uploading the same sales file twice produces one processed run and one
   `DUPLICATE_IMPORT` receipt.
2. An unmapped POS item is written to Exceptions and is not merged into a
   similarly named recipe.
3. A renamed required column reports `SCHEMA_CHANGED`; a missing required
   column reports `MISSING_HEADER`. Neither file updates sales history.
4. Voids and refunds reduce sold quantity. Negative source quantities or a
   negative net quantity are quarantined.

## Forecast and stock

5. A missing item count displays `COUNT REQUIRED`; it must not behave as zero
   stock.
6. The clean 1 August 2026 stocktake is selected as the opening baseline for
   the 2 August Sunday service.
7. Forecasts scale from booked covers using up to the latest 13 comparable
   Sundays. Sunday Tapas receives no automatic 9% buffer.
8. Polpette uses menu ID `polpette`, recipe ID `veal-meatballs`, and three
   80 g meatballs per Tapas serve.
9. Stuffed olives use ID `veal-prosciutto-stuffed-olives` and six olives per
   Tapas serve. The two items never share an ID or pull unit.

## Publishing and change control

10. Intake and forecast runs create drafts only. Publishing requires an
    `APPROVED` decision, reviewer and timestamp; the prior current sheet is
    archived.
11. Event- and week-specific instructions write only to the affected
    event/week record and carry effective and expiry dates. They cannot update
    a permanent SOP.
12. Unclassified conversational corrections are held as
    `SCOPE_CONFIRMATION_REQUIRED`.

The executable reference checks live in
`tests/riviera_tapas_orchestrator/` and run with:

```sh
node --test tests/riviera_tapas_orchestrator/orchestrator.test.mjs
```
