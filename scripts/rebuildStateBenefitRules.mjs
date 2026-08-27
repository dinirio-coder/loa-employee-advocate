import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const WORKBOOK = path.join(ROOT, "State Paid Leave Rules.xlsx");
const OUTPUT = path.join(ROOT, "src/data/stateBenefitRules.js");
const FAMILY_SHEET_NAME = "State Paid Leave Rules";
const DISABILITY_SHEET_NAME = "State Disability Rules";
const FAMILY_REQUIRED_COLUMNS = [
  "State Code", "State Name", "Program Name", "Program Status",
  "Benefits Start Date", "Benefits End Date", "Maximum Year",
  "Maximum Weekly Benefit", "Family Leave Weeks", "Medical Leave Weeks",
  "Covered Leave Categories", "Application Owner", "Lincoln Coordination",
  "Award Letter Recipient", "Eligibility Description", "Official Program URL",
  "Last Verified Date",
];
const DISABILITY_REQUIRED_COLUMNS = [
  "State Code", "State Name", "Program Name", "Program Status",
  "Maximum Weekly Benefit (2026)", "Max Duration Weeks", "Eligibility Requirements",
  "Official Program URL", "Apply URL", "Last Verified Date", "Program Type", "Benefits Start Date",
  "Covered Leave Categories", "Application Owner", "Lincoln Coordination", "Award Letter Recipient",
];
const STATE_CODES = new Set("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA PR RI SC SD TN TX UT VT VA WA WV WI WY".split(" "));
const PROGRAM_STATUSES = new Set(["Active", "Pending Benefits", "Inactive"]);

const required = (value, label, rowNumber) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    throw new Error(`Row ${rowNumber}: missing required field ${label}`);
  }
  return value;
};

const isoDate = (value, label, rowNumber, optional = false) => {
  if ((value === null || value === undefined || value === "") && optional) return null;
  required(value, label, rowNumber);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Row ${rowNumber}: invalid date in ${label}`);
  return date.toISOString().slice(0, 10);
};

const nonNegativeNumber = (value, label, rowNumber, optional = false) => {
  if ((value === null || value === undefined || value === "") && optional) return null;
  const number = Number(required(value, label, rowNumber));
  if (!Number.isFinite(number) || number < 0) throw new Error(`Row ${rowNumber}: invalid or negative ${label}`);
  return number;
};

const text = (value, label, rowNumber, optional = false) => optional && (value === null || value === undefined || value === "")
  ? null
  : String(required(value, label, rowNumber)).trim();

const workbook = xlsx.readFile(WORKBOOK, { cellDates: true });
const rowsFor = (sheetName, requiredColumns) => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Worksheet ${sheetName} is missing`);
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  if (!rows.length) throw new Error(`Worksheet ${sheetName} is empty`);
  const headers = Object.keys(rows[0]);
  for (const column of requiredColumns) if (!headers.includes(column)) throw new Error(`Missing required column ${column} in ${sheetName}`);
  return rows;
};

const validateCommon = (row, rowNumber) => {
  const stateCode = text(row["State Code"], "State Code", rowNumber).toUpperCase();
  if (!STATE_CODES.has(stateCode)) throw new Error(`Row ${rowNumber}: invalid state code ${stateCode}`);
  const programName = text(row["Program Name"], "Program Name", rowNumber);
  const status = text(row["Program Status"], "Program Status", rowNumber);
  if (!PROGRAM_STATUSES.has(status)) throw new Error(`Row ${rowNumber}: invalid program status ${status}`);
  const url = text(row["Official Program URL"], "Official Program URL", rowNumber);
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { throw new Error(`Row ${rowNumber}: invalid Official Program URL`); }
  if (parsedUrl.protocol !== "https:" || /(^|\.)google\.[^/]+$/.test(parsedUrl.hostname) || /google\.[^/]+\/url/.test(url)) {
    throw new Error(`Row ${rowNumber}: Official Program URL must be a direct HTTPS URL`);
  }
  return { stateCode, stateName: text(row["State Name"], "State Name", rowNumber), programName, programStatus: status, url };
};

const categories = (row, rowNumber) => text(row["Covered Leave Categories"], "Covered Leave Categories", rowNumber).split(",").map((item) => item.trim()).filter(Boolean);
const familyRows = rowsFor(FAMILY_SHEET_NAME, FAMILY_REQUIRED_COLUMNS);
const disabilityRows = rowsFor(DISABILITY_SHEET_NAME, DISABILITY_REQUIRED_COLUMNS);
const familyRules = familyRows.map((row, index) => {
  const rowNumber = index + 2;
  const common = validateCommon(row, rowNumber);
  const coveredLeaveCategories = categories(row, rowNumber);
  return { ...common, programType: coveredLeaveCategories.includes("OWN_MEDICAL") ? "COMBINED" : "FAMILY", benefitsStartDate: isoDate(row["Benefits Start Date"], "Benefits Start Date", rowNumber), benefitsEndDate: isoDate(row["Benefits End Date"], "Benefits End Date", rowNumber, true), maximumYear: nonNegativeNumber(row["Maximum Year"], "Maximum Year", rowNumber), maximumWeeklyBenefit: nonNegativeNumber(row["Maximum Weekly Benefit"], "Maximum Weekly Benefit", rowNumber), familyLeaveWeeks: nonNegativeNumber(row["Family Leave Weeks"], "Family Leave Weeks", rowNumber, true), medicalLeaveWeeks: nonNegativeNumber(row["Medical Leave Weeks"], "Medical Leave Weeks", rowNumber, true), coveredLeaveCategories, applicationOwner: text(row["Application Owner"], "Application Owner", rowNumber), lincolnCoordination: text(row["Lincoln Coordination"], "Lincoln Coordination", rowNumber), awardLetterRecipient: text(row["Award Letter Recipient"], "Award Letter Recipient", rowNumber), eligibilityDescription: text(row["Eligibility Description"], "Eligibility Description", rowNumber), officialProgramUrl: common.url, lastVerifiedDate: isoDate(row["Last Verified Date"], "Last Verified Date", rowNumber) };
});
const disabilityRules = disabilityRows.map((row, index) => {
  const rowNumber = index + 2;
  const common = validateCommon(row, rowNumber);
  const maximumYear = 2026;
  const applicationUrl = text(row["Apply URL"], "Apply URL", rowNumber, true);
  return { ...common, programType: text(row["Program Type"], "Program Type", rowNumber).toUpperCase(), benefitsStartDate: isoDate(row["Benefits Start Date"], "Benefits Start Date", rowNumber), benefitsEndDate: null, maximumYear, maximumWeeklyBenefit: nonNegativeNumber(row["Maximum Weekly Benefit (2026)"], "Maximum Weekly Benefit (2026)", rowNumber), familyLeaveWeeks: null, medicalLeaveWeeks: nonNegativeNumber(row["Max Duration Weeks"], "Max Duration Weeks", rowNumber), coveredLeaveCategories: categories(row, rowNumber), applicationOwner: text(row["Application Owner"], "Application Owner", rowNumber), applicationUrl, lincolnCoordination: text(row["Lincoln Coordination"], "Lincoln Coordination", rowNumber), awardLetterRecipient: text(row["Award Letter Recipient"], "Award Letter Recipient", rowNumber), eligibilityDescription: text(row["Eligibility Requirements"], "Eligibility Requirements", rowNumber), officialProgramUrl: common.url, lastVerifiedDate: isoDate(row["Last Verified Date"], "Last Verified Date", rowNumber) };
});
const rules = [...familyRules, ...disabilityRules];
const seen = new Set();
for (const rule of rules) {
  const key = `${rule.stateCode}|${rule.programName.toUpperCase()}|${rule.benefitsStartDate}`;
  if (seen.has(key)) throw new Error(`Duplicate state/program/effective-date record ${key}`);
  seen.add(key);
}

fs.writeFileSync(OUTPUT, `export const STATE_BENEFIT_RULES = Object.freeze(${JSON.stringify(rules, null, 2)});\n\nexport const STATE_BENEFIT_RULES_BY_STATE = Object.freeze(Object.fromEntries(Object.entries(Object.groupBy(STATE_BENEFIT_RULES, (rule) => rule.stateCode)).map(([state, stateRules]) => [state, Object.freeze(stateRules)])));\n`);
console.log(`Generated ${familyRules.length} ${FAMILY_SHEET_NAME} rules, ${disabilityRules.length} ${DISABILITY_SHEET_NAME} rules (${rules.length} total) at ${path.relative(ROOT, OUTPUT)}`);