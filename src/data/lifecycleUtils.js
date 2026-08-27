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

const item = (id, title, description, owner, destination, timing, dependency = null) => ({
  id,
  title,
  description,
  owner,
  destination,
  timing,
  dependency,
});

export const LIFECYCLE_STAGE_DEFINITIONS = [
  {
    id: "pre-leave",
    number: 1,
    shortLabel: "Pre-Leave",
    title: "Pre-Leave Planning",
    timeframe: "30–60 days prior",
    description: "Prepare for your planned leave and the work handoff.",
    accent: "cyan",
  },
  {
    id: "documentation",
    number: 2,
    shortLabel: "Documentation",
    title: "Documentation",
    timeframe: "During intake and review",
    description: "Track leave messages and documentation steps.",
    accent: "amber",
  },
  {
    id: "business-handoff",
    number: 3,
    shortLabel: "Handoff",
    title: "Business Handoff",
    timeframe: "3 days before leave",
    description: "Confirm owners, coverage, delegations, and out-of-office logistics for the business transition.",
    accent: "violet",
  },
  {
    id: "return-to-work",
    number: 4,
    shortLabel: "Return to Work",
    title: "Return to Work",
    timeframe: "Before return and first 30 days",
    description: "Plan your return, restore access, hand back work, and find workplace support if needed.",
    accent: "green",
  },
];

export const getEmployeeLifecycle = (employee, options = {}) => {
  const records = Array.isArray(employee?.sourceRecords) ? employee.sourceRecords : [];
  const rtw = getEmployeeReturnToWorkSummary(employee);
  const asOfDate = validDate(options.asOfDate) || new Date().toISOString().slice(0, 10);
  const leaveStart = records.find((record) => validDate(record.leaveBeginDate));
  const status = String(employee?.currentReportStatus || employee?.leaveStatus || employee?.claimStatus || "").toUpperCase();
  const hasFutureLeave = leaveStart && validDate(leaveStart.leaveBeginDate) >= asOfDate;
  const hasReceivedDate = populated(employee?.dateReceived);
  const hasDocumentedHandoff = records.some((record) =>
    populated(record.handoffDate) || populated(record.handoffStatus) || populated(record.delegationActivationDate),
  );

  let suggestedStageId = null;
  let suggestedStageBasis = "There is not enough information to suggest one stage.";
  if (rtw.hasReturnToWorkData) {
    suggestedStageId = "return-to-work";
    suggestedStageBasis = "Suggested because return information is available.";
  } else if (hasDocumentedHandoff) {
    suggestedStageId = "business-handoff";
    suggestedStageBasis = "Suggested because handoff activity is documented.";
  } else if (hasFutureLeave) {
    suggestedStageId = "pre-leave";
    suggestedStageBasis = "Suggested because a future leave start is present.";
  } else if (["PE", "PENDING", "PEND"].includes(status) && hasReceivedDate) {
    suggestedStageId = "documentation";
    suggestedStageBasis = "Suggested because documentation follow-up may be needed.";
  }

  const leaveProductText = populated(employee?.leaveProduct)
    ? `Confirm your leave type: ${employee.leaveProduct}.`
    : "Review your leave type with Twilio Leave Operations.";

  const stages = LIFECYCLE_STAGE_DEFINITIONS.map((stage) => ({ ...stage, status: stage.id === suggestedStageId ? "suggested" : "available", basis: stage.id === suggestedStageId ? suggestedStageBasis : "General administrative guidance; no current stage is inferred.", items: [] }));
  stages[0].items = [
    item("pre-leave-intake", "Apply for leave", "Apply for leave with Lincoln Financial.", "Lincoln Financial", MY_LINCOLN_URL, "Before leave begins", "Confirm the application steps with Lincoln Financial."),
    item("pre-leave-product", "Confirm your leave type", leaveProductText, "Twilio Leave Operations", null, "During planning", "Your leave type needs confirmation."),
    item("pre-leave-notify", "Notify manager and HRBP", "Notify your manager and HRBP of the expected start date and business handoff timeline; no medical details are needed.", "Employee / Manager", null, "Before leave begins", "A business handoff requires manager coordination."),
    item("pre-leave-delegations", "Set Workday and Ramp delegations", "Set Workday and Ramp delegations and prepare the out-of-office message.", "Employee", null, "Before leave begins", "Delegation completion is not inferred."),
  ];
  stages[1].items = [
    item("documentation-acknowledgment", "Confirm your application", "Confirm that your application reached Lincoln Financial.", "Employee", MY_LINCOLN_URL, "Day 1", "Application status is not confirmed here."),
    item("documentation-messages", "Review Lincoln's messages", "Watch for Lincoln Financial messages and review portal instructions.", "Employee", MY_LINCOLN_URL, "During review", "Message contents are not shown here."),
    item("documentation-submit", "Submit your documents", "Submit or confirm receipt of any required documents.", "Lincoln Financial", MY_LINCOLN_URL, "As instructed by Lincoln", "Follow Lincoln's instructions."),
    item("documentation-deadline", "Confirm your deadline", "Confirm any certification deadline shown by Lincoln Financial.", "Lincoln Financial", MY_LINCOLN_URL, "When provided", "A deadline is shown only when provided by Lincoln."),
  ];
  stages[2].items = [
    item("handoff-owners", "Confirm owners and escalation contacts", "Confirm project owners, escalation contacts, and manager coverage.", "Employee / Manager", null, "3 days before leave", "Business coverage is coordinated with the manager."),
    item("handoff-delegations", "Verify delegation activation", "Verify Workday and Ramp delegation activation dates.", "Employee", null, "3 days before leave", "Activation is not inferred from a date alone."),
    item("handoff-ooo", "Schedule the out-of-office plan", "Schedule out-of-office notifications without medical or claim details.", "Employee", null, "3 days before leave", "The out-of-office plan is a local planning task."),
  ];
  stages[3].items = [
    item("rtw-record", "Confirm your return date", "Confirm your return date with Lincoln Financial and your manager.", "Employee", MY_LINCOLN_URL, "Before return", rtw.hasReturnToWorkData ? `${rtw.controllingDateLabel} is available.` : "Return date is not available."),
    item("rtw-access", "Activate your work systems", "Request access before returning and verify it on the first day.", "IT / ServiceNow", SERVICENOW_URL, "Approximately 3 days before return", "Access status is not confirmed here."),
    item("rtw-handoff", "Coordinate work hand-back", "Coordinate access restoration, calendar reset, and a manager check-in; discuss phased reintegration where applicable.", "Employee / Manager / Twilio Leave Operations", null, "Before return and first 30 days", "No phased return outcome is promised."),
    item("rtw-workplace-support", "Explore workplace support if needed", "If functional needs affect your return, use the optional workplace support section.", "Twilio Leave Operations / Accommodations team", null, "When applicable", "Workplace support need and official determination are not inferred."),
  ];

  return { suggestedStageId, suggestedStageBasis, hasSuggestedStage: Boolean(suggestedStageId), stages };
};