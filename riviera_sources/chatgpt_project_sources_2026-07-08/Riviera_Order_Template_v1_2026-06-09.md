# Riviera Order Template v1

**Status:** Active ordering template draft  
**Date:** 2026-06-09  
**Use for:** Riviera supplier orders, event order checks, already-ordered/still-needed lists, and chef-ready order emails.

---

## 0. Purpose

This template turns a production sheet into a clear order list.

It must answer:

```text
What do we need?
How much?
Which supplier?
For which event?
Already ordered or still needed?
What is missing or risky?
```

Do not invent prices, pack sizes, guest counts, or confirmed menus. If not found, write **NEEDS CONFIRMATION** or **price not found in current source**.

---

## 1. Order header

```text
ORDER NAME:
EVENT / WEEK:
EVENT DATE(S):
DELIVERY DATE REQUIRED:
DELIVERY METHOD: Delivery
SUPPLIER:
REQUESTED BY:
SOURCE / PACKAGE:
PRODUCTION TARGET:
DIETARIES:
STATUS: Draft / Ready to send / Sent / Confirmed
```

Doblo's default method is **delivery** unless the user specifically asks for pickup.

---

## 2. Supplier bucket order

Always separate by supplier and status.

```text
DOBLO'S — produce / herbs / fruit / vegetables
BIDFOOD — dry goods / dairy / bakery / frozen / desserts / meat / fish / finger foods / cleaning / packaging
WOOLWORTHS / COLES — small top-ups / urgent specialty / GF bought-in items
BUTCHER / SEAFOOD / SPECIALTY — if specified
ALREADY ORDERED
STILL NEEDED
NEEDS CONFIRMATION
```

---

## 3. Chef-facing order list format

Use this format for internal order checks.

```text
DOBLO'S — DELIVERY REQUIRED [DATE]
- **Item** — quantity / pack / event use / notes
- **Item** — quantity / pack / event use / notes

BIDFOOD — ORDER REQUIRED [DATE]
- **Item** — quantity / pack / event use / notes
- **Item** — quantity / pack / event use / notes

WOOLWORTHS / COLES — TOP-UP
- **Item** — quantity / event use / notes

ALREADY ORDERED
- **Item** — supplier / quantity / date ordered / event

STILL NEEDED
- **Item** — supplier / quantity / reason

NEEDS CONFIRMATION
- **Item** — missing pack size / unclear source / price not found
```

---

## 4. Supplier email format

Use this when writing an order email/message.

```text
Subject: Riviera Order — [Event / Date] — Delivery [Requested Date]

Hi [Supplier Name],

Could we please order the following for delivery on [date]:

- [Item] — [quantity]
- [Item] — [quantity]
- [Item] — [quantity]

Event note: [short note only if useful, e.g. Italian Long Lunch Saturday / wedding grazing table / corporate delivery]

Please confirm availability and delivery.

Kind regards,
Riviera Yeppoon
```

Keep supplier emails clean. Do not include full production notes unless needed for the supplier.

---

## 5. Count-to-order rules

### Production count

```text
Guest count -> production count -> ingredient count -> supplier order count
```

Use the **9% buffer** for plated meals, buffet serves, canapes, hot nibbles where production is not fixed by module, protein portions, and high-risk dietary alternatives.

Do not blindly use buffer for fixed purchased unit boxes, expensive garnish items, or module-controlled items such as scone platters, fruit platters, and grazing boxes.

### Alternate drop

```text
Guest count + 9% buffer = total production target
Dietaries included inside total
Remaining standard mains split evenly
Both normal mains reduced equally where practical
```

### Scones

```text
12 scones = 1080 g scone mix + 600 ml water
```

Order:

```text
Total scones / 12 = batch count
Batch count x 1.08 kg = scone mix required
Jam + cream by platter count unless already in house
```

### Focaccia

```text
Casual / delivery / grazing / corporate sliced focaccia box = 12 pieces
Seated dinner focaccia = table bread with whipped butter, not sliced-box count
1 m grazing table = 1/4 tray sliced focaccia
Every grazing box includes focaccia
```

If focaccia is required, show it in the order/prep. Do not assume stock.

### Hot nibbles

```text
Single hot nibble platter = 24 pieces
Mixed hot nibble box/platter = 48 pieces total
Mixed split = 12 each of 4 items
```

GF hot nibbles use confirmed bought-in GF pies/sausage rolls first when available.

### Fruit format

Resolve format before ordering:

```text
Corporate fruit box / pax-based fruit = packed corporate fruit component
Fruit cup = individual fruit cups
Seasonal cut fruit bowl = bulk bowl
Styled seasonal fruit platter = full Riviera fruit platter standard
Grazing box fruit = graze component
Grazing table fruit = graze component
Breakfast fruit + yoghurt = corporate breakfast item
```

Do not apply the styled fruit platter standard to corporate fruit boxes unless the source says styled fruit platter.

---

## 6. Order risk flags

Add these at the bottom of the order list when relevant.

```text
RISK / CHECK BEFORE ORDERING
- Expensive over-order risk:
- Short shelf-life item:
- Pack size unclear:
- Source price not found:
- Dietary/allergen impact:
- Frozen item needs 2-day fridge/coolroom thaw:
- Cryovac/Roscoes window required:
- Sunday Tapas overlap:
```

---

## 7. Final order QA

Before sending any order:

```text
□ Event date checked
□ Delivery date checked
□ Supplier separated
□ Already ordered separated
□ Still needed separated
□ Missing pack sizes flagged
□ Dietaries checked
□ Focaccia counted if required
□ Fruit format resolved
□ Hot nibble count converted to pieces
□ 9% buffer applied only where relevant
□ No invented prices
```
