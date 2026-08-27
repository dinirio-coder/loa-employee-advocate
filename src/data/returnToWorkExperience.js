import { getLifecycleStageDecision } from "./lifecycleStageEngine.js";

const MY_LINCOLN_URL = "https://www.mylincolnportal.com/";
const DAY = 86400000;
const actions = {
  plan: [
    ["return-extension", "Decide whether you may need an extension."],
    ["return-contact", "Contact Lincoln promptly if an extension is needed."],
    ["return-update", "Update your expected return date in MyLincoln Portal."],
    ["return-confirm", "Confirm the return date with Lincoln and your manager."],
  ],
  first: [
    ["first-access", "Check your system access."],
    ["first-manager", "Connect with your manager."],
    ["first-priorities", "Review priorities and meetings."],
    ["first-delegations", "Remove Workday and Ramp delegations."],
  ],
  after: [["after-survey", "Complete the short post-return survey."]],
  date: [
    ["date-update", "Confirm or update the date in MyLincoln Portal."],
    ["date-contact", "Contact Lincoln if the date or claim status remains unresolved."],
    ["date-manager", "Confirm the date with your manager."],
  ],
};

const toAction = ([id, text]) => ({ id, text, destination: id.includes("contact") || id.includes("update") || id.includes("date") ? MY_LINCOLN_URL : null });
const dateText = (value) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : null;

export const getEmployeeReturnToWorkExperience = (employee, { asOfDate } = {}) => {
  const decision = getLifecycleStageDecision(employee, { asOfDate });
  const { normalizedDates, flags, statusCategory } = decision;
  const expectedReturnDate = normalizedDates.expectedReturn;
  const actualReturnDate = normalizedDates.actualReturn;
  const dateStatus = flags.expectedReturnOverdue ? "Overdue" : actualReturnDate === decision.asOfDate || expectedReturnDate === decision.asOfDate ? "Today" : expectedReturnDate ? "Upcoming" : "Needs confirmation";
  let viewId = "not-yet";
  let title = "Return to Work";
  let description = "Return planning will begin approximately two weeks before your expected return.";
  let selectedActions = [];
  if (flags.needsDateConfirmation || flags.expectedReturnOverdue || (!expectedReturnDate && !actualReturnDate)) {
    viewId = "date-confirmation";
    title = "Confirm Your Return Date";
    description = "Confirm your return information before the next step can be identified.";
    selectedActions = actions.date;
  } else if (decision.stageId === "first-day-back") {
    viewId = "first-day-back";
    title = "Your First Day Back";
    description = "Check in, reconnect, and get ready for your first day back.";
    selectedActions = actions.first;
    if (!actualReturnDate && expectedReturnDate === decision.asOfDate) selectedActions = [["confirm-today", "Confirm today’s return date with Lincoln and your manager."], ...selectedActions];
  } else if (decision.stageId === "after-return") {
    viewId = "after-return";
    title = "After Your Return";
    description = "Take a moment to complete your return follow-up.";
    selectedActions = [...actions.after];
    if (statusCategory === "PENDING") selectedActions.push(["after-lincoln", "Contact Lincoln to confirm approval or closure."]);
  } else if (decision.stageId === "return-to-work") {
    viewId = "plan-return";
    title = "Plan Your Return";
    description = "Prepare for your expected return and keep Lincoln informed if plans change.";
    selectedActions = actions.plan;
  }
  const leaveStart = normalizedDates.leaveStart;
  const returnDate = actualReturnDate || expectedReturnDate;
  const durationDays = leaveStart && returnDate ? Math.round((Date.parse(`${returnDate}T00:00:00Z`) - Date.parse(`${leaveStart}T00:00:00Z`)) / DAY) + 1 : null;
  const flexReturn = !flags.needsDateConfirmation && !flags.futureActualReturn && leaveStart && returnDate && durationDays >= 84 ? { show: true, durationDays, message: "You may qualify for FlexReturn because your planned continuous leave is at least 12 weeks. Twilio Leave Operations confirms whether FlexReturn applies.", learnMoreUrl: "https://switchboard.twilio.com/sites/total-rewards-benefits-compensation-global-mobility/SitePageModern/51097/global-flexible-return-from-leave-program" } : { show: false, durationDays: null, message: null, learnMoreUrl: null };
  return { viewId, title, description, expectedReturnDate, actualReturnDate, dateStatus, confirmationRequired: viewId === "date-confirmation" || (!actualReturnDate && expectedReturnDate === decision.asOfDate), actions: selectedActions.map(toAction), flexReturn, workplaceSupportAvailable: true };
};

export { dateText, MY_LINCOLN_URL };
