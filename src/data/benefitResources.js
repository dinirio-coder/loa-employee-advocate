export const BENEFIT_RESOURCE_CATEGORIES = Object.freeze([
  "Leave and disability",
  "Medical and virtual care",
  "Mental health and wellbeing",
  "Family and caregiving",
  "Physical health and fitness",
  "Spending and commuter accounts",
  "Financial and retirement",
  "Legal assistance",
  "Insurance and protection",
  "Employee discounts",
]);

const APPROVED_LINKS = Object.freeze({
  "lincoln-financial": [{ label: "Open MyLincoln Portal", url: "https://www.mylincolnportal.com/" }, { label: "Visit Lincoln Financial", url: "https://www.lincolnfinancial.com" }],
  aetna: [{ label: "Open vendor website", url: "https://www.aetna.com" }],
  "kaiser-permanente": [{ label: "Open vendor website", url: "https://www.kp.org" }],
  hmsa: [{ label: "Open vendor website", url: "https://www.hmsa.com" }],
  "lyra-health": [{ label: "Activate your account", url: "https://twilio.lyrahealth.com" }],
  carrot: [{ label: "Activate your account", url: "https://get-carrot.com/signup" }],
  cleo: [{ label: "Activate your account", url: "https://hicleo.com/activate" }],
  "milk-stork": [{ label: "Open vendor website", url: "https://www.milkstork.com/twilio" }],
  "hinge-health": [{ label: "Activate your account", url: "https://hinge.health/twilio" }],
  classpass: [{ label: "Open vendor website", url: "https://classpass.com/corporate/twilio-6e13" }],
  benepass: [{ label: "Open vendor website", url: "https://app.getbenepass.com" }],
  fidelity: [{ label: "Open Fidelity 401(k)", url: "https://www.401k.com" }, { label: "Open NetBenefits", url: "https://www.netbenefits.com" }],
  "rocket-lawyer": [{ label: "Open vendor website", url: "https://go.rocketlawyer.com/twilio" }],
  "delta-dental-california": [{ label: "Open vendor website", url: "https://www.deltadentalins.com" }],
  vsp: [{ label: "Open vendor website", url: "https://www.vsp.com" }],
  "spot-pet": [{ label: "Open vendor website", url: "https://spotpet.link/twilio" }],
  "tickets-at-work": [{ label: "Open vendor website", url: "https://www.ticketsatwork.com" }],
});

const resource = ({ portalUrl, ...details }) => Object.freeze({
  planYear: 2026,
  status: "active",
  ...details,
  links: Object.freeze((APPROVED_LINKS[details.id] ?? []).map((link) => Object.freeze({ ...link }))),
  applicableTags: Object.freeze(details.applicableTags),
});

export const BENEFIT_RESOURCES = Object.freeze([
  resource({ id: "lincoln-financial", vendorName: "Lincoln Financial", category: "Leave and disability", shortDescription: "Helps administer leave and disability claims and provides leave-related support.", accessMethod: "Sign in to MyLincoln Portal to review leave information.", portalUrl: "https://www.mylincolnportal.com/", eligibilityNote: "May be available to employees with a leave or disability claim. Confirm current availability in Workday or the vendor portal.", applicableTags: ["parental or bonding", "self medical", "return to work"], sortOrder: 10 }),
  resource({ id: "aetna", vendorName: "Aetna", category: "Medical and virtual care", shortDescription: "Medical plan information and care options for employees enrolled in an Aetna medical plan.", accessMethod: "Access through your Aetna plan materials or Twilio Okta.", portalUrl: null, eligibilityNote: "Availability may depend on your enrolled medical plan. Confirm current availability in Workday or the vendor portal.", applicableTags: ["self medical", "return to work"], sortOrder: 20 }),
  resource({ id: "kaiser-permanente", vendorName: "Kaiser Permanente", category: "Medical and virtual care", shortDescription: "Medical plan information and care options for employees enrolled in a Kaiser Permanente medical plan.", accessMethod: "Access through your Kaiser Permanente plan materials or Twilio Okta.", portalUrl: null, eligibilityNote: "Availability may depend on your enrolled medical plan. Confirm current availability in Workday or the vendor portal.", applicableTags: ["self medical", "return to work"], sortOrder: 30 }),
  resource({ id: "hmsa", vendorName: "HMSA", category: "Medical and virtual care", shortDescription: "Medical plan information and care options for employees enrolled in an HMSA medical plan.", accessMethod: "Access through your HMSA plan materials or Twilio Okta.", portalUrl: null, eligibilityNote: "Availability may depend on your enrolled medical plan. Confirm current availability in Workday or the vendor portal.", applicableTags: ["self medical", "return to work"], sortOrder: 40 }),
  resource({ id: "second-md", vendorName: "2nd.MD", category: "Medical and virtual care", shortDescription: "Provides access to expert medical second-opinion support when available through your benefits.", accessMethod: "Access through your medical carrier or Twilio Okta.", portalUrl: null, eligibilityNote: "May be available through your enrolled medical plan. Confirm current availability in Workday or the vendor portal.", applicableTags: ["self medical"], sortOrder: 50 }),
  resource({ id: "teladoc", vendorName: "Teladoc", category: "Medical and virtual care", shortDescription: "Offers virtual care options when available through your medical plan.", accessMethod: "Access through your medical carrier or Twilio Okta.", portalUrl: null, eligibilityNote: "Availability may depend on your enrolled medical plan. Confirm current availability in Workday or the vendor portal.", applicableTags: ["self medical"], sortOrder: 60 }),
  resource({ id: "oshi-health", vendorName: "Oshi Health", category: "Medical and virtual care", shortDescription: "Offers digestive-health support when available through your medical plan.", accessMethod: "Access through Aetna.", portalUrl: null, eligibilityNote: "May be available through Aetna. Confirm current availability in Workday or the vendor portal.", applicableTags: ["self medical"], sortOrder: 70 }),
  resource({ id: "midi-health-gennev", vendorName: "Midi Health / Gennev", category: "Medical and virtual care", shortDescription: "Offers midlife and menopause care support when available through your medical plan.", accessMethod: "Access through Aetna.", portalUrl: null, eligibilityNote: "May be available through Aetna. Confirm current availability in Workday or the vendor portal.", applicableTags: ["self medical"], sortOrder: 80 }),
  resource({ id: "lyra-health", vendorName: "Lyra Health", category: "Mental health and wellbeing", shortDescription: "Offers mental health coaching and therapy support for employees and eligible dependents when available.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available to employees and eligible dependents. Confirm current availability in Workday or the vendor portal.", applicableTags: ["parental or bonding", "self medical", "return to work"], sortOrder: 90 }),
  resource({ id: "carrot", vendorName: "Carrot", category: "Family and caregiving", shortDescription: "Offers family-forming and fertility support when available through your benefits.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available to employees based on current benefits. Confirm current availability in Workday or the vendor portal.", applicableTags: ["parental or bonding"], sortOrder: 100 }),
  resource({ id: "cleo", vendorName: "Cleo", category: "Family and caregiving", shortDescription: "Provides parenting and caregiving support for family transitions.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available to employees and eligible dependents. Confirm current availability in Workday or the vendor portal.", applicableTags: ["parental or bonding"], sortOrder: 110 }),
  resource({ id: "milk-stork", vendorName: "Milk Stork", category: "Family and caregiving", shortDescription: "Provides breast milk shipping and travel support when available through your benefits.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available to employees based on current benefits. Confirm current availability in Workday or the vendor portal.", applicableTags: ["parental or bonding"], sortOrder: 120 }),
  resource({ id: "hinge-health", vendorName: "Hinge Health", category: "Physical health and fitness", shortDescription: "Offers digital musculoskeletal care and guided exercise support.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available through your enrolled medical plan. Confirm current availability in Workday or the vendor portal.", applicableTags: ["self medical"], sortOrder: 130 }),
  resource({ id: "classpass", vendorName: "ClassPass", category: "Physical health and fitness", shortDescription: "Provides fitness and wellness class access when available through your benefits.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available to employees based on current benefits. Confirm current availability in Workday or the vendor portal.", applicableTags: [], sortOrder: 140 }),
  resource({ id: "benepass", vendorName: "Benepass", category: "Spending and commuter accounts", shortDescription: "Helps manage eligible spending and commuter account programs when available.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available based on your benefit elections. Confirm current availability in Workday or the vendor portal.", applicableTags: [], sortOrder: 150 }),
  resource({ id: "fidelity", vendorName: "Fidelity", category: "Financial and retirement", shortDescription: "Provides retirement plan and financial wellbeing resources when available.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available based on your benefit elections. Confirm current availability in Workday or the vendor portal.", applicableTags: [], sortOrder: 160 }),
  resource({ id: "schwab", vendorName: "Schwab", category: "Financial and retirement", shortDescription: "Provides equity and financial account resources when available.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available based on your benefit elections. Confirm current availability in Workday or the vendor portal.", applicableTags: [], sortOrder: 170 }),
  resource({ id: "rocket-lawyer", vendorName: "Rocket Lawyer", category: "Legal assistance", shortDescription: "Provides legal document and attorney support when available through your benefits.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available to employees based on current benefits. Confirm current availability in Workday or the vendor portal.", applicableTags: [], sortOrder: 180 }),
  resource({ id: "delta-dental-california", vendorName: "Delta Dental of California", category: "Insurance and protection", shortDescription: "Provides dental plan information for employees enrolled in the applicable dental plan.", accessMethod: "Access through your insurance card, plan materials, or Twilio Okta.", portalUrl: null, eligibilityNote: "Availability may depend on your enrolled dental plan. Confirm current availability in Workday or the vendor portal.", applicableTags: [], sortOrder: 190 }),
  resource({ id: "vsp", vendorName: "VSP", category: "Insurance and protection", shortDescription: "Provides vision plan information for employees enrolled in the applicable vision plan.", accessMethod: "Access through your insurance card, plan materials, or Twilio Okta.", portalUrl: null, eligibilityNote: "Availability may depend on your enrolled vision plan. Confirm current availability in Workday or the vendor portal.", applicableTags: [], sortOrder: 200 }),
  resource({ id: "spot-pet", vendorName: "Spot Pet", category: "Insurance and protection", shortDescription: "Provides pet insurance information when available through your benefits.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available to employees based on current benefits. Confirm current availability in Workday or the vendor portal.", applicableTags: [], sortOrder: 210 }),
  resource({ id: "chubb", vendorName: "Chubb", category: "Insurance and protection", shortDescription: "Provides insurance and protection resources when available through your benefits.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available to employees based on current benefits. Confirm current availability in Workday or the vendor portal.", applicableTags: [], sortOrder: 220 }),
  resource({ id: "tickets-at-work", vendorName: "Tickets at Work", category: "Employee discounts", shortDescription: "Provides employee discount offers when available through your benefits.", accessMethod: "Open through Twilio Okta.", portalUrl: null, eligibilityNote: "May be available to employees based on current benefits. Confirm current availability in Workday or the vendor portal.", applicableTags: [], sortOrder: 230 }),
]);

export const filterBenefitResources = ({ category = "All resources", search = "" } = {}) => {
  const query = search.trim().toLowerCase();
  return BENEFIT_RESOURCES.filter((item) => (
    (category === "All resources" || item.category === category)
    && (!query || `${item.vendorName} ${item.shortDescription} ${item.category}`.toLowerCase().includes(query))
  )).sort((left, right) => left.sortOrder - right.sortOrder);
};