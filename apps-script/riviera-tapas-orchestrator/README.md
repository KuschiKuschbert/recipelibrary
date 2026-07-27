# Riviera Tapas Intake Orchestrator

This is the Drive-first, approval-gated intake and prep-sheet runtime for
Riviera Sunday Tapas.

It accepts current sales, bookings, monthly stocktakes and classified
conversation changes from four controlled Drive inboxes. It never treats a
chat correction as a completed source update, never substitutes zero for
missing stock, and never adds the general 9% event buffer to Tapas.

## Live control assets

- Orchestrator root:
  `1GNZivM18y2TvjJrHBoYCGVih0HA9koHj`
- Control Google Sheet:
  `1hB3OsS9zr-yWU4GDn-NCwAO06nz8O6Zc7HPM4aLllwQ`

Setup finds or creates these **flat** child folders by exact name:

1. `00 Inbox — Tapas Sales`
2. `00 Inbox — Tapas Bookings`
3. `00 Inbox — Stocktakes`
4. `00 Inbox — Conversation Changes`
5. `10 Processed`
6. `20 Exceptions`
7. `30 Generated Prep Sheets`

An existing unique exact-name folder is reused. More than one exact match is
a stop condition; setup does not create another duplicate.

## Deploy into the bound control workbook

1. Open the control Google Sheet.
2. Open **Extensions → Apps Script**.
3. Replace the editor's `Code.gs` with this directory's complete
   [`Code.gs`](Code.gs).
4. Replace the manifest with [`appsscript.json`](appsscript.json).
5. Save, then run `setupOrchestrator()` once and grant Drive/Sheets access.
6. In the `Config` tab, set:
   - `RECIPE_RELEASE_ID`
   - `RECIPE_GITHUB_COMMIT`
7. Run `runRivieraOrchestratorSelfTest()`.
8. Process three representative files manually before installing
   `installFiveMinuteWatcher()`.

`setupOrchestrator()` supports a bound active spreadsheet, records its ID,
migrates the recognised human-friendly v1 control-workbook headers, retains
mapped rows, seeds the Polpette/stuffed-olive mappings, and links all seven
folders. Unknown header layouts fail closed.

## Normal operating flow

1. Put a CSV or native Google Sheet in the matching inbox.
2. Run **Riviera Orchestrator → Process all inboxes now**, or let the
   five-minute watcher run.
3. Review `Intake Log` and resolve every open `Exceptions` row.
4. Update `POS Recipe Map` for genuinely new POS identifiers. Do not map by
   fuzzy name alone.
5. Run **Generate Tapas draft**.
6. Review `Tapas Prep — Draft`, particularly every non-`READY` row.
7. Run **Approve & publish current prep**.

Approval updates one stable file named
`Riviera — Current Sunday Tapas Prep Sheet`. The previous approved file state
is copied into the generated-prep folder first. Draft generation never
publishes.

## Intake contracts

Headers are strict but aliasable. The default aliases live in `Config` as
JSON and can be extended without editing code. Duplicate or ambiguous headers
fail closed. A missing required heading is recorded as `MISSING_HEADER`;
duplicate, ambiguous or genuinely unknown headings are recorded as
`SCHEMA_CHANGED`.

### Tapas sales

Required:

- `service_date`
- `sold_qty`
- at least one of `item_id` or `item_name`

Optional:

- `voided_qty`
- `refunded_qty`
- `covers`

The stored quantity is:

`net_qty = sold_qty - voided_qty - refunded_qty`

Negative values, non-Sunday service dates, exact duplicate rows and unknown
POS/menu items are quarantined. When an `item_id` is supplied it is
authoritative: an unknown ID cannot fall back to a matching item name. Exact
name mapping is available only when the ID cell is blank.

### Tapas bookings

Required:

- `service_date`
- `booked_covers`

Optional:

- `booking_id`
- `status`
- `event_name`
- `notes`

Cancelled/declined/no-show rows do not contribute covers. The most recently
imported complete snapshot for a service date is authoritative. A supplied
`booking_id` must be unique within the file; duplicate IDs are quarantined.
When no ID is available, otherwise identical rows are retained because they
may be separate legitimate bookings. Whole-file SHA-256 deduplication still
prevents the same report being imported twice.

### Monthly stocktake

Required:

- `stocktake_date`
- `on_hand_qty`
- at least one of `item_id` or `item_name`

Optional:

- `uom`
- `notes`

A blank quantity is quarantined and remains `COUNT REQUIRED`. The latest
complete stocktake snapshot on or before service is used. If an item is absent
from that snapshot, an older count is not substituted. With
`DEDUCT_POST_STOCK_SALES=TRUE`, later net sales are deducted from the observed
baseline. Production additions, waste and transfers still require a count or
future adjustment feed before final approval.

### Conversation changes

Required:

- `previous_rule`
- `new_rule`
- `scope`
- `affected_records`

Allowed scopes are exactly:

- `PERMANENT RIVIERA STANDARD`
- `PACKAGE-SPECIFIC STANDARD`
- `RECIPE-SPECIFIC STANDARD`
- `EVENT-SPECIFIC INSTRUCTION`
- `WEEK-SPECIFIC INSTRUCTION`

Event/week changes require both effective and expiry dates. Imported changes
are staged as `AWAITING APPROVAL`. Approval records the scope-derived target
route (`DRIVE_SOP_MASTER`, `DRIVE_PACKAGE_REGISTER`,
`GITHUB_RECIPE_RECORD; DRIVE_RECIPE_MASTER_IF_REPRESENTED`, or
`DRIVE_EVENT_WEEK_RECORD`) and only authorises that source update. Drive,
GitHub and ChatGPT publication statuses remain separate until each target is
actually updated and verified.

## Forecast rules

- Uses the latest 13 comparable Sundays with sales and covers.
- Uses the uploaded booked covers for the target Sunday.
- Applies item-level net serves per historical cover.
- Does **not** add a 9% Tapas buffer.
- Rounds prep/pull serves up to each mapped pull unit.
- Converts serves into mapped pieces.
- Missing/stale stock leaves prep quantity blank and visible as
  `COUNT REQUIRED`.
- A missing sales history leaves the target blank and visible as
  `HISTORY REQUIRED`.

Current locked distinctions:

- `polpette` → recipe `veal-meatballs`; 3 × 80 g meatballs per serve.
- `veal-prosciutto-stuffed-olives` → its own recipe/menu ID; 6 stuffed
  olives per serve.

These IDs must never be merged.

## Source semantics and deduplication

Each intake table is normalised and hashed with SHA-256 together with its
intake kind. An already accepted hash is not imported again.

For overlapping report snapshots, the most recently imported complete
snapshot for each service date is authoritative. A later partial export could
therefore hide omitted items; exports should always contain the full date
scope they claim to cover.

Accepted source files are retained under `10 Processed`. Structurally invalid
files are retained under `20 Exceptions`. CSV and native Google Sheets are
supported. Convert `.xlsx` files to a native Google Sheet before intake.

## ChatGPT boundary

Uploading a report only inside a ChatGPT conversation does not fire this
Apps Script. The file must be placed into its Drive inbox (manually or by a
separately authorised ChatGPT Drive action). Conversational corrections enter
the `Conversation Changes` lane as classified change receipts; they do not
silently rewrite SOPs, recipes or project knowledge.
