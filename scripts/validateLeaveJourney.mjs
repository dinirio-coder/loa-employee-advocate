import assert from "node:assert/strict";
import { DEMO_SCENARIOS } from "../src/data/demoScenarios.js";
import { getEmployeeLeaveJourney } from "../src/data/leaveJourneyUtils.js";

const asOfDate = "2026-08-27";
const journey = (employee) => getEmployeeLeaveJourney(employee, { asOfDate });
const expectedStages = {
  futureLeave: "pre-leave",
  pendingDocumentation: "documentation",
  leaveInThreeDays: "business-handoff",
  currentlyOnLeave: "on-leave",
  expectedReturnInFourteenDays: "return-to-work",
  actualReturnToday: "first-day-back",
};
for (const [scenario, stageId] of Object.entries(expectedStages)) assert.equal(journey(DEMO_SCENARIOS[scenario]).currentStageId, stageId, scenario);
const afterReturn = journey({ sourceRecords: [{ sourceSheet: "Twilio - Weekly Combined Status", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-20", actualRTW: "2026-08-26" }] });
assert.equal(afterReturn.currentStageId, "after-return");
assert.equal(afterReturn.segments.find((item) => item.id === "after-return")?.label, "After Return");
const std = journey({ leaveProduct: "STD", sourceRecords: [{ sourceSheet: "Twilio - Weekly Combined Status", leaveBeginDate: "2026-09-10", leaveEndDate: "2026-09-30" }] });
assert(std.segments.some((item) => item.id === "waiting-period"));
const parental = journey({ leaveProduct: "PLCOB", sourceRecords: [{ sourceSheet: "Twilio - Weekly Combined Status", leaveBeginDate: "2026-09-10", leaveEndDate: "2026-09-30" }] });
assert(!parental.segments.some((item) => item.id === "waiting-period"));
assert.equal(parental.segments.find((item) => item.id === "active-leave").endDate, "2026-09-30");
for (const scenario of [DEMO_SCENARIOS.missingDates, DEMO_SCENARIOS.overlappingRecords, DEMO_SCENARIOS.endBeforeStart]) {
  const result = journey(scenario);
  assert.equal(result.dateStatus, "needs-confirmation");
  assert.equal(result.segments.length, 0);
  assert.equal(result.message, "Your leave dates need confirmation before the full journey can be displayed.");
}
assert.notDeepEqual(journey(DEMO_SCENARIOS.futureLeave), journey(DEMO_SCENARIOS.currentlyOnLeave));
for (const result of [std, parental, afterReturn]) {
  const output = JSON.stringify(result);
  assert(!/sourceSheet|claimNumber|leaveReason|owner|rawCode|selectionMetadata/i.test(output));
  assert(!output.match(/NaN|undefined|negative-width/));
  assert(result.segments.every((item) => item.days > 0));
}
console.log("Employee-safe leave journey presentation-model validation passed.");