import { PAY_SCHEDULE_2026 } from "./paySchedule2026.js";
const valid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
const message = { "dates-missing": "Pay-period dates are needed to identify the expected payroll date.", "outside-schedule": "This pay period is outside the available 2026 schedule. Confirm the payment date with Twilio Payroll.", ambiguous: "We could not match this pay period to one payroll date. Confirm the dates with Twilio Payroll." };
export const getEmployeePaySchedule = (employee, options = {}) => {
  const start = employee?.payPeriod?.from ?? employee?.payPeriodStart;
  const end = employee?.payPeriod?.through ?? employee?.payPeriodEnd;
  if (!valid(start) || !valid(end)) return { status: "dates-missing", employeeMessage: message["dates-missing"] };
  let matches = PAY_SCHEDULE_2026.filter((row) => row.payPeriodStart === start && row.payPeriodEnd === end);
  if (!matches.length) matches = PAY_SCHEDULE_2026.filter((row) => row.payPeriodStart <= start && row.payPeriodEnd >= end);
  if (matches.length !== 1) { const status = matches.length ? "ambiguous" : "outside-schedule"; return { status, employeeMessage: message[status] }; }
  const row = matches[0]; const asOfDate = options.asOfDate || new Date().toISOString().slice(0, 10);
  const cutoffStatus = asOfDate < row.leaveApprovalCutoff ? "upcoming" : asOfDate === row.leaveApprovalCutoff ? "today" : "passed";
  const employeeMessage = cutoffStatus === "passed" ? `The approval cutoff for this pay period has passed. If approval was completed after ${row.leaveApprovalCutoff}, payment may move to a later payroll cycle.` : cutoffStatus === "today" ? "The approval cutoff for this pay period is today. Approval timing may affect when the payment is processed." : `If your leave approval is completed by ${row.leaveApprovalCutoff}, the related Twilio payroll payment is expected on ${row.payDate}.`;
  return { status: "matched", ...row, cutoffStatus, employeeMessage };
};