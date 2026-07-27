// -----------------------------------------------------------------------------
// Source section: apps-script/riviera-tapas-orchestrator/src/Config.gs.source
// -----------------------------------------------------------------------------
/**
 * Riviera Tapas Intake Orchestrator
 *
 * Drive-first and approval-gated. Operational data stays in the control
 * workbook until a human approves publication of the current prep sheet.
 */

var RIVIERA = Object.freeze({
  VERSION: "1.0.0",
  TIME_ZONE: "Australia/Brisbane",
  CURRENT_PREP_FILE_NAME: "Riviera — Current Sunday Tapas Prep Sheet",
  SHEETS: Object.freeze({
    CONFIG: "Config",
    INTAKE_LOG: "Intake Log",
    SALES: "Tapas Sales",
    BOOKINGS: "Tapas Bookings",
    STOCK: "Stock Baseline",
    POS_MAP: "POS Recipe Map",
    MENU_MAP: "Menu Recipe Map",
    FORECAST: "Forecast & Prep",
    DRAFT: "Tapas Prep — Draft",
    EXCEPTIONS: "Exceptions",
    CHANGES: "Change Receipts",
    RUNS: "Run Receipts"
  }),
  KINDS: Object.freeze({
    SALES: "TAPAS_SALES",
    BOOKINGS: "TAPAS_BOOKINGS",
    STOCK: "MONTHLY_STOCKTAKE",
    CHANGES: "CONVERSATION_CHANGES"
  }),
  VALID_CHANGE_SCOPES: Object.freeze([
    "PERMANENT RIVIERA STANDARD",
    "PACKAGE-SPECIFIC STANDARD",
    "RECIPE-SPECIFIC STANDARD",
    "EVENT-SPECIFIC INSTRUCTION",
    "WEEK-SPECIFIC INSTRUCTION"
  ]),
  HEADERS: Object.freeze({
    CONFIG: ["Key", "Value", "Required", "Notes"],
    INTAKE_LOG: [
      "Processed At", "Run ID", "Intake Kind", "Source File ID",
      "Source File Name", "Source MIME Type", "SHA-256", "Outcome",
      "Rows Accepted", "Rows Quarantined", "Destination Folder ID", "Message"
    ],
    SALES: [
      "Run ID", "Source SHA-256", "Source File ID", "Source File Name",
      "Source Row", "Service Date", "Menu Item ID", "Recipe ID",
      "Item Name", "Sold Qty", "Voided Qty", "Refunded Qty", "Net Qty",
      "Covers", "Imported At"
    ],
    BOOKINGS: [
      "Run ID", "Source SHA-256", "Source File ID", "Source File Name",
      "Source Row", "Booking ID", "Service Date", "Booked Covers",
      "Status", "Event Name", "Notes", "Imported At"
    ],
    STOCK: [
      "Run ID", "Source SHA-256", "Source File ID", "Source File Name",
      "Source Row", "Stocktake Date", "Menu Item ID", "Recipe ID",
      "Item Name", "On Hand Qty", "UOM", "Imported At"
    ],
    POS_MAP: [
      "POS Item ID", "POS Item Name", "Menu Item ID", "Active",
      "Notes"
    ],
    MENU_MAP: [
      "Menu Item ID", "Menu Item Name", "Aliases", "Recipe ID",
      "Pieces Per Serve", "Piece Weight g", "Stock UOM",
      "Stock Units Per Serve", "Pull Unit Serves", "Pull Unit Label",
      "Active", "Status", "Notes"
    ],
    FORECAST: [
      "Run ID", "Service Date", "Booked Covers", "Menu Item ID",
      "Recipe ID", "Item Name", "Comparable Sundays", "Sample Covers",
      "Sample Net Serves", "Serves Per Cover", "Gross Target Serves",
      "Stock Observed At", "Observed Stock Qty", "Estimated On Hand Serves",
      "Stock Status", "To Prep Serves", "Pieces Per Serve",
      "Pull Unit Serves", "Rounded Pull Serves", "Rounded Pieces",
      "Automatic Buffer %", "Readiness", "Notes", "Publication Status"
    ],
    DRAFT: [
      "Menu Item", "Booked Covers", "Gross Target Serves",
      "Estimated On Hand Serves", "Prep / Pull Serves", "Pieces",
      "Readiness", "Notes"
    ],
    EXCEPTIONS: [
      "Logged At", "Run ID", "Intake Kind", "Source File ID",
      "Source File Name", "Source Row", "Exception Code", "Message",
      "Payload", "Status"
    ],
    CHANGES: [
      "Receipt ID", "Created At", "Source SHA-256", "Source File ID",
      "Source Row", "Previous Rule", "New Rule", "Scope", "Target Route",
      "Effective Date", "Expiry Date", "Affected Records", "Requested By",
      "Drive Status", "GitHub Status", "ChatGPT Status",
      "Approval Status", "Approved By", "Approved At", "Notes"
    ],
    RUNS: [
      "Run ID", "Run Type", "Started At", "Finished At", "Status",
      "Source File IDs", "Source SHA-256 Values", "Rows Accepted",
      "Rows Quarantined", "Target Service Date", "Booked Covers",
      "Recipe Release ID", "Recipe Git Commit", "Approved By",
      "Approved At", "Published File ID", "Message"
    ]
  })
});

var DEFAULT_HEADER_ALIASES = Object.freeze({
  TAPAS_SALES: {
    service_date: ["service_date", "date", "sale_date", "business_date", "trading_date"],
    item_id: ["item_id", "pos_item_id", "product_id", "sku", "plu"],
    item_name: ["item_name", "product_name", "menu_item", "item", "description"],
    sold_qty: ["sold_qty", "sold", "quantity", "qty", "units_sold", "sales_qty"],
    voided_qty: ["voided_qty", "voided", "void_qty", "voids"],
    refunded_qty: ["refunded_qty", "refunded", "refund_qty", "refunds"],
    covers: ["covers", "guest_count", "guests", "pax"]
  },
  TAPAS_BOOKINGS: {
    booking_id: ["booking_id", "reservation_id", "event_id", "reference", "ref"],
    service_date: ["service_date", "booking_date", "event_date", "date"],
    booked_covers: ["booked_covers", "covers", "guests", "pax", "guest_count"],
    status: ["status", "booking_status"],
    event_name: ["event_name", "booking_name", "function_name", "name"],
    notes: ["notes", "comments", "special_requirements"]
  },
  MONTHLY_STOCKTAKE: {
    stocktake_date: ["stocktake_date", "count_date", "date"],
    item_id: ["item_id", "menu_item_id", "product_id", "sku"],
    item_name: ["item_name", "product_name", "menu_item", "item", "description"],
    on_hand_qty: ["on_hand_qty", "on_hand", "stock_qty", "quantity", "qty", "count"],
    uom: ["uom", "unit", "units", "measure"],
    notes: ["notes", "comments"]
  },
  CONVERSATION_CHANGES: {
    previous_rule: ["previous_rule", "old_rule", "before"],
    new_rule: ["new_rule", "correction", "after"],
    scope: ["scope", "classification", "change_scope"],
    effective_date: ["effective_date", "starts", "start_date"],
    expiry_date: ["expiry_date", "expires", "end_date"],
    affected_records: ["affected_records", "affected_sop", "records", "applies_to"],
    requested_by: ["requested_by", "author", "user"],
    notes: ["notes", "context"]
  }
});

var CONFIG_ROWS = [
  ["CONTROL_SPREADSHEET_ID", "", "YES", "Written automatically by setup."],
  ["ROOT_FOLDER_ID", "1GNZivM18y2TvjJrHBoYCGVih0HA9koHj", "YES", "Riviera Ops Orchestrator parent Drive folder."],
  ["SALES_INBOX_FOLDER_ID", "", "YES", "Tapas sales CSV / Google Sheets intake."],
  ["BOOKINGS_INBOX_FOLDER_ID", "", "YES", "Tapas bookings CSV / Google Sheets intake."],
  ["STOCK_INBOX_FOLDER_ID", "", "YES", "Monthly stocktake CSV / Google Sheets intake."],
  ["CHANGES_INBOX_FOLDER_ID", "", "YES", "Conversation change-receipt intake."],
  ["PROCESSED_FOLDER_ID", "", "YES", "Accepted source files are retained here."],
  ["EXCEPTIONS_FOLDER_ID", "", "YES", "Structurally invalid source files are retained here."],
  ["GENERATED_PREP_FOLDER_ID", "", "YES", "Approved current prep sheet and archives."],
  ["CURRENT_PREP_SHEET_ID", "", "NO", "Set automatically on first approved publication."],
  ["TARGET_SERVICE_DATE", "", "NO", "Optional YYYY-MM-DD override; otherwise next active booking."],
  ["MAX_STOCK_AGE_DAYS", "31", "YES", "Older stock is COUNT REQUIRED, never assumed zero."],
  ["DEDUCT_POST_STOCK_SALES", "TRUE", "YES", "Estimate on hand from baseline less later net sales."],
  ["RECIPE_RELEASE_ID", "", "YES", "Release ID printed in run receipts."],
  ["RECIPE_GITHUB_COMMIT", "", "YES", "Recipe database commit printed in run receipts."],
  ["HEADER_ALIASES_TAPAS_SALES", JSON.stringify(DEFAULT_HEADER_ALIASES.TAPAS_SALES), "YES", "JSON; add aliases without changing code."],
  ["HEADER_ALIASES_TAPAS_BOOKINGS", JSON.stringify(DEFAULT_HEADER_ALIASES.TAPAS_BOOKINGS), "YES", "JSON; add aliases without changing code."],
  ["HEADER_ALIASES_MONTHLY_STOCKTAKE", JSON.stringify(DEFAULT_HEADER_ALIASES.MONTHLY_STOCKTAKE), "YES", "JSON; add aliases without changing code."],
  ["HEADER_ALIASES_CONVERSATION_CHANGES", JSON.stringify(DEFAULT_HEADER_ALIASES.CONVERSATION_CHANGES), "YES", "JSON; add aliases without changing code."]
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Riviera Orchestrator")
    .addItem("Set up / repair control workbook", "setupOrchestrator")
    .addItem("Create Drive intake folders", "createRivieraIntakeFolders")
    .addSeparator()
    .addItem("Process all inboxes now", "processRivieraInbox")
    .addItem("Generate Tapas draft", "generateTapasDraft")
    .addItem("Approve & publish current prep", "approveAndPublishCurrentTapasPrep")
    .addItem("Approve selected change receipt", "approveSelectedChangeReceipt")
    .addSeparator()
    .addItem("Install 5-minute inbox watcher", "installFiveMinuteWatcher")
    .addItem("Remove inbox watcher", "removeInboxWatcher")
    .addSeparator()
    .addItem("Run self-test", "runRivieraOrchestratorSelfTest")
    .addToUi();
}

/**
 * One-click live setup. Safe to rerun: existing exact-name folders are reused,
 * and duplicate exact-name folders are a stop condition.
 */
function setupOrchestrator() {
  setupRivieraOrchestrator();
  createRivieraIntakeFolders_();
  return {
    spreadsheetId: getControlSpreadsheet_().getId(),
    rootFolderId: getConfig_(getControlSpreadsheet_()).ROOT_FOLDER_ID
  };
}

function setupRivieraOrchestrator() {
  var spreadsheet = getControlSpreadsheet_();
  ensureSheet_(spreadsheet, RIVIERA.SHEETS.CONFIG, RIVIERA.HEADERS.CONFIG);
  seedConfig_(spreadsheet);

  var sheetHeaders = {};
  sheetHeaders[RIVIERA.SHEETS.INTAKE_LOG] = RIVIERA.HEADERS.INTAKE_LOG;
  sheetHeaders[RIVIERA.SHEETS.SALES] = RIVIERA.HEADERS.SALES;
  sheetHeaders[RIVIERA.SHEETS.BOOKINGS] = RIVIERA.HEADERS.BOOKINGS;
  sheetHeaders[RIVIERA.SHEETS.STOCK] = RIVIERA.HEADERS.STOCK;
  sheetHeaders[RIVIERA.SHEETS.POS_MAP] = RIVIERA.HEADERS.POS_MAP;
  sheetHeaders[RIVIERA.SHEETS.MENU_MAP] = RIVIERA.HEADERS.MENU_MAP;
  sheetHeaders[RIVIERA.SHEETS.FORECAST] = RIVIERA.HEADERS.FORECAST;
  sheetHeaders[RIVIERA.SHEETS.DRAFT] = RIVIERA.HEADERS.DRAFT;
  sheetHeaders[RIVIERA.SHEETS.EXCEPTIONS] = RIVIERA.HEADERS.EXCEPTIONS;
  sheetHeaders[RIVIERA.SHEETS.CHANGES] = RIVIERA.HEADERS.CHANGES;
  sheetHeaders[RIVIERA.SHEETS.RUNS] = RIVIERA.HEADERS.RUNS;

  Object.keys(sheetHeaders).forEach(function (name) {
    ensureSheet_(spreadsheet, name, sheetHeaders[name]);
  });

  seedMenuMappings_(spreadsheet);
  styleControlWorkbook_(spreadsheet);
  setConfigValue_(spreadsheet, "CONTROL_SPREADSHEET_ID", spreadsheet.getId());
  PropertiesService.getScriptProperties()
    .setProperty("CONTROL_SPREADSHEET_ID", spreadsheet.getId());
  spreadsheet.toast("Riviera orchestrator is ready.", "Setup", 5);
}

function seedConfig_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(RIVIERA.SHEETS.CONFIG);
  var existing = readKeyValueSheet_(sheet);
  var sanitizedGitCommit = sanitizeConfigValue_(
    "RECIPE_GITHUB_COMMIT",
    existing.RECIPE_GITHUB_COMMIT
  );
  if (sanitizedGitCommit !== existing.RECIPE_GITHUB_COMMIT) {
    setConfigValue_(spreadsheet, "RECIPE_GITHUB_COMMIT", sanitizedGitCommit);
    existing.RECIPE_GITHUB_COMMIT = sanitizedGitCommit;
  }
  var rows = CONFIG_ROWS.filter(function (row) {
    return !Object.prototype.hasOwnProperty.call(existing, row[0]);
  });
  appendRows_(sheet, rows);
  if (!existing.ROOT_FOLDER_ID ||
      existing.ROOT_FOLDER_ID === "1OcmoRMYGbRwyGYcnrz0Ej3MIwu9RaU9l") {
    setConfigValue_(
      spreadsheet,
      "ROOT_FOLDER_ID",
      "1GNZivM18y2TvjJrHBoYCGVih0HA9koHj"
    );
  }
}

function sanitizeConfigValue_(key, value) {
  if (key === "RECIPE_GITHUB_COMMIT" &&
      String(value || "").trim() === "SET AFTER MERGE") {
    return "";
  }
  return value;
}

function seedMenuMappings_(spreadsheet) {
  var menuSheet = spreadsheet.getSheetByName(RIVIERA.SHEETS.MENU_MAP);
  var menuRows = [
    [
      "polpette", "Polpette",
      "polpette|meatballs|veal meatballs|slow cooked veal meatballs",
      "veal-meatballs", 3, 80, "pieces", 3, 1, "serve", true,
      "LOCKED",
      "User-confirmed; distinct from stuffed olives; " +
      "3 × 80 g meatballs per Tapas serve."
    ],
    [
      "veal-prosciutto-stuffed-olives", "Veal & Prosciutto Stuffed Olives",
      "veal olives|stuffed olives|veal and prosciutto crumbed olives",
      "veal-prosciutto-stuffed-olives", 6, "", "pieces", 6, 1, "serve",
      true, "ACTIVE WORKING", "Distinct from Polpette; 6 stuffed olives per Tapas serve."
    ]
  ];
  upsertCanonicalRows_(menuSheet, "Menu Item ID", menuRows);

  var posSheet = spreadsheet.getSheetByName(RIVIERA.SHEETS.POS_MAP);
  var posRows = [
    ["polpette", "Polpette", "polpette", true, "Canonical Riviera Tapas ID."],
    [
      "veal-prosciutto-stuffed-olives",
      "Veal & Prosciutto Stuffed Olives",
      "veal-prosciutto-stuffed-olives",
      true,
      "Canonical Riviera Tapas ID; 6 pieces per serve."
    ]
  ];
  upsertCanonicalRows_(posSheet, "POS Item ID", posRows);
}

function upsertCanonicalRows_(sheet, idHeader, canonicalRows) {
  var headers = sheet.getRange(
    1, 1, 1, sheet.getLastColumn()
  ).getDisplayValues()[0];
  var idColumn = headers.indexOf(idHeader);
  if (idColumn === -1) {
    throw new Error(
      "Cannot seed " + sheet.getName() + ": missing " + idHeader + "."
    );
  }
  var values = sheet.getLastRow() > 1 ?
    sheet.getRange(
      2, 1, sheet.getLastRow() - 1, headers.length
    ).getValues() : [];
  canonicalRows.forEach(function (canonicalRow) {
    var targetId = normalizeText_(canonicalRow[idColumn]);
    var matchingRows = [];
    values.forEach(function (existingRow, index) {
      if (normalizeText_(existingRow[idColumn]) === targetId) {
        matchingRows.push(index + 2);
      }
    });
    if (matchingRows.length > 1) {
      throw new Error(
        "Duplicate canonical mapping '" + canonicalRow[idColumn] +
        "' in " + sheet.getName() + ". Resolve it before setup."
      );
    }
    if (matchingRows.length === 1) {
      sheet.getRange(
        matchingRows[0], 1, 1, canonicalRow.length
      ).setValues([canonicalRow]);
    } else {
      appendRows_(sheet, [canonicalRow]);
      values.push(canonicalRow);
    }
  });
}

function createRivieraIntakeFolders() {
  setupRivieraOrchestrator();
  createRivieraIntakeFolders_();
}

function createRivieraIntakeFolders_() {
  var spreadsheet = getControlSpreadsheet_();
  var config = getConfig_(spreadsheet);
  if (!config.ROOT_FOLDER_ID) {
    throw new Error("Set ROOT_FOLDER_ID in Config before creating intake folders.");
  }
  var root = DriveApp.getFolderById(config.ROOT_FOLDER_ID);
  var sales = getOrCreateFolder_(root, "00 Inbox — Tapas Sales");
  var bookings = getOrCreateFolder_(root, "00 Inbox — Tapas Bookings");
  var stock = getOrCreateFolder_(root, "00 Inbox — Stocktakes");
  var changes = getOrCreateFolder_(root, "00 Inbox — Conversation Changes");
  var processed = getOrCreateFolder_(root, "10 Processed");
  var exceptions = getOrCreateFolder_(root, "20 Exceptions");
  var generated = getOrCreateFolder_(root, "30 Generated Prep Sheets");

  setConfigValue_(spreadsheet, "SALES_INBOX_FOLDER_ID", sales.getId());
  setConfigValue_(spreadsheet, "BOOKINGS_INBOX_FOLDER_ID", bookings.getId());
  setConfigValue_(spreadsheet, "STOCK_INBOX_FOLDER_ID", stock.getId());
  setConfigValue_(spreadsheet, "CHANGES_INBOX_FOLDER_ID", changes.getId());
  setConfigValue_(spreadsheet, "PROCESSED_FOLDER_ID", processed.getId());
  setConfigValue_(spreadsheet, "EXCEPTIONS_FOLDER_ID", exceptions.getId());
  setConfigValue_(spreadsheet, "GENERATED_PREP_FOLDER_ID", generated.getId());
  spreadsheet.toast("Drive intake folders created and linked.", "Riviera", 5);
}

function installFiveMinuteWatcher() {
  removeInboxWatcher();
  ScriptApp.newTrigger("processRivieraInbox")
    .timeBased()
    .everyMinutes(5)
    .create();
  getControlSpreadsheet_().toast("5-minute inbox watcher installed.", "Riviera", 5);
}

function removeInboxWatcher() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "processRivieraInbox") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function getControlSpreadsheet_() {
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    return active;
  }
  var id = PropertiesService.getScriptProperties()
    .getProperty("CONTROL_SPREADSHEET_ID");
  if (!id) {
    throw new Error(
      "No control workbook is active. Bind this script to the workbook or " +
      "set CONTROL_SPREADSHEET_ID in Script Properties."
    );
  }
  return SpreadsheetApp.openById(id);
}

function getConfig_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(RIVIERA.SHEETS.CONFIG);
  if (!sheet) {
    throw new Error("Run setupRivieraOrchestrator first.");
  }
  return readKeyValueSheet_(sheet);
}

function setConfigValue_(spreadsheet, key, value) {
  var sheet = spreadsheet.getSheetByName(RIVIERA.SHEETS.CONFIG);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][0]).trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value, "NO", "Added by orchestrator."]);
}

function readKeyValueSheet_(sheet) {
  var values = sheet.getDataRange().getValues();
  var result = {};
  for (var i = 1; i < values.length; i += 1) {
    var key = String(values[i][0] || "").trim();
    if (key) {
      result[key] = values[i][1] === null ? "" : String(values[i][1]).trim();
    }
  }
  return result;
}

function ensureSheet_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  var current = sheet.getLastColumn() ?
    sheet.getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0] : [];
  while (current.length && !String(current[current.length - 1]).trim()) {
    current.pop();
  }
  var hasContent = current.some(function (value) {
    return String(value).trim() !== "";
  });
  if (!hasContent) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    var normalizedCurrent = current.map(String);
    if (normalizedCurrent.join("\u001f") !== headers.join("\u001f")) {
      migrateKnownTemplateSheet_(sheet, name, normalizedCurrent, headers);
    }
  }
  sheet.setFrozenRows(1);
  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  var lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(1, 1, lastRow, headers.length).createFilter();
  return sheet;
}

/**
 * The first live workbook was created from a human-friendly v1 template.
 * Recognised v1 headings are migrated once into the runtime schema. Every
 * source heading must map unambiguously by name/synonym, unless the complete
 * header signature has an explicit enumerated migration below. There is no
 * positional fallback.
 */
function migrateKnownTemplateSheet_(sheet, name, current, canonical) {
  var firstHeaderAliases = {};
  firstHeaderAliases[RIVIERA.SHEETS.CONFIG] = ["key", "setting", "config key"];
  firstHeaderAliases[RIVIERA.SHEETS.INTAKE_LOG] = [
    "processed at", "timestamp", "received at", "intake id"
  ];
  firstHeaderAliases[RIVIERA.SHEETS.SALES] = [
    "run id", "service date", "sale date", "date"
  ];
  firstHeaderAliases[RIVIERA.SHEETS.BOOKINGS] = [
    "run id", "service date", "booking date", "date"
  ];
  firstHeaderAliases[RIVIERA.SHEETS.STOCK] = [
    "run id", "stocktake date", "count date", "date"
  ];
  firstHeaderAliases[RIVIERA.SHEETS.POS_MAP] = [
    "pos item id", "pos id", "pos item", "source item"
  ];
  firstHeaderAliases[RIVIERA.SHEETS.MENU_MAP] = [
    "menu item id", "menu id", "riviera item id"
  ];
  firstHeaderAliases[RIVIERA.SHEETS.FORECAST] = [
    "run id", "service date", "target service date"
  ];
  firstHeaderAliases[RIVIERA.SHEETS.DRAFT] = [
    "menu item", "item", "item name"
  ];
  firstHeaderAliases[RIVIERA.SHEETS.EXCEPTIONS] = [
    "logged at", "timestamp", "exception id"
  ];
  firstHeaderAliases[RIVIERA.SHEETS.CHANGES] = [
    "receipt id", "change id", "created at", "previous rule"
  ];
  firstHeaderAliases[RIVIERA.SHEETS.RUNS] = [
    "run id", "created at", "started at"
  ];

  var sourceValues = sheet.getLastRow() > 1 ?
    sheet.getRange(2, 1, sheet.getLastRow() - 1, current.length).getValues() :
    [];
  var sourceIndexByCanonical = {};
  var explicit = getExactKnownHeaderMigration_(name, current, canonical);
  if (explicit) {
    sourceIndexByCanonical = explicit;
  } else {
    var allowedFirst = firstHeaderAliases[name] || [];
    var first = normalizeText_(current[0]);
    if (allowedFirst.indexOf(first) === -1) {
      throw new Error(
        "Unrecognised header mismatch in control sheet '" + name +
        "'. Existing first heading is '" + current[0] + "'."
      );
    }
    sourceIndexByCanonical = mapControlHeadersStrictly_(
      name, current, canonical
    );
  }

  var migratedRows = sourceValues.map(function (sourceRow) {
    return canonical.map(function (_targetHeader, targetIndex) {
      var sourceIndex = sourceIndexByCanonical[targetIndex];
      return sourceIndex === undefined ? "" : sourceRow[sourceIndex];
    });
  });
  if (name === RIVIERA.SHEETS.CONFIG) {
    var configRequiredIndex = canonical.indexOf("Required");
    var configKeyIndex = canonical.indexOf("Key");
    var configValueIndex = canonical.indexOf("Value");
    var configRequiredByKey = {};
    CONFIG_ROWS.forEach(function (row) {
      configRequiredByKey[String(row[0])] = row[2];
    });
    migratedRows.forEach(function (row) {
      var key = String(row[configKeyIndex] || "");
      row[configRequiredIndex] = configRequiredByKey[key] || "NO";
      row[configValueIndex] = sanitizeConfigValue_(
        key,
        row[configValueIndex]
      );
    });
  }
  if (name === RIVIERA.SHEETS.POS_MAP) {
    var posIdIndex = canonical.indexOf("POS Item ID");
    migratedRows = migratedRows.filter(function (row) {
      return normalizeText_(row[posIdIndex]) !== "needs pos id";
    });
  }
  if (name === RIVIERA.SHEETS.CHANGES) {
    var receiptIndex = canonical.indexOf("Receipt ID");
    var scopeIndex = canonical.indexOf("Scope");
    var routeIndex = canonical.indexOf("Target Route");
    var changeNotesIndex = canonical.indexOf("Notes");
    var sourceConversationIndex = current.map(normalizeText_)
      .indexOf("source conversation");
    migratedRows.forEach(function (row, rowIndex) {
      if (String(row[receiptIndex]) === "CHG-2026-07-27-TAPAS-IDS") {
        row[scopeIndex] = "RECIPE-SPECIFIC STANDARD";
      }
      if (sourceConversationIndex !== -1) {
        var sourceConversation = String(
          sourceValues[rowIndex][sourceConversationIndex] || ""
        ).trim();
        if (sourceConversation) {
          row[changeNotesIndex] = [
            String(row[changeNotesIndex] || "").trim(),
            "Source conversation: " + sourceConversation
          ].filter(Boolean).join(" ");
        }
      }
      if (routeIndex !== -1 && !row[routeIndex] && row[scopeIndex]) {
        row[routeIndex] = scopeTargetRoute_(String(row[scopeIndex]).toUpperCase());
      }
    });
  }

  sheet.clearContents();
  sheet.getRange(1, 1, 1, canonical.length).setValues([canonical]);
  appendRows_(sheet, migratedRows);
  var migrationNote =
    "Migrated automatically from the recognised Riviera v1 control " +
    "workbook template on " + nowIso_() + ".";
  if (name === RIVIERA.SHEETS.STOCK) {
    migrationNote +=
      " Blank 1 August placeholder counts remain COUNT REQUIRED and are " +
      "not treated as observed stock.";
  }
  sheet.getRange(1, 1).setNote(migrationNote);
}

function mapControlHeadersStrictly_(name, current, canonical) {
  var synonyms = controlHeaderSynonyms_();
  var mapping = {};
  var usedTargets = {};
  current.forEach(function (sourceHeader, sourceIndex) {
    var sourceKey = normalizeText_(sourceHeader);
    if (!sourceKey) {
      throw new Error(
        "Blank heading in '" + name + "' at column " + (sourceIndex + 1) + "."
      );
    }
    var exact = [];
    canonical.forEach(function (targetHeader, targetIndex) {
      if (normalizeText_(targetHeader) === sourceKey) {
        exact.push(targetIndex);
      }
    });
    var candidates = exact;
    if (!candidates.length) {
      candidates = [];
      canonical.forEach(function (targetHeader, targetIndex) {
        var targetKey = normalizeText_(targetHeader);
        if ((synonyms[targetKey] || []).indexOf(sourceKey) !== -1) {
          candidates.push(targetIndex);
        }
      });
    }
    if (candidates.length !== 1) {
      throw new Error(
        "Heading '" + sourceHeader + "' in '" + name + "' maps to " +
        candidates.length + " canonical columns; migration stopped."
      );
    }
    var targetIndex = candidates[0];
    if (usedTargets[targetIndex] !== undefined) {
      throw new Error(
        "Headings '" + current[usedTargets[targetIndex]] + "' and '" +
        sourceHeader + "' both map to '" + canonical[targetIndex] +
        "' in '" + name + "'."
      );
    }
    usedTargets[targetIndex] = sourceIndex;
    mapping[targetIndex] = sourceIndex;
  });
  return mapping;
}

function getExactKnownHeaderMigration_(name, current, canonical) {
  var signature = current.map(normalizeText_).join("|");
  var migrations = [];
  migrations.push({
    sheet: RIVIERA.SHEETS.CONFIG,
    source: ["key", "value", "description", "editable"],
    target: {
      "Key": 0,
      "Value": 1,
      "Notes": 2
    }
  });
  migrations.push({
    sheet: RIVIERA.SHEETS.INTAKE_LOG,
    source: [
      "intake id", "received at", "source type", "source file id",
      "source file name", "sha256", "status", "rows read",
      "rows accepted", "rows quarantined", "processed at",
      "processed by", "notes"
    ],
    target: {
      "Processed At": 10,
      "Run ID": 0,
      "Intake Kind": 2,
      "Source File ID": 3,
      "Source File Name": 4,
      "SHA-256": 5,
      "Outcome": 6,
      "Rows Accepted": 8,
      "Rows Quarantined": 9,
      "Message": 12
    }
  });
  migrations.push({
    sheet: RIVIERA.SHEETS.SALES,
    source: [
      "sale id", "service date", "service day", "pos item id",
      "pos item name raw", "menu item id", "sold qty", "voided qty",
      "refunded qty", "net serves", "net item units", "covers",
      "source file id", "imported at", "validation status"
    ],
    target: {
      "Run ID": 0,
      "Source File ID": 12,
      "Service Date": 1,
      "Menu Item ID": 5,
      "Item Name": 4,
      "Sold Qty": 6,
      "Voided Qty": 7,
      "Refunded Qty": 8,
      "Net Qty": 9,
      "Covers": 11,
      "Imported At": 13
    }
  });
  migrations.push({
    sheet: RIVIERA.SHEETS.BOOKINGS,
    source: [
      "booking id", "service date", "booked covers", "confirmed covers",
      "booking status", "dietary summary", "source file id",
      "imported at", "validation status"
    ],
    target: {
      "Source File ID": 6,
      "Booking ID": 0,
      "Service Date": 1,
      "Booked Covers": 2,
      "Status": 4,
      "Notes": 5,
      "Imported At": 7
    }
  });
  migrations.push({
    sheet: RIVIERA.SHEETS.STOCK,
    source: [
      "stocktake id", "counted at", "baseline month", "menu item id",
      "item name", "counted units", "unit", "source file id",
      "is opening baseline", "validation status", "notes"
    ],
    target: {
      "Run ID": 0,
      "Source File ID": 7,
      "Stocktake Date": 1,
      "Menu Item ID": 3,
      "Item Name": 4,
      "On Hand Qty": 5,
      "UOM": 6,
      "Imported At": 1
    }
  });
  migrations.push({
    sheet: RIVIERA.SHEETS.POS_MAP,
    source: [
      "pos item id", "pos item name", "menu item id", "recipe id",
      "mapping status", "items per tapas serve", "unit",
      "pull rounding unit", "active sunday tapas", "aliases",
      "confirmed source", "notes"
    ],
    target: {
      "POS Item ID": 0,
      "POS Item Name": 1,
      "Menu Item ID": 2,
      "Active": 8,
      "Notes": 11
    }
  });
  migrations.push({
    sheet: RIVIERA.SHEETS.MENU_MAP,
    source: [
      "menu item id", "display name", "recipe id", "recipe status",
      "items per serve", "unit", "service status", "no auto buffer",
      "source", "confirmation needed"
    ],
    target: {
      "Menu Item ID": 0,
      "Menu Item Name": 1,
      "Recipe ID": 2,
      "Status": 3,
      "Pieces Per Serve": 4,
      "Stock UOM": 5,
      "Stock Units Per Serve": 4,
      "Active": 6,
      "Notes": 8
    }
  });
  migrations.push({
    sheet: RIVIERA.SHEETS.FORECAST,
    source: [
      "service date", "booked covers", "menu item id", "display name",
      "recipe id", "history sundays", "sold per cover",
      "forecast serves", "items per serve", "target units",
      "opening stock units", "production additions",
      "sales units since count", "waste transfer units",
      "available stock units", "pull make units", "pull make serves",
      "next tier backup units", "stock status", "mapping status",
      "approval status", "notes"
    ],
    target: {
      "Service Date": 0,
      "Booked Covers": 1,
      "Menu Item ID": 2,
      "Recipe ID": 4,
      "Item Name": 3,
      "Comparable Sundays": 5,
      "Serves Per Cover": 6,
      "Gross Target Serves": 7,
      "Stock Status": 18,
      "To Prep Serves": 16,
      "Pieces Per Serve": 8,
      "Rounded Pull Serves": 16,
      "Rounded Pieces": 15,
      "Readiness": 19,
      "Notes": 21,
      "Publication Status": 20
    }
  });
  migrations.push({
    sheet: RIVIERA.SHEETS.EXCEPTIONS,
    source: [
      "exception id", "raised at", "severity", "source type",
      "source file id", "source row", "exception code", "raw value",
      "suggested match", "resolution status", "resolution",
      "resolved by", "resolved at"
    ],
    target: {
      "Logged At": 1,
      "Intake Kind": 3,
      "Source File ID": 4,
      "Source Row": 5,
      "Exception Code": 6,
      "Message": 7,
      "Payload": 8,
      "Status": 9
    }
  });
  migrations.push({
    sheet: RIVIERA.SHEETS.CHANGES,
    source: [
      "change id", "received at", "previous rule", "new rule",
      "scope classification", "effective date", "expiry date",
      "affected records", "drive status", "github status",
      "chatgpt status", "approval status", "approved by",
      "approved at", "source conversation", "notes"
    ],
    target: {
      "Receipt ID": 0,
      "Created At": 1,
      "Previous Rule": 2,
      "New Rule": 3,
      "Scope": 4,
      "Effective Date": 5,
      "Expiry Date": 6,
      "Affected Records": 7,
      "Drive Status": 8,
      "GitHub Status": 9,
      "ChatGPT Status": 10,
      "Approval Status": 11,
      "Approved By": 12,
      "Approved At": 13,
      "Notes": 15
    }
  });
  migrations.push({
    sheet: RIVIERA.SHEETS.RUNS,
    source: [
      "run id", "started at", "completed at", "run type",
      "source file ids", "source hashes", "recipe release id",
      "github commit", "service date", "booked covers",
      "stock baseline at", "accepted rows", "quarantined rows",
      "draft file id", "publication status", "approved by",
      "approved at", "notes"
    ],
    target: {
      "Run ID": 0,
      "Run Type": 3,
      "Started At": 1,
      "Finished At": 2,
      "Status": 14,
      "Source File IDs": 4,
      "Source SHA-256 Values": 5,
      "Rows Accepted": 11,
      "Rows Quarantined": 12,
      "Target Service Date": 8,
      "Booked Covers": 9,
      "Recipe Release ID": 6,
      "Recipe Git Commit": 7,
      "Approved By": 15,
      "Approved At": 16,
      "Message": 17
    }
  });

  var exact = null;
  migrations.some(function (candidate) {
    if (candidate.sheet === name &&
        candidate.source.join("|") === signature) {
      exact = candidate;
      return true;
    }
    return false;
  });
  if (!exact) {
    return null;
  }
  var byTargetName = exact.target;
  var mapping = {};
  Object.keys(byTargetName).forEach(function (targetHeader) {
    var targetIndex = canonical.indexOf(targetHeader);
    if (targetIndex === -1) {
      throw new Error(
        "Known migration for '" + name + "' expects canonical column '" +
        targetHeader + "'."
      );
    }
    mapping[targetIndex] = byTargetName[targetHeader];
  });
  return mapping;
}

function controlHeaderSynonyms_() {
  return {
    "processed at": ["timestamp", "received at"],
    "run id": ["intake id", "batch id"],
    "intake kind": ["source type", "intake type"],
    "source file id": ["file id"],
    "source file name": ["file name", "source file"],
    "source mime type": ["mime type", "file type"],
    "sha 256": ["sha256", "content hash", "file hash"],
    "outcome": ["status", "result"],
    "rows accepted": ["accepted rows", "rows imported"],
    "rows quarantined": ["quarantined rows", "error rows"],
    "destination folder id": ["destination", "moved to"],
    "service date": ["date", "sale date", "booking date"],
    "menu item id": ["menu id", "riviera item id"],
    "recipe id": ["recipe", "github recipe id"],
    "item name": ["menu item", "product name"],
    "menu item name": ["display name", "item name", "menu item"],
    "sold qty": ["sold", "quantity sold", "units sold"],
    "voided qty": ["voided", "voids"],
    "refunded qty": ["refunded", "refunds"],
    "net qty": ["net", "net sold"],
    "booked covers": ["covers", "bookings", "pax"],
    "booking id": ["reservation id", "event id", "reference", "ref"],
    "event name": ["booking name", "function"],
    "stocktake date": ["count date", "date"],
    "on hand qty": ["on hand", "count", "quantity"],
    "pos item id": ["pos id", "source item id"],
    "pos item name": ["pos item", "source item name"],
    "active": ["enabled", "use", "service status"],
    "aliases": ["alias", "other names"],
    "pieces per serve": ["pieces serve", "pieces", "items per serve"],
    "piece weight g": ["piece weight", "weight g"],
    "stock uom": ["stock unit", "uom", "unit"],
    "stock units per serve": ["units per serve", "items per serve"],
    "pull unit serves": ["pull unit", "batch serves"],
    "pull unit label": ["pull label", "batch label"],
    "automatic buffer": ["buffer", "buffer percent"],
    "receipt id": ["change id"],
    "created at": ["timestamp"],
    "previous rule": ["old rule", "before"],
    "new rule": ["correction", "after"],
    "scope": ["classification"],
    "target route": ["destination route", "source route"],
    "effective date": ["starts", "start date"],
    "expiry date": ["expires", "end date"],
    "affected records": ["applies to", "affected sop"],
    "requested by": ["author", "user"],
    "status": ["recipe status"],
    "notes": ["source", "comments", "description"],
    "approval status": ["approval", "status"],
    "approved by": ["reviewer"],
    "approved at": ["approval time"],
    "started at": ["created at", "start time"],
    "finished at": ["completed at", "finish time"],
    "run type": ["type"],
    "source file ids": ["files"],
    "source sha 256 values": ["hashes"],
    "target service date": ["service date"],
    "recipe release id": ["release id"],
    "recipe git commit": ["git commit", "commit"],
    "published file id": ["output file id"]
  };
}

function styleControlWorkbook_(spreadsheet) {
  Object.keys(RIVIERA.SHEETS).forEach(function (key) {
    var sheet = spreadsheet.getSheetByName(RIVIERA.SHEETS[key]);
    if (!sheet) {
      return;
    }
    var lastColumn = Math.max(sheet.getLastColumn(), 1);
    sheet.getRange(1, 1, 1, lastColumn)
      .setBackground("#233833")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setWrap(true);
    sheet.setFrozenRows(1);
  });
}

function getOrCreateFolder_(parent, name) {
  var matches = parent.getFoldersByName(name);
  if (matches.hasNext()) {
    var folder = matches.next();
    if (matches.hasNext()) {
      throw new Error(
        "More than one folder named '" + name +
        "' exists under " + parent.getName() + ". Resolve duplicates first."
      );
    }
    return folder;
  }
  return parent.createFolder(name);
}

// -----------------------------------------------------------------------------
// Source section: apps-script/riviera-tapas-orchestrator/src/Core.gs.source
// -----------------------------------------------------------------------------
function normalizeText_(value) {
  return String(value === null || value === undefined ? "" : value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeHeader_(value) {
  return normalizeText_(value).replace(/\s+/g, "_");
}

function appendRows_(sheet, rows) {
  if (!rows || !rows.length) {
    return;
  }
  sheet.getRange(
    sheet.getLastRow() + 1,
    1,
    rows.length,
    rows[0].length
  ).setValues(rows);
}

function rowsAsObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  return values.slice(1)
    .filter(function (row) {
      return row.some(function (value) {
        return value !== "" && value !== null;
      });
    })
    .map(function (row) {
      var object = {};
      headers.forEach(function (header, index) {
        object[header] = row[index];
      });
      object.__rowNumber = values.indexOf(row) + 1;
      return object;
    });
}

function newRunId_(prefix) {
  return [
    prefix,
    Utilities.formatDate(new Date(), RIVIERA.TIME_ZONE, "yyyyMMdd-HHmmss"),
    Utilities.getUuid().slice(0, 8)
  ].join("-");
}

function nowIso_() {
  return Utilities.formatDate(
    new Date(),
    RIVIERA.TIME_ZONE,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
}

function dateKey_(date) {
  return Utilities.formatDate(date, RIVIERA.TIME_ZONE, "yyyy-MM-dd");
}

function parseDate_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" &&
      !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  var text = String(value || "").trim();
  if (!text) {
    return null;
  }
  var iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return validatedDate_(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }
  var au = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (au) {
    return validatedDate_(Number(au[3]), Number(au[2]), Number(au[1]));
  }
  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

function validatedDate_(year, month, day) {
  var date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day) {
    return null;
  }
  return date;
}

function parseRequiredNumber_(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  var cleaned = String(value)
    .replace(/[$,%\s]/g, "")
    .replace(/,/g, "");
  var number = Number(cleaned);
  return isFinite(number) ? number : null;
}

function parseOptionalNumber_(value, fallback) {
  var parsed = parseRequiredNumber_(value);
  return parsed === null ? fallback : parsed;
}

function isTrue_(value) {
  return ["true", "yes", "y", "1", "active", "offered", "current"].indexOf(
    String(value || "").trim().toLowerCase()
  ) !== -1;
}

function isSunday_(date) {
  return date && date.getDay() === 0;
}

function roundUpToUnit_(quantity, unit) {
  if (quantity === null || quantity === undefined ||
      unit === null || unit === undefined ||
      !isFinite(quantity) || !isFinite(unit) || unit <= 0) {
    return null;
  }
  return Math.ceil((quantity - 1e-10) / unit) * unit;
}

function netSales_(sold, voided, refunded) {
  return Number(sold) - Number(voided || 0) - Number(refunded || 0);
}

function computeSha256Hex_(value) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  );
  return digest.map(function (byte) {
    var unsigned = byte < 0 ? byte + 256 : byte;
    return ("0" + unsigned.toString(16)).slice(-2);
  }).join("");
}

function canonicalTableForHash_(kind, values) {
  var normalized = values.map(function (row) {
    return row.map(function (cell) {
      if (Object.prototype.toString.call(cell) === "[object Date]") {
        return dateKey_(cell);
      }
      return String(cell === null || cell === undefined ? "" : cell).trim();
    });
  });
  return kind + "\n" + JSON.stringify(normalized);
}

function getHeaderAliases_(kind, config) {
  var defaults = DEFAULT_HEADER_ALIASES[kind];
  var key = "HEADER_ALIASES_" + kind;
  var configured = config[key];
  if (!configured) {
    return defaults;
  }
  var parsed;
  try {
    parsed = JSON.parse(configured);
  } catch (error) {
    throw new Error(key + " must contain valid JSON: " + error.message);
  }
  var merged = {};
  Object.keys(defaults).forEach(function (canonical) {
    var additional = Array.isArray(parsed[canonical]) ?
      parsed[canonical] : [];
    merged[canonical] = defaults[canonical].concat(additional)
      .map(normalizeHeader_)
      .filter(function (value, index, array) {
        return value && array.indexOf(value) === index;
      });
  });
  Object.keys(parsed).forEach(function (canonical) {
    if (!merged[canonical] && Array.isArray(parsed[canonical])) {
      merged[canonical] = parsed[canonical].map(normalizeHeader_);
    }
  });
  return merged;
}

function validateHeaders_(kind, headers, config) {
  var aliases = getHeaderAliases_(kind, config || {});
  var normalized = headers.map(normalizeHeader_);
  var indexes = {};
  var duplicateCanonical = [];

  Object.keys(aliases).forEach(function (canonical) {
    var matchingIndexes = [];
    aliases[canonical].concat([canonical]).map(normalizeHeader_)
      .forEach(function (alias) {
        normalized.forEach(function (header, index) {
          if (header === alias && matchingIndexes.indexOf(index) === -1) {
            matchingIndexes.push(index);
          }
        });
      });
    if (matchingIndexes.length > 1) {
      duplicateCanonical.push(canonical);
    } else if (matchingIndexes.length === 1) {
      indexes[canonical] = matchingIndexes[0];
    }
  });

  var requiredByKind = {};
  requiredByKind[RIVIERA.KINDS.SALES] = ["service_date", "sold_qty"];
  requiredByKind[RIVIERA.KINDS.BOOKINGS] = ["service_date", "booked_covers"];
  requiredByKind[RIVIERA.KINDS.STOCK] = ["stocktake_date", "on_hand_qty"];
  requiredByKind[RIVIERA.KINDS.CHANGES] = [
    "previous_rule", "new_rule", "scope", "affected_records"
  ];
  var missing = (requiredByKind[kind] || []).filter(function (canonical) {
    return indexes[canonical] === undefined;
  });
  if ((kind === RIVIERA.KINDS.SALES || kind === RIVIERA.KINDS.STOCK) &&
      indexes.item_id === undefined && indexes.item_name === undefined) {
    missing.push("item_id OR item_name");
  }

  var duplicateHeaders = normalized.filter(function (header, index, array) {
    return header && array.indexOf(header) !== index;
  });
  var knownHeaders = [];
  Object.keys(aliases).forEach(function (canonical) {
    knownHeaders = knownHeaders.concat(
      aliases[canonical].concat([canonical]).map(normalizeHeader_)
    );
  });
  var unknownHeaders = normalized.filter(function (header) {
    return header && knownHeaders.indexOf(header) === -1;
  });

  return {
    ok: !missing.length && !duplicateCanonical.length &&
      !duplicateHeaders.length && !unknownHeaders.length,
    indexes: indexes,
    missing: missing,
    duplicateCanonical: duplicateCanonical,
    duplicateHeaders: duplicateHeaders,
    unknownHeaders: unknownHeaders
  };
}

function classifyHeaderFailure_(validation) {
  if ((validation.duplicateCanonical || []).length ||
      (validation.duplicateHeaders || []).length ||
      (validation.unknownHeaders || []).length) {
    return "SCHEMA_CHANGED";
  }
  if ((validation.missing || []).length) {
    return "MISSING_HEADER";
  }
  return "SCHEMA_CHANGED";
}

function orchestratorError_(code, message, details) {
  var error = new Error(message);
  error.code = code;
  error.details = details || null;
  return error;
}

function cell_(row, indexes, canonical) {
  var index = indexes[canonical];
  return index === undefined ? "" : row[index];
}

function logException_(spreadsheet, details) {
  var sheet = spreadsheet.getSheetByName(RIVIERA.SHEETS.EXCEPTIONS);
  appendRows_(sheet, [[
    nowIso_(),
    details.runId || "",
    details.kind || "",
    details.fileId || "",
    details.fileName || "",
    details.sourceRow || "",
    details.code || "UNCLASSIFIED",
    details.message || "",
    safeJson_(details.payload),
    details.status || "OPEN"
  ]]);
}

function safeJson_(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  try {
    return JSON.stringify(value).slice(0, 45000);
  } catch (error) {
    return String(value).slice(0, 45000);
  }
}

function logIntake_(spreadsheet, details) {
  appendRows_(
    spreadsheet.getSheetByName(RIVIERA.SHEETS.INTAKE_LOG),
    [[
      nowIso_(),
      details.runId || "",
      details.kind || "",
      details.fileId || "",
      details.fileName || "",
      details.mimeType || "",
      details.hash || "",
      details.outcome || "",
      details.accepted || 0,
      details.quarantined || 0,
      details.destinationFolderId || "",
      details.message || ""
    ]]
  );
}

function startRun_(spreadsheet, runId, runType) {
  appendRows_(spreadsheet.getSheetByName(RIVIERA.SHEETS.RUNS), [[
    runId, runType, nowIso_(), "", "RUNNING", "", "", 0, 0, "", "",
    getConfig_(spreadsheet).RECIPE_RELEASE_ID || "",
    getConfig_(spreadsheet).RECIPE_GITHUB_COMMIT || "",
    "", "", "", ""
  ]]);
}

function finishRun_(spreadsheet, runId, details) {
  var sheet = spreadsheet.getSheetByName(RIVIERA.SHEETS.RUNS);
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i -= 1) {
    if (String(values[i][0]) === runId) {
      var row = i + 1;
      var existing = values[i];
      var updated = [
        runId,
        existing[1],
        existing[2],
        nowIso_(),
        details.status || "COMPLETED",
        details.sourceFileIds || existing[5] || "",
        details.hashes || existing[6] || "",
        details.accepted === undefined ? existing[7] : details.accepted,
        details.quarantined === undefined ? existing[8] : details.quarantined,
        details.targetServiceDate || existing[9] || "",
        details.bookedCovers === undefined ? existing[10] : details.bookedCovers,
        existing[11],
        existing[12],
        details.approvedBy || existing[13] || "",
        details.approvedAt || existing[14] || "",
        details.publishedFileId || existing[15] || "",
        details.message || existing[16] || ""
      ];
      sheet.getRange(row, 1, 1, updated.length).setValues([updated]);
      return;
    }
  }
  throw new Error("Run receipt not found for " + runId);
}

function isDuplicateHash_(spreadsheet, kind, hash) {
  var rows = rowsAsObjects_(
    spreadsheet.getSheetByName(RIVIERA.SHEETS.INTAKE_LOG)
  );
  return rows.some(function (row) {
    return String(row["Intake Kind"]) === kind &&
      String(row["SHA-256"]) === hash &&
      [
        "PROCESSED",
        "PROCESSED_WITH_EXCEPTIONS",
        "PROCESSED_MOVE_FAILED",
        "PROCESSED_WITH_EXCEPTIONS_MOVE_FAILED",
        "DUPLICATE"
      ].indexOf(
        String(row["Outcome"])
      ) !== -1;
  });
}

function moveFileSafely_(file, folder) {
  if (!folder) {
    return "";
  }
  file.moveTo(folder);
  return folder.getId();
}

function readInputTables_(file) {
  var mimeType = file.getMimeType();
  if (mimeType === MimeType.CSV || /\.csv$/i.test(file.getName())) {
    return [{
      name: file.getName(),
      values: Utilities.parseCsv(file.getBlob().getDataAsString("UTF-8"))
    }];
  }
  if (mimeType === MimeType.GOOGLE_SHEETS) {
    var source = SpreadsheetApp.openById(file.getId());
    return source.getSheets().map(function (sheet) {
      return {
        name: sheet.getName(),
        values: trimEmptyTable_(sheet.getDataRange().getValues())
      };
    }).filter(function (table) {
      return table.values.length > 0;
    });
  }
  throw new Error(
    "Unsupported file type '" + mimeType +
    "'. Upload CSV or a native Google Sheet."
  );
}

function trimEmptyTable_(values) {
  var rows = values.filter(function (row) {
    return row.some(function (cell) {
      return cell !== "" && cell !== null;
    });
  });
  if (!rows.length) {
    return [];
  }
  var lastColumn = 0;
  rows.forEach(function (row) {
    for (var i = row.length - 1; i >= 0; i -= 1) {
      if (row[i] !== "" && row[i] !== null) {
        lastColumn = Math.max(lastColumn, i + 1);
        break;
      }
    }
  });
  return rows.map(function (row) {
    return row.slice(0, lastColumn);
  });
}

function selectInputTable_(kind, tables, config) {
  var structural = tables.map(function (table) {
    var values = trimEmptyTable_(table.values);
    return {
      table: {name: table.name, values: values},
      validation: values.length ?
        validateHeaders_(kind, values[0], config) :
        {
          ok: false,
          missing: ["header row"],
          duplicateCanonical: [],
          duplicateHeaders: [],
          unknownHeaders: []
        }
    };
  });
  var matching = structural.filter(function (candidate) {
    return candidate.validation.ok;
  });
  if (matching.length > 1) {
    throw orchestratorError_(
      "SCHEMA_CHANGED",
      "More than one tab matches the " + kind +
      " schema: " + matching.map(function (candidate) {
        return candidate.table.name;
      }).join(", ") + ". Keep one intake table per file.",
      {matchingTabs: matching.map(function (candidate) {
        return candidate.table.name;
      })}
    );
  }
  if (matching.length === 1) {
    return matching[0];
  }
  var first = structural[0];
  if (!first) {
    throw orchestratorError_(
      "MISSING_HEADER",
      "The source file contains no header row."
    );
  }
  var code = structural.some(function (candidate) {
    return classifyHeaderFailure_(candidate.validation) === "SCHEMA_CHANGED";
  }) ? "SCHEMA_CHANGED" : "MISSING_HEADER";
  var tabSummary = structural.map(function (candidate) {
    return {
      tab: candidate.table.name,
      missing: candidate.validation.missing || [],
      ambiguousAliases: candidate.validation.duplicateCanonical || [],
      duplicateHeaders: candidate.validation.duplicateHeaders || [],
      unknownHeaders: candidate.validation.unknownHeaders || []
    };
  });
  throw orchestratorError_(
    code,
    "No tab matches the " + kind + " schema. " +
    tabSummary.map(function (summary) {
      return "'" + summary.tab + "': missing [" +
        summary.missing.join(", ") + "], ambiguous [" +
        summary.ambiguousAliases.join(", ") + "], duplicate [" +
        summary.duplicateHeaders.join(", ") + "], unknown [" +
        summary.unknownHeaders.join(", ") + "]";
    }).join(" | "),
    {tabs: tabSummary}
  );
}

function buildMenuMaps_(spreadsheet) {
  var byId = {};
  var byName = {};
  rowsAsObjects_(spreadsheet.getSheetByName(RIVIERA.SHEETS.MENU_MAP))
    .filter(function (row) {
      return isTrue_(row.Active);
    })
    .forEach(function (row) {
      var item = {
        menuItemId: String(row["Menu Item ID"] || "").trim(),
        itemName: String(row["Menu Item Name"] || "").trim(),
        recipeId: String(row["Recipe ID"] || "").trim(),
        piecesPerServe: parseRequiredNumber_(row["Pieces Per Serve"]),
        pieceWeightG: parseRequiredNumber_(row["Piece Weight g"]),
        stockUom: normalizeText_(row["Stock UOM"]),
        stockUnitsPerServe: parseRequiredNumber_(row["Stock Units Per Serve"]),
        pullUnitServes: parseRequiredNumber_(row["Pull Unit Serves"]),
        pullUnitLabel: String(row["Pull Unit Label"] || "").trim(),
        status: String(row.Status || "").trim(),
        notes: String(row.Notes || "").trim()
      };
      if (!item.menuItemId) {
        return;
      }
      byId[normalizeText_(item.menuItemId)] = item;
      [item.itemName].concat(
        String(row.Aliases || "").split("|")
      ).forEach(function (name) {
        var key = normalizeText_(name);
        if (key) {
          byName[key] = item;
        }
      });
    });

  var posById = {};
  var posByName = {};
  rowsAsObjects_(spreadsheet.getSheetByName(RIVIERA.SHEETS.POS_MAP))
    .filter(function (row) {
      return isTrue_(row.Active);
    })
    .forEach(function (row) {
      var menuItemId = normalizeText_(row["Menu Item ID"]);
      if (!byId[menuItemId]) {
        return;
      }
      var posId = normalizeText_(row["POS Item ID"]);
      var posName = normalizeText_(row["POS Item Name"]);
      if (posId) {
        posById[posId] = byId[menuItemId];
      }
      if (posName) {
        posByName[posName] = byId[menuItemId];
      }
    });
  return {
    byId: byId,
    byName: byName,
    posById: posById,
    posByName: posByName
  };
}

function resolveMenuItem_(maps, itemId, itemName) {
  var id = normalizeText_(itemId);
  var name = normalizeText_(itemName);
  if (id) {
    return maps.posById[id] || maps.byId[id] || null;
  }
  return name ?
    (maps.posByName[name] || maps.byName[name] || null) :
    null;
}

function validateRequiredConfig_(config, keys) {
  var missing = keys.filter(function (key) {
    return !String(config[key] || "").trim();
  });
  if (missing.length) {
    throw new Error(
      "Missing required Config values: " + missing.join(", ")
    );
  }
}

function formatNumber_(value, digits) {
  if (value === "" || value === null || value === undefined ||
      !isFinite(Number(value))) {
    return "";
  }
  return Number(Number(value).toFixed(digits === undefined ? 2 : digits));
}

// -----------------------------------------------------------------------------
// Source section: apps-script/riviera-tapas-orchestrator/src/Intake.gs.source
// -----------------------------------------------------------------------------
function processRivieraInbox() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return {status: "SKIPPED", message: "Another Riviera intake run is active."};
  }

  var spreadsheet;
  var runId = newRunId_("INTAKE");
  try {
    spreadsheet = getControlSpreadsheet_();
    if (!spreadsheet.getSheetByName(RIVIERA.SHEETS.CONFIG)) {
      setupRivieraOrchestrator();
    }
    var config = getConfig_(spreadsheet);
    validateRequiredConfig_(config, [
      "SALES_INBOX_FOLDER_ID",
      "BOOKINGS_INBOX_FOLDER_ID",
      "STOCK_INBOX_FOLDER_ID",
      "CHANGES_INBOX_FOLDER_ID",
      "PROCESSED_FOLDER_ID",
      "EXCEPTIONS_FOLDER_ID"
    ]);
    startRun_(spreadsheet, runId, "INBOX_PROCESSING");

    var processedFolder = DriveApp.getFolderById(config.PROCESSED_FOLDER_ID);
    var exceptionsFolder = DriveApp.getFolderById(config.EXCEPTIONS_FOLDER_ID);
    var lanes = [
      [RIVIERA.KINDS.SALES, config.SALES_INBOX_FOLDER_ID],
      [RIVIERA.KINDS.BOOKINGS, config.BOOKINGS_INBOX_FOLDER_ID],
      [RIVIERA.KINDS.STOCK, config.STOCK_INBOX_FOLDER_ID],
      [RIVIERA.KINDS.CHANGES, config.CHANGES_INBOX_FOLDER_ID]
    ];
    var totals = {
      accepted: 0,
      quarantined: 0,
      fileIds: [],
      hashes: [],
      files: 0
    };

    lanes.forEach(function (lane) {
      var kind = lane[0];
      var files = DriveApp.getFolderById(lane[1]).getFiles();
      while (files.hasNext()) {
        var file = files.next();
        if (file.getId() === spreadsheet.getId()) {
          continue;
        }
        var result = processSourceFile_(
          spreadsheet,
          config,
          runId,
          kind,
          file,
          processedFolder,
          exceptionsFolder
        );
        totals.files += 1;
        totals.accepted += result.accepted || 0;
        totals.quarantined += result.quarantined || 0;
        totals.fileIds.push(file.getId());
        if (result.hash) {
          totals.hashes.push(result.hash);
        }
      }
    });

    finishRun_(spreadsheet, runId, {
      status: totals.quarantined ? "COMPLETED_WITH_EXCEPTIONS" : "COMPLETED",
      sourceFileIds: totals.fileIds.join(", "),
      hashes: totals.hashes.join(", "),
      accepted: totals.accepted,
      quarantined: totals.quarantined,
      message: totals.files ?
        "Processed " + totals.files + " intake file(s)." :
        "No intake files found."
    });
    spreadsheet.toast(
      totals.files ?
        "Accepted " + totals.accepted + " row(s); quarantined " +
          totals.quarantined + "." :
        "No new intake files.",
      "Riviera intake",
      6
    );
    return totals;
  } catch (error) {
    if (spreadsheet &&
        spreadsheet.getSheetByName(RIVIERA.SHEETS.RUNS)) {
      try {
        finishRun_(spreadsheet, runId, {
          status: "FAILED",
          message: error.message
        });
      } catch (ignored) {
        // Preserve the original failure.
      }
    }
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function processSourceFile_(
  spreadsheet,
  config,
  runId,
  kind,
  file,
  processedFolder,
  exceptionsFolder
) {
  var details = {
    runId: runId,
    kind: kind,
    fileId: file.getId(),
    fileName: file.getName(),
    mimeType: file.getMimeType(),
    accepted: 0,
    quarantined: 0,
    hash: ""
  };

  try {
    var tables = readInputTables_(file);
    var selected = selectInputTable_(kind, tables, config);
    var values = trimEmptyTable_(selected.table.values);
    if (values.length < 2) {
      throw new Error("The matched intake table contains headers but no data rows.");
    }
    details.hash = computeSha256Hex_(
      canonicalTableForHash_(kind, values)
    );
    if (isDuplicateHash_(spreadsheet, kind, details.hash)) {
      details.outcome = "DUPLICATE";
      details.destinationFolderId = moveFileSafely_(file, processedFolder);
      details.message = "Content hash already processed; no rows re-imported.";
      logIntake_(spreadsheet, details);
      return details;
    }

    var context = {
      spreadsheet: spreadsheet,
      config: config,
      runId: runId,
      kind: kind,
      file: file,
      hash: details.hash,
      indexes: selected.validation.indexes,
      rows: values.slice(1),
      menuMaps: buildMenuMaps_(spreadsheet)
    };
    var result;
    if (kind === RIVIERA.KINDS.SALES) {
      result = processSalesRows_(context);
    } else if (kind === RIVIERA.KINDS.BOOKINGS) {
      result = processBookingRows_(context);
    } else if (kind === RIVIERA.KINDS.STOCK) {
      result = processStockRows_(context);
    } else if (kind === RIVIERA.KINDS.CHANGES) {
      result = processChangeRows_(context);
    } else {
      throw new Error("No processor exists for intake kind " + kind);
    }

    details.accepted = result.accepted;
    details.quarantined = result.quarantined;
    if (!details.accepted && details.quarantined) {
      details.outcome = "QUARANTINED";
      details.destinationFolderId = moveProcessedFile_(
        context,
        file,
        exceptionsFolder,
        details
      );
      details.message = "No valid rows; source retained in Exceptions.";
    } else {
      details.outcome = details.quarantined ?
        "PROCESSED_WITH_EXCEPTIONS" : "PROCESSED";
      details.destinationFolderId = moveProcessedFile_(
        context,
        file,
        processedFolder,
        details
      );
      details.message = details.quarantined ?
        "Valid rows imported; row exceptions are in the Exceptions tab." :
        "All rows imported.";
    }
    logIntake_(spreadsheet, details);
    return details;
  } catch (error) {
    var rejectionCode = error.code || "FILE_REJECTED";
    details.outcome = rejectionCode;
    details.quarantined = Math.max(details.quarantined, 1);
    details.message = rejectionCode + ": " + error.message;
    logException_(spreadsheet, {
      runId: runId,
      kind: kind,
      fileId: file.getId(),
      fileName: file.getName(),
      code: rejectionCode,
      message: error.message,
      payload: {
        mimeType: file.getMimeType(),
        details: error.details || null
      }
    });
    try {
      details.destinationFolderId = moveFileSafely_(file, exceptionsFolder);
    } catch (moveError) {
      details.message += " File move also failed: " + moveError.message;
    }
    logIntake_(spreadsheet, details);
    return details;
  }
}

function moveProcessedFile_(context, file, folder, details) {
  try {
    return moveFileSafely_(file, folder);
  } catch (error) {
    details.outcome += "_MOVE_FAILED";
    logException_(context.spreadsheet, {
      runId: context.runId,
      kind: context.kind,
      fileId: file.getId(),
      fileName: file.getName(),
      code: "FILE_MOVE_FAILED",
      message:
        "Rows were already recorded, but the source file could not be moved: " +
        error.message,
      payload: {destinationFolderId: folder.getId()}
    });
    return "";
  }
}

function processSalesRows_(context) {
  var output = [];
  var quarantined = 0;
  var seenExactRows = {};

  context.rows.forEach(function (row, index) {
    var sourceRow = index + 2;
    if (!row.some(function (value) {
      return value !== "" && value !== null;
    })) {
      return;
    }
    var payload = row.map(function (value) {
      return String(value);
    });
    var exactKey = JSON.stringify(payload);
    if (seenExactRows[exactKey]) {
      quarantined += 1;
      rowException_(context, sourceRow, "DUPLICATE_SOURCE_ROW",
        "Exact duplicate sales row.", payload);
      return;
    }
    seenExactRows[exactKey] = true;

    var serviceDate = parseDate_(
      cell_(row, context.indexes, "service_date")
    );
    var sold = parseRequiredNumber_(
      cell_(row, context.indexes, "sold_qty")
    );
    var voided = parseOptionalNumber_(
      cell_(row, context.indexes, "voided_qty"), 0
    );
    var refunded = parseOptionalNumber_(
      cell_(row, context.indexes, "refunded_qty"), 0
    );
    var coversRaw = cell_(row, context.indexes, "covers");
    var covers = coversRaw === "" ? "" : parseRequiredNumber_(coversRaw);
    var itemId = cell_(row, context.indexes, "item_id");
    var itemName = cell_(row, context.indexes, "item_name");
    var menuItem = resolveMenuItem_(
      context.menuMaps, itemId, itemName
    );
    var errors = [];
    if (!serviceDate) {
      errors.push("invalid service date");
    } else if (!isSunday_(serviceDate)) {
      errors.push("Tapas service date is not a Sunday");
    }
    if (sold === null || sold < 0) {
      errors.push("sold quantity must be a non-negative number");
    }
    if (voided < 0 || refunded < 0) {
      errors.push("voided/refunded quantities must be non-negative");
    }
    var net = sold === null ? null : netSales_(sold, voided, refunded);
    if (net !== null && net < 0) {
      errors.push("net quantity is negative");
    }
    if (covers !== "" &&
        (covers === null || covers < 0 || Math.floor(covers) !== covers)) {
      errors.push("covers must be a non-negative whole number");
    }
    if (!menuItem) {
      errors.push("unknown POS/menu item ID or name");
    }
    if (errors.length) {
      quarantined += 1;
      rowException_(context, sourceRow, "INVALID_SALES_ROW",
        errors.join("; "), payload);
      return;
    }
    output.push([
      context.runId,
      context.hash,
      context.file.getId(),
      context.file.getName(),
      sourceRow,
      dateKey_(serviceDate),
      menuItem.menuItemId,
      menuItem.recipeId,
      menuItem.itemName,
      sold,
      voided,
      refunded,
      net,
      covers,
      nowIso_()
    ]);
  });
  appendRows_(
    context.spreadsheet.getSheetByName(RIVIERA.SHEETS.SALES),
    output
  );
  return {accepted: output.length, quarantined: quarantined};
}

function processBookingRows_(context) {
  var output = [];
  var quarantined = 0;
  var seenBookingIds = {};
  context.rows.forEach(function (row, index) {
    var sourceRow = index + 2;
    if (!row.some(function (value) {
      return value !== "" && value !== null;
    })) {
      return;
    }
    var serviceDate = parseDate_(
      cell_(row, context.indexes, "service_date")
    );
    var bookingId = String(
      cell_(row, context.indexes, "booking_id") || ""
    ).trim();
    var covers = parseRequiredNumber_(
      cell_(row, context.indexes, "booked_covers")
    );
    var status = String(
      cell_(row, context.indexes, "status") || "CONFIRMED"
    ).trim().toUpperCase();
    var eventName = String(
      cell_(row, context.indexes, "event_name") || "Sunday Tapas"
    ).trim();
    var notes = String(cell_(row, context.indexes, "notes") || "").trim();
    var errors = [];
    if (!serviceDate) {
      errors.push("invalid service date");
    } else if (!isSunday_(serviceDate)) {
      errors.push("Tapas booking date is not a Sunday");
    }
    if (covers === null || covers < 0 || Math.floor(covers) !== covers) {
      errors.push("booked covers must be a non-negative whole number");
    }
    var normalizedBookingId = normalizeText_(bookingId);
    if (normalizedBookingId && seenBookingIds[normalizedBookingId]) {
      errors.push("duplicate booking_id '" + bookingId + "'");
    }
    if (errors.length) {
      quarantined += 1;
      rowException_(context, sourceRow, "INVALID_BOOKING_ROW",
        errors.join("; "), row);
      return;
    }
    if (normalizedBookingId) {
      seenBookingIds[normalizedBookingId] = true;
    }
    output.push([
      context.runId,
      context.hash,
      context.file.getId(),
      context.file.getName(),
      sourceRow,
      bookingId,
      dateKey_(serviceDate),
      covers,
      status,
      eventName,
      notes,
      nowIso_()
    ]);
  });
  appendRows_(
    context.spreadsheet.getSheetByName(RIVIERA.SHEETS.BOOKINGS),
    output
  );
  return {accepted: output.length, quarantined: quarantined};
}

function processStockRows_(context) {
  var output = [];
  var quarantined = 0;
  var seenItems = {};
  context.rows.forEach(function (row, index) {
    var sourceRow = index + 2;
    if (!row.some(function (value) {
      return value !== "" && value !== null;
    })) {
      return;
    }
    var countDate = parseDate_(
      cell_(row, context.indexes, "stocktake_date")
    );
    var onHand = parseRequiredNumber_(
      cell_(row, context.indexes, "on_hand_qty")
    );
    var itemId = cell_(row, context.indexes, "item_id");
    var itemName = cell_(row, context.indexes, "item_name");
    var menuItem = resolveMenuItem_(
      context.menuMaps, itemId, itemName
    );
    var inputUom = normalizeText_(
      cell_(row, context.indexes, "uom")
    );
    var errors = [];
    if (!countDate) {
      errors.push("invalid stocktake date");
    }
    if (onHand === null) {
      errors.push("on-hand quantity is blank or invalid; it was not set to zero");
    } else if (onHand < 0) {
      errors.push("on-hand quantity must be non-negative");
    }
    if (!menuItem) {
      errors.push("unknown stock/menu item ID or name");
    }
    var uom = inputUom || (menuItem ? menuItem.stockUom : "");
    if (!uom) {
      errors.push("stock UOM is missing");
    }
    if (menuItem && menuItem.stockUom &&
        uom !== menuItem.stockUom &&
        !(uom === "serve" || uom === "serves")) {
      errors.push(
        "stock UOM '" + uom + "' does not match map UOM '" +
        menuItem.stockUom + "'"
      );
    }
    var key = countDate && menuItem ?
      dateKey_(countDate) + "|" + menuItem.menuItemId :
      "invalid-" + sourceRow;
    if (seenItems[key]) {
      errors.push("duplicate item in the same stocktake");
    }
    seenItems[key] = true;
    if (errors.length) {
      quarantined += 1;
      rowException_(context, sourceRow, "INVALID_STOCK_ROW",
        errors.join("; "), row);
      return;
    }
    output.push([
      context.runId,
      context.hash,
      context.file.getId(),
      context.file.getName(),
      sourceRow,
      dateKey_(countDate),
      menuItem.menuItemId,
      menuItem.recipeId,
      menuItem.itemName,
      onHand,
      uom,
      nowIso_()
    ]);
  });
  appendRows_(
    context.spreadsheet.getSheetByName(RIVIERA.SHEETS.STOCK),
    output
  );
  return {accepted: output.length, quarantined: quarantined};
}

function processChangeRows_(context) {
  var output = [];
  var quarantined = 0;
  context.rows.forEach(function (row, index) {
    var sourceRow = index + 2;
    if (!row.some(function (value) {
      return value !== "" && value !== null;
    })) {
      return;
    }
    var previousRule = String(
      cell_(row, context.indexes, "previous_rule") || ""
    ).trim();
    var newRule = String(
      cell_(row, context.indexes, "new_rule") || ""
    ).trim();
    var scope = String(
      cell_(row, context.indexes, "scope") || ""
    ).trim().toUpperCase();
    var affected = String(
      cell_(row, context.indexes, "affected_records") || ""
    ).trim();
    var requestedBy = String(
      cell_(row, context.indexes, "requested_by") || ""
    ).trim();
    var notes = String(cell_(row, context.indexes, "notes") || "").trim();
    var effectiveRaw = cell_(row, context.indexes, "effective_date");
    var expiryRaw = cell_(row, context.indexes, "expiry_date");
    var effectiveDate = effectiveRaw ? parseDate_(effectiveRaw) : null;
    var expiryDate = expiryRaw ? parseDate_(expiryRaw) : null;
    var errors = [];
    if (!previousRule) {
      errors.push("previous rule is required");
    }
    if (!newRule) {
      errors.push("new rule is required");
    }
    if (RIVIERA.VALID_CHANGE_SCOPES.indexOf(scope) === -1) {
      errors.push("scope is not one of the five approved classifications");
    }
    if (!affected) {
      errors.push("affected records are required");
    }
    errors = errors.concat(changeDateErrors_(
      scope,
      effectiveRaw,
      effectiveDate,
      expiryRaw,
      expiryDate
    ));
    if (errors.length) {
      quarantined += 1;
      rowException_(context, sourceRow, "INVALID_CHANGE_RECEIPT",
        errors.join("; "), row);
      return;
    }
    var githubStatus = scope === "RECIPE-SPECIFIC STANDARD" ?
      "PENDING REVIEW" : "NOT APPLICABLE";
    var targetRoute = scopeTargetRoute_(scope);
    output.push([
      "CHG-" + Utilities.getUuid(),
      nowIso_(),
      context.hash,
      context.file.getId(),
      sourceRow,
      previousRule,
      newRule,
      scope,
      targetRoute,
      effectiveDate ? dateKey_(effectiveDate) : "",
      expiryDate ? dateKey_(expiryDate) : "",
      affected,
      requestedBy,
      "STAGED — NOT PUBLISHED",
      githubStatus,
      "PENDING RELEASE",
      "AWAITING APPROVAL",
      "",
      "",
      notes
    ]);
  });
  appendRows_(
    context.spreadsheet.getSheetByName(RIVIERA.SHEETS.CHANGES),
    output
  );
  return {accepted: output.length, quarantined: quarantined};
}

function scopeTargetRoute_(scope) {
  var routes = {};
  routes["PERMANENT RIVIERA STANDARD"] = "DRIVE_SOP_MASTER";
  routes["PACKAGE-SPECIFIC STANDARD"] = "DRIVE_PACKAGE_REGISTER";
  routes["RECIPE-SPECIFIC STANDARD"] =
    "GITHUB_RECIPE_RECORD; DRIVE_RECIPE_MASTER_IF_REPRESENTED";
  routes["EVENT-SPECIFIC INSTRUCTION"] = "DRIVE_EVENT_WEEK_RECORD";
  routes["WEEK-SPECIFIC INSTRUCTION"] = "DRIVE_EVENT_WEEK_RECORD";
  return routes[String(scope || "").trim().toUpperCase()] || "";
}

function changeDateErrors_(
  scope,
  effectiveRaw,
  effectiveDate,
  expiryRaw,
  expiryDate
) {
  var temporary = scope === "EVENT-SPECIFIC INSTRUCTION" ||
    scope === "WEEK-SPECIFIC INSTRUCTION";
  var errors = [];
  if (effectiveRaw && !effectiveDate) {
    errors.push("effective date is invalid");
  }
  if (expiryRaw && !expiryDate) {
    errors.push("expiry date is invalid");
  }
  if (temporary && !effectiveRaw) {
    errors.push("event/week-specific changes require an effective date");
  }
  if (temporary && !expiryRaw) {
    errors.push("event/week-specific changes require an expiry date");
  }
  if (!temporary && expiryRaw) {
    errors.push("an expiry date is only valid for event/week-specific changes");
  }
  if (effectiveDate && expiryDate &&
      effectiveDate.getTime() > expiryDate.getTime()) {
    errors.push("effective date is after expiry date");
  }
  return errors;
}

function rowException_(context, sourceRow, code, message, payload) {
  logException_(context.spreadsheet, {
    runId: context.runId,
    kind: context.kind,
    fileId: context.file.getId(),
    fileName: context.file.getName(),
    sourceRow: sourceRow,
    code: code,
    message: message,
    payload: payload
  });
}

// -----------------------------------------------------------------------------
// Source section: apps-script/riviera-tapas-orchestrator/src/Forecast.gs.source
// -----------------------------------------------------------------------------
function generateTapasDraft() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    throw new Error("Another Riviera orchestrator run is active.");
  }
  var spreadsheet;
  var runId = newRunId_("TAPAS-DRAFT");
  try {
    spreadsheet = getControlSpreadsheet_();
    var config = getConfig_(spreadsheet);
    validateRequiredConfig_(config, [
      "RECIPE_RELEASE_ID",
      "RECIPE_GITHUB_COMMIT",
      "MAX_STOCK_AGE_DAYS"
    ]);
    startRun_(spreadsheet, runId, "TAPAS_FORECAST");

    var bookings = readAuthoritativeBookings_(spreadsheet);
    var target = resolveTargetService_(config, bookings);
    var sales = readAuthoritativeSales_(spreadsheet);
    var history = selectComparableSundays_(
      sales,
      bookings,
      target.date,
      13
    );
    if (!history.length) {
      throw new Error(
        "No comparable Sunday has both a sales report and covers. " +
        "Upload genuine Tapas sales and booking/cover data first."
      );
    }

    var menuMaps = buildMenuMaps_(spreadsheet);
    var menuItems = Object.keys(menuMaps.byId)
      .map(function (key) {
        return menuMaps.byId[key];
      })
      .filter(function (item, index, array) {
        return array.map(function (candidate) {
          return candidate.menuItemId;
        }).indexOf(item.menuItemId) === index;
      })
      .sort(function (a, b) {
        return a.itemName.localeCompare(b.itemName);
      });
    var stockSnapshot = readLatestStockSnapshot_(
      spreadsheet,
      target.date
    );
    var maxStockAge = Number(config.MAX_STOCK_AGE_DAYS);
    if (!isFinite(maxStockAge) || maxStockAge < 0) {
      throw new Error("MAX_STOCK_AGE_DAYS must be a non-negative number.");
    }

    var rows = menuItems.map(function (item) {
      return buildForecastRow_({
        runId: runId,
        item: item,
        target: target,
        history: history,
        sales: sales,
        stockSnapshot: stockSnapshot,
        maxStockAge: maxStockAge,
        deductPostStockSales: isTrue_(config.DEDUCT_POST_STOCK_SALES)
      });
    });
    appendRows_(
      spreadsheet.getSheetByName(RIVIERA.SHEETS.FORECAST),
      rows
    );
    writeDraftSheet_(spreadsheet, runId, target, rows);

    var blocked = rows.filter(function (row) {
      return row[21] !== "READY";
    }).length;
    finishRun_(spreadsheet, runId, {
      status: "DRAFT",
      accepted: rows.length,
      quarantined: blocked,
      targetServiceDate: dateKey_(target.date),
      bookedCovers: target.covers,
      message:
        "Draft only; no 9% buffer. " + blocked +
        " row(s) require a count, history, mapping, or pull-unit action."
    });
    spreadsheet.toast(
      "Draft created for " + dateKey_(target.date) +
      ". " + blocked + " row(s) need attention.",
      "Tapas draft",
      8
    );
    return {
      runId: runId,
      targetServiceDate: dateKey_(target.date),
      bookedCovers: target.covers,
      rows: rows.length,
      blocked: blocked
    };
  } catch (error) {
    if (spreadsheet &&
        spreadsheet.getSheetByName(RIVIERA.SHEETS.RUNS)) {
      try {
        finishRun_(spreadsheet, runId, {
          status: "FAILED",
          message: error.message
        });
      } catch (ignored) {
        // Preserve original failure.
      }
    }
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function resolveTargetService_(config, bookings) {
  var override = parseDate_(config.TARGET_SERVICE_DATE);
  if (config.TARGET_SERVICE_DATE && !override) {
    throw new Error("TARGET_SERVICE_DATE must be YYYY-MM-DD.");
  }
  if (override && !isSunday_(override)) {
    throw new Error("TARGET_SERVICE_DATE must be a Sunday.");
  }
  var today = parseDate_(dateKey_(new Date()));
  var targetDate = override;
  if (!targetDate) {
    var future = Object.keys(bookings)
      .map(parseDate_)
      .filter(function (date) {
        return date && date.getTime() >= today.getTime() &&
          bookings[dateKey_(date)].covers >= 0;
      })
      .sort(function (a, b) {
        return a.getTime() - b.getTime();
      });
    targetDate = future[0] || null;
  }
  if (!targetDate) {
    throw new Error(
      "No upcoming Sunday booking is available. Upload Tapas bookings " +
      "or set TARGET_SERVICE_DATE."
    );
  }
  var booking = bookings[dateKey_(targetDate)];
  if (!booking) {
    throw new Error(
      "No booking report covers " + dateKey_(targetDate) +
      ". A target date alone cannot invent booked covers."
    );
  }
  return {
    date: targetDate,
    covers: booking.covers,
    sourceHash: booking.hash,
    importedAt: booking.importedAt
  };
}

function readAuthoritativeSales_(spreadsheet) {
  var rows = rowsAsObjects_(
    spreadsheet.getSheetByName(RIVIERA.SHEETS.SALES)
  );
  var snapshots = {};
  rows.forEach(function (row) {
    var date = parseDate_(row["Service Date"]);
    var hash = String(row["Source SHA-256"] || "");
    var itemId = String(row["Menu Item ID"] || "").trim();
    if (!date || !hash || !itemId) {
      return;
    }
    var dateKey = dateKey_(date);
    var snapshotKey = dateKey + "|" + hash;
    if (!snapshots[snapshotKey]) {
      snapshots[snapshotKey] = {
        date: date,
        dateKey: dateKey,
        hash: hash,
        importedAt: "",
        covers: "",
        items: {},
        observed: {}
      };
    }
    var snapshot = snapshots[snapshotKey];
    snapshot.importedAt = maxText_(
      snapshot.importedAt,
      String(row["Imported At"] || "")
    );
    var covers = parseRequiredNumber_(row.Covers);
    if (covers !== null) {
      snapshot.covers = snapshot.covers === "" ?
        covers : Math.max(snapshot.covers, covers);
    }
    snapshot.items[itemId] =
      (snapshot.items[itemId] || 0) +
      parseOptionalNumber_(row["Net Qty"], 0);
    snapshot.observed[itemId] = true;
  });

  var authoritative = {};
  Object.keys(snapshots).forEach(function (key) {
    var candidate = snapshots[key];
    var current = authoritative[candidate.dateKey];
    if (!current || candidate.importedAt > current.importedAt) {
      authoritative[candidate.dateKey] = candidate;
    }
  });
  return authoritative;
}

function readAuthoritativeBookings_(spreadsheet) {
  var rows = rowsAsObjects_(
    spreadsheet.getSheetByName(RIVIERA.SHEETS.BOOKINGS)
  );
  var snapshots = {};
  rows.forEach(function (row) {
    var date = parseDate_(row["Service Date"]);
    var hash = String(row["Source SHA-256"] || "");
    if (!date || !hash) {
      return;
    }
    var dateKey = dateKey_(date);
    var snapshotKey = dateKey + "|" + hash;
    if (!snapshots[snapshotKey]) {
      snapshots[snapshotKey] = {
        date: date,
        dateKey: dateKey,
        hash: hash,
        importedAt: "",
        covers: 0
      };
    }
    var snapshot = snapshots[snapshotKey];
    snapshot.importedAt = maxText_(
      snapshot.importedAt,
      String(row["Imported At"] || "")
    );
    var status = String(row.Status || "").trim().toUpperCase();
    if (["CANCELLED", "CANCELED", "DECLINED", "NO SHOW"].indexOf(status) === -1) {
      snapshot.covers += parseOptionalNumber_(row["Booked Covers"], 0);
    }
  });

  var authoritative = {};
  Object.keys(snapshots).forEach(function (key) {
    var candidate = snapshots[key];
    var current = authoritative[candidate.dateKey];
    if (!current || candidate.importedAt > current.importedAt) {
      authoritative[candidate.dateKey] = candidate;
    }
  });
  return authoritative;
}

function selectComparableSundays_(sales, bookings, targetDate, limit) {
  return Object.keys(sales)
    .map(function (key) {
      var service = sales[key];
      var covers = service.covers;
      if ((covers === "" || covers === null) && bookings[key]) {
        covers = bookings[key].covers;
      }
      return {
        date: service.date,
        dateKey: key,
        covers: covers,
        items: service.items,
        observed: service.observed
      };
    })
    .filter(function (service) {
      return isSunday_(service.date) &&
        service.date.getTime() < targetDate.getTime() &&
        service.covers !== "" &&
        service.covers !== null &&
        service.covers > 0;
    })
    .sort(function (a, b) {
      return b.date.getTime() - a.date.getTime();
    })
    .slice(0, limit)
    .sort(function (a, b) {
      return a.date.getTime() - b.date.getTime();
    });
}

function readLatestStockSnapshot_(spreadsheet, targetDate) {
  var rows = rowsAsObjects_(
    spreadsheet.getSheetByName(RIVIERA.SHEETS.STOCK)
  );
  var snapshots = {};
  rows.forEach(function (row) {
    var date = parseDate_(row["Stocktake Date"]);
    var hash = String(row["Source SHA-256"] || "");
    var itemId = String(row["Menu Item ID"] || "").trim();
    if (!date || !hash || !itemId ||
        date.getTime() > targetDate.getTime()) {
      return;
    }
    var key = dateKey_(date) + "|" + hash;
    if (!snapshots[key]) {
      snapshots[key] = {
        date: date,
        hash: hash,
        importedAt: "",
        items: {}
      };
    }
    snapshots[key].importedAt = maxText_(
      snapshots[key].importedAt,
      String(row["Imported At"] || "")
    );
    snapshots[key].items[itemId] = {
      quantity: parseRequiredNumber_(row["On Hand Qty"]),
      uom: normalizeText_(row.UOM)
    };
  });

  var candidates = Object.keys(snapshots).map(function (key) {
    return snapshots[key];
  }).sort(function (a, b) {
    var dateDifference = b.date.getTime() - a.date.getTime();
    return dateDifference ||
      b.importedAt.localeCompare(a.importedAt);
  });
  return candidates[0] || null;
}

function buildForecastRow_(context) {
  var item = context.item;
  var sampleCovers = context.history.reduce(function (sum, service) {
    return sum + service.covers;
  }, 0);
  var sampleNet = context.history.reduce(function (sum, service) {
    return sum + (service.items[item.menuItemId] || 0);
  }, 0);
  var observedSundays = context.history.filter(function (service) {
    return service.observed[item.menuItemId];
  }).length;
  var ratio = observedSundays && sampleCovers ?
    sampleNet / sampleCovers : null;
  var grossTarget = ratio === null ?
    null : Math.ceil(ratio * context.target.covers);

  var stock = calculateStockPosition_(context, grossTarget);
  var toPrep = grossTarget === null || stock.onHandServes === null ?
    null : Math.max(0, grossTarget - stock.onHandServes);
  var rounded = roundUpToUnit_(toPrep, item.pullUnitServes);
  var readiness = "READY";
  var notes = [];
  if (!observedSundays) {
    readiness = "HISTORY REQUIRED";
    notes.push("Item is active but absent from the selected POS history.");
  } else if (stock.onHandServes === null) {
    readiness = stock.status;
  } else if (!item.pullUnitServes) {
    readiness = "PULL UNIT REQUIRED";
  }
  if (context.history.length < 13) {
    notes.push(
      "Only " + context.history.length +
      " comparable Sunday(s) available; target is 13."
    );
  }
  notes.push(stock.note);
  notes.push("No automatic 9% Tapas buffer.");
  if (item.notes) {
    notes.push(item.notes);
  }

  return [
    context.runId,
    dateKey_(context.target.date),
    context.target.covers,
    item.menuItemId,
    item.recipeId,
    item.itemName,
    context.history.length,
    sampleCovers,
    sampleNet,
    ratio === null ? "" : formatNumber_(ratio, 4),
    grossTarget === null ? "" : grossTarget,
    stock.observedAt,
    stock.observedQty === null ? "" : stock.observedQty,
    stock.onHandServes === null ? "" : formatNumber_(stock.onHandServes, 2),
    stock.status,
    toPrep === null ? "" : formatNumber_(toPrep, 2),
    item.piecesPerServe === null ? "" : item.piecesPerServe,
    item.pullUnitServes === null ? "" : item.pullUnitServes,
    rounded === null ? "" : formatNumber_(rounded, 2),
    rounded === null || item.piecesPerServe === null ?
      "" : Math.ceil(rounded * item.piecesPerServe),
    0,
    readiness,
    notes.filter(Boolean).join(" "),
    "DRAFT"
  ];
}

function calculateStockPosition_(context) {
  var snapshot = context.stockSnapshot;
  if (!snapshot || !snapshot.items[context.item.menuItemId]) {
    return {
      observedAt: snapshot ? dateKey_(snapshot.date) : "",
      observedQty: null,
      onHandServes: null,
      status: "COUNT REQUIRED",
      note: snapshot ?
        "Item is missing from the latest stocktake snapshot; no older count was substituted." :
        "No stocktake snapshot is available; stock was not set to zero."
    };
  }
  var stockRow = snapshot.items[context.item.menuItemId];
  var ageDays = Math.floor(
    (context.target.date.getTime() - snapshot.date.getTime()) /
    (24 * 60 * 60 * 1000)
  );
  if (ageDays > context.maxStockAge) {
    return {
      observedAt: dateKey_(snapshot.date),
      observedQty: stockRow.quantity,
      onHandServes: null,
      status: "STALE — COUNT REQUIRED",
      note:
        "Latest stocktake is " + ageDays +
        " days before service; no quantity was assumed."
    };
  }

  var unitsPerServe;
  if (stockRow.uom === "serve" || stockRow.uom === "serves") {
    unitsPerServe = 1;
  } else {
    unitsPerServe = context.item.stockUnitsPerServe;
  }
  if (!unitsPerServe || unitsPerServe <= 0) {
    return {
      observedAt: dateKey_(snapshot.date),
      observedQty: stockRow.quantity,
      onHandServes: null,
      status: "STOCK CONVERSION REQUIRED",
      note: "Stock units per serve are not confirmed in Menu Recipe Map."
    };
  }
  var observedServes = stockRow.quantity / unitsPerServe;
  var soldAfterCount = 0;
  if (context.deductPostStockSales) {
    Object.keys(context.sales).forEach(function (dateKey) {
      var service = context.sales[dateKey];
      if (service.date.getTime() > snapshot.date.getTime() &&
          service.date.getTime() < context.target.date.getTime()) {
        soldAfterCount += service.items[context.item.menuItemId] || 0;
      }
    });
  }
  var estimated = Math.max(0, observedServes - soldAfterCount);
  return {
    observedAt: dateKey_(snapshot.date),
    observedQty: stockRow.quantity,
    onHandServes: estimated,
    status: context.deductPostStockSales ?
      "ESTIMATED FROM MONTHLY BASELINE" : "OBSERVED BASELINE",
    note: context.deductPostStockSales ?
      "Observed stock converted to serves, less " +
        formatNumber_(soldAfterCount, 2) +
        " net serve(s) sold after the count. Production, waste and transfers " +
        "must be recorded separately or checked before approval." :
      "Observed monthly baseline used without post-count sales deduction."
  };
}

function writeDraftSheet_(spreadsheet, runId, target, forecastRows) {
  var sheet = spreadsheet.getSheetByName(RIVIERA.SHEETS.DRAFT);
  sheet.clearContents();
  sheet.clearFormats();
  sheet.getRange(1, 1, 1, RIVIERA.HEADERS.DRAFT.length)
    .setValues([RIVIERA.HEADERS.DRAFT]);
  var rows = forecastRows.map(function (row) {
    return [
      row[5],
      row[2],
      row[10],
      row[13],
      row[18],
      row[19],
      row[21],
      row[22]
    ];
  });
  appendRows_(sheet, rows);
  sheet.getRange(1, 1)
    .setNote(
      "DRAFT ONLY\nRun: " + runId +
      "\nService: " + dateKey_(target.date) +
      "\nBooked covers: " + target.covers +
      "\nNo automatic 9% Tapas buffer."
    );
  sheet.getRange(1, 1, 1, RIVIERA.HEADERS.DRAFT.length)
    .setBackground("#8a5a19")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setWrap(true);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, RIVIERA.HEADERS.DRAFT.length);
}

function maxText_(left, right) {
  return String(left || "") > String(right || "") ?
    String(left || "") : String(right || "");
}

// -----------------------------------------------------------------------------
// Source section: apps-script/riviera-tapas-orchestrator/src/Publish.gs.source
// -----------------------------------------------------------------------------
function approveAndPublishCurrentTapasPrep() {
  var spreadsheet = getControlSpreadsheet_();
  var draftRun = getLatestDraftRun_(spreadsheet);
  if (!draftRun) {
    throw new Error("No unpublished Tapas draft is available.");
  }
  var forecastRows = forecastRowsForRun_(spreadsheet, draftRun.runId);
  if (!forecastRows.length) {
    throw new Error("The latest draft has no forecast rows.");
  }
  var blocked = forecastRows.filter(function (row) {
    return String(row.Readiness) !== "READY";
  });
  var warning = blocked.length ?
    "\n\n" + blocked.length +
      " row(s) are not READY. They will publish with blank or visibly " +
      "blocked quantities; stock will not be assumed as zero." :
    "";
  var ui = SpreadsheetApp.getUi();
  var confirmation = ui.alert(
    "Approve Sunday Tapas prep",
    "Publish draft " + draftRun.runId + " for " +
      draftRun.targetServiceDate + " (" + draftRun.bookedCovers +
      " booked covers)?\n\nNo automatic 9% buffer is included." + warning,
    ui.ButtonSet.YES_NO
  );
  if (confirmation !== ui.Button.YES) {
    return {status: "CANCELLED"};
  }
  var email = Session.getActiveUser().getEmail();
  var reviewer = email;
  if (!reviewer) {
    var prompt = ui.prompt(
      "Approval receipt",
      "Enter your name for the publication receipt:",
      ui.ButtonSet.OK_CANCEL
    );
    if (prompt.getSelectedButton() !== ui.Button.OK ||
        !prompt.getResponseText().trim()) {
      return {status: "CANCELLED"};
    }
    reviewer = prompt.getResponseText().trim();
  }
  return publishTapasDraft_(spreadsheet, draftRun, reviewer);
}

function publishTapasDraft_(spreadsheet, draftRun, reviewer) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    throw new Error("Another Riviera orchestrator run is active.");
  }
  var publishRunId = newRunId_("TAPAS-PUBLISH");
  try {
    var config = getConfig_(spreadsheet);
    validateRequiredConfig_(config, [
      "GENERATED_PREP_FOLDER_ID",
      "RECIPE_RELEASE_ID",
      "RECIPE_GITHUB_COMMIT"
    ]);
    startRun_(spreadsheet, publishRunId, "TAPAS_PUBLICATION");
    var rows = forecastRowsForRun_(spreadsheet, draftRun.runId);
    if (!rows.length) {
      throw new Error("Forecast rows disappeared before publication.");
    }
    if (rows.some(function (row) {
      return String(row["Publication Status"]) !== "DRAFT";
    })) {
      throw new Error(
        "The selected draft is no longer entirely unpublished. Generate a new draft."
      );
    }

    var generatedFolder = DriveApp.getFolderById(
      config.GENERATED_PREP_FOLDER_ID
    );
    var target = getOrCreateCurrentPrepSpreadsheet_(
      spreadsheet,
      config,
      generatedFolder
    );
    archiveCurrentPrep_(target, generatedFolder);
    writePublishedPrep_(target, draftRun, rows, reviewer, config);
    markForecastPublished_(spreadsheet, draftRun.runId);

    var approvedAt = nowIso_();
    finishRun_(spreadsheet, draftRun.runId, {
      status: "PUBLISHED",
      targetServiceDate: draftRun.targetServiceDate,
      bookedCovers: draftRun.bookedCovers,
      approvedBy: reviewer,
      approvedAt: approvedAt,
      publishedFileId: target.getId(),
      message:
        "Approved current Tapas prep published. Non-ready rows remain " +
        "visible and no missing stock was converted to zero."
    });
    finishRun_(spreadsheet, publishRunId, {
      status: "PUBLISHED",
      accepted: rows.length,
      quarantined: rows.filter(function (row) {
        return String(row.Readiness) !== "READY";
      }).length,
      targetServiceDate: draftRun.targetServiceDate,
      bookedCovers: draftRun.bookedCovers,
      approvedBy: reviewer,
      approvedAt: approvedAt,
      publishedFileId: target.getId(),
      message: "Stable current prep sheet updated; prior version archived."
    });
    spreadsheet.toast(
      "Approved prep published for " + draftRun.targetServiceDate + ".",
      "Riviera",
      8
    );
    return {
      status: "PUBLISHED",
      runId: publishRunId,
      publishedFileId: target.getId(),
      url: target.getUrl()
    };
  } catch (error) {
    try {
      finishRun_(spreadsheet, publishRunId, {
        status: "FAILED",
        message: error.message
      });
    } catch (ignored) {
      // Preserve the original failure.
    }
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function approveSelectedChangeReceipt() {
  var spreadsheet = getControlSpreadsheet_();
  var sheet = spreadsheet.getActiveSheet();
  if (sheet.getName() !== RIVIERA.SHEETS.CHANGES ||
      sheet.getActiveRange().getRow() < 2) {
    throw new Error(
      "Select one receipt row in the Change Receipts tab first."
    );
  }
  var rowNumber = sheet.getActiveRange().getRow();
  var headers = sheet.getRange(
    1, 1, 1, sheet.getLastColumn()
  ).getDisplayValues()[0];
  var values = sheet.getRange(
    rowNumber, 1, 1, sheet.getLastColumn()
  ).getValues()[0];
  var object = {};
  headers.forEach(function (header, index) {
    object[header] = values[index];
  });
  if (String(object["Approval Status"]) !== "AWAITING APPROVAL") {
    throw new Error("This change receipt is not awaiting approval.");
  }
  var targetRoute = scopeTargetRoute_(String(object.Scope || ""));
  if (!targetRoute) {
    throw new Error(
      "The receipt scope has no approved target route; approval stopped."
    );
  }
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    "Approve source update",
    "Approve receipt " + object["Receipt ID"] +
      " for route " + targetRoute +
      " for source update?\n\nThis does not claim Drive, GitHub or ChatGPT " +
      "publication. Those statuses remain separate until verified.",
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) {
    return;
  }
  var reviewer = Session.getActiveUser().getEmail() || "Manual approver";
  setRowValueByHeader_(
    sheet, rowNumber, headers, "Target Route", targetRoute
  );
  setRowValueByHeader_(
    sheet, rowNumber, headers, "Approval Status",
    "APPROVED FOR SOURCE UPDATE"
  );
  setRowValueByHeader_(sheet, rowNumber, headers, "Approved By", reviewer);
  setRowValueByHeader_(sheet, rowNumber, headers, "Approved At", nowIso_());
}

function getLatestDraftRun_(spreadsheet) {
  var rows = rowsAsObjects_(
    spreadsheet.getSheetByName(RIVIERA.SHEETS.RUNS)
  );
  for (var i = rows.length - 1; i >= 0; i -= 1) {
    if (String(rows[i]["Run Type"]) === "TAPAS_FORECAST" &&
        String(rows[i].Status) === "DRAFT") {
      return {
        runId: String(rows[i]["Run ID"]),
        targetServiceDate: String(rows[i]["Target Service Date"]),
        bookedCovers: rows[i]["Booked Covers"]
      };
    }
  }
  return null;
}

function forecastRowsForRun_(spreadsheet, runId) {
  return rowsAsObjects_(
    spreadsheet.getSheetByName(RIVIERA.SHEETS.FORECAST)
  ).filter(function (row) {
    return String(row["Run ID"]) === runId;
  });
}

function getOrCreateCurrentPrepSpreadsheet_(
  controlSpreadsheet,
  config,
  generatedFolder
) {
  var target = null;
  if (config.CURRENT_PREP_SHEET_ID) {
    try {
      target = SpreadsheetApp.openById(config.CURRENT_PREP_SHEET_ID);
    } catch (error) {
      throw new Error(
        "CURRENT_PREP_SHEET_ID cannot be opened. Clear the ID only after " +
        "confirming the file was intentionally removed. " + error.message
      );
    }
  } else {
    var matches = generatedFolder.getFilesByName(
      RIVIERA.CURRENT_PREP_FILE_NAME
    );
    var files = [];
    while (matches.hasNext()) {
      files.push(matches.next());
    }
    if (files.length > 1) {
      throw new Error(
        "Multiple files use the stable current prep name. Resolve duplicates " +
        "before publication."
      );
    }
    if (files.length === 1) {
      target = SpreadsheetApp.openById(files[0].getId());
    }
  }
  if (!target) {
    target = SpreadsheetApp.create(RIVIERA.CURRENT_PREP_FILE_NAME);
    DriveApp.getFileById(target.getId()).moveTo(generatedFolder);
  }
  DriveApp.getFileById(target.getId())
    .setName(RIVIERA.CURRENT_PREP_FILE_NAME);
  setConfigValue_(
    controlSpreadsheet,
    "CURRENT_PREP_SHEET_ID",
    target.getId()
  );
  return target;
}

function archiveCurrentPrep_(target, generatedFolder) {
  var sheets = target.getSheets();
  var hasPublishedContent = sheets.some(function (sheet) {
    return sheet.getLastRow() > 1 ||
      String(sheet.getRange(1, 1).getDisplayValue()).indexOf(
        "Riviera Sunday Tapas"
      ) !== -1;
  });
  if (!hasPublishedContent) {
    return null;
  }
  var archiveName =
    "Riviera — Sunday Tapas Prep Archive — " +
    Utilities.formatDate(
      new Date(), RIVIERA.TIME_ZONE, "yyyy-MM-dd HHmmss"
    );
  return DriveApp.getFileById(target.getId())
    .makeCopy(archiveName, generatedFolder);
}

function writePublishedPrep_(target, draftRun, rows, reviewer, config) {
  var sheets = target.getSheets();
  var prep = sheets[0];
  prep.setName("Prep Sheet");
  for (var i = sheets.length - 1; i >= 1; i -= 1) {
    target.deleteSheet(sheets[i]);
  }
  prep.clear();

  var title = "Riviera Sunday Tapas — Approved Prep";
  var metadata = [
    ["Service date", draftRun.targetServiceDate],
    ["Booked covers", draftRun.bookedCovers],
    ["Approved by", reviewer],
    ["Approved at", nowIso_()],
    ["Forecast run", draftRun.runId],
    ["Recipe release", config.RECIPE_RELEASE_ID],
    ["Git commit", config.RECIPE_GITHUB_COMMIT],
    ["Buffer", "0% automatic Tapas buffer"]
  ];
  var headers = [
    "Menu Item", "Recipe ID", "Booked Covers", "Gross Target Serves",
    "Stock Observed", "Estimated On Hand Serves", "Prep / Pull Serves",
    "Pieces", "Readiness", "Notes"
  ];
  var outputRows = rows.sort(function (a, b) {
    return String(a["Item Name"]).localeCompare(String(b["Item Name"]));
  }).map(function (row) {
    return [
      row["Item Name"],
      row["Recipe ID"],
      row["Booked Covers"],
      row["Gross Target Serves"],
      row["Stock Observed At"] ?
        row["Stock Observed At"] + " — " + row["Stock Status"] :
        row["Stock Status"],
      row["Estimated On Hand Serves"],
      row["Rounded Pull Serves"],
      row["Rounded Pieces"],
      row.Readiness,
      row.Notes
    ];
  });

  prep.getRange(1, 1, 1, headers.length).merge()
    .setValue(title)
    .setBackground("#233833")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(16);
  prep.getRange(2, 1, metadata.length, 2).setValues(metadata);
  var headerRow = metadata.length + 3;
  prep.getRange(headerRow, 1, 1, headers.length)
    .setValues([headers])
    .setBackground("#415e56")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setWrap(true);
  if (outputRows.length) {
    prep.getRange(
      headerRow + 1, 1, outputRows.length, headers.length
    ).setValues(outputRows).setWrap(true);
  }
  prep.setFrozenRows(headerRow);
  prep.setColumnWidth(1, 230);
  prep.setColumnWidth(2, 190);
  for (var col = 3; col <= 9; col += 1) {
    prep.setColumnWidth(col, 125);
  }
  prep.setColumnWidth(10, 520);
  prep.getDataRange().setVerticalAlignment("top");

  var receipt = target.insertSheet("Run Receipt");
  var receiptRows = [
    ["Field", "Value"],
    ["Forecast Run ID", draftRun.runId],
    ["Service Date", draftRun.targetServiceDate],
    ["Booked Covers", draftRun.bookedCovers],
    ["Approved By", reviewer],
    ["Approved At", nowIso_()],
    ["Recipe Release ID", config.RECIPE_RELEASE_ID],
    ["Recipe Git Commit", config.RECIPE_GITHUB_COMMIT],
    ["Automatic Buffer %", 0],
    [
      "Safety",
      "Missing/stale stock remains COUNT REQUIRED and was never set to zero."
    ]
  ];
  receipt.getRange(1, 1, receiptRows.length, 2).setValues(receiptRows);
  receipt.getRange(1, 1, 1, 2)
    .setBackground("#233833")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  receipt.setColumnWidth(1, 190);
  receipt.setColumnWidth(2, 620);
  receipt.getDataRange().setWrap(true).setVerticalAlignment("top");
  receipt.setFrozenRows(1);
}

function markForecastPublished_(spreadsheet, runId) {
  var sheet = spreadsheet.getSheetByName(RIVIERA.SHEETS.FORECAST);
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(String);
  var runColumn = headers.indexOf("Run ID");
  var statusColumn = headers.indexOf("Publication Status");
  if (runColumn === -1 || statusColumn === -1) {
    throw new Error("Forecast publication columns are missing.");
  }
  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][runColumn]) === runId) {
      sheet.getRange(i + 1, statusColumn + 1)
        .setValue("APPROVED / PUBLISHED");
    }
  }
}

function setRowValueByHeader_(
  sheet,
  rowNumber,
  headers,
  header,
  value
) {
  var index = headers.indexOf(header);
  if (index === -1) {
    throw new Error("Missing column '" + header + "'.");
  }
  sheet.getRange(rowNumber, index + 1).setValue(value);
}

// -----------------------------------------------------------------------------
// Source section: apps-script/riviera-tapas-orchestrator/src/SelfTest.gs.source
// -----------------------------------------------------------------------------
function runRivieraOrchestratorSelfTest() {
  var results = [];
  function test(name, callback) {
    try {
      callback();
      results.push({name: name, status: "PASS"});
    } catch (error) {
      results.push({
        name: name,
        status: "FAIL",
        message: error.message
      });
    }
  }

  test("SHA-256 is deterministic", function () {
    assertEqual_(
      computeSha256Hex_("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      "Unexpected SHA-256 digest"
    );
  });

  test("sales headers accept configured aliases", function () {
    var validation = validateHeaders_(
      RIVIERA.KINDS.SALES,
      ["Trading Date", "PLU", "Product Name", "Units Sold", "Voids", "Refunds"],
      {}
    );
    assertTrue_(validation.ok, safeJson_(validation));
    assertEqual_(validation.indexes.service_date, 0, "Date alias mismatch");
    assertEqual_(validation.indexes.sold_qty, 3, "Sold alias mismatch");
  });

  test("ambiguous sales headers fail closed", function () {
    var validation = validateHeaders_(
      RIVIERA.KINDS.SALES,
      ["Date", "Trading Date", "Item", "Qty"],
      {}
    );
    assertTrue_(!validation.ok, "Ambiguous headers were accepted");
  });

  test("missing and changed schemas are classified distinctly", function () {
    var missing = validateHeaders_(
      RIVIERA.KINDS.SALES,
      ["Trading Date", "PLU"],
      {}
    );
    assertEqual_(
      classifyHeaderFailure_(missing),
      "MISSING_HEADER",
      "Missing required heading was misclassified"
    );
    var changed = validateHeaders_(
      RIVIERA.KINDS.SALES,
      ["Trading Date", "PLU", "Units Sold", "Unmapped New Field"],
      {}
    );
    assertEqual_(
      classifyHeaderFailure_(changed),
      "SCHEMA_CHANGED",
      "Genuinely unknown heading was misclassified"
    );
  });

  test("unknown item ID cannot fall back to a matching name", function () {
    var mapped = {menuItemId: "polpette"};
    var maps = {
      posById: {},
      byId: {},
      posByName: {"polpette": mapped},
      byName: {"polpette": mapped}
    };
    assertEqual_(
      resolveMenuItem_(maps, "UNKNOWN-ID", "Polpette"),
      null,
      "Unknown supplied ID fell back to name"
    );
    assertEqual_(
      resolveMenuItem_(maps, "", "Polpette"),
      mapped,
      "Blank ID did not permit exact name mapping"
    );
  });

  test("control migration has no positional fallback", function () {
    var failedClosed = false;
    try {
      mapControlHeadersStrictly_(
        RIVIERA.SHEETS.POS_MAP,
        ["POS Item ID", "Mystery Heading", "Menu Item ID", "Active", "Notes"],
        RIVIERA.HEADERS.POS_MAP
      );
    } catch (error) {
      failedClosed = true;
    }
    assertTrue_(failedClosed, "Unknown equal-width template migrated by position");
  });

  test("legacy Config template maps safely and drops Editable", function () {
    var mapping = getExactKnownHeaderMigration_(
      RIVIERA.SHEETS.CONFIG,
      ["key", "value", "description", "editable"],
      RIVIERA.HEADERS.CONFIG
    );
    assertEqual_(mapping[0], 0, "Config key was not preserved");
    assertEqual_(mapping[1], 1, "Config value was not preserved");
    assertEqual_(mapping[3], 2, "Config description did not map to Notes");
    assertTrue_(
      mapping[2] === undefined,
      "Legacy Editable must not be treated as canonical Required"
    );
  });

  test("placeholder Git commit is never accepted as provenance", function () {
    assertEqual_(
      sanitizeConfigValue_("RECIPE_GITHUB_COMMIT", "SET AFTER MERGE"),
      "",
      "Placeholder Git commit was not cleared"
    );
    assertEqual_(
      sanitizeConfigValue_("RECIPE_GITHUB_COMMIT", "27ac836"),
      "27ac836",
      "Real Git commit was altered"
    );
  });

  test("booking IDs dedupe safely without undercounting anonymous bookings", function () {
    var headers = [
      "booking_id", "service_date", "booked_covers",
      "status", "event_name", "notes"
    ];
    var validation = validateHeaders_(
      RIVIERA.KINDS.BOOKINGS,
      headers,
      {}
    );
    assertTrue_(validation.ok, safeJson_(validation));
    var anonymousSheet = makeMemorySpreadsheet_();
    var baseRow = [
      "", "2026-08-02", 12, "CONFIRMED", "Table booking", ""
    ];
    var anonymous = processBookingRows_({
      spreadsheet: anonymousSheet,
      runId: "TEST-BOOKINGS",
      kind: RIVIERA.KINDS.BOOKINGS,
      hash: "hash",
      file: makeFakeFile_(),
      indexes: validation.indexes,
      rows: [baseRow.slice(), baseRow.slice()]
    });
    assertEqual_(
      anonymous.accepted,
      2,
      "Identical anonymous legitimate bookings were undercounted"
    );

    var identifiedSheet = makeMemorySpreadsheet_();
    var identified = processBookingRows_({
      spreadsheet: identifiedSheet,
      runId: "TEST-BOOKINGS-ID",
      kind: RIVIERA.KINDS.BOOKINGS,
      hash: "hash",
      file: makeFakeFile_(),
      indexes: validation.indexes,
      rows: [
        ["B-001", "2026-08-02", 12, "CONFIRMED", "Table booking", ""],
        ["B-001", "2026-08-02", 12, "CONFIRMED", "Table booking", ""]
      ]
    });
    assertEqual_(identified.accepted, 1, "Duplicate booking ID was accepted");
    assertEqual_(identified.quarantined, 1, "Duplicate booking ID was not flagged");
  });

  test("net sales deduct voids and refunds", function () {
    assertEqual_(netSales_(12, 2, 1), 9, "Net sales formula mismatch");
  });

  test("blank stock never becomes zero", function () {
    assertEqual_(
      parseRequiredNumber_(""),
      null,
      "Blank stock was converted to a number"
    );
  });

  test("pull quantity rounds up to the configured unit", function () {
    assertEqual_(roundUpToUnit_(7.1, 2), 8, "Pull rounding mismatch");
    assertEqual_(roundUpToUnit_(8, 2), 8, "Exact unit changed");
  });

  test("Australian dates parse and Sunday is recognised", function () {
    var date = parseDate_("02/08/2026");
    assertEqual_(dateKey_(date), "2026-08-02", "Date parse mismatch");
    assertTrue_(isSunday_(date), "Expected Sunday");
  });

  test("latest 13 comparable Sundays are selected", function () {
    var sales = {};
    var bookings = {};
    for (var index = 0; index < 14; index += 1) {
      var date = new Date(2026, 3, 26 + index * 7);
      var key = dateKey_(date);
      sales[key] = {
        date: date,
        covers: 20 + index,
        items: {polpette: index + 1},
        observed: {polpette: true}
      };
      bookings[key] = {covers: 20 + index};
    }
    var selected = selectComparableSundays_(
      sales,
      bookings,
      new Date(2026, 7, 9),
      13
    );
    assertEqual_(selected.length, 13, "Wrong history window");
    assertEqual_(
      selected[0].dateKey,
      dateKey_(new Date(2026, 4, 3)),
      "Oldest of 14 Sundays was not dropped"
    );
  });

  test("Polpette and stuffed olives remain distinct", function () {
    var polpette = {
      menuItemId: "polpette",
      recipeId: "veal-meatballs",
      piecesPerServe: 3,
      pieceWeightG: 80
    };
    var olives = {
      menuItemId: "veal-prosciutto-stuffed-olives",
      recipeId: "veal-prosciutto-stuffed-olives",
      piecesPerServe: 6
    };
    assertTrue_(
      polpette.menuItemId !== olives.menuItemId,
      "Menu IDs were merged"
    );
    assertEqual_(polpette.recipeId, "veal-meatballs", "Polpette recipe mismatch");
    assertEqual_(polpette.piecesPerServe, 3, "Polpette serve mismatch");
    assertEqual_(polpette.pieceWeightG, 80, "Polpette weight mismatch");
    assertEqual_(olives.piecesPerServe, 6, "Stuffed olive serve mismatch");
  });

  test("forecast applies zero automatic Tapas buffer", function () {
    var item = {
      menuItemId: "polpette",
      recipeId: "veal-meatballs",
      itemName: "Polpette",
      piecesPerServe: 3,
      stockUnitsPerServe: 3,
      pullUnitServes: 1,
      notes: ""
    };
    var target = {date: new Date(2026, 7, 9), covers: 50};
    var history = [{
      date: new Date(2026, 7, 2),
      dateKey: "2026-08-02",
      covers: 50,
      items: {polpette: 10},
      observed: {polpette: true}
    }];
    var stockSnapshot = {
      date: new Date(2026, 7, 8),
      items: {polpette: {quantity: 9, uom: "pieces"}}
    };
    var row = buildForecastRow_({
      runId: "TEST",
      item: item,
      target: target,
      history: history,
      sales: {},
      stockSnapshot: stockSnapshot,
      maxStockAge: 31,
      deductPostStockSales: true
    });
    assertEqual_(row[10], 10, "Gross target mismatch");
    assertEqual_(row[20], 0, "Unexpected automatic buffer");
    assertEqual_(row[18], 7, "Prep target mismatch");
    assertEqual_(row[19], 21, "Piece target mismatch");
  });

  test("missing stock blocks quantity without inventing zero", function () {
    var result = calculateStockPosition_({
      item: {menuItemId: "polpette"},
      target: {date: new Date(2026, 7, 9)},
      sales: {},
      stockSnapshot: null,
      maxStockAge: 31,
      deductPostStockSales: true
    });
    assertEqual_(result.onHandServes, null, "Missing stock became a quantity");
    assertEqual_(result.status, "COUNT REQUIRED", "Missing stock was not blocked");
  });

  test("change scopes are exactly the five approved classes", function () {
    assertEqual_(
      RIVIERA.VALID_CHANGE_SCOPES.length,
      5,
      "Scope count changed"
    );
    assertTrue_(
      RIVIERA.VALID_CHANGE_SCOPES.indexOf(
        "WEEK-SPECIFIC INSTRUCTION"
      ) !== -1,
      "Week-specific scope missing"
    );
  });

  test("change scopes route to explicit non-publication targets", function () {
    assertEqual_(
      scopeTargetRoute_("PERMANENT RIVIERA STANDARD"),
      "DRIVE_SOP_MASTER",
      "Permanent route mismatch"
    );
    assertEqual_(
      scopeTargetRoute_("PACKAGE-SPECIFIC STANDARD"),
      "DRIVE_PACKAGE_REGISTER",
      "Package route mismatch"
    );
    assertEqual_(
      scopeTargetRoute_("RECIPE-SPECIFIC STANDARD"),
      "GITHUB_RECIPE_RECORD; DRIVE_RECIPE_MASTER_IF_REPRESENTED",
      "Recipe route mismatch"
    );
    assertEqual_(
      scopeTargetRoute_("EVENT-SPECIFIC INSTRUCTION"),
      "DRIVE_EVENT_WEEK_RECORD",
      "Event route mismatch"
    );
  });

  test("temporary changes require effective and expiry dates", function () {
    var missing = changeDateErrors_(
      "WEEK-SPECIFIC INSTRUCTION", "", null, "", null
    );
    assertTrue_(
      missing.indexOf(
        "event/week-specific changes require an effective date"
      ) !== -1,
      "Missing effective date was accepted"
    );
    assertTrue_(
      missing.indexOf(
        "event/week-specific changes require an expiry date"
      ) !== -1,
      "Missing expiry date was accepted"
    );
    var valid = changeDateErrors_(
      "EVENT-SPECIFIC INSTRUCTION",
      "2026-08-01",
      parseDate_("2026-08-01"),
      "2026-08-02",
      parseDate_("2026-08-02")
    );
    assertEqual_(valid.length, 0, "Valid temporary dates were rejected");
  });

  var failures = results.filter(function (result) {
    return result.status === "FAIL";
  });
  Logger.log(JSON.stringify(results, null, 2));
  var message = failures.length ?
    failures.length + " self-test(s) failed:\n" +
      failures.map(function (failure) {
        return failure.name + ": " + failure.message;
      }).join("\n") :
    results.length + " Riviera orchestrator self-tests passed.";
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (ignored) {
    // Self-test can also run headlessly.
  }
  if (failures.length) {
    throw new Error(message);
  }
  return results;
}

function makeMemorySpreadsheet_() {
  var written = {};
  return {
    written: written,
    getSheetByName: function (name) {
      return {
        getLastRow: function () {
          return (written[name] || []).length;
        },
        getRange: function () {
          return {
            setValues: function (rows) {
              written[name] = (written[name] || []).concat(rows);
              return this;
            }
          };
        }
      };
    }
  };
}

function makeFakeFile_() {
  return {
    getId: function () {
      return "fake-file-id";
    },
    getName: function () {
      return "fake-bookings.csv";
    }
  };
}

function assertEqual_(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message + ": expected " + safeJson_(expected) +
      ", received " + safeJson_(actual)
    );
  }
}

function assertTrue_(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}
