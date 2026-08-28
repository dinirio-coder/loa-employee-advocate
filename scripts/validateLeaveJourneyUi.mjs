import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
assert.match(app, /getEmployeeLeaveJourney/);
assert.match(app, /<LeaveJourneyTimeline journey=\{journey\} \/>/);
assert.doesNotMatch(app, /Profile Snapshot/);
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: "spa" });
try {
  const { LeaveJourneyTimeline } = await server.ssrLoadModule("/src/components/LeaveJourneyTimeline.jsx");
  const journey = { title: "Your Leave Journey", startDate: "2026-09-10", endDate: "2026-10-09", expectedReturnDate: "2026-10-10", actualReturnDate: null, durationDays: 30, durationWeeks: 4.3, currentStageId: "on-leave", currentStageLabel: "While You Are on Leave", selectedPoint: "Active Leave", dateStatus: "expected-return", message: "Your return date is expected on October 10, 2026.", summary: "September 10-October 9, 2026 • 4.3 planned weeks", segments: [{ id: "pre-leave", label: "Pre-leave", startDate: "2026-09-03", endDate: "2026-09-06", days: 4, tone: "cyan" }, { id: "prepare", label: "Prepare for Leave", startDate: "2026-09-07", endDate: "2026-09-09", days: 3, tone: "violet" }, { id: "waiting-period", label: "Waiting Period: Days 1-7", startDate: "2026-09-10", endDate: "2026-09-16", days: 7, tone: "amber" }, { id: "active-leave", label: "Active Leave", startDate: "2026-09-17", endDate: "2026-09-25", days: 9, tone: "violet" }, { id: "return-planning", label: "Return Planning", startDate: "2026-09-26", endDate: "2026-10-09", days: 14, tone: "cyan" }, { id: "return-to-work", label: "Return to Work", startDate: "2026-10-10", endDate: "2026-10-10", days: 1, tone: "green" }] };
  const html = renderToStaticMarkup(React.createElement(LeaveJourneyTimeline, { journey }));
  assert.match(html, /Your Leave Journey/);
  assert.match(html, />YOU</);
  assert.doesNotMatch(html, /YOU ARE HERE/);
  assert.match(html, /h-\[120px\]/);
  assert.match(html, /h-\[52px\]/);
  assert.match(html, /h-12/);
  assert.match(html, /whitespace-nowrap/);
  assert.match(html, /h-\[66px\] w-px bg-white/);
  assert.match(html, /Planning/);
  assert.match(html, /Waiting Period: Days 1-7: September 10, 2026 - September 16, 2026/);
  assert.match(html, /type="range"/);
  assert.match(html, /aria-valuetext/);
  assert.doesNotMatch(html, /min-w-\[720px\]|NaN|undefined|null|Profile Snapshot/);
} finally { await server.close(); }
console.log("Leave journey UI rendering and accessibility validation passed.");