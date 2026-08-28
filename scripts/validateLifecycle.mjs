import assert from "node:assert/strict";
import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import { getEmployeeLifecycle } from "../src/data/lifecycleUtils.js";
const EXPECTED_STAGE_IDS = [
  "pre-leave",
  "documentation",
  "business-handoff",
  "on-leave",
  "return-to-work",
  "first-day-back",
  "after-return",
];
const EXPECTED_STAGE_TITLES = [
  "Apply for Leave",
  "Complete Documentation",
  "Prepare for Leave",
  "While You Are on Leave",
  "Plan Your Return",
  "Your First Day Back",
  "After Your Return",
];
const profile = (first, last, id) =>
  getVerifiedEmployeeProfile(first, last, id);

const validate = (employee) => {
  const lifecycle = getEmployeeLifecycle(employee, {
    asOfDate: "2026-08-26",
  });
  assert.equal(lifecycle.stages.length, 7);

  assert.deepEqual(
    lifecycle.stages.map((stage) => stage.id),
    EXPECTED_STAGE_IDS,
  );
  assert.deepEqual(
    lifecycle.stages.map((stage) => stage.title),
    EXPECTED_STAGE_TITLES,
  );
  assert.equal(
    new Set(lifecycle.stages.map((stage) => stage.id)).size,
    7,
  );
  const stageItems = lifecycle.stages.flatMap((stage) =>
    stage.items.map((task) => ({
      stageId: stage.id,
      ...task,
    })),
  );
  assert.equal(
    new Set(stageItems.map((task) => task.id)).size,
    stageItems.length,
  );
  assert(stageItems.every((task) => task.owner));
  assert(stageItems.every((task) => !Object.hasOwn(task, "checked")));
  assert(lifecycle.stages.every((stage) => stage.items.length > 0));
  const lifecycleText = JSON.stringify(lifecycle);

  assert(
    !lifecycleText.match(
      /diagnos|symptom|treatment|claim number|medical record|HRBP|first 30 days/i,
    ),
  );
  const delegationTasks = stageItems.filter((task) =>
    `${task.title} ${task.description}`.match(/Workday|Ramp/i),
  );
  assert.deepEqual(
    new Set(delegationTasks.map((task) => task.stageId)),
    new Set(["business-handoff", "first-day-back"]),
  );
  const applyStage = lifecycle.stages.find(
    (stage) => stage.id === "pre-leave",
  );
  assert.equal(applyStage.items.length, 2);
  assert(
    applyStage.items.some((task) => task.id === "apply-for-leave"),
  );
  assert(
    applyStage.items.some((task) => task.id === "tell-manager"),
  );
  const documentationStage = lifecycle.stages.find(
    (stage) => stage.id === "documentation",
  );
  assert(
    documentationStage.items.some((task) =>
      task.description.includes("15 calendar days"),
    ),
  );
  assert(
    documentationStage.items.some(
      (task) => task.id === "request-more-time",
    ),
  );
  const prepareStage = lifecycle.stages.find(
    (stage) => stage.id === "business-handoff",
  );
  assert(
    prepareStage.items.some((task) => task.id === "complete-handoff"),
  );
  assert(
    prepareStage.items.some((task) => task.id === "set-delegations"),
  );
  assert(
    prepareStage.items.some(
      (task) => task.id === "prepare-out-of-office",
    ),
  );
  const returnStage = lifecycle.stages.find(
    (stage) => stage.id === "return-to-work",
  );
  assert(
    returnStage.items.some((task) => task.id === "consider-extension"),
  );
  assert(
    returnStage.items.some(
      (task) => task.id === "confirm-return-date",
    ),
  );
  assert(
    !JSON.stringify(returnStage).match(
      /system access|Workday|Ramp|first 30 days/i,
    ),
  );
  const firstDayStage = lifecycle.stages.find(
    (stage) => stage.id === "first-day-back",
  );
  assert(
    firstDayStage.items.some(
      (task) => task.id === "check-system-access",
    ),
  );
  assert(
    firstDayStage.items.some(
      (task) => task.id === "connect-manager",
    ),
  );
  assert(
    firstDayStage.items.some(
      (task) => task.id === "remove-delegations",
    ),
  );
  const afterReturnStage = lifecycle.stages.find(
    (stage) => stage.id === "after-return",
  );
  assert.equal(afterReturnStage.items.length, 1);
  assert.equal(
    afterReturnStage.items[0].id,
    "post-return-survey",
  );
  return lifecycle;
};

const minnie = validate(
  profile("Minnie", "Mouse", "700002"),
);
assert.equal(minnie.suggestedStageId, "after-return");

assert(
  minnie.stages
    .find((stage) => stage.id === "return-to-work")
      .items.some((task) => task.id === "confirm-return-date"),
);
const ernest = validate(
  profile("Ernest", "Hemingway", "700111"),
);
assert.equal(ernest.suggestedStageId, "pre-leave");

const documentation = validate({
  currentReportStatus: "PE",
  dateReceived: "2026-08-03",
  sourceRecords: [{ sourceSheet: "Combined Status" }],
});
assert.equal(
  documentation.suggestedStageId,
  "documentation",
);
const incomplete = validate({
  sourceRecords: [{ leaveEndDate: "2026-09-01", estimatedRTW: "2026-09-10" }],
});
assert.equal(incomplete.hasSuggestedStage, false);
assert.equal(incomplete.suggestedStageId, null);
assert.equal(incomplete.stages[0].id, "pre-leave");
const ambiguous = validate({
  sourceRecords: [
    {
      sourceSheet: "Unknown",
      statusCode: "XY",
    },
  ],
});
assert.equal(ambiguous.hasSuggestedStage, false);

assert(
  ambiguous.suggestedStageBasis.includes("not enough reliable date information"),
);
assert.equal(
  getEmployeeLifecycle(
    {
      sourceRecords: [
        { estimatedRTW: "2027-01-01" },
        { leaveBeginDate: "2026-09-01" },
      ],
    },
    { asOfDate: "2026-08-26" },
  ).suggestedStageId,
  "pre-leave",
);

console.log("Seven-stage lifecycle model validation passed.");