import { getEmployeePayTimeline } from "./payTimelineUtils.js";

const cents = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const getEmployeePayExperience = (employee, options = {}) => {
  const model = getEmployeePayTimeline(employee, options);
  const planning = model.planningEstimate;
  const stateBenefit = model.stateBenefit;
  const stateProgram = stateBenefit.applicable && stateBenefit.program?.programType === "MEDICAL" && stateBenefit.assumedStateOffset > 0
    ? { name: stateBenefit.program.programName, weeklyMaximum: cents(stateBenefit.program.maximumWeeklyBenefit), calculatedMaximum: cents(stateBenefit.applicableMaximum), eligibleDays: stateBenefit.eligibleDays }
    : null;
  const components = [];
  const isParental = model.payScenario === "parental";
  if (isParental && model.hasPayData) {
    components.push({ label: "Paid parental leave estimate", amount: cents(model.sourcePayValues?.biweeklySalary), explanation: "The planning estimate is based on 100% of eligible base pay, subject to applicable policy and payroll processing." });
  } else if (planning) {
    if (stateProgram) components.push({ label: "State benefit estimate", amount: stateBenefit.assumedStateOffset, explanation: "Planning estimate. State benefits replace part of the coordinated Short-Term Disability amount." });
    components.push({ label: "Short-Term Disability estimate", amount: stateBenefit.lincolnAfterStateOffset, explanation: "Planning estimate. Lincoln administers the Short-Term Disability calculation." });
    const topUp = cents(Math.max(planning.basePayTarget - stateBenefit.assumedStateOffset - stateBenefit.lincolnAfterStateOffset, 0));
    components.push({ label: "Twilio salary top-up estimate", amount: topUp, explanation: "Planning estimate toward your coordinated pay target." });
  }
  const coordinatedTotal = components.reduce((total, component) => total + component.amount, 0);
  const stateAdjustmentVisible = Boolean(stateBenefit.applicable || stateBenefit.assumedStateOffset > 0 || stateBenefit.actualStateAward !== null);
  return {
    hasPayData: model.hasPayData,
    scenario: model.payScenario,
    notice: model.hasPayData ? "Planning estimate—not a payment guarantee" : "Some pay information is unavailable. Lincoln or Twilio Payroll can confirm the details.",
    payPeriod: model.payPeriod ? { from: model.payPeriod.from, through: model.payPeriod.through } : null,
    payPeriodLabel: model.payPeriod ? "Estimated pay for this pay period" : null,
    coordinatedPayTarget: planning?.basePayTarget ?? (isParental ? cents(model.sourcePayValues?.biweeklySalary) : null),
    components,
    stateProgram,
    coordinatedTotal: cents(coordinatedTotal),
    formula: !isParental && planning ? "66.67% Short-Term Disability estimate + 33.33% Twilio salary top-up estimate. Applicable state benefits may replace part of the Short-Term Disability estimate during coordination." : null,
    waitingPeriodGuidance: !isParental && planning ? "The first seven calendar days are the Short-Term Disability waiting period. This planning estimate assumes 100% Twilio salary continuation for eligible base pay during that period." : null,
    paymentDelivery: "Lincoln administers the Short-Term Disability calculation. When applicable, the coordinated Short-Term Disability amount and Twilio salary top-up are delivered through Twilio Payroll, so you should not expect a separate Lincoln check for those components. A state benefit may be paid separately by the state or program administrator.",
    stateAdjustment: stateAdjustmentVisible ? { awardStatus: stateBenefit.awardStatus, estimatedStateBenefit: stateBenefit.assumedStateOffset, stateAwardReported: stateBenefit.actualStateAward, estimatedAdjustment: stateBenefit.lincolnReconciliation } : null,
    jobProtectionGuidance: "Wage-replacement benefits may provide pay while you are away. Job-protection programs—such as the Family and Medical Leave Act, applicable state leave, or company leave—protect eligible time away but do not add another payment to your paycheck.",
    missingInformation: model.missingInformation.map((message) => message.replace(/source report|source record/gi, "available information").replace(/product classification/gi, "leave type")),
  };
};
