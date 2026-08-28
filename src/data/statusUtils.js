const NOT_AVAILABLE = "Not available in source report";

import { LINCOLN_CODE_DICTIONARY } from "./lincolnCodeDictionary.js";

const PENDING_CODES = new Set(["PE", "PEND", "PENDED", "PENDING", "IP"]);
const APPROVED_CODES = new Set(["AP", "APPROVED"]);
const DENIED_CODES = new Set(["DE", "DENIED"]);
const CLOSED_CODES = new Set(["CL", "CLOSED"]);
const CANCELED_CODES = new Set(["VD", "VOID", "CANCELED", "CANCELLED"]);
const TERMINATED_CODES = new Set(["TERMINATED"]);
const INCOMPLETE_CODES = new Set(["INCOMPLETE"]);

const IGNORED_STATUS_PATTERNS = [
  /APPROVAL DATE UNAVAILABLE/i,
  /NEEDS VERIFICATION/i,
  /CHECK STATUS/i,
  /APPROVAL-MATCH STATUS/i,
  /PAYMENT STATUS/i,
];

const isIgnoredStatus = (val) => {
  if (!val || typeof val !== "string") return false;
  return IGNORED_STATUS_PATTERNS.some((pat) => pat.test(val));
};

const getRecognizedCategory = (codeStr) => {
  if (!codeStr || typeof codeStr !== "string") return null;
  const clean = codeStr.trim().toUpperCase();
  if (PENDING_CODES.has(clean)) return "PENDING";
  if (APPROVED_CODES.has(clean)) return "APPROVED";
  if (DENIED_CODES.has(clean)) return "DENIED";
  if (CLOSED_CODES.has(clean)) return "CLOSED";
  if (CANCELED_CODES.has(clean)) return "CANCELED";
  if (TERMINATED_CODES.has(clean)) return "TERMINATED";
  if (INCOMPLETE_CODES.has(clean)) return "INCOMPLETE";
  return null;
};

export const normalizeEmployeeLeaveStatus = (input = {}) => {
  if (typeof input === "string") {
    input = { currentReportStatus: input };
  }

  const claimStatus = input?.claimStatus ? String(input.claimStatus).trim() : null;
  const leaveStatus = input?.leaveStatus ? String(input.leaveStatus).trim() : null;
  const reportStatus = (input?.currentReportStatus ?? input?.reportStatus ?? input?.statusCode)
    ? String(input.currentReportStatus ?? input.reportStatus ?? input.statusCode).trim()
    : null;

  const sourceRecords = Array.isArray(input?.sourceRecords) ? input.sourceRecords : [];

  const candidateFields = [
    { code: claimStatus, type: "claimStatus" },
    { code: leaveStatus, type: "leaveStatus" },
    { code: reportStatus, type: "reportStatus" },
  ];

  let chosenRawCode = null;
  let category = null;

  for (const candidate of candidateFields) {
    if (candidate.code && !isIgnoredStatus(candidate.code)) {
      const cat = getRecognizedCategory(candidate.code);
      if (cat) {
        chosenRawCode = candidate.code;
        category = cat;
        break;
      }
    }
  }

  if (!chosenRawCode && sourceRecords.length > 0) {
    for (const rec of sourceRecords) {
      const recClaim = rec?.claimStatus ? String(rec.claimStatus).trim() : null;
      const recLeave = rec?.leaveStatus ? String(rec.leaveStatus).trim() : null;
      if (recClaim && !isIgnoredStatus(recClaim)) {
        const cat = getRecognizedCategory(recClaim);
        if (cat) {
          chosenRawCode = recClaim;
          category = cat;
          break;
        }
      }
      if (recLeave && !isIgnoredStatus(recLeave)) {
        const cat = getRecognizedCategory(recLeave);
        if (cat) {
          chosenRawCode = recLeave;
          category = cat;
          break;
        }
      }
    }
  }

  if (!chosenRawCode) {
    for (const candidate of candidateFields) {
      if (candidate.code && !isIgnoredStatus(candidate.code)) {
        chosenRawCode = candidate.code;
        break;
      }
    }
  }

  if (!chosenRawCode) {
    return {
      statusKey: "UNKNOWN",
      label: NOT_AVAILABLE,
      description: null,
      sourceCodeRecognized: false,
      rawCode: null,
    };
  }

  if (!category) {
    category = getRecognizedCategory(chosenRawCode);
  }

  if (!category) {
    return {
      statusKey: "UNKNOWN",
      label: "Unknown status",
      description: null,
      sourceCodeRecognized: false,
      rawCode: chosenRawCode,
    };
  }

  const reasonParts = [];
  const addReason = (val) => {
    if (val && typeof val === "string" && val.trim()) {
      reasonParts.push(val.trim().toUpperCase());
    }
  };

  addReason(input?.statusReason);
  addReason(input?.leaveStatusReason);
  addReason(input?.leaveStatusReasonDescription);
  addReason(input?.pendedClaimReason);
  addReason(input?.statusReasonCode);

  for (const rec of sourceRecords) {
    addReason(rec?.statusReason);
    addReason(rec?.leaveStatusReasonDescription);
    addReason(rec?.pendedClaimReason);
  }

  const combinedReasons = reasonParts.join(" | ");

  if (category === "PENDING") {
    const hasRuleA = /EARLY SUBMISSION|REVIEW PENDING|PENDING REVIEW/.test(combinedReasons);
    const hasRuleB = /DOCUMENT|CERTIFICATION|MEDICAL CERT|INCOMPLETE|MISSING INFORMATION/.test(combinedReasons);

    if (hasRuleA) {
      return {
        statusKey: "PENDING",
        label: "Pending review",
        description: combinedReasons.includes("EARLY SUBMISSION")
          ? "Lincoln received the request early and has not completed its review."
          : "Lincoln received the request and has not completed its review.",
        sourceCodeRecognized: true,
        rawCode: chosenRawCode,
      };
    }
    if (hasRuleB) {
      return {
        statusKey: "PENDING_DOCUMENTATION",
        label: "Documentation needed",
        description: "Lincoln is waiting for requested information or documentation.",
        sourceCodeRecognized: true,
        rawCode: chosenRawCode,
      };
    }
    return {
      statusKey: "PENDING",
      label: "Pending review",
      description: "Lincoln is reviewing the leave request.",
      sourceCodeRecognized: true,
      rawCode: chosenRawCode,
    };
  }

  if (category === "APPROVED") {
    return {
      statusKey: "APPROVED",
      label: "Approved",
      description: "Lincoln has approved the leave request.",
      sourceCodeRecognized: true,
      rawCode: chosenRawCode,
    };
  }

  if (category === "DENIED") {
    return {
      statusKey: "DENIED",
      label: "Denied",
      description: "Lincoln has denied the leave request.",
      sourceCodeRecognized: true,
      rawCode: chosenRawCode,
    };
  }

  if (category === "CLOSED") {
    return {
      statusKey: "CLOSED",
      label: "Closed",
      description: "This claim or leave record is closed.",
      sourceCodeRecognized: true,
      rawCode: chosenRawCode,
    };
  }

  if (category === "CANCELED") {
    return {
      statusKey: "CANCELED",
      label: "Canceled",
      description: "This leave request or claim was canceled.",
      sourceCodeRecognized: true,
      rawCode: chosenRawCode,
    };
  }

  if (category === "TERMINATED") {
    return {
      statusKey: "TERMINATED",
      label: "Terminated",
      description: "This leave request or claim was terminated.",
      sourceCodeRecognized: true,
      rawCode: chosenRawCode,
    };
  }

  if (category === "INCOMPLETE") {
    return {
      statusKey: "INCOMPLETE",
      label: "Documentation needed",
      description: "Lincoln is waiting for requested information or documentation.",
      sourceCodeRecognized: true,
      rawCode: chosenRawCode,
    };
  }

  return {
    statusKey: "UNKNOWN",
    label: "Unknown status",
    description: null,
    sourceCodeRecognized: false,
    rawCode: chosenRawCode,
  };
};

const findCode = (entries, code) => entries ? entries.find((entry) => entry.code.toUpperCase() === code.toUpperCase()) : null;

const formatDescription = (description) => {
  if (!description) return null;
  const normalized = description.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const findReason = (entries, statusCode, reasonInput) => {
  if (!reasonInput || !entries) return null;
  const normalized = String(reasonInput).trim().toUpperCase();
  return entries.find(
    (entry) =>
      entry.statusCode.toUpperCase() === statusCode &&
      (entry.code.toUpperCase() === normalized || entry.description.toUpperCase() === normalized),
  ) || null;
};

export const getEmployeeStatusSummary = (employee) => {
  const normalized = normalizeEmployeeLeaveStatus(employee);

  if (!normalized.rawCode || normalized.label === NOT_AVAILABLE) {
    return {
      value: NOT_AVAILABLE,
      rawCode: null,
      officialDescription: null,
      employeeFriendlyLabel: NOT_AVAILABLE,
      reasonCode: null,
      reasonDescription: null,
      basis: NOT_AVAILABLE,
      statusKey: "UNKNOWN",
      sourceCodeRecognized: false,
    };
  }

  const primary = findCode(LINCOLN_CODE_DICTIONARY.primaryStatusCodes, normalized.rawCode);
  const upperCode = normalized.rawCode.toUpperCase();
  const reasonInput = employee?.statusReasonCode || employee?.statusReason || employee?.leaveStatusReasonDescription;
  const reason =
    findReason(LINCOLN_CODE_DICTIONARY.leaveStatusReasonCodes, upperCode, reasonInput) ||
    findReason(LINCOLN_CODE_DICTIONARY.disabilityStatusReasonCodes, upperCode, reasonInput);

  return {
    value: normalized.label,
    rawCode: normalized.rawCode,
    officialDescription: primary?.description || (normalized.sourceCodeRecognized ? upperCode : null),
    employeeFriendlyLabel: normalized.label,
    reasonCode: reason?.code || null,
    reasonDescription: normalized.description || (reason ? formatDescription(reason.description) : null),
    basis: primary
      ? "Lincoln workbook status dictionary."
      : normalized.sourceCodeRecognized
      ? "Lincoln leave and claim status dictionary."
      : "No confirmed human-readable mapping is available for this code.",
    statusKey: normalized.statusKey,
    sourceCodeRecognized: normalized.sourceCodeRecognized,
  };
};

export { NOT_AVAILABLE as STATUS_NOT_AVAILABLE };