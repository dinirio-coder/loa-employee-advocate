import { getLifecycleStageDecision } from "./lifecycleStageEngine.js";

const MY_LINCOLN_URL = "https://www.mylincolnportal.com/";

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

const actionsByStage = {
  "pre-leave": (basis) => [
    action("apply-for-leave", "Apply for leave", "Apply through MyLincoln Portal or contact Lincoln Financial for help starting your request.", "As soon as you know you may need leave", "Employee", MY_LINCOLN_URL, basis, "High"),
    action("tell-manager", "Tell your manager", "Share your expected leave start date with your manager. You do not need to provide medical details.", "After starting your leave request", "Employee", null, basis),
  ],
  documentation: (basis) => [
    action("documentation-review-messages", "Review Lincoln’s messages", "Check MyLincoln Portal and your email for documentation instructions.", "Next step", "Employee", MY_LINCOLN_URL, basis, "High"),
    action("documentation-understand-request", "Understand what is required", "Review the forms, information, and deadline listed in Lincoln’s message.", "When Lincoln sends the request", "Employee", MY_LINCOLN_URL, basis, "High"),
    action("documentation-submit", "Submit your documentation", "Submit the requested documentation by Lincoln’s deadline, usually within 15 calendar days.", "By the deadline shown by Lincoln", "Employee", MY_LINCOLN_URL, basis, "High"),
    action("documentation-more-time", "Contact Lincoln if you need more time", "Contact Lincoln promptly if you may not be able to meet the documentation deadline.", "Before the deadline", "Employee", MY_LINCOLN_URL, basis, "High"),
  ],
  "business-handoff": (basis) => [
    action("prepare-handoff", "Complete your work handoff", "Review priorities, coverage, and important contacts with your manager.", "About 3 days before leave", "Employee", null, basis, "High"),
    action("prepare-delegations", "Set Workday and Ramp delegations", "Confirm the correct people and activation dates for your delegations.", "About 3 days before leave", "Employee", null, basis, "High"),
    action("prepare-out-of-office", "Prepare your out-of-office message", "Add your leave dates and backup contact without including medical or claim details.", "About 3 days before leave", "Employee", null, basis),
  ],
  "on-leave": (basis) => [
    action("monitor-lincoln", "Check for Lincoln updates", "Review MyLincoln Portal and your email for important claim updates.", "During leave", "Employee", MY_LINCOLN_URL, basis, "High"),
    action("complete-lincoln-actions", "Complete requested actions", "Respond to Lincoln if additional information or another action is requested.", "By the date shown in Lincoln’s message", "Employee", MY_LINCOLN_URL, basis, "High"),
  ],
  "return-to-work": (basis) => [
    action("return-consider-extension", "Decide whether you may need an extension", "Review whether you expect to return on the currently planned date.", "About 2 weeks before your expected return", "Employee", null, basis, "High"),
    action("return-contact-lincoln", "Contact Lincoln if you need an extension", "Use MyLincoln Portal or contact Lincoln promptly if your return date may change.", "As soon as you know your return date may change", "Employee", MY_LINCOLN_URL, basis, "High"),
    action("return-confirm-date", "Confirm your return date", "Confirm your expected return date with Lincoln Financial and your manager.", "Before your return", "Employee", MY_LINCOLN_URL, basis, "High"),
  ],
  "first-day-back": (basis) => [
    action("check-system-access", "Check your system access", "Confirm that you can access the systems you need for work.", "Your first day back", "Employee", null, basis, "High"),
    action("connect-manager", "Connect with your manager", "Meet with your manager to confirm your return and discuss immediate priorities.", "Your first day back", "Employee", null, basis, "High"),
    action("review-priorities", "Review priorities and meetings", "Review current priorities, calendar changes, and upcoming meetings.", "Your first day back", "Employee", null, basis),
    action("remove-delegations", "Remove Workday and Ramp delegations", "Remove or update the delegations that were used during your leave.", "Your first day back", "Employee", null, basis),
  ],
  "after-return": (basis) => [
    action("post-return-survey", "Complete the post-return survey", "Share brief feedback about your leave and return experience.", "After returning to work", "Employee", null, basis),
  ],
};

const fallbackActions = (basis) => [
  action("review-lincoln-messages", "Review Lincoln’s messages", "Check MyLincoln Portal and your email for your latest leave status and next steps.", "Next step", "Employee", MY_LINCOLN_URL, basis, "High"),
  action("confirm-leave-dates", "Confirm your leave dates", "Contact Lincoln if your leave start date, expected return date, approval, or closure is unresolved.", "Next step", "Employee", MY_LINCOLN_URL, basis, "High"),
  action("track-your-todos", "Track your to-dos", "Use Your Leave Journey to review the steps that apply to your leave.", "As needed", "Employee", null, basis),
];

export const getEmployeePriorityActions = (employee, options = {}) => {
  const decision = getLifecycleStageDecision(employee, options);
  return actionsByStage[decision.stageId]?.(decision.reason) || fallbackActions(decision.reason);
};
