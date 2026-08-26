import assert from "node:assert/strict";
import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import { getEmployeePayTimeline, normalizeDisplayDate, STD_PRODUCTS } from "../src/data/payTimelineUtils.js";

const profile = (first, last, id) => getVerifiedEmployeeProfile(first, last, id);
const asOfDate = "2026-08-26";

assert(STD_PRODUCTS.includes("STD") && STD_PRODUCTS.includes("STDCP"));
assert.equal(normalizeDisplayDate("46215.0"), "2026-07-12");
assert.equal(normalizeDisplayDate("2026-08-26"), "2026-08-26");
assert.equal(normalizeDisplayDate("not-a-date"), null);

const edgar = profile("Edgar", "Melville", "9548629");
assert(edgar && edgar.biweeklySalary > 0);
const edgarModel = getEmployeePayTimeline(edgar, { asOfDate });
assert.equal(edgarModel.hasPayData, true);
assert.equal(edgarModel.payScenario, "std");
assert.equal(edgarModel.sourcePayValues.benefitGrossAmount, 1400);
assert.notEqual(edgarModel.sourcePayValues.biweeklySalary, edgarModel.sourcePayValues.benefitGrossAmount);
assert.equal(edgarModel.payPeriod.from, "2026-07-12");
assert(!JSON.stringify(edgarModel).includes("46215.0"));
assert(!JSON.stringify(edgarModel).includes("46228.0"));
assert.equal(new Set(edgarModel.timelineEvents.map((event) => event.id)).size, edgarModel.timelineEvents.length);
assert(Object.values(edgarModel).every((value) => JSON.stringify(value).toLowerCase().includes("guaranteed") === false));

const goofyModel = getEmployeePayTimeline(profile("Goofy", "", "100005"), { asOfDate });
assert.equal(goofyModel.hasPayData, false);
assert.equal(goofyModel.payScenario, "none");
assert(!JSON.stringify(goofyModel).includes("$0.00"));

const parentalRecord = { biweeklySalaryAmount: "5000", product: "PLCOB", sourceSheet: "Twilio - ATP Report" };
const parentalModel = getEmployeePayTimeline({ employeeId: "parental", sourceRecords: [parentalRecord] }, { asOfDate });
assert.equal(parentalModel.payScenario, "parental");
assert.equal(parentalModel.planningEstimate, null);

const unknownModel = getEmployeePayTimeline({ employeeId: "unknown", sourceRecords: [{ biweeklySalaryAmount: "5000", product: "UNKNOWN", sourceSheet: "Twilio - ATP Report" }] }, { asOfDate });
assert.equal(unknownModel.payScenario, "record-only");
assert.equal(unknownModel.planningEstimate, null);

const lukeModel = getEmployeePayTimeline(profile("Luke", "Skywalker", "1048291"), { asOfDate });
assert(lukeModel.timelineEvents.some((event) => event.label === "Actual return to work" && event.date === "2026-08-17"));
assert(lukeModel.timelineEvents.some((event) => event.label === "Benefit end"));

const singleRecord = { employeeId: "range", sourceSheet: "Leave Plan", leaveBeginDate: "2026-09-01", leaveEndDate: "2026-09-10", durationDays: "10" };
const rangeModel = getEmployeePayTimeline({ employeeId: "range", sourceRecords: [singleRecord] }, { asOfDate });
assert.equal(rangeModel.timelineRanges.length, 1);
assert.equal(rangeModel.timelineRanges[0].source, "Leave Plan");
const conflictModel = getEmployeePayTimeline({ employeeId: "conflict", sourceRecords: [{ leaveBeginDate: "2026-09-01" }, { leaveBeginDate: "2026-09-02" }] }, { asOfDate });
assert(conflictModel.timelineEvents.filter((event) => event.label === "Leave begin").every((event) => event.conflict));

assert.equal(edgar.sourceRecords[1].payPeriodFromDate, "46215.0");
assert.equal(edgarModel.timelineEvents.length > 0, true);
console.log("Pay and leave timeline validation passed.");
