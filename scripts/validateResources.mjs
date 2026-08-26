import assert from "node:assert/strict";
import fs from "node:fs";
import { filterSupportResources, getSupportResources, getSupportResourceCategories, RESOURCE_CATALOG } from "../src/data/resourceUtils.js";

const resources = getSupportResources();
const categories = getSupportResourceCategories();
const source = fs.readFileSync(new URL("../src/data/resourceUtils.js", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

assert(Object.isFrozen(RESOURCE_CATALOG));
assert(resources.length === 5);
assert.equal(new Set(resources.map((resource) => resource.id)).size, resources.length);
assert.equal(new Set(categories.map((category) => category.id)).size, categories.length);
assert.equal(categories[0].id, "all");
assert.deepEqual(filterSupportResources(), resources);
for (const category of categories.filter((category) => category.id !== "all")) {
  const filtered = filterSupportResources(category.id);
  assert(filtered.length > 0);
  assert(filtered.every((resource) => resource.category === category.id));
}
const before = JSON.stringify(RESOURCE_CATALOG);
const filtered = filterSupportResources("family-caregiving");
filtered.pop();
assert.equal(JSON.stringify(RESOURCE_CATALOG), before);
assert(resources.every((resource) => resource.id && resource.name && resource.category && resource.summary && resource.bestFor && resource.owner && resource.accessLabel && resource.availabilityNote && Array.isArray(resource.tags)));
assert(resources.every((resource) => resource.destination === null || /^https:\/\//.test(resource.destination)));
assert.equal(resources.find((resource) => resource.id === "milk-stork").category, "family-caregiving");
assert.equal(resources.find((resource) => resource.id === "lyra").category, "mental-wellbeing");
assert.equal(resources.find((resource) => resource.id === "hinge-health").category, "physical-wellbeing");
assert.equal(resources.find((resource) => resource.id === "transform-oncology").category, "specialized-care");
assert.equal(resources.find((resource) => resource.id === "cleo").category, "family-caregiving");
assert(!source.includes("employee."));
assert(!source.match(/recommended for you|you qualify|guaranteed|approved|covered|eligible for this/i));
assert(!source.match(/employee\?|employee\.|healthPlan|isLactating|leaveReason|leaveReasonDescription/i));
assert(!resources.some((resource) => /recommended for you|you qualify|available to you/i.test(JSON.stringify(resource))));
assert(appSource.includes('onOpenReturnToWork={() => setActiveTab("rtw")}'));
assert(appSource.includes('["resources", "◇", "Support Resources"]'));
assert(!appSource.includes('activeTab === "benefits"'));

console.log(`Resource catalog validation passed for ${resources.length} resources and ${categories.length} categories.`);
