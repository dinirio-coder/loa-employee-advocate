import assert from "node:assert/strict";
import { DEMO_SCENARIOS } from "../src/data/demoScenarios.js";
import { getEmployeeReturnToWorkExperience } from "../src/data/returnToWorkExperience.js";

const options = { asOfDate: "2026-08-27" };
const view = (name) => getEmployeeReturnToWorkExperience(DEMO_SCENARIOS[name], options);
const portal = "https://www.mylincolnportal.com/";
assert.equal(view("expectedReturnInFifteenDays").viewId, "not-yet");
assert.equal(view("expectedReturnInFourteenDays").viewId, "plan-return");
assert.equal(view("expectedReturnToday").viewId, "first-day-back");
assert.equal(view("expectedReturnToday").confirmationRequired, true);
assert.equal(view("actualReturnToday").viewId, "first-day-back");
assert.equal(view("actualReturnYesterday").viewId, "after-return");
assert.equal(view("pastExpectedReturn").viewId, "date-confirmation");
assert.equal(view("pendingClaimNearReturn").viewId, "plan-return");
assert.equal(view("pendingClaimAfterReturn").viewId, "after-return");
assert.equal(view("overlappingRecords").viewId, "date-confirmation");
assert.equal(view("futureActualReturn").viewId, "not-yet");
for (const name of ["plan", "first", "after", "date"]) {
  const result = Object.values(DEMO_SCENARIOS).map((scenario) => getEmployeeReturnToWorkExperience(scenario, options));
  assert.deepEqual(result, Object.values(DEMO_SCENARIOS).map((scenario) => getEmployeeReturnToWorkExperience(scenario, options)));
}
for (const name of ["expectedReturnInFourteenDays", "expectedReturnToday", "actualReturnToday", "actualReturnYesterday", "pastExpectedReturn", "pendingClaimNearReturn", "pendingClaimAfterReturn", "overlappingRecords"]) {
  for (const action of view(name).actions) if (action.destination) assert.equal(action.destination, portal);
}
assert(!JSON.stringify(view("pendingClaimNearReturn")).match(/eligible|approved|guaranteed|entitled|source|owner|claim.?number|diagnos|treatment/i));
assert.equal(view("currentlyOnLeave").flexReturn.show, false);
console.log("Return-to-work experience validation passed.");
