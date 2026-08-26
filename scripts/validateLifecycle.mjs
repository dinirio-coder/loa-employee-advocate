import assert from "node:assert/strict";
import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import { getEmployeeLifecycle } from "../src/data/lifecycleUtils.js";

const profile = (first, last, id) => getVerifiedEmployeeProfile(first, last, id);
const validate = (employee) => {
  const lifecycle = getEmployeeLifecycle(employee, { asOfDate: "2026-08-26" });
  assert.equal(lifecycle.stages.length, 4);
  assert.equal(new Set(lifecycle.stages.map((stage) => stage.id)).size, 4);
  const items = lifecycle.stages.flatMap((stage) => stage.items);
  assert.equal(new Set(items.map((task) => task.id)).size, items.length);
  assert(items.every((task) => task.owner));
  assert(items.every((task) => !Object.hasOwn(task, "checked")));
  assert(!JSON.stringify(lifecycle).match(/diagnos|symptom|treatment|claim number|medical record/i));
  return lifecycle;
};

const luke = validate(profile("Luke", "Skywalker", "1048291"));
assert.equal(luke.suggestedStageId, "return-to-work");
assert(luke.stages.find((stage) => stage.id === "return-to-work").items.some((task) => task.id === "rtw-record"));
assert.equal(luke.stages.find((stage) => stage.id === "return-to-work").items.find((task) => task.id === "rtw-record").dependency.includes("2026"), false);

const will = validate(profile("Will", "Johansson", "2749015"));
assert.equal(will.suggestedStageId, "pre-leave");

const documentation = validate({ currentReportStatus: "PE", dateReceived: "2026-08-03", sourceRecords: [{ sourceSheet: "Combined Status" }] });
assert.equal(documentation.suggestedStageId, "documentation");

const incomplete = validate(profile("Amelia", "Moore", "129384"));
assert.equal(incomplete.hasSuggestedStage, false);
assert.equal(incomplete.suggestedStageId, null);
assert.equal(incomplete.stages[0].id, "pre-leave");
assert(incomplete.stages.every((stage) => stage.items.length > 0));

const ambiguous = validate({ sourceRecords: [{ sourceSheet: "Unknown", statusCode: "XY" }] });
assert.equal(ambiguous.hasSuggestedStage, false);
assert(ambiguous.suggestedStageBasis.includes("does not support"));
assert.equal(getEmployeeLifecycle({ sourceRecords: [{ estimatedRTW: "2027-01-01" }, { leaveBeginDate: "2026-09-01" }] }, { asOfDate: "2026-08-26" }).suggestedStageId, "return-to-work");

console.log("Lifecycle model validation passed.");