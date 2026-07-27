import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CHANGE_SCOPES,
  POS_RECIPE_MAP,
  TAPAS_MENU,
  buildPrepDraft,
  ingestSalesCsv,
  inspectSalesSchema,
  parseCsv,
  publishPrepDraft,
  routeChangeReceipt,
  selectStockBaseline,
} from "./reference-validator.mjs";

const fixtureUrl = new URL("./fixtures/", import.meta.url);

async function fixture(name) {
  return readFile(new URL(name, fixtureUrl), "utf8");
}

async function jsonFixture(name) {
  return JSON.parse(await fixture(name));
}

test("the same uploaded sales file is processed only once", async () => {
  const content = await fixture("sales-valid.csv");
  const seenHashes = new Set();

  const first = ingestSalesCsv(content, { seenHashes });
  const second = ingestSalesCsv(content, { seenHashes });

  assert.equal(first.status, "PROCESSED");
  assert.equal(first.accepted.length, 2);
  assert.equal(second.status, "DUPLICATE_IMPORT");
  assert.deepEqual(second.accepted, []);
});

test("an unknown POS item is quarantined instead of guessed", async () => {
  const result = ingestSalesCsv(await fixture("sales-unknown-pos.csv"));

  assert.equal(result.status, "PROCESSED_WITH_EXCEPTIONS");
  assert.equal(result.accepted.length, 1);
  assert.equal(result.quarantined.length, 1);
  assert.equal(result.quarantined[0].reason, "UNKNOWN_POS_ITEM");
  assert.equal(
    result.quarantined[0].action,
    "MAP_EXPLICITLY_BEFORE_REPROCESSING",
  );
});

test("renamed and missing required headers stop the import", async () => {
  const renamed = parseCsv(await fixture("sales-changed-header.csv"));
  const missing = parseCsv(await fixture("sales-missing-header.csv"));

  assert.deepEqual(inspectSalesSchema(renamed.headers), {
    ok: false,
    code: "SCHEMA_CHANGED",
    missing: ["sold_qty"],
    unknown: ["units_sold"],
    duplicates: [],
  });
  assert.equal(ingestSalesCsv(await fixture("sales-changed-header.csv")).status, "REJECTED");
  assert.equal(inspectSalesSchema(missing.headers).code, "MISSING_HEADER");
  assert.equal(ingestSalesCsv(await fixture("sales-missing-header.csv")).status, "REJECTED");
});

test("voids and refunds reduce sales; impossible negative rows are quarantined", async () => {
  const result = ingestSalesCsv(await fixture("sales-voids-refunds-negative.csv"));

  assert.equal(result.accepted.length, 1);
  assert.deepEqual(
    {
      soldQty: result.accepted[0].soldQty,
      voidedQty: result.accepted[0].voidedQty,
      refundedQty: result.accepted[0].refundedQty,
      netQty: result.accepted[0].netQty,
    },
    { soldQty: 10, voidedQty: 2, refundedQty: 1, netQty: 7 },
  );
  assert.deepEqual(
    result.quarantined.map((row) => row.reason),
    ["NEGATIVE_QUANTITY", "NEGATIVE_NET_QUANTITY"],
  );
});

test("missing stock is COUNT REQUIRED and never silently treated as zero", async () => {
  const history = await jsonFixture("sales-history.json");
  const stocktakes = await jsonFixture("stocktakes-polpette-only.json");
  const draft = buildPrepDraft({
    serviceDate: "2026-08-02",
    bookedCovers: 30,
    history,
    stocktakes,
  });
  const olives = draft.lines.find(
    (line) => line.menuItemId === "veal-prosciutto-stuffed-olives",
  );

  assert.equal(olives.countStatus, "COUNT REQUIRED");
  assert.equal(olives.countedUnits, null);
  assert.equal(olives.prepUnits, null);
  assert.ok(olives.grossTargetUnits > 0);
});

test("the 1 August stocktake is the opening baseline for the next Sunday", async () => {
  const stocktakes = await jsonFixture("stocktakes-two-months.json");
  const baseline = selectStockBaseline(stocktakes, "2026-08-02");

  assert.equal(baseline.asOfDate, "2026-08-01");
  assert.equal(baseline.type, "OPENING_BASELINE");
});

test("booked covers scale demand without an automatic 9 percent buffer", async () => {
  const history = await jsonFixture("sales-history.json");
  const stocktakes = await jsonFixture("stocktakes-zero.json");
  const draft = buildPrepDraft({
    serviceDate: "2026-08-02",
    bookedCovers: 30,
    history,
    stocktakes,
  });
  const polpette = draft.lines.find((line) => line.menuItemId === "polpette");
  const olives = draft.lines.find(
    (line) => line.menuItemId === "veal-prosciutto-stuffed-olives",
  );

  assert.equal(draft.automaticBufferPercent, 0);
  assert.equal(polpette.servesPerCover, 0.5);
  assert.equal(polpette.targetServes, 15);
  assert.equal(polpette.grossTargetUnits, 45);
  assert.equal(polpette.bufferApplied, false);
  assert.equal(olives.servesPerCover, 0.25);
  assert.equal(olives.targetServes, 8);
  assert.equal(olives.grossTargetUnits, 48);
  assert.notEqual(polpette.targetServes, Math.ceil(15 * 1.09));
});

test("Polpette and stuffed olives keep distinct IDs, recipes and pull units", () => {
  const polpette = POS_RECIPE_MAP["POLP-01"];
  const olives = POS_RECIPE_MAP["OLIVE-01"];

  assert.equal(polpette.menuItemId, "polpette");
  assert.equal(polpette.recipeId, "veal-meatballs");
  assert.equal(polpette.piecesPerServe, 3);
  assert.equal(polpette.pieceWeightG, 80);
  assert.equal(polpette.pieceUnit, "meatballs");
  assert.equal(olives.menuItemId, "veal-prosciutto-stuffed-olives");
  assert.equal(olives.recipeId, "veal-prosciutto-stuffed-olives");
  assert.equal(olives.piecesPerServe, 6);
  assert.equal(olives.pieceUnit, "stuffed olives");
  assert.notEqual(polpette.menuItemId, olives.menuItemId);
  assert.notEqual(polpette.recipeId, olives.recipeId);
  assert.notStrictEqual(TAPAS_MENU.polpette, TAPAS_MENU["veal-prosciutto-stuffed-olives"]);
});

test("a Tapas prep draft cannot publish without explicit approval", async () => {
  const draft = buildPrepDraft({
    serviceDate: "2026-08-02",
    bookedCovers: 30,
    history: await jsonFixture("sales-history.json"),
    stocktakes: await jsonFixture("stocktakes-zero.json"),
  });

  assert.throws(() => publishPrepDraft(draft, null), /APPROVAL_REQUIRED/);
  assert.throws(
    () =>
      publishPrepDraft(draft, {
        decision: "APPROVED",
        reviewer: "",
        approvedAt: "2026-07-31T14:00:00+10:00",
      }),
    /APPROVAL_REQUIRED/,
  );

  const previous = {
    title: "Riviera — Current Sunday Tapas Prep Sheet",
    serviceDate: "2026-07-26",
    status: "PUBLISHED",
  };
  const publication = publishPrepDraft(
    draft,
    {
      decision: "APPROVED",
      reviewer: "Dan",
      approvedAt: "2026-07-31T14:00:00+10:00",
    },
    previous,
  );

  assert.equal(publication.current.status, "PUBLISHED");
  assert.equal(publication.current.approvedBy, "Dan");
  assert.equal(publication.archived.status, "ARCHIVED");
  assert.equal(previous.status, "PUBLISHED");
});

test("week and event instructions cannot leak into a permanent SOP", async () => {
  const receipts = await jsonFixture("change-receipts.json");
  const weekRoute = routeChangeReceipt(receipts.weekSpecific);
  const eventRoute = routeChangeReceipt(receipts.eventSpecific);

  assert.equal(receipts.weekSpecific.scope, CHANGE_SCOPES.WEEK);
  assert.equal(weekRoute.route, "DRIVE_EVENT_WEEK_RECORD");
  assert.equal(weekRoute.canUpdatePermanentSop, false);
  assert.equal(weekRoute.activeUntil, "2026-07-31");
  assert.equal(eventRoute.route, "DRIVE_EVENT_WEEK_RECORD");
  assert.equal(eventRoute.canUpdatePermanentSop, false);
});

test("an unclassified correction is held for confirmation", () => {
  assert.throws(
    () =>
      routeChangeReceipt({
        previousRule: "Friday delivery allowed",
        newRule: "No Friday delivery",
        scope: "UNCLEAR",
        affectedRecord: "supplier SOP",
      }),
    /SCOPE_CONFIRMATION_REQUIRED/,
  );
});
