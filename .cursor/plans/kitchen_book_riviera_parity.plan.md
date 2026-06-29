---
name: Kitchen book Riviera parity
overview: Full isolation per kitchen book for order overrides, extras, and master; shared order-list module + Riviera unchanged globals; kitchen-book admin PIN; rebrand visible “Riviera House” UI copy to “Riviera” (not recipe titles).
todos:
  - id: rename-riviera-branding
    content: "Rename site nav/footer/title copy: Riviera House → Riviera (index, riviera, kitchen-book, README, SKILL); do not change recipe text e.g. Riviera House Emulsion"
    status: completed
  - id: storage-book-order
    content: Add per-book order overrides, extras, AND master ingredient keys + load/save/export helpers in assets/user-recipes.js
    status: completed
  - id: extract-order-module
    content: Create assets/order-list.js; refactor riviera.html to use parameterized context (Riviera uses existing global master + order keys)
    status: completed
  - id: shared-order-css
    content: Move shared order-list modal CSS to assets/theme.css where practical
    status: completed
  - id: kitchen-book-order-ui
    content: Wire kitchen-book.html modal + footer; book context uses per-book master + per-book order state only
    status: completed
  - id: kitchen-book-admin-pin
    content: Add Riviera-style PIN + session gating for destructive actions on kitchen-book.html
    status: completed
  - id: skill-docs
    content: Document per-book localStorage keys + Riviera rename note in kitchen-library SKILL.md
    status: completed
isProject: false
---

# Kitchen book full parity with Riviera (full isolation per book)

## Full isolation (explicit)

For **each** `?b=<bookId>`:

- **Recipes** — already isolated (`kuschi_book_<id>_recipes_v1`).
- **Order overrides** — only `kuschi_book_<id>_order_overrides_v1`.
- **Order extras** — only `kuschi_book_<id>_order_extras_v1`.
- **Master ingredients** — only `kuschi_book_<id>_master_v1`.

There is **no** reading or writing of Riviera’s `kuschi_master_ingredients_v1`, `kuschi_riviera_order_`*, or **another book’s** keys from the kitchen-book order UI. Deleting a book should remove or orphan only that book’s order/master keys (clear on `deleteCustomBook` alongside recipe storage).

**Riviera** ([riviera.html](riviera.html)) continues to use its **existing global** keys only; behavior and data for Riviera users stay the same.

## Goal

[kitchen-book.html](kitchen-book.html?b=…) gets the same **order list** workflow as Riviera, with the isolation rules above.

## Data model (per `bookId`)


| Data               | Storage                               |
| ------------------ | ------------------------------------- |
| Recipes            | `kuschi_book_<id>_recipes_v1`         |
| Order overrides    | `kuschi_book_<id>_order_overrides_v1` |
| Order extras       | `kuschi_book_<id>_order_extras_v1`    |
| Master ingredients | `kuschi_book_<id>_master_v1`          |


**Export:** `exportBookOrderBundle(bookId)` → `{ masterIngredients, orderOverrides, orderExtras }` from that book’s keys only.

## Architecture

- New [assets/order-list.js](assets/order-list.js) (extracted from [riviera.html](riviera.html)) with a **context**:
  - **Riviera:** current global master + Riviera order load/save.
  - **Book:** `bookId` + book-only helpers (never call Riviera loaders).
- [kitchen-book.html](kitchen-book.html): order list control + modal; context = `CURRENT_BOOK_ID`.
- Shared order-list CSS → [assets/theme.css](assets/theme.css) where practical.

## Admin parity

- PIN + `sessionStorage` on kitchen-book for destructive actions (delete book, remove recipe, order-list destructive controls aligned with Riviera’s lock pattern).

## Rebrand: “Riviera House” → “Riviera” (navigation copy)

**In scope:** User-visible **site chrome** where the place is referred to as a section of the library, not a recipe name.


| Location                                                                    | Example change                                                                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [index.html](index.html)                                                    | Hero link “Riviera House Kitchen” → **“Riviera”** (or “Riviera” + same chevrons); footer “Riviera House” → **“Riviera”**; alert “Riviera page” → **“Riviera”** if desired |
| [riviera.html](riviera.html)                                                | `<title>`, `.hero-label` “Kuschi · Riviera House” → **“Kuschi · Riviera”**; footer “Riviera House prep set” → **“Riviera prep set”** (or similar)                         |
| [kitchen-book.html](kitchen-book.html)                                      | Footer link text **“Riviera”**                                                                                                                                            |
| [README.md](README.md), [SKILL.md](.cursor/skills/kitchen-library/SKILL.md) | Product wording **“Riviera”** where it currently says “Riviera House” for the app area                                                                                    |


**Out of scope:** Strings inside **recipe content** (e.g. built-in card titles or method lines like **“Riviera House Emulsion”**) — those stay as real dish names.

Todo **rename-riviera-branding** can land independently (small commit) before or alongside parity work.

## Out of scope

- Built-ins, hide-builtin, Prep Chef dedupe (Riviera-only).
- Sharing order/master state across books or with Riviera.

## Implementation order

1. **rename-riviera-branding** (quick, low risk) — optional first.
2. **storage-book-order** → **extract-order-module** → **shared-order-css** → **kitchen-book-order-ui** → **kitchen-book-admin-pin** → **skill-docs**.

## Verification

- Two different `?b=` ids: independent order lines, extras, and master defaults; Riviera regression unchanged.
- Spot-check renamed links and `<title>`; recipe cards still show correct emulsion / house naming in body text.

