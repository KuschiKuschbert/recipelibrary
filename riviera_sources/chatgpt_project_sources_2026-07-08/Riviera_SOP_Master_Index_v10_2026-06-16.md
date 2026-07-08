# Riviera SOP Master Index v10

**Status:** Active source sync  
**Date:** 2026-06-16  
**Supersedes:** Riviera SOP Master Index v8 plus event-day location split update  
**Use for:** Riviera food-only production sheets, prep sheets, run sheets, supplier orders, recipe SOPs, kitchen PDFs, client/kitchen-facing documents, and operational planning.

---


## 0AA. v10 sync summary - burger-bar side split correction

When the user confirms burger-bar sides are split the same as the mains, apply the 9% buffer to the total guest count first, round to the practical total, then split side portions between side items.

Example:

```text
Barn burger bar: 70 guests x 1.09 = 76.3 -> practical 80 total portions.
Mains 50/50 = 40 Texan chicken + 40 Angus beef.
Sides same split = 40 potato salad + 40 slaw.
Do not prep 80 portions of potato salad and 80 portions of slaw unless full-side coverage is specifically requested.
```

User correction wins over any previous full-side-count module.

---

## 0. v9 sync summary - event-day location split update

v9 keeps the v8 MYO burger split rule and feasting one piece count rule, and adds a mandatory event-day split rule for multi-location days.

1. **Event-day sheets split by event/location**  
   For a multi-event day where events are not all in the same location, the day-of section must be split into separate event/location sheets. Do not force separate venues into one combined day-of run sheet.

2. **Shared prep may stay shared before event day**  
   Wednesday/Thursday/Friday prep can remain one shared production plan where it reduces workload and protects shared prep. On the actual event day, each location gets its own sheet with its own quantity check, food times, pack/fire/send actions and ready gate.

3. **Allowed master dispatch overview**  
   A compact one-page dispatch overview is allowed at the start of event day, but it cannot replace the separate location sheets.

4. **Location sheet required fields**  
   Each location sheet must include: event name, location, food times, guest count/production target, dietaries, what leaves/goes live, owner/fire/pack actions, driver/handoff note where food moves, and ready-to-send or ready-to-serve gate.

5. **No cross-location mental load**  
   Do not put Barn fire tasks on the Kayla sheet, Kayla dietary notes on the SSP delivery sheet, or SSP delivery counts inside the Barn service sheet. Cross-location dependency belongs only in the short dispatch overview.

6. **Current Kayla correction remains locked**  
   Kayla/Hedlow feasting entrees are one piece each plus 9 percent overall buffer. Beef albondigas = 45 total pieces/balls, not 2 per guest and not the source 90-ball batch unless planned leftovers are clearly requested.

---

## 0. v8 sync summary — split-count and feasting piece-count update



v8 keeps the v7 prep-list cleanup and adds two active count rules from the current Barn / Kayla correction:

1. **MYO burger 50/50 split rule**  
   When the user confirms a MYO burger bar is split 50/50 between proteins, apply the 9% buffer to the total guest count first, then split portions between proteins. Round to practical equal portions where service is easier. Example: 70 guests x 1.09 = 76.3 -> 77 portions; practical 50/50 round = 80 total = 40 chicken + 40 beef. Do not prep full-guest-count quantities for both proteins unless the user asks for full-choice coverage.

2. **Feasting one-piece-per-item rule**  
   When the user confirms feasting items are one piece each plus buffer, every listed piece item is counted as guest count x 1.09 rounded practically. Example: Kayla 41 guests x 1.09 = 44.69 -> 45. Beef albondigas = 45 balls, not 90 balls, unless the user specifically confirms 2 pieces per person.

3. **Source recipe scaling rule**  
   If an existing recipe produces more pieces than the event count requires, scale the recipe to the confirmed piece count or mark planned leftovers clearly. Do not leave a source yield in the prep sheet if it conflicts with the confirmed event count.

---

## 0A. v7 retained summary — prep-list assumption and stock-flow cleanup
v7 keeps the v6 food-only, quantity-first and stacked-card production system, but removes unnecessary ordering and storage clutter from prep lists.

Updated control points:

1. **Prep lists assume ordering is complete**  
   When the user asks for a prep list, run sheet or production sheet, assume ordering has already been done and stock has arrived unless the user specifically asks for an order list, supplier list or still-needed ledger.

2. **Orders stay separate from prep lists**  
   Do not include order actions, supplier emails, order reminders or still-needed purchasing tasks inside prep lists unless the user requests ordering or missing stock is explicitly part of the problem.

3. **No coldroom/rack allocation blocks by default**  
   Do not include broad coldroom space allocation, rack allocation, shelf planning or “make room” cards in prep lists. A short action such as **Sort delivered stock by event/use** is allowed where it protects multi-event separation.

4. **Start from the requested day**  
   If the user asks for the current prep list from Wednesday, Friday or any other day, start the sheet from that day. Do not include earlier ordering days, completed prep days or historical context unless it affects current food risk.

5. **Keep useful event separation**  
   Continue to separate events, dietaries, hot/cold, dispatch lanes and shared components. The update removes storage-management filler, not food-control separation.

6. **Current-source update priority**  
   User corrections from the current project still win over uploaded SOPs and older sheets.

---

## 0. Conflict review — v5 to v6

v6 does not remove the v5 production harness. It tightens it into a faster, food-only kitchen command system.

Resolved integration points:

1. **Food-only kitchen sheets vs event-admin documents**  
   Prep/run/production sheets are now food-control documents only. They must show what to prep, cook, cool, season, fire, pack, deliver and serve. Admin notes, vendor/styling detail, deposit status and generic reminders are excluded unless they directly affect food timing, service, delivery or risk.

2. **More readable layout vs compact page count**  
   Readability wins. Kitchen PDFs must be readable from around 2 metres. Do not shrink text to save pages. Split across pages instead.

3. **Stacked cards vs page density**  
   All cards are full-width stacked cards. No side-by-side cards, no two-card rows, no multi-column production cards. Tables are allowed only for compact count/order/allergen ledgers where they genuinely read faster.

4. **Consistent card design vs changing layout**  
   Card borders, headers, greyscale hierarchy and font sizes must not drift between sheets. Functional food blocks stay inside visible framed cards.

5. **Quantity-first workflow vs timeline-first workflow**  
   Sheets must show what we actually prep and the exact quantities before Food Times / Service Timeline. The chef should know the workload before reading the timing block.

6. **Dietaries as action vs dietaries as notes**  
   Dietary/allergy information must produce a food action and suitable close-to-menu alternative. Do not only state “1 GF” or “1 onion allergy”. State what is being made instead or what is being modified.

7. **Shared prep vs over-explanation**  
   Shared prep cards are now compact. Say what to make and where to allocate it. Do not explain why it is shared unless there is a real production/dietary risk.

8. **Default modules vs product-format confusion**  
   Product format must be identified before applying a standard module. Example: corporate pax-based fruit box is not automatically the full Riviera styled fruit platter.

9. **Ownership vs staff-management clutter**  
   Dan/Ash ownership is required inside task cards, but only as food-action ownership. No admin role-management filler.

10. **Labels vs clutter**  
   Labels only appear when they protect food: dietary/allergen safety, event allocation, hot/cold, sauces, driver handoff, multi-event separation or delivery risk.

**Priority rule:** If a retained v5 section conflicts with a v6 rule, the v6 rule wins.

---

## 1. Riviera v6 kitchen sheet purpose

Riviera kitchen sheets must answer:

```text
What food is on?
What food is due when?
What do I prep now?
How much?
Who owns it?
What has to cook / cool / fire / reheat / pack?
What unlocks the next task?
What needs seasoning / finishing?
What must leave the kitchen?
```

Do not include details that do not help the food get made, fired, packed, delivered or served.

---

## 2. Food-only kitchen sheet filter

### Include

- Event name, date and guest count
- Food delivery/service time
- Location/contact only where it affects delivery or handoff
- Menu and what we actually prep
- Dietaries as food actions
- Exact quantities
- Filling summary where relevant
- Food times / service timeline
- Prep cards, fire cards and packing/service cards
- Sauce, dessert and dietary alternate recipes where needed
- Dan/Ash ownership
- Offsite cryovac / sous-vide / delivery notes where relevant
- Ready-to-send gate

### Remove unless directly food/service relevant

- Deposit status
- Vendor lists
- Photographer/celebrant/styling detail
- Ceremony details unless they trigger food movement
- Broad venue inclusions
- Full client history
- Generic “make sure this is labelled”
- Generic “set up sections”
- Generic “check storage”
- Broad hygiene/common-sense filler

Use labels only where there is a real dispatch, dietary, allergen, hot/cold, sauce, driver handoff or delivery risk.

---

## 2A. Prep-list baseline assumption

When creating a prep list, run sheet or production sheet:

```text
Assume orders are already placed.
Assume stock has arrived.
Do not add ordering actions unless the user asks for orders.
Do not add coldroom/rack allocation cards.
Start from the day requested by the user.
```

Allowed short note where useful:

```text
Sort delivered stock by event/use.
Keep GF/DF/dietary items separate.
```

If the user asks for an order list, switch into supplier-order mode and use the Supplier Ordering Translator / Weekly Order Workflow as normal.

---

## 3. v7 top-of-sheet order

Use this order for food-only production sheets:

1. **Event snapshot / week snapshot**
2. **What we actually prep / quantity check**
3. **Filling summary** where sandwiches/wraps/rolls/croissants/brioche/focaccia/lunch boxes are involved
4. **Dietary action** if any dietary affects production
5. **Food Times / Service Timeline**
6. **Start Here / Do Not Start Yet / Delivered Stock Sort** where useful
7. **Production cards by day**
8. **Service/fire cards** where relevant
9. **Ready to Send / Ready to Serve gate**

Quantities come before Food Times.

---

## 3A. MYO burger split-count rule

When a MYO burger bar has multiple protein choices, do not assume every protein is full-guest-count unless the user asks for full-choice coverage.

If the user confirms a **50/50 split portion-wise**:

```text
1. Guest count x 1.09 = total buffered portions.
2. Round to practical service number.
3. Split 50/50 between proteins.
4. Round each protein up to practical pack/source quantity.
```

Example:

```text
Barn: 70 guests x 1.09 = 76.3 -> 77 portions.
Practical service round: 80 total portions.
50/50 split = 40 Texan chicken + 40 Angus beef.
```

Use source recipe quantities for the split portion count, not for full guest count per protein.

---

## 3B. Feasting one-piece-per-item rule

When the user confirms feasting items are **one piece each plus buffer**, count each listed piece item as one per guest plus 9% buffer unless the menu/source says otherwise.

Example:

```text
Kayla / Hedlow: 41 guests x 1.09 = 44.69 -> 45.
Beef albondigas = 45 balls.
Chicken skewers = 45 skewers.
Oysters = 45 required, order practical 48 / 4 dozen.
Lamb cutlets = 45 required, order practical 48 if pack/service buffer needed.
```

Do not carry across source-recipe serve logic like 2 or 3 pieces per serve when the current event correction says one piece each.

---

## 4. Quantity check formatting

The **WHAT WE ACTUALLY PREP / QUANTITY CHECK** section must be a clean bullet list.

Use:

```text
WHAT WE ACTUALLY PREP:
- **Scones** — 72 pieces / 6 platters
- **Corporate fruit boxes** — 40 pax packed fruit component
- **Ham cheddar croissants** — 24 pieces
- **GF sandwich box** — 1 box / dietary substitute
```

Each bullet should show:

- **Food item in bold**
- Exact quantity
- Event allocation if multi-event
- Dietary adjustment if relevant
- Buffer if applied

---

## 5. 2-metre kitchen readability standard

Kitchen prep/run/production PDFs must be readable from about **2 metres away** in a working kitchen.

```text
PAGE:
A4 portrait

COLOUR:
Black / white / grey only
High contrast
No pale grey body text

FONT:
Arial primary
Helvetica / Liberation Sans fallback

MAIN TITLE:
24–28 pt bold

DAY HEADING:
20–22 pt bold

FOOD TIMES / DELIVERY TIMES:
18–22 pt bold

CARD TITLE / DISH NAME:
16–18 pt bold

PRODUCTION CARD BODY:
Minimum 13 pt

SMALL NOTES / FOOTER:
Minimum 11 pt
Only for low-priority source/footer text
```

Readability beats page count. Do not shrink the font to fit more content. Split across pages instead.

---

## 6. Fixed greyscale design language

Hard-lock this hierarchy for kitchen PDFs:

```text
MAIN DOCUMENT TITLE:
Black background / white text / 24–28 pt bold

DAY-OF-EVENT BANNER:
Very dark grey or black background / white text / 24–28 pt bold

DAY HEADING:
Dark grey background / white text / 20–22 pt bold

SECTION HEADER:
Mid-grey background / white text / 16–18 pt bold

SUBHEADER / CARD CATEGORY:
Light grey background / black text / 14–16 pt bold

CARD TITLE / DISH NAME:
Black text / 16–18 pt bold

CARD BODY:
Black text / minimum 13 pt

WARNING / ACTION LABELS:
Dark grey border or left rule / bold black text / greyscale only
```

Do not change card borders, header colours, font sizes or hierarchy between documents unless the user specifically requests a redesign.

---

## 7. Consistent card-frame rule

Every production block must stay inside a consistent visible card.

Applies to:

- Event cards
- Day summaries
- Quantity banners
- Dietary actions
- Prep cards
- Service/fire cards
- Sauce cards
- Filling cards
- Dessert recipe cards
- Allocation cards
- Coldroom ready blocks
- Ready-to-send gates

Card standard:

```text
- Full-width only
- Visible black/dark grey border
- White background
- Consistent padding
- Bold title/action line
- Quantity visible where relevant
- No loose floating production text
```

Page-break rule:

```text
If a card does not fit cleanly, move it to the next page.
Do not remove the frame.
Do not shrink the font.
Do not split a recipe/method card awkwardly.
```

---

## 8. Owner-first production card rule

Active prep/service/fire cards start with owner + command action.

Format:

```text
ASH | Start **vegetable prep**
DAN | Fire **beef fillet**
BOTH | Pack **wake delivery**
ASH | Begin **fruit platter build**
DAN | Finish **sauces**
```

The owner/action line must be the first visible line of the card.

If ownership changes between phases:

```text
PREP OWNER: Ash
SERVICE OWNER: Dan
```

Keep this food-action only. Do not add role-management clutter.

---

## 9. Command-action wording rule

Every production card must use direct action wording.

Preferred verbs:

```text
Make / Start / Begin / Pull / Fire / Reheat / Cook / Cool / Portion / Allocate / Pack / Fold / Mix / Marinate / Brine / Cryovac / Finish / Send
```

Use sequencing language:

```text
After pumpkin cools, portion for Event A.
After labneh hangs overnight, fold herbs/lemon/oil.
After hot nibbles fire, season and pack.
```

Inside cards, the food item/component being prepped must be bold.

---

## 10. Production efficiency modules

Use these modules only where they make the sheet faster to work from. They are not mandatory on every card.

Every line must help food get prepped, cooked, cooled, seasoned, fired, packed, delivered or served.

1. **START HERE** — first 3–5 actions for the day.
2. **DO NOT START YET** — timing/quality/dietary traps only.
3. **FIRE / REHEAT / HOLD** — hot items need exact firing/reheat/hold method where relevant.
4. **READY TO SEND / READY TO SERVE** — final food-only send check.
5. **BIG TICK BOXES** — use only where useful. Approved sequence: Prep / Cook / Cool / Portion / Season / Pack / Sent.
6. **QUANTITY BANNER** — big production totals at the top of day/event.
7. **SHORT SEASONING / FINISH** — fast flavour line, not long theory.
8. **QUALITY DANGER** — only for items easy to ruin.
9. **ONE-PERSON NEXT TASK** — use sparingly to keep Dan/Ash moving.
10. **BENCH LOAD** — use only for real cold bench/fryer/Rational/packing pressure.
11. **SEPARATE PREP CARDS + SERVICE/FIRE CARDS** — for big weddings, buffets, offsite, tapas overlap or long service.
12. **IF BEHIND** — short fallback priority.

Example:

```text
**MIXED HOT NIBBLES — 240 pieces / Wake**

ASH | Pull **hot nibbles** to fridge/coolroom.
DAN | Fire **hot nibbles** close to delivery.

Fire:
Rational 180°C / 12–15 min / 20% humidity.

Season / finish:
Season while hot. Sauce packed separately.

Quality danger:
Do not over-hold. Pack close to delivery.

If behind:
Prioritise hot food firing + cold platters packed. Garnish last.
```

---

## 11. Day-of-event visual anchor

Day-of-event pages must have stronger visual priority than ordinary prep days.

Use:

- Larger day-of-event heading
- Darker banner/background
- Clear high-priority production-day treatment
- Food times and ready-to-send gate visible

Purpose: when the sheet is on the kitchen wall, the actual event day must be immediately obvious.

---

## 12. Filling summary and filling recipe rules

For sandwiches, wraps, rolls, brioche, croissants, focaccia and lunch boxes:

1. Show compact filling summary near the beginning.
2. Do not show the full split in the early summary unless needed.
3. Early summary should show what we actually make:

```text
FILLINGS:
- **Ham cheddar Dijon**
- **Beef horseradish**
- **Smoked chicken dill**
- **Roast pumpkin feta**
```

Full filling recipes go in the production cards and must include:

- Yield/count
- Ingredient quantities
- Quick method
- Seasoning/finish
- Packing/service note
- Dietary/allergen flags where relevant

---

## 13. Sauce / dressing / relish card rule

Sauces must not be vague.

Every sauce, jus, relish, aioli, dressing, labneh/yoghurt sauce, cream, reduction, gravy or dessert sauce card must include:

```text
- Target yield
- Ingredient quantities
- Quick method
- Season / finish
- Reheat / hold / service note where relevant
```

Keep the recipe compact but cookable.

---

## 14. Dessert production rule

Desserts made in-house for an event need a strict recipe directly under the task card.

Applies to:

- Sticky date madeleines
- Cannoli fillings
- Tiramisu
- Custards / crème anglaise / Benedictine custard
- Toffee sauce
- Cakes
- Scones
- Petit fours
- Dessert sauces

A sticky date madeleine card must include:

```text
- Batch yield
- Ingredient quantities
- Method
- Baking temperature/time
- Sauce/custard quantities
- Season/finish
- Holding/reheat/service notes
- Allergens
```

---

## 15. Dietary and allergy action rule

Dietaries and allergies must produce a food action.

### Closeness rule

For food allergies and dietaries, get as close as safely possible to the actual meal that is being served. Remove or substitute only the unsafe component where practical.

Examples:

```text
Garlic/onion allergy:
Make 1 extra portion of the same dish without garlic/onion.

GF/DF plated chicken:
Serve same chicken plate where possible, no cream sauce, GF potato/veg, herb oil + lemon.

Pescatarian plated alternate:
Serve reef fish with same suitable veg/sides, no meat jus.
```

Do not only write:

```text
1 GF
1 onion allergy
```

Write the actual alternative and quantity.

If the safest option cannot be determined from source/menu:

```text
NEEDS CONFIRMATION — proposed safest option: [food plan]
```

---

## 16. Alternate-drop count and 9% buffer rule

For alternate-drop meals:

1. Add 9% production buffer unless user overrides.
2. Include dietaries/alternatives in total production.
3. Reduce the two standard mains evenly to account for dietary alternatives.
4. Split standard mains as evenly as practical.

Example:

```text
72 guests + 9% buffer = 79 serves rounded
Dietary alternatives = 4 serves
Standard mains remaining = 75 serves
Chicken standard = 38
Beef standard = 37
Dietary alternatives = 4
```

Use practical kitchen rounding.

---

## 17. Thawing, cryovac, protein and offsite sous-vide rules

### Thawing

Frozen items that need thawing must be pulled **2 days before use** into fridge/coolroom.

Use:

```text
Pull from freezer to fridge/coolroom 2 days before use.
```

Do not write:

```text
Thaw day before.
Thaw in freezer.
```

### Cryovac / proteins

- Steaks are marinated and cryovacced.
- Steaks stay uncooked/marinated/cryovacced for final cooking unless the event plan says otherwise.
- Roast chicken, roast lamb and similar proteins need brining or marinating unless source recipe says otherwise.
- For offsite catering, cryovac suitable proteins where practical.
- Cryovacced non-steak items are cooked one day in advance where appropriate.
- Cryovac happens at Roscoes.
- Add a 30-minute time window for Dan or Ash to leave Riviera, go to Roscoes and seal cryovac bags when cryovac is required.

### Offsite sous-vide bain logic

For offsite catering, suitable cryovacced items are sous-vide cooked/reheated and reheated/held in sous-vide bains. Include time/temp where known.

---

## 18. Tapas overlap rules

If a prep window covers Sunday Tapas:

- Include Friday Tapas pull as a Friday prep action.
- Do not write policy language such as “locked weekly rule” inside the sheet.
- If an event falls on Sunday, include a food-only Tapas Ready block.

Friday prep action:

```text
FRIDAY — Pull **Sunday Tapas freezer prep** to fridge/coolroom.
```

Sunday Tapas Ready block:

```text
TAPAS READY:
- Pulled/frozen prep ready
- Sauces ready
- Focaccia accounted for
- Dessert mise ready
- Service-critical tapas items ready
```

Sunday 11:00–17:00 remains Tapas service lock unless user says otherwise.

Chicken skewers marinade standard must include **limoncello and honey** alongside lemon/herb/garlic seasoning.

---

## 19. Focaccia accounting and wording rules

If focaccia is required, it must appear in quantities and prep cards. Do not assume stock.

Use:

```text
FOCACCIA:
Count it. Prep it. Slice it. Pack it.
```

Do not use the word “retard” in kitchen sheets. Use:

```text
Overnight cold proof
```

Grazing focaccia standard:

```text
Every grazing box includes focaccia.
1 m graze = 1/4 tray sliced focaccia.
```

For seated formal/function dinner, focaccia is table bread with whipped butter, not sliced-box piece-count logic.

---

## 20. Grazing prep rules

Every grazing table/offsite graze needs a proper graze prep section, not just a packing note.

For offsite grazing tables, portion all items into PC containers for the event:

- Cheeses
- Deli meats
- Olives
- Crackers
- Bread/focaccia
- Dips
- Dried fruit
- Fresh fruit/garnish
- Nuts/seeds where applicable
- Garnish/finish

Every grazing box includes focaccia.

Grazing box module:

```text
30 cm x 40 cm grazing box:
Use scaled quantities from the 1 m / 40 pax grazing table standard.
Include focaccia allocation.
```

If exact box quantity is not specified, use the active house grazing-box module or mark **NEEDS CONFIRMATION**.

---

## 21. Fruit format differentiation rule

Do not apply full standard fruit platter spec unless the order is actually a **seasonal fruit platter / fruit platter box** in the Riviera platter sense.

Differentiate before calculating quantity:

- Corporate fruit box / pax-based packed fruit
- Fruit cups
- Seasonal cut fruit bowl
- Styled seasonal fruit platter
- Grazing box fruit
- Grazing table fruit
- Breakfast fruit + yoghurt item

Corporate fruit box with pax count = packed corporate fruit component unless the event source confirms styled platter.

For standard fruit platter/box, show exact standard quantity per platter. Do not include low-value notes like “wash fruit” or “check ripeness” unless there is a specific issue.

---

## 22. Locked scone module

### Yield

```text
12 normal-size scones:
- Scone mix 1080 g
- Water 600 ml
```

Scale directly from this ratio.

### Method

```text
ASH | Make **scone dough**

Mix scone mix and water in mixer.
Do not overmix.
Rest 5 minutes.
Shape and tray.
Bake 200°C for 12 minutes.
Drop to 160°C for another 10 minutes.
Cool before packing.
```

Do not use more unless scaling this exact ratio.

---

## 23. Labneh module

Labneh is a two-day production item.

```text
DAY 1:
Hang yoghurt overnight.

DAY 2:
Fold through herbs, garlic, lemon, olive oil and seasoning.
Portion for event.
```

Include this in prep sheets whenever house labneh is needed.

---

## 24. Delivered stock sort and multi-event separation

For prep lists and production sheets, assume ordering is complete and stock has arrived unless the user specifically asks for ordering.

Do not include broad coldroom or rack-allocation blocks by default. Avoid cards about clearing space, assigning shelves, making room, rack planning or general storage setup.

Use only a short food-control line where it helps protect event separation:

```text
SORT DELIVERED STOCK — quick pass
- Sort delivered stock by event/use.
- Keep dietary/GF/DF items separate and clearly marked.
- Keep shared prep portioned before event-day service.
```

This line is optional. Use it for multi-event weeks, dietary-heavy events or dispatch-heavy days. Do not turn it into a storage-management card.

Day-of shared stock warning remains useful when events overlap:

```text
USE ONLY THIS EVENT’S ALLOCATION:
- Roast pumpkin — 2 kg for Corporate Lunch
- Do not pull from Sunday carvery allocation.
```

---

## 25. Shared prep compact format

Shared prep cards must be minimal.

Use:

```text
**ROAST PUMPKIN BASE — 10 kg raw**

ASH | Roast **pumpkin base**.
Roast plain. Chill flat.

PORTION / ALLOCATE AFTER PRODUCTION:
- Event A — 2 kg
- Event B — 3 kg
- Event C — 4 kg
- Buffer — 1 kg
```

Do not explain the shared-prep rationale unless there is a real risk.

---

## 26. Dan / Ash ownership rule

Dan/Ash split must give clear ownership for each prep day and event day.

Keep it food-action only.

Example:

```text
PREP DAY OWNERSHIP:
Dan — protein seasoning/brine/marinade, sauce final balance, count decisions.
Ash — veg portioning, garnish prep, cold assembly, packing, support cooking.

EVENT DAY OWNERSHIP:
Dan — fire hot food, final seasoning, service call.
Ash — cold assembly, garnish, packing, delivery support.
```

Inside active cards, owner-first command lines still take priority.

---

## 27. Food Times / Service Timeline rule

If a client/event run sheet includes food times, include a Food Times / Service Timeline block near the top after quantities.

Only include non-food timings when they affect kitchen work.

Example:

```text
FOOD TIMES / SERVICE TIMELINE:
- 10:30 — Delivery due
- 11:15 — Food on table
- 12:00 — Buffet opens
- 18:30 — Main course service
- 21:00 — Late-night hot nibbles
```

If food time is missing:

```text
FOOD TIMES:
NEEDS CONFIRMATION — delivery/service time not supplied.
```

---

## 28. v6 final QA for prep/run/production sheets

Before producing a sheet, check:

```text
- Food-only: no admin clutter.
- Quantities before Food Times.
- What We Actually Prep is a bullet list.
- Correct product modules selected: fruit format, grazing, scones, hot nibbles, focaccia.
- Cards are full-width, bordered, stacked and consistent.
- 2-metre font standard is met.
- Owner-first command line appears in active cards.
- Food item/component names are bold inside cards.
- Dan/Ash ownership is clear by day.
- Dietaries have actual close-to-menu alternatives.
- Sauce/dressing/relish cards include exact yield, quantities and method.
- In-house desserts include strict recipe.
- Shared prep is compact and has allocation line.
- Multi-event sheets may include a short delivered-stock sort line only where useful.
- If Sunday is involved, Friday Tapas pull and Tapas Ready are included.
- Focaccia is counted wherever needed.
- Frozen thawing uses 2-day fridge/coolroom rule.
- Offsite cryovac/sous-vide/Roscoes requirements are included where relevant.
- Ready-to-send/service gate is food-only and practical.
```

---

## 29. v6 changelog — mock rounds 1–10

### Round 1 — corporate delivery
- Day-of-event banner needs stronger visual priority.
- Filling summary appears near beginning.
- Exact filling recipes added.
- Dan/Ash food-action split added.
- Rough prep-time estimates added.

### Round 2 — wake delivery
- Quantities/what we prep comes before Food Times.
- Early filling summary is compact.
- Scone module locked.
- Fruit platter module uses exact quantity, no generic fruit notes.
- Grazing box module required.

### Round 3 — baby shower during tapas
- Dietary action appears early.
- GF substitute plan required.
- Sunday Tapas Ready added.
- Friday Tapas pull included as prep action.
- Focaccia accounting locked for graze/grazing boxes.

### Round 4 — wedding
- Sauce cards need exact quantities/yields and quick methods.
- Dietary alternatives must be production-ready and close to real meal.

### Round 5 — offsite carvery
- Dietaries stay close to actual menu.
- Garlic/onion-free = same dish modified where practical.
- Alternate-drop 9% buffer and even split logic locked.
- Frozen thawing = 2 days in fridge/coolroom.
- Overnight cold proof wording locked.
- Offsite protein cryovac/Roscoes/sous-vide logic added.

### Round 6 — multi-event weekend
- Shared prep shortened.
- Friday Tapas pull appears as action only.
- Cryovacced non-steak items cooked one day ahead where suitable.
- Offsite reheating uses sous-vide bains.
- Chicken skewer marinade includes limoncello + honey.
- Grazing prep into PC containers.
- Labneh = hang overnight, fold next day.

### Round 7 — heavy sandwich week
- Consistent card borders/frames hard-locked.
- Page-break/card keep-together locked.
- v7 update later removes mandatory coldroom/rack allocation blocks and replaces them with optional delivered-stock sort wording.

### Round 8 — hot nibble week
- Owner inside cards.
- Command-style card wording.
- Fixed greyscale header hierarchy.

### Round 9 — dietary-heavy plated gala
- Owner-first card title/action line.
- In-house dessert strict recipe required.

### Round 10 — nightmare mixed week
- Fruit format differentiation locked.
- Corporate fruit box ≠ standard fruit platter.
- Scone method fully locked.
- Bold item/component names inside cards.
- Quantity check becomes bullet list.

---

## 30. Retained v5 master SOP sections

The following v5 sections remain active unless explicitly overridden by v6 above.

## 1. Source hierarchy

Use sources in this order:

1. User correction in the Riviera project
2. Most recent confirmed event/client detail
3. Most recent uploaded/source document
4. Published Riviera package/menu/brochure
5. Internal Riviera working standard
6. Older/general reference
7. **NEEDS CONFIRMATION**

If a source conflicts, flag it clearly. Do not invent guest counts, menus, timings, prices, dietaries, supplier facts, supplier prices, pack sizes, or source claims.

Unsourced factual claims are drafts, not truth. Mark assumptions as assumptions.

---

## 2. Task-mode check before every Riviera response

Before producing output, classify the request:

- Event intake / planning
- Supplier order
- Prep sheet / run sheet
- Recipe SOP
- PDF/print document
- Client email/copy
- Count conversion
- Dietary/allergen planning
- Sandwich/wrap/croissant/brioche/focaccia/lunch box planning
- Hot nibble planning
- Sunday tapas overlap
- Limited storage / dispatch planning
- Production harness / event-prep workflow

Apply all relevant SOPs automatically. If critical information is missing, mark it as **NEEDS CONFIRMATION** instead of guessing.

---

## 3. Riviera Event Prep Production Harness v1

Every Riviera prep sheet must first classify the job as one of two modes:

```text
MODE A — SINGLE EVENT SHEET
Use when there is only one function, event, delivery, pickup, order, or production job.

MODE B — MULTI-EVENT SHEET
Use when two or more events/orders overlap in the same prep window.
```

The production harness turns prep sheets into chef production maps, not just task lists.

Core rule:

```text
IF THIS IS DONE → THEN THIS CAN START
```

Examples:

```text
Stuffing made + chilled → chickens can be stuffed/rolled
Focaccia baked + cooled → slice/box/pack
Sauces made + labelled → sauce crate can be packed
Fillings made → sandwiches/wraps can be assembled
Fruit washed + cut → fruit platters can be built
Hot nibbles counted → tray/reheat/pack
All cold components packed → cold crate ready
All hot components fired → hot box ready
All components complete → driver handoff cleared
```

---

## 4. Mode A — Single Event Production Sheet SOP

Use one complete production sheet for the event.

Default structure:

1. **Mode classification** — SINGLE EVENT SHEET
2. **Event snapshot**
3. **What we actually prep / quantity check**
4. **Confirmed / missing / assumed / risk block**
5. **Menu**
6. **Dietaries / allergen strip**
7. **Count conversion block** where relevant
8. **Component ledger**
9. **Production dependency flow**
10. **Blocked / ready to do now**
11. **Equipment batching** where useful
12. **Prep by day**
13. **Dan / Ash work split**
14. **Packing / delivery / service map**
15. **Labels only where operationally needed**
16. **Risks / reminders**
17. **Final QA check**

### Single event snapshot

```text
EVENT:
DATE:
TIME / DELIVERY:
GUEST COUNT:
LOCATION:
EVENT TYPE:
MENU:
DIETARIES:
SOURCE / PACKAGE:
CONFIRMED:
MISSING / NEEDS CONFIRMATION:
```

### Single event component ledger

```text
COMPONENT:
MENU ITEM:
QUANTITY:
STATUS:
NEXT ACTION:
UNLOCKS:
HOLDING:
PACKING/SERVICE:
RISK:
```

### Single event dependency example

```text
MENU ITEM: Chicken ballotine

COMPONENTS:
- Chickens deboned / brined
- Stuffing made
- Butcher's twine / cling / bags ready
- Sauce made
- Garnish prepped

PRODUCTION SEQUENCE:
1. Make stuffing.
2. Test-fry stuffing, adjust seasoning.
3. Once stuffing is cold and portioned, stuff chickens.
4. Once chickens are stuffed, roll and tie.
5. Once rolled, chill/set.
6. Once set, cook/sous-vide/roast according to event plan.
7. Once cooked and chilled/rested, portion or hold for service.
```

---

## 5. Mode B — Multi-Event Production Sheet SOP

Use when multiple functions sit in the same prep window.

Default structure:

1. **Mode classification** — MULTI-EVENT SHEET
2. **Week / prep-window snapshot**
3. **Event index**
4. **What we actually prep / quantity check**
5. **Cross-event component ledger**
6. **Overlap check**
7. **True shared prep summary** only if real overlap exists
8. **Do not combine list** where relevant
9. **Event-specific production sheets**
10. **Day-by-day run sheet**
11. **Dan / Ash work split**
12. **Equipment batching** where useful
13. **Packing / delivery sequence**
14. **Final QA check**

### Multi-event prep-window snapshot

```text
PREP WINDOW:
STANDARD WORK HOURS:
DATED CONSTRAINTS:
SUNDAY TAPAS LOCK:
DELIVERY/SERVICE PRESSURE:
STAFF LIMITS:
BIGGEST BOTTLENECKS:
```

### Event index

```text
1. EVENT:
   DATE:
   TIME / DELIVERY:
   LOCATION:
   GUEST COUNT:
   MENU:
   DIETARIES:
   STATUS:

2. EVENT:
   DATE:
   TIME / DELIVERY:
   LOCATION:
   GUEST COUNT:
   MENU:
   DIETARIES:
   STATUS:
```

### Cross-event component ledger

```text
COMPONENT:
EVENT(S):
TOTAL QUANTITY:
EVENT SPLIT:
STATUS:
NEXT ACTION:
UNLOCKS:
SHARED OR EVENT-SPECIFIC:
HOLDING:
PACKING:
RISK:
```

---

## 6. True shared prep test

Shared prep is only allowed when all of this matches:

- Same recipe
- Same prep state
- Same cut / portion / finish
- Same dietary status
- Same holding method
- Same service quality
- Safe to allocate across events

If one of these fails, keep the prep event-specific.

### Shared prep summary format

```text
SHARED PREP — COMPONENT NAME

TOTAL REQUIRED:
USED FOR:
- Event A:
- Event B:
- Event C:
BUFFER:
PREP DAY:
HOLDING:
PACKING:
UNLOCKS:
RISK / REMINDER:
```

### Useful shared prep example

```text
SHARED PREP — ROAST PUMPKIN

Total required: 8 kg raw pumpkin
Used for:
- Corporate wraps: 3 kg roasted pumpkin
- Baby shower salad: 2 kg roasted pumpkin
- Scroll filling: 1.5 kg roasted pumpkin
- Buffer: 1.5 kg

Prep:
- Roast plain with oil, salt, pepper.
- Chill flat.
- Do not mix with pesto, feta, dressing, or garnish until event-specific assembly.

Unlocks:
- Once pumpkin is roasted and chilled, wrap filling can be mixed.
- Once wrap filling is mixed, wraps can be rolled.
- Once salad garnish is prepped, baby shower salad can be assembled.
```

### Do not combine examples

```text
DO NOT COMBINE:
- GF hot nibbles with standard hot nibbles.
- Dressed salads across events.
- Sandwiches once sauced.
- Fruit platters once cut if delivery dates differ.
- Hot food with different service times.
- Pumpkin for salad with pumpkin for scroll filling once dressed.
- Sauces where one event has a dietary restriction and another does not.
```

---

## 7. Component status tracking SOP

Add a compact status column to component ledgers where it helps production control.

Approved statuses:

```text
NOT STARTED
PREPPED
COOKED
CHILLED
PACKED
LOADED
DONE
BLOCKED
NEEDS CONFIRMATION
```

Use status tracking for busy prep weeks, multi-event sheets, delivery-heavy days, dietaries, hot nibbles, large batch components, and anything with several production steps.

Example:

```text
COMPONENT                  EVENT              STATUS        NEXT ACTION
Pumpkin roasted             Corporate lunch    COOKED        Chill flat, then mix filling
Scones baked                Wake               DONE          Pack with jam/cream
GF hot nibbles              Pool opening       NOT STARTED   Count Woolies stock first
Aioli                       Tapas              PREPPED       Label and portion
```

---

## 8. Blocked / Ready To Do Now SOP

Prep sheets should show what is blocked and what can be done immediately when useful.

```text
BLOCKED
- Cannot assemble wraps until fillings are cooled.
- Cannot pack hot nibbles until final count is confirmed.
- Cannot finish dietary box until allergen check is done.

READY TO DO NOW
- Portion scones.
- Cut fruit.
- Label sauce tubs.
- Tray hot nibbles.
```

Use this to help Dan/Ash move without constant verbal direction.

Keep it short. Only list active blockers or genuinely useful next tasks.

---

## 9. Equipment batching SOP

For multi-event prep, batch by bottleneck where useful, not only by event.

Think through:

- Rational
- Fryer
- Stove
- Cold bench
- Holding oven
- Fridge/shelf
- Packing bench
- Delivery/loadout

Example:

```text
RATIONAL BATCHING
- Roast pumpkin for all events first.
- Bake scones after savoury roasting is finished.
- Reheat hot nibbles last, closest to delivery.

FRYER BATCHING
- Calamari/fried items stay day-of only.
- Arancini and pastizzis grouped where service timing allows.
- GF fried items first or separate process if required.

COLD BENCH BATCHING
- Fruit platters together.
- Sandwich/wrap assembly together.
- Dietary boxes separate.
```

Do not over-batch where quality, dietary safety, or service timing would suffer.

---

## 10. Packing map SOP

For delivery, offsite, multi-event, corporate, wake, platter, and baby shower work, include a compact packing map.

Packing maps use crates/boxes. They do not override the one trolley/one shelf SOP.

Example:

```text
EVENT PACKING MAP

COLD CRATE 1 — Capricorn Enterprise
- Sandwiches
- Fruit platter
- Sauce tubs
- Dietary box

HOT BOX 1 — Wake
- Hot nibble platter x 3
- Sauce tubs

ROOM TEMP BOX — Wake
- Scones
- Napkins
- Plates
- Tongs

DIETARY BOX
- GF/coeliac items only
- Separate label
- Separate tongs if required
```

Driver handoff must be explicit where delivery is involved.

---

## 11. Post-event correction loop SOP

After busy weeks, capture corrections so the system improves.

Use this format when the user gives feedback or when a prep sheet caused a problem:

```text
POST-EVENT CORRECTIONS

WHAT WORKED:
- 

WHAT FAILED / CAUSED FRICTION:
- 

MISSING INFO THAT HURT PRODUCTION:
- 

NEW SOP / STANDARD TO LOCK IN:
- 

ACTION:
- Active immediately / pending master index sync / needs confirmation
```

Use this for harness improvement. Do not silently rewrite old source files. Mark changes as **SOP CHANGE — pending master index sync** until the master index is regenerated.

---

## 12. Standard module library SOP

Build repeatable production modules for common Riviera items.

Priority modules:

- Mixed sandwich platter
- Premium wraps
- Mini brioche rolls
- Ham and cheese croissants
- Pizza scrolls
- Fruit platter
- Scones with jam/cream
- Mixed hot nibble box
- GF hot nibble box
- Single hot nibble platter
- 1 m grazing table
- 2 m grazing table
- Corporate working lunch box
- Baby shower high tea
- Wake platter set

Each module should include:

```text
YIELD / COUNT:
SOURCE COUNT:
KITCHEN PRODUCTION COUNT:
FILLING SPLIT:
COMPONENTS:
PRODUCTION SEQUENCE:
IF THIS IS DONE → THEN THIS CAN START:
PACKING:
DIETARY FLAGS:
SUPPLIER NOTES:
GARNISH / FINISH:
RISKS:
```

Modules can be reused inside event prep sheets, but event-specific details always override the module.

---

## 13. Default event/prep document structure

No cover page by default.

For prep/run/event documents, first apply the production harness mode:

- Single event = use the Single Event Production Sheet SOP.
- Multiple events = use the Multi-Event Production Sheet SOP.

For simpler event summaries or non-production documents, default order:

1. Order list
2. Event snapshot
3. Confirmed / missing / assumed / risk block
4. Count conversion block where relevant
5. Day-by-day run/prep structure
6. Dan / Ash work split
7. Event-specific prep blocks
8. Recipes/methods for prepped items
9. Packing / delivery / driver handover
10. Labels only where operationally needed
11. Final risks / reminders

Keep documents portrait, black/white/grey, high contrast, compact, kitchen-readable, and page-break optimised. Do not include Kitchen Council commentary in printable sheets unless explicitly requested.

---

## 14. Count conversion SOP

Before any event/prep/order sheet is generated, convert platter/box/package wording into exact kitchen production counts.

Apply to:

- Sandwich platters
- Wraps
- Croissants
- Brioche rolls
- Scone platters
- Sweet platters
- Hot nibble platters/boxes
- Gluten-free hot nibble boxes
- Mixed catering/lunch boxes

### Count conversion block

Use this structure where relevant:

```text
ORDERED ITEM:
SOURCE / PACKAGE COUNT:
KITCHEN PRODUCTION COUNT:
WHOLE-ITEM PREP:
SPLIT / FILLINGS:
DIETARY IMPACT:
PACKING:
RISK:
```

### Locked count standards

| Item | Source/package count | Kitchen production count |
|---|---:|---:|
| Scone platter | 12 pieces | 12 pieces |
| Sweet platter | 12 pieces | 12 pieces |
| Croissant platter | 12 croissants | 12 croissants |
| Wrap platter | 12 pieces | 12 pieces |
| Mini brioche roll platter | 12 rolls | 12 rolls |
| Sandwich platter | 24 points | 24 points / 6 whole sandwiches |
| Mixed hot nibble box/platter | 40-50 source range | 48 pieces / 12 each of 4 items |
| Single hot nibble platter | 20-25 source range | 24 pieces |

### GF hot nibbles

Use confirmed bought-in Woolworths gluten-free items first, such as GF pies and GF sausage rolls. Use in-house frittata bites or crispy potatoes only as backup or filler if bought-in pieces are short.

### Hierarchy

1. Event-specific count
2. User correction
3. Current source/package count
4. Riviera source override
5. Internal kitchen production standard
6. **NEEDS CONFIRMATION**

Examples:

- 10 scones for bridesmaids breakfast stays 10 because it is an event-specific count.
- 1 sold scone platter becomes 12 scones.
- 3 mixed hot nibble platters becomes 144 pieces total, split 36 each of 4 items.
- 4 sandwich platters becomes 96 points / 24 whole sandwiches.

---

## 15. Sandwich / wrap / croissant / brioche / focaccia / lunch box SOP

For kitchen-facing docs, always include:

- Total count required
- Whole items to make
- Cut style
- Yield/count per filling
- Exact filling breakdown
- Sauce/relish
- Garnish/finish
- Seasoning checkpoint
- Dietary/allergen flags
- Packing notes
- Production dependency where useful

Do not write generic “chef’s selection” in kitchen-facing documents unless the user explicitly asks for vague client-facing wording.

For kitchen prep, “mixed”, “assorted”, “chef’s selection”, or unspecified fillings must be converted into a clear Riviera-style filling split.

Use clean corporate box logic such as 12 sandwiches/wraps/scrolls with a balanced meat/chicken/vegetarian split unless the event or dietaries require otherwise.

### Default filling generation SOP

Trigger this SOP when an order says any of the following and no specific fillings are confirmed:

- Mixed sandwiches
- Mixed wraps
- Mixed rolls
- Mixed brioche
- Mixed focaccia
- Mixed croissants
- Mixed sliders
- Lunch boxes with sandwich/wrap/roll component
- Chef’s selection
- Assorted fillings

Use this source order:

```text
1. Event-specific client request
2. Current Riviera menu / package source
3. Riviera tapas menu flavour direction
4. Corporate / wake / platter filling examples
5. Riviera Seasoning Palette
6. Kitchen Council logic if balance is unclear
7. NEEDS CONFIRMATION only if dietaries, guest expectation, or menu integrity make it risky
```

Generated fillings must be labelled as:

```text
KITCHEN-SELECTED DEFAULT FILLINGS
```

Do not present generated fillings as client-confirmed unless the client has approved them.

### Required filling block

Use this structure in prep sheets:

```text
TOTAL COUNT:
WHOLE ITEMS TO MAKE:
CUT STYLE:
FILLING SPLIT:
KITCHEN-SELECTED DEFAULT FILLINGS / CLIENT-CONFIRMED FILLINGS:
SAUCE / RELISH:
GARNISH / FINISH:
SEASONING CHECK:
DIETARY FLAGS:
PACKING:
```

### Riviera default filling palette

Use these as default kitchen-selected options when no specific fillings are supplied.

#### Sandwiches / focaccia / Turkish

```text
1. Roast Beef, Beetroot Relish, Jarlsberg, Rocket, Horseradish Cream
2. Smoked Chicken, Bacon, Dill Sour Cream, Toasted Almond, Rocket
3. Roast Pumpkin, Feta, Basil Pesto, Spinach/Rocket, Lemon
4. Salami/Casalingo, Bocconcini, Sundried Tomato, Basil, Rocket, Balsamic
5. Ham, Cheddar, Dijon Emulsion, Pickle, Cos
```

#### Wraps

```text
1. Mediterranean Chicken, Moroccan Cous Cous, Tzatziki, Spinach
2. Lamb Kofta / Fattoush Style, Feta, Olives, Tomato, Tzatziki
3. Roast Vegetable, Spicy Capsicum Cream, Spinach, Herbs
4. Roast Pumpkin, Feta, Pesto, Rocket
```

#### Mini brioche / sliders

```text
1. Smoked Chicken, Bacon, Dill Sour Cream, Toasted Almond, Rocket
2. Vintage Beef, Aged Cheddar, Herbed Aioli, Tomato Relish, Rocket
3. Crispy Fish, Lemon-Caper Aioli, Roquette
4. Grilled Halloumi, Pesto, Pumpkin, Rocket
5. Prawn, Cocktail Sauce, Crisp Lettuce, Potato Crisps
```

#### Croissants

```text
1. Ham, Aged Cheddar, Silky Dijon Emulsion
2. Smoked Chicken, Herb Aioli, Rocket
3. Roast Pumpkin, Feta, Pesto, Spinach
4. Tomato, Bocconcini, Basil, Balsamic
```

### Example prep-sheet conversion

```text
MIXED SANDWICH PLATTER — 24 points / 6 whole sandwiches

KITCHEN-SELECTED DEFAULT FILLINGS:
- 2 whole Roast Beef, Beetroot Relish, Jarlsberg, Rocket, Horseradish Cream
- 2 whole Smoked Chicken, Bacon, Dill Sour Cream, Toasted Almond, Rocket
- 2 whole Roast Pumpkin, Feta, Basil Pesto, Spinach/Rocket, Lemon

Cut: quarters = 24 points
Seasoning check: taste fillings before assembly; adjust with acid, herbs, relish, aioli, seasoning, or texture without compromising dietaries.
Packing: single cold platter, garnish with restrained herbs/leaf, label event + dietary status.
```

### Default filling guardrails

- Event-specific filling requests override this default palette.
- Confirmed dietaries override this default palette.
- Do not use nuts unless suitable for the event and allergen risk is acceptable.
- Do not use seafood in default mixed fillings unless the order or event style supports it.
- Keep wet fillings controlled so sandwiches/wraps do not turn soggy.
- Keep vegetarian fillings substantial, not just salad.
- If a default filling would compromise client expectation, mark **NEEDS CONFIRMATION**.

---

## 16. Hot nibble SOP

Do not write vague tasks like “count hot nibbles.” Always show exact target counts.

Locked kitchen production standards:

- Single hot nibble platter = 24 pieces
- Mixed hot nibble box/platter = 48 pieces total
- Mixed standard split = 12 each of 4 items

For mixed standard boxes, show per-event and total production counts by item. Keep GF hot nibble quantities separate.

Apply production dependency:

```text
Confirmed count → pull stock → separate GF/standard → tray → reheat/fry/bake → sauce → pack → load/handoff
```

---

## 17. Focaccia SOP

Casual, delivery, grazing, offsite, corporate, and platter service:

- Sliced focaccia box = 12 pieces

Seated function dinner / plated formal service:

- Housemade focaccia with whipped butter
- Treat as table bread, not sliced box logic

Use the fixed house focaccia recipe unless replaced.

---

## 18. Grazing table SOP

1 metre / approx. 40 pax:

- 1/2 big wheel blue cheese
- 2 full wheels brie, one whole and one cut into half plus quarters
- 1/2 aged cheddar or black-coated cheese
- 1 x 1000 ml prosciutto
- 1 x 1000 ml salami
- 1 x 1000 ml PC olives
- 1 grape vine
- 2 cracker varieties
- Bread as well as crackers
- Dried apricots or dates
- 1 dip
- Dried citrus garnish

2 metres / approx. 75 pax:

- Roughly double the 1 metre quantity
- 2 grape vines
- Housemade focaccia
- 3 Woolworths fresh bread loaves

Bridal party graze boxes use the same ingredient family, scaled reasonably for the box size.

---

## 19. Fruit platter SOP

Per fruit platter:

- 1/2 baby watermelon
- 1/4 pineapple
- 1/2 papaya
- 2 kiwis
- 1/4 grape vine
- 3 apples
- 2 oranges
- 10 blueberries
- 4 blackberries
- 4 strawberries
- 1 passionfruit
- 1/4 honeydew or rockmelon
- 3 edible flowers
- Mint garnish
- Toasted shredded coconut

Production dependency:

```text
Fruit ordered/received → wash/check quality → cut firm fruit → cut delicate fruit last → garnish → pack cold → load cold crate
```

Cut fruit timing must respect event timing and fridge space.

---

## 20. Sunday tapas constraint

Tapas runs every Sunday from 11:00 to 17:00.

During Sunday catering/platter work:

- Mark 11:00-17:00 as **Tapas service lock** when relevant.
- Dan/Ash must physically protect shop service flow unless the user says otherwise.
- Drivers may be used, but kitchen coverage still matters.
- Heavy prep should move to Wednesday-Saturday.
- Sunday work should be final assembly, reheating, packing, delivery checks, and unavoidable catch-up only.
- Sunday tapas is service-constrained, not an absolute no-prep block.

---

## 21. Standard work hours and dated constraints

Default work hours:

- 08:00-16:00
- Include a 30-minute flexible break

For weddings, large functions, or long event days, 10-11 hour days may be planned only when service/delivery needs justify it.

Active dated constraint:

- Dan must leave work at 15:30 next Friday where this remains relevant to the current planning window.

---

## 22. Dan / Ash work split SOP

Every prep/run/event sheet should include a practical Dan/Ash split unless explicitly asked not to.

Dan:

- Final calls
- Seasoning
- High-risk cooking
- Ordering/service decisions
- Pass control
- Sauce/protein checks
- Driver/service handoff decisions
- Production unlock checks where judgement is required

Ash:

- Structured prep
- Weighing/portioning
- Active cooking/prep support
- Packing
- Garnish prep
- Cleaning/reset
- Support firing
- Status updating where useful

Ash should stay on active cooking/prep support throughout the day, not drift into only labels, packing, and crockery.

Crockery, plates, glassware, and smallware checks are shared Dan/Ash tasks and should not be the first task of prep days unless urgent. Start strong on food prep and preserve buffer near the end.

---

## 23. Limited storage / trolley SOP

Assume one trolley and one usable shelf unless the user states otherwise.

- One trolley = active dispatch/load trolley only
- One shelf = highest-risk cold/dietary/delicate items only
- Everything else = stackable crates/boxes with top-facing labels by event and next-service priority

Do not plan detailed fridge zones or multiple trolley zones unless confirmed. Use practical crate grouping and fast visual checks.

Labels only where operationally useful:

- Delivery boxes
- Dietary/GF
- Sauces where confusing
- Driver handoff

---

## 24. Garnish / finish SOP

Include restrained, high-class, old-money Riviera garnish only where it improves presentation without overcomplicating service.

Preferred style:

- Elegant, coastal, Mediterranean, premium, not gimmicky
- Edible flowers
- Micro herbs
- Citrus
- Premium herbs
- Grapes/figs/berries
- Toasted nuts/seeds
- Herb oils
- Relishes
- Crisp garnishes
- Good olive oil
- Sea salt

Flag added garnish labour separately when it creates extra prep.

---

## 25. Ordering SOP

Separate:

- Already ordered
- Still needed
- Missing / needs confirmation
- Supplier-specific order
- Woolworths / supermarket items
- Produce / Doblo's
- Bidfood / dry/frozen/dairy/bakery

Doblo's default order method = delivery.

Use Doblo's Farmers Market PLU Price List printed 18/05/26 as the active produce reference until replaced.

Use Bidfood item/allergen list for dry goods, dairy, bakery, frozen, desserts, meat, fish, finger foods, cleaning, pack sizes, pricing, and allergen checks.

Do not invent supplier prices, pack sizes, or availability.

For production sheets, use a supplier ledger before the prep blocks when useful:

```text
ALREADY ORDERED:
DOBLO'S:
BIDFOOD:
WOOLWORTHS:
OTHER:
STILL NEEDED:
MISSING / NEEDS CONFIRMATION:
```

---

## 26. Dietary / allergen SOP

Take dietaries seriously and separate from the beginning.

Watch:

- Gluten/wheat
- Dairy
- Egg
- Soy
- Seafood
- Crustaceans
- Peanuts
- Sesame
- Tree nuts
- Sulphites

Do not guarantee allergen-free unless the source and process support it. Identify cross-contact risks clearly.

Use a compact dietary risk strip in event blocks and near packing when relevant:

```text
DIETARY RISK STRIP
GF:
DF:
VEG:
VEGAN:
NUTS:
SEAFOOD/CRUSTACEAN:
SULPHITES/ALCOHOL:
NEEDS CONFIRMATION:
PACKING CONTROL:
```

---

## 27. Recipe and kitchen document SOP

Kitchen recipe/prep documents must include exact time and temperature where relevant.

For Rational SelfCookingCenter / combi / steam bake:

- Include temperature
- Time
- Steam/humidity percentage
- Visual doneness cue
- Fresh/day-before/reheat instruction where useful

Do not write vague baking instructions such as “bake until done” without time, temperature, and cue.

Recipe SOP format:

- Clear title
- Yield/hydration/best-use summary
- Ingredients table
- Numbered method
- Baking/service method where relevant
- Practical service notes

Keep recipe blocks together across page breaks where possible.

---

## 28. PDF / printable sheet SOP

Default generation approach:

- HTML/CSS templates with Jinja2 + WeasyPrint
- Portrait by default
- Black/white/grey high-contrast layout
- Compact spacing
- Strong headings
- Page-break optimisation
- No cover page unless requested

Avoid coloured designs unless explicitly requested.

Do not include Kitchen Council sections in printable prep/order/run sheets unless explicitly requested.

Production harness sections must stay readable and compact. Avoid creating a bloated PDF just because the harness has many possible sections.

---

## 29. Kitchen Council boundary

Kitchen Council can be used internally for culinary review when useful, especially recipes, flavour, technique, prep, dish improvement, menu decisions, event food, or @kitchen-council.

Printable kitchen documents should remain operational:

- Prep
- Quantities
- Timing
- Work split
- Risks
- Pass plan
- Checklists
- Production dependencies
- Packing maps

No chef-voice commentary in printable sheets unless requested.

---

## 30. Final QA before output

Before finalising any order, prep sheet, run sheet, event sheet, recipe SOP, or PDF:

- Confirm mode classification: SINGLE EVENT or MULTI-EVENT where relevant
- Confirm event separation is clear
- Confirm no invented guest counts, prices, menus, times, or dietaries
- Run count conversion where relevant
- Check component ledger exists for production sheets
- Check dependency/unlock flow exists where useful
- Check shared prep passed the true shared prep test
- Check no false shared prep was forced
- Check blocked / ready sections where useful
- Check equipment batching where useful
- Check Dan/Ash split
- Check Sunday tapas lock if relevant
- Check one trolley/one shelf assumptions
- Check packing map / driver handoff where delivery is involved
- Check dietaries/GF separation
- Check supplier order gaps
- Check garnish labour
- Check page breaks/recipe blocks
- Check no Kitchen Council section in printable sheet unless requested

---

## 31. Changelog — v3

Synced pending SOP changes into source:

1. Added Riviera Event Prep Production Harness v1.
2. Added mandatory mode classification: SINGLE EVENT SHEET or MULTI-EVENT SHEET.
3. Added Single Event Production Sheet structure.
4. Added Multi-Event Production Sheet structure.
5. Added cross-event component ledger.
6. Added true shared prep test.
7. Added shared prep summary format with total quantity, event split, prep day, holding, packing, unlocks, and risk notes.
8. Added “DO NOT COMBINE” logic for false/shared-prep risks.
9. Added production dependency flow: **IF THIS IS DONE → THEN THIS CAN START**.
10. Added component status tracking: NOT STARTED / PREPPED / COOKED / CHILLED / PACKED / LOADED / DONE / BLOCKED / NEEDS CONFIRMATION.
11. Added Blocked / Ready To Do Now section.
12. Added equipment batching SOP for Rational, fryer, stove, cold bench, holding, packing, and delivery/loadout.
13. Added packing map SOP for cold crates, hot boxes, room-temp boxes, dietary boxes, sauce boxes, garnish boxes, serving gear, and driver handoff.
14. Added post-event correction loop SOP.
15. Added standard module library SOP for repeated Riviera production items.
16. Updated ordering SOP to include supplier ledger format.
17. Updated dietary SOP to include dietary risk strip.
18. Updated final QA checklist to include production harness checks.
19. Confirmed v3 changes do not conflict with v2; they add a production-control layer above the existing SOPs.

---

## 32. Changelog — v2 retained

v2 synced these SOP changes into source:

1. Added formal Count Conversion SOP.
2. Locked platter and hot nibble production standards:
   - scones/sweets/croissants/wraps/brioche = 12
   - sandwich platter = 24 points / 6 whole sandwiches
   - mixed hot nibbles = 48 / 12 each of 4
   - single hot nibble platter = 24
3. Added GF hot nibble rule: use confirmed Woolworths GF items first.
4. Added count conversion block to event/prep/order workflow.
5. Confirmed event-specific count beats package standard.
6. Confirmed no Kitchen Council section in printable sheets unless requested.
7. Confirmed Ash remains on active prep/cooking support.
8. Confirmed crockery/smallware checks are shared and not first-task by default.
9. Reinforced one trolley / one shelf limited-storage workflow.
10. Reinforced Sunday tapas lock and 08:00-16:00 standard workday logic.
---

## 52. Production-day page layout SOP — v4

Every production-day page must start with a compact day summary.

```text
DAY / DATE:
EVENTS ACTIVE TODAY:
- Event name — delivery/service time — guest count — location

PREP TO DO FOR ALL EVENTS TODAY:
1. **Dish/component** — quantity — event(s)
2. **Dish/component** — quantity — event(s)
3. **Dish/component** — quantity — event(s)

BIGGEST BOTTLENECK / RISK:
- Rational / fryer / bench / cooling / fridge / dietary / delivery / holding
```

### Daily task order

Daily prep tasks must be listed in logical production order, not in the order the notes were received.

Default order:

1. Longest cook / longest cooling task
2. Doughs / baked items / slow roasts / sauces
3. Rational / oven / batch cooking
4. Fillings, sauces, relishes, dressings
5. Cold assembly
6. Garnish / finishing
7. Packing
8. Delivery / service handoff
9. Reset

### Card layout

Use full-width stacked cards only. Do not place production cards side-by-side.

Dish and component names must be bold.

Increase font size for kitchen readability. Do not squeeze production cards into tiny tables.

Working PDF size target:

```text
Main headings: 15–18 pt
Day headings: 14–16 pt
Card titles / dish names: 12–14 pt bold
Body/task text: 10.5–12 pt
Footer/source notes: only if needed
```

### Production card format

```text
**DISH / COMPONENT NAME** — quantity

Event(s):
Status:
Prep today:
Method / compact recipe:
Seasoning check:
Unlocks:
Holding:
Packing:
Risk / reminder:
PORTION / ALLOCATE AFTER PRODUCTION: only if shared and valid
```

Where a task needs a recipe or method that day, include the compact method directly under the task card. Do not hide the required method elsewhere in the document.

---

## 53. Shared-component allocation SOP — v4

When one shared component is produced for multiple events, use one production card only and finish with a clear allocation line.

Only use this after the component passes the true shared-prep test:

- Same recipe
- Same prep state
- Same cut / portion / finish
- Same dietary status
- Same holding method
- Same service quality
- Safe to allocate across events

Format:

```text
PORTION / ALLOCATE AFTER PRODUCTION:
- Event A — x amount
- Event B — y amount
- Event C — z amount
- Buffer — x amount
```

If recipe, dietary status, holding, finish, or service quality differs, keep the item event-specific.

Example:

```text
**Roast Pumpkin** — 8 kg raw pumpkin

Method:
Roast plain with olive oil, garlic, thyme, salt and pepper. Chill flat. Do not dress.

Seasoning check:
Taste after roasting and again after chilling. Adjust with salt, acid, herb oil, lemon zest, balsamic or honey only according to final use.

Unlocks:
Roast pumpkin chilled → wrap filling, salad assembly and scroll filling can start.

PORTION / ALLOCATE AFTER PRODUCTION:
- Corporate Lunch — 3 kg roasted pumpkin
- Baby Shower — 2 kg roasted pumpkin
- Monday Scrolls — 1.5 kg roasted pumpkin
- Buffer — 1.5 kg
```

---

## 54. Riviera seasoning standard — v4

All food must leave the kitchen properly seasoned. This is non-negotiable.

“Salt, pepper, olive oil” is not a complete seasoning direction unless the dish genuinely requires restraint.

Seasoning checkpoints must consider the full flavour architecture:

- Salt and salinity
- Acid
- Fat / oil
- Herbs
- Spices
- Aromatics
- Heat / chilli / pepper
- Sweetness
- Bitterness / char
- Umami
- Texture / crunch
- Sauce / relish / dressing
- Garnish / finish
- Dietary-safe adjustments

### Source priority for seasoning

Use seasoning sources in this order:

1. Confirmed Riviera source recipe or event-specific recipe
2. User correction or current working recipe
3. Riviera built-in recipe data / uploaded recipe SOP
4. GitHub recipelibrary aroma/flavour data
5. Kitchen Council logic for Riviera style, balance and service reality
6. **NEEDS CONFIRMATION** if safety, allergens, guest expectation or menu integrity is unclear

Do not override a confirmed source recipe without reason. Improve blandness through suitable seasoning checks, not random additions.

### Required seasoning checkpoint wording

Use this in production cards where flavour can drift:

```text
SEASONING CHECK:
Taste during production.
Taste again after cooking/chilling/reheating.
Adjust before packing/service using salt, acid, herbs, spices, aromatics, oil/fat, sauce, relish, garnish or texture.
Do not compromise dietaries.
```

Use seasoning checkpoints especially for:

- Proteins
- Sauces / jus / creams / aioli / labneh
- Mash / gratins / potato dishes
- Roast vegetables
- Salads
- Rice / grains / cous cous
- Sandwich, wrap, roll and scroll fillings
- Hot nibbles
- Buffet items
- Dips, relishes, dressings
- Desserts where sweetness needs balance

### GitHub recipelibrary flavour data use

The GitHub recipelibrary has an Aroma Bible structure that should be treated as a seasoning support tool, not as a blind replacement for chef judgement.

Relevant files:

```text
.cursor/skills/aroma-bible/SKILL.md
aroma_data/ingredients.json
aroma_data/food_pairings.json
aroma_data/pairing_matrix.json
flavor_data/affinities.json
riviera_data/builtins.json
assets/aroma-hints.js
```

Use it like this:

```text
1. Identify the dish/component.
2. Check source recipe first.
3. If under-specified, identify main food: chicken, beef, lamb, fish, pumpkin, potato, salad, fruit, chocolate, etc.
4. Pull food-pairing suggestions from food_pairings.json.
5. Pull harmony partners, heat behaviour and food matches from ingredients.json.
6. Check pairing_matrix.json for spice/herb harmony partners.
7. Check flavor_data/affinities.json for classic combinations.
8. Check riviera_data/builtins.json for Riviera house recipe direction.
9. Apply Kitchen Council logic to choose a practical Riviera-safe direction.
10. Write an operational seasoning check: what to add, when to taste, what to avoid.
```

### Kitchen Council seasoning trigger

Consult Kitchen Council logic when:

- A dish tastes flat and the fix is not obvious
- A component is being adapted without a source recipe
- Native Australian ingredients are being considered
- A dietary version risks being bland
- A sauce, salad, grain, roast vegetable, protein or filling needs balance
- The seasoning decision affects event quality or guest perception

The output must still be operational, not a debate, unless the user requests the full Kitchen Council format.

---

## 55. Riviera seasoning palette — operational default

Use this palette as a starting point when no stronger source recipe exists.

### Chicken

**Mediterranean lemon-herb**  
Lemon zest, lemon juice, garlic, thyme, oregano, parsley, olive oil. Finish with herb oil, labneh or lemon-thyme aioli.

**Tarragon cream**  
Tarragon, shallot, white wine, lemon zest, cream, white pepper. Good for plated chicken, ballotine, fish and pork.

**Moroccan warm spice**  
Cumin, coriander seed, smoked paprika, cinnamon pinch, lemon, mint, parsley, yoghurt/labneh.

**Smoked chicken roll / sandwich**  
Smoked chicken, bacon, dill sour cream, toasted almonds, rocket, lemon zest. Check salt after bacon is mixed in.

### Beef

**Classic Riviera beef**  
Rosemary, thyme, garlic, black pepper, red wine jus, gremolata. Lift heavy beef with lemon zest and parsley.

**Cold roast beef platter**  
Beetroot relish, horseradish cream, rocket, cracked pepper, olive oil. Needs acid from relish or pickled onion.

**Beef slider / brioche**  
Aged cheddar, herbed aioli, tomato relish, rocket, pickles. Taste relish and aioli together before assembly.

**Beef with romesco**  
Romesco, manchego/parmesan, parsley, lemon, smoked paprika. Good for meatballs, canapés and warm bowls.

### Lamb

**Greek lamb**  
Oregano, rosemary, garlic, lemon, parsley, olive oil. Finish with tzatziki or labneh.

**Spiced lamb**  
Cumin, coriander, smoked paprika, cinnamon pinch, mint, parsley, lemon. Use yoghurt/labneh or capsicum cream to soften spice.

**Coastal lamb cutlet**  
Garlic, rosemary, thyme, lemon, sea salt, house emulsion. Finish with micro herbs, lemon cheek or herb oil.

### Seafood / fish / calamari / prawns

**Lemon-caper**  
Lemon, capers, parsley, dill, olive oil, aioli.

**Dill aioli**  
Dill, lemon zest, garlic, aioli, cracked pepper. Clean and restrained.

**Mediterranean seafood**  
Fennel seed, parsley, lemon, chilli, olive oil, garlic.

**Kilpatrick direction**  
Worcestershire, crispy speck, lemon, parsley. Check salt carefully because speck and sauce carry salinity.

### Pumpkin / root vegetables

**Roast pumpkin base**  
Garlic, thyme, rosemary, olive oil, salt, pepper. After roasting, finish according to use with lemon, balsamic, honey, feta, pepitas, pesto or herb oil.

**Pumpkin, feta and pepita salad**  
Balsamic glaze, feta, toasted pepitas, parsley/mint, olive oil. Needs acid after chilling.

**Moroccan root vegetable**  
Cumin, coriander, cinnamon, maple/honey, lemon, mint, parsley. Works with cous cous.

### Greens / salads / grains

**Greek green bean**  
Oregano, parsley, mint, lemon, red wine vinegar, feta, olives, shallot. Taste after chilling.

**Pesto pasta**  
Basil pesto, spinach, feta/parmesan, tomato, olives, lemon. Needs acid and salt after chilling.

**Cous cous / grain salad**  
Preserved lemon or lemon zest, cumin, coriander, mint, parsley, olive oil, dried fruit, toasted nuts. Do not leave dry.

**Simple green salad**  
Dijon, lemon or vinegar, olive oil, herbs, sea salt. Dress close to service.

### Potatoes / mash / gratin

**Burnt butter mash**  
Brown butter, thyme, salt, white pepper. Taste after holding and adjust with salt and warm cream/butter.

**Chorizo potatoes**  
Smoked paprika, garlic, chorizo fat, parsley, lemon aioli. Needs acid to cut fat.

**Herb chats**  
Garlic, rosemary, thyme, olive oil, sea salt, feta cream. Finish after reheating.

**Gratin**  
Garlic, thyme, nutmeg, cream, cheese, white pepper. Taste cream mix before baking.

### Sandwiches / wraps / rolls / scrolls

**Roast pumpkin / feta / pesto**  
Season pumpkin before mixing. Use pesto, feta, rocket/spinach, lemon. Avoid bland pumpkin.

**Salami / bocconcini / sundried tomato**  
Basil, olive oil, cracked pepper, rocket, balsamic or tomato relish. Watch salt.

**Smoked chicken / bacon / almond**  
Dill sour cream, lemon zest, rocket, toasted almonds. Check acid and salt.

**Roast beef / relish / Jarlsberg**  
Beetroot or farmhouse relish, rocket, horseradish cream, cracked pepper. Needs bite from relish/horseradish.

**Ham / cheese / Dijon**  
Dijon emulsion, cheddar, ham, pickles optional. Keep tidy and not dry.

### Hot nibbles / fried items

Season fried and reheated items immediately while hot. Taste one piece where possible.

**Arancini**  
Romesco, lemon-thyme aioli, parmesan/manchego, micro herbs. Needs acid and salt after frying.

**Pastizzis**  
Tzatziki or labneh, lemon, dill/mint. Do not send dry.

**Sausage rolls / pies**  
House relish, tomato chutney, mustard, cracked pepper. Taste the sauce, not just the pastry.

**Quiches**  
Beetroot balsamic relish, herbs, cracked pepper. Warm properly; bland egg is not acceptable.

### Sauces / dips / finishes

**Aioli family**  
Base aioli plus lemon, dill, thyme, caper, roasted garlic or chilli.

**Labneh / yoghurt family**  
Labneh plus herbs, lemon, garlic and olive oil.

**Romesco**  
Roasted capsicum, tomato, garlic, almond/nut if used, smoked paprika, vinegar/lemon and olive oil.

**Gremolata**  
Parsley, lemon zest and garlic. Use to lift beef, lamb, rich braises and potatoes.

**Salsa verde**  
Parsley, capers, anchovy optional, garlic, lemon/vinegar and olive oil.

**Herb oil**  
Parsley, basil or chive oil. Use restraint; it should finish, not drown.

### Desserts

**Sticky date / toffee**  
Salt in toffee, vanilla, orange zest, optional wattleseed. Balance sweetness with salt.

**Cannoli**  
Citrus zest, vanilla, pistachio, espresso, chocolate, toasted nuts. Do not leave filling flat.

**Rhubarb / fruit**  
Citrus zest, vanilla, light spice and syrup acidity. Taste fruit after poaching/chilling.

**Chocolate**  
Salt, espresso, vanilla, orange, hazelnut/pistachio where suitable.

---

## 56. v4 changelog

Added after v3:

1. Production-day summary at top of every daily prep page.
2. Daily prep ordered by production logic: longest/cooling-dependent tasks first, then batch cooking, fillings/sauces, cold assembly, garnish, packing, delivery and reset.
3. Full-width stacked cards only; no side-by-side production cards.
4. Larger font and bold dish/component names for kitchen readability.
5. Compact recipe/method placed directly under the production task where needed.
6. Shared production card allocation line: “PORTION / ALLOCATE AFTER PRODUCTION”.
7. Non-negotiable seasoning standard upgraded from basic salt/pepper/oil to full flavour architecture.
8. GitHub recipelibrary aroma/flavour data workflow added as seasoning support.
9. Riviera seasoning palette added for proteins, seafood, vegetables, salads, grains, potatoes, sandwiches, hot nibbles, sauces and desserts.
10. Kitchen Council trigger added for unclear seasoning, adaptation, dietaries or event-quality flavour decisions.
---

## 57. v5 changelog

Added after v4:

1. Default filling generation SOP for sandwiches, wraps, rolls, brioche, focaccia, croissants, sliders and lunch boxes when no specific fillings are supplied.
2. Kitchen-facing sheets must not use vague “chef’s selection” wording for production; they must generate exact kitchen-selected default fillings.
3. Default fillings must be sourced from event-specific requests first, then Riviera menu/package sources, tapas flavour direction, corporate/wake/platter examples, the Riviera Seasoning Palette, and Kitchen Council logic where needed.
4. Generated fillings must be labelled as “KITCHEN-SELECTED DEFAULT FILLINGS” unless client-confirmed.
5. Filling blocks must include exact count, whole items to make, cut style, filling split, sauce/relish, garnish/finish, seasoning check, dietaries/allergens and packing.
6. Added default Riviera filling palettes for sandwiches/focaccia/Turkish, wraps, mini brioche/sliders and croissants.
7. Added guardrails for dietaries, allergen risk, seafood, wet fillings, vegetarian substance, and client expectation.


---

**End of Riviera SOP Master Index v6.**


---

## 31. v7 changelog — prep-list assumption update

- Prep lists now assume ordering is already completed and stock has arrived unless ordering is specifically requested.
- Order-list / still-needed sections are no longer default items inside prep lists or production sheets. Orders stay in separate order documents.
- Mandatory coldroom/rack allocation blocks are removed. Use only a short **Sort delivered stock by event/use** line when it protects multi-event separation.
- Prep lists start from the requested day. Do not include earlier ordering days or completed days unless they affect current food risk.
- Event separation, dietary separation, dispatch lanes, shared prep allocation and ready-to-send gates remain active.


---

## 32. v8 changelog — MYO burger split and Kayla one-piece feasting count

- Added MYO burger 50/50 split rule: apply 9% buffer to total guest count first, then split by protein.
- Barn example locked: 70 guests -> 80 practical total burger portions -> 40 Texan chicken + 40 Angus beef.
- Added feasting one-piece-per-item rule: guest count + 9% buffer per listed piece item.
- Kayla example locked: 41 guests -> 45 pieces/portions per item; albondigas = 45 balls, not 90.
- Added source recipe scaling rule where source yield conflicts with confirmed current event count.
