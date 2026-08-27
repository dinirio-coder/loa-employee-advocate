import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import {
  getEmployeePaySummary,
  PAY_UNAVAILABLE_MESSAGE,
} from "../src/data/payUtils.js";
import { getEmployeeDurationSummary } from "../src/data/durationUtils.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertNoUndefined = (value, path = "profile") => {
  if (value === undefined) throw new Error(`${path} is undefined.`);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoUndefined(entry, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => assertNoUndefined(entry, `${path}.${key}`));
  }
};

const profiles = [
  {
    label: "Amelia Moore",
    profile: getVerifiedEmployeeProfile("Amelia", "Moore", "129384"),
    expected: {
      location: "Remote - USA - Denver",
      classDescription: "CONTINUOUS LEAVE FOR LEAVE TYPE OWN, LEAVE REASON PREGNANCY",
      leaveType: "OWN",
      leaveStatus: "PE",
      statusReason: "EARLY SUBMISSION",
    },
  },
  {
    label: "Will Johansson",
    profile: getVerifiedEmployeeProfile("Will", "Johansson", "2749015"),
    expected: {
      location: "Remote - USA - Denver",
      product: "PLCO",
      classDescription: "CONTINUOUS LEAVE FOR ALL LEAVE TYPES (INCLUDING NICU), EXCEPT PREGNANCY RELATED",
      leaveCategory: "C",
      leaveType: "BND",
      leaveReasonDescription: "NEWBORN - PATERNITY",
      leaveStatus: "PE",
      statusReason: "EARLY SUBMISSION",
      dateReceived: "2026-08-03",
      leaveBeginDate: "2027-02-01",
    },
  },
  {
    label: "Goofy",
    profile: getVerifiedEmployeeProfile("Goofy", "N/A", "100005"),
    expected: {
      leaveCategory: "CONTINUOUS",
      leaveType: "BONDING",
      leaveReasonDescription: "NEWBORN - PATERNITY",
      leaveStatus: "APPROVED",
      currentReportStatus: "APPROVED",
      leaveHoursUsed: "400",
      leaveHoursRemaining: "80",
      leaveBeginDate: "2026-06-15",
      leaveEndDate: "2026-09-06",
      estimatedRTW: "2026-09-07",
      disabilityApprovedThrough: "2026-09-06",
      durationDays: "84",
    },
  },
  {
    label: "Edgar Melville ATP",
    profile: getVerifiedEmployeeProfile("Edgar", "Melville", "3459280"),
    expected: {
      biweeklySalary: 9042.36,
      biweeklySalary__type: "number",
      benefitGrossAmount: 3013.82,
      benefitGrossAmount__type: "number",
      totalOffsets: 0,
      totalOffsets__type: "number",
      payableBenefitPercentage: 100,
      payableBenefitPercentage__type: "number",
      payableCalculatedSalaryAmount: 3013.82,
      payableCalculatedSalaryAmount__type: "number",
    },
  },
  {
    label: "Leo Dostoevsky ATP",
    profile: getVerifiedEmployeeProfile("Leo", "Dostoevsky", "4835966"),
    expected: {
      biweeklySalary: 12631.48,
      biweeklySalary__type: "number",
      product: "STDCP",
      payCode: "Parental",
      disabilityApprovedThrough: "2026-08-16",
      benefitGrossAmount: 10105.18,
      benefitGrossAmount__type: "number",
      totalOffsets: 2641.57,
      totalOffsets__type: "number",
      adjustedBenefitGrossAmount: 7463.61,
      payableBenefitPercentage: 100,
      payableBenefitPercentage__type: "number",
      payableCalculatedSalaryAmount: 7463.61,
      payableCalculatedSalaryAmount__type: "number",
    },
  },
];

for (const { label, profile, expected } of profiles) {
  assert(profile, `${label} did not produce a profile.`);
  assert(profile.sourceRecords.length > 0, `${label} has no source records.`);
  assertNoUndefined(profile, label);
  for (const [field, value] of Object.entries(expected)) {
    if (field.endsWith("__type")) {
      const valueField = field.slice(0, -6);
      assert(typeof profile[valueField] === value, `${label} ${valueField}: expected type ${value}, got ${typeof profile[valueField]}.`);
      continue;
    }
    assert(profile[field] === value, `${label} ${field}: expected ${value}, got ${profile[field]}.`);
  }
  assert(profile.currentReportStatus !== null, `${label} status selector returned unavailable.`);
  assert(profile.product !== null, `${label} product selector returned unavailable.`);
}

const invalidProfile = getVerifiedEmployeeProfile("Olivia", "Garcia", "475869");
assert(invalidProfile === null, "Conflicted employee ID should not produce a profile.");

const edgarProfile = getVerifiedEmployeeProfile("Edgar", "Melville", "3459280");
const edgarPay = getEmployeePaySummary(edgarProfile);
assert(edgarPay.hasPayData === true, "Edgar ATP pay data should be available.");
assert(edgarPay.biweeklySalary === 9042.36, "Edgar pay selector returned the wrong biweekly salary.");
assert(edgarPay.product === "PLCOB", "Edgar pay selector returned the wrong product.");
assert(edgarPay.payCode === "MedLeave", "Edgar pay selector returned the wrong pay code.");
assert(edgarPay.benefitGrossAmount === 3013.82, "Edgar pay selector returned the wrong benefit gross amount.");
assert(edgarPay.totalOffsets === 0, "Edgar pay selector returned the wrong total offsets.");
assert(edgarPay.payableBenefitPercentage === 100, "Edgar pay selector returned the wrong payable benefit percentage.");
assert(edgarPay.payableCalculatedSalaryAmount === 3013.82, "Edgar pay selector returned the wrong calculated salary amount.");

const noPayProfile = getVerifiedEmployeeProfile("Goofy", "N/A", "100005");
const noPay = getEmployeePaySummary(noPayProfile);
assert(noPay.hasPayData === false, "No-pay employee should not have pay data.");
assert(PAY_UNAVAILABLE_MESSAGE === "Pay information is not available.", "Unavailable-pay message changed unexpectedly.");

const durationCases = [
  ["Edgar", "Melville", "3459280", { durationDays: 154, durationWeeks: 22, startDate: "2025-11-17", endDate: "2026-04-19", endDateLabel: "Certified Through", leaveType: "BND", leaveReason: "NEWBORN - MATERNITY", sourceSheet: "Weekly Leave Intermittent Report", calculationMethod: "Inclusive calendar days" }],
  ["Luke", "Skywalker", "1048291", { durationDays: 365 }],
  ["Goofy", "N/A", "100005", { durationDays: 84 }],
  ["Amelia", "Moore", "129384", { hasDuration: false }],
];

for (const [firstName, lastName, employeeId, expected] of durationCases) {
  const summary = getEmployeeDurationSummary(getVerifiedEmployeeProfile(firstName, lastName, employeeId));
  for (const [field, value] of Object.entries(expected)) {
    assert(summary[field] === value, `${firstName} ${lastName} duration ${field}: expected ${value}, got ${summary[field]}.`);
  }
}

const edgarDuration = getEmployeeDurationSummary(edgarProfile);
assert(edgarDuration.dateRangeLabel.includes("Nov 17, 2025") && edgarDuration.dateRangeLabel.includes("Apr 19, 2026"), "Edgar date range label is incorrect.");

console.log("Validated complete operational profiles for Amelia, Will, and Goofy.");
console.log("Verified source records, field mappings, selectors, null safety, and conflict rejection.");
console.log(`Edgar pay selector: ${JSON.stringify(edgarPay)}`);
console.log(`No-pay employee selector: ${JSON.stringify(noPay)}; message: ${PAY_UNAVAILABLE_MESSAGE}`);
