# Leichhardt · Cook Off

`cook_off.json` is the editable source for this venue collection. Recipes are trial dishes for one serve, imported from Daniel's final 6 September 2026 trial-dishes sheet. These are separate from Riviera's recipe standards and from device-local kitchen books.

The original one-page PDF and plating sheet are preserved here. The web recipe incorporates the already-agreed correction that caramelised onion belongs inside the potato croquette, with flour, beaten egg and breadcrumbs for crumbing. The original PDF is retained unchanged.

The page renders the two plating views from the original sheet without generating replacement visuals. Edit the JSON, then run `python3 scripts/build_leichhardt_page.py`. Run it with `--check` to verify the committed HTML matches the source. No catalogue-wide rebuild is needed for this separate venue collection.
