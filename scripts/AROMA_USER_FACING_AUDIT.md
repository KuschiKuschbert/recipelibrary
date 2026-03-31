# Aroma page — user-facing data audit

Reference for where localized text can appear and how we guard it.

## JSON sources

| File | Keys rendered in UI | Notes |
|------|---------------------|--------|
| `aroma_data/ingredients.json` | `name`, `harmonizes_with[].name`, `pairs_with_foods[]`, `heat_behavior.{a,b,c}`, `cuisines[]`, `spice_blends[]`, optional `botanical` | `_de` is **not** shown; keep it for PDF provenance only. |
| `aroma_data/food_pairings.json` | `name`, `seasonings[].name` | `_de` on rows/seasonings is **not** shown. |
| `aroma_data/pairing_matrix.json` | ingredient `id` only (labels come from `ingredients` lookup) | No free-text prose. |

## Normalization pipeline

- [`aroma_i18n.py`](aroma_i18n.py): `DE_TO_EN`, `_english_heat`, `_heat_token_scrub`, `_clean_display_phrase`, `_rewrite_cuisine_line`, `_translate_word_sequence` (blends).
- [`normalize_aroma_english.py`](normalize_aroma_english.py): re-apply postprocess to committed JSON (no PDF).

## Grep patterns (regression hunting)

Use on `ingredients.json` / `food_pairings.json` after edits:

- Umlauts: `[äöüÄÖÜß]`
- Heat: `leicht`, `zitrusartig`, `Pilzduft`, `Pfeffer`, `Anisaroma`, `muf-\s*fig`, `resinouss`
- Cuisines: `Deutschland:`, `Mitteleuropa:`, trailing hyphen fragments `,\s*\w+-\s*$`
- Blends: `Indisches`, `Indische`, `arabisches`, `Baha-\s*rat`
- Pairs: `Kartoffel`, `neuen`

## Checker

[`check_aroma_english.py`](check_aroma_english.py) combines `_looks_untranslated_german` and extra regexes for ASCII German common in this dataset.

## Frontend

- [`aroma.html`](../aroma.html): dynamic copy is JSON-only; `_de` must never be interpolated.
- [`assets/aroma-hints.js`](../assets/aroma-hints.js): German tokens are **search synonyms only**, not display labels.
