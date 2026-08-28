import assert from "node:assert/strict";
import { getEmployeePriorityActions } from "../src/data/actionPlanUtils.js";
import { getEmployeeLifecycle } from "../src/data/lifecycleUtils.js";
import { getEmployeeReturnToWorkSummary } from "../src/data/rtwUtils.js";
import { readFileSync } from "node:fs";

const employee = {
  state: "NY",
  leaveType: "BONDING",
  sourceRecords: [{ leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-14" }],
};
const visibleCopy = [
  ...getEmployeePriorityActions(employee).flatMap(({ title, description, basis }) => [title, description, basis]),
  ...getEmployeeLifecycle(employee).stages.flatMap(({ title, description, basis, items }) => [title, description, basis, ...items.flatMap(({ title: itemTitle, description: itemDescription }) => [itemTitle, itemDescription])]),
  getEmployeeReturnToWorkSummary(employee).status,
].join("\n").toLowerCase();
const prohibited = [
  "align source record",
  "authorized process",
  "administrative record",
  "formal leave intake",
  "leave product",
  "coordinate manager reintegration",
  "license recovery",
  "planned leave window",
  "twilio weekly combined status",
  "source-backed",
  "planning component",
  "daily business-day rate",
  "hospital care",
];
for (const phrase of prohibited) assert.equal(visibleCopy.includes(phrase), false, `Prohibited employee phrase rendered: ${phrase}`);
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").toLowerCase();
assert.equal(app.includes("twilio weekly combined status"), false);
assert.equal(/aria-label="[^"]*(edit|pencil)[^"]*"/.test(app), false);
console.log("Employee-facing language validation passed; internal canonical values remain available to the application.");
