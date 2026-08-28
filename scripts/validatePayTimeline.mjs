import assert from "node:assert/strict";
import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import { getEmployeePayTimeline, normalizeDisplayDate, STD_PRODUCTS } from "../src/data/payTimelineUtils.js";

const profile = (first, last, id) => getVerifiedEmployeeProfile(first, last, id);
const asOfDate = "2026-08-26";

assert(STD_PRODUCTS.includes("STD") && STD_PRODUCTS.includes("STDCP"));
assert.equal(normalizeDisplayDate("46215.0"), "2026-07-12");
assert.equal(normalizeDisplayDate("2026-08-26"), "2026-08-26");
assert.equal(normalizeDisplayDate("not-a-date"), null);

const belle = profile("Belle", "Beaumont", "700015");
assert(belle && belle.biweeklySalary > 0);
const belleModel = getEmployeePayTimeline(belle, { asOfDate });
assert.equal(belleModel.hasPayData, true);
assert.equal(belleModel.payScenario, "std");
assert.equal(belleModel.sourcePayValues.benefitGrossAmount, 4018.4);
assert.notEqual(belleModel.sourcePayValues.biweeklySalary, belleModel.sourcePayValues.benefitGrossAmount);
assert.equal(belleModel.payPeriod.from, "2026-07-12");
assert(!JSON.stringify(belleModel).includes("46215.0"));
assert(!JSON.stringify(belleModel).includes("46228.0"));
assert.equal(new Set(belleModel.timelineEvents.map((event) => event.id)).size, belleModel.timelineEvents.length);
assert(Object.values(belleModel).every((value) => JSON.stringify(value).toLowerCase().includes("guaranteed") === false));

const goofyModel = getEmployeePayTimeline(profile("Goofy", "Goof", "700005"), { asOfDate });
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

const minnieModel = getEmployeePayTimeline(profile("Minnie", "Mouse", "700002"), { asOfDate });
assert(minnieModel.timelineEvents.some((event) => event.label === "Actual return to work" && event.date === "2026-02-27"));
assert(minnieModel.timelineEvents.some((event) => event.label === "Benefit end"));

const singleRecord = { employeeId: "range", sourceSheet: "Leave Plan", leaveBeginDate: "2026-09-01", leaveEndDate: "2026-09-10", durationDays: "10" };
const rangeModel = getEmployeePayTimeline({ employeeId: "range", sourceRecords: [singleRecord] }, { asOfDate });
assert.equal(rangeModel.timelineRanges.length, 1);
assert.equal(rangeModel.timelineRanges[0].source, "Leave Plan");
const conflictModel = getEmployeePayTimeline({ employeeId: "conflict", sourceRecords: [{ leaveBeginDate: "2026-09-01" }, { leaveBeginDate: "2026-09-02" }] }, { asOfDate });
assert(conflictModel.timelineEvents.filter((event) => event.label === "Leave begin").every((event) => event.conflict));

const nyModel = (leaveReason) => getEmployeePayTimeline({ state: "NY", leaveReason, sourceRecords: [{ employeeId: "ny", biweeklySalaryAmount: "10275.24", product: "STD", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-14" }] });
for (const [leaveReason, expectedState, expectedLincoln] of [["Bonding leave", 2457.06, 4393.44], ["Medical leave", 340, 6510.50]]) {
	const model = nyModel(leaveReason);
	assert.equal(model.stateBenefit.assumedStateOffset, expectedState);
	assert.equal(model.planningEstimate.lincolnNetAfterStateOffset, expectedLincoln);
	assert.equal(model.planningEstimate.twilio.amount, 3424.74);
	assert(model.planningEstimate.twilio.amount >= 0 && model.planningEstimate.lincolnNetAfterStateOffset >= 0 && model.stateBenefit.assumedStateOffset >= 0);
	assert.equal(model.stateBenefit.assumedStateOffset + model.planningEstimate.lincolnNetAfterStateOffset + model.planningEstimate.twilio.amount, model.planningEstimate.basePayTarget);
}

assert.equal(belle.sourceRecords.find((record) => record.sourceSheet === "Twilio - ATP Report")?.payPeriodFromDate, "2026-07-12");
assert.equal(belleModel.timelineEvents.length > 0, true);
console.log("Pay and leave timeline validation passed.");
