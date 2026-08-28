const LEAVE_SOURCES = new Set([
  "Twilio - Weekly Combined Status",
  "Main Leave Report",
  "ER LOA Status Change Weekly Rep",
  "Daily Combined Alert Report",
  "Hours Daily Report",
  "Twilio Closed RTW Summary",
  "Twilio Denials Daily Summary",
  "Weekly Leave Intermittent Repor",
]);

const DATE_FIELDS = ["leaveBeginDate", "leaveEndDate", "estimatedRTW", "actualRTW"];
const EPISODE_DATE_FIELDS = ["leaveBeginDate", "leaveEndDate", "expectedReturnDate", "actualReturnDate"];
const DATE_PRECEDENCE = ["Twilio Closed RTW Summary", "Twilio - Weekly Combined Status", "Main Leave Report", "ER LOA Status Change Weekly Rep", "Daily Combined Alert Report", "Hours Daily Report"];
const LEAVE_PRECEDENCE = ["Twilio - Weekly Combined Status", "Main Leave Report", "ER LOA Status Change Weekly Rep", "Daily Combined Alert Report", "Hours Daily Report", "Twilio Denials Daily Summary", "Weekly Leave Intermittent Repor"];
const SOURCE_PRECEDENCE = [...new Set([...LEAVE_PRECEDENCE, ...DATE_PRECEDENCE])];

const populated = (value) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== "" && !["null", "undefined", "nan"].includes(text.toLowerCase());
};

const isoDate = (value) => {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? null : text;
};

const normalizeIdentifierToken = (value) => String(value || "").trim().replace(/^(.+?)\.0$/, "$1");
const identifierTokens = (value) => new Set(
  String(value || "")
    .split(/[\/;,|]+/)
    .map(normalizeIdentifierToken)
    .filter(populated),
);
const firstIdentifier = (value) => [...identifierTokens(value)][0] || null;
const setIntersection = (left, right) => [...left].filter((value) => right.has(value));
const setsContradict = (left, right) => left.size > 0 && right.size > 0 && setIntersection(left, right).length === 0;
const sourceRank = (sourceSheet) => {
  const index = SOURCE_PRECEDENCE.indexOf(sourceSheet);
  return index === -1 ? SOURCE_PRECEDENCE.length : index;
};
const stableRecordText = (record) => JSON.stringify(Object.keys(record).sort().reduce((result, key) => ({ ...result, [key]: record[key] }), {}));
const compareRecords = (left, right) => sourceRank(left.sourceSheet) - sourceRank(right.sourceSheet) || String(left.sourceSheet || "").localeCompare(String(right.sourceSheet || "")) || stableRecordText(left).localeCompare(stableRecordText(right));

const valueFrom = (records, field, sources) => {
  const sortedRecords = [...records].sort(compareRecords);
  for (const source of sources) {
    const value = sortedRecords.find((record) => record.sourceSheet === source && populated(record[field]))?.[field];
    if (populated(value)) return field.includes("Date") || DATE_FIELDS.includes(field) ? isoDate(value) : value;
  }
  return null;
};

class DisjointSet {
  constructor(size) {
    this.parents = Array.from({ length: size }, (_, index) => index);
    this.ranks = Array.from({ length: size }, () => 0);
  }

  find(index) {
    if (this.parents[index] !== index) this.parents[index] = this.find(this.parents[index]);
    return this.parents[index];
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot === rightRoot) return;
    if (this.ranks[leftRoot] < this.ranks[rightRoot]) {
      this.parents[leftRoot] = rightRoot;
    } else if (this.ranks[leftRoot] > this.ranks[rightRoot]) {
      this.parents[rightRoot] = leftRoot;
    } else {
      this.parents[rightRoot] = leftRoot;
      this.ranks[leftRoot] += 1;
    }
  }
}

const candidateFromRecord = (record, originalIndex) => {
  if (!LEAVE_SOURCES.has(record?.sourceSheet)) return null;
  const leaveBeginDate = isoDate(record.leaveBeginDate);
  const leaveEndDate = isoDate(record.leaveEndDate);
  const expectedReturnDate = isoDate(record.estimatedRTW);
  const actualReturnDate = isoDate(record.actualRTW);
  const leaveIdTokens = identifierTokens(record.leaveId);
  const claimTokens = identifierTokens(record.claimNumber);
  const hasCompleteWindow = Boolean(leaveBeginDate && leaveEndDate);
  const hasDateEvidence = Boolean(leaveBeginDate || leaveEndDate || expectedReturnDate || actualReturnDate);
  const hasLeaveContext = Boolean(populated(record.leaveCategory) || populated(record.leaveType) || populated(record.leaveStatus) || populated(record.claimStatus));
  if (!hasDateEvidence && !(hasLeaveContext && (leaveIdTokens.size > 0 || claimTokens.size > 0))) return null;
  return {
    originalIndex,
    employeeId: normalizeIdentifierToken(record.employeeId),
    leaveIdTokens,
    claimTokens,
    leaveBeginDate,
    leaveEndDate,
    expectedReturnDate,
    actualReturnDate,
    leaveCategory: record.leaveCategory || null,
    leaveType: record.leaveType || null,
    sourceSheet: record.sourceSheet,
    originalRecord: record,
    hasCompleteWindow,
  };
};

const dateValuesAgree = (leftValues, rightValues) => {
  for (const field of EPISODE_DATE_FIELDS) {
    if (leftValues[field].size > 0 && rightValues[field].size > 0 && setIntersection(leftValues[field], rightValues[field]).length === 0) return false;
  }
  return true;
};

const candidateDateValues = (candidate) => Object.fromEntries(EPISODE_DATE_FIELDS.map((field) => [field, new Set(candidate[field] ? [candidate[field]] : [])]));
const candidatesDatesAgree = (left, right) => dateValuesAgree(candidateDateValues(left), candidateDateValues(right));
const identifiersDoNotContradict = (left, right) => !setsContradict(left.leaveIdTokens, right.leaveIdTokens) && !setsContradict(left.claimTokens, right.claimTokens);

const strongCandidateMatch = (left, right) => {
  const sharedLeaveId = setIntersection(left.leaveIdTokens, right.leaveIdTokens).length > 0;
  const sharedClaim = setIntersection(left.claimTokens, right.claimTokens).length > 0;
  const exactWindow = Boolean(left.leaveBeginDate && left.leaveEndDate && left.leaveBeginDate === right.leaveBeginDate && left.leaveEndDate === right.leaveEndDate);
  const exactReturn = Boolean(left.expectedReturnDate && left.actualReturnDate && left.expectedReturnDate === right.expectedReturnDate && left.actualReturnDate === right.actualReturnDate);
  return sharedLeaveId || sharedClaim || exactWindow || exactReturn;
};

const shouldUnionCandidates = (left, right) => (
  left.employeeId === right.employeeId &&
  identifiersDoNotContradict(left, right) &&
  candidatesDatesAgree(left, right) &&
  strongCandidateMatch(left, right)
);

const sortedSourceSheets = (records) => [...new Set([...records].sort(compareRecords).map((record) => record.sourceSheet))];
const mergeTokenSets = (candidates, field) => new Set(candidates.flatMap((candidate) => [...candidate[field]]));
const buildDateValues = (candidates) => Object.fromEntries(EPISODE_DATE_FIELDS.map((field) => [field, new Set(candidates.map((candidate) => candidate[field]).filter(Boolean))]));
const onlyValue = (values) => values.size === 1 ? [...values][0] : null;
const componentSummary = (component) => ({
  leaveBeginDate: component.leaveBeginDate,
  leaveEndDate: component.leaveEndDate,
  expectedReturnDate: component.expectedReturnDate,
  actualReturnDate: component.actualReturnDate,
  sourceSheets: component.sourceSheets,
});

const buildComponents = (candidates, disjointSet, ambiguityByRoot = new Map()) => {
  const grouped = new Map();
  candidates.forEach((candidate, index) => {
    const root = disjointSet.find(index);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root).push(candidate);
  });
  return [...grouped.entries()].map(([root, componentCandidates]) => {
    const sourceRecords = componentCandidates.map((candidate) => candidate.originalRecord).sort(compareRecords);
    const dateValues = buildDateValues(componentCandidates);
    const component = {
      root,
      candidateIndexes: componentCandidates.map((candidate) => candidate.originalIndex),
      representativeIndex: candidates.indexOf(componentCandidates[0]),
      employeeId: componentCandidates[0]?.employeeId || null,
      leaveIdTokens: mergeTokenSets(componentCandidates, "leaveIdTokens"),
      claimTokens: mergeTokenSets(componentCandidates, "claimTokens"),
      dateValues,
      leaveBeginDate: onlyValue(dateValues.leaveBeginDate),
      leaveEndDate: onlyValue(dateValues.leaveEndDate),
      expectedReturnDate: onlyValue(dateValues.expectedReturnDate),
      actualReturnDate: onlyValue(dateValues.actualReturnDate),
      sourceSheets: sortedSourceSheets(sourceRecords),
      sourceRecords,
      sourceRecordCount: sourceRecords.length,
      hasCompleteWindow: Boolean(dateValues.leaveBeginDate.size > 0 && dateValues.leaveEndDate.size > 0),
      hasReturnEvidence: Boolean(dateValues.expectedReturnDate.size > 0 || dateValues.actualReturnDate.size > 0),
      ambiguousPartialMatches: ambiguityByRoot.get(root) || [],
    };
    return component;
  }).sort((left, right) => String(left.employeeId || "").localeCompare(String(right.employeeId || "")) || String(left.leaveBeginDate || "").localeCompare(String(right.leaveBeginDate || "")) || String(left.leaveEndDate || "").localeCompare(String(right.leaveEndDate || "")) || String(left.expectedReturnDate || "").localeCompare(String(right.expectedReturnDate || "")) || String(left.actualReturnDate || "").localeCompare(String(right.actualReturnDate || "")) || left.sourceSheets.join("|").localeCompare(right.sourceSheets.join("|")));
};

const componentsIdentifiersAgree = (left, right) => !setsContradict(left.leaveIdTokens, right.leaveIdTokens) && !setsContradict(left.claimTokens, right.claimTokens);
const returnDatesMatch = (partial, full) => (
  (partial.expectedReturnDate && partial.expectedReturnDate === full.expectedReturnDate) ||
  (partial.actualReturnDate && partial.actualReturnDate === full.actualReturnDate)
);
const compatibleFullComponent = (partial, full) => (
  partial.employeeId === full.employeeId &&
  componentsIdentifiersAgree(partial, full) &&
  dateValuesAgree(partial.dateValues, full.dateValues) &&
  returnDatesMatch(partial, full)
);

const conflictingValues = (component, field) => [...component.dateValues[field]].sort();
const hasConflict = (component, field) => component.dateValues[field].size > 1;

const toEpisode = (component) => {
  const leaveBeginDate = valueFrom(component.sourceRecords, "leaveBeginDate", LEAVE_PRECEDENCE);
  const leaveEndDate = valueFrom(component.sourceRecords, "leaveEndDate", LEAVE_PRECEDENCE);
  const expectedReturnDate = valueFrom(component.sourceRecords, "estimatedRTW", DATE_PRECEDENCE);
  const actualReturnDate = valueFrom(component.sourceRecords, "actualRTW", DATE_PRECEDENCE);
  return {
    employeeId: component.employeeId,
    leaveId: firstIdentifier(valueFrom(component.sourceRecords, "leaveId", LEAVE_PRECEDENCE)) || [...component.leaveIdTokens].sort()[0] || null,
    claimNumber: firstIdentifier(valueFrom(component.sourceRecords, "claimNumber", LEAVE_PRECEDENCE)) || [...component.claimTokens].sort()[0] || null,
    sourceRecords: component.sourceRecords,
    leaveBeginDate,
    leaveEndDate,
    expectedReturnDate,
    actualReturnDate,
    leaveCategory: valueFrom(component.sourceRecords, "leaveCategory", LEAVE_PRECEDENCE),
    leaveType: valueFrom(component.sourceRecords, "leaveType", LEAVE_PRECEDENCE),
    leaveStatus: valueFrom(component.sourceRecords, "leaveStatus", LEAVE_PRECEDENCE),
    claimStatus: valueFrom(component.sourceRecords, "claimStatus", LEAVE_PRECEDENCE),
    approvalDate: valueFrom(component.sourceRecords, "leaveApprovalDate", ["Leave Approval Dates", "Approval Date ID Mapping"]),
    sourceSheets: component.sourceSheets,
    sourceRecordCount: component.sourceRecordCount,
    ambiguous: component.ambiguousPartialMatches.length > 0,
    dataQuality: {
      conflictingLeaveBeginDate: hasConflict(component, "leaveBeginDate"),
      conflictingLeaveEndDate: hasConflict(component, "leaveEndDate"),
      conflictingExpectedReturnDate: hasConflict(component, "expectedReturnDate"),
      conflictingActualReturnDate: hasConflict(component, "actualReturnDate"),
      conflictingValues: {
        leaveBeginDate: conflictingValues(component, "leaveBeginDate"),
        leaveEndDate: conflictingValues(component, "leaveEndDate"),
        expectedReturnDate: conflictingValues(component, "expectedReturnDate"),
        actualReturnDate: conflictingValues(component, "actualReturnDate"),
      },
      ambiguousPartialMatches: component.ambiguousPartialMatches,
    },
  };
};

export const getCanonicalLeaveEpisodes = (employeeOrRecords) => {
  const records = Array.isArray(employeeOrRecords) ? employeeOrRecords : employeeOrRecords?.sourceRecords || [];
  const candidates = records.map(candidateFromRecord).filter(Boolean);
  const disjointSet = new DisjointSet(candidates.length);

  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      if (shouldUnionCandidates(candidates[left], candidates[right])) disjointSet.union(left, right);
    }
  }

  const initialComponents = buildComponents(candidates, disjointSet);
  const fullComponents = initialComponents.filter((component) => component.hasCompleteWindow);
  const partialComponents = initialComponents.filter((component) => !component.hasCompleteWindow && component.hasReturnEvidence);
  const deferredUnions = [];
  const ambiguityByRoot = new Map();

  for (const partial of partialComponents) {
    const matches = fullComponents.filter((full) => compatibleFullComponent(partial, full));
    if (matches.length === 1) {
      deferredUnions.push([partial.representativeIndex, matches[0].representativeIndex]);
    } else if (matches.length > 1) {
      ambiguityByRoot.set(partial.root, matches.map(componentSummary));
    }
  }

  for (const [partialIndex, fullIndex] of deferredUnions) disjointSet.union(partialIndex, fullIndex);

  return buildComponents(candidates, disjointSet, ambiguityByRoot).map(toEpisode);
};