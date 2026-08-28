import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const activeComponent = source.slice(source.lastIndexOf("function SupportResourcesTab"), source.indexOf("function ChatTab"));
assert(activeComponent.includes("Search vendor or service"));
assert(activeComponent.includes("All resources"));
assert(activeComponent.includes("No active resources match this search"));
assert(activeComponent.includes("Resources you may want to explore"));
assert(activeComponent.includes("Care.com is no longer listed as an active 2026 benefit"));
assert(activeComponent.includes("Need help finding the right resource?"));
assert(activeComponent.includes('target="_blank" rel="noreferrer"'));
assert(activeComponent.includes("filterBenefitResources({ category: selectedCategory, search })"));
assert(activeComponent.includes("resource.links.map"));
assert(activeComponent.includes("https://twilio.okta.com"));
assert(!activeComponent.includes("resource.portalUrl &&"));
assert(!activeComponent.includes("Resources you need"));
console.log("Benefit resource UI validation passed.");