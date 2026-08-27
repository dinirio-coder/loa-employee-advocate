import assert from "node:assert/strict";
import fs from "node:fs";
import { BENEFIT_RESOURCE_CATEGORIES, BENEFIT_RESOURCES, filterBenefitResources } from "../src/data/benefitResources.js";

const required = ["id", "vendorName", "category", "shortDescription", "accessMethod", "links", "eligibilityNote", "applicableTags", "planYear", "status", "sortOrder"];
const serialized = JSON.stringify(BENEFIT_RESOURCES);
const approvedUrls = {
	"lincoln-financial": ["https://www.mylincolnportal.com/", "https://www.lincolnfinancial.com"], aetna: ["https://www.aetna.com"], "kaiser-permanente": ["https://www.kp.org"], hmsa: ["https://www.hmsa.com"], "lyra-health": ["https://twilio.lyrahealth.com"], carrot: ["https://get-carrot.com/signup"], cleo: ["https://hicleo.com/activate"], "milk-stork": ["https://www.milkstork.com/twilio"], "hinge-health": ["https://hinge.health/twilio"], classpass: ["https://classpass.com/corporate/twilio-6e13"], benepass: ["https://app.getbenepass.com"], fidelity: ["https://www.401k.com", "https://www.netbenefits.com"], "rocket-lawyer": ["https://go.rocketlawyer.com/twilio"], "delta-dental-california": ["https://www.deltadentalins.com"], vsp: ["https://www.vsp.com"], "spot-pet": ["https://spotpet.link/twilio"], "tickets-at-work": ["https://www.ticketsatwork.com"],
};
const actualUrls = Object.fromEntries(BENEFIT_RESOURCES.map((resource) => [resource.id, resource.links.map((link) => link.url)]));
const expectedUrls = Object.fromEntries(BENEFIT_RESOURCES.map((resource) => [resource.id, approvedUrls[resource.id] ?? []]));
assert.equal(new Set(BENEFIT_RESOURCES.map((resource) => resource.id)).size, BENEFIT_RESOURCES.length);
assert.equal(new Set(BENEFIT_RESOURCES.filter((resource) => resource.status === "active").map((resource) => resource.vendorName)).size, BENEFIT_RESOURCES.length);
assert(BENEFIT_RESOURCES.every((resource) => required.every((field) => field in resource) && BENEFIT_RESOURCE_CATEGORIES.includes(resource.category) && resource.planYear === 2026 && resource.status === "active" && Array.isArray(resource.applicableTags) && Array.isArray(resource.links)));
assert(BENEFIT_RESOURCES.every((resource) => resource.links.every((link) => link.label && new URL(link.url).protocol === "https:")));
assert.deepEqual(actualUrls, expectedUrls);
assert.deepEqual(BENEFIT_RESOURCES.find((resource) => resource.id === "fidelity").links.map((link) => link.url), approvedUrls.fidelity);
assert.deepEqual(BENEFIT_RESOURCES.find((resource) => resource.id === "lincoln-financial").links.map((link) => link.url), approvedUrls["lincoln-financial"]);
assert(["schwab", "second-md", "teladoc", "oshi-health", "midi-health-gennev", "chubb"].every((id) => BENEFIT_RESOURCES.find((resource) => resource.id === id).links.length === 0));
assert(!/care\.com|group\s*(number|#)|policy\s*(number|#)|\b(bin|pcn)\b|corporate\s*code|password|employee\s*id|\$\d|medical\s*record/i.test(serialized));
assert.equal(filterBenefitResources({ category: "Legal assistance" })[0].vendorName, "Rocket Lawyer");
assert.equal(filterBenefitResources({ search: "Teladoc" })[0].vendorName, "Teladoc");
const activeComponent = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").slice((fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").lastIndexOf("function SupportResourcesTab")));
assert.equal(activeComponent.split("https://twilio.okta.com").length - 1, 1);
console.log(`Benefit resource validation passed for ${BENEFIT_RESOURCES.length} active resources.`);