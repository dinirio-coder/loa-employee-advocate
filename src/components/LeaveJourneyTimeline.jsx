import React, { useEffect, useState } from "react";

const formatJourneyDate = (value) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

const JourneyBadge = ({ children }) => <span className="inline-flex items-center rounded-full border border-[#1B66EE]/40 bg-[#1B66EE]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#1B66EE]">{children}</span>;

const JourneyPanel = ({ children, className = "" }) => <section className={`rounded-2xl border border-[#38425E] bg-[#0F1830]/90 shadow-[0_16px_42px_rgba(0,13,37,.22)] ${className}`}>{children}</section>;

const stageSegmentIds = { "pre-leave": "pre-leave", documentation: "documentation", "business-handoff": "prepare", "on-leave": "active-leave", "return-to-work": "return-planning", "first-day-back": "return-to-work", "after-return": "after-return" };
const tones = { cyan: "border-cyan-400 bg-cyan-400/15 text-cyan-100", amber: "border-amber-400 bg-amber-400/15 text-amber-100", violet: "border-violet-400 bg-violet-400/15 text-violet-100", green: "border-emerald-400 bg-emerald-400/15 text-emerald-100" };
const shortLabels = { "pre-leave": "Pre-leave", documentation: "Documents", prepare: "Prepare", "waiting-period": "Days 1-7", "active-leave": "Active Leave", "return-planning": "Return Planning", "return-to-work": "Return", "after-return": "After Return" };

export function LeaveJourneyTimeline({ journey }) {
  const initialWeek = journey.durationWeeks ? Math.max(1, Math.min(Math.ceil(journey.durationWeeks), Math.floor((Date.now() - Date.parse(`${journey.startDate}T00:00:00Z`)) / 604800000) + 1)) : 1;
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);

  useEffect(() => { setSelectedWeek(initialWeek); }, [journey.startDate, journey.currentStageId, initialWeek]);

  if (journey.dateStatus === "needs-confirmation") return <JourneyPanel className="border-l-4 border-l-amber-400 p-5 sm:p-6"><JourneyBadge>Dates need confirmation</JourneyBadge><h2 className="mt-4 font-serif text-2xl font-bold">Your Leave Journey</h2><p className="mt-2 text-sm leading-6 text-slate-300">{journey.message}</p><p className="mt-3 text-sm text-cyan-300">Review your next milestone and MyLincoln Portal for the appropriate next step.</p></JourneyPanel>;

  const hasWeekControl = journey.durationDays >= 7;
  const totalSelections = hasWeekControl ? Math.max(1, Math.ceil(journey.durationWeeks)) : journey.durationDays;
  const selectedDate = new Date(Date.parse(`${journey.startDate}T00:00:00Z`) + (selectedWeek - 1) * (hasWeekControl ? 604800000 : 86400000)).toISOString().slice(0, 10);
  const currentSegment = journey.segments.find((segment) => segment.id === stageSegmentIds[journey.currentStageId]) || journey.segments[0];
  const selectedSegment = journey.segments.find((segment) => Date.parse(`${segment.startDate}T00:00:00Z`) <= Date.parse(`${selectedDate}T00:00:00Z`) && Date.parse(`${segment.endDate}T00:00:00Z`) >= Date.parse(`${selectedDate}T00:00:00Z`)) || currentSegment;
  const selectedLabel = hasWeekControl ? `Week ${selectedWeek}` : formatJourneyDate(selectedDate);

  return <JourneyPanel className="p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><JourneyBadge>INTERACTIVE TIMELINE</JourneyBadge><h2 className="mt-3 font-serif text-2xl font-bold">Your Leave Journey</h2><p className="mt-1 text-sm text-slate-400">{journey.summary}</p><p className="mt-1 text-xs text-slate-400">{journey.message}</p></div>
      <div className="border-l-2 border-emerald-400 pl-3 sm:text-right"><p className="text-[11px] font-bold tracking-widest text-slate-400">CURRENT STAGE</p><p className="mt-1 font-bold text-emerald-300">{journey.currentStageLabel}</p></div>
    </div>
    <div className="mt-5 hidden h-[120px] rounded-lg border border-[#38425E] bg-[#10172a] px-4 py-7 lg:block" aria-label="Leave journey timeline">
      <div className="flex h-[52px] gap-2">
        {journey.segments.map((segment) => <div key={segment.id} style={{ flexGrow: segment.days, flexBasis: 0 }} title={segment.label} aria-label={`${segment.label}: ${formatJourneyDate(segment.startDate)} to ${formatJourneyDate(segment.endDate)}`} className={`relative flex min-w-10 items-center justify-center overflow-visible rounded-md px-2 text-center text-xs font-bold whitespace-nowrap ${tones[segment.tone]} ${selectedSegment.id === segment.id ? "ring-2 ring-white/50" : ""}`}><span className="overflow-hidden text-ellipsis whitespace-nowrap">{shortLabels[segment.id]}</span>{currentSegment.id === segment.id && <span className="absolute left-1/2 top-[-29px] z-10 flex -translate-x-1/2 flex-col items-center text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,.9)]"><span>YOU</span><span className="mt-1 h-[66px] w-px bg-white shadow-[0_0_5px_white]" /></span>}</div>)}
      </div>
    </div>
    <div className="mt-3 hidden grid-cols-4 text-xs text-slate-400 lg:grid"><span>Planning</span><span className="text-center">{formatJourneyDate(journey.startDate)}</span><span className="text-center">Midpoint</span><span className="text-right">{formatJourneyDate(journey.actualReturnDate || journey.expectedReturnDate || journey.endDate)}</span></div>
    <div className="mt-5 space-y-2 lg:hidden" aria-label="Leave journey timeline">
      {journey.segments.map((segment) => <div key={segment.id} title={segment.label} aria-label={`${segment.label}: ${formatJourneyDate(segment.startDate)} to ${formatJourneyDate(segment.endDate)}`} className={`flex h-12 items-center justify-between rounded-md border-l-4 px-3 text-sm font-bold ${tones[segment.tone]} ${selectedSegment.id === segment.id ? "ring-2 ring-white/50" : ""}`}><span className="truncate">{shortLabels[segment.id]}</span>{currentSegment.id === segment.id && <span className="text-[10px] text-white">YOU</span>}</div>)}
    </div>
    <div className="mt-5 border-t border-[#38425E] pt-4"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><label htmlFor="leave-journey-week" className="text-sm font-bold">Explore your journey by week</label><output className="text-sm font-bold text-cyan-300">Selected point: {selectedLabel}</output></div><input id="leave-journey-week" type="range" min="1" max={totalSelections} value={selectedWeek} onChange={(event) => setSelectedWeek(Number(event.target.value))} aria-valuetext={`Selected point: ${selectedLabel}, ${selectedSegment.label}, ${formatJourneyDate(selectedSegment.startDate)} to ${formatJourneyDate(selectedSegment.endDate)}`} className="mt-3 h-1 w-full accent-cyan-400" /><p className="mt-3 text-xs text-slate-400">{selectedSegment.label}: {formatJourneyDate(selectedSegment.startDate)} - {formatJourneyDate(selectedSegment.endDate)}</p></div>
  </JourneyPanel>;
}