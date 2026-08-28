import assert from "node:assert/strict";
import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import { getEmployeePriorityActions } from "../src/data/actionPlanUtils.js";
import { getEmployeeStatusSummary } from "../src/data/statusUtils.js";
import { getEmployeeNextMilestone } from "../src/data/milestoneUtils.js";
import { getEmployeeReturnToWorkSummary } from "../src/data/rtwUtils.js";

const profile = (first, last, id) => getVerifiedEmployeeProfile(first, last, id);
const assertActions = (employee) => {
  const actions = getEmployeePriorityActions(employee, { asOfDate: "2026-08-26" });
  assert(actions.length > 0);
  assert.equal(new Set(actions.map((action) => action.id)).size, actions.length);
  assert(actions.every((action) => action.title && action.description && action.timing && action.owner && action.basis && action.urgency));
  assert(!actions.some((action) => /diagnos|symptom|claim number|medical record/i.test(JSON.stringify(action))));
  assert.deepEqual(actions, getEmployeePriorityActions(employee, { asOfDate: "2026-08-26" }));
  return actions;
};

const minnie = profile("Minnie", "Mouse", "700002");
assert(assertActions(minnie).some((action) => /return|access|manager|survey/i.test(action.title + action.description)));
assert.equal(getEmployeeReturnToWorkSummary(minnie).controllingReturnDate, "2026-02-27");

const ernest = profile("Ernest", "Hemingway", "700111");
assert(assertActions(ernest).some((action) => /leave|documentation|return/i.test(action.title + action.description)));

const incompleteDates = { sourceRecords: [{ leaveEndDate: "2026-09-01", estimatedRTW: "2026-09-10" }] };
assert.equal(assertActions(incompleteDates)[0].id, "review-lincoln-messages");

const documentationPending = assertActions({
  currentReportStatus: "PE",
  dateReceived: "2026-08-03",
  sourceRecords: [{ sourceSheet: "Combined Status" }],
});
assert.equal(documentationPending[0].id, "documentation-submit");
assert.equal(documentationPending[0].title, "Submit your documentation to Lincoln");
assert.equal(getEmployeeNextMilestone({ currentReportStatus: "PE", sourceRecords: [{ leaveBeginDate: "2026-09-10" }] }, { asOfDate: "2026-08-26" }).label, "Submit your documentation");

assert.equal(getEmployeeStatusSummary({ currentReportStatus: "CL" }).value, "Closed");
assert.equal(getEmployeeStatusSummary({ currentReportStatus: "XY" }).value, "Unknown status");
assert.equal(getEmployeeStatusSummary({}).value, "Not available in source report");
assert.equal(getEmployeeNextMilestone({ sourceRecords: [] }, { asOfDate: "2026-08-26" }).label, "Confirm your leave dates with Lincoln");
assert.equal(getEmployeeNextMilestone({ sourceRecords: [{ leaveEndDate: "2026-09-01" }, { estimatedRTW: "2026-09-10" }] }, { asOfDate: "2026-08-26" }).label, "Confirm your leave dates with Lincoln");
const milestone = getEmployeeNextMilestone({ sourceRecords: [{ estimatedRTW: "2026-09-10", sourceSheet: "RTW Plan" }, { leaveBeginDate: "2026-09-01", sourceSheet: "Leave Plan" }] }, { asOfDate: "2026-08-26" });
assert.equal(milestone.label, "Apply for leave with Lincoln");

console.log("Dashboard action, status, and milestone validation passed.");