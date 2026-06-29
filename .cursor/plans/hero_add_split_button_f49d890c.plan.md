---
name: Hero add split button
overview: On the main catalog page ([index.html](index.html)), replace the separate "+ Add recipe" button and the dynamically injected "+ Kitchen book" button with a single pill that smoothly expands to reveal both actions, while keeping existing modals and `refreshCustomBookNav()` book links unchanged.
todos:
  - id: markup-hero-split
    content: Replace standalone Add recipe button with .hero-add-split wrapper (trigger + two choice buttons) in index.html hero
    status: completed
  - id: css-animation
    content: Add collapsed/expanded styles + prefers-reduced-motion; match .hero-nav-link look
    status: completed
  - id: js-toggle-refresh
    content: Implement toggle/close + outside click; remove + Kitchen book from refreshCustomBookNav(); collapse when opening modals
    status: completed
isProject: false
---

# Hero “Add” split control (index only)

## What you want (confirmed)

- **Today:** [index.html](index.html) shows **+ Add recipe** next to QR in `.hero-nav-cluster`, and [refreshCustomBookNav()](index.html) appends **+ Kitchen book** inside `#heroCustomBookLinks` (alongside per-book links).
- **Goal:** **One** primary control that **animates** into **two** choices: add a recipe (existing `openAddRecipeModal()`) or add a kitchen book (existing `openAddKitchenBookModal()`).

No change required to [kitchen-book.html](kitchen-book.html) or [riviera.html](riviera.html) unless you later want the same pattern there.

## UX / interaction (defaults)

- **Click** the primary control to **toggle** expanded vs collapsed (works on tablet/phone; no hover-only behavior).
- **Click outside** the widget → collapse.
- **After** opening either modal → collapse (call a small `closeHeroAddWidget()` from `openAddRecipeModal` / `openAddKitchenBookModal`, or once when overlay opens).
- **Escape** already closes modals; optionally also collapse the widget when Escape fires and no modal is open (minor polish).
- `**prefers-reduced-motion`:** shorten or disable the width/opacity transition ([theme.mdc](.cursor/rules/theme.mdc) guidance).

## Implementation approach

### 1. Markup ([index.html](index.html) hero, ~lines 350–355)

- In `.hero-nav-cluster`, **replace** the standalone `<button …>+ Add recipe</button>` with a wrapper, e.g. `div.hero-add-split#heroAddSplit`:
  - **Trigger:** e.g. “+ Add” or “+ Add …” with `aria-expanded`, `aria-controls` pointing at the choices container.
  - **Choices row:** two `<button type="button" class="hero-nav-link">` — “Recipe” / “Kitchen book” (or keep “+ Add recipe” / “+ Kitchen book” if you prefer longer labels inside the expanded strip).
- Leave **QR** as the next sibling unchanged.

### 2. Styles (inline `<style>` in [index.html](index.html), near existing `.hero-nav` rules)

- **Container:** `inline-flex`, pill radius matching `.hero-nav-link`, shared border/background so it reads as **one** control when collapsed.
- **Animation:** use a **max-width** (or similar) transition on the outer wrapper: collapsed ≈ width of trigger only; expanded ≈ width of trigger + gap + second button. Inner row `display: flex; flex-wrap: nowrap; white-space: nowrap` so both buttons stay on one line when possible; allow wrap on very narrow widths if needed via a `@media` tweak.
- **Collapsed state:** second button visually hidden (e.g. `opacity: 0`, `pointer-events: none`, zero effective width via `max-width` on a child or overflow hidden on parent) so focus order stays sane when collapsed.
- **Expanded state:** both buttons fully visible, same hover treatment as today’s `.hero-nav-link`.

### 3. Script ([index.html](index.html) inline script)

- Add `toggleHeroAddSplit()`, `closeHeroAddSplit()`, **document-level** `click` listener (ignore when target is inside `#heroAddSplit`).
- Wire Recipe → `openAddRecipeModal()` then `closeHeroAddSplit()`; Kitchen book → `openAddKitchenBookModal()` then `closeHeroAddSplit()`.
- Update **[refreshCustomBookNav()](index.html)** (~line 1269): **remove** the `parts.push('…+ Kitchen book…')` line so only **book links** are injected into `#heroCustomBookLinks` (no duplicate “add kitchen book” entry).

### 4. Verification

- Static server from repo root: hero shows one add control; expand → two actions; each opens the correct existing overlay; outside click collapses; custom book links still render; QR and Riviera unchanged.
- No edits to [assets/user-recipes.js](assets/user-recipes.js) unless you discover an edge case (unlikely).

## Files touched


| File                     | Change                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [index.html](index.html) | New hero markup, CSS for split animation, small JS for toggle/outside-click/modal hook, trim `refreshCustomBookNav()` |


