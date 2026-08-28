// Explicit approval-date fields only. Never inferred from status, leave dates, or pay-period dates.
const APPROVAL_DATE_FIELDS = Object.freeze(["leaveApprovalDate", "claimApprovalDate", "decisionDate"]);

const populated = (value) => value !== null && value !== undefined && String(value).trim() !== "";

const isValidCalendarDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
};

const collectApprovalDateCandidates = (employee) => {
  const records = [employee, ...(Array.isArray(employee?.sourceRecords) ? employee.sourceRecords : [])];
  const candidates = [];
  records.forEach((record) => {
    if (!record) return;
    APPROVAL_DATE_FIELDS.forEach((field) => {
      const raw = record[field];
      if (populated(raw)) candidates.push({ field, value: String(raw).trim() });
    });
  });
  return candidates;
};

// Returns exactly one of: missing | ambiguous | invalid | found
export const resolveEmployeeApprovalDate = (employee) => {
  const candidates = collectApprovalDateCandidates(employee);
  if (!candidates.length) return { status: "missing", candidates: [] };

  const distinctValues = [...new Set(candidates.map((candidate) => candidate.value))];
  if (distinctValues.length > 1) return { status: "ambiguous", candidates };

  const value = distinctValues[0];
  const field = candidates[0].field;
  if (!isValidCalendarDate(value)) return { status: "invalid", value, field, candidates };

  return { status: "found", value, field, candidates };
};

export const APPROVAL_DATE_FIELD_NAMES = APPROVAL_DATE_FIELDS;
