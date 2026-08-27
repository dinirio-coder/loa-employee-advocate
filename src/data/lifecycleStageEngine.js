import { LINCOLN_CODE_DICTIONARY } from "./lincolnCodeDictionary.js";

const DAY_IN_MILLISECONDS = 86400000;
const DATE_FIELDS = ["leaveBeginDate", "leaveEndDate", "estimatedRTW", "actualRTW"];

const populated = (value) => value !== null && value !== undefined && String(value).trim() !== "";
const normalizeDate = (value) => {
  if (!populated(value)) return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const time = Date.parse(`${text}T00:00:00Z`);
  return Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== text ? null : text;
};
const dayNumber = (value) => Date.parse(`${value}T00:00:00Z`);
const daysBetween = (from, to) => Math.round((dayNumber(to) - dayNumber(from)) / DAY_IN_MILLISECONDS);

/** Maps repository-supported Lincoln status codes to lifecycle categories. */
export const normalizeLifecycleStatus = (value) => {
  const code = String(value ?? "").trim().toUpperCase();
  if (["PE", "PENDING", "PEND", "IP"].includes(code)) return "PENDING";
  if (["AP", "APPROVED"].includes(code)) return "APPROVED";
  if (["CL", "CLOSED"].includes(code)) return "CLOSED";
  if (["DE", "DENIED"].includes(code)) return "DENIED";
  if (["VD", "VOID", "CANCELED", "CANCELLED"].includes(code)) return "CANCELED";
  return "UNKNOWN";
};

const statusValue = (employee, record) => record?.leaveStatus || record?.claimStatus || record?.statusCode || employee?.currentReportStatus || employee?.leaveStatus || employee?.claimStatus || employee?.statusCode;
const normalizedRecord = (employee, record, sourceIndex) => {
  const dates = Object.fromEntries(DATE_FIELDS.map((field) => [field, normalizeDate(record?.[field])]));
  const leaveStart = dates.leaveBeginDate;
  const leaveEnd = dates.leaveEndDate;
  const expectedReturn = dates.estimatedRTW;
  const actualReturn = dates.actualRTW;
  const invalidDateOrder = Boolean(
    (leaveStart && leaveEnd && dayNumber(leaveEnd) < dayNumber(leaveStart)) ||
    (leaveStart && expectedReturn && dayNumber(expectedReturn) < dayNumber(leaveStart)) ||
    (leaveStart && actualReturn && dayNumber(actualReturn) < dayNumber(leaveStart)),
  );
  return { sourceIndex, leaveStart, leaveEnd, expectedReturn, actualReturn, statusCategory: normalizeLifecycleStatus(statusValue(employee, record)), invalidDateOrder };
};

const sameRecord = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const leavePeriodsOverlap = (left, right) => left.leaveStart && left.leaveEnd && right.leaveStart && right.leaveEnd && dayNumber(left.leaveStart) <= dayNumber(right.leaveEnd) && dayNumber(right.leaveStart) <= dayNumber(left.leaveEnd);

const controllingRecordView = (record) => record ? {
  sourceIndex: record.sourceIndex,
  leaveStart: record.leaveStart,
  leaveEnd: record.leaveEnd,
  expectedReturn: record.expectedReturn,
  actualReturn: record.actualReturn,
  statusCategory: record.statusCategory,
} : null;

export const getLifecycleStageDecision = (employee, { asOfDate } = {}) => {
  const normalizedAsOfDate = normalizeDate(asOfDate) || new Date().toISOString().slice(0, 10);
  const sourceRecords = Array.isArray(employee?.sourceRecords) && employee.sourceRecords.length ? employee.sourceRecords : [employee || {}];
  const uniqueRecords = sourceRecords.filter((record, index) => sourceRecords.findIndex((candidate) => sameRecord(candidate, record)) === index);
  const normalizedRecords = uniqueRecords.map((record, sourceIndex) => normalizedRecord(employee, record, sourceIndex));
  const exactDuplicatesRemoved = sourceRecords.length - uniqueRecords.length;
  const validPeriods = normalizedRecords.filter((record) => record.leaveStart && record.leaveEnd && !record.invalidDateOrder);
  const leaveRecords = normalizedRecords.filter((record) => record.leaveStart && !record.invalidDateOrder);
  const overlappingRecords = [];
  for (let left = 0; left < validPeriods.length; left += 1) {
    for (let right = left + 1; right < validPeriods.length; right += 1) {
      if (leavePeriodsOverlap(validPeriods[left], validPeriods[right])) overlappingRecords.push([validPeriods[left].sourceIndex, validPeriods[right].sourceIndex]);
    }
  }
  const uniqueValues = (field) => [...new Set(normalizedRecords.map((record) => record[field]).filter(Boolean))];
  const conflictingStartDates = uniqueValues("leaveStart").length > 1;
  const conflictingEndDates = uniqueValues("leaveEnd").length > 1;
  const conflictingExpectedReturns = uniqueValues("expectedReturn").length > 1;
  const conflictingActualReturns = uniqueValues("actualReturn").length > 1;
  const invalidDateOrder = normalizedRecords.some((record) => record.invalidDateOrder);
  const futureActualReturn = normalizedRecords.some((record) => record.actualReturn && dayNumber(record.actualReturn) > dayNumber(normalizedAsOfDate));
  const needsDateConfirmation = Boolean(overlappingRecords.length || conflictingStartDates || conflictingEndDates || conflictingExpectedReturns || conflictingActualReturns || invalidDateOrder);

  const containing = leaveRecords.filter((record) => dayNumber(record.leaveStart) <= dayNumber(normalizedAsOfDate) && (!record.leaveEnd || dayNumber(record.leaveEnd) >= dayNumber(normalizedAsOfDate)));
  const futureLeaves = leaveRecords.filter((record) => dayNumber(record.leaveStart) > dayNumber(normalizedAsOfDate)).sort((left, right) => dayNumber(left.leaveStart) - dayNumber(right.leaveStart));
  const returned = normalizedRecords.filter((record) => record.actualReturn && dayNumber(record.actualReturn) <= dayNumber(normalizedAsOfDate)).sort((left, right) => dayNumber(right.actualReturn) - dayNumber(left.actualReturn));
  const completed = validPeriods.filter((record) => dayNumber(record.leaveEnd) < dayNumber(normalizedAsOfDate)).sort((left, right) => dayNumber(right.leaveEnd) - dayNumber(left.leaveEnd));
  const selected = containing[0] || futureLeaves[0] || (!containing.length && !futureLeaves.length ? returned[0] : null) || (!containing.length && !futureLeaves.length && !returned.length ? completed[0] : null) || null;
  const controllingRecord = controllingRecordView(selected);
  const leaveStart = selected?.leaveStart || null;
  const leaveEnd = selected?.leaveEnd || null;
  const expectedReturn = selected?.expectedReturn || null;
  const actualReturn = selected?.actualReturn || null;
  const daysUntilLeave = leaveStart ? daysBetween(normalizedAsOfDate, leaveStart) : null;
  const daysUntilExpectedReturn = expectedReturn ? daysBetween(normalizedAsOfDate, expectedReturn) : null;
  const statusCategory = selected?.statusCategory || normalizeLifecycleStatus(statusValue(employee, null));
  const pending = statusCategory === "PENDING";
  const expectedReturnOverdue = Boolean(expectedReturn && !actualReturn && dayNumber(expectedReturn) < dayNumber(normalizedAsOfDate));
  const pendingNearReturn = Boolean(pending && expectedReturn && daysUntilExpectedReturn >= 0 && daysUntilExpectedReturn <= 14);
  const pendingAfterReturn = Boolean(pending && actualReturn && dayNumber(actualReturn) < dayNumber(normalizedAsOfDate));
  const flags = { expectedReturnOverdue, pendingNearReturn, pendingAfterReturn, needsDateConfirmation };
  let stageId = null;
  let reason = "There is not enough reliable date information to recommend a lifecycle stage.";
  if (needsDateConfirmation) reason = "Conflicting or overlapping leave information needs confirmation before a stage can be recommended.";
  else if (actualReturn && dayNumber(actualReturn) < dayNumber(normalizedAsOfDate)) { stageId = "after-return"; reason = "Your actual return date has passed."; }
  else if ((actualReturn && dayNumber(actualReturn) === dayNumber(normalizedAsOfDate)) || (!actualReturn && expectedReturn && dayNumber(expectedReturn) === dayNumber(normalizedAsOfDate))) { stageId = "first-day-back"; reason = "Your return date is today; confirm your return with Lincoln and your manager."; }
  else if (expectedReturnOverdue || (leaveStart && leaveEnd && dayNumber(leaveStart) <= dayNumber(normalizedAsOfDate) && daysUntilExpectedReturn !== null && daysUntilExpectedReturn >= 1 && daysUntilExpectedReturn <= 14)) { stageId = "return-to-work"; reason = expectedReturnOverdue ? "Your expected return date has passed and still needs confirmation." : "Your expected return is within the next 14 days."; }
  else if (leaveStart && dayNumber(leaveStart) <= dayNumber(normalizedAsOfDate) && (!leaveEnd || dayNumber(leaveEnd) >= dayNumber(normalizedAsOfDate))) { stageId = "on-leave"; reason = "Your leave is currently in progress."; }
  else if (pending && populated(employee?.dateReceived)) { stageId = "documentation"; reason = "Lincoln may still need documentation or follow-up."; }
  else if (daysUntilLeave !== null && daysUntilLeave >= 1 && daysUntilLeave <= 3) { stageId = "business-handoff"; reason = "Your leave begins within the next 3 days."; }
  else if (daysUntilLeave !== null && daysUntilLeave > 3) { stageId = "pre-leave"; reason = "Your planned leave starts more than 3 days from now."; }
  return { stageId, reason, asOfDate: normalizedAsOfDate, controllingRecord, normalizedDates: { leaveStart, leaveEnd, expectedReturn, actualReturn }, daysUntilLeave, daysUntilExpectedReturn, statusCategory, flags, dataQuality: { exactDuplicatesRemoved, overlappingRecords, conflictingStartDates, conflictingEndDates, conflictingExpectedReturns, conflictingActualReturns, invalidDateOrder, futureActualReturn } };
};
