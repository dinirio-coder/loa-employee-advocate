import assert from "node:assert/strict";
import fs from "node:fs";
const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const scheduleUtilsSource = fs.readFileSync(new URL("../src/data/payScheduleUtils.js", import.meta.url), "utf8");
assert(source.includes("lg:grid-cols-[11fr_14fr]"));
assert(source.includes("Pay Estimate Summary") && source.includes("Estimated pay for this pay period") && source.includes("displayPayPeriod(experience.payPeriod.from, experience.payPeriod.through)"));
assert(source.includes("When you can expect payment") && source.includes("CUTOFF ${schedule.cutoffStatus.toUpperCase()}"));
assert(source.includes("sm:grid-cols-2") && source.includes("Leave approval date") && source.includes("Expected Twilio pay date") && source.includes("Pay period number"));
assert(scheduleUtilsSource.includes("Based on the recorded approval date"));
assert(source.includes("View the full 2026 leave pay schedule") && source.includes("aria-expanded={open}") && source.includes("setOpen((current) => !current)"));
assert(source.includes("PAY_SCHEDULE_2026.map") && source.includes("matched && row.payPeriodNumber === schedule.payPeriodNumber") && source.includes("border-[#1B66EE]"));
assert(source.includes("First 7 Calendar Days") && source.includes("experience.scenario === \"parental\"") && source.includes("StateStatutoryCard employee={employee}"));
const paymentTimingSource = source.slice(source.indexOf("function PaymentTimingCard"), source.indexOf("export function PayExperienceLayout"));
assert(!paymentTimingSource.includes("min-w-["));
assert(paymentTimingSource.includes("if (!matched) return"), "Unmatched approval-date statuses must hide the personalized grid.");
assert(paymentTimingSource.includes("schedule.supportingGuidance"), "Outside/missing statuses must be able to show supporting guidance.");
assert(getEmployeePayScheduleUsesEmployee(source), "PayTimelineTab must select the schedule from the employee's approval date, not the derived pay experience.");
function getEmployeePayScheduleUsesEmployee(text) {
  const tabSource = text.slice(text.indexOf("function PayTimelineTab"), text.indexOf("function PayRow"));
  return tabSource.includes("getEmployeePaySchedule(employee");
}
console.log("Pay schedule UI validation passed.");
