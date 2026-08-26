import assert from "node:assert/strict";
import { getStateBenefitCoordination } from "../src/data/stateBenefitUtils.js";

const base = { location: "Remote - USA - WA", leaveReason: "Medical leave", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-31", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14" };
const employeeFiled = getStateBenefitCoordination({ ...base, location: "Remote - USA - CT" });
assert.equal(employeeFiled.state, "CT");
assert.equal(employeeFiled.program.applicationOwner, "Employee");
assert.equal(employeeFiled.assumedStateOffset, 1016.4 * 14 / 7);

const lincolnManaged = getStateBenefitCoordination({ ...base, location: "Remote - USA - CA", leaveReason: "Bonding leave" });
assert.equal(lincolnManaged.program.applicationOwner, "Lincoln Financial");
assert.equal(lincolnManaged.program.lincolnCoordination, "Lincoln files and manages state claim");
assert.equal(lincolnManaged.assumedStateOffset, 3530);

assert.equal(getStateBenefitCoordination({ ...base, location: "Remote - USA - TX" }).assumedStateOffset, 0);
assert.equal(getStateBenefitCoordination({ ...base, leaveReason: "Personal leave" }).applicable, false);

const maryland = getStateBenefitCoordination({ ...base, location: "Remote - USA - MD" });
assert.equal(maryland.program.programStatus, "Pending Benefits");
assert.equal(maryland.futureProgram, true);
assert.equal(maryland.applicable, false);
assert.equal(maryland.assumedStateOffset, 0);

const partialWeek = getStateBenefitCoordination({ ...base, leaveBeginDate: "2026-08-05", leaveEndDate: "2026-08-08" });
assert.equal(partialWeek.overlapDays, 4);
assert.equal(partialWeek.assumedStateOffset, 1647 * 4 / 7);

const capped = getStateBenefitCoordination({ ...base, biweeklySalaryAmount: 2000 });
assert.equal(capped.assumedStateOffset, 2000);
assert(capped.assumedStateOffset <= 2000);

const lowerAward = getStateBenefitCoordination({ ...base, actualStateAward: 2000, stateAwardStatus: "approved" });
assert.equal(lowerAward.actualStateAward, 2000);
assert.equal(lowerAward.lincolnReconciliation, 1294);
const pendingAward = getStateBenefitCoordination({ ...base, actualStateAward: 2000, stateAwardStatus: "pending" });
assert.equal(pendingAward.actualStateAward, null);
assert.equal(pendingAward.lincolnReconciliation, 0);

const sourceRecorded = getStateBenefitCoordination({ ...base, sourceRecords: [{ stateOffsetIncluded: true, stateBenefitOffset: "1000" }] });
assert.equal(sourceRecorded.assumedStateOffset, 1000);
assert.equal(sourceRecorded.sourceAmountType, "source-recorded");
assert(getStateBenefitCoordination({ ...base, coordinatedPayPeriodTarget: 100 }).assumedStateOffset >= 0);

console.log("State benefit workbook, matching, future-program, partial-week, cap, award, and non-negative pay validations passed.");