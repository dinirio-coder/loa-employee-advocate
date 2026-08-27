import assert from "node:assert/strict";
import { getEmployeePriorityActions } from "../src/data/actionPlanUtils.js";

const asOfDate = "2026-08-26";
const names = (actions) => actions.map((action) => action.title);
const employeeWithLeave = (leaveBeginDate, extra = {}) => ({
  sourceRecords: [{ leaveBeginDate }],
  ...extra,
});
const actionText = (actions) => JSON.stringify(actions).toLowerCase();

const validateCommon = (actions) => {
  assert(actions.length > 0);
  assert.equal(new Set(actions.map((action) => action.id)).size, actions.length);
  for (const action of actions) {
    assert(action.title);
    assert(action.description);
    assert(action.timing);
    assert(action.owner);
    assert(action.basis);
    assert(action.urgency);
  }
  assert.doesNotMatch(actionText(actions), /source report|source record|administrative record|authorized process|hrbp|first 30 days|diagnos|treatment/);
};

const future = getEmployeePriorityActions(employeeWithLeave("2026-09-10"), { asOfDate });
assert.deepEqual(names(future), ["Apply for leave", "Tell your manager"]);
assert.doesNotMatch(actionText(future), /hrbp|workday|ramp|handoff|out-of-office/);
validateCommon(future);

const preparation = getEmployeePriorityActions(employeeWithLeave("2026-08-29"), { asOfDate });
assert.deepEqual(names(preparation), ["Complete your work handoff", "Set Workday and Ramp delegations", "Prepare your out-of-office message"]);
validateCommon(preparation);

const fourDays = getEmployeePriorityActions(employeeWithLeave("2026-08-30"), { asOfDate });
assert.deepEqual(names(fourDays), ["Apply for leave", "Tell your manager"]);
assert.doesNotMatch(actionText(fourDays), /prepar|workday|ramp|handoff|out-of-office/);
validateCommon(fourDays);

const today = getEmployeePriorityActions(employeeWithLeave(asOfDate), { asOfDate });
assert.deepEqual(names(today), names(preparation));
validateCommon(today);

const pendingDocumentation = getEmployeePriorityActions({
  currentReportStatus: "PE",
  dateReceived: "2026-08-03",
  sourceRecords: [{ sourceSheet: "Combined Status" }],
}, { asOfDate });
assert.deepEqual(names(pendingDocumentation), [
  "Review Lincoln’s messages",
  "Understand what is required",
  "Submit your documentation",
  "Contact Lincoln if you need more time",
]);
assert.match(actionText(pendingDocumentation), /15 calendar days/);
validateCommon(pendingDocumentation);

const returning = getEmployeePriorityActions({
  sourceRecords: [{ estimatedRTW: "2026-09-15" }],
}, { asOfDate });
assert.deepEqual(names(returning), [
  "Decide whether you may need an extension",
  "Contact Lincoln if you need an extension",
  "Confirm your return date",
]);
assert.doesNotMatch(actionText(returning), /system.?access|workday|ramp|hrbp|first 30 days|reintegration/);
validateCommon(returning);

const fallback = getEmployeePriorityActions({ sourceRecords: [] }, { asOfDate });
assert.deepEqual(names(fallback), [
  "Review Lincoln’s messages",
  "Confirm your leave dates",
  "Track your to-dos",
]);
validateCommon(fallback);

console.log("Action-plan scenario, boundary, precedence, and employee-language validations passed.");
