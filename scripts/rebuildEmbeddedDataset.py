import json
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "Lincoln Reports - Current.xlsx"
EMBEDDED = ROOT / "src/data/embeddedEmployeeRecords.js"
NAMESPACE = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def read_shared_strings(workbook):
    root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
    return ["".join(text.text or "" for text in item.iterfind(".//m:t", NAMESPACE)) for item in root.findall("m:si", NAMESPACE)]


def cell_value(cell, shared_strings):
    value = cell.find("m:v", NAMESPACE)
    text = "" if value is None else value.text or ""
    if cell.attrib.get("t") == "s" and text:
        return shared_strings[int(text)]
    return text


def column_number(reference):
    letters = re.match(r"[A-Z]+", reference).group()
    number = 0
    for letter in letters:
        number = number * 26 + ord(letter) - ord("A") + 1
    return number - 1


def normalize_date(value):
    if not value:
        return ""
    try:
        return datetime.strptime(value, "%m/%d/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return value


def read_atp_rows(workbook):
    shared_strings = read_shared_strings(workbook)
    root = ET.fromstring(workbook.read("xl/worksheets/sheet2.xml"))
    rows = root.findall(".//m:sheetData/m:row", NAMESPACE)
    header = None
    records = []
    for row in rows:
        values = {
            column_number(cell.attrib["r"]): cell_value(cell, shared_strings)
            for cell in row.findall("m:c", NAMESPACE)
        }
        if values.get(0) == "Employee Last Name":
            header = {index: re.sub(r"\s+", " ", value.strip()) for index, value in values.items()}
            continue
        if header is None:
            continue
        row_data = {header[index]: value.strip() for index, value in values.items() if index in header}
        if not row_data.get("Employee ID"):
            continue
        records.append({
            "employeeId": row_data.get("Employee ID", "").removesuffix(".0"),
            "firstName": row_data.get("Employee First Name", ""),
            "lastName": row_data.get("Employee Last Name", ""),
            "fullName": " ".join(filter(None, [row_data.get("Employee First Name", ""), row_data.get("Employee Last Name", "")])),
            "location": "",
            "state": "",
            "sourceSheet": "Twilio - ATP Report",
            "classCode": row_data.get("Class Code", ""),
            "classDescription": row_data.get("Class Description", ""),
            "product": row_data.get("Product", ""),
            "claimStatus": "",
            "statusCode": "",
            "statusReason": "",
            "leaveCategory": "",
            "leaveType": "",
            "leaveReasonDescription": "",
            "dateReceived": "",
            "lastDateWorked": "",
            "dateOfDisability": normalize_date(row_data.get("Disability Date", "")),
            "benefitBeginDate": normalize_date(row_data.get("Benefit Begin Date", "")),
            "benefitEndDate": "",
            "disabilityApprovedThrough": normalize_date(row_data.get("Approved Thru Date", "")),
            "leaveBeginDate": "",
            "leaveEndDate": "",
            "leaveStatus": "",
            "leaveStatusReasonDescription": "",
            "estimatedRTW": "",
            "actualRTW": "",
            "durationDays": "",
            "leaveHoursUsed": "",
            "leaveHoursRemaining": "",
            "accommodationStatus": "",
            "accommodationReceivedDate": "",
            "requestedBeginDate": "",
            "requestedEndDate": "",
            "actualBeginDate": "",
            "actualEndDate": "",
            "returnOrStayAtWork": "",
            "intermittentCertifiedThrough": "",
            "intermittentFrequencyAmount": "",
            "intermittentFrequencyMode": "",
            "intermittentFrequencyPeriod": "",
            "biweeklySalaryAmount": row_data.get("Biweekly Salary Amount", ""),
            "payCode": row_data.get("Pay Code", ""),
            "benefitGrossAmount": row_data.get("Benefit Gross Amount", ""),
            "totalOffsets": row_data.get("Total Offsets", ""),
            "adjustedBenefitGrossAmount": row_data.get("Adjusted Benefit Gross Amount", ""),
            "payableBenefitPercentage": row_data.get("Payable Benefit Percentage", ""),
            "payableGrossBenefitAmount": row_data.get("Payable Gross Benefit Amount", ""),
            "payableTotalOffsets": row_data.get("Payable Total Offsets", ""),
            "payableAdjustedBenefitGrossAmount": row_data.get("Payable Adjusted Benefit Gross Amount", ""),
            "payableCalculatedSalaryAmount": row_data.get("Payable Calculated Salary Amount", ""),
            "payableCalculatedCommissionAmount": row_data.get("Payable Calculated Commission Amount", ""),
            "payableFromDate": normalize_date(row_data.get("Payable From Date", "")),
            "payableThruDate": normalize_date(row_data.get("Payable Thru Date", "")),
            "payPeriodFromDate": normalize_date(row_data.get("Pay Period From Date", "")),
            "payPeriodThruDate": normalize_date(row_data.get("Pay Period Thru Date", "")),
            "payPeriodWorkDays": row_data.get("Pay Period Work Days", ""),
            "payPeriodWorkDaysPaid": row_data.get("Pay Period Work Days Paid", ""),
        })
    return records


def read_export(name):
    text = EMBEDDED.read_text()
    match = re.search(rf"export const {name} = (\[.*?\]);", text)
    if not match:
        raise RuntimeError(f"Could not find {name}")
    return json.loads(match.group(1))


with zipfile.ZipFile(WORKBOOK) as workbook:
    atp_records = read_atp_rows(workbook)

records = read_export("EMBEDDED_EMPLOYEE_RECORDS")
records = [record for record in records if record.get("sourceSheet") != "Twilio - ATP Report"]
records.extend(atp_records)
name_only = read_export("NAME_ONLY_SOURCE_RECORDS")
conflicts = read_export("CONFLICTING_EMPLOYEE_IDS")

grouped = {}
for record in records:
    employee_id = record.get("employeeId", "")
    if employee_id:
        grouped.setdefault(employee_id, []).append(record)

identity_index = []
for employee_id, source_records in grouped.items():
    first = next((record.get("firstName", "") for record in source_records if record.get("firstName")), "")
    last = next((record.get("lastName", "") for record in source_records if record.get("lastName")), "")
    identity_index.append({
        "employeeId": employee_id,
        "firstName": first,
        "lastName": last,
        "fullName": " ".join(filter(None, [first, last])),
        "location": next((record.get("location", "") for record in source_records if record.get("location")), ""),
        "state": next((record.get("state", "") for record in source_records if record.get("state")), ""),
        "sourceRecords": source_records,
    })

output = "\n\n".join([
    f"export const CONFLICTING_EMPLOYEE_IDS = {json.dumps(conflicts, separators=(',', ':'))};",
    f"export const NAME_ONLY_SOURCE_RECORDS = {json.dumps(name_only, separators=(',', ':'))};",
    f"export const EMPLOYEE_IDENTITY_INDEX = {json.dumps(identity_index, separators=(',', ':'))};",
    f"export const EMBEDDED_EMPLOYEE_RECORDS = {json.dumps(records, separators=(',', ':'))};",
]) + "\n"
EMBEDDED.write_text(output)
print(f"ATP rows: {len(atp_records)}; total embedded rows: {len(records)}; unique IDs: {len(identity_index)}; name-only rows: {len(name_only)}")