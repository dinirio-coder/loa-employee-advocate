import { toFiniteNumberOrNull } from "./identityUtils.js";

const populated = (value) => value !== null && value !== undefined && String(value).trim() !== "";

const validDate = (value) => {
  if (!populated(value)) return null;
  const text = String(value).trim();
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : text;
};

const statusValue = (record) =>
  String(record.leaveStatus || record.claimStatus || record.statusCode || "").trim();

const isOpen = (record) => !["CL", "CLOSED"].includes(statusValue(record).toUpperCase());

const sourceSheetLabel = (value) =>
  value === "Weekly Leave Intermittent Repor" ? "Weekly Leave Intermittent Report" : value;

const differenceInCalendarDays = (endDate, startDate) =>
  Math.round((new Date(`${endDate}T00:00:00Z`) - new Date(`${startDate}T00:00:00Z`)) / 86400000);

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );

const recordContext = (record) => ({
  leaveType: record.leaveType || null,
  leaveReason: record.leaveReasonDescription || record.leaveReason || null,
  status: statusValue(record) || null,
  sourceSheet: sourceSheetLabel(record.sourceSheet) || null,
});

const candidatesFor = (records, getDates, calculationMethod, endDateLabel) =>
  records.flatMap((record) => {
    const { startDate, endDate } = getDates(record);
    const validStart = validDate(startDate);
    const validEnd = validDate(endDate);
    if (!validStart || !validEnd || differenceInCalendarDays(validEnd, validStart) < 0) return [];
    const sourceEndDateLabel = record.sourceSheet?.includes("Intermittent")
      ? "Certified Through"
      : endDateLabel;
    return [{ record, startDate: validStart, endDate: validEnd, calculationMethod, endDateLabel: sourceEndDateLabel }];
  });

export const getEmployeeDurationSummary = (employee) => {
  const records = Array.isArray(employee?.sourceRecords) ? employee.sourceRecords : [];
  const orderedRecords = [...records].sort((left, right) => Number(isOpen(right)) - Number(isOpen(left)));
  const explicit = orderedRecords.flatMap((record) => {
    const durationDays = toFiniteNumberOrNull(record.durationDays);
    return durationDays !== null && durationDays >= 0
      ? [{ record, durationDays, startDate: validDate(record.leaveBeginDate), endDate: validDate(record.leaveEndDate), endDateLabel: "Leave End Date", calculationMethod: "Source-reported duration" }]
      : [];
  });
  const completeLeave = candidatesFor(
    orderedRecords,
    (record) => ({ startDate: record.leaveBeginDate, endDate: record.leaveEndDate }),
    "Inclusive calendar days",
    "Leave End Date",
  );
  const intermittent = candidatesFor(
    orderedRecords,
    (record) => ({
      startDate: record.beginDate || record.leaveBeginDate,
      endDate: record.intermittentCertifiedThrough || record.disabilityApprovedThrough,
    }),
    "Inclusive calendar days",
    "Certified Through",
  );
  const benefit = candidatesFor(
    orderedRecords,
    (record) => ({ startDate: record.benefitBeginDate, endDate: record.benefitEndDate }),
    "Inclusive calendar days",
    "Benefit End Date",
  );
  const selected = explicit[0] || completeLeave[0] || intermittent[0] || benefit[0];

  if (!selected) {
    return {
      hasDuration: false,
      durationDays: null,
      durationWeeks: null,
      startDate: null,
      endDate: null,
      endDateLabel: null,
      dateRangeLabel: null,
      contextLabel: null,
      leaveType: null,
      leaveReason: null,
      status: null,
      sourceSheet: null,
      calculationMethod: null,
    };
  }

  const durationDays = selected.durationDays ?? differenceInCalendarDays(selected.endDate, selected.startDate) + 1;
  const durationWeeks = durationDays / 7;
  const context = recordContext(selected.record);

  return {
    hasDuration: true,
    durationDays,
    durationWeeks,
    startDate: selected.startDate,
    endDate: selected.endDate,
    endDateLabel: selected.endDateLabel,
    dateRangeLabel: selected.startDate && selected.endDate ? `${formatDate(selected.startDate)} – ${formatDate(selected.endDate)}` : null,
    contextLabel: [selected.endDateLabel === "Certified Through" ? "Certified-through window" : "Planned leave window", context.leaveType].filter(Boolean).join(" · ") || null,
    ...context,
    calculationMethod: selected.calculationMethod,
  };
};