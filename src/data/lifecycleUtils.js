import { getLifecycleStageDecision } from "./lifecycleStageEngine.js";

const MY_LINCOLN_URL = "https://www.mylincolnportal.com/";

const item = (
  id,
  title,
  description,
  owner,
  destination,
  timing,
  dependency = null,
) => ({
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
    shortLabel: "Apply",
    title: "Apply for Leave",
    timeframe: "As soon as you know you may need leave",
    description:
      "Start your leave request with Lincoln Financial and tell your manager about the expected timing.",
    accent: "cyan",
  },
  {
    id: "documentation",
    number: 2,
    shortLabel: "Documents",
    title: "Complete Documentation",
    timeframe: "After applying for leave",
    description:
      "Review Lincoln’s messages and submit requested documentation by the stated deadline.",
    accent: "amber",
  },
  {
    id: "business-handoff",
    number: 3,
    shortLabel: "Prepare",
    title: "Prepare for Leave",
    timeframe: "About 3 days before leave",
    description:
      "Complete your work handoff, delegations, and out-of-office preparation.",
    accent: "violet",
  },
  {
    id: "on-leave",
    number: 4,
    shortLabel: "On Leave",
    title: "While You Are on Leave",
    timeframe: "During your leave",
    description:
      "Monitor Lincoln’s messages and complete any requested actions.",
    accent: "cyan",
  },
  {
    id: "return-to-work",
    number: 5,
    shortLabel: "Plan Return",
    title: "Plan Your Return",
    timeframe: "About 2 weeks before your expected return",
    description:
      "Confirm your expected return date or contact Lincoln if you may need an extension.",
    accent: "amber",
  },
  {
    id: "first-day-back",
    number: 6,
    shortLabel: "First Day",
    title: "Your First Day Back",
    timeframe: "Your first day back",
    description:
      "Check your access, reconnect with your manager, and review your priorities.",
    accent: "green",
  },
  {
    id: "after-return",
    number: 7,
    shortLabel: "After Return",
    title: "After Your Return",
    timeframe: "After returning to work",
    description:
      "Share feedback about your leave and return experience.",
    accent: "violet",
  },
];

export const getEmployeeLifecycle = (employee, options = {}) => {
  const stageDecision = getLifecycleStageDecision(employee, options);
  const suggestedStageId = stageDecision.stageId;
  const suggestedStageBasis = stageDecision.reason;

  const stages = LIFECYCLE_STAGE_DEFINITIONS.map((stage) => ({
    ...stage,
    status:
      stage.id === suggestedStageId ? "suggested" : "available",
    basis:
      stage.id === suggestedStageId
        ? suggestedStageBasis
        : "Review this stage when it applies to your leave.",
    items: [],
  }));

  stages[0].items = [
    item(
      "apply-for-leave",
      "Apply for leave",
      "Apply through MyLincoln Portal or contact Lincoln Financial for help starting your request.",
      "Employee",
      MY_LINCOLN_URL,
      "As soon as you know you may need leave",
    ),
    item(
      "tell-manager",
      "Tell your manager",
      "Share your expected leave start date with your manager. You do not need to provide medical details.",
      "Employee",
      null,
      "After starting your leave request",
    ),
  ];

  stages[1].items = [
    item(
      "review-lincoln-messages",
      "Review Lincoln’s messages",
      "Check MyLincoln Portal and your email for documentation instructions.",
      "Employee",
      MY_LINCOLN_URL,
      "After applying",
    ),
    item(
      "understand-documentation",
      "Understand what is required",
      "Review the forms, information, and deadline listed in Lincoln’s message.",
      "Employee",
      MY_LINCOLN_URL,
      "When Lincoln sends the request",
    ),
    item(
      "submit-documentation",
      "Submit your documentation",
      "Submit the requested documentation by Lincoln’s deadline, usually within 15 calendar days.",
      "Employee",
      MY_LINCOLN_URL,
      "By the deadline shown by Lincoln",
    ),
    item(
      "request-more-time",
      "Contact Lincoln if you need more time",
      "Contact Lincoln promptly if you may not be able to meet the documentation deadline.",
      "Employee",
      MY_LINCOLN_URL,
      "Before the deadline",
    ),
  ];

  stages[2].items = [
    item(
      "complete-handoff",
      "Complete your work handoff",
      "Review priorities, coverage, and important contacts with your manager.",
      "Employee",
      null,
      "About 3 days before leave",
    ),
    item(
      "set-delegations",
      "Set Workday and Ramp delegations",
      "Confirm the correct people and activation dates for your delegations.",
      "Employee",
      null,
      "About 3 days before leave",
    ),
    item(
      "prepare-out-of-office",
      "Prepare your out-of-office message",
      "Add your leave dates and backup contact without including medical or claim details.",
      "Employee",
      null,
      "About 3 days before leave",
    ),
  ];

  stages[3].items = [
    item(
      "monitor-lincoln",
      "Check for Lincoln updates",
      "Review MyLincoln Portal and your email for important claim updates.",
      "Employee",
      MY_LINCOLN_URL,
      "During leave",
    ),
    item(
      "complete-lincoln-actions",
      "Complete requested actions",
      "Respond to Lincoln if additional information or another action is requested.",
      "Employee",
      MY_LINCOLN_URL,
      "By the date shown in Lincoln’s message",
    ),
  ];

  stages[4].items = [
    item(
      "consider-extension",
      "Decide whether you may need an extension",
      "Review whether you expect to return on the currently planned date.",
      "Employee",
      null,
      "About 2 weeks before your expected return",
    ),
    item(
      "contact-lincoln-extension",
      "Contact Lincoln if you need an extension",
      "Use MyLincoln Portal or contact Lincoln promptly if your return date may change.",
      "Employee",
      MY_LINCOLN_URL,
      "As soon as you know your return date may change",
    ),
    item(
      "confirm-return-date",
      "Confirm your return date",
      "Confirm your expected return date with Lincoln Financial and your manager.",
      "Employee",
      MY_LINCOLN_URL,
      "Before your return",
      stageDecision.normalizedDates.expectedReturn || stageDecision.normalizedDates.actualReturn
        ? "Return information is available."
        : "Your return date still needs confirmation.",
    ),
  ];

  stages[5].items = [
    item(
      "check-system-access",
      "Check your system access",
      "Confirm that you can access the systems you need for work.",
      "Employee",
      null,
      "Your first day back",
    ),
    item(
      "connect-manager",
      "Connect with your manager",
      "Meet with your manager to confirm your return and discuss immediate priorities.",
      "Employee",
      null,
      "Your first day back",
    ),
    item(
      "review-priorities",
      "Review priorities and meetings",
      "Review current priorities, calendar changes, and upcoming meetings.",
      "Employee",
      null,
      "Your first day back",
    ),
    item(
      "remove-delegations",
      "Remove Workday and Ramp delegations",
      "Remove or update the delegations that were used during your leave.",
      "Employee",
      null,
      "Your first day back",
    ),
  ];

  stages[6].items = [
    item(
      "post-return-survey",
      "Complete the post-return survey",
      "Share brief feedback about your leave and return experience.",
      "Employee",
      null,
      "After returning to work",
    ),
  ];

  return {
    suggestedStageId,
    suggestedStageBasis,
    hasSuggestedStage: Boolean(suggestedStageId),
    stageDecision,
    dataQuality: stageDecision.dataQuality,
    stages,
  };
};
