import { CONFLICTING_EMPLOYEE_IDS } from "./embeddedEmployeeRecords.js";

export const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : null;
};

export const normalizeEmployeeId = (value) => {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  const normalizedText = text.replace(/^\s+|\s+$/g, "");

  if (normalizedText.endsWith(".0") && /^\d+\.0$/.test(normalizedText)) {
    return normalizedText.slice(0, -2);
  }

  return normalizedText;
};

export const normalizeEmployeeName = (value) => {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  if (text.toLowerCase() === "n/a") {
    return "n/a";
  }

  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

export const matchEmployeeIdentity = (
  record,
  expectedFirstName,
  expectedLastName,
  expectedEmployeeId,
) => {
  if (!record) {
    return false;
  }

  const recordFirstName = normalizeEmployeeName(record.firstName);
  const recordEmployeeId = normalizeEmployeeId(record.employeeId);

  const targetFirstName = normalizeEmployeeName(expectedFirstName);
  const targetLastName = normalizeEmployeeName(expectedLastName);
  const targetEmployeeId = normalizeEmployeeId(expectedEmployeeId);
  const recordLastName =
    normalizeEmployeeName(record.lastName) ||
    (targetLastName === "n/a" ? "n/a" : "");

  if (!recordEmployeeId || !targetEmployeeId) {
    return false;
  }

  const blockedEmployeeIds = new Set(
    CONFLICTING_EMPLOYEE_IDS.map(normalizeEmployeeId).filter(Boolean),
  );

  if (
    blockedEmployeeIds.has(recordEmployeeId) ||
    blockedEmployeeIds.has(targetEmployeeId)
  ) {
    return false;
  }

  return (
    recordFirstName === targetFirstName &&
    recordLastName === targetLastName &&
    recordEmployeeId === targetEmployeeId
  );
};
