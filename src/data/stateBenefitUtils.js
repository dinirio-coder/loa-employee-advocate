import { STATE_BENEFIT_RULES, STATE_BENEFIT_RULES_BY_STATE } from "./stateBenefitRules.js";

const DAY_MS = 86400000;
const STATE_CODES = new Set(STATE_BENEFIT_RULES.map((rule) => rule.stateCode));
const STATE_NAMES = new Map(STATE_BENEFIT_RULES.map((rule) => [rule.stateName.toUpperCase(), rule.stateCode]));
const numberOrNull = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const populated = (value) => value !== null && value !== undefined && String(value).trim() !== "";
const isoDate = (value) => populated(value) && /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim()) ? String(value).trim() : null;
const timestamp = (value) => isoDate(value) ? new Date(`${value}T00:00:00Z`).getTime() : null;
const daysBetween = (from, through) => {
  const start = timestamp(from);
  const end = timestamp(through);
  return start !== null && end !== null && end >= start ? Math.floor((end - start) / DAY_MS) + 1 : 0;
};

export const normalizeState = (state, location = "") => {
  const value = String(state || location || "").trim().toUpperCase();
  if (STATE_CODES.has(value)) return value;
  if (STATE_NAMES.has(value)) return STATE_NAMES.get(value);
  const match = value.match(/(?:^|[^A-Z])(AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)(?:$|[^A-Z])/);
  return match ? match[1] : null;
};

const leaveCategory = (employee) => {
  const value = String(employee?.leaveCategory || employee?.leaveType || employee?.leaveReason || employee?.leaveReasonDescription || "").toUpperCase();
  if (/MEDICAL|DISAB|OWN[_ ]?MEDICAL|SERIOUS HEALTH/.test(value)) return "OWN_MEDICAL";
  if (/BOND|PARENT|MATERN|NEWBORN/.test(value)) return "BONDING";
  if (/MILITARY|EXIGENCY/.test(value)) return "MILITARY_EXIGENCY";
  if (/FAMILY|CAREGIV|FAMILY[_ ]?CARE/.test(value)) return "FAMILY_CARE";
  if (/SAFE/.test(value)) return "SAFE_LEAVE";
  if (/PRENATAL/.test(value)) return "PRENATAL";
  return value.replace(/\s+/g, "_") || null;
};

const sourceStateOffset = (employee) => {
  const records = Array.isArray(employee?.sourceRecords) ? employee.sourceRecords : [];
  const record = records.find((item) => item.stateOffsetIncluded === true || item.stateOffsetSource === "source-record" || numberOrNull(item.stateBenefitOffset) !== null || numberOrNull(item.stateOffsetAmount) !== null);
  return record ? { amount: Math.max(0, numberOrNull(record.stateBenefitOffset ?? record.stateOffsetAmount) ?? 0), source: "source-recorded" } : null;
};

export const getStateBenefitCoordination = (employee, options = {}) => {
  const state = normalizeState(employee?.state, employee?.location);
  const rule = options.programs?.[state] || STATE_BENEFIT_RULES_BY_STATE[state] || null;
  const leaveStart = isoDate(options.leaveStart || employee?.leaveBeginDate || employee?.benefitBeginDate);
  const leaveEnd = isoDate(options.leaveEnd || employee?.leaveEndDate || employee?.disabilityApprovedThrough || employee?.benefitEndDate);
  const payPeriodFrom = isoDate(options.payPeriodFrom || employee?.payPeriodFromDate);
  const payPeriodThrough = isoDate(options.payPeriodThrough || employee?.payPeriodThruDate);
  const leaveYear = Number((leaveStart || payPeriodFrom || options.asOfDate || new Date().toISOString()).slice(0, 4));
  const paymentYear = Number((payPeriodFrom || leaveStart || options.asOfDate || new Date().toISOString()).slice(0, 4));
  const maximumYearApplies = Boolean(rule && rule.maximumYear === leaveYear && rule.maximumYear === paymentYear);
  const activeOnLeaveDate = Boolean(rule && leaveStart && rule.programStatus === "Active" && leaveStart >= rule.benefitsStartDate && (!rule.benefitsEndDate || leaveStart <= rule.benefitsEndDate));
  const category = leaveCategory(employee);
  const categoryCovered = Boolean(rule && category && rule.coveredLeaveCategories.includes(category));
  const overlapStart = leaveStart && payPeriodFrom ? new Date(Math.max(timestamp(leaveStart), timestamp(payPeriodFrom))).toISOString().slice(0, 10) : null;
  const overlapEnd = leaveEnd && payPeriodThrough ? new Date(Math.min(timestamp(leaveEnd), timestamp(payPeriodThrough))).toISOString().slice(0, 10) : null;
  const overlapDays = overlapStart && overlapEnd ? daysBetween(overlapStart, overlapEnd) : 0;
  const availableWeeks = category === "OWN_MEDICAL" ? rule?.medicalLeaveWeeks : rule?.familyLeaveWeeks;
  const eligibleDays = Math.min(overlapDays, (availableWeeks ?? 0) * 7);
  const applicable = Boolean(rule && activeOnLeaveDate && maximumYearApplies && categoryCovered && eligibleDays > 0);
  const target = Math.max(0, numberOrNull(options.coordinatedPayPeriodTarget ?? employee?.biweeklySalary ?? employee?.biweeklySalaryAmount) ?? Number.POSITIVE_INFINITY);
  const applicableMaximum = applicable ? rule.maximumWeeklyBenefit * eligibleDays / 7 : 0;
  const cap = Math.min(target, applicableMaximum);
  const recorded = sourceStateOffset(employee);
  const assumedStateOffset = applicable ? Math.max(0, Math.min(recorded?.amount ?? applicableMaximum, cap)) : 0;
  const suppliedStateAward = numberOrNull(options.actualStateAward ?? employee?.actualStateAward);
  const awardStatus = String(options.awardStatus || employee?.stateAwardStatus || (suppliedStateAward !== null ? "award-recorded" : "pending")).toLowerCase();
  const reconciliationEligible = suppliedStateAward !== null && ["award-recorded", "approved", "received"].includes(awardStatus);
  return {
    state, program: rule, applicable,
    futureProgram: Boolean(rule && leaveStart && leaveStart < rule.benefitsStartDate),
    programStatus: rule?.programStatus || null, activeOnLeaveDate, category, categoryCovered, maximumYearApplies,
    effectiveYear: applicable ? rule.maximumYear : null, weeklyMaximum: applicable ? rule.maximumWeeklyBenefit : 0,
    applicableMaximum, overlapDays, eligibleDays: applicable ? eligibleDays : 0, assumedStateOffset,
    actualStateAward: reconciliationEligible ? Math.max(0, suppliedStateAward) : null,
    lincolnReconciliation: reconciliationEligible ? Math.max(0, assumedStateOffset - Math.max(0, suppliedStateAward)) : 0,
    awardStatus, sourceAmountType: recorded && applicable ? recorded.source : "assumed",
    awardLetterRecipient: rule?.awardLetterRecipient || null, applicant: rule?.applicationOwner || null,
  };
};

export { STATE_BENEFIT_RULES };