import assert from "node:assert/strict";
import { EMBEDDED_EMPLOYEE_RECORDS } from "../src/data/embeddedEmployeeRecords.js";
import { getEmployeeReturnToWorkSummary } from "../src/data/rtwUtils.js";

const forEmployee = (employeeId) => ({
  sourceRecords: EMBEDDED_EMPLOYEE_RECORDS.filter(
    (record) => String(record.employeeId) === employeeId,
  ),
});

const mickey = getEmployeeReturnToWorkSummary(forEmployee("700001"));
assert.equal(mickey.status, "Return recorded");
assert.equal(mickey.controllingReturnDate, "2026-01-19");
assert.equal(mickey.sourceSheet, "Main Leave Report");

const louie = getEmployeeReturnToWorkSummary(forEmployee("700010"));
assert.equal(louie.status, "Planned return");
assert.equal(louie.controllingReturnDate, "2026-09-02");
assert.equal(louie.sourceSheet, "Hours Daily Report");

const estimated = getEmployeeReturnToWorkSummary({
  sourceRecords: [{ estimatedRTW: "2026-10-03", sourceSheet: "RTW Plan" }],
});
assert.equal(estimated.status, "Planned return");
assert.equal(estimated.actualReturnDate, null);

const unavailable = getEmployeeReturnToWorkSummary({
  sourceRecords: [{ leaveEndDate: "2026-09-01", benefitEndDate: "2026-09-02" }],
});
assert.equal(unavailable.status, "Return date not available");
assert.equal(unavailable.hasReturnToWorkData, false);
assert.equal(unavailable.controllingReturnDate, null);

const separateRecords = getEmployeeReturnToWorkSummary({
  sourceRecords: [
    { estimatedRTW: "2026-11-10", sourceSheet: "Planned Leave" },
    { actualRTW: "2026-11-12", sourceSheet: "Closed RTW" },
  ],
});
assert.equal(separateRecords.controllingReturnDate, "2026-11-12");
assert.equal(separateRecords.sourceSheet, "Closed RTW");
assert.deepEqual(separateRecords.contextDates, []);

console.log("RTW selector validation passed.");