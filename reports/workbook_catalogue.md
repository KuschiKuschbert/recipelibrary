# Riviera Menu Builder — Workbook Catalogue

Source: `Riviera Menu Builder.xlsx`  
Sheets: 25

## Classification legend
| Class | Meaning |
|---|---|
| `live_stock_card` | Single-ingredient cost/recipe card |
| `live_dish_card` | Real dish with ingredients/costs |
| `stock_list` | Aggregated stock, par or storage list |
| `dashboard` | Formula-heavy summary, engineering or reporting |
| `template_demo` | Old template / placeholder / demo data |
| `unknown` | Needs manual review |

## Tab summary

### dashboard (8 tabs)
- **Guide** — 19 rows
  - first data row: Engineering Worksheet
- **Dashboard** — 12 rows
  - columns: `DOGS · CHALLENGERSS`
  - first data row: The Riviera
- **Dishes Dashboard** — 244 rows
  - columns: `Food Group · Dish · Page · COGS · Sell Price · GP`
  - first data row: The Riviera
- **Menu Performance** — 283 rows
  - columns: `Menu Builder · GP%`
  - first data row: Menu Builder | GP%
- **Volume GP** — 284 rows
  - columns: `Hotel: · The Riviera · GP with Volumes`
  - first data row: Hotel: | The Riviera | GP with Volumes
- **Engineering** — 262 rows
  - columns: `MENU ENGINEERING WORKSHEET`
  - first data row: MENU ENGINEERING WORKSHEET
- **Recipe Migration Ledger** — 53 rows
  - columns: `Priority · Phase · Recipe / Module · Source status · Source / reference · Target sheet`
  - first data row: Priority | Phase | Recipe / Module | Source status | Source / reference | Target sheet
- **Stock Match Audit P1** — 46 rows
  - columns: `Recipe · Ingredient · Required recipe wording · Stock match status · Matched stock item · Stock row`
  - first data row: Recipe | Ingredient | Required recipe wording | Stock match status | Matched stock item | Stock row

### live_dish_card (14 tabs)
- **Breads** — 280 rows
  - columns: `Menu Item: · pumpkin soup · The Riviera · SP`
  - first data row: Menu Item: | pumpkin soup | The Riviera | SP
- **Starters** — 289 rows
  - columns: `Menu Item: · Chorizo Mozzarella Arancini Balls · The Riviera · SP`
  - first data row: Menu Item: | Chorizo Mozzarella Arancini Balls | The Riviera | SP
- **Oysters** — 243 rows
  - columns: `Menu Item: · Kilpatrick Oysters Tapas · The Riviera · SP`
  - first data row: Menu Item: | Kilpatrick Oysters Tapas | The Riviera | SP
- **Salads** — 279 rows
  - columns: `Menu Item: · caesar · The Riviera · SP`
  - first data row: Menu Item: | caesar | The Riviera | SP
- **Pizzas** — 279 rows
  - columns: `Menu Item: · Margareta · The Riviera · SP`
  - first data row: Menu Item: | Margareta | The Riviera | SP
- **Lunch** — 279 rows
  - columns: `Menu Item: · chicken tiddies · The Riviera · SP`
  - first data row: Menu Item: | chicken tiddies | The Riviera | SP
- **Chef Selection** — 279 rows
  - columns: `Menu Item: · Beef Burgignon · The Riviera · SP`
  - first data row: Menu Item: | Beef Burgignon | The Riviera | SP
- **Italian Long Lunch** — 291 rows
  - columns: `Menu Item: · Stuffed Squid · The Riviera · SP`
  - first data row: Menu Item: | Stuffed Squid | The Riviera | SP
- **Steaks + Grill** — 279 rows
  - columns: `Menu Item: · rib fillet 300 · The Riviera · SP`
  - first data row: Menu Item: | rib fillet 300 | The Riviera | SP
- **Mains** — 278 rows
  - columns: `Menu Item: · Spaghetti Bolognese · The Riviera · SP`
  - first data row: Menu Item: | Spaghetti Bolognese | The Riviera | SP
- **Sides** — 283 rows
  - columns: `Menu Item: · Romesco sauce · The Riviera · SP`
  - first data row: Menu Item: | Romesco sauce | The Riviera | SP
- **Toppers** — 289 rows
  - columns: `Menu Item: · prawns · The Riviera · SP`
  - first data row: Menu Item: | prawns | The Riviera | SP
- **Kids Meals** — 282 rows
  - columns: `Menu Item: · kburger · The Riviera · SP`
  - first data row: Menu Item: | kburger | The Riviera | SP
- **Desserts** — 288 rows
  - columns: `Menu Item: · brownie · The Riviera · SP`
  - first data row: Menu Item: | brownie | The Riviera | SP

### stock_list (3 tabs)
- **Template** — 277 rows
  - columns: `Menu Item: · The Riviera · SP`
  - first data row: Menu Item: | The Riviera | SP
- **Stock by Storage** — 300 rows
  - columns: `SUPPLIER · PRODUCT · BRAND · MENU · PACK · INVOICE`
  - first data row: THE RIVIERA
- **Stock List** — 300 rows
  - columns: `SUPPLIER · PRODUCT CODE · BRAND · STORAGE · INGREDIENTS · PACK SIZE`
  - first data row: INFINITE GROCERY LIST

## Action plan

**DO NOT change any app data until this catalogue has been reviewed.**

- `live_stock_card` tabs → Phase 1: reconcile ingredient names/units into builtins.json
- `stock_list` tabs → Phase 2: update par levels + order-list storage zones
- `live_dish_card` tabs → Phase 3: import only dishes that map to catering packages
- `dashboard` tabs → read-only reference; no import
- `template_demo` tabs → skip entirely
- `unknown` tabs → requires manual decision