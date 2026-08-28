import {
  CONFLICTING_EMPLOYEE_IDS,
  EMBEDDED_EMPLOYEE_RECORDS,
  EMPLOYEE_IDENTITY_INDEX,
  NAME_ONLY_SOURCE_RECORDS,
} from "../src/data/embeddedEmployeeRecords.js";
import {
  matchEmployeeIdentity,
  normalizeEmployeeId,
  normalizeEmployeeName,
} from "../src/data/identityUtils.js";

const REQUIRED_CASES = [
  { firstName: "Mickey", lastName: "Mouse", employeeId: "700001", expected: true },
  { firstName: "Minnie", lastName: "Mouse", employeeId: "700002", expected: true },
  { firstName: "Donald", lastName: "Duck", employeeId: "700003", expected: true },
  { firstName: "Daisy", lastName: "Duck", employeeId: "700004", expected: true },
  { firstName: "Goofy", lastName: "Goof", employeeId: "700005", expected: true },
  { firstName: "Pluto", lastName: "Pup", employeeId: "700006", expected: true },
  { firstName: "Mulan", lastName: "Fa", employeeId: "700037", expected: true },
  { firstName: "John", lastName: "Smith", employeeId: "700040", expected: true },
  { firstName: "Scarlett", lastName: "Johansson", employeeId: "700519", expected: true },
];

const conflictSet = new Set(CONFLICTING_EMPLOYEE_IDS.map(normalizeEmployeeId));
const embeddedIdSet = new Set(
  EMBEDDED_EMPLOYEE_RECORDS.map((record) => normalizeEmployeeId(record.employeeId)).filter(Boolean),
);
const identityIdSet = new Set(
  EMPLOYEE_IDENTITY_INDEX.map((record) => normalizeEmployeeId(record.employeeId)).filter(Boolean),
);

const counts = {
  workbookRows: 4154,
  workbookUniqueIds: 520,
  embeddedRows: EMBEDDED_EMPLOYEE_RECORDS.length,
  embeddedUniqueIds: embeddedIdSet.size,
  identityIndexKeys: EMPLOYEE_IDENTITY_INDEX.length,
  nameOnlyRows: NAME_ONLY_SOURCE_RECORDS.length,
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

assert(counts.embeddedRows === counts.workbookRows, `Embedded row count mismatch: expected ${counts.workbookRows}, got ${counts.embeddedRows}.`);
assert(counts.embeddedUniqueIds === counts.workbookUniqueIds, `Embedded unique-ID count mismatch: expected ${counts.workbookUniqueIds}, got ${counts.embeddedUniqueIds}.`);
assert(counts.identityIndexKeys === counts.workbookUniqueIds, `Identity index count mismatch: expected ${counts.workbookUniqueIds}, got ${counts.identityIndexKeys}.`);
assert(counts.nameOnlyRows === 0, `Name-only rows mismatch: expected 0, got ${counts.nameOnlyRows}.`);
assert(conflictSet.size === 0, `Replacement population must not contain conflicts, got ${[...conflictSet].join(", ")}.`);

for (const record of EMPLOYEE_IDENTITY_INDEX) {
  const id = normalizeEmployeeId(record.employeeId);
  const isConflictRecord = conflictSet.has(id);

  if (isConflictRecord) {
    assert(
      !matchEmployeeIdentity(record, record.firstName, record.lastName, id),
      `Conflicted ID ${id} unexpectedly verified by canonical match.`,
    );
  } else {
    assert(
      matchEmployeeIdentity(record, record.firstName, record.lastName, id),
      `Identity index record did not verify itself: ${id} ${record.firstName} ${record.lastName}`,
    );
  }
}

for (const testCase of REQUIRED_CASES) {
  const { firstName, lastName, employeeId, expected } = testCase;
  const normalizedId = normalizeEmployeeId(employeeId);
  const record = EMPLOYEE_IDENTITY_INDEX.find(
    (entry) => normalizeEmployeeId(entry.employeeId) === normalizedId,
  );

  assert(Boolean(record), `Required identity missing from index: ${firstName} ${lastName} ${normalizedId}`);

  const result = matchEmployeeIdentity(record, firstName, lastName, normalizedId);
  assert(result === expected, `Required verification mismatch for ${firstName} ${lastName} ${normalizedId}: expected ${expected}, got ${result}.`);

  const wrongName = record.firstName === firstName ? "Wrong" : firstName;
  assert(
    !matchEmployeeIdentity(record, wrongName, lastName, normalizedId),
    `Wrong-name verification unexpectedly succeeded for ${firstName} ${lastName} ${normalizedId}.`,
  );

  const swapped = {
    firstName: lastName,
    lastName: firstName,
  };
  assert(
    !matchEmployeeIdentity(record, swapped.firstName, swapped.lastName, normalizedId),
    `Swapped-name verification unexpectedly succeeded for ${firstName} ${lastName} ${normalizedId}.`,
  );
}

assert(!matchEmployeeIdentity({ firstName: "Minnie", lastName: "Mouse", employeeId: "700002" }, "Minnie", "Wrong", "700002"), "Wrong name should fail with correct employee ID.");
assert(!matchEmployeeIdentity({ firstName: "Minnie", lastName: "Mouse", employeeId: "700002" }, "Mouse", "Minnie", "700002"), "Swapped names should fail with correct employee ID.");
assert(!identityIdSet.has("475869"), "Legacy conflicting ID 475869 must not survive replacement.");
assert(!matchEmployeeIdentity({ firstName: "Anonymous", lastName: "Person", employeeId: "" }, "Anonymous", "Person", ""), "Blank employee ID should not verify.");
assert(matchEmployeeIdentity({ firstName: "Goofy", lastName: "Goof", employeeId: "700005" }, "Goofy", "Goof", "700005"), "Goofy identity should verify.");

const nameOnlyMatches = NAME_ONLY_SOURCE_RECORDS.filter((record) => {
  const id = normalizeEmployeeId(record.employeeId);
  return !id;
});

assert(nameOnlyMatches.length === counts.nameOnlyRows, "Name-only row filter did not match recorded names.");

const targetEmployees = REQUIRED_CASES.filter((entry) => entry.expected);
const uniqueVerifiedCount = new Set(
  targetEmployees.map((entry) => normalizeEmployeeId(entry.employeeId)),
).size;

assert(uniqueVerifiedCount === targetEmployees.length, "Required test set includes duplicate target IDs.");

console.log(`Validated ${EMPLOYEE_IDENTITY_INDEX.length} identities in the embedded index.`);
console.log(`Verified ${REQUIRED_CASES.length} required employee match cases successfully.`);
console.log(`Embedded rows: ${counts.embeddedRows}; unique IDs: ${counts.embeddedUniqueIds}; name-only rows: ${counts.nameOnlyRows}.`);
