import assert from "node:assert/strict";
import { normalizeEmployeeLeaveStatus, getEmployeeStatusSummary } from "../src/data/statusUtils.js";
import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import { getEmployeePriorityActions } from "../src/data/actionPlanUtils.js";
import { getLifecycleStageDecision } from "../src/data/lifecycleStageEngine.js";

// 1. PE + EARLY SUBMISSION - REVIEW PENDING → Pending review
const peEarlySub = normalizeEmployeeLeaveStatus({
  claimStatus: "PE",
  statusReason: "EARLY SUBMISSION - REVIEW PENDING",
});
assert.equal(peEarlySub.label, "Pending review");
assert.equal(peEarlySub.statusKey, "PENDING");
assert(peEarlySub.description.includes("review"));
assert(peEarlySub.sourceCodeRecognized);

// 2. PENDED + missing certification reason → Documentation needed
const pendedMissingCert = normalizeEmployeeLeaveStatus({
  leaveStatus: "PENDED",
  statusReason: "MISSING CERTIFICATION",
});
assert.equal(pendedMissingCert.label, "Documentation needed");
assert.equal(pendedMissingCert.statusKey, "PENDING_DOCUMENTATION");
assert(pendedMissingCert.description.includes("documentation"));
assert(pendedMissingCert.sourceCodeRecognized);

// 3. PENDING with no reason → Pending review
const pendingNoReason = normalizeEmployeeLeaveStatus({
  claimStatus: "PENDING",
});
assert.equal(pendingNoReason.label, "Pending review");
assert.equal(pendingNoReason.description, "Lincoln is reviewing the leave request.");
assert(pendingNoReason.sourceCodeRecognized);

// 4. APPROVED → Approved
const approved = normalizeEmployeeLeaveStatus({ claimStatus: "APPROVED" });
assert.equal(approved.label, "Approved");
assert.equal(approved.statusKey, "APPROVED");
assert(approved.sourceCodeRecognized);

// 5. CLOSED → Closed
const closed = normalizeEmployeeLeaveStatus({ leaveStatus: "CLOSED" });
assert.equal(closed.label, "Closed");
assert.equal(closed.statusKey, "CLOSED");
assert(closed.sourceCodeRecognized);

// 6. DENIED → Denied
const denied = normalizeEmployeeLeaveStatus({ claimStatus: "DENIED" });
assert.equal(denied.label, "Denied");
assert.equal(denied.statusKey, "DENIED");
assert(denied.sourceCodeRecognized);

// 7. Empty statuses → Unknown status / Not available
const emptyStatus = normalizeEmployeeLeaveStatus({});
assert.equal(emptyStatus.sourceCodeRecognized, false);
assert.equal(emptyStatus.statusKey, "UNKNOWN");

// 8. Unsupported raw code → safe Unknown status
const unsupportedCode = normalizeEmployeeLeaveStatus({ claimStatus: "ZZ" });
assert.equal(unsupportedCode.label, "Unknown status");
assert.equal(unsupportedCode.sourceCodeRecognized, false);
assert.equal(unsupportedCode.statusKey, "UNKNOWN");

// 9. Recognized status is not replaced by an empty or unrelated record
const recognizedWithUnrelated = normalizeEmployeeLeaveStatus({
  claimStatus: "PE",
  statusCode: "Needs verification",
});
assert.equal(recognizedWithUnrelated.label, "Pending review");
assert.equal(recognizedWithUnrelated.sourceCodeRecognized, true);

// 10. Approval date unavailable does not produce Unknown status
const approvalDateUnavailable = normalizeEmployeeLeaveStatus({
  claimStatus: "PE",
  statusReason: "Synthetic scenario: no approval date is currently available.",
});
assert.equal(approvalDateUnavailable.label, "Pending review");
assert.equal(approvalDateUnavailable.sourceCodeRecognized, true);

// 11. Legacy getEmployeeStatusSummary checks
const summaryPending = getEmployeeStatusSummary({ currentReportStatus: "PE", statusReason: "EARLY SUBMISSION" });
assert.equal(summaryPending.rawCode, "PE");
assert.equal(summaryPending.employeeFriendlyLabel, "Pending review");
assert.equal(summaryPending.value, "Pending review");
assert(summaryPending.reasonDescription.includes("review"));

// 12. End-to-end assertion for Employee ID 700111 (Ernest Hemingway)
const ernest = getVerifiedEmployeeProfile("Ernest", "Hemingway", "700111");
assert(ernest, "Ernest profile should exist.");

const ernestSummary = getEmployeeStatusSummary(ernest);
assert.equal(ernestSummary.value, "Pending review");
assert.equal(ernestSummary.employeeFriendlyLabel, "Pending review");
assert.notEqual(ernestSummary.value, "Unknown status");
assert.notEqual(ernestSummary.employeeFriendlyLabel, "Unknown status");
assert(ernestSummary.reasonDescription.includes("review"), "Description must mention review.");
assert(!ernestSummary.reasonDescription.includes("missing documentation"), "Description must not mention missing documentation.");

const ernestDecision = getLifecycleStageDecision(ernest, { asOfDate: "2026-08-28" });
assert.equal(ernestDecision.stageId, "pre-leave");

const ernestActions = getEmployeePriorityActions(ernest, { asOfDate: "2026-08-28" });
assert.equal(ernestActions[0].id, "documentation-submit");
assert.equal(ernestActions[0].title, "Submit your documentation to Lincoln");
assert(!ernestActions.some((act) => act.title === "Apply for leave"), "Pending employees should not be asked to apply again.");

console.log("Status validator regression and end-to-end assertions passed.");