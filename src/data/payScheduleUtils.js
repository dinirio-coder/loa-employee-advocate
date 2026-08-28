import { PAY_SCHEDULE_2026 } from "./paySchedule2026.js";
import { resolveEmployeeApprovalDate } from "./approvalDateUtils.js";

const EARLIEST_SUPPORTED_APPROVAL_DATE = PAY_SCHEDULE_2026[0].payPeriodStart;
const LATEST_SUPPORTED_APPROVAL_DATE = PAY_SCHEDULE_2026[PAY_SCHEDULE_2026.length - 1].leaveApprovalCutoff;

const OUTSIDE_CALENDAR_MESSAGE = "Your approval date is not within the Payroll calendar year.";
const OUTSIDE_CALENDAR_GUIDANCE = "Confirm the expected payment date with Twilio Payroll.";
const MISSING_MESSAGE = "Your approval date is not available yet.";
const MISSING_GUIDANCE = "Once your leave is approved, the approval date can be used to identify the expected Twilio payroll cycle.";
const AMBIGUOUS_MESSAGE = "We found more than one approval date. Confirm the correct date before relying on this payment schedule.";
const INVALID_MESSAGE = "Your approval date needs confirmation before an expected payroll date can be identified.";
const FUTURE_MESSAGE = "Your recorded approval date is in the future. Confirm this date before an expected payroll date can be identified.";

// Selects the payroll cycle from the employee's explicit approval date only (never pay-period dates).
export const getEmployeePaySchedule = (employee, options = {}) => {
  const asOfDate = options.asOfDate || new Date().toISOString().slice(0, 10);
  const resolved = resolveEmployeeApprovalDate(employee);

  if (resolved.status === "missing") return { status: "approval-date-missing", employeeMessage: MISSING_MESSAGE, supportingGuidance: MISSING_GUIDANCE };
  if (resolved.status === "ambiguous") return { status: "ambiguous-approval-date", employeeMessage: AMBIGUOUS_MESSAGE, candidates: resolved.candidates };
  if (resolved.status === "invalid") return { status: "invalid-approval-date", employeeMessage: INVALID_MESSAGE, approvalDate: resolved.value, approvalDateField: resolved.field };

  const { value: approvalDate, field: approvalDateField } = resolved;

  if (approvalDate > asOfDate) return { status: "future-approval-date", employeeMessage: FUTURE_MESSAGE, approvalDate, approvalDateField };

  if (approvalDate < EARLIEST_SUPPORTED_APPROVAL_DATE || approvalDate > LATEST_SUPPORTED_APPROVAL_DATE) {
    return { status: "outside-payroll-calendar", employeeMessage: OUTSIDE_CALENDAR_MESSAGE, supportingGuidance: OUTSIDE_CALENDAR_GUIDANCE, approvalDate, approvalDateField };
  }

  const row = PAY_SCHEDULE_2026.find((candidate) => approvalDate <= candidate.leaveApprovalCutoff);
  if (!row) return { status: "outside-payroll-calendar", employeeMessage: OUTSIDE_CALENDAR_MESSAGE, supportingGuidance: OUTSIDE_CALENDAR_GUIDANCE, approvalDate, approvalDateField };

  const cutoffStatus = asOfDate < row.leaveApprovalCutoff ? "upcoming" : asOfDate === row.leaveApprovalCutoff ? "today" : "passed";
  const employeeMessage = `Based on the recorded approval date of ${approvalDate}, the related Twilio payroll payment is expected on ${row.payDate}.`;
  return { status: "matched", ...row, approvalDate, approvalDateField, cutoffStatus, employeeMessage };
};