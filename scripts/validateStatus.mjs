import { getEmployeeStatusSummary } from "../src/data/statusUtils.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const pending = getEmployeeStatusSummary({ currentReportStatus: "PE", statusReason: "EARLY SUBMISSION" });
assert(pending.rawCode === "PE", "PE raw status code was not preserved.");
assert(pending.officialDescription === "PENDED", "PE official description is incorrect.");
assert(pending.employeeFriendlyLabel === "Pending review", "PE employee label is incorrect.");
assert(pending.reasonCode === "ESUB", "Early-submission reason code is incorrect.");
assert(pending.reasonDescription === "Early submission", "Early-submission reason description is incorrect.");

const approved = getEmployeeStatusSummary({ currentReportStatus: "AP" });
assert(approved.employeeFriendlyLabel === "Approved", "AP employee label is incorrect.");
assert(approved.officialDescription === "APPROVED", "AP official description is incorrect.");

const closed = getEmployeeStatusSummary({ currentReportStatus: "CL" });
assert(closed.employeeFriendlyLabel === "Closed", "CL employee label is incorrect.");
assert(closed.officialDescription === "CLOSED", "CL official description is incorrect.");

const unknown = getEmployeeStatusSummary({ currentReportStatus: "ZZ" });
assert(unknown.employeeFriendlyLabel === "Unknown status", "Unknown status fallback is incorrect.");
assert(unknown.officialDescription === null, "Unknown status should not have an official description.");

const missingReason = getEmployeeStatusSummary({ currentReportStatus: "PE" });
assert(missingReason.employeeFriendlyLabel === "Pending review", "Missing-reason status label is incorrect.");
assert(missingReason.reasonCode === null && missingReason.reasonDescription === null, "Missing reason should return null reason fields.");

console.log("Lincoln status translation validation passed.");
console.log(JSON.stringify({ pending, approved, closed, unknown, missingReason }));