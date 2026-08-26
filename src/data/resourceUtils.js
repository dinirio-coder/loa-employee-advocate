const freezeResource = (resource) => Object.freeze({
  ...resource,
  tags: Object.freeze([...resource.tags]),
});

const RESOURCE_CATALOG = Object.freeze([
  freezeResource({
    id: "lyra",
    name: "Lyra",
    category: "mental-wellbeing",
    summary: "A general optional resource for mental-wellbeing coaching and therapy support for employees and eligible dependents.",
    bestFor: "Stress, transitions, and exploring mental-wellbeing support",
    owner: "Lyra",
    accessLabel: "Explore resource",
    destination: null,
    availabilityNote: "Plan availability and access instructions require confirmation in current Twilio benefit materials.",
    tags: ["mental wellbeing", "coaching", "therapy"],
  }),
  freezeResource({
    id: "hinge-health",
    name: "Hinge Health",
    category: "physical-wellbeing",
    summary: "A general optional resource offering digital musculoskeletal care and guided exercise support.",
    bestFor: "Back, neck, joint, and mobility support",
    owner: "Hinge Health",
    accessLabel: "Explore resource",
    destination: null,
    availabilityNote: "Plan availability and access instructions require confirmation in current Twilio benefit materials.",
    tags: ["physical wellbeing", "musculoskeletal", "guided exercise"],
  }),
  freezeResource({
    id: "transform-oncology",
    name: "Transform Oncology",
    category: "specialized-care",
    summary: "Optional navigation support for employees and families facing a cancer diagnosis or treatment journey.",
    bestFor: "Care navigation and second-opinion support",
    owner: "Transform Oncology",
    accessLabel: "Explore resource",
    destination: null,
    availabilityNote: "Plan availability and access instructions require confirmation in current Twilio benefit materials.",
    tags: ["specialized care", "care navigation", "second opinion"],
  }),
  freezeResource({
    id: "cleo",
    name: "Cleo",
    category: "family-caregiving",
    summary: "A general optional family-support resource for pregnancy, parenting, caregiving, and major family transitions.",
    bestFor: "Parenthood and caregiving",
    owner: "Cleo",
    accessLabel: "Explore resource",
    destination: null,
    availabilityNote: "Plan availability and access instructions require confirmation in current Twilio benefit materials.",
    tags: ["family caregiving", "parenting", "caregiving"],
  }),
  freezeResource({
    id: "milk-stork",
    name: "Milk Stork",
    category: "family-caregiving",
    summary: "An optional family-support resource related to milk shipping and storage logistics.",
    bestFor: "Exploring family and caregiving logistics",
    owner: "Milk Stork",
    accessLabel: "Explore resource",
    destination: null,
    availabilityNote: "Plan availability and access instructions require confirmation in current Twilio benefit materials; coverage is not assumed.",
    tags: ["family caregiving", "milk shipping", "caregiving logistics"],
  }),
]);

const CATEGORY_DEFINITIONS = Object.freeze([
  Object.freeze({ id: "all", label: "All Resources" }),
  Object.freeze({ id: "return-to-work", label: "Return to Work" }),
  Object.freeze({ id: "family-caregiving", label: "Family & Caregiving" }),
  Object.freeze({ id: "mental-wellbeing", label: "Mental Wellbeing" }),
  Object.freeze({ id: "physical-wellbeing", label: "Physical Wellbeing" }),
  Object.freeze({ id: "specialized-care", label: "Specialized Care" }),
]);

export const getSupportResources = () => [...RESOURCE_CATALOG];

export const filterSupportResources = (category = "all") =>
  getSupportResources().filter((resource) => category === "all" || resource.category === category);

export const getSupportResourceCategories = () =>
  CATEGORY_DEFINITIONS.filter((category) => category.id === "all" || RESOURCE_CATALOG.some((resource) => resource.category === category.id)).map((category) => ({ ...category }));

export { RESOURCE_CATALOG };
