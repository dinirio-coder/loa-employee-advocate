import {
  CONFLICTING_EMPLOYEE_IDS,
  EMBEDDED_EMPLOYEE_RECORDS,
  EMPLOYEE_IDENTITY_INDEX,
} from "./embeddedEmployeeRecords.js";
import {
  matchEmployeeIdentity,
  normalizeEmployeeId,
  toFiniteNumberOrNull,
} from "./identityUtils.js";

const blockedIds = new Set(CONFLICTING_EMPLOYEE_IDS.map(normalizeEmployeeId));

const populated = (value) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== "" && !["null", "undefined", "NaN"].includes(text.toLowerCase());
};

const firstPopulated = (...values) => values.find(populated) ?? null;

const dateValue = (value) => {
  if (!populated(value)) return null;
  const text = String(value).trim();
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : text;
};

const inclusiveDays = (start, end) => {
  const startDate = dateValue(start);
  const endDate = dateValue(end);
  if (!startDate || !endDate) return null;
  const difference = new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime();
  const days = Math.round(difference / 86400000) + 1;
  return days > 0 ? String(days) : null;
};

const statusScore = (record) => {
  const status = String(firstPopulated(record.leaveStatus, record.claimStatus, record.statusCode) ?? "").toUpperCase();
  return status && !["CL", "CLOSED"].includes(status) ? 2 : status ? 1 : 0;
};

const chooseRecord = (records) =>
  [...records].sort((left, right) => statusScore(right) - statusScore(left))[0] ?? {};

const mergeField = (records, activeRecord, field) =>
  firstPopulated(activeRecord[field], ...records.map((record) => record[field]));

export const getVerifiedEmployeeProfile = (firstName, lastName, employeeId) => {
  const normalizedId = normalizeEmployeeId(employeeId);
  if (!normalizedId || blockedIds.has(normalizedId)) return null;

  const identityRecord = EMPLOYEE_IDENTITY_INDEX.find((record) =>
    matchEmployeeIdentity(record, firstName, lastName, normalizedId),
  );
  if (!identityRecord) return null;

  const sourceRecords = EMBEDDED_EMPLOYEE_RECORDS.filter(
    (record) => normalizeEmployeeId(record.employeeId) === normalizedId,
  );
  if (sourceRecords.length === 0) return null;

  const activeRecord = chooseRecord(sourceRecords);
  const first = firstPopulated(identityRecord.firstName, ...sourceRecords.map((record) => record.firstName));
  const last = firstPopulated(identityRecord.lastName, ...sourceRecords.map((record) => record.lastName));
  const location = mergeField(sourceRecords, activeRecord, "location");
  const leaveBeginDate = mergeField(sourceRecords, activeRecord, "leaveBeginDate");
  const leaveEndDate = mergeField(sourceRecords, activeRecord, "leaveEndDate");
  const explicitDuration = mergeField(sourceRecords, activeRecord, "durationDays");
  const durationDays = explicitDuration ?? inclusiveDays(leaveBeginDate, leaveEndDate);
  const leaveStatus = mergeField(sourceRecords, activeRecord, "leaveStatus");
  const claimStatus = mergeField(sourceRecords, activeRecord, "claimStatus");
  const statusCode = mergeField(sourceRecords, activeRecord, "statusCode");
  const currentReportStatus = firstPopulated(leaveStatus, claimStatus, statusCode);
  const product = mergeField(sourceRecords, activeRecord, "product") ?? mergeField(sourceRecords, activeRecord, "leaveType");

  return {
    employeeId: normalizedId,
    firstName: first,
    lastName: last,
    displayName: [first, last].filter(populated).join(" ") || null,
    fullName: [first, last].filter(populated).join(" ") || null,
    location,
    state: mergeField(sourceRecords, activeRecord, "state"),
    product,
    leaveProduct: product,
    classCode: mergeField(sourceRecords, activeRecord, "classCode"),
    classDescription: mergeField(sourceRecords, activeRecord, "classDescription"),
    claimStatus,
    leaveStatus,
    statusCode,
    statusReasonCode: mergeField(sourceRecords, activeRecord, "statusReasonCode"),
    statusReason: mergeField(sourceRecords, activeRecord, "statusReason") ?? mergeField(sourceRecords, activeRecord, "leaveStatusReasonDescription"),
    leaveReasonCode: mergeField(sourceRecords, activeRecord, "leaveReasonCode"),
    leaveCategory: mergeField(sourceRecords, activeRecord, "leaveCategory"),
    leaveType: mergeField(sourceRecords, activeRecord, "leaveType"),
    leaveReasonDescription: mergeField(sourceRecords, activeRecord, "leaveReasonDescription"),
    dateReceived: mergeField(sourceRecords, activeRecord, "dateReceived"),
    lastDateWorked: mergeField(sourceRecords, activeRecord, "lastDateWorked"),
    dateOfDisability: mergeField(sourceRecords, activeRecord, "dateOfDisability"),
    benefitBeginDate: mergeField(sourceRecords, activeRecord, "benefitBeginDate"),
    benefitEndDate: mergeField(sourceRecords, activeRecord, "benefitEndDate"),
    disabilityApprovedThrough: mergeField(sourceRecords, activeRecord, "disabilityApprovedThrough"),
    leaveBeginDate,
    leaveEndDate,
    estimatedRTW: mergeField(sourceRecords, activeRecord, "estimatedRTW"),
    actualRTW: mergeField(sourceRecords, activeRecord, "actualRTW"),
    durationDays,
    leaveHoursUsed: mergeField(sourceRecords, activeRecord, "leaveHoursUsed"),
    leaveHoursRemaining: mergeField(sourceRecords, activeRecord, "leaveHoursRemaining"),
    sourceRecords,
    currentReportStatus,
    activeStage: currentReportStatus,
    stageNote: mergeField(sourceRecords, activeRecord, "statusReason") ?? mergeField(sourceRecords, activeRecord, "leaveStatusReasonDescription"),
    durationWeeks: durationDays ? Math.max(1, Math.ceil(Number(durationDays) / 7)) : null,
    totalPlannedDuration: durationDays ? `${durationDays} days` : null,
    leaveReason: mergeField(sourceRecords, activeRecord, "leaveReasonDescription") ?? mergeField(sourceRecords, activeRecord, "leaveType"),
    certStatus: mergeField(sourceRecords, activeRecord, "disabilityApprovedThrough") ?? currentReportStatus,
    certificationStatus: mergeField(sourceRecords, activeRecord, "disabilityApprovedThrough") ?? currentReportStatus,
    biweeklySalary: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "biweeklySalaryAmount")),
    payCode: mergeField(sourceRecords, activeRecord, "payCode"),
    benefitGrossAmount: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "benefitGrossAmount")),
    totalOffsets: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "totalOffsets")),
    adjustedBenefitGrossAmount: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "adjustedBenefitGrossAmount")),
    payableBenefitPercentage: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "payableBenefitPercentage")),
    payableGrossBenefitAmount: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "payableGrossBenefitAmount")),
    payableTotalOffsets: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "payableTotalOffsets")),
    payableAdjustedBenefitGrossAmount: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "payableAdjustedBenefitGrossAmount")),
    payableCalculatedSalaryAmount: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "payableCalculatedSalaryAmount")),
    payableCalculatedCommissionAmount: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "payableCalculatedCommissionAmount")),
    payableFromDate: mergeField(sourceRecords, activeRecord, "payableFromDate"),
    payableThruDate: mergeField(sourceRecords, activeRecord, "payableThruDate"),
    payPeriodFromDate: mergeField(sourceRecords, activeRecord, "payPeriodFromDate"),
    payPeriodThruDate: mergeField(sourceRecords, activeRecord, "payPeriodThruDate"),
    payPeriodWorkDays: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "payPeriodWorkDays")),
    payPeriodWorkDaysPaid: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "payPeriodWorkDaysPaid")),
    workDaysPerWeek: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "workDaysPerWeek")),
    annualSalary: null,
    stateOffset: 0,
    actualStateAward: toFiniteNumberOrNull(mergeField(sourceRecords, activeRecord, "actualStateAward") ?? mergeField(sourceRecords, activeRecord, "stateBenefitAward")),
    stateAwardStatus: mergeField(sourceRecords, activeRecord, "stateAwardStatus"),
    payNote: "Pay values are sourced from the Twilio - ATP Report.",
  };
};
