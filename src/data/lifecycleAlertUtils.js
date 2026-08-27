import { getLifecycleStageDecision } from "./lifecycleStageEngine.js";

const MY_LINCOLN_URL = "https://www.mylincolnportal.com/";

export const getEmployeeLifecycleAlerts = (employee, options = {}) => {
  const { flags } = getLifecycleStageDecision(employee, options);
  const alerts = [];
  if (flags.pendingNearReturn) alerts.push({ id: "pending-near-return", severity: "high", title: "Contact Lincoln before your return", description: "Your return date is approaching and your Lincoln claim is still pending. Check MyLincoln Portal or contact Lincoln to confirm what remains needed.", actionLabel: "Open MyLincoln Portal", destination: MY_LINCOLN_URL });
  if (flags.pendingAfterReturn) alerts.push({ id: "pending-after-return", severity: "high", title: "Contact Lincoln about your open claim", description: "Your return date has passed and your Lincoln claim may still need follow-up. Contact Lincoln to confirm approval or closure.", actionLabel: "Open MyLincoln Portal", destination: MY_LINCOLN_URL });
  if (flags.expectedReturnOverdue) alerts.push({ id: "expected-return-overdue", severity: "high", title: "Confirm your return date", description: "Your expected return date has passed, but an actual return date is not available. Update or confirm your return date with Lincoln and your manager.", actionLabel: "Open MyLincoln Portal", destination: MY_LINCOLN_URL });
  if (flags.needsDateConfirmation) alerts.push({ id: "needs-date-confirmation", severity: "high", title: "Confirm your leave dates", description: "Some leave dates need confirmation before the next stage can be identified. Review MyLincoln Portal or contact Lincoln.", actionLabel: "Open MyLincoln Portal", destination: MY_LINCOLN_URL });
  if (flags.futureActualReturn) alerts.push({ id: "future-actual-return", severity: "normal", title: "Confirm your return information", description: "The available return information needs confirmation. Review the date with Lincoln.", actionLabel: "Open MyLincoln Portal", destination: MY_LINCOLN_URL });
  return alerts;
};
