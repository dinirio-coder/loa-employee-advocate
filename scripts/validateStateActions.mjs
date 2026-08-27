import assert from "node:assert/strict";
import { getEmployeePriorityActions } from "../src/data/actionPlanUtils.js";

const employee = (state, category, extra = {}) => ({ state, leaveCategory: category, leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-31", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14", biweeklySalaryAmount: "10275.24", sourceRecords: [{ state, leaveCategory: category, leaveBeginDate: "2026-08-01", leaveEndDate: "2026-08-31", payPeriodFromDate: "2026-08-01", payPeriodThruDate: "2026-08-14", biweeklySalaryAmount: "10275.24", product: "STD", ...extra }] });
const options = { asOfDate: "2026-08-27" };
const customProgram = { stateCode: "CA", stateName: "California", programName: "Example Disability Benefit", programStatus: "Active", programType: "MEDICAL", benefitsStartDate: "2020-01-01", benefitsEndDate: null, maximumYear: 2026, maximumWeeklyBenefit: 500, familyLeaveWeeks: null, medicalLeaveWeeks: 26, coveredLeaveCategories: ["OWN_MEDICAL"], applicationOwner: "Employee", applicationUrl: "https://example.com/apply", officialProgramUrl: "https://example.com", eligibilityDescription: "Basic program information" };
const employeeApplied = getEmployeePriorityActions(employee("CA", "OWN_MEDICAL"), { ...options, programs: { CA: [customProgram] } });
assert.equal(employeeApplied.filter((item) => item.title === "Apply for your state benefit").length, 1);
assert.equal(employeeApplied.find((item) => item.title === "Apply for your state benefit").urgency, "High");
const lincolnManaged = getEmployeePriorityActions(employee("NY", "OWN_MEDICAL"), options);
assert.equal(lincolnManaged.some((item) => item.title === "Apply for your state benefit"), false);
assert.equal(new Set(lincolnManaged.map((item) => item.id)).size, lincolnManaged.length);
console.log("State application action validation passed; generated rules currently provide no employee-applied application URL.");
