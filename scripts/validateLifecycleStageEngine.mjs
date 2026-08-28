import assert from "node:assert/strict";
import { DEMO_SCENARIOS } from "../src/data/demoScenarios.js";
import { getLifecycleStageDecision, normalizeLifecycleStatus } from "../src/data/lifecycleStageEngine.js";

const asOfDate = "2026-08-27";
const expectedStages = {
  futureLeave: "pre-leave",
  leaveInThreeDays: "business-handoff",
  leaveToday: "on-leave",
  pendingDocumentation: "documentation",
  currentlyOnLeave: "on-leave",
  expectedReturnInFourteenDays: "return-to-work",
  expectedReturnInFifteenDays: "on-leave",
  expectedReturnToday: "first-day-back",
  actualReturnToday: "first-day-back",
  actualReturnYesterday: "after-return",
  pendingClaimNearReturn: "return-to-work",
  pendingClaimAfterReturn: "after-return",
  pastExpectedReturn: "return-to-work",
  exactDuplicateRecords: "return-to-work",
  overlappingRecords: null,
  endBeforeStart: null,
  missingDates: null,
  conflictingExpectedReturns: null,
  futureActualReturn: "on-leave",
};

for (const [name, employee] of Object.entries(DEMO_SCENARIOS)) {
  const decision = getLifecycleStageDecision(employee, { asOfDate });
  const repeated = getLifecycleStageDecision(employee, { asOfDate });
  assert.equal(decision.stageId, expectedStages[name], name);
  assert.deepEqual(decision, repeated, `${name} is not deterministic`);
  assert(!JSON.stringify(decision).match(/diagnos|symptom|treatment|claim.?number|medical.?record/i), `${name} contains sensitive metadata`);
}

const duplicate = getLifecycleStageDecision(DEMO_SCENARIOS.exactDuplicateRecords, { asOfDate });
assert.equal(duplicate.dataQuality.exactDuplicatesRemoved, 1);
assert.equal(duplicate.flags.needsDateConfirmation, false);

const overlap = getLifecycleStageDecision(DEMO_SCENARIOS.overlappingRecords, { asOfDate });
assert.equal(overlap.dataQuality.overlappingRecords.length, 1);
assert.equal(overlap.flags.needsDateConfirmation, true);

const invalid = getLifecycleStageDecision(DEMO_SCENARIOS.endBeforeStart, { asOfDate });
assert.equal(invalid.dataQuality.invalidDateOrder, true);
assert.equal(invalid.flags.needsDateConfirmation, true);
assert.equal(invalid.normalizedDates.leaveStart, null);
assert.equal(invalid.normalizedDates.leaveEnd, null);

const overdue = getLifecycleStageDecision(DEMO_SCENARIOS.pastExpectedReturn, { asOfDate });
assert.equal(overdue.flags.expectedReturnOverdue, true);

const nearReturn = getLifecycleStageDecision(DEMO_SCENARIOS.pendingClaimNearReturn, { asOfDate });
assert.equal(nearReturn.flags.pendingNearReturn, true);
assert.equal(nearReturn.stageId, "return-to-work");

const afterReturn = getLifecycleStageDecision(DEMO_SCENARIOS.pendingClaimAfterReturn, { asOfDate });
assert.equal(afterReturn.flags.pendingAfterReturn, true);
assert.equal(afterReturn.stageId, "after-return");

const futureActual = getLifecycleStageDecision(DEMO_SCENARIOS.futureActualReturn, { asOfDate });
assert.equal(futureActual.dataQuality.futureActualReturn, true);
assert.equal(futureActual.stageId, "on-leave");

assert.equal(normalizeLifecycleStatus("PE"), "PENDING");
assert.equal(normalizeLifecycleStatus("PENDING"), "PENDING");
assert.equal(normalizeLifecycleStatus("PEND"), "PENDING");
assert.equal(normalizeLifecycleStatus("IP"), "PENDING");
assert.equal(normalizeLifecycleStatus("AP"), "APPROVED");
assert.equal(normalizeLifecycleStatus("CL"), "CLOSED");
assert.equal(normalizeLifecycleStatus("DE"), "DENIED");
assert.equal(normalizeLifecycleStatus("VD"), "CANCELED");
assert.equal(normalizeLifecycleStatus("UNKNOWN_CODE"), "UNKNOWN");

console.log("Deterministic lifecycle stage engine validation passed.");
