export const PAY_UNAVAILABLE_MESSAGE =
  "Pay information is not available.";

export const getEmployeePaySummary = (employee) => {
  const biweeklySalary = employee?.biweeklySalary ?? null;

  return {
    hasPayData: Number.isFinite(biweeklySalary) && biweeklySalary > 0,
    biweeklySalary,
    product: employee?.product ?? null,
    payCode: employee?.payCode ?? null,
    benefitGrossAmount: employee?.benefitGrossAmount ?? null,
    totalOffsets: employee?.totalOffsets ?? null,
    adjustedBenefitGrossAmount: employee?.adjustedBenefitGrossAmount ?? null,
    payableBenefitPercentage: employee?.payableBenefitPercentage ?? null,
    payableAdjustedBenefitGrossAmount: employee?.payableAdjustedBenefitGrossAmount ?? null,
    payableCalculatedSalaryAmount: employee?.payableCalculatedSalaryAmount ?? null,
    payPeriodFromDate: employee?.payPeriodFromDate ?? null,
    payPeriodThroughDate: employee?.payPeriodThruDate ?? null,
  };
};