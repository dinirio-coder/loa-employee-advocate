import { getEmployeeReturnToWorkSummary } from "./rtwUtils.js";

const MY_LINCOLN_URL = "https://www.mylincolnportal.com/";
const SERVICENOW_URL = "https://twilio.service-now.com/";

const populated = (value) => value !== null && value !== undefined && String(value).trim() !== "";
const validDate = (value) => {
  if (!populated(value)) return null;
  const text = String(value).trim();
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : text;
};
const recordWith = (records, field) => records.find((record) => validDate(record[field]));

const action = (id, title, description, timing, owner, destination, basis, urgency = "Normal") => ({
  id,
  title,
  description,
  timing,
  owner,
  destination,
  basis,
  urgency,
});

export const getEmployeePriorityActions = (employee, options = {}) => {
  const records = Array.isArray(employee?.sourceRecords) ? employee.sourceRecords : [];
  const rtw = getEmployeeReturnToWorkSummary(employee);
  const hasReturnRecord = rtw.hasReturnToWorkData;
  const beginRecord = recordWith(records, "leaveBeginDate");
  const hasFutureBegin = beginRecord && validDate(beginRecord.leaveBeginDate) >= (options.asOfDate || new Date().toISOString().slice(0, 10));
  const status = String(employee?.currentReportStatus || employee?.leaveStatus || "").toUpperCase();
  const documentationPending = ["PE", "PENDING", "PEND"].includes(status) && !hasFutureBegin && populated(employee?.dateReceived);

  if (hasReturnRecord) {
    return [
      action("rtw-confirm-record", "Confirm the recorded return date", "Align the source-record date with Lincoln Financial and your manager through the authorized process.", "Before return", "Employee", MY_LINCOLN_URL, `${rtw.controllingDateLabel} is available from ${rtw.sourceSheet || "the source report"}.`, "High"),
      action("rtw-restore-access", "Prepare system access", "Request IT or license reactivation before returning and verify access on the first day.", "Approximately 3 days before return", "IT / ServiceNow", SERVICENOW_URL, "A source-backed RTW date is available; access status is not inferred.", "High"),
      action("rtw-manager-handoff", "Coordinate manager reintegration", "Plan work hand-back, calendar reset, priorities, and a manager check-in.", "Before return and first 30 days", "Manager", null, "A source-backed RTW date supports administrative reintegration planning.", "Normal"),
    ];
  }

  if (hasFutureBegin) {
    return [
      action("preleave-confirm-intake", "Confirm Lincoln intake status", "Check the recorded leave status and follow up through the authorized Lincoln process.", "Before leave begins", "Lincoln Financial", MY_LINCOLN_URL, `Leave begins ${beginRecord.leaveBeginDate} in ${beginRecord.sourceSheet || "the source report"}; intake details should be confirmed there.`, "High"),
      action("preleave-business-handoff", "Complete the business handoff", "Confirm owners, escalation contacts, priorities, and manager coverage without medical details.", "Before leave begins", "Employee / Manager", null, `Leave start date is available from ${beginRecord.sourceSheet || "the source report"}.`, "Normal"),
      action("preleave-delegations", "Configure Workday and Ramp delegations", "Set delegation owners and activation dates for the leave period.", "Before leave begins", "Employee", null, "Future leave start is present; delegation completion is not inferred.", "Normal"),
    ];
  }

  if (documentationPending) {
    return [
      action("documentation-check-portal", "Check MyLincoln Portal", "Review authorized messages and outstanding documentation instructions.", "Next administrative step", "Employee", MY_LINCOLN_URL, `Source status is ${status}; documentation requirements are not determined here.`, "High"),
      action("documentation-confirm-deadline", "Confirm the certification deadline", "Use the authorized process to confirm any controlling deadline shown in the source record.", "As shown in the source record", "Lincoln Financial", MY_LINCOLN_URL, "A pending source status is present; no deadline is invented when it is unavailable.", "High"),
      action("documentation-receipt", "Confirm documentation receipt", "Submit or confirm receipt of required documentation only through the authorized process.", "After submission", "Lincoln Financial", MY_LINCOLN_URL, "Source status indicates follow-up may be needed; no completion is inferred.", "Normal"),
    ];
  }

  return [
    action("fallback-portal", "Check MyLincoln Portal", "Review the latest authorized leave messages and recorded actions.", "Next administrative step", "Lincoln Financial", MY_LINCOLN_URL, "Operational status or dates are incomplete in the source report.", "High"),
    action("fallback-leave-ops", "Confirm leave dates", "Ask Twilio Leave Operations to confirm the administrative dates available for your record.", "Next administrative step", "Twilio Leave Operations", null, "A reliable operational date is missing from the source report.", "Normal"),
    action("fallback-handoff", "Review the business handoff", "Confirm owners, priorities, and escalation contacts with your manager without medical details.", "Next administrative step", "Employee / Manager", null, "A business handoff is useful while source dependencies remain incomplete.", "Normal"),
  ];
};