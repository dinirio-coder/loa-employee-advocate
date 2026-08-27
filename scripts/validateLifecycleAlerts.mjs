import assert from "node:assert/strict";
import { DEMO_SCENARIOS } from "../src/data/demoScenarios.js";
import { getEmployeeLifecycleAlerts } from "../src/data/lifecycleAlertUtils.js";

const asOfDate = "2026-08-27";
const alerts = (name) => getEmployeeLifecycleAlerts(DEMO_SCENARIOS[name], { asOfDate });
const titles = (name) => alerts(name).map((alert) => alert.title);
assert.deepEqual(titles("pendingClaimNearReturn"), ["Contact Lincoln before your return"]);
assert.deepEqual(titles("pendingClaimAfterReturn"), ["Contact Lincoln about your open claim"]);
assert.deepEqual(titles("pastExpectedReturn"), ["Confirm your return date"]);
assert.deepEqual(titles("overlappingRecords"), ["Confirm your leave dates"]);
assert.deepEqual(titles("futureActualReturn"), ["Confirm your return information"]);
assert.deepEqual(titles("expectedReturnInFifteenDays"), []);
assert.deepEqual(titles("currentlyOnLeave"), []);
for (const name of ["pendingClaimNearReturn", "pendingClaimAfterReturn", "pastExpectedReturn", "overlappingRecords", "futureActualReturn"]) {
  const result = alerts(name);
  assert.equal(new Set(result.map((alert) => alert.id)).size, result.length);
  for (const alert of result) {
    assert(alert.id && alert.severity && alert.title && alert.description && alert.actionLabel && alert.destination);
    assert.doesNotMatch(JSON.stringify(alert), /diagnos|symptom|treatment|claim.?number|status.?code|source.?record|source.?report/i);
  }
}
assert.deepEqual(alerts("pendingClaimNearReturn"), alerts("pendingClaimNearReturn"));
console.log("Lifecycle alert validation passed.");
