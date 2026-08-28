import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

assert.match(app, /import\s*\{[^}]*getEmployeeLifecycle[^}]*\}\s*from\s*["']\.\/data\/lifecycleUtils["']/s);
assert.match(app, /function\s+LifecycleOverview\s*\([^)]*\)\s*\{[\s\S]*?getEmployeeLifecycle\(employee\)/);
assert.match(app, /function\s+LifecycleStagePanel\s*\(/);
assert.match(app, /lifecycle\.stages\.map\(/);
assert.match(app, /if\s*\(activeTab\s*===\s*["']chat["']\)[\s\S]*?return\s*<ChatTab[\s\S]*?return\s*<LifecycleOverview\s+employee=\{employee\}\s*\/>/);
assert.doesNotMatch(app, /function\s+TodosTab\s*\(/);
assert.doesNotMatch(app, /const\s+stages\s*=\s*\[/);
assert.doesNotMatch(app, /Administration Responsibility Matrix/);
assert.doesNotMatch(app, /LifecycleAccordion|Expand all|Collapse all/);

for (const phrase of [
  "Stage 1: Pre-Leave Planning",
  "Stage 2: Medical Documentation",
  "Stage 3: Three-Day Handoff",
  "Stage 4: Welcome Back & RTW",
  "Formal leave intake",
  "Notify your manager and HRBP",
  "Suggested from your current record",
  "Before return and first 30 days",
  "Administration Responsibility Matrix",
]) {
  assert.equal(app.includes(phrase), false, `Legacy lifecycle phrase remains: ${phrase}`);
}

assert.match(app, /grid gap-2 sm:grid-cols-2 lg:grid-cols-4/);
assert.match(app, /role="tablist"/);
assert.match(app, /role="tab"/);
assert.match(app, /aria-selected=\{selectedStage\.id === stage\.id\}/);
assert.match(app, /role="tabpanel"/);
assert.match(app, /aria-labelledby=\{`lifecycle-stage-tab-\$\{stage\.id\}`\}/);
assert.match(app, /<LifecycleStagePanel stage=\{selectedStage\}/);
assert.doesNotMatch(app, /lifecycle\.stages\.map\(\(stage\) => <LifecycleStagePanel/);
assert.match(app, /const \[selectedStageId, setSelectedStageId\]/);
assert.match(app, /setSelectedStageId\(lifecycle\.suggestedStageId \|\| lifecycle\.stages\[0\]\?\.id\)/);
assert.match(app, /onClick=\{\(\) => selectStage\(stage\.id\)\}/);
assert.match(app, /onKeyDown=\{\(event\) => moveTabFocus\(event, index\)\}/);
assert.match(app, /setChecked\(\(current\) => \(\{ \.\.\.current, \[id\]: !current\[id\] \}\)\)/);
assert.match(app, /stage\.status === "suggested" \? "ring-1 ring-emerald-400\/50"/);
assert.match(app, /<LeaveJourneyTimeline journey=\{journey\} \/>/);
assert.doesNotMatch(app, /Profile Snapshot/);
assert.match(app, /Your checked items are saved only for this session and do not update Workday or Lincoln Financial\./);
assert.doesNotMatch(app, /confirming that your manager and HRBP know/);

console.log("Lifecycle UI consolidation validation passed.");
