import assert from "node:assert/strict";
import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import { getEmployeePaySummary, PAY_UNAVAILABLE_MESSAGE } from "../src/data/payUtils.js";
import { getEmployeeDurationSummary } from "../src/data/durationUtils.js";

const profile = (firstName, lastName, employeeId) => getVerifiedEmployeeProfile(firstName, lastName, employeeId);
const minnie = profile("Minnie", "Mouse", "700002");
const donald = profile("Donald", "Duck", "700003");
const louie = profile("Louie", "Duck", "700010");
const denied = profile("Moana", "Waialiki", "700030");

for (const [label, employee] of [["Minnie", minnie], ["Donald", donald], ["Louie", louie], ["Moana", denied]]) {
  assert(employee, `${label} did not produce a profile.`);
  assert(employee.sourceRecords.length > 1, `${label} did not join multiple workbook sources.`);
  assert.equal(employee.employeeId.startsWith("700"), true);
  assert.notEqual(employee.location, null);
  assert.notEqual(employee.state, null);
}

assert.deepEqual(new Set(minnie.sourceRecords.map((record) => record.sourceSheet)), new Set(["Twilio - ATP Report", "Daily Combined Alert Report", "Main Leave Report", "Twilio - Weekly Combined Status", "ER LOA Status Change Weekly Rep", "Twilio Closed RTW Summary", "Leave Approval Dates", "Approval Date ID Mapping"]));
assert.equal(minnie.leaveCategory, "CONTINUOUS");
assert.equal(minnie.leaveType, "BND");
assert.equal(minnie.leaveStatus, "CL");
assert.equal(minnie.leaveBeginDate, "2026-01-10");
assert.equal(minnie.leaveEndDate, "2026-02-26");
assert.equal(minnie.estimatedRTW, "2026-02-27");
assert.equal(minnie.actualRTW, "2026-02-27");
assert.equal(minnie.state, "MN");
assert.equal(minnie.location, "Remote - USA - MN");
assert.equal(minnie.sourceRecords.find((record) => record.leaveApprovalDate)?.leaveApprovalDate, "2026-01-08");

const minniePay = getEmployeePaySummary(minnie);
assert.equal(minniePay.hasPayData, true);
assert.equal(minniePay.biweeklySalary, 3774.34);
assert.equal(minniePay.product, "STDCP");
assert.equal(minniePay.payCode, "Parental");
assert.equal(minniePay.benefitGrossAmount, 3774.34);
assert.equal(minniePay.totalOffsets, 2846);
assert.equal(minniePay.adjustedBenefitGrossAmount, 928.34);
assert.equal(minniePay.payableCalculatedSalaryAmount, 928.34);
assert.equal(minniePay.payPeriodFromDate, "2026-01-11");
assert.equal(minniePay.payPeriodThroughDate, "2026-01-24");

assert.equal(donald.leaveType, "OWN DISABILITY");
assert.equal(donald.leaveStatus, "CLOSED");
assert.equal(getEmployeeDurationSummary(donald).durationDays, 79);
assert.equal(louie.leaveCategory, "INTERMITTENT");
assert.equal(louie.leaveStatus, "APPROVED");
assert.equal(denied.leaveStatus, "DENIED");
assert.equal(denied.sourceRecords.some((record) => record.sourceSheet === "Twilio Denials Daily Summary"), true);

const noPay = getEmployeePaySummary(louie);
assert.equal(noPay.hasPayData, false);
assert.equal(PAY_UNAVAILABLE_MESSAGE, "Pay information is not available.");
console.log("Validated joined replacement-workbook profiles, pay data, durations, denials, and unavailable-pay behavior.");