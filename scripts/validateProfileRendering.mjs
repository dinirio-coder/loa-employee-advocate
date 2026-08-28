import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { CURATED_DEMO_PROFILES } from "../src/data/curatedDemoProfiles.js";
import { getVerifiedEmployeeProfile } from "../src/data/verifiedEmployeeProfile.js";
import { getEmployeePayExperience } from "../src/data/payExperienceUtils.js";

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: "spa" });
try {
  const {
    default: App,
    PayExperienceLayout,
    ParentalCoordinationCard,
    StateStatutoryCard,
    ReturnToWorkTab,
    LifecycleOverview,
  } = await server.ssrLoadModule("/src/App.jsx");
  const render = (element, label) => {
    try {
      const html = renderToStaticMarkup(element);
      assert(!html.includes("NaN"), `${label} rendered NaN`);
      assert(!html.includes("undefined"), `${label} rendered undefined`);
      return html;
    } catch (error) {
      throw new Error(`${label} render failed: ${error.stack || error.message}`);
    }
  };

  const noEmployee = render(React.createElement(App), "initial App");
  assert(noEmployee.length > 0);
  const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(appSource, /Welcome, \{employee\.firstName\} \{employee\.lastName\}/);
  assert.doesNotMatch(appSource, /Thank you\. I confirmed your first name/);
  assert.match(appSource, />Your Pay</);
  assert.doesNotMatch(appSource, /Your Pay and Leave Timeline/);

  const find = (id) => CURATED_DEMO_PROFILES.find((scenario) => scenario.id === id).profile;
  const paidParental = getVerifiedEmployeeProfile("Minnie", "Mouse", "700002");
  const parentalHtml = render(React.createElement(PayExperienceLayout, { experience: getEmployeePayExperience(paidParental, { asOfDate: "2026-08-27" }) }), "paid parental pay layout");
  assert.match(parentalHtml, /Short-Term Disability estimate/);
  assert.match(parentalHtml, /Estimated coordinated pay/);
  assert.match(parentalHtml, /3,774\.34/);
  assert.match(parentalHtml, /First 7 Calendar Days/);
  assert.match(parentalHtml, /Short-Term Disability waiting period/);

  const minnieProfile = getVerifiedEmployeeProfile("Minnie", "Mouse", "700002");
  const minnieHtml = render(React.createElement(PayExperienceLayout, { experience: getEmployeePayExperience(minnieProfile, { asOfDate: "2026-08-27" }) }), "Minnie Mouse pay layout");
  assert.match(minnieHtml, /Short-Term Disability estimate/);
  assert.match(minnieHtml, /Estimated coordinated pay/);
  assert.match(minnieHtml, /3,774\.34/);

  const scenarios = [
    ["paid-parental-no-state", /Paid parental leave estimate/],
    ["paid-parental-family-state", /State benefit estimate/],
    ["std-no-state", /Short-Term Disability estimate/],
    ["std-with-state", /State benefit estimate/],
    ["employee-applied-state", /State Statutory Leave Coordination/],
    ["lincoln-managed-state", /State Statutory Leave Coordination/],
    ["unsupported-state", /No state benefit estimate included/],
    ["no-pay", /Some pay information is unavailable|Pay information is not available/],
    ["conflicting-dates", /Confirm/],
  ];
  for (const [id, expected] of scenarios) {
    const profile = find(id);
    const payHtml = render(React.createElement(PayExperienceLayout, { experience: getEmployeePayExperience(profile, { asOfDate: "2026-08-27" }) }), `${id} pay layout`);
    const stateHtml = render(React.createElement(StateStatutoryCard, { employee: profile }), `${id} state card`);
    if (id === "unsupported-state") assert.match(stateHtml, expected, `${id} state output`);
    const lifecycleHtml = render(React.createElement(LifecycleOverview, { employee: profile }), `${id} lifecycle`);
    assert(lifecycleHtml.length > 0);
    const returnHtml = render(React.createElement(ReturnToWorkTab, { employee: profile }), `${id} return-to-work`);
    assert(returnHtml.length > 0);
    if (id === "conflicting-dates") assert.match(returnHtml, expected, `${id} return output`);
  }
  const missingDates = { state: "NY", leaveCategory: "OWN_MEDICAL", sourceRecords: [{ biweeklySalaryAmount: "10275.24", product: "STD" }] };
  const missingStateHtml = render(React.createElement(StateStatutoryCard, { employee: missingDates }), "missing-date state card");
  assert.match(missingStateHtml, /Dates need confirmation/);
  render(React.createElement(PayExperienceLayout, { experience: getEmployeePayExperience(missingDates, { asOfDate: "2026-08-27" }) }), "missing-date pay layout");
  const noPayHtml = render(React.createElement(PayExperienceLayout, { experience: getEmployeePayExperience(find("no-pay"), { asOfDate: "2026-08-27" }) }), "no-pay layout");
  assert.match(noPayHtml, /Some pay information is unavailable/);
  const stdExperience = getEmployeePayExperience(find("std-with-state"), { asOfDate: "2026-08-27" });
  const stdHtml = render(React.createElement(PayExperienceLayout, { experience: stdExperience }), "STD pay layout");
  assert.match(stdHtml, /Short-Term Disability estimate/);
  assert.match(stdHtml, /Estimated coordinated pay/);
  assert.equal(stateHtmlCount(stdHtml), 0);
  function stateHtmlCount(html) { return (html.match(/State Statutory Leave Coordination/g) || []).length; }
  const parentalCard = render(React.createElement(ParentalCoordinationCard, { experience: getEmployeePayExperience(minnieProfile, { asOfDate: "2026-08-27" }) }), "parental coordination card");
  assert.match(parentalCard, /3,774\.34/);
  assert.match(parentalCard, /Paid parental leave/);
  assert(!parentalCard.includes("amount undefined"));
  console.log("Profile render-safety validation passed for App, pay, parental, state, RTW, and lifecycle paths.");
} finally {
  await server.close();
}
