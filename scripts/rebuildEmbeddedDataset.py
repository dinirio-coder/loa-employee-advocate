import json
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "Lincoln Reports - Current.xlsx"
EMBEDDED = ROOT / "src/data/embeddedEmployeeRecords.js"
DICTIONARY = ROOT / "src/data/lincolnCodeDictionary.js"
N = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
SHEETS = ("Hours Daily Report", "Twilio - ATP Report", "Daily Combined Alert Report", "Main Leave Report", "Twilio Denials Daily Summary", "Twilio - Weekly Combined Status", "Twilio STD 26 week Max Weekly S", "Combined Status Change Alert", "Decodes", "Weekly Accommodation Services S", "Twilio Weekly 180+ day Summary", "ER LOA Status Change Weekly Rep", "Weekly Leave Intermittent Repor", "Twilio Closed RTW Summary", "Leave Approval Dates", "Sheet17 Exceptions", "Approval Date ID Mapping")
HEADERS = {
    "Hours Daily Report": ("Employee ID", "Employee Name", "Leave ID"), "Twilio - ATP Report": ("Employee ID", "Employee First Name", "Employee Last Name", "Claim Number"), "Daily Combined Alert Report": ("Employee ID", "Employee First Name", "Employee Last Name"), "Main Leave Report": ("Employee ID", "First Name", "Last Name", "Claim Number"), "Twilio Denials Daily Summary": ("Employee ID", "Employee Full Name", "Claim/Leave Number"), "Twilio - Weekly Combined Status": ("Employee ID", "Employee First Name", "Employee Last Name", "Leave ID"), "Twilio STD 26 week Max Weekly S": ("Employee ID", "Employee Full Name"), "Combined Status Change Alert": ("Status Code", "Status Description"), "Decodes": ("Status Code", "Status Description"), "Weekly Accommodation Services S": ("Employee ID", "Employee First Name", "Employee Last Name"), "Twilio Weekly 180+ day Summary": ("Employee ID", "Employee Full Name"), "ER LOA Status Change Weekly Rep": ("Employee First Name", "Employee Last Name", "Leave Begin Date"), "Weekly Leave Intermittent Repor": ("Emp ID", "First Name", "Last Name", "Leave Num"), "Twilio Closed RTW Summary": ("Employee ID", "Employee Full Name", "Actual RTW Date"), "Leave Approval Dates": ("Employee ID", "Leave ID", "Leave Approval Date"), "Sheet17 Exceptions": ("Employee ID", "Leave ID", "Source Claim/Leave Number"), "Approval Date ID Mapping": ("Employee ID", "Leave ID", "Source Claim/Leave Number"), "Synthetic Scenario Index": ("Employee ID", "Employee Name")}
DATE_FIELDS = {"dateReceived", "lastDateWorked", "dateOfDisability", "benefitBeginDate", "benefitEndDate", "disabilityApprovedThrough", "leaveBeginDate", "leaveEndDate", "estimatedRTW", "actualRTW", "leaveApprovalDate", "accommodationReceivedDate", "requestedBeginDate", "requestedEndDate", "actualBeginDate", "actualEndDate", "payableFromDate", "payableThruDate", "payPeriodFromDate", "payPeriodThruDate", "returnOrStayAtWork", "intermittentCertifiedThrough"}
FIELDS = ("leaveId claimNumber location state classCode classDescription product claimStatus statusCode statusReason leaveCategory leaveType leaveReasonCode leaveReasonDescription dateReceived lastDateWorked dateOfDisability benefitBeginDate benefitEndDate disabilityApprovedThrough leaveBeginDate leaveEndDate leaveStatus leaveStatusReasonDescription estimatedRTW actualRTW durationDays leaveHoursUsed leaveHoursRemaining accommodationStatus accommodationReceivedDate requestedBeginDate requestedEndDate actualBeginDate actualEndDate returnOrStayAtWork intermittentCertifiedThrough intermittentFrequencyAmount intermittentFrequencyMode intermittentFrequencyPeriod leaveApprovalDate biweeklySalaryAmount payCode benefitGrossAmount totalOffsets adjustedBenefitGrossAmount payableBenefitPercentage payableGrossBenefitAmount payableTotalOffsets payableAdjustedBenefitGrossAmount payableCalculatedSalaryAmount payableCalculatedCommissionAmount payableFromDate payableThruDate payPeriodFromDate payPeriodThruDate payPeriodWorkDays payPeriodWorkDaysPaid workDaysPerWeek").split()

def clean(value): return re.sub(r"\s+", " ", str(value or "").strip())
def ident(value): return clean(value).removesuffix(".0")
def date(value):
    text = clean(value)
    if re.fullmatch(r"\d+(?:\.0+)?", text): return (datetime(1899, 12, 30) + timedelta(days=int(float(text)))).strftime("%Y-%m-%d")
    for pattern in ("%Y-%m-%d", "%m/%d/%Y"):
        try: return datetime.strptime(text, pattern).strftime("%Y-%m-%d")
        except ValueError: pass
    return text
def split_name(value):
    parts = clean(value).split(None, 1)
    return (parts + ["", ""])[:2]
def col(reference):
    result = 0
    for char in re.match(r"[A-Z]+", reference).group(): result = result * 26 + ord(char) - 64
    return result - 1
def base(employee_id, first, last, source):
    result = {field: "" for field in FIELDS}
    result.update(employeeId=employee_id, firstName=first, lastName=last, fullName=f"{first} {last}", sourceSheet=source)
    return result

def workbook_data(book):
    strings = ["".join(node.text or "" for node in item.iterfind(".//m:t", N)) for item in ET.fromstring(book.read("xl/sharedStrings.xml")).findall("m:si", N)]
    wb = ET.fromstring(book.read("xl/workbook.xml")); rels = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
    targets = {item.attrib["Id"]: item.attrib["Target"].lstrip("/") for item in rels}
    paths = {item.attrib["name"]: targets[item.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]] for item in wb.findall("m:sheets/m:sheet", N)}
    def rows(name):
        if name not in paths: raise RuntimeError(f"Required operational worksheet is missing: {name}")
        root = ET.fromstring(book.read("xl/" + paths[name])); result=[]
        for row in root.findall(".//m:sheetData/m:row", N):
            values={}
            for cell in row.findall("m:c", N):
                value=cell.findtext("m:v", default="", namespaces=N) or ""
                if cell.attrib.get("t")=="s" and value: value=strings[int(value)]
                values[col(cell.attrib["r"])]=clean(value)
            result.append(values)
        return result
    return {name: rows(name) for name in (*SHEETS, "Synthetic Scenario Index")}

def as_table(rows, name):
    required = set(HEADERS[name])
    index = next((i for i, row in enumerate(rows) if required.issubset(set(row.values()))), None)
    if index is None: raise RuntimeError(f"Required header is missing from {name}: {', '.join(HEADERS[name])}")
    header = {position: value for position, value in rows[index].items()}
    return [(header, row) for row in rows[index+1:] if any(row.values())]
def get(entry, name, last=False):
    header, row = entry; positions=[position for position, value in header.items() if value==name]
    return row.get(positions[-1] if last and positions else positions[0], "") if positions else ""
def source_value(entry, *names, last=False): return next((get(entry, name, last) for name in names if get(entry, name, last)), "")

def read_dictionary(decodes_rows, status_rows):
    def section(title, columns):
        start=next((i for i,row in enumerate(rows) if title in row.values()), None)
        if start is None: raise RuntimeError(f"Decodes section missing: {title}")
        header=next((i for i in range(start+1,len(rows)) if [v for v in rows[i].values() if v]==list(columns)), None)
        if header is None: raise RuntimeError(f"Decodes headers missing: {title}")
        result=[]
        for row in rows[header+1:]:
            values=[v for v in row.values() if v]
            if not values: break
            if len(values)==len(columns): result.append(dict(zip(columns,values)))
        return result
    rows = decodes_rows
    salary=section("Employee Salary Type Codes",("Salary Code","Salary Description"))
    rows = status_rows
    primary=section("Status Codes",("Status Code","Status Description")); disability=section("Disability Status Codes",("Status","Code","Decode Description")); leave_status=section("Leave Status Codes",("Status","Code","Decode Description")); reason=section("Leave Reason Codes",("Code","Decode Description"))
    return {"primaryStatusCodes":[{"code":x["Status Code"],"description":x["Status Description"]}for x in primary],"disabilityStatusReasonCodes":[{"statusCode":x["Status"],"code":x["Code"],"description":x["Decode Description"]}for x in disability],"leaveStatusReasonCodes":[{"statusCode":x["Status"],"code":x["Code"],"description":x["Decode Description"]}for x in leave_status],"leaveReasonCodes":[{"code":x["Code"],"description":x["Decode Description"]}for x in reason],"salaryTypeCodes":[{"code":x["Salary Code"],"description":x["Salary Description"]}for x in salary]}

with zipfile.ZipFile(WORKBOOK) as book:
    raw=workbook_data(book); tables={name:as_table(raw[name],name) for name in (*SHEETS,"Synthetic Scenario Index")}
    people=[]
    for row in tables["Synthetic Scenario Index"]:
        employee_id=ident(get(row,"Employee ID")); first,last=split_name(get(row,"Employee Name")); people.append((employee_id,first,last))
    population={employee_id:(first,last) for employee_id,first,last in people}
    if len(people)!=520 or len(population)!=520 or any(not first or not last for first,last in population.values()): raise RuntimeError("Replacement identity count is not exactly 520 with one name per employee ID")
    by_name={(first.lower(),last.lower()):employee_id for employee_id,(first,last) in population.items()}
    records=[]; counts={}
    for sheet in SHEETS:
        entries=tables[sheet]; counts[sheet]=len(entries)
        if sheet in {"Combined Status Change Alert","Decodes"}: continue
        for entry in entries:
            employee_id=ident(source_value(entry,"Employee ID","Emp ID")); first=source_value(entry,"Employee First Name","First Name"); last=source_value(entry,"Employee Last Name","Last Name")
            if not first and not last: first,last=split_name(source_value(entry,"Employee Name","Employee Full Name"))
            if not employee_id: employee_id=by_name.get((first.lower(),last.lower()),"")
            if employee_id not in population: raise RuntimeError(f"{sheet} references identity outside replacement population: {employee_id or first+' '+last}")
            first,last=population[employee_id]; item=base(employee_id,first,last,sheet)
            aliases={"leaveId":("Leave ID","Leave Num"),"claimNumber":("Claim Number","Claim #","Claim/Leave Number","Source Claim/Leave Number"),"location":("Location","Location Name","Loc Name"),"state":("Twilions Work Location",),"classCode":("Class Code",),"classDescription":("Class Description","Class Name"),"product":("Product","Product Type"),"claimStatus":("Claim Status","Status"),"statusCode":("Status Code","Verification Status","Resolution Status"),"statusReason":("Status Reason","Note","Reason","Pended Claim Reason","Match Notes","Exception Reason","Notes","Accommodation Status Reason"),"leaveCategory":("Leave Category",),"leaveType":("Leave Type","Type"),"leaveReasonCode":("Leave Reason",),"leaveReasonDescription":("Leave Reason Description","Leave Reason"),"dateReceived":("Date Received","Received Date","Date Entered"),"lastDateWorked":("Last Date Worked","Last Day Worked"),"dateOfDisability":("Date of Disability","Disability Date"),"benefitBeginDate":("Benefit Begin Date","Benefit/Leave Begin Date","Disability Benefit Begin Date"),"benefitEndDate":("Benefit End Date","Date Ben/Leave Ended","Date Ben Ended","Max Benefit Date"),"disabilityApprovedThrough":("Disability Approve Thru","Disability Approved Through Date","Date Disab/Cert Approved Thru","Date Disab Approved Thru","Approved Thru Date"),"leaveBeginDate":("Leave Begin Date","Begin Date"),"leaveEndDate":("Leave End Date",),"leaveStatus":("Leave Status",),"leaveStatusReasonDescription":("Leave Status Reason Description",),"estimatedRTW":("EE Expected RTW Date","Leave Expected RTW Date","Est RTW Date","Estimated RTW"),"actualRTW":("Actual RTW Date","Return to Work Date"),"durationDays":("Disability/Leave Duration","Disability Duration","Ben/Leave Max Duration"),"leaveHoursUsed":("Leave Hrs Used",),"leaveHoursRemaining":("Leave Hrs Remain",),"accommodationStatus":("Accommodation Status",),"accommodationReceivedDate":("Request Received Date",),"requestedBeginDate":("Requested Begin Date",),"requestedEndDate":("Requested End Date",),"actualBeginDate":("Actual Begin Date",),"actualEndDate":("Actual End Date",),"returnOrStayAtWork":("Return to Work or Stay at Work",),"intermittentCertifiedThrough":("Cert Thru",),"intermittentFrequencyAmount":("INTMT Freq Amount","Amt"),"intermittentFrequencyMode":("INTMT Freq Mode","Mode"),"intermittentFrequencyPeriod":("INTMT Freq Period","Period"),"leaveApprovalDate":("Leave Approval Date",),"biweeklySalaryAmount":("Biweekly Salary Amount",),"payCode":("Pay Code",),"benefitGrossAmount":("Benefit Gross Amount",),"totalOffsets":("Total Offsets",),"adjustedBenefitGrossAmount":("Adjusted Benefit Gross Amount",),"payableBenefitPercentage":("Payable Benefit Percentage",),"payableGrossBenefitAmount":("Payable Gross Benefit Amount",),"payableTotalOffsets":("Payable Total Offsets",),"payableAdjustedBenefitGrossAmount":("Payable Adjusted Benefit Gross Amount",),"payableCalculatedSalaryAmount":("Payable Calculated Salary Amount",),"payableCalculatedCommissionAmount":("Payable Calculated Commission Amount",),"payableFromDate":("Payable From Date",),"payableThruDate":("Payable Thru Date",),"payPeriodFromDate":("Pay Period From Date",),"payPeriodThruDate":("Pay Period Thru Date",),"payPeriodWorkDays":("Pay Period Work Days",),"payPeriodWorkDaysPaid":("Pay Period Work Days Paid",),"workDaysPerWeek":("Pay Period Number of Work Days Per Week",)}
            for field,names in aliases.items(): item[field]=source_value(entry,*names,last=sheet=="Twilio - Weekly Combined Status" and field in {"leaveBeginDate","leaveEndDate","leaveStatus","disabilityApprovedThrough"})
            for field in DATE_FIELDS: item[field]=date(item[field])
            records.append(item)
        if not any(item["sourceSheet"]==sheet for item in records): raise RuntimeError(f"Required source produced zero records unexpectedly: {sheet}")
    atp={item["employeeId"] for item in records if item["sourceSheet"]=="Twilio - ATP Report"}
    if len(atp)!=150 or not atp.issubset(population): raise RuntimeError("ATP IDs must be exactly 150 and all belong to the replacement population")
    grouped={employee_id:[] for employee_id in population}
    for item in records: grouped[item["employeeId"]].append(item)
    if any(not values for values in grouped.values()) or set(grouped)!=set(population): raise RuntimeError("Legacy identities survived or replacement identities were not imported")
    index=[{"employeeId":employee_id,"firstName":first,"lastName":last,"fullName":f"{first} {last}","location":next((x["location"] for x in grouped[employee_id] if x["location"]),""),"state":next((x["state"] for x in grouped[employee_id] if x["state"]),""),"sourceRecords":grouped[employee_id]}for employee_id,(first,last) in population.items()]
    dictionary=read_dictionary(raw["Decodes"], raw["Combined Status Change Alert"])

EMBEDDED.write_text("\n\n".join(["export const CONFLICTING_EMPLOYEE_IDS = [];","export const NAME_ONLY_SOURCE_RECORDS = [];",f"export const EMPLOYEE_IDENTITY_INDEX = {json.dumps(index,separators=(',',':'))};",f"export const EMBEDDED_EMPLOYEE_RECORDS = {json.dumps(records,separators=(',',':'))};"]) + "\n")
DICTIONARY.write_text("export const LINCOLN_CODE_DICTIONARY = " + json.dumps(dictionary,separators=(",",":")) + ";\n")
for sheet in SHEETS: print(f"{sheet}: {counts[sheet]} source rows")
print(f"Embedded rows: {len(records)}; unique IDs: {len(index)}; ATP IDs: {len(atp)}")