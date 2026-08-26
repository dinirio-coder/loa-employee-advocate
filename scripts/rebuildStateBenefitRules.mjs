import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const WORKBOOK = path.join(ROOT, "State Paid Leave Rules.xlsx");
const OUTPUT = path.join(ROOT, "src/data/stateBenefitRules.js");
const SHEET_NAME = "State Paid Leave Rules";
const REQUIRED_COLUMNS = [
  "State Code", "State Name", "Program Name", "Program Status",
  "Benefits Start Date", "Benefits End Date", "Maximum Year",
  "Maximum Weekly Benefit", "Family Leave Weeks", "Medical Leave Weeks",
  "Covered Leave Categories", "Application Owner", "Lincoln Coordination",
  "Award Letter Recipient", "Eligibility Description", "Official Program URL",
  "Last Verified Date",
];
const STATE_CODES = new Set("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" "));
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
const sheet = workbook.Sheets[SHEET_NAME];
if (!sheet) throw new Error(`Worksheet ${SHEET_NAME} is missing`);
const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
if (!rows.length) throw new Error(`Worksheet ${SHEET_NAME} is empty`);
const headers = Object.keys(rows[0]);
for (const column of REQUIRED_COLUMNS) if (!headers.includes(column)) throw new Error(`Missing required column ${column}`);

const seen = new Set();
const rules = rows.map((row, index) => {
  const rowNumber = index + 2;
  const stateCode = text(row["State Code"], "State Code", rowNumber).toUpperCase();
  if (!STATE_CODES.has(stateCode)) throw new Error(`Row ${rowNumber}: invalid state code ${stateCode}`);
  const programName = text(row["Program Name"], "Program Name", rowNumber);
  const key = `${stateCode}|${programName.toUpperCase()}`;
  if (seen.has(key)) throw new Error(`Row ${rowNumber}: duplicate state/program record ${key}`);
  seen.add(key);
  const status = text(row["Program Status"], "Program Status", rowNumber);
  if (!PROGRAM_STATUSES.has(status)) throw new Error(`Row ${rowNumber}: invalid program status ${status}`);
  const url = text(row["Official Program URL"], "Official Program URL", rowNumber);
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { throw new Error(`Row ${rowNumber}: invalid Official Program URL`); }
  if (parsedUrl.protocol !== "https:" || /(^|\.)google\.[^/]+$/.test(parsedUrl.hostname) || /google\.[^/]+\/url/.test(url)) {
    throw new Error(`Row ${rowNumber}: Official Program URL must be a direct HTTPS URL`);
  }
  return {
    stateCode,
    stateName: text(row["State Name"], "State Name", rowNumber),
    programName,
    programStatus: status,
    benefitsStartDate: isoDate(row["Benefits Start Date"], "Benefits Start Date", rowNumber),
    benefitsEndDate: isoDate(row["Benefits End Date"], "Benefits End Date", rowNumber, true),
    maximumYear: nonNegativeNumber(row["Maximum Year"], "Maximum Year", rowNumber),
    maximumWeeklyBenefit: nonNegativeNumber(row["Maximum Weekly Benefit"], "Maximum Weekly Benefit", rowNumber),
    familyLeaveWeeks: nonNegativeNumber(row["Family Leave Weeks"], "Family Leave Weeks", rowNumber, true),
    medicalLeaveWeeks: nonNegativeNumber(row["Medical Leave Weeks"], "Medical Leave Weeks", rowNumber, true),
    coveredLeaveCategories: text(row["Covered Leave Categories"], "Covered Leave Categories", rowNumber).split(",").map((item) => item.trim()).filter(Boolean),
    applicationOwner: text(row["Application Owner"], "Application Owner", rowNumber),
    lincolnCoordination: text(row["Lincoln Coordination"], "Lincoln Coordination", rowNumber),
    awardLetterRecipient: text(row["Award Letter Recipient"], "Award Letter Recipient", rowNumber),
    eligibilityDescription: text(row["Eligibility Description"], "Eligibility Description", rowNumber),
    officialProgramUrl: url,
    lastVerifiedDate: isoDate(row["Last Verified Date"], "Last Verified Date", rowNumber),
  };
});

fs.writeFileSync(OUTPUT, `export const STATE_BENEFIT_RULES = Object.freeze(${JSON.stringify(rules, null, 2)});\n\nexport const STATE_BENEFIT_RULES_BY_STATE = Object.freeze(Object.fromEntries(STATE_BENEFIT_RULES.map((rule) => [rule.stateCode, rule])));\n`);
console.log(`Generated ${rules.length} state benefit rules at ${path.relative(ROOT, OUTPUT)}`);