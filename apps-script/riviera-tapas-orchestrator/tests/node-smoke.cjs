const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

process.env.TZ = "Australia/Brisbane";

function pad(value) {
  return String(value).padStart(2, "0");
}

global.Utilities = {
  DigestAlgorithm: {SHA_256: "SHA_256"},
  Charset: {UTF_8: "UTF_8"},
  computeDigest(_algorithm, value) {
    return Array.from(
      crypto.createHash("sha256").update(String(value), "utf8").digest()
    ).map((byte) => (byte > 127 ? byte - 256 : byte));
  },
  formatDate(date, _timezone, pattern) {
    const value = new Date(date);
    if (pattern === "yyyy-MM-dd") {
      return [
        value.getFullYear(),
        pad(value.getMonth() + 1),
        pad(value.getDate())
      ].join("-");
    }
    if (pattern === "yyyyMMdd-HHmmss") {
      return [
        value.getFullYear(),
        pad(value.getMonth() + 1),
        pad(value.getDate())
      ].join("") + "-" + [
        pad(value.getHours()),
        pad(value.getMinutes()),
        pad(value.getSeconds())
      ].join("");
    }
    return value.toISOString();
  },
  getUuid() {
    return crypto.randomUUID();
  }
};
global.Logger = {log() {}};
global.SpreadsheetApp = {
  getUi() {
    return {alert() {}};
  }
};

const runtimePath = path.join(__dirname, "..", "Code.gs");
vm.runInThisContext(fs.readFileSync(runtimePath, "utf8"), {
  filename: runtimePath
});

const results = runRivieraOrchestratorSelfTest();
const failed = results.filter((result) => result.status !== "PASS");
if (failed.length) {
  throw new Error(JSON.stringify(failed, null, 2));
}
process.stdout.write(`${results.length} self-tests passed\n`);
