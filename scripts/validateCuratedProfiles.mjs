import assert from "node:assert/strict";
import { CURATED_DEMO_PROFILES } from "../src/data/curatedDemoProfiles.js";
const ids = CURATED_DEMO_PROFILES.map((scenario) => scenario.id);
assert.equal(new Set(ids).size, ids.length);
for (const scenario of CURATED_DEMO_PROFILES) {
  assert(scenario.id && scenario.displayLabel && scenario.profile && scenario.asOfDate === "2026-08-27");
  assert.match(scenario.asOfDate, /^2026-08-27$/);
  assert.equal(Object.hasOwn(scenario.profile, "employeeId"), false);
  assert.doesNotMatch(JSON.stringify(scenario.profile), /claim.?number|diagnos|symptom|treatment|medical.?record/i);
  for (const record of scenario.profile.sourceRecords || []) {
    if (record.leaveBeginDate && record.leaveEndDate) assert(record.leaveEndDate >= record.leaveBeginDate, scenario.id);
  }
}
console.log("Curated demonstration profile shape validation passed.");
