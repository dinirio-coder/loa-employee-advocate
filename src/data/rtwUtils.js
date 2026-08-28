const NOT_AVAILABLE = "Not available";

const populated = (value) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== "" && !["null", "undefined", "NaN"].includes(text.toLowerCase());
};

const validDate = (value) => {
  if (!populated(value)) return null;
  const text = String(value).trim();
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : text;
};

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

const sourceSheetLabel = (value) =>
  value === "Weekly Leave Intermittent Repor" ? "Weekly Leave Intermittent Report" : value;

const contextDates = (record) => [
  ["Leave begins", validDate(record.leaveBeginDate)],
  ["Leave ends", validDate(record.leaveEndDate)],
  ["Pay date", validDate(record.benefitEndDate)],
  ["Disability approved through", validDate(record.disabilityApprovedThrough)],
].filter(([, value]) => value).map(([label, value]) => ({
  label,
  value,
  displayValue: formatDate(value),
}));

const candidates = (records, field, label) =>
  records.flatMap((record, index) => {
    const value = validDate(record[field]);
    return value ? [{ record, index, value, label }] : [];
  });

export const getEmployeeReturnToWorkSummary = (employee) => {
  const records = Array.isArray(employee?.sourceRecords) ? employee.sourceRecords : [];
  const actual = candidates(records, "actualRTW", "Actual return date");
  const estimated = candidates(records, "estimatedRTW", "Estimated return date");
  const explicit = candidates(records, "returnOrStayAtWork", "Return date");
  const selected = actual[0] || estimated[0] || explicit[0] || null;

  if (!selected) {
    return {
      hasReturnToWorkData: false,
      status: "Return date not available",
      statusBasis: "No valid return date is available.",
      estimatedReturnDate: null,
      actualReturnDate: null,
      controllingReturnDate: null,
      controllingDateLabel: null,
      sourceSheet: null,
      contextDates: [],
      notAvailableMessage: NOT_AVAILABLE,
    };
  }

  const isActual = selected.label === "Actual return date";
  const selectedRecord = selected.record;
  return {
    hasReturnToWorkData: true,
    status: isActual ? "Return recorded" : "Planned return",
    statusBasis: isActual ? "Actual return date recorded." : `${selected.label}.`,
    estimatedReturnDate: validDate(selectedRecord.estimatedRTW),
    actualReturnDate: validDate(selectedRecord.actualRTW),
    controllingReturnDate: selected.value,
    controllingDateLabel: selected.label,
    sourceSheet: sourceSheetLabel(selectedRecord.sourceSheet) || null,
    contextDates: contextDates(selectedRecord),
    notAvailableMessage: NOT_AVAILABLE,
  };
};

export { NOT_AVAILABLE as RTW_NOT_AVAILABLE, formatDate as formatReturnToWorkDate };