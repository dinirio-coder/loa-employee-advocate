import assert from "node:assert/strict";
import { getEmployeePayExperience } from "../src/data/payExperienceUtils.js";

const options = { asOfDate: "2026-08-26" };
const nyStd = getEmployeePayExperience({ state: "NY", leaveCategory: "OWN_MEDICAL", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-31", sourceRecords: [{ biweeklySalaryAmount: "10275.24", product: "STD", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-31", leaveCategory: "OWN_MEDICAL" }] }, options);
assert.equal(nyStd.scenario, "std");
assert.equal(nyStd.coordinatedPayTarget, 10275.24);
assert.equal(nyStd.components.find((item) => item.label === "State benefit estimate").amount, 340);
assert.equal(nyStd.components.find((item) => item.label === "Short-Term Disability estimate").amount, 6510.50);
assert.equal(nyStd.components.find((item) => item.label === "Twilio salary top-up estimate").amount, 3424.74);
assert.equal(nyStd.stateProgram.weeklyMaximum, 170);
assert.equal(nyStd.stateProgram.calculatedMaximum, 340);
assert.equal(nyStd.stateProgram.eligibleDays, 14);
assert.equal(nyStd.components.reduce((sum, item) => sum + item.amount, 0), nyStd.coordinatedPayTarget);
assert(nyStd.components.every((item) => item.amount >= 0));
assert.match(nyStd.waitingPeriodGuidance, /first seven calendar days/);
assert.match(nyStd.formula, /66\.67% Short-Term Disability estimate/);
assert.match(nyStd.paymentDelivery, /Lincoln administers the Short-Term Disability calculation/);
assert.match(nyStd.paymentDelivery, /Twilio Payroll/);
assert.match(nyStd.paymentDelivery, /should not expect a separate Lincoln check/);
assert.match(nyStd.paymentDelivery, /may be paid separately by the state/);
assert.match(nyStd.jobProtectionGuidance, /Family and Medical Leave Act/);
assert.equal(nyStd.payPeriodLabel, "Estimated pay for this pay period");

const parental = getEmployeePayExperience({ sourceRecords: [{ biweeklySalaryAmount: "5000", product: "PLCOB" }] }, options);
assert.equal(parental.scenario, "parental");
assert.equal(parental.components.length, 1);
assert.equal(parental.components[0].label, "Paid parental leave estimate");
assert.equal(parental.formula, null);
assert.match(parental.components[0].explanation, /100% of eligible base pay/);

const missing = getEmployeePayExperience({ sourceRecords: [] }, options);
assert.equal(missing.hasPayData, false);
assert.match(missing.notice, /Some pay information is unavailable/);
assert.equal(missing.components.length, 0);

const noState = getEmployeePayExperience({ sourceRecords: [{ biweeklySalaryAmount: "5000", product: "STD", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-31", state: "TX" }] }, options);
assert.equal(noState.components.some((item) => item.label === "State benefit estimate"), false);
assert.equal(noState.components.reduce((sum, item) => sum + item.amount, 0), noState.coordinatedPayTarget);
const medicalBenefitCases = [["CA", 1765], ["HI", 871], ["NJ", 1119], ["NY", 170], ["RI", 1150], ["PR", 113]];
for (const [state, weeklyMaximum] of medicalBenefitCases) {
	const result = getEmployeePayExperience({ state, leaveCategory: "OWN_MEDICAL", sourceRecords: [{ biweeklySalaryAmount: "10275.24", product: "STD", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-14", leaveCategory: "OWN_MEDICAL" }] }, options);
	assert.equal(result.stateProgram.weeklyMaximum, weeklyMaximum, state);
	assert.equal(result.stateProgram.calculatedMaximum, weeklyMaximum * 2, state);
}
const rhodeIslandBeforeJuly = getEmployeePayExperience({ state: "RI", leaveCategory: "OWN_MEDICAL", sourceRecords: [{ biweeklySalaryAmount: "10275.24", product: "STD", payPeriodFromDate: "2026-06-01", payPeriodThruDate: "2026-06-14", leaveBeginDate: "2026-06-01", leaveEndDate: "2026-06-14", leaveCategory: "OWN_MEDICAL" }] }, { asOfDate: "2026-06-14" });
assert.equal(rhodeIslandBeforeJuly.stateProgram.weeklyMaximum, 1103);
assert.equal(rhodeIslandBeforeJuly.stateProgram.calculatedMaximum, 2206);
const bonding = getEmployeePayExperience({ state: "NY", leaveCategory: "BONDING", sourceRecords: [{ biweeklySalaryAmount: "10275.24", product: "STD", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-14", leaveCategory: "BONDING" }] }, options);
assert.equal(bonding.stateProgram, null);
assert.doesNotMatch(JSON.stringify(nyStd), /dailyBusinessDayRate|sourceSheet|payCode|ATP|record classification|owner|dependency/i);
console.log("Employee pay experience validation passed.");
