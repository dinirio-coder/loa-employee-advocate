const NOT_AVAILABLE = "Not available in source report";

const validDate = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const text = String(value).trim();
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : text;
};

const asDate = (value) => new Date(`${value}T00:00:00Z`).getTime();
const sourceLabel = (value) => value === "Weekly Leave Intermittent Repor" ? "Weekly Leave Intermittent Report" : value;

const dateFields = [
  ["Actual return date", "actualRTW", "Employee / Manager", "Confirmed source RTW date"],
  ["Estimated return date", "estimatedRTW", "Employee / Manager", "Planned source RTW date"],
  ["Leave begins", "leaveBeginDate", "Twilio Leave Operations", "Confirmed source leave start date"],
  ["Leave ends", "leaveEndDate", "Twilio Leave Operations", "Confirmed source leave end date"],
  ["Benefit ends", "benefitEndDate", "Lincoln Financial", "Confirmed source benefit end date"],
  ["Disability approved through", "disabilityApprovedThrough", "Lincoln Financial", "Confirmed source approved-through date"],
];

export const getEmployeeNextMilestone = (employee, options = {}) => {
  const records = Array.isArray(employee?.sourceRecords) ? employee.sourceRecords : [];
  const asOf = validDate(options.asOfDate) || new Date().toISOString().slice(0, 10);
  const candidates = records.flatMap((record, recordIndex) => dateFields.flatMap(([label, field, owner, basis], fieldIndex) => {
    const date = validDate(record[field]);
    return date && asDate(date) >= asDate(asOf)
      ? [{ label, date, owner, basis, source: sourceLabel(record.sourceSheet) || null, recordIndex, fieldIndex }]
      : [];
  }));
  const selected = candidates.sort((left, right) => asDate(left.date) - asDate(right.date) || left.recordIndex - right.recordIndex || left.fieldIndex - right.fieldIndex)[0];

  if (!selected) {
    return {
      hasMilestone: false,
      label: null,
      date: null,
      timing: NOT_AVAILABLE,
      owner: null,
      source: null,
      basis: "No current or future explicitly labeled milestone date is present in the source records.",
    };
  }

  return {
    hasMilestone: true,
    label: selected.label,
    date: selected.date,
    timing: selected.date === asOf ? "Today" : selected.date > asOf ? "Upcoming" : "Recorded",
    owner: selected.owner,
    source: selected.source,
    basis: selected.basis,
  };
};

export { NOT_AVAILABLE as MILESTONE_NOT_AVAILABLE };