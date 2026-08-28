import assert from "node:assert/strict";
import { EMBEDDED_EMPLOYEE_RECORDS, EMPLOYEE_IDENTITY_INDEX } from "../src/data/embeddedEmployeeRecords.js";
import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import { getCanonicalLeaveEpisodes } from "../src/data/leaveEpisodeUtils.js";
import { getLifecycleStageDecision } from "../src/data/lifecycleStageEngine.js";

const requiredMinnieSources = [
  "Daily Combined Alert Report",
  "Twilio Closed RTW Summary",
  "Main Leave Report",
  "Twilio - Weekly Combined Status",
  "ER LOA Status Change Weekly Rep",
];

const episodeComparable = (episodes) => episodes.map((episode) => ({
  employeeId: episode.employeeId,
  leaveId: episode.leaveId,
  claimNumber: episode.claimNumber,
  leaveBeginDate: episode.leaveBeginDate,
  leaveEndDate: episode.leaveEndDate,
  expectedReturnDate: episode.expectedReturnDate,
  actualReturnDate: episode.actualReturnDate,
  leaveCategory: episode.leaveCategory,
  leaveType: episode.leaveType,
  leaveStatus: episode.leaveStatus,
  claimStatus: episode.claimStatus,
  sourceSheets: episode.sourceSheets,
  sourceRecordCount: episode.sourceRecordCount,
  ambiguous: episode.ambiguous,
  dataQuality: episode.dataQuality,
  sourceRecords: episode.sourceRecords.map((record) => ({
    sourceSheet: record.sourceSheet,
    leaveId: record.leaveId,
    claimNumber: record.claimNumber,
    leaveBeginDate: record.leaveBeginDate,
    leaveEndDate: record.leaveEndDate,
    estimatedRTW: record.estimatedRTW,
    actualRTW: record.actualRTW,
  })),
}));

const deterministicShuffle = (records, seed) => {
  const shuffled = [...records];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = (seed * 31 + index * 17 + seed * index) % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

const leaveRecord = (overrides) => ({
  employeeId: "900001",
  leaveId: "",
  claimNumber: "",
  leaveBeginDate: "",
  leaveEndDate: "",
  estimatedRTW: "",
  actualRTW: "",
  leaveCategory: "CONTINUOUS",
  leaveType: "BND",
  leaveStatus: "AP",
  claimStatus: "",
  sourceSheet: "Twilio - Weekly Combined Status",
  ...overrides,
});

const assertSingleEpisode = (records, message) => {
  const episodes = getCanonicalLeaveEpisodes(records);
  assert.equal(episodes.length, 1, message);
  return episodes[0];
};

const minnie = getVerifiedEmployeeProfile("Minnie", "Mouse", "700002");
const minnieRawSnapshot = JSON.stringify(minnie.sourceRecords);
const minnieRuns = [
  ["original", minnie.sourceRecords],
  ["reversed", [...minnie.sourceRecords].reverse()],
  ["shuffle-1", deterministicShuffle(minnie.sourceRecords, 1)],
  ["shuffle-2", deterministicShuffle(minnie.sourceRecords, 2)],
  ["shuffle-3", deterministicShuffle(minnie.sourceRecords, 3)],
];
const minnieResults = minnieRuns.map(([name, records]) => [name, getCanonicalLeaveEpisodes(records)]);
const minnieComparable = episodeComparable(minnieResults[0][1]);

for (const [name, episodes] of minnieResults) {
  assert.equal(episodes.length, 1, `${name} Minnie episode count`);
  assert.deepEqual(episodeComparable(episodes), minnieComparable, `${name} Minnie canonical output`);
}

const minnieEpisode = minnieResults[0][1][0];
assert.equal(minnieEpisode.leaveBeginDate, "2026-01-10");
assert.equal(minnieEpisode.leaveEndDate, "2026-02-26");
assert.equal(minnieEpisode.expectedReturnDate, "2026-02-27");
assert.equal(minnieEpisode.actualReturnDate, "2026-02-27");
assert.equal(minnieEpisode.sourceRecordCount, 5);
for (const sourceSheet of requiredMinnieSources) assert(minnieEpisode.sourceSheets.includes(sourceSheet), `Minnie missing ${sourceSheet}`);
assert.equal(minnieEpisode.dataQuality.conflictingLeaveBeginDate, false);
assert.equal(minnieEpisode.dataQuality.conflictingLeaveEndDate, false);
assert.equal(minnieEpisode.dataQuality.conflictingExpectedReturnDate, false);
assert.equal(minnieEpisode.dataQuality.conflictingActualReturnDate, false);

const minnieDecision = getLifecycleStageDecision(minnie, { asOfDate: "2026-08-26" });
assert.equal(minnieDecision.dataQuality.overlappingRecords.length, 0);
assert.equal(minnieDecision.flags.needsDateConfirmation, false);
assert.notEqual(minnieDecision.stageId, null);

const duplicateEpisode = assertSingleEpisode([
  leaveRecord({ sourceSheet: "Twilio - Weekly Combined Status", leaveId: "L-DUP", claimNumber: "C-DUP", leaveBeginDate: "2026-03-01", leaveEndDate: "2026-03-10", estimatedRTW: "2026-03-11" }),
  leaveRecord({ sourceSheet: "Main Leave Report", leaveId: "L-DUP", claimNumber: "C-DUP", leaveBeginDate: "2026-03-01", leaveEndDate: "2026-03-10", estimatedRTW: "2026-03-11" }),
], "exact duplicate cross-sheet records");
assert.equal(duplicateEpisode.sourceRecordCount, 2);

const complementaryEpisode = assertSingleEpisode([
  leaveRecord({ leaveId: "L-COMP", leaveBeginDate: "2026-04-01", leaveEndDate: "2026-04-15" }),
  leaveRecord({ sourceSheet: "Main Leave Report", leaveId: "L-COMP", estimatedRTW: "2026-04-16", actualRTW: "2026-04-16" }),
], "shared leave ID complementary records");
assert.equal(complementaryEpisode.expectedReturnDate, "2026-04-16");

const attachedPartialEpisode = assertSingleEpisode([
  leaveRecord({ leaveId: "L-RTW", leaveBeginDate: "2026-05-01", leaveEndDate: "2026-05-12", estimatedRTW: "2026-05-13" }),
  leaveRecord({ sourceSheet: "Daily Combined Alert Report", leaveId: "", claimNumber: "", leaveBeginDate: "", leaveEndDate: "", estimatedRTW: "2026-05-13" }),
], "single RTW-only partial attaches to matching full episode");
assert.equal(attachedPartialEpisode.sourceRecordCount, 2);

const ambiguousEpisodes = getCanonicalLeaveEpisodes([
  leaveRecord({ employeeId: "900002", leaveId: "L-A", leaveBeginDate: "2026-06-01", leaveEndDate: "2026-06-05", estimatedRTW: "2026-06-20" }),
  leaveRecord({ employeeId: "900002", leaveId: "L-B", leaveBeginDate: "2026-06-10", leaveEndDate: "2026-06-15", estimatedRTW: "2026-06-20" }),
  leaveRecord({ employeeId: "900002", sourceSheet: "Daily Combined Alert Report", leaveId: "", claimNumber: "", leaveBeginDate: "", leaveEndDate: "", estimatedRTW: "2026-06-20" }),
]);
assert.equal(ambiguousEpisodes.length, 3);
const ambiguousPartial = ambiguousEpisodes.find((episode) => episode.ambiguous);
assert(ambiguousPartial, "RTW-only partial should be marked ambiguous");
assert.equal(ambiguousPartial.sourceRecordCount, 1);
assert.equal(ambiguousPartial.dataQuality.ambiguousPartialMatches.length, 2);

const overlappingRecords = [
  leaveRecord({ employeeId: "900003", leaveId: "L-OVER-1", leaveBeginDate: "2026-07-01", leaveEndDate: "2026-07-15", estimatedRTW: "2026-07-16" }),
  leaveRecord({ employeeId: "900003", leaveId: "L-OVER-2", leaveBeginDate: "2026-07-10", leaveEndDate: "2026-07-20", estimatedRTW: "2026-07-21" }),
];
assert.equal(getCanonicalLeaveEpisodes(overlappingRecords).length, 2);
const overlappingDecision = getLifecycleStageDecision({ sourceRecords: overlappingRecords }, { asOfDate: "2026-07-12" });
assert.equal(overlappingDecision.dataQuality.overlappingRecords.length, 1);
assert.equal(overlappingDecision.flags.needsDateConfirmation, true);
assert.equal(overlappingDecision.stageId, null);

const sequentialRecords = [
  leaveRecord({ employeeId: "900004", leaveId: "L-SEQ-1", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-10", estimatedRTW: "2026-08-11", actualRTW: "2026-08-11" }),
  leaveRecord({ employeeId: "900004", leaveId: "L-SEQ-2", leaveBeginDate: "2026-08-12", leaveEndDate: "2026-08-20", estimatedRTW: "2026-08-21", actualRTW: "2026-08-21" }),
];
assert.equal(getCanonicalLeaveEpisodes(sequentialRecords).length, 2);
assert.equal(getLifecycleStageDecision({ sourceRecords: sequentialRecords }, { asOfDate: "2026-08-13" }).dataQuality.overlappingRecords.length, 0);

assert.equal(getCanonicalLeaveEpisodes([
  leaveRecord({ sourceSheet: "Twilio - ATP Report", leaveCategory: "", leaveType: "", leaveStatus: "", claimNumber: "C-ATP", payPeriodFromDate: "2026-01-01", payPeriodThruDate: "2026-01-14" }),
]).length, 0);

assert.equal(JSON.stringify(minnie.sourceRecords), minnieRawSnapshot);
assert.equal(EMBEDDED_EMPLOYEE_RECORDS.length, 4154);
assert.equal(EMPLOYEE_IDENTITY_INDEX.length, 520);
assert.equal(EMBEDDED_EMPLOYEE_RECORDS.filter((record) => record.sourceSheet === "Twilio - ATP Report").length, 150);

console.log(JSON.stringify({
  minnie: {
    episodeCount: minnieResults[0][1].length,
    leaveBeginDate: minnieEpisode.leaveBeginDate,
    leaveEndDate: minnieEpisode.leaveEndDate,
    expectedReturnDate: minnieEpisode.expectedReturnDate,
    actualReturnDate: minnieEpisode.actualReturnDate,
    sourceRecordCount: minnieEpisode.sourceRecordCount,
    sourceSheets: minnieEpisode.sourceSheets,
    lifecycleStageId: minnieDecision.stageId,
  },
  permutations: Object.fromEntries(minnieResults.map(([name, episodes]) => [name, episodes.length])),
  ambiguousMatch: {
    episodeCount: ambiguousEpisodes.length,
    ambiguousPartialMatches: ambiguousPartial.dataQuality.ambiguousPartialMatches.length,
  },
  genuineOverlap: {
    episodeCount: getCanonicalLeaveEpisodes(overlappingRecords).length,
    overlapConflictCount: overlappingDecision.dataQuality.overlappingRecords.length,
    lifecycleStageId: overlappingDecision.stageId,
  },
}, null, 2));