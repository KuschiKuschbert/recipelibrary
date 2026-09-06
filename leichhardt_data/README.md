# Leichhardt · Cook Off

`cook_off.json` is the editable source for this venue collection. Recipes are trial dishes for one serve, imported from Daniel's final 6 September 2026 trial-dishes sheet. These are separate from Riviera's recipe standards and from device-local kitchen books.

The original plating sheet is preserved here. The web recipe incorporates the already-agreed correction that caramelised onion belongs inside the potato croquette, with flour, beaten egg and breadcrumbs for crumbing. Daniel subsequently added fried onion slices as a separate eye-fillet garnish. The recipe and current one-page PDF include 30 g sliced onion per serve, light flour dusting, frying, draining and seasoning, and adding the garnish at the pass. The original plating reference predates this garnish.

The page renders the two plating views from the original sheet without generating replacement visuals. Edit the JSON, then run `python3 scripts/build_leichhardt_page.py` and `python3 scripts/build_leichhardt_pdf.py` (requires ReportLab). Run the page builder with `--check` to verify the committed HTML matches the source. No catalogue-wide rebuild is needed for this separate venue collection.
