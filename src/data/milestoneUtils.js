import { getLifecycleStageDecision } from "./lifecycleStageEngine.js";

const NOT_AVAILABLE = "Date to be confirmed";
const DAY_IN_MILLISECONDS = 86400000;
const populated = (value) => value !== null && value !== undefined && String(value).trim() !== "";
const validDate = (value) => {
  if (!populated(value)) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const time = Date.parse(`${text}T00:00:00Z`);
  return Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== text ? null : text;
};
const dateValue = (value) => Date.parse(`${value}T00:00:00Z`);
const explicitDeadline = (employee) => {
  const records = Array.isArray(employee?.sourceRecords) ? employee.sourceRecords : [];
  for (const record of records) for (const field of ["documentationDeadline", "documentationDueDate", "certificationDeadline"]) {
    const date = validDate(record[field]);
    if (date) return date;
  }
  return null;
};

export const getEmployeeNextMilestone = (employee, options = {}) => {
  const decision = getLifecycleStageDecision(employee, options);
  const { stageId, normalizedDates } = decision;
  const asOfDate = decision.asOfDate;
  const daysUntil = (date) => date ? Math.round((dateValue(date) - dateValue(asOfDate)) / DAY_IN_MILLISECONDS) : null;
  let label = "Confirm your leave dates with Lincoln";
  let date = null;
  let timing = NOT_AVAILABLE;
  let status = "needs-confirmation";
  let basis = "Some leave information needs confirmation before the next step can be identified.";
  if (stageId === "pre-leave") { label = "Apply for leave with Lincoln"; timing = "As soon as possible"; basis = "Start your leave request with Lincoln."; }
  else if (stageId === "documentation") { label = "Submit requested documentation"; date = explicitDeadline(employee); timing = date ? (daysUntil(date) === 0 ? "Today" : daysUntil(date) < 0 ? "Overdue" : "Upcoming") : "As soon as Lincoln requests it"; basis = date ? "Submit the requested documentation by Lincoln's stated deadline." : "Lincoln commonly requests documentation within 15 calendar days; confirm the actual deadline in Lincoln's message."; }
  else if (stageId === "business-handoff") { label = "Complete your leave preparation"; date = normalizedDates.leaveStart ? new Date(dateValue(normalizedDates.leaveStart) - 3 * DAY_IN_MILLISECONDS).toISOString().slice(0, 10) : null; timing = date && dateValue(date) < dateValue(asOfDate) ? "Due now" : "Upcoming"; basis = "Complete your handoff about 3 days before leave."; }
  else if (stageId === "on-leave") { label = "Review Lincoln updates"; timing = "During leave"; basis = "Review Lincoln's messages during your leave."; }
  else if (stageId === "return-to-work") { label = decision.flags.expectedReturnOverdue ? "Request an extension" : "Confirm your return date"; date = normalizedDates.expectedReturn; timing = decision.flags.expectedReturnOverdue ? "Overdue" : date ? (daysUntil(date) === 0 ? "Today" : "Upcoming") : "As soon as possible"; status = decision.flags.expectedReturnOverdue ? "overdue" : "upcoming"; basis = decision.flags.expectedReturnOverdue ? "Your expected return date has passed; contact Lincoln if you need an extension." : "Confirm your expected return date with Lincoln and your manager."; }
  else if (stageId === "first-day-back") { label = "Check your access and connect with your manager"; date = normalizedDates.actualReturn || normalizedDates.expectedReturn; timing = "Today"; status = "today"; basis = "Confirm your return and reconnect on your first day back."; }
  else if (stageId === "after-return") { label = "Complete the post-return survey"; timing = "After returning to work"; basis = "Share feedback about your leave and return experience."; }
  return { hasMilestone: Boolean(label), stageId, label, date, timing, status, basis };
};

export { NOT_AVAILABLE as MILESTONE_NOT_AVAILABLE };