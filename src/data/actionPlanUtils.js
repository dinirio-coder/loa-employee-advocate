import { getEmployeeReturnToWorkSummary } from "./rtwUtils.js";

const MY_LINCOLN_URL = "https://www.mylincolnportal.com/";
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const populated = (value) =>
  value !== null &&
  value !== undefined &&
  String(value).trim() !== "";

const validDate = (value) => {
  if (!populated(value)) return null;

  const text = String(value).trim();
  const date = new Date(`${text}T00:00:00Z`);

  return Number.isNaN(date.getTime()) ? null : text;
};

const recordWith = (records, field) =>
  records.find((record) => validDate(record[field]));

const daysBetween = (fromDate, toDate) => {
  const validFrom = validDate(fromDate);
  const validTo = validDate(toDate);

  if (!validFrom || !validTo) return null;

  const fromTime = new Date(`${validFrom}T00:00:00Z`).getTime();
  const toTime = new Date(`${validTo}T00:00:00Z`).getTime();

  return Math.round(
    (toTime - fromTime) / DAY_IN_MILLISECONDS,
  );
};

const action = (
  id,
  title,
  description,
  timing,
  owner,
  destination,
  basis,
  urgency = "Normal",
) => ({
  id,
  title,
  description,
  timing,
  owner,
  destination,
  basis,
  urgency,
});

export const getEmployeePriorityActions = (
  employee,
  options = {},
) => {
  const records = Array.isArray(employee?.sourceRecords)
    ? employee.sourceRecords
    : [];

  const rtw = getEmployeeReturnToWorkSummary(employee);
  const hasReturnRecord = rtw.hasReturnToWorkData;
  const beginRecord = recordWith(records, "leaveBeginDate");

  const asOfDate =
    validDate(options.asOfDate) ||
    new Date().toISOString().slice(0, 10);

  const daysUntilLeave = beginRecord
    ? daysBetween(asOfDate, beginRecord.leaveBeginDate)
    : null;

  const hasFutureBegin =
    daysUntilLeave !== null && daysUntilLeave >= 0;

  const isPreparationWindow =
    daysUntilLeave !== null &&
    daysUntilLeave >= 0 &&
    daysUntilLeave <= 3;

  const status = String(
    employee?.currentReportStatus ||
      employee?.leaveStatus ||
      employee?.claimStatus ||
      "",
  ).toUpperCase();

  const documentationPending =
    ["PE", "PENDING", "PEND"].includes(status) &&
    populated(employee?.dateReceived);

  if (hasReturnRecord) {
    return [
      action(
        "return-consider-extension",
        "Decide whether you may need an extension",
        "Review whether you expect to return on the currently planned date.",
        "About 2 weeks before your expected return",
        "Employee",
        null,
        "Your return information is available.",
        "High",
      ),
      action(
        "return-contact-lincoln",
        "Contact Lincoln if you need an extension",
        "Use MyLincoln Portal or contact Lincoln promptly if your return date may change.",
        "As soon as you know your return date may change",
        "Employee",
        MY_LINCOLN_URL,
        "Your return information is available.",
        "High",
      ),
      action(
        "return-confirm-date",
        "Confirm your return date",
        "Confirm your expected return date with Lincoln Financial and your manager.",
        "Before your return",
        "Employee",
        MY_LINCOLN_URL,
        "Your return date still needs confirmation.",
        "High",
      ),
    ];
  }

  if (documentationPending) {
    return [
      action(
        "documentation-review-messages",
        "Review Lincoln’s messages",
        "Check MyLincoln Portal and your email for documentation instructions.",
        "Next step",
        "Employee",
        MY_LINCOLN_URL,
        "Your leave is pending with Lincoln.",
        "High",
      ),
      action(
        "documentation-understand-request",
        "Understand what is required",
        "Review the forms, information, and deadline listed in Lincoln’s message.",
        "When Lincoln sends the request",
        "Employee",
        MY_LINCOLN_URL,
        "Your leave is pending with Lincoln.",
        "High",
      ),
      action(
        "documentation-submit",
        "Submit your documentation",
        "Submit the requested documentation by Lincoln’s deadline, usually within 15 calendar days.",
        "By the deadline shown by Lincoln",
        "Employee",
        MY_LINCOLN_URL,
        "Your leave is pending with Lincoln.",
        "High",
      ),
      action(
        "documentation-more-time",
        "Contact Lincoln if you need more time",
        "Contact Lincoln promptly if you may not be able to meet the documentation deadline.",
        "Before the deadline",
        "Employee",
        MY_LINCOLN_URL,
        "Your leave is pending with Lincoln.",
        "High",
      ),
    ];
  }

  if (isPreparationWindow) {
    return [
      action(
        "prepare-handoff",
        "Complete your work handoff",
        "Review priorities, coverage, and important contacts with your manager.",
        "About 3 days before leave",
        "Employee",
        null,
        "Your planned leave begins soon.",
        "High",
      ),
      action(
        "prepare-delegations",
        "Set Workday and Ramp delegations",
        "Confirm the correct people and activation dates for your delegations.",
        "About 3 days before leave",
        "Employee",
        null,
        "Your planned leave begins soon.",
        "High",
      ),
      action(
        "prepare-out-of-office",
        "Prepare your out-of-office message",
        "Add your leave dates and backup contact without including medical or claim details.",
        "About 3 days before leave",
        "Employee",
        null,
        "Your planned leave begins soon.",
        "Normal",
      ),
    ];
  }

  if (hasFutureBegin) {
    return [
      action(
        "apply-for-leave",
        "Apply for leave",
        "Apply through MyLincoln Portal or contact Lincoln Financial for help starting your request.",
        "As soon as you know you may need leave",
        "Employee",
        MY_LINCOLN_URL,
        "Your planned leave starts in the future.",
        "High",
      ),
      action(
        "tell-manager",
        "Tell your manager",
        "Share your expected leave start date with your manager. You do not need to provide medical details.",
        "After starting your leave request",
        "Employee",
        null,
        "Your planned leave starts in the future.",
        "Normal",
      ),
    ];
  }

  return [
    action(
      "review-lincoln-messages",
      "Review Lincoln’s messages",
      "Check MyLincoln Portal and your email for your latest leave status and next steps.",
      "Next step",
      "Employee",
      MY_LINCOLN_URL,
      "Your next step still needs confirmation.",
      "High",
    ),
    action(
      "confirm-leave-dates",
      "Confirm your leave dates",
      "Contact Lincoln if your leave start date, expected return date, approval, or closure is unresolved.",
      "Next step",
      "Employee",
      MY_LINCOLN_URL,
      "One or more leave dates still need confirmation.",
      "High",
    ),
    action(
      "track-your-todos",
      "Track your to-dos",
      "Use Your Leave Journey to review the steps that apply to your leave.",
      "As needed",
      "Employee",
      null,
      "Your next step still needs confirmation.",
      "Normal",
    ),
  ];
};