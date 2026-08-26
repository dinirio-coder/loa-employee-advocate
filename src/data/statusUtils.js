const NOT_AVAILABLE = "Not available in source report";

import { LINCOLN_CODE_DICTIONARY } from "./lincolnCodeDictionary.js";

const employeeFriendlyLabels = {
  PE: "Pending review",
  AP: "Approved",
  CL: "Closed",
  DE: "Denied",
  IP: "In process",
  VD: "Void",
};

const findCode = (entries, code) => entries.find((entry) => entry.code.toUpperCase() === code.toUpperCase());

const formatDescription = (description) => {
  if (!description) return null;
  const normalized = description.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const findReason = (entries, statusCode, reasonInput) => {
  if (!reasonInput) return null;
  const normalized = String(reasonInput).trim().toUpperCase();
  return entries.find(
    (entry) =>
      entry.statusCode.toUpperCase() === statusCode &&
      (entry.code.toUpperCase() === normalized || entry.description.toUpperCase() === normalized),
  ) || null;
};

export const getEmployeeStatusSummary = (employee) => {
  const rawCode = String(
    employee?.currentReportStatus || employee?.leaveStatus || employee?.claimStatus || employee?.statusCode || "",
  ).trim();

  if (!rawCode) {
    return {
      value: NOT_AVAILABLE,
      rawCode: null,
      officialDescription: null,
      employeeFriendlyLabel: NOT_AVAILABLE,
      reasonCode: null,
      reasonDescription: null,
      basis: NOT_AVAILABLE,
    };
  }

  const primary = findCode(LINCOLN_CODE_DICTIONARY.primaryStatusCodes, rawCode);
  const normalizedCode = rawCode.toUpperCase();
  const reasonInput = employee?.statusReasonCode || employee?.statusReason || employee?.leaveStatusReasonDescription;
  const reason =
    findReason(LINCOLN_CODE_DICTIONARY.leaveStatusReasonCodes, normalizedCode, reasonInput) ||
    findReason(LINCOLN_CODE_DICTIONARY.disabilityStatusReasonCodes, normalizedCode, reasonInput);
  const employeeFriendlyLabel = employeeFriendlyLabels[normalizedCode] || "Unknown status";

  return {
    value: employeeFriendlyLabel,
    rawCode,
    officialDescription: primary?.description || null,
    employeeFriendlyLabel,
    reasonCode: reason?.code || null,
    reasonDescription: formatDescription(reason?.description),
    basis: primary ? "Lincoln workbook status dictionary." : "No confirmed human-readable mapping is available for this code.",
  };
};

export { NOT_AVAILABLE as STATUS_NOT_AVAILABLE };