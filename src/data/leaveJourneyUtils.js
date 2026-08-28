import { getEmployeeDurationSummary } from "./durationUtils.js";
import { getCanonicalLeaveEpisodes } from "./leaveEpisodeUtils.js";
import { getLifecycleStageDecision } from "./lifecycleStageEngine.js";
import { LIFECYCLE_STAGE_DEFINITIONS } from "./lifecycleUtils.js";
import { getEmployeeReturnToWorkSummary } from "./rtwUtils.js";
import { normalizeEmployeeLeaveStatus } from "./statusUtils.js";

const DAY = 86400000;
const STAGE_SEGMENTS = {
  "pre-leave": "pre-leave",
  documentation: "documentation",
  "business-handoff": "prepare",
  "on-leave": "active-leave",
  "return-to-work": "return-planning",
  "first-day-back": "return-to-work",
  "after-return": "after-return",
};

const dateValue = (value) => Date.parse(`${value}T00:00:00Z`);
const dateOffset = (value, days) => new Date(dateValue(value) + days * DAY).toISOString().slice(0, 10);
const daysInclusive = (startDate, endDate) => Math.max(1, Math.round((dateValue(endDate) - dateValue(startDate)) / DAY) + 1);
const formatDate = (value) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const formatRange = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const short = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  return `${short.format(start)}-${sameYear ? short.format(end) : formatDate(end)}, ${start.getUTCFullYear()}`;
};
const isStd = (employee) => [employee?.leaveProduct, ...(employee?.sourceRecords || []).map((record) => record.product)].some((value) => ["STD", "STDCP"].includes(String(value || "").trim().toUpperCase()));
const stageLabel = (stageId) => LIFECYCLE_STAGE_DEFINITIONS.find((stage) => stage.id === stageId)?.title || "Leave dates need confirmation";
const segment = (id, label, startDate, endDate, tone) => ({ id, label, startDate, endDate, days: daysInclusive(startDate, endDate), tone });

export const getEmployeeLeaveJourney = (employee, { asOfDate } = {}) => {
  const decision = getLifecycleStageDecision(employee, { asOfDate });
  const duration = getEmployeeDurationSummary(employee);
  const returnToWork = getEmployeeReturnToWorkSummary(employee);
  const episodes = getCanonicalLeaveEpisodes(employee);
  const canonicalEpisode = episodes.find((episode) => episode.leaveBeginDate === decision.normalizedDates.leaveStart && episode.leaveEndDate === decision.normalizedDates.leaveEnd);
  const startDate = canonicalEpisode?.leaveBeginDate || decision.normalizedDates.leaveStart;
  const endDate = canonicalEpisode?.leaveEndDate || decision.normalizedDates.leaveEnd;
  const expectedReturnDate = decision.normalizedDates.expectedReturn || returnToWork.estimatedReturnDate;
  const actualReturnDate = decision.normalizedDates.actualReturn || returnToWork.actualReturnDate;
  const currentStageId = decision.stageId;
  const safeWindow = Boolean(startDate && endDate && !decision.flags.needsDateConfirmation && dateValue(endDate) >= dateValue(startDate));
  const message = safeWindow
    ? actualReturnDate ? `Your return date is recorded as ${formatDate(actualReturnDate)}.` : expectedReturnDate ? `Your return date is expected on ${formatDate(expectedReturnDate)}.` : "Review the stages that apply to your leave."
    : "Your leave dates need confirmation before the full journey can be displayed.";

  if (!safeWindow) {
    return {
      title: "Your Leave Journey",
      startDate: null,
      endDate: null,
      expectedReturnDate: null,
      actualReturnDate: null,
      durationDays: null,
      durationWeeks: null,
      currentStageId,
      currentStageLabel: stageLabel(currentStageId),
      selectedPoint: stageLabel(currentStageId),
      segments: [],
      dateStatus: "needs-confirmation",
      message,
    };
  }

  const hasReturnDate = Boolean(actualReturnDate || expectedReturnDate);
  const returnDate = actualReturnDate || expectedReturnDate || dateOffset(endDate, 1);
  const prepStart = dateOffset(startDate, -3);
  const documentationNeeded = normalizeEmployeeLeaveStatus(employee).statusKey.startsWith("PENDING") || currentStageId === "documentation";
  const waitingEnd = dateValue(endDate) > dateValue(dateOffset(startDate, 6)) ? dateOffset(startDate, 6) : endDate;
  const activeStart = isStd(employee) ? dateOffset(waitingEnd, 1) : startDate;
  const planningStart = hasReturnDate && dateValue(returnDate) > dateValue(activeStart) ? dateOffset(returnDate, -14) : null;
  const activeEnd = planningStart && dateValue(planningStart) > dateValue(activeStart) ? dateOffset(planningStart, -1) : endDate;
  const segments = [
    segment("pre-leave", "Pre-leave", dateOffset(prepStart, -4), dateOffset(prepStart, -1), "cyan"),
    ...(documentationNeeded ? [segment("documentation", "Documentation", dateOffset(prepStart, -1), prepStart, "amber")] : []),
    segment("prepare", "Prepare for Leave", prepStart, dateOffset(startDate, -1), "violet"),
    ...(isStd(employee) ? [segment("waiting-period", "Waiting Period: Days 1-7", startDate, waitingEnd, "amber")] : []),
    segment("active-leave", "Active Leave", activeStart, activeEnd, "violet"),
    ...(hasReturnDate ? [segment("return-planning", "Return Planning", planningStart, dateOffset(returnDate, -1), "cyan")] : []),
    ...(hasReturnDate ? [segment("return-to-work", "Return to Work", returnDate, returnDate, "green")] : []),
    ...(actualReturnDate ? [segment("after-return", "After Return", dateOffset(actualReturnDate, 1), dateOffset(actualReturnDate, 7), "violet")] : []),
  ].filter((item) => dateValue(item.endDate) >= dateValue(item.startDate));
  const durationDays = duration.hasDuration ? duration.durationDays : daysInclusive(startDate, endDate);
  const durationWeeks = duration.hasDuration ? duration.durationWeeks : durationDays / 7;
  const currentSegmentId = STAGE_SEGMENTS[currentStageId] || segments[0]?.id;
  const currentSegment = segments.find((item) => item.id === currentSegmentId) || segments[0];

  return {
    title: "Your Leave Journey",
    startDate,
    endDate,
    expectedReturnDate: expectedReturnDate || null,
    actualReturnDate: actualReturnDate || null,
    durationDays,
    durationWeeks,
    currentStageId,
    currentStageLabel: stageLabel(currentStageId),
    selectedPoint: currentSegment?.label || stageLabel(currentStageId),
    segments,
    dateStatus: actualReturnDate ? "return-recorded" : expectedReturnDate ? "expected-return" : "planned-leave",
    message,
    summary: `${formatRange(startDate, endDate)} • ${durationWeeks.toFixed(1)} planned weeks`,
  };
};

export { formatDate as formatLeaveJourneyDate };