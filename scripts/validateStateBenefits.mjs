import assert from "node:assert/strict";
import { getStateBenefitCoordination, normalizeLeaveCategory } from "../src/data/stateBenefitUtils.js";

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
assert.equal(partialWeek.assumedStateOffset, 941.14);

const capped = getStateBenefitCoordination({ ...base, biweeklySalaryAmount: 2000 });
assert.equal(capped.assumedStateOffset, 1333.4);
assert(capped.assumedStateOffset <= 2000);

const lowerAward = getStateBenefitCoordination({ ...base, actualStateAward: 2000, stateAwardStatus: "approved" });
assert.equal(lowerAward.actualStateAward, 2000);
assert.equal(lowerAward.lincolnReconciliation, 1294);
const pendingAward = getStateBenefitCoordination({ ...base, stateAwardStatus: "pending" });
assert.equal(pendingAward.actualStateAward, null);
assert.equal(pendingAward.lincolnReconciliation, 0);
assert.equal(pendingAward.awardStatus, "Pending state award");

const sourceRecorded = getStateBenefitCoordination({ ...base, sourceRecords: [{ stateOffsetIncluded: true, stateBenefitOffset: "1000" }] });
assert.equal(sourceRecorded.assumedStateOffset, 3294);
assert.equal(sourceRecorded.sourceAmountType, "assumed");
assert(getStateBenefitCoordination({ ...base, coordinatedPayPeriodTarget: 100 }).assumedStateOffset >= 0);

const nyBonding = getStateBenefitCoordination({ ...base, state: "NY", leaveReason: "Bonding leave", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-14", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14", biweeklySalaryAmount: 10275.24 }, { coordinatedPayPeriodTarget: 10275.24, lincolnGross: 6850.50 });
assert.equal(nyBonding.program.programName, "NY Paid Family Leave (PFL)");
assert.equal(nyBonding.program.programType, "FAMILY");
assert.equal(nyBonding.assumedStateOffset, 2457.06);

const nyBnd = getStateBenefitCoordination({ ...base, state: "NY", leaveCategory: "BND", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-14", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14", biweeklySalaryAmount: 10275.24 }, { coordinatedPayPeriodTarget: 10275.24, lincolnGross: 6850.50 });
assert.equal(nyBnd.sourceCategory, "BND");
assert.equal(nyBnd.category, "BONDING");
assert.equal(nyBnd.program.programName, "NY Paid Family Leave (PFL)");
assert.equal(nyBnd.program.programType, "FAMILY");
assert.equal(nyBnd.applicable, true);
assert.equal(nyBnd.eligibleDays, 14);
assert.equal(nyBnd.weeklyMaximum, 1228.53);
assert.equal(nyBnd.assumedStateOffset, 2457.06);
assert.equal(nyBnd.lincolnAfterStateOffset, 4393.44);
assert.equal(nyBnd.twilioEstimatedTopUp, 3424.74);
assert.equal(nyBnd.assumedStateOffset + nyBnd.lincolnAfterStateOffset + nyBnd.twilioEstimatedTopUp, 10275.24);
assert.equal(normalizeLeaveCategory(" bnd "), "BONDING");
assert.equal(normalizeLeaveCategory("Bnd"), "BONDING");
assert.equal(normalizeLeaveCategory("BONDING"), "BONDING");
assert.equal(normalizeLeaveCategory("NEWBORN - MATERNITY"), "BONDING");
assert.equal(normalizeLeaveCategory("COMPANY PARENTAL"), "BONDING");
assert.equal(normalizeLeaveCategory("not-a-category"), null);
const unknownCategory = getStateBenefitCoordination({ ...base, state: "NY", leaveCategory: "not-a-category" });
assert.equal(unknownCategory.program, null);
assert.equal(unknownCategory.applicable, false);
assert.equal(normalizeLeaveCategory("OWN_MEDICAL"), "OWN_MEDICAL");

const nyMedical = getStateBenefitCoordination({ ...base, state: "NY", leaveReason: "Medical leave", leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-14", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14", biweeklySalaryAmount: 10275.24 }, { coordinatedPayPeriodTarget: 10275.24, lincolnGross: 6850.50 });
assert.equal(nyMedical.program.programName, "Disability Benefits Law (DBL)");
assert.equal(nyMedical.program.programType, "MEDICAL");
assert.equal(nyMedical.assumedStateOffset, 340);
assert.equal(getStateBenefitCoordination({ ...base, state: "NY", leaveReason: "Medical leave" }).program.programName, "Disability Benefits Law (DBL)");
assert.equal(getStateBenefitCoordination({ ...base, state: "NY", leaveReason: "Bonding leave" }).program.programName, "NY Paid Family Leave (PFL)");
assert.equal(getStateBenefitCoordination({ ...base, state: "NY", leaveReason: "Medical leave" }).awardStatus, "Pending state award");
assert.equal(getStateBenefitCoordination({ ...base, state: "NY", leaveReason: "Medical leave", actualStateAward: 0 }).awardStatus, "No state benefit awarded");
assert.equal(getStateBenefitCoordination({ ...base, state: "NY", leaveReason: "Medical leave", actualStateAward: 1 }).awardStatus, "Award recorded");

console.log("State benefit workbook, matching, future-program, partial-week, cap, award, and non-negative pay validations passed.");