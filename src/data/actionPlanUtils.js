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
      action("rtw-confirm-record", "Confirm your return date", "Confirm your return date with Lincoln Financial and your manager.", "Before return", "Employee", MY_LINCOLN_URL, "Your return date is available.", "High"),
      action("rtw-restore-access", "Activate your work systems", "Request access before returning and verify it on your first day.", "Approximately 3 days before return", "IT / ServiceNow", SERVICENOW_URL, "Your return date is available.", "High"),
      action("rtw-manager-handoff", "Connect with your manager", "Plan work hand-back, calendar reset, priorities, and a manager check-in.", "Before return and first 30 days", "Manager", null, "Your return date supports planning.", "Normal"),
    ];
  }

  if (hasFutureBegin) {
    return [
      action("preleave-confirm-intake", "Apply for leave", "Check your leave status and follow up with Lincoln Financial.", "Before leave begins", "Lincoln Financial", MY_LINCOLN_URL, `Leave begins ${beginRecord.leaveBeginDate}; confirm your details with Lincoln Financial.`, "High"),
      action("preleave-business-handoff", "Complete the business handoff", "Confirm owners, escalation contacts, priorities, and manager coverage without medical details.", "Before leave begins", "Employee / Manager", null, `Leave start date is available from ${beginRecord.sourceSheet || "the source report"}.`, "Normal"),
      action("preleave-delegations", "Configure Workday and Ramp delegations", "Set delegation owners and activation dates for the leave period.", "Before leave begins", "Employee", null, "Future leave start is present; delegation completion is not inferred.", "Normal"),
    ];
  }

  if (documentationPending) {
    return [
      action("documentation-check-portal", "Review Lincoln's messages", "Review messages and outstanding documentation instructions.", "Next step", "Employee", MY_LINCOLN_URL, `Your leave status is ${status}; review any requested documents.`, "High"),
      action("documentation-confirm-deadline", "Confirm the certification deadline", "Confirm any deadline shown by Lincoln Financial.", "When shown by Lincoln", "Lincoln Financial", MY_LINCOLN_URL, "A pending leave status may require follow-up.", "High"),
      action("documentation-receipt", "Confirm documentation receipt", "Submit or confirm receipt of any required documentation.", "After submission", "Lincoln Financial", MY_LINCOLN_URL, "Follow-up may be needed.", "Normal"),
    ];
  }

  return [
    action("fallback-portal", "Review Lincoln's messages", "Review your latest leave messages and next steps.", "Next step", "Lincoln Financial", MY_LINCOLN_URL, "Some leave details need confirmation.", "High"),
    action("fallback-leave-ops", "Confirm your leave dates", "Ask Twilio Leave Operations to confirm your leave dates.", "Next step", "Twilio Leave Operations", null, "A leave date needs confirmation.", "Normal"),
    action("fallback-handoff", "Review the business handoff", "Confirm owners, priorities, and escalation contacts with your manager without medical details.", "Next administrative step", "Employee / Manager", null, "A business handoff is useful while source dependencies remain incomplete.", "Normal"),
  ];
};