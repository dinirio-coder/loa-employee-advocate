import assert from "node:assert/strict";
import { PAY_SCHEDULE_2026 } from "../src/data/paySchedule2026.js";
import { getEmployeePaySchedule } from "../src/data/payScheduleUtils.js";
import { CURATED_DEMO_PROFILES } from "../src/data/curatedDemoProfiles.js";

// The 26-row authoritative schedule must remain untouched.
assert.equal(PAY_SCHEDULE_2026.length, 26);
assert.equal(new Set(PAY_SCHEDULE_2026.map((row) => row.payPeriodNumber)).size, 26);
for (let index = 0; index < PAY_SCHEDULE_2026.length; index++) {
  const row = PAY_SCHEDULE_2026[index];
  assert.equal((Date.parse(`${row.payPeriodEnd}T00:00:00Z`) - Date.parse(`${row.payPeriodStart}T00:00:00Z`)) / 86400000 + 1, 14);
  assert(row.leaveApprovalCutoff >= row.payPeriodStart && row.leaveApprovalCutoff <= row.payPeriodEnd);
  assert(row.payDate > row.payPeriodEnd);
  if (index) assert.equal(row.payPeriodStart, new Date(Date.parse(`${PAY_SCHEDULE_2026[index - 1].payPeriodEnd}T00:00:00Z`) + 86400000).toISOString().slice(0, 10));
}

const employee = (approvalDate, extra = {}) => ({ leaveApprovalDate: approvalDate, ...extra });
const ASOF = "2026-08-26";
const fields = ({ status, payPeriodNumber, leaveApprovalCutoff, payDate }) => [status, payPeriodNumber, leaveApprovalCutoff, payDate];

// --- Approval-date matching (spec examples) ---
assert.deepEqual(fields(getEmployeePaySchedule(employee("2026-07-20"), { asOfDate: ASOF })), ["matched", 16, "2026-07-23", "2026-07-31"]);
assert.deepEqual(fields(getEmployeePaySchedule(employee("2026-07-24"), { asOfDate: ASOF })), ["matched", 17, "2026-08-06", "2026-08-14"]);
assert.deepEqual(fields(getEmployeePaySchedule(employee("2026-08-20"), { asOfDate: ASOF })), ["matched", 18, "2026-08-20", "2026-08-28"]);
assert.deepEqual(fields(getEmployeePaySchedule(employee("2026-08-21"), { asOfDate: ASOF })), ["matched", 19, "2026-09-03", "2026-09-11"]);

// --- Two employees with different approval dates receive different cycles ---
const employeeA = getEmployeePaySchedule(employee("2026-07-20"), { asOfDate: ASOF });
const employeeB = getEmployeePaySchedule(employee("2026-08-21"), { asOfDate: ASOF });
assert.notEqual(employeeA.payPeriodNumber, employeeB.payPeriodNumber);

// --- Approval on the cutoff belongs to that cycle; one day after moves to the next cycle ---
assert.equal(getEmployeePaySchedule(employee("2026-07-23"), { asOfDate: ASOF }).payPeriodNumber, 16);
assert.equal(getEmployeePaySchedule(employee("2026-07-24"), { asOfDate: ASOF }).payPeriodNumber, 17);

// --- No production profile automatically defaults to period 16 ---
for (const scenario of CURATED_DEMO_PROFILES) {
  const result = getEmployeePaySchedule(scenario.profile, { asOfDate: scenario.asOfDate });
  assert.notEqual(result.status, "matched", `${scenario.id} must not match a payroll cycle without an explicit approval date`);
}

// --- Missing approval date ---
assert.equal(getEmployeePaySchedule({}).status, "approval-date-missing");
assert.equal(getEmployeePaySchedule({ currentReportStatus: "AP", claimStatus: "APPROVED" }).status, "approval-date-missing");
assert.equal(getEmployeePaySchedule({ currentReportStatus: "PE", claimStatus: "PE" }).status, "approval-date-missing");
assert.equal(getEmployeePaySchedule({ leaveBeginDate: "2026-07-01", leaveEndDate: "2026-07-30" }).status, "approval-date-missing");
assert.equal(getEmployeePaySchedule({}).employeeMessage, "Your approval date is not available yet.");

// --- Ambiguous approval dates ---
assert.equal(getEmployeePaySchedule({ leaveApprovalDate: "2026-07-20", sourceRecords: [{ leaveApprovalDate: "2026-07-24" }] }, { asOfDate: ASOF }).status, "ambiguous-approval-date");
assert.equal(getEmployeePaySchedule({ leaveApprovalDate: "2026-07-20", claimApprovalDate: "2026-07-24" }, { asOfDate: ASOF }).status, "ambiguous-approval-date");

// --- Invalid approval date ---
assert.equal(getEmployeePaySchedule({ leaveApprovalDate: "not-a-date" }, { asOfDate: ASOF }).status, "invalid-approval-date");
assert.equal(getEmployeePaySchedule({ leaveApprovalDate: "2026-13-40" }, { asOfDate: ASOF }).status, "invalid-approval-date");

// --- Future approval dates require confirmation, not a completed match ---
const future = getEmployeePaySchedule(employee("2026-09-01"), { asOfDate: ASOF });
assert.equal(future.status, "future-approval-date");
assert.equal(future.payDate, undefined);
assert.equal(future.payPeriodNumber, undefined);

// --- Outside the supported payroll calendar ---
assert.equal(getEmployeePaySchedule(employee("2025-12-13"), { asOfDate: "2025-12-20" }).status, "outside-payroll-calendar");
assert.equal(getEmployeePaySchedule(employee("2026-12-11"), { asOfDate: "2026-12-15" }).status, "outside-payroll-calendar");
assert(!Object.hasOwn(getEmployeePaySchedule(employee("2026-12-11"), { asOfDate: "2026-12-15" }), "payPeriodNumber"));
assert.equal(getEmployeePaySchedule(employee("2026-12-11"), { asOfDate: "2026-12-15" }).employeeMessage, "Your approval date is not within the Payroll calendar year.");
assert.equal(getEmployeePaySchedule(employee("2027-01-01"), { asOfDate: "2027-01-05" }).status, "outside-payroll-calendar");

// --- Pay-period / pay-amount fields never affect approval-date matching ---
assert.equal(getEmployeePaySchedule({ leaveApprovalDate: "2026-07-20", payPeriod: { from: "2026-08-09", through: "2026-08-22" }, biweeklySalaryAmount: "99999" }, { asOfDate: ASOF }).payPeriodNumber, 16);

console.log("Pay schedule validation passed.");
