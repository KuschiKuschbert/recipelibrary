import { createHash } from "node:crypto";

export const SALES_SCHEMA = Object.freeze({
  required: Object.freeze([
    "service_date",
    "pos_item_id",
    "pos_item_name",
    "sold_qty",
  ]),
  optional: Object.freeze(["voided_qty", "refunded_qty", "covers"]),
});

export const TAPAS_MENU = Object.freeze({
  polpette: Object.freeze({
    menuItemId: "polpette",
    recipeId: "veal-meatballs",
    label: "Polpette",
    piecesPerServe: 3,
    pieceWeightG: 80,
    pieceUnit: "meatballs",
    serviceUnit: "tapas serve",
  }),
  "veal-prosciutto-stuffed-olives": Object.freeze({
    menuItemId: "veal-prosciutto-stuffed-olives",
    recipeId: "veal-prosciutto-stuffed-olives",
    label: "Veal & Prosciutto Stuffed Olives",
    piecesPerServe: 6,
    pieceWeightG: null,
    pieceUnit: "stuffed olives",
    serviceUnit: "tapas serve",
  }),
});

export const POS_RECIPE_MAP = Object.freeze({
  "POLP-01": TAPAS_MENU.polpette,
  "OLIVE-01": TAPAS_MENU["veal-prosciutto-stuffed-olives"],
});

export const CHANGE_SCOPES = Object.freeze({
  PERMANENT: "PERMANENT RIVIERA STANDARD",
  PACKAGE: "PACKAGE-SPECIFIC STANDARD",
  RECIPE: "RECIPE-SPECIFIC STANDARD",
  EVENT: "EVENT-SPECIFIC INSTRUCTION",
  WEEK: "WEEK-SPECIFIC INSTRUCTION",
});

export function hashSource(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function parseCsv(content) {
  const input = content.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("UNCLOSED_QUOTED_FIELD");
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }
  if (rows.length === 0) {
    throw new Error("EMPTY_CSV");
  }

  const rawHeaders = rows[0].map((header) => header.trim());
  const headers = rawHeaders.map(normalizeHeader);
  const records = rows.slice(1).map((cells, rowIndex) => {
    const record = { _rowNumber: rowIndex + 2 };
    headers.forEach((header, columnIndex) => {
      record[header] = (cells[columnIndex] ?? "").trim();
    });
    return record;
  });

  return { rawHeaders, headers, records };
}

export function inspectSalesSchema(headers) {
  const normalized = headers.map(normalizeHeader);
  const headerSet = new Set(normalized);
  const allowed = new Set([...SALES_SCHEMA.required, ...SALES_SCHEMA.optional]);
  const missing = SALES_SCHEMA.required.filter((header) => !headerSet.has(header));
  const unknown = normalized.filter((header) => !allowed.has(header));
  const duplicates = normalized.filter(
    (header, index) => normalized.indexOf(header) !== index,
  );

  if (duplicates.length > 0) {
    return {
      ok: false,
      code: "DUPLICATE_HEADER",
      missing,
      unknown,
      duplicates: [...new Set(duplicates)],
    };
  }
  if (missing.length > 0 && unknown.length > 0) {
    return {
      ok: false,
      code: "SCHEMA_CHANGED",
      missing,
      unknown,
      duplicates: [],
    };
  }
  if (missing.length > 0) {
    return {
      ok: false,
      code: "MISSING_HEADER",
      missing,
      unknown,
      duplicates: [],
    };
  }

  return {
    ok: true,
    code: unknown.length > 0 ? "UNRECOGNIZED_HEADER" : "SCHEMA_OK",
    missing: [],
    unknown,
    duplicates: [],
  };
}

export function ingestSalesCsv(
  content,
  {
    seenHashes = new Set(),
    posMap = POS_RECIPE_MAP,
    sourceName = "uploaded-sales.csv",
  } = {},
) {
  const sourceHash = hashSource(content);
  if (seenHashes.has(sourceHash)) {
    return {
      status: "DUPLICATE_IMPORT",
      sourceName,
      sourceHash,
      accepted: [],
      quarantined: [],
    };
  }

  const parsed = parseCsv(content);
  const schema = inspectSalesSchema(parsed.headers);
  if (!schema.ok) {
    return {
      status: "REJECTED",
      sourceName,
      sourceHash,
      schema,
      accepted: [],
      quarantined: [],
    };
  }

  const accepted = [];
  const quarantined = [];

  for (const row of parsed.records) {
    const mapping = posMap[row.pos_item_id.trim().toUpperCase()];
    if (!mapping) {
      quarantined.push({
        ...row,
        reason: "UNKNOWN_POS_ITEM",
        action: "MAP_EXPLICITLY_BEFORE_REPROCESSING",
      });
      continue;
    }

    const quantities = parseSalesQuantities(row);
    if (!quantities.ok) {
      quarantined.push({
        ...row,
        reason: quantities.code,
        action: "REVIEW_SOURCE_ROW",
      });
      continue;
    }

    accepted.push({
      serviceDate: row.service_date,
      posItemId: row.pos_item_id.trim().toUpperCase(),
      posItemName: row.pos_item_name,
      menuItemId: mapping.menuItemId,
      recipeId: mapping.recipeId,
      soldQty: quantities.soldQty,
      voidedQty: quantities.voidedQty,
      refundedQty: quantities.refundedQty,
      netQty: quantities.netQty,
      covers: row.covers === "" ? null : Number(row.covers),
      sourceRow: row._rowNumber,
    });
  }

  seenHashes.add(sourceHash);
  return {
    status: quarantined.length > 0 ? "PROCESSED_WITH_EXCEPTIONS" : "PROCESSED",
    sourceName,
    sourceHash,
    schema,
    accepted,
    quarantined,
  };
}

export function selectStockBaseline(stocktakes, serviceDate) {
  const eligible = stocktakes
    .filter((stocktake) => stocktake.asOfDate <= serviceDate)
    .sort((left, right) => right.asOfDate.localeCompare(left.asOfDate));
  return eligible[0] ?? null;
}

export function buildPrepDraft({
  serviceDate,
  bookedCovers,
  history,
  stocktakes = [],
  menu = TAPAS_MENU,
  comparableSundayLimit = 13,
}) {
  if (!Number.isFinite(bookedCovers) || bookedCovers < 0) {
    throw new Error("INVALID_BOOKED_COVERS");
  }

  const baseline = selectStockBaseline(stocktakes, serviceDate);
  const lines = Object.values(menu).map((item) => {
    const comparable = latestComparableSundays(
      history.filter((row) => row.menuItemId === item.menuItemId),
      serviceDate,
      comparableSundayLimit,
    );
    const totalCovers = comparable.reduce((sum, row) => sum + row.covers, 0);
    const totalServes = comparable.reduce((sum, row) => sum + row.netQty, 0);
    const servesPerCover = totalCovers === 0 ? 0 : totalServes / totalCovers;
    const targetServes = Math.ceil(servesPerCover * bookedCovers);
    const grossTargetUnits = targetServes * item.piecesPerServe;
    const counted = baseline?.items?.[item.menuItemId];
    const countAvailable = Number.isFinite(counted);

    return {
      menuItemId: item.menuItemId,
      recipeId: item.recipeId,
      label: item.label,
      bookedCovers,
      servesPerCover,
      targetServes,
      piecesPerServe: item.piecesPerServe,
      pieceWeightG: item.pieceWeightG,
      pieceUnit: item.pieceUnit,
      grossTargetUnits,
      stockAsOfDate: countAvailable ? baseline.asOfDate : null,
      countedUnits: countAvailable ? counted : null,
      prepUnits: countAvailable ? Math.max(0, grossTargetUnits - counted) : null,
      countStatus: countAvailable ? "COUNTED" : "COUNT REQUIRED",
      bufferPercent: 0,
      bufferApplied: false,
      comparableSundays: comparable.length,
    };
  });

  return {
    status: "DRAFT",
    serviceDate,
    bookedCovers,
    stockBaselineDate: baseline?.asOfDate ?? null,
    stockBaselineType: baseline?.type ?? null,
    automaticBufferPercent: 0,
    lines,
  };
}

export function publishPrepDraft(
  draft,
  approval,
  previousPublication = null,
) {
  if (
    draft?.status !== "DRAFT" ||
    approval?.decision !== "APPROVED" ||
    !approval.reviewer ||
    !approval.approvedAt
  ) {
    throw new Error("APPROVAL_REQUIRED");
  }

  const current = {
    title: "Riviera — Current Sunday Tapas Prep Sheet",
    status: "PUBLISHED",
    publishedAt: approval.approvedAt,
    approvedBy: approval.reviewer,
    serviceDate: draft.serviceDate,
    draft,
  };
  const archived = previousPublication
    ? {
        ...previousPublication,
        status: "ARCHIVED",
        archivedAt: approval.approvedAt,
      }
    : null;

  return { current, archived };
}

export function routeChangeReceipt(receipt) {
  const allowedScopes = new Set(Object.values(CHANGE_SCOPES));
  if (!allowedScopes.has(receipt.scope)) {
    throw new Error("SCOPE_CONFIRMATION_REQUIRED");
  }
  if (!receipt.previousRule || !receipt.newRule || !receipt.affectedRecord) {
    throw new Error("INCOMPLETE_CHANGE_RECEIPT");
  }

  const temporary =
    receipt.scope === CHANGE_SCOPES.EVENT ||
    receipt.scope === CHANGE_SCOPES.WEEK;
  if (temporary) {
    if (!receipt.effectiveDate || !receipt.expiryDate) {
      throw new Error("TEMPORARY_SCOPE_DATES_REQUIRED");
    }
    if (receipt.expiryDate < receipt.effectiveDate) {
      throw new Error("INVALID_SCOPE_DATES");
    }
    return {
      route: "DRIVE_EVENT_WEEK_RECORD",
      canUpdatePermanentSop: false,
      canUpdateGithubRecipe: false,
      activeFrom: receipt.effectiveDate,
      activeUntil: receipt.expiryDate,
    };
  }

  if (receipt.scope === CHANGE_SCOPES.PERMANENT) {
    return {
      route: "DRIVE_SOP_MASTER",
      canUpdatePermanentSop: true,
      canUpdateGithubRecipe: false,
    };
  }
  if (receipt.scope === CHANGE_SCOPES.PACKAGE) {
    return {
      route: "DRIVE_PACKAGE_REGISTER",
      canUpdatePermanentSop: false,
      canUpdateGithubRecipe: false,
    };
  }
  return {
    route: "GITHUB_RECIPE_AND_DRIVE_CHANGE_REGISTER",
    canUpdatePermanentSop: false,
    canUpdateGithubRecipe: true,
  };
}

function normalizeHeader(header) {
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function parseSalesQuantities(row) {
  const soldQty = Number(row.sold_qty);
  const voidedQty = row.voided_qty === "" ? 0 : Number(row.voided_qty);
  const refundedQty = row.refunded_qty === "" ? 0 : Number(row.refunded_qty);

  if (![soldQty, voidedQty, refundedQty].every(Number.isFinite)) {
    return { ok: false, code: "INVALID_QUANTITY" };
  }
  if ([soldQty, voidedQty, refundedQty].some((quantity) => quantity < 0)) {
    return { ok: false, code: "NEGATIVE_QUANTITY" };
  }

  const netQty = soldQty - voidedQty - refundedQty;
  if (netQty < 0) {
    return { ok: false, code: "NEGATIVE_NET_QUANTITY" };
  }
  return { ok: true, soldQty, voidedQty, refundedQty, netQty };
}

function latestComparableSundays(rows, serviceDate, limit) {
  const byDate = new Map();
  for (const row of rows) {
    if (row.serviceDate >= serviceDate) {
      continue;
    }
    const current = byDate.get(row.serviceDate) ?? {
      serviceDate: row.serviceDate,
      covers: 0,
      netQty: 0,
    };
    current.covers = Math.max(current.covers, Number(row.covers) || 0);
    current.netQty += Number(row.netQty) || 0;
    byDate.set(row.serviceDate, current);
  }
  return [...byDate.values()]
    .filter((row) => row.covers > 0)
    .sort((left, right) => right.serviceDate.localeCompare(left.serviceDate))
    .slice(0, limit);
}
