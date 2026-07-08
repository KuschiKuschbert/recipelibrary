# Riviera Weekly Order Workflow v1

**Status:** SOP addendum / ordering workflow  
**Date:** 2026-06-09  
**Use for:** Creating one supplier-ready order list for all Riviera events in an active prep week.

---

## 0. Purpose

This workflow turns all events in a prep week into one controlled ordering ledger.

It must answer:

```text
What events are on this week?
What does each event need?
What is shared across events?
What do we already have?
What has already been ordered?
What still needs ordering?
Which supplier does it come from?
When does it need to arrive?
What is missing or risky?
```

Do not merge event requirements without showing allocation. Combined orders are useful only if the event split remains visible.

---

## 1. When to use

Use this workflow whenever:

```text
- There is more than one event in the same prep week.
- The user asks for orders for the week.
- A production sheet covers multiple events.
- Shared ingredients/components appear across events.
- Supplier orders need to be separated into Doblo's, Bidfood, Woolworths/Coles and specialty suppliers.
```

For a single large event, the same workflow can be used as a single-event order ledger.

---

## 2. Weekly order processing order

```text
1. Build event index for the week.
2. Extract food-only order needs per event.
3. Resolve product format before counting.
4. Apply count logic and buffers.
5. Convert prep counts into ingredient requirements.
6. Combine ingredients across events only after event splits are known.
7. Check already in-house / already ordered.
8. Split remaining order by supplier.
9. Flag delivery date required.
10. Flag risks, missing pack sizes and over-order risks.
11. Produce supplier-ready order messages if requested.
```

---

## 3. Event index format

```text
EVENT INDEX — WEEK OF [DATE]
- **Event A** — date / service or delivery time / guest count / service style
- **Event B** — date / service or delivery time / guest count / service style
- **Sunday Tapas** — include if the week covers Sunday prep/service
```

Only include food-relevant event detail.

---

## 4. Per-event order extraction

For each event, extract:

```text
EVENT:
DATE:
SERVICE / DELIVERY TIME:
GUEST COUNT:
MENU:
DIETARIES:
PRODUCTION TARGET:
PRODUCT FORMAT:
MODULES USED:
ORDER NEEDS:
```

If product format is unclear, write:

```text
NEEDS CONFIRMATION — product format unclear before ordering
```

---

## 5. Count-to-order conversion

Use the Count & Ordering Harness before ordering:

```text
Guest count -> production count -> ingredient count -> supplier order count
```

Rules:

```text
- Apply 9% buffer where relevant.
- Do not apply 9% blindly to fixed module items.
- Convert hot nibble boxes to pieces.
- Resolve fruit format before counting.
- Include focaccia where required.
- Include dietaries as actual food/order items.
- Add garnish ingredients only where they are part of the production plan.
```

---

## 6. Combined ingredient ledger

After each event is counted, combine ingredients by item.

Use this format:

```text
COMBINED INGREDIENT LEDGER
- **Lemons** — total 8 kg
  - Italian Long Lunch — 5 kg / squid, cannellini, garnish
  - Wake delivery — 1 kg / scones garnish, fruit
  - Tapas — 2 kg / aioli, calamari, drinks garnish
- **Parsley** — total 6 bunches
  - Italian Long Lunch — 4 bunches / salsa verde, squid, garnish
  - Tapas — 2 bunches / service garnish
```

Do not show only the combined total unless the event split is obvious and low-risk.

---

## 7. Stock and already-ordered pass

Before finalising orders, run:

```text
ALREADY IN HOUSE
- Item — usable quantity — event allocation if already assigned

ALREADY ORDERED
- Supplier — item — quantity — delivery date — event/use

STILL NEEDED
- Supplier — item — quantity — event/use

NEEDS CONFIRMATION
- Item — missing pack size / supplier availability / unclear product format / price not found
```

Do not order from supplier until already-in-house and already-ordered stock has been separated.

---

## 8. Supplier split

Use this order:

```text
DOBLO'S — DELIVERY — [DATE]
- **Produce/herbs/fruit/vegetables** — quantity — event/use note

BIDFOOD — ORDER REQUIRED — [DATE]
- **Dry/dairy/bakery/frozen/meat/fish/finger food/packaging** — quantity / pack size — event/use note — allergen flag if relevant

WOOLWORTHS / COLES — TOP-UP
- **Retail/small urgent/GF/specialty item** — quantity — event/use note

BUTCHER / SEAFOOD / SPECIALTY
- **Item** — quantity — event/use note

ALREADY ORDERED / IN HOUSE
- **Item** — quantity — status — event allocation

NEEDS CONFIRMATION
- **Item** — what needs confirming before order can be sent
```

Doblo's order method defaults to delivery.

---

## 9. Delivery timing logic

Add requested delivery date per supplier.

Guide:

```text
- Long-life Bidfood items: order early enough for prep week.
- Produce/herbs: delivery close enough for freshness but before prep starts.
- Seafood/protein: confirm delivery day based on prep/cook schedule.
- Frozen items: allow 2-day fridge/coolroom thaw before use.
- Cryovac/Roscoes items: order/procure before Roscoes sealing window.
- Friday Tapas pull: account for Sunday tapas items when Sunday is in the week.
```

If delivery timing affects prep, flag it in RISKS.

---

## 10. Risk flags

Use only useful risks:

```text
RISK / CHECK BEFORE ORDERING
- SHORTAGE RISK — event depends on exact pack/count.
- OVER-ORDER RISK — supplier pack much larger than weekly need.
- SHORT SHELF-LIFE — order close to prep day.
- DELIVERY RISK — supplier arrival too close to service.
- ALLERGEN RISK — supplier allergen status unclear.
- FORMAT RISK — corporate fruit box / styled platter / graze format unclear.
- THAWING RISK — frozen item needs 2-day fridge/coolroom thaw.
- CRYOVAC RISK — Roscoes window needed.
```

---

## 11. Weekly order output structure

Use this for the final weekly order list:

```text
WEEKLY ORDER LIST — WEEK OF [DATE]

EVENT INDEX
- Event / date / time / pax / service style

ORDER SUMMARY
- Doblo's — delivery date / major produce
- Bidfood — order date / major dry-dairy-frozen
- Woolworths/Coles — top-ups
- Specialty — butcher/seafood/other

DOBLO'S — DELIVERY — [DATE]
- **Item** — total qty — event split/use

BIDFOOD — ORDER REQUIRED — [DATE]
- **Item** — total qty / pack — event split/use — allergen flag if relevant

WOOLWORTHS / COLES — TOP-UP
- **Item** — qty — reason/event

SPECIALTY SUPPLIERS
- **Item** — qty — event/use

ALREADY IN HOUSE / ALREADY ORDERED
- **Item** — qty/status — event allocation

STILL NEEDED
- **Item** — supplier — qty — event/use

NEEDS CONFIRMATION
- **Item** — decision needed

RISK / CHECK BEFORE ORDERING
- Risk — action
```

---

## 12. Supplier email conversion

After the chef-facing order list is approved, convert each supplier bucket into a clean supplier email/message.

Do not include internal production details unless the supplier needs them.

Use:

```text
Subject: Riviera Order — [Week/Event] — Delivery [Date]

Hi [Supplier],

Could we please order the following for delivery on [date]:

- [Item] — [quantity]
- [Item] — [quantity]

Event note: [short note only if useful]

Please confirm availability and delivery.

Kind regards,
Riviera Yeppoon
```

---

## 13. Final weekly order QA

Before giving the order list or supplier email:

```text
□ All events in the week included
□ Event dates/times checked
□ Guest counts applied
□ Product formats resolved
□ Production buffers applied only where relevant
□ Ingredient totals show event split
□ Supplier buckets separated
□ Already ordered separated
□ Already in-house separated
□ Still needed separated
□ Delivery dates shown
□ Missing pack sizes flagged
□ Prices not invented
□ Dietaries checked
□ Focaccia counted if required
□ Fruit format resolved
□ Hot nibble counts converted to pieces
□ Frozen items have 2-day thaw timing if relevant
□ Cryovac/Roscoes window flagged if relevant
□ Order risks included only where useful
```

---

## 14. SOP placement

This addendum sits under:

```text
Riviera Supplier Ordering Translator v1
Riviera Order Template v1
Riviera Count & Ordering Harness v1
```

Use it before creating weekly production sheets when orders need to cover multiple events.

