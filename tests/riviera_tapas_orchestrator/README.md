# Riviera Tapas orchestrator reference checks

This is a dependency-free safety contract for the Drive/Apps Script
orchestrator. It does not write to Drive, GitHub or the ChatGPT project.

Run:

```sh
node --test tests/riviera_tapas_orchestrator/orchestrator.test.mjs
```

The reference validator intentionally uses conservative rules:

- exact POS IDs only; unknown rows go to quarantine;
- a file hash prevents the same upload being processed twice;
- required-header drift stops an import;
- voids and refunds subtract from sold quantity, while negative quantities and
  negative net sales go to quarantine;
- missing stock is `COUNT REQUIRED`, never assumed to be zero;
- forecasts use booked covers and up to the latest 13 comparable Sundays;
- Sunday Tapas receives no automatic 9% event buffer;
- Polpette and stuffed olives are separate menu and recipe records;
- a draft needs a named reviewer and approval timestamp before publication;
- event/week changes cannot update a permanent SOP.

The Apps Script implementation may use different function names, but its
end-to-end checks should preserve these outcomes.
