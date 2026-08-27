import { getStateBenefitCoordination } from "./stateBenefitUtils.js";

const populated = (value) => value !== null && value !== undefined && String(value).trim() !== "";
const validUrl = (value) => {
  if (!populated(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};
const categoryLabels = { OWN_MEDICAL: "Self medical", BONDING: "Bonding", FAMILY_CARE: "Family care", MILITARY_EXIGENCY: "Military leave", SAFE_LEAVE: "Safe leave" };

export const getStateCoordinationExperience = (employee, options = {}) => {
  const coordination = getStateBenefitCoordination(employee, options);
  const program = coordination.program;
  const applicationUrl = validUrl(program?.applicationUrl);
  const selected = Boolean(program);
  let status = "unsupported";
  let statusLabel = "No state benefit estimate included";
  let statusMessage = "No state benefit estimate is included for these details.";
  if (selected && coordination.applicable) {
    status = "applicable";
    statusLabel = "Included in this planning estimate";
    statusMessage = "This state benefit may be included in the planning estimate. Official eligibility and award decisions are made by the applicable agencies.";
  } else if (selected && coordination.futureProgram) {
    status = "future";
    statusLabel = "Not yet available";
    statusMessage = "Benefits are not yet available for these leave dates.";
  } else if (selected && !coordination.categoryCovered) {
    status = "not-covered";
    statusLabel = "Not included for this type of leave";
    statusMessage = "This state program does not cover this type of leave.";
  } else if (selected && coordination.programStatus !== "Active") {
    status = "inactive";
    statusLabel = "Not currently available";
  } else if (selected && (!coordination.leaveStart || !coordination.payPeriodFromDate || !coordination.payPeriodThroughDate)) {
    status = "dates-missing";
    statusLabel = "Dates need confirmation";
    statusMessage = "Confirm your leave dates before a state benefit estimate can be calculated.";
  }
  const applicationAction = selected && coordination.applicable && program.applicationOwner === "Employee" && applicationUrl
    ? { label: "Apply through the state program", url: applicationUrl }
    : null;
  return {
    stateCode: coordination.state,
    programName: program?.programName || null,
    status,
    statusLabel,
    statusMessage,
    weeklyMaximum: coordination.applicable ? program.maximumWeeklyBenefit : null,
    maximumYear: coordination.applicable ? program.maximumYear : null,
    calculatedMaximum: coordination.applicable ? coordination.applicableMaximum : null,
    coveredDays: coordination.applicable ? coordination.eligibleDays : null,
    coveredLeaveLabel: categoryLabels[coordination.category] || null,
    eligibilitySummary: program?.eligibilityDescription || null,
    officialProgramUrl: validUrl(program?.officialProgramUrl),
    applicationUrl,
    applicationAction,
    administrationMessage: program?.applicationOwner === "Employee" ? "You may need to apply directly through the state program." : program?.applicationOwner === "Lincoln Financial" ? "Lincoln Financial will help manage this state benefit as part of your leave claim." : "Review the official state website and confirm the application steps with Lincoln Financial.",
    estimateExplanation: "This planning estimate initially uses the applicable state program maximum. State benefits may replace part of the Short-Term Disability payment. They do not increase pay above the coordinated-pay target.",
    concurrentLeaveExplanation: "Federal, state, and company leave may run at the same time. These programs can provide different types of leave protection or pay, and each program makes its own official determination.",
    awardExplanation: "After the state award is confirmed, submit the award information through Lincoln Financial’s process. Lincoln may adjust the Short-Term Disability amount if the actual state award differs from the estimate.",
    awardStatus: coordination.applicable ? coordination.awardStatus : null,
    stateAwardReported: coordination.applicable ? coordination.actualStateAward : null,
    estimatedAdjustment: coordination.applicable ? coordination.lincolnReconciliation : null,
  };
};
