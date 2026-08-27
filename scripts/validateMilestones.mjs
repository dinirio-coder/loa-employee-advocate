import assert from "node:assert/strict";
import { DEMO_SCENARIOS } from "../src/data/demoScenarios.js";
import { getEmployeeNextMilestone } from "../src/data/milestoneUtils.js";

const asOfDate = "2026-08-27";
const milestone = (scenario) => getEmployeeNextMilestone(scenario, { asOfDate });
const expected = {
  futureLeave: "Apply for leave with Lincoln",
  pendingDocumentation: "Submit requested documentation",
  leaveInThreeDays: "Complete your leave preparation",
  currentlyOnLeave: "Review Lincoln updates",
  expectedReturnInFourteenDays: "Confirm your return date",
  expectedReturnInFifteenDays: "Review Lincoln updates",
  expectedReturnToday: "Check your access and connect with your manager",
  actualReturnToday: "Check your access and connect with your manager",
  actualReturnYesterday: "Complete the post-return survey",
  pastExpectedReturn: "Request an extension",
  overlappingRecords: "Confirm your leave dates with Lincoln",
};
for (const [name, label] of Object.entries(expected)) assert.equal(milestone(DEMO_SCENARIOS[name]).label, label, name);
assert.equal(milestone(DEMO_SCENARIOS.leaveInThreeDays).date, "2026-08-27");
assert.equal(milestone(DEMO_SCENARIOS.pendingDocumentation).date, null);
assert.match(milestone(DEMO_SCENARIOS.pendingDocumentation).basis, /15 calendar days/);
const withDeadline = { ...DEMO_SCENARIOS.pendingDocumentation, sourceRecords: [{ ...DEMO_SCENARIOS.pendingDocumentation.sourceRecords[0], documentationDeadline: "2026-09-05" }] };
assert.equal(milestone(withDeadline).date, "2026-09-05");
assert.equal(milestone(DEMO_SCENARIOS.pastExpectedReturn).status, "overdue");
assert.equal(milestone(DEMO_SCENARIOS.expectedReturnInFourteenDays).date, "2026-09-10");
assert.equal(milestone(DEMO_SCENARIOS.expectedReturnToday).status, "today");
assert.deepEqual(milestone(DEMO_SCENARIOS.currentlyOnLeave), milestone(DEMO_SCENARIOS.currentlyOnLeave));
for (const scenario of Object.values(DEMO_SCENARIOS)) { const result = milestone(scenario); if (result.date) assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/); }
console.log("Stage-aware milestone validation passed.");
