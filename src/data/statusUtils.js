const NOT_AVAILABLE = "Not available in source report";

const confirmedStatuses = {
  CL: "Closed",
  CLOSED: "Closed",
};

export const getEmployeeStatusSummary = (employee) => {
  const rawCode = String(
    employee?.currentReportStatus || employee?.leaveStatus || employee?.claimStatus || employee?.statusCode || "",
  ).trim();

  if (!rawCode) {
    return { value: NOT_AVAILABLE, rawCode: null, basis: NOT_AVAILABLE };
  }

  return {
    value: confirmedStatuses[rawCode.toUpperCase()] || `Status code: ${rawCode}`,
    rawCode,
    basis: confirmedStatuses[rawCode.toUpperCase()]
      ? "Closed is supported by existing application status logic."
      : "No confirmed human-readable mapping is available for this code.",
  };
};

export { NOT_AVAILABLE as STATUS_NOT_AVAILABLE };