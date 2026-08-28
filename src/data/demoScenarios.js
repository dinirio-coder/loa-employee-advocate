const base = (sourceRecords, extra = {}) => ({ sourceRecords, ...extra });
const leave = (leaveBeginDate, leaveEndDate, extra = {}) => base([{ leaveBeginDate, leaveEndDate, ...extra }]);

export const DEMO_SCENARIOS = Object.freeze({
  futureLeave: leave("2026-09-10", "2026-09-20"),
  leaveInThreeDays: leave("2026-08-30", "2026-09-10"),
  leaveToday: leave("2026-08-27", "2026-09-10"),
  pendingDocumentation: base([{ leaveBeginDate: "2026-09-10", leaveEndDate: "2026-09-20" }], { currentReportStatus: "PE", dateReceived: "2026-08-20" }),
  currentlyOnLeave: leave("2026-08-01", "2026-09-10"),
  expectedReturnInFourteenDays: leave("2026-08-01", "2026-09-10", { estimatedRTW: "2026-09-10" }),
  expectedReturnInFifteenDays: leave("2026-08-01", "2026-09-20", { estimatedRTW: "2026-09-11" }),
  expectedReturnToday: leave("2026-08-01", "2026-09-10", { estimatedRTW: "2026-08-27" }),
  actualReturnToday: leave("2026-08-01", "2026-09-10", { actualRTW: "2026-08-27" }),
  actualReturnYesterday: base([{ actualRTW: "2026-08-26" }]),
  pendingClaimNearReturn: leave("2026-08-01", "2026-09-10", { estimatedRTW: "2026-09-05", claimStatus: "PE" }),
  pendingClaimAfterReturn: base([{ actualRTW: "2026-08-20", claimStatus: "PE" }]),
  pastExpectedReturn: leave("2026-08-01", "2026-09-10", { estimatedRTW: "2026-08-20" }),
  exactDuplicateRecords: base([
    { leaveBeginDate: "2026-08-01", leaveEndDate: "2026-09-10", estimatedRTW: "2026-09-10" },
    { leaveBeginDate: "2026-08-01", leaveEndDate: "2026-09-10", estimatedRTW: "2026-09-10" },
  ]),
  overlappingRecords: base([
    { leaveBeginDate: "2026-08-01", leaveEndDate: "2026-09-10" },
    { leaveBeginDate: "2026-08-05", leaveEndDate: "2026-09-15" },
  ]),
  endBeforeStart: leave("2026-09-10", "2026-09-01"),
  missingDates: base([{ claimStatus: "PE" }], { currentReportStatus: "PE" }),
  conflictingExpectedReturns: base([
    { leaveBeginDate: "2026-08-01", leaveEndDate: "2026-09-10", estimatedRTW: "2026-09-05" },
    { leaveBeginDate: "2026-08-01", leaveEndDate: "2026-09-10", estimatedRTW: "2026-09-10" },
  ]),
  futureActualReturn: leave("2026-08-01", "2026-09-10", { actualRTW: "2026-09-01" }),
});
