import assert from "node:assert/strict";
import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import { getEmployeePriorityActions } from "../src/data/actionPlanUtils.js";
import { getEmployeeStatusSummary } from "../src/data/statusUtils.js";
import { getEmployeeNextMilestone } from "../src/data/milestoneUtils.js";
import { getEmployeeReturnToWorkSummary } from "../src/data/rtwUtils.js";

const profile = (first, last, id) => getVerifiedEmployeeProfile(first, last, id);
const assertActions = (employee) => {
  const actions = getEmployeePriorityActions(employee, { asOfDate: "2026-08-26" });
  assert.equal(actions.length, 3);
  assert.equal(new Set(actions.map((action) => action.id)).size, 3);
  assert(actions.every((action) => action.title && action.description && action.timing && action.owner && action.basis && action.urgency));
  assert(!actions.some((action) => /diagnos|symptom|claim number|medical record/i.test(JSON.stringify(action))));
  assert.deepEqual(actions, getEmployeePriorityActions(employee, { asOfDate: "2026-08-26" }));
  return actions;
};

const luke = profile("Luke", "Skywalker", "1048291");
assert(assertActions(luke).some((action) => /return|access|manager/i.test(action.title + action.description)));
assert.equal(getEmployeeReturnToWorkSummary(luke).controllingReturnDate, "2026-08-17");

const will = profile("Will", "Johansson", "2749015");
assert(assertActions(will).some((action) => /intake|handoff|delegation/i.test(action.title + action.description)));

const amelia = profile("Amelia", "Moore", "129384");
assert.equal(assertActions(amelia)[0].id, "fallback-portal");

const documentationPending = assertActions({
  currentReportStatus: "PE",
  dateReceived: "2026-08-03",
  sourceRecords: [{ sourceSheet: "Combined Status" }],
});
assert.equal(documentationPending[0].id, "documentation-check-portal");

assert.equal(getEmployeeStatusSummary({ currentReportStatus: "CL" }).value, "Closed");
assert.equal(getEmployeeStatusSummary({ currentReportStatus: "XY" }).value, "Unknown status");
assert.equal(getEmployeeStatusSummary({}).value, "Not available in source report");
assert.equal(getEmployeeNextMilestone({ sourceRecords: [] }, { asOfDate: "2026-08-26" }).hasMilestone, false);
assert.equal(getEmployeeNextMilestone({ sourceRecords: [{ leaveEndDate: "2026-09-01" }, { estimatedRTW: "2026-09-10" }] }, { asOfDate: "2026-08-26" }).label, "Leave ends");
const milestone = getEmployeeNextMilestone({ sourceRecords: [{ estimatedRTW: "2026-09-10", sourceSheet: "RTW Plan" }, { leaveBeginDate: "2026-09-01", sourceSheet: "Leave Plan" }] }, { asOfDate: "2026-08-26" });
assert.equal(milestone.label, "Leave begins");
assert.equal(milestone.source, "Leave Plan");

console.log("Dashboard action, status, and milestone validation passed.");