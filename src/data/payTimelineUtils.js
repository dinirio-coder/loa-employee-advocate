import { getEmployeePaySummary } from "./payUtils.js";
import { getEmployeeDurationSummary } from "./durationUtils.js";
import { getEmployeeNextMilestone } from "./milestoneUtils.js";
import { getEmployeeReturnToWorkSummary } from "./rtwUtils.js";
import { getStateBenefitCoordination } from "./stateBenefitUtils.js";

export const STD_PRODUCTS = Object.freeze(["STD", "STDCP"]);
export const PARENTAL_PRODUCTS = Object.freeze(["PLCOB"]);

const DATE_FIELDS = [
  ["leave-begin", "Leave begin", "leaveBeginDate", "Twilio Leave Operations"],
  ["benefit-begin", "Benefit begin", "benefitBeginDate", "Lincoln Financial"],
  ["approved-through", "Approved through", "disabilityApprovedThrough", "Lincoln Financial"],
  ["certified-through", "Certified through", "intermittentCertifiedThrough", "Lincoln Financial"],
  ["benefit-end", "Benefit end", "benefitEndDate", "Lincoln Financial"],
  ["leave-end", "Leave end", "leaveEndDate", "Twilio Leave Operations"],
  ["planned-rtw", "Planned return to work", "estimatedRTW", "Employee / Manager"],
  ["actual-rtw", "Actual return to work", "actualRTW", "Employee / Manager"],
];

const populated = (value) => value !== null && value !== undefined && String(value).trim() !== "";
const asDate = (value) => new Date(`${value}T00:00:00Z`).getTime();
const isValidIso = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(asDate(value)) && new Date(asDate(value)).toISOString().slice(0, 10) === value;

export const normalizeDisplayDate = (value) => {
  if (!populated(value)) return null;
  const text = String(value).trim();
  if (isValidIso(text)) return text;

  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 86400000));
    const iso = date.toISOString().slice(0, 10);
    return isValidIso(iso) ? iso : null;
  }

  const formatted = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (formatted) {
    const [, month, day, year] = formatted;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidIso(iso) ? iso : null;
  }
  return null;
};

const sourceLabel = (value) => value === "Weekly Leave Intermittent Repor" ? "Weekly Leave Intermittent Report" : value || null;
const finitePositive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const finiteOrNull = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const cents = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const productKey = (value) => String(value || "").trim().toUpperCase();
const recordKey = (record, index) => `${record.employeeId || "employee"}-${record.sourceSheet || "source"}-${index}`;

const sourceValues = (pay, record) => ({
  biweeklySalary: finiteOrNull(pay.biweeklySalary),
  benefitGrossAmount: finiteOrNull(pay.benefitGrossAmount),
  totalOffsets: finiteOrNull(pay.totalOffsets),
  adjustedBenefitGrossAmount: finiteOrNull(pay.adjustedBenefitGrossAmount),
  payableBenefitPercentage: finiteOrNull(pay.payableBenefitPercentage),
  payableAdjustedBenefitGrossAmount: finiteOrNull(pay.payableAdjustedBenefitGrossAmount),
  payableCalculatedSalaryAmount: finiteOrNull(pay.payableCalculatedSalaryAmount),
  payableCalculatedCommissionAmount: finiteOrNull(record?.payableCalculatedCommissionAmount),
  product: pay.product,
  payCode: pay.payCode,
  payPeriodFromDate: normalizeDisplayDate(pay.payPeriodFromDate),
  payPeriodThroughDate: normalizeDisplayDate(pay.payPeriodThroughDate),
  sourceSheet: sourceLabel(record?.sourceSheet),
  stateBenefitOffset: finiteOrNull(record?.stateBenefitOffset ?? record?.stateOffsetAmount ?? record?.stateBenefitAward),
  stateOffsetIncluded: record?.stateOffsetIncluded === true || record?.stateOffsetSource === "source-record",
});

const selectPayRecord = (employee) => {
  const records = Array.isArray(employee?.sourceRecords) ? employee.sourceRecords : [];
  return records.find((record) => finitePositive(record.biweeklySalaryAmount)) || null;
};

const statusFor = (date, asOfDate) => date < asOfDate ? "past" : date === asOfDate ? "current" : "future";

const buildEvents = (employee, asOfDate) => {
  const records = Array.isArray(employee?.sourceRecords) ? employee.sourceRecords : [];
  const events = records.flatMap((record, recordIndex) => DATE_FIELDS.flatMap(([fieldId, label, field, owner]) => {
    const date = normalizeDisplayDate(record[field]);
    return date ? [{ id: `${recordKey(record, recordIndex)}-${fieldId}`, label, date, owner, source: sourceLabel(record.sourceSheet), status: statusFor(date, asOfDate), recordKey: recordKey(record, recordIndex) }] : [];
  }));
  const distinctByLabel = new Map();
  events.forEach((event) => {
    const key = event.label;
    if (!distinctByLabel.has(key)) distinctByLabel.set(key, new Set());
    distinctByLabel.get(key).add(event.date);
  });
  return events.map((event) => ({ ...event, conflict: (distinctByLabel.get(event.label)?.size || 0) > 1 }));
};

export const getEmployeePayTimeline = (employee, options = {}) => {
  const asOfDate = normalizeDisplayDate(options.asOfDate) || new Date().toISOString().slice(0, 10);
  const payRecord = selectPayRecord(employee);
  const pay = payRecord ? getEmployeePaySummary({ ...payRecord, biweeklySalary: Number(payRecord.biweeklySalaryAmount), payPeriodThruDate: payRecord.payPeriodThruDate }) : getEmployeePaySummary(employee);
  const hasPayData = Boolean(pay.hasPayData);
  const product = productKey(payRecord?.product || pay.product);
  const payScenario = !hasPayData ? "none" : STD_PRODUCTS.includes(product) ? "std" : PARENTAL_PRODUCTS.includes(product) ? "parental" : "record-only";
  const sourcePayValues = hasPayData ? sourceValues(pay, payRecord) : null;
  const duration = getEmployeeDurationSummary(employee);
  const matchingRangeRecord = duration.hasDuration && duration.startDate && duration.endDate
    ? (employee?.sourceRecords || []).find((record) => normalizeDisplayDate(record.leaveBeginDate) === duration.startDate && (normalizeDisplayDate(record.leaveEndDate) === duration.endDate || normalizeDisplayDate(record.disabilityApprovedThrough) === duration.endDate || normalizeDisplayDate(record.intermittentCertifiedThrough) === duration.endDate))
    : null;
  const rtw = getEmployeeReturnToWorkSummary(employee);
  const milestone = getEmployeeNextMilestone(employee, { asOfDate });
  const lincolnGross = cents(pay.biweeklySalary * 0.6667);
  const stateBenefit = getStateBenefitCoordination({ ...payRecord, ...employee, payPeriodFromDate: pay.payPeriodFromDate, payPeriodThruDate: pay.payPeriodThroughDate }, { coordinatedPayPeriodTarget: pay.biweeklySalary, lincolnGross });
  const planningEstimate = payScenario === "std" ? {
    dailyBusinessDayRate: pay.biweeklySalary / 10,
    eliminationPeriod: { label: "Twilio planning estimate for eligible business days", amount: pay.biweeklySalary / 10 * 5 },
    lincoln: { label: "Lincoln planning estimate at 66.67%", amount: lincolnGross },
    lincolnNetAfterStateOffset: stateBenefit.lincolnAfterStateOffset,
    twilio: { label: "Twilio Estimated Top-Up", amount: stateBenefit.twilioEstimatedTopUp },
    combinedGross: cents(pay.biweeklySalary),
    basePayTarget: cents(pay.biweeklySalary),
  } : null;
  const missingInformation = [];
  if (!hasPayData) missingInformation.push("A finite positive biweekly salary is not present in the source report.");
  if (hasPayData && payScenario === "record-only") missingInformation.push("The product classification is not recognized for a planning formula.");
  if (hasPayData && payScenario === "parental") missingInformation.push("This record is classified as paid parental leave; an STD breakdown is not applied.");
  if (!payRecord?.payPeriodFromDate || !payRecord?.payPeriodThruDate) missingInformation.push("A source pay period is not available.");
  if (!duration.hasDuration) missingInformation.push("A valid single-record leave range is not available.");
  return {
    hasPayData,
    payScenario,
    salaryBasis: hasPayData ? "Biweekly salary from the selected source pay record" : null,
    sourcePayValues,
    planningEstimate,
    stateBenefit,
    payPeriod: sourcePayValues?.payPeriodFromDate && sourcePayValues?.payPeriodThroughDate ? { from: sourcePayValues.payPeriodFromDate, through: sourcePayValues.payPeriodThroughDate, source: sourcePayValues.sourceSheet } : null,
    timelineEvents: buildEvents(employee, asOfDate),
    timelineRanges: duration.hasDuration && matchingRangeRecord ? [{ id: `${recordKey(matchingRangeRecord, employee.sourceRecords.indexOf(matchingRangeRecord))}-leave-window`, startDate: duration.startDate, endDate: duration.endDate, startLabel: "Leave begins", endLabel: duration.endDateLabel || "Leave ends", durationDays: duration.durationDays, durationWeeks: duration.durationWeeks, source: duration.sourceSheet, context: duration.contextLabel }] : [],
    missingInformation,
    sourceBasis: { pay: sourcePayValues?.sourceSheet || null, duration: duration.sourceSheet || null, milestone: milestone.source || null, rtw: rtw.sourceSheet || null },
    nextMilestone: milestone,
    rtw,
  };
};
