import React, { useEffect, useMemo, useState } from "react";
import { CONFLICTING_EMPLOYEE_IDS } from "./data/embeddedEmployeeRecords";
import {
  normalizeEmployeeId,
} from "./data/identityUtils";
import {
  getEmployeePaySummary,
  PAY_UNAVAILABLE_MESSAGE,
} from "./data/payUtils";
import { getEmployeeDurationSummary } from "./data/durationUtils";
import { getVerifiedEmployeeProfile } from "./data/verifiedEmployeeProfile";
import {
  formatReturnToWorkDate,
} from "./data/rtwUtils";
import { getEmployeePriorityActions } from "./data/actionPlanUtils";
import { getEmployeeStatusSummary } from "./data/statusUtils";
import { getEmployeeNextMilestone } from "./data/milestoneUtils";
import { getEmployeeLifecycle } from "./data/lifecycleUtils";
import { getStateBenefitCoordination } from "./data/stateBenefitUtils";
import { getEmployeeLifecycleAlerts } from "./data/lifecycleAlertUtils";
import { getEmployeeReturnToWorkExperience } from "./data/returnToWorkExperience";
import { getEmployeePayExperience } from "./data/payExperienceUtils";
import { getStateCoordinationExperience } from "./data/stateCoordinationExperience";
import {
  filterSupportResources,
  getSupportResourceCategories,
} from "./data/resourceUtils";

const CONFLICTED_EMPLOYEE_IDS = new Set(
  CONFLICTING_EMPLOYEE_IDS.map((value) => normalizeEmployeeId(value))
);

const TEXT_NOT_AVAILABLE = "Not available";

const safeText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text && !["null", "undefined", "NaN"].includes(text.toLowerCase())
    ? text
    : fallback;
};


const getDisplayLocation = (employee) => {
  const location = safeText(employee?.location);
  const state = safeText(employee?.state);

  if (state) return state;
  if (location) return location;
  return TEXT_NOT_AVAILABLE;
};

const GENERIC_VERIFICATION_ERROR =
  "I couldn’t verify an employee record using all three entries. Please check the spelling of your first and last name and re-enter your Employee ID.";

const CONFLICT_VERIFICATION_ERROR =
  "We found a source record that requires administrative review before personalized information can be displayed. Please contact Twilio Leave Operations.";

const SUCCESS_STATUS_MESSAGE =
  "Thank you. I confirmed your first name, last name, and Employee ID against the authorized employee record. I can now help with the administrative information available in your leave record.";

const TABS = [
  ["todos", "✓", "Lifecycle To-Dos"],
  ["payTimeline", "$", "Pay & Leave Timeline"],
  ["rtw", "↻", "Return to Work"],
  ["resources", "◇", "Support Resources"],
  ["chat", "✦", "Ask Advocate"],
];

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

function Badge({ children, tone = "cyan" }) {
  const tones = {
    cyan: "border-[#38425E] bg-[#0F1830] text-[#F7F4F7]",
    pink: "border-[#EF223A]/40 bg-[#EF223A]/10 text-[#EF223A]",
    amber: "border-[#656E87] bg-[#38425E]/20 text-[#F7F4F7]",
    green: "border-[#38425E] bg-[#38425E]/15 text-[#F7F4F7]",
    violet: "border-[#1B66EE]/40 bg-[#1B66EE]/10 text-[#1B66EE]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Panel({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-[#38425E] bg-[#0F1830]/90 shadow-[0_16px_42px_rgba(0,13,37,.22)] ${className}`}
    >
      {children}
    </section>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#9AA0B4]">
        {label}
      </span>
      <input
        required
        {...props}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#656E87] focus:border-[#1B66EE] focus:ring-2 focus:ring-[#1B66EE]/15 ${
          props.disabled
            ? "cursor-not-allowed border-[#38425E] bg-[#000D25] text-[#656E87] opacity-60"
            : "border-[#38425E] bg-[#000D25]"
        }`}
      />
    </label>
  );
}

function CheckItem({ children, checked, onChange, accent = "cyan" }) {
  const colors = {
    cyan: "accent-[#1B66EE]",
    amber: "accent-[#656E87]",
    violet: "accent-[#1B66EE]",
    green: "accent-[#1B66EE]",
  };

  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-[#38425E]/10">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={`mt-0.5 h-4 w-4 rounded border-[#38425E] bg-[#000D25] ${colors[accent]}`}
      />
      <span
        className={`text-sm leading-5 ${
          checked ? "text-[#656E87] line-through" : "text-[#F7F4F7]"
        }`}
      >
        {children}
      </span>
    </label>
  );
}

function PasswordGate({ onUnlock }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!isLocked) return undefined;

    const timer = window.setTimeout(() => {
      setIsLocked(false);
      setAttempts(0);
    }, 30000);

    return () => window.clearTimeout(timer);
  }, [isLocked]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
  };

  const submit = (event) => {
    event.preventDefault();

    if (isLocked) return;

    const validUsername = form.username === "admin";
    const validPassword = form.password === "TweekWeek2026!";

    if (!validUsername || !validPassword) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setError("Invalid username or password");
      setForm((current) => ({ ...current, password: "" }));

      if (nextAttempts >= 5) {
        setIsLocked(true);
      }
      return;
    }

    setAttempts(0);
    setIsLocked(false);
    setError("");
    onUnlock();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0e1425] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_20%_15%,rgba(34,211,238,.13),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(239,34,58,.13),transparent_24%),radial-gradient(circle_at_65%_90%,rgba(139,92,246,.12),transparent_30%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-slate-700/80 bg-[#171e32] shadow-2xl lg:grid-cols-[1.05fr_.95fr]">
          <div className="hidden min-h-[620px] flex-col justify-between bg-[#232b45] p-12 lg:flex">
            <div>
              <div className="mb-10 flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#ff4b56] to-[#ef223a] text-xl shadow-lg shadow-rose-950/30">
                  ◆
                </div>
                <div>
                  <div className="font-serif text-2xl font-bold">
                    Twilio LOA Employee Advocate
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Private, personalized leave guidance
                  </div>
                </div>
              </div>

              <h1 className="max-w-lg font-serif text-5xl font-bold leading-[1.08]">
                Your leave plan, made clear.
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
                Verify your profile to see a personalized lifecycle, pay
                estimate, documentation clock, return-to-work support, and benefit routing.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs text-[#F7F4F7]">
              {[
                ["◈", "Restricted Demo"],
                ["⌁", "Personalized plan"],
                ["♢", "PHI-Free Demo Data"],
              ].map(([icon, label]) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#38425E] bg-[#000D25]/40 p-4"
                >
                  <div className="mb-2 text-xl text-[#1B66EE]">{icon}</div>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="p-7 sm:p-10 lg:p-12">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#ef223a]">
                  ◆
                </div>
                <div className="font-serif text-xl font-bold">
                  Twilio LOA Advocate
                </div>
              </div>
            </div>

            <Badge tone="pink">Restricted Demo</Badge>

            <h2 className="mt-5 font-serif text-3xl font-bold">Welcome</h2>

            <p className="mt-2 text-sm leading-6 text-[#9AA0B4]">
              HTTPS encryption is enforced by the Twilio hosting platform
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
              <Field
                label="Username"
                value={form.username}
                onChange={(event) => update("username", event.target.value)}
                autoComplete="username"
                disabled={isLocked}
              />

              <Field
                label="Password"
                type="password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                autoComplete="current-password"
                disabled={isLocked}
              />

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                >
                  {error}
                </div>
              )}

              {isLocked && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Too many failed attempts. Please wait 30 seconds before retrying.
                </div>
              )}

              <button
                type="submit"
                disabled={isLocked}
                className="w-full rounded-xl bg-[#1B66EE] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1B66EE]/20 transition hover:bg-[#1B66EE]/90 focus:outline-none focus:ring-2 focus:ring-[#1B66EE]/30 disabled:cursor-not-allowed disabled:bg-[#656E87] disabled:opacity-70"
              >
                {isLocked ? "Access locked for 30 seconds" : "Continue to employee verification →"}
              </button>
            </form>

            <div className="mt-8 border-t border-[#38425E] pt-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9AA0B4]">
                Demo access control only. Production access must use authenticated server-side controls such as Twilio SSO.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function IdentityVerificationGate({ onVerify }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    employeeId: "",
  });
  const [error, setError] = useState("");

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const submit = (event) => {
    event.preventDefault();

    const employeeId = normalizeEmployeeId(form.employeeId);
    const hasConflict = CONFLICTED_EMPLOYEE_IDS.has(employeeId);

    if (hasConflict) {
      setError(CONFLICT_VERIFICATION_ERROR);
      return;
    }

    const profile = getVerifiedEmployeeProfile(
      form.firstName,
      form.lastName,
      employeeId
    );

    if (!profile) {
      setError(GENERIC_VERIFICATION_ERROR);
      return;
    }

    onVerify(profile);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0e1425] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_20%_15%,rgba(34,211,238,.13),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(239,34,58,.13),transparent_24%),radial-gradient(circle_at_65%_90%,rgba(139,92,246,.12),transparent_30%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-slate-700/80 bg-[#171e32] shadow-2xl lg:grid-cols-[1.05fr_.95fr]">
          <div className="hidden min-h-[620px] flex-col justify-between bg-[#232b45] p-12 lg:flex">
            <div>
              <div className="mb-10 flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#ff4b56] to-[#ef223a] text-xl shadow-lg shadow-rose-950/30">
                  ◆
                </div>
                <div>
                  <div className="font-serif text-2xl font-bold">
                    Twilio LOA Employee Advocate
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Private, personalized leave guidance
                  </div>
                </div>
              </div>

              <h1 className="max-w-lg font-serif text-5xl font-bold leading-[1.08]">
                Your leave plan, made clear.
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
                Verify your profile to see a personalized lifecycle, pay
                estimate, documentation clock, return-to-work support, and benefit routing.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-300">
              {[
                ["◈", "Three-field check"],
                ["⌁", "Personalized plan"],
                ["♢", "PHI-Free Demo Data"],
              ].map(([icon, label]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-600/60 bg-slate-950/20 p-4"
                >
                  <div className="mb-2 text-xl text-cyan-300">{icon}</div>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="p-7 sm:p-10 lg:p-12">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#ef223a]">
                  ◆
                </div>
                <div className="font-serif text-xl font-bold">
                  Twilio LOA Advocate
                </div>
              </div>
            </div>

            <Badge tone="pink">Employee Record Check</Badge>

            <h2 className="mt-5 font-serif text-3xl font-bold">Welcome</h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter all three fields exactly as shown in your employee record.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="First name"
                  value={form.firstName}
                  onChange={(event) =>
                    update("firstName", event.target.value)
                  }
                  autoComplete="given-name"
                />
                <Field
                  label="Last name"
                  value={form.lastName}
                  onChange={(event) => update("lastName", event.target.value)}
                  autoComplete="family-name"
                />
              </div>

              <Field
                label="Employee ID"
                value={form.employeeId}
                onChange={(event) =>
                  update(
                    "employeeId",
                    event.target.value.replace(/\D/g, "").slice(0, 8)
                  )
                }
                inputMode="numeric"
                autoComplete="off"
              />

              <p className="text-xs leading-5 text-[#9AA0B4]">
                If your source record contains only one name, enter that name as First Name and enter N/A as Last Name.
              </p>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-[#1B66EE] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1B66EE]/20 transition hover:bg-[#1B66EE]/90 focus:outline-none focus:ring-2 focus:ring-[#1B66EE]/30 disabled:cursor-not-allowed disabled:bg-[#656E87] disabled:opacity-70"
              >
                Verify & open my leave plan →
              </button>
            </form>

          </div>
        </div>
      </div>
    </main>
  );
}

function Header({ employee, onSignOut, onLockDemo, onOpenChat }) {
  return (
    <>
      <header className="app-header">
        <div className="app-header__row">
          <div className="app-brand">
            <div className="app-brand__mark" aria-hidden="true">
              ◆
            </div>

            <div className="app-brand__copy">
              <div className="app-brand__title-row">
                <h1 className="font-serif app-brand__title">
                  Twilio LOA Employee Advocate
                </h1>
                <Badge tone="pink">Internal Demo</Badge>
              </div>

              <p className="app-brand__subtitle">
                Personalized Leave Guidance, Pay Insights & Return-to-Work Support
              </p>
            </div>
          </div>

          <nav className="app-actions" aria-label="Employee Advocate actions">
            <button
              onClick={() => window.print()}
              className="app-button app-button--secondary"
            >
              <span aria-hidden="true">▣</span> Print Plan
            </button>

            <button
              onClick={onOpenChat}
              className="app-button app-button--primary"
            >
              <span aria-hidden="true">✦</span> Ask Advocate
            </button>

            <button
              onClick={onSignOut}
              className="app-button app-button--tertiary"
            >
              Switch Profile
            </button>

            <button
              onClick={onLockDemo}
              className="app-button app-button--danger"
            >
              Lock Demo
            </button>
          </nav>
        </div>

        <div className="app-profile-bar">
          <span className="app-profile-bar__status" aria-hidden="true">●</span>
          <strong>Verified Profile:</strong> {employee.firstName}{" "}
          {employee.lastName} <span className="text-[#9AA0B4]">|</span> ID:{" "}
          {employee.employeeId} <span className="text-[#9AA0B4]">|</span>{" "}
          Location: {getDisplayLocation(employee)}
        </div>
      </header>

      <div className="app-disclaimer">
        <div className="app-disclaimer__inner">
          <span>
            <strong className="text-[#F7F4F7]">ⓘ Disclaimer:</strong>{" "}
            Informational guidance and estimates only. Lincoln Financial and
            applicable agencies make official determinations.
          </span>
          <span className="shrink-0 text-[#1B66EE]">
            ♢ PHI-Free Demo Data
          </span>
        </div>
      </div>
    </>
  );
}

function SummaryCards({ employee }) {
  const pay = getEmployeePaySummary(employee);
  const duration = getEmployeeDurationSummary(employee);
  const status = getEmployeeStatusSummary(employee);
  const milestone = getEmployeeNextMilestone(employee);
  const cards = [
    {
      label: "Current Status",
      value: status.value,
      note: status.reasonDescription || TEXT_NOT_AVAILABLE,
      details: status.basis,
      statusDetails: status,
      icon: "▣",
      color: "cyan",
    },
    {
      label: "Total Planned Duration",
      value: duration.hasDuration
        ? `${duration.durationDays} Days (${duration.durationWeeks % 1 === 0 ? duration.durationWeeks : duration.durationWeeks.toFixed(1)} Weeks)`
        : TEXT_NOT_AVAILABLE,
      note: duration.hasDuration
        ? duration.dateRangeLabel
        : TEXT_NOT_AVAILABLE,
      context: duration.hasDuration ? duration.contextLabel : null,
      details: duration.hasDuration ? duration : null,
      icon: "⌛",
      color: "pink",
    },
    {
      label: "Next Milestone",
      value: milestone.hasMilestone ? milestone.label : TEXT_NOT_AVAILABLE,
      note: milestone.date || "Date to be confirmed",
      details: milestone.hasMilestone ? `${milestone.timing}${milestone.status === "overdue" ? " · Overdue" : ""} · ${milestone.basis}` : milestone.basis,
      icon: "✎",
      color: "amber",
    },
    {
      label: "Est. Biweekly Base Pay",
      value: pay.hasPayData ? money(pay.biweeklySalary) : PAY_UNAVAILABLE_MESSAGE,
      note: pay.hasPayData ? "Verified salary information" : PAY_UNAVAILABLE_MESSAGE,
      icon: "▦",
      color: "green",
    },
  ];

  const styles = {
    cyan: ["border-l-cyan-400", "text-cyan-300", "bg-cyan-400/10"],
    pink: ["border-l-rose-500", "text-rose-300", "bg-rose-400/10"],
    amber: ["border-l-amber-400", "text-amber-300", "bg-amber-400/10"],
    green: [
      "border-l-emerald-400",
      "text-emerald-300",
      "bg-emerald-400/10",
    ],
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const [border, text, background] = styles[card.color];

        return (
          <Panel
            key={card.label}
            className={`flex min-h-28 items-center justify-between border-l-4 ${border} p-5`}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {card.label}
              </p>
              <p
                className={`mt-1 truncate text-lg font-bold ${
                  card.color === "amber" || card.color === "green"
                    ? text
                    : "text-white"
                }`}
              >
                {card.value}
              </p>
              <p className={`mt-2 truncate text-xs ${text}`}>{card.note}</p>
              {card.context && <p className={`mt-1 truncate text-xs ${text}`}>{card.context}</p>}
              {card.details && card.label === "Total Planned Duration" && (
                <details className="mt-2 text-xs text-slate-400">
                  <summary className="cursor-pointer font-semibold text-slate-300">Duration details</summary>
                  <dl className="mt-2 space-y-1">
                    {[
                      ["Begin date", card.details.startDate],
                      [card.details.endDateLabel, card.details.endDate],
                      ["Leave type", card.details.leaveType],
                      ["Leave reason", card.details.leaveReason],
                      ["Current status", card.details.status],
                    ].filter(([, value]) => value).map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3">
                        <dt>{label}</dt>
                        <dd className="text-right text-slate-300">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </div>

            <div
              className={`ml-3 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${background} ${text}`}
            >
              {card.icon}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

function PriorityActions({ employee }) {
  const actions = getEmployeePriorityActions(employee);

  return (
    <Panel className="p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-bold">Your Top Priority Actions</h2>
            <p className="mt-2 text-sm text-slate-400">The most important steps based on your current leave information.</p>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {actions.map((item, index) => (
          <article key={item.id} className="flex min-w-0 flex-col rounded-xl border border-slate-700 bg-[#10172a] p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#EF223A] text-sm font-bold text-white">{index + 1}</span>
              <h3 className="pt-1 text-sm font-bold leading-5">{item.title}</h3>
            </div>
            <p className="mt-3 text-sm leading-5 text-slate-300">{item.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#9AA0B4]">{item.timing}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#656E87]">{item.basis}</p>
            {item.destination && <a className="mt-auto inline-flex pt-4 text-xs font-bold text-[#1B66EE] hover:text-[#72A5FF]" href={item.destination} target="_blank" rel="noreferrer">Open next step <span className="ml-1" aria-hidden="true">↗</span></a>}
          </article>
        ))}
      </div>
    </Panel>
  );
}

function LifecycleAlerts({ employee }) {
  const alerts = getEmployeeLifecycleAlerts(employee);
  if (!alerts.length) return null;
  return <section aria-labelledby="leave-alerts-heading" className="space-y-3"><h2 id="leave-alerts-heading" className="font-serif text-2xl font-bold">Important leave updates</h2>{alerts.map((alert) => <Panel key={alert.id} className={`border-l-4 ${alert.severity === "high" ? "border-l-rose-500" : "border-l-amber-400"} p-5`}><h3 className="text-base font-bold">{alert.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{alert.description}</p><a className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#1B66EE] px-4 py-2 text-sm font-bold text-white hover:bg-[#3D7FF2]" href={alert.destination} target="_blank" rel="noreferrer">{alert.actionLabel}<span className="ml-2" aria-hidden="true">↗</span></a></Panel>)}</section>;
}

function TabBar({ active, setActive }) {
  return (
    <nav
      className="grid overflow-hidden rounded-2xl border border-slate-700 bg-[#1a2035] p-1 md:grid-cols-3 xl:grid-cols-6"
      aria-label="Leave plan sections"
    >
      {TABS.map(([id, icon, label], index) => (
        <button
          key={id}
          onClick={() => setActive(id)}
          className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-3 py-3 text-center text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
            active === id
              ? "bg-gradient-to-r from-rose-500/20 to-violet-500/25 text-white shadow-inner ring-1 ring-rose-500/30"
              : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
          }`}
        >
          <span
            className={active === id ? "text-rose-300" : "text-cyan-300"}
          >
            {icon}
          </span>
          <span>
            {index + 1}. {label}
          </span>
        </button>
      ))}
    </nav>
  );
}

function LifecycleAccordion({ stage, isOpen, checked, onToggleStage, onToggleItem }) {
  const panelId = `lifecycle-panel-${stage.id}`;
  const completed = stage.items.filter((item) => checked[item.id]).length;
  const accents = {
    cyan: "border-l-cyan-400 text-cyan-300",
    amber: "border-l-amber-400 text-amber-300",
    violet: "border-l-violet-400 text-violet-300",
    green: "border-l-emerald-400 text-emerald-300",
  };

  return (
    <section className={`rounded-xl border border-slate-700 border-l-4 bg-[#0F1830]/90 ${accents[stage.accent].split(" ")[0]}`}>
      <h3>
        <button
          type="button"
          id={`${panelId}-header`}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${stage.title}`}
          onClick={() => onToggleStage(stage.id)}
          className="flex min-h-16 w-full items-center justify-between gap-4 p-4 text-left focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
        >
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-bold">{stage.number}. {stage.title}</span>
            <span className="text-xs text-slate-400">{stage.timeframe}</span>
            {stage.status === "suggested" && <Badge tone="green">Recommended for you</Badge>}
          </span>
          <span className="flex shrink-0 items-center gap-3 text-xs text-slate-400">
            <span>{completed} of {stage.items.length} reviewed</span>
            <span aria-hidden="true" className={`text-xl transition-transform ${isOpen ? "rotate-180" : ""}`}>⌄</span>
          </span>
        </button>
      </h3>
      {isOpen && (
        <div id={panelId} role="region" aria-labelledby={`${panelId}-heading`} className="border-t border-slate-700 p-4">
          <span id={`${panelId}-heading`} className="sr-only">{stage.title} details</span>
          <p className="text-sm leading-6 text-slate-300">{stage.description}</p>
          <p className="mt-2 text-xs text-slate-400">{stage.basis}</p>
          <div className="mt-3 space-y-1">
            {stage.items.map((item) => (
              <CheckItem key={item.id} checked={Boolean(checked[item.id])} onChange={() => onToggleItem(item.id)}>
                <span className="block font-semibold">{item.title}</span>
                <span className="mt-1 block text-slate-300">{item.description}</span>
                <span className="mt-2 block text-xs text-cyan-300">{item.timing}</span>
                {item.destination && <a href={item.destination} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-bold text-[#1B66EE] hover:text-[#72A5FF]">Open next step <span aria-hidden="true">↗</span></a>}
              </CheckItem>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function LifecycleOverview({ employee }) {
  const lifecycle = getEmployeeLifecycle(employee);
  const [openStages, setOpenStages] = useState(() => new Set([lifecycle.suggestedStageId || "pre-leave"]));
  const [checked, setChecked] = useState({});

  useEffect(() => {
    setOpenStages(new Set([lifecycle.suggestedStageId || "pre-leave"]));
    setChecked({});
  }, [employee?.employeeId]);

  const toggleStage = (id) => setOpenStages((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const setAllStages = (open) => setOpenStages(open ? new Set(lifecycle.stages.map((stage) => stage.id)) : new Set());
  const focusStage = (id) => {
    setOpenStages((current) => new Set(current).add(id));
    window.requestAnimationFrame(() => document.getElementById(`lifecycle-panel-${id}-header`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h2 className="font-serif text-2xl font-bold">Your Leave Journey</h2><p className="mt-1 text-sm text-slate-400">Review each stage and track your next steps.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setAllStages(true)} className="app-button app-button--secondary">Expand all</button><button type="button" onClick={() => setAllStages(false)} className="app-button app-button--tertiary">Collapse all</button></div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Lifecycle stages">
          {lifecycle.stages.map((stage) => <button type="button" key={stage.id} onClick={() => focusStage(stage.id)} className={`min-h-11 rounded-lg border px-3 py-2 text-left text-xs font-bold focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${stage.status === "suggested" ? "border-emerald-400/70 bg-emerald-400/10 text-emerald-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}><span className="block">{stage.number}. {stage.shortLabel}</span>{stage.status === "suggested" && <span className="mt-1 block text-[10px] font-normal">Recommended stage</span>}</button>)}
        </div>
        {!lifecycle.hasSuggestedStage && <p className="mt-3 text-xs text-slate-400">No current stage is identified. Stage 1 is open for orientation.</p>}
        <div className="mt-4 space-y-3">{lifecycle.stages.map((stage) => <LifecycleAccordion key={stage.id} stage={stage} isOpen={openStages.has(stage.id)} checked={checked} onToggleStage={toggleStage} onToggleItem={(id) => setChecked((current) => ({ ...current, [id]: !current[id] }))} />)}</div>
        <p className="mt-4 text-xs text-slate-400">Your checked items are saved only for this session and do not update Workday or Lincoln Financial.</p>
      </Panel>
      <div className="space-y-5">
        <Panel className="p-5"><div className="flex items-center justify-between gap-3"><h3 className="font-serif text-lg font-bold">Profile Snapshot</h3><Badge tone="green">Verified</Badge></div><dl className="mt-4 divide-y divide-slate-700/70 text-sm">{[["Leave type", safeText(employee?.leaveProduct, TEXT_NOT_AVAILABLE)],["Claim status", safeText(employee?.claimStatus, TEXT_NOT_AVAILABLE)],["Plan dates", `${safeText(employee?.startDate, TEXT_NOT_AVAILABLE)} — ${safeText(employee?.endDate, TEXT_NOT_AVAILABLE)}`],["Annual base salary", "Pay information is not available."]].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-6 py-3"><dt className="text-slate-400">{label}</dt><dd className="text-right font-semibold text-slate-100">{value}</dd></div>)}</dl></Panel>
      </div>
    </div>
  );
}

const PAY_DISCLAIMER = "Informational guidance based on the available Twilio policy and calculator rules. Pay and benefit amounts are estimates and may be affected by eligibility, plan maximums, state benefits, payroll timing, deductions, taxes, and applicable offsets. Lincoln Financial, Twilio Leave Operations, and the applicable government agency make the official claim, eligibility, and benefit determinations. This is not legal, tax, or medical advice.";

const displayDate = (value) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : TEXT_NOT_AVAILABLE;

function PayTimelineTab({ employee }) {
  const experience = getEmployeePayExperience(employee, { asOfDate: "2026-08-26" });
  return <><PayExperienceLayout experience={experience} /><StateStatutoryCard employee={employee} /></>;
}

function PayRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <dt className="text-slate-400">{label}</dt>
      <dd
        className={
          highlight
            ? "text-lg font-bold text-emerald-300"
            : "font-semibold text-slate-100"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function PayExperienceLayout({ experience }) {
  const isStd = experience.scenario === "std";
  const chartTotal = Number(experience.coordinatedTotal || experience.coordinatedPayTarget || 0);
  const segments = experience.components.filter((component) => component.amount > 0).map((component) => ({
    ...component,
    width: chartTotal > 0 ? Math.max(0, component.amount / chartTotal * 100) : 0,
    tone: component.label === "State benefit estimate" ? "bg-amber-400" : component.label === "Short-Term Disability estimate" ? "bg-blue-500" : "bg-rose-500",
  }));
  return (
    <div className="space-y-5">
      <Panel className="p-6 sm:p-7"><Badge tone="pink">Pay &amp; Timeline</Badge><h2 className="mt-4 font-serif text-3xl font-bold">Your Pay and Leave Timeline</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Review planning estimates for this pay period. Final amounts may vary.</p><div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">{experience.notice}</div></Panel>
      <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-5">
          <Panel className="p-6"><h3 className="font-serif text-xl font-bold">Pay Estimate Summary</h3><div className="mt-4 space-y-3">{experience.components.map((component) => <div key={component.label} className="border-b border-slate-700/70 pb-3 last:border-b-0"><div className="flex items-baseline justify-between gap-3"><span className="text-sm text-slate-300">{component.label}</span><strong>{money(component.amount)}</strong></div><div className="mt-1 text-xs font-semibold text-[#72A5FF]">Planning estimate</div></div>)}{experience.coordinatedPayTarget != null && <div className="border-t border-slate-600 pt-3"><div className="flex items-baseline justify-between gap-3"><span className="font-bold">Estimated coordinated pay</span><strong className="text-xl text-emerald-300">{money(experience.coordinatedPayTarget)}</strong></div><div className="mt-1 text-xs font-semibold text-[#72A5FF]">Planning estimate</div></div>}</div>{experience.payPeriod && <Panel className="p-6"><h3 className="font-serif text-xl font-bold">{experience.payPeriodLabel}</h3><p className="mt-2 text-sm text-slate-300">{experience.payPeriod.from} — {experience.payPeriod.through}</p></Panel>}{experience.missingInformation.length > 0 && <Panel className="p-6"><h3 className="font-serif text-xl font-bold">Information needed</h3><p className="mt-2 text-sm leading-6 text-slate-300">Some pay information is unavailable. Lincoln or Twilio Payroll can confirm the details.</p></Panel>}</Panel>
        </div>
        <div className="space-y-5">
          {isStd && experience.waitingPeriodGuidance && <Panel className="border-l-4 border-l-cyan-400 p-6"><h3 className="font-serif text-xl font-bold">First 7 Calendar Days</h3><Badge tone="cyan">Short-Term Disability waiting period</Badge><p className="mt-3 text-sm font-semibold text-cyan-200">100% salary-continuation planning assumption</p><div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-full rounded-full bg-cyan-400" /></div><p className="mt-4 text-sm leading-6 text-slate-300">{experience.waitingPeriodGuidance}</p></Panel>}
          {isStd && <Panel className="p-6"><h3 className="font-serif text-2xl font-bold">Estimated Pay Coordination</h3><p className="mt-1 text-sm text-slate-400">Planning estimates before taxes and deductions</p><h4 className="mt-5 font-bold text-slate-200">Day 8 and Later</h4>{chartTotal > 0 && <div className="mt-4 flex h-12 overflow-hidden rounded-lg border border-slate-700" role="img" aria-label={`Estimated pay coordination: ${segments.map((segment) => `${segment.label} ${money(segment.amount)}`).join(", ")}`}><div className="flex w-full">{segments.map((segment) => <div key={segment.label} className={`${segment.tone} flex items-center justify-center px-2 text-center text-xs font-bold text-white`} style={{ width: `${segment.width}%` }}>{segment.label}</div>)}</div></div>}<div className="mt-4 space-y-3 text-sm">{segments.map((segment) => <PayRow key={segment.label} label={segment.label} value={money(segment.amount)} />)}<div className="border-t border-slate-600 pt-3"><PayRow label="Estimated coordinated pay" value={money(experience.coordinatedPayTarget)} highlight /></div></div><p className="mt-4 text-xs leading-5 text-slate-400">{experience.formula}</p></Panel>}
          {experience.scenario === "parental" && <ParentalCoordinationCard experience={experience} />}
        </div>
      </div>
      <Panel className="p-6"><h3 className="font-serif text-xl font-bold">How your pay is delivered</h3><p className="mt-3 text-sm leading-6 text-slate-300">{experience.paymentDelivery}</p></Panel>
      {experience.stateAdjustment && <Panel className="p-6"><h3 className="font-serif text-xl font-bold">State benefit adjustment</h3><dl className="mt-4 space-y-3 text-sm"><PayRow label="Award status" value={experience.stateAdjustment.awardStatus} /><PayRow label="Estimated state benefit used" value={money(experience.stateAdjustment.estimatedStateBenefit)} /><PayRow label="State award reported" value={experience.stateAdjustment.stateAwardReported == null ? TEXT_NOT_AVAILABLE : money(experience.stateAdjustment.stateAwardReported)} /><PayRow label="Estimated adjustment" value={money(experience.stateAdjustment.estimatedAdjustment)} /></dl><p className="mt-4 text-sm leading-6 text-slate-300">The initial planning estimate may use the state program’s maximum benefit. After the award is reported, Lincoln can adjust the coordinated amount.</p></Panel>}
      <Panel className="p-6"><h3 className="font-serif text-xl font-bold">Pay and job protection are different</h3><p className="mt-3 text-sm leading-6 text-slate-300">{experience.jobProtectionGuidance}</p></Panel>
    </div>
  );
}

function ParentalCoordinationCard({ experience }) {
  const segments = experience.components.filter((component) => component.amount > 0);
  const total = Number(experience.coordinatedPayTarget || 0);
  return <Panel className="border-l-4 border-l-rose-500 p-6"><h3 className="font-serif text-2xl font-bold">Estimated Pay Coordination</h3><p className="mt-1 text-sm text-slate-400">Planning estimates before taxes and deductions</p><h4 className="mt-5 font-bold text-slate-200">Paid parental leave</h4><p className="mt-3 text-sm font-semibold text-rose-200">100% coordinated-pay planning estimate</p><div className="mt-4 flex h-12 overflow-hidden rounded-lg border border-slate-700" role="img" aria-label={`Paid parental leave coordination: ${segments.map((segment) => `${segment.label} ${money(segment.amount)}`).join(", ")}`}><div className="flex w-full">{segments.map((segment) => <div key={segment.label} className={`${segment.label === "State benefit estimate" ? "bg-amber-400" : "bg-rose-500"} flex items-center justify-center px-2 text-center text-xs font-bold text-white`} style={{ width: `${total > 0 ? segment.amount / total * 100 : 0}%` }}>{segment.label}</div>)}</div></div><div className="mt-4 space-y-3 text-sm">{segments.map((segment) => <PayRow key={segment.label} label={segment.label} value={money(segment.amount)} />)}<div className="border-t border-slate-600 pt-3"><PayRow label="Estimated coordinated pay" value={money(experience.coordinatedPayTarget)} highlight /></div></div></Panel>;
}

function StateProgramCapDetails({ experience }) {
  if (!experience.stateProgram) return null;
  return <Panel className="border-l-4 border-l-amber-400 p-6"><h3 className="font-serif text-xl font-bold">State disability program maximum</h3><p className="mt-2 text-sm text-slate-300">{experience.stateProgram.name} estimate</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-400">Weekly program maximum</dt><dd className="mt-1 font-bold">{money(experience.stateProgram.weeklyMaximum)}</dd></div><div><dt className="text-slate-400">Calculated maximum for this pay period</dt><dd className="mt-1 font-bold">{money(experience.stateProgram.calculatedMaximum)}</dd></div><div><dt className="text-slate-400">Covered days used</dt><dd className="mt-1 font-bold">{experience.stateProgram.eligibleDays}</dd></div></dl><div className="mt-3 text-xs font-semibold text-[#72A5FF]">Planning estimate</div></Panel>;
}

function TimelineCard({ tone, title, text }) {
  return (
    <Panel className="p-5">
      <Badge tone={tone}>{title}</Badge>
      <p className="mt-4 text-sm leading-6 text-slate-300">{text}</p>
    </Panel>
  );
}

function StateStatutoryCard({ employee }) {
  const experience = getStateCoordinationExperience(employee);
  return (
    <Panel className="p-5">
      <h3 className="font-serif text-lg font-bold">State Statutory Leave Coordination</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">State: <strong>{safeText(experience.stateCode, TEXT_NOT_AVAILABLE)}</strong></p>
      <dl className="mt-4 space-y-3 text-sm">
        {experience.programName && <PayRow label="Program" value={experience.programName} />}
        <PayRow label="Status" value={experience.statusLabel} />
        {experience.coveredLeaveLabel && <PayRow label="Covered leave type" value={experience.coveredLeaveLabel} />}
        {experience.weeklyMaximum != null && <PayRow label="Weekly maximum and year" value={`${money(experience.weeklyMaximum)} · ${experience.maximumYear}`} />}
        {experience.calculatedMaximum != null && <PayRow label="Calculated maximum for this pay period" value={money(experience.calculatedMaximum)} />}
        {experience.coveredDays != null && <PayRow label="Covered days used" value={experience.coveredDays} />}
        {experience.eligibilitySummary && <PayRow label="Basic eligibility information" value={experience.eligibilitySummary} />}
      </dl>
      <p className="mt-3 text-sm leading-6 text-slate-300">{experience.statusMessage}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{experience.administrationMessage}</p>
      {experience.officialProgramUrl && <a className="mt-4 inline-block text-sm font-semibold text-[#72A5FF] underline" href={experience.officialProgramUrl} target="_blank" rel="noreferrer">Official state program website <span aria-hidden="true">↗</span></a>}
      {experience.applicationAction && <a className="mt-4 ml-4 inline-block text-sm font-semibold text-[#72A5FF] underline" href={experience.applicationAction.url} target="_blank" rel="noreferrer">{experience.applicationAction.label} <span aria-hidden="true">↗</span></a>}
      <p className="mt-3 text-xs leading-5 text-slate-400">{experience.estimateExplanation}</p><p className="mt-3 text-xs leading-5 text-slate-400">{experience.awardExplanation}</p><p className="mt-3 text-xs leading-5 text-slate-400">{experience.concurrentLeaveExplanation}</p>
    </Panel>
  );
}

function PlanTab({ employee }) {
  const [week, setWeek] = useState(
    Math.min(3, employee.durationWeeks)
  );

  const progress = Math.max(
    2,
    Math.min(100, (week / employee.durationWeeks) * 100)
  );

  const phases = [
    {
      label: "Pre-leave",
      start: 0,
      width: 12,
      color: "bg-cyan-500",
    },
    {
      label: "EP · Days 1–7",
      start: 12,
      width: 10,
      color: "bg-amber-500",
    },
    {
      label: "Active leave",
      start: 22,
      width: 62,
      color: "bg-violet-500",
    },
    {
      label: "RTW",
      start: 84,
      width: 16,
      color: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-5">
      <Panel className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge tone="violet">Interactive timeline</Badge>
            <h2 className="mt-4 font-serif text-2xl font-bold">
              Legacy leave plan view
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {employee.startDate} — {employee.endDate} ·{" "}
              {employee.durationWeeks} planned weeks
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-5 py-3 text-center">
            <div className="text-xs uppercase tracking-wider text-slate-500">
              Selected point
            </div>
            <div className="mt-1 font-bold text-violet-300">
              Week {week}
            </div>
          </div>
        </div>

        <div className="mt-9 overflow-x-auto pb-3">
          <div className="min-w-[720px]">
            <div className="relative mb-4 h-28 rounded-2xl border border-slate-700 bg-[#10172a] p-4">
              <div className="relative h-full">
                {phases.map((phase) => (
                  <div
                    key={phase.label}
                    className={`absolute top-3 flex h-12 items-center justify-center rounded-lg px-2 text-center text-xs font-bold text-white ${phase.color}`}
                    style={{
                      left: `${phase.start}%`,
                      width: `calc(${phase.width}% - 6px)`,
                    }}
                  >
                    {phase.label}
                  </div>
                ))}

                <div
                  className="absolute bottom-0 top-0 z-10 w-0.5 bg-white shadow-[0_0_12px_white]"
                  style={{ left: `${progress}%` }}
                >
                  <span className="absolute -top-2 -translate-x-1/2 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-900">
                    YOU
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between text-xs text-slate-500">
              <span>Planning</span>
              <span>{employee.startDate}</span>
              <span>Midpoint</span>
              <span>{employee.endDate}</span>
            </div>
          </div>
        </div>

        <label
          className="mt-7 block text-xs font-bold uppercase tracking-wider text-slate-400"
          htmlFor="week"
        >
          Explore the plan by week
        </label>

        <input
          id="week"
          type="range"
          min="1"
          max={employee.durationWeeks}
          value={week}
          onChange={(event) => setWeek(Number(event.target.value))}
          className="mt-3 w-full accent-violet-500"
        />
      </Panel>

      <div className="grid gap-5 md:grid-cols-3">
        <TimelineCard
          tone="cyan"
          title="Now"
          text={
            week <= 1
              ? "Confirm intake and certification requirements."
              : "Review the currently selected leave week."
          }
        />
        <TimelineCard
          tone="amber"
          title="Next checkpoint"
          text={
            week < employee.durationWeeks - 1
              ? `Week ${Math.min(
                  week + 1,
                  employee.durationWeeks
                )}: check portal messages and pay coordination.`
              : "Confirm RTW clearance and access readiness."
          }
        />
        <TimelineCard
          tone="green"
          title="Return readiness"
          text="Connect with your manager before returning; use the optional workplace support section if adjustments may help."
        />
      </div>
    </div>
  );
}

const MY_LINCOLN_URL = "https://www.mylincolnportal.com/";

function ReturnToWorkTab({ employee }) {
  const experience = getEmployeeReturnToWorkExperience(employee, { asOfDate: "2026-08-27" });
  const [checked, setChecked] = useState({});
  const toggle = (id) => setChecked((current) => ({ ...current, [id]: !current[id] }));
  const displayDate = (value) => value ? formatReturnToWorkDate(value) : "Date to be confirmed";
  const hasNotice = experience.confirmationRequired || experience.viewId === "after-return";

  return (
    <div className="space-y-5">
      <Panel className="p-6">
        <Badge tone={experience.dateStatus === "Overdue" ? "amber" : "green"}>{experience.dateStatus}</Badge>
        <h2 className="mt-4 font-serif text-2xl font-bold">{experience.title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{experience.description}</p>
        <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-slate-700 pt-5 sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wider text-slate-400">Expected return date</dt><dd className="mt-1 font-bold text-cyan-300">{displayDate(experience.expectedReturnDate)}</dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-slate-400">Actual return date</dt><dd className="mt-1 font-bold">{displayDate(experience.actualReturnDate)}</dd></div>
        </dl>
      </Panel>
      {hasNotice && <Panel className="border-l-4 border-l-rose-500 p-5"><h3 className="font-bold">{experience.confirmationRequired ? "Please confirm your return date" : "Lincoln follow-up"}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{experience.confirmationRequired ? "Confirm or update your return date in MyLincoln Portal, then confirm it with your manager." : "Contact Lincoln if approval or closure remains unresolved."}</p><a className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-[#1B66EE] px-4 py-2 text-sm font-bold text-white" href={MY_LINCOLN_URL} target="_blank" rel="noreferrer">Open MyLincoln Portal <span className="ml-2" aria-hidden="true">↗</span></a></Panel>}
      {experience.actions.length > 0 && experience.viewId !== "not-yet" && <Panel className="p-6"><h3 className="font-serif text-2xl font-bold">{experience.title}</h3><p className="mt-1 text-sm text-slate-400">Complete the steps that apply to your return.</p><div className="mt-5 space-y-1">{experience.actions.map((action) => <CheckItem key={action.id} checked={Boolean(checked[action.id])} onChange={() => toggle(action.id)}><span>{action.text}</span>{action.destination && <a href={action.destination} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-bold text-[#72A5FF]">Open MyLincoln Portal ↗</a>}</CheckItem>)}</div></Panel>}
      {experience.flexReturn.show && <Panel className="border-l-4 border-l-violet-400 p-6"><h3 className="font-serif text-xl font-bold">FlexReturn</h3><p className="mt-2 text-sm leading-6 text-slate-300">{experience.flexReturn.message}</p><a className="mt-4 inline-flex text-sm font-bold text-[#72A5FF] underline" href={experience.flexReturn.learnMoreUrl} target="_blank" rel="noreferrer">Learn more about FlexReturn <span className="ml-2" aria-hidden="true">↗</span></a></Panel>}
      {experience.viewId === "after-return" && <Panel className="p-6"><h3 className="font-serif text-xl font-bold">Post-return survey</h3><p className="mt-2 text-sm text-slate-300">Complete the short post-return survey to share your experience.</p></Panel>}
      <WorkplaceSupportPanel employee={employee} />
    </div>
  );
}

function WorkplaceSupportPanel({ employee }) {
  const [reason, setReason] = useState(
    "Workplace schedule adjustment"
  );
  const [manager, setManager] = useState(employee.manager);
  const [copied, setCopied] = useState(false);

  const draft = `Subject: Request to begin the accommodation interactive process

Hi ${manager},

I’m requesting a conversation about a workplace accommodation related to ${reason.toLowerCase()}. I would like to begin the interactive process and discuss effective options that would help me perform the essential functions of my role.

My requested start date is [DATE]. I will provide any required supporting documentation through the approved confidential process and will not include medical details in this email.

Please contact Twilio Leave Operations or the accommodations team for next steps.

Best,
${employee.firstName} ${employee.lastName}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-700 bg-[#0F1830]/90 shadow-[0_16px_42px_rgba(0,13,37,.22)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="workplace-support-content"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
      >
        <span>
          <span className="block text-xs font-bold uppercase tracking-wider text-violet-300">Optional workplace support</span>
          <span className="mt-1 block font-serif text-xl font-bold">Need workplace adjustments?</span>
        </span>
        <span aria-hidden="true" className="text-xl text-cyan-300">{open ? "−" : "+"}</span>
      </button>
      {open && <div id="workplace-support-content" className="border-t border-slate-700 p-5">
        <p className="mb-5 text-sm leading-6 text-slate-400">
          Employees may explore workplace support if functional needs affect their return. Do not enter diagnosis or treatment information. Medical documentation belongs only in the authorized process; Twilio Leave Operations or the designated accommodations team owns the interactive process and official determination.
        </p>
        <div className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
      <Panel className="p-6">
        <Badge tone="violet">PHI-free builder</Badge>

        <h2 className="mt-4 font-serif text-2xl font-bold">
          ADA Request Draft
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Create a concise request to begin the interactive process. Keep
          diagnoses, treatment details, and documents out of email.
        </p>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              General reason
            </span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-[#10172a] px-4 py-3 text-sm text-white outline-none focus:border-violet-400"
            >
              <option>Workplace schedule adjustment</option>
              <option>Remote or hybrid work arrangement</option>
              <option>Ergonomic equipment or workspace change</option>
              <option>Intermittent time away from work</option>
              <option>Return-to-work restriction support</option>
              <option>Other work-related adjustment</option>
            </select>
          </label>

          <Field
            label="Manager"
            value={manager}
            onChange={(event) => setManager(event.target.value)}
          />

        </div>

        <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-xs leading-5 text-emerald-100">
          ✓ This draft avoids a diagnosis, symptoms, treatment details, claim
          numbers, and medical attachments.
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/40 px-5 py-4">
          <h3 className="font-bold">Draft preview</h3>
          <button
            onClick={copy}
            className="rounded-lg bg-violet-500 px-4 py-2 text-xs font-bold hover:bg-violet-400"
          >
            {copied ? "✓ Copied" : "Copy draft"}
          </button>
        </div>

        <pre className="min-h-[480px] whitespace-pre-wrap p-6 font-sans text-sm leading-7 text-slate-200">
          {draft}
        </pre>
      </Panel>
        </div>
      </div>}
    </section>
  );
}

function SupportResourcesTab({ onOpenReturnToWork }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openResources, setOpenResources] = useState(() => new Set());
  const categories = getSupportResourceCategories();
  const resources = filterSupportResources(selectedCategory);

  const toggleResource = (id) => setOpenResources((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="space-y-5">
      <Panel className="p-6 sm:p-7">
        <Badge tone="pink">Optional Support</Badge>
        <h2 className="mt-4 font-serif text-3xl font-bold">Support Resources</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Explore optional resources that may help during leave, caregiving, and return to work. Choose a category based on what you want to explore.</p>
        <p className="mt-3 text-xs text-slate-400">Your selections are not saved and do not update your leave record.</p>
      </Panel>

      <div className="-mx-1 overflow-x-auto px-1 pb-1" aria-label="Resource categories">
        <div className="flex min-w-max gap-2">
          {categories.map((category) => <button key={category.id} type="button" aria-pressed={selectedCategory === category.id} onClick={() => setSelectedCategory(category.id)} className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#72A5FF] ${selectedCategory === category.id ? "border-[#1B66EE] bg-[#1B66EE] text-white" : "border-[#38425E] bg-[#0F1830] text-[#9AA0B4] hover:border-[#1B66EE] hover:text-white"}`}>{category.label}</button>)}
        </div>
      </div>

      {resources.length === 0 ? <Panel className="p-6"><p className="text-sm text-slate-300">No resources are listed in this category in the current demo catalog.</p><button type="button" onClick={() => setSelectedCategory("all")} className="app-button app-button--secondary mt-4">View all resources</button></Panel> : <div className="grid gap-5 md:grid-cols-2">{resources.map((resource) => { const detailsId = `resource-details-${resource.id}`; const open = openResources.has(resource.id); return <Panel key={resource.id} className="flex h-full flex-col p-6"><div className="flex items-start justify-between gap-3"><Badge tone="cyan">Optional resource</Badge><span className="text-xs text-slate-400">{categories.find((category) => category.id === resource.category)?.label}</span></div><h3 className="mt-5 font-serif text-2xl font-bold">{resource.name}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{resource.summary}</p><div className="mt-4 rounded-lg border border-[#38425E] bg-[#10172a] p-3 text-sm text-slate-300"><strong className="text-white">May help with:</strong> {resource.bestFor}</div><dl className="mt-4 space-y-2 text-xs text-slate-400"><div className="flex justify-between gap-4"><dt>Owner</dt><dd className="text-right">{resource.owner}</dd></div><div className="flex justify-between gap-4"><dt>Access</dt><dd className="text-right">{resource.availabilityNote}</dd></div></dl><div className="mt-auto pt-5"><button type="button" aria-expanded={open} aria-controls={detailsId} onClick={() => toggleResource(resource.id)} className="min-h-11 text-sm font-bold text-[#72A5FF] underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#72A5FF]">{open ? "Hide access details" : "How to access"}</button>{open && <div id={detailsId} className="mt-3 border-t border-[#38425E] pt-3 text-xs leading-5 text-slate-400">{resource.destination ? <a href={resource.destination} target="_blank" rel="noreferrer" className="font-bold text-[#72A5FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#72A5FF]">{resource.accessLabel} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a> : <p>Confirm access instructions in current Twilio benefit materials.</p>}</div>}</div></Panel>; })}</div>}

      <Panel className="p-6"><h3 className="font-serif text-xl font-bold">Need help preparing to return?</h3><p className="mt-2 text-sm leading-6 text-slate-300">Use the Return to Work tab for RTW dates, access restoration, manager reintegration, phased-return planning, and workplace-support exploration.</p><button type="button" onClick={onOpenReturnToWork} className="app-button app-button--primary mt-4">Open Return to Work</button></Panel>
      <p className="rounded-lg border border-[#38425E] bg-[#10172a] p-4 text-xs leading-5 text-slate-300">Resources are presented for informational exploration. Availability, eligibility, services, and coverage may vary by location, health plan, employment status, and current vendor terms. Confirm current access details in Twilio benefit materials or with the applicable program administrator.</p>
    </div>
  );
}

function ChatTab({ employee }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hi ${employee.firstName} — I’ve verified your profile. I can help with the administrative information available in your leave record. What would help most?`,
    },
  ]);
  const [input, setInput] = useState("");

  const prompts = [
    "Explain my pay",
    "What should I do next?",
    "Check my claim status",
    "Help with return to work",
  ];

  const answer = (question) => {
    const q = String(question ?? "").toLowerCase();
    const claimStatus = safeText(employee?.claimStatus, TEXT_NOT_AVAILABLE);
    const leaveProduct = safeText(employee?.leaveProduct, "Leave product is not available in the source report.");
    const activeStage = safeText(employee?.activeStage, TEXT_NOT_AVAILABLE);
    const certStatus = safeText(employee?.certStatus, TEXT_NOT_AVAILABLE);
    const state = safeText(employee?.state, "");
    const stateExperience = getStateCoordinationExperience(employee);

    if (q.includes("pay") || q.includes("salary")) {
      return `Pay information is not available in this source report. The payroll team can confirm the latest pay and top-up guidance in the official source record.`;
    }

    if (q.includes("status") || q.includes("claim")) {
      return `The latest normalized status in this demo record is “${claimStatus}.” For the official live status, check MyLincoln Portal and your latest Lincoln email. Lincoln Financial owns the final claim determination.`;
    }

    if (q.includes("state") || q.includes("benefit")) {
      if (!stateExperience.programName) return `No state benefit estimate is included for ${state || "your location"}. Review the applicable state website or contact Lincoln Financial for guidance. Federal, state, and company leave may overlap, and each program makes its own official determination.`;
      return `${stateExperience.programName} may apply. ${stateExperience.administrationMessage} Review the official state program website for details. The displayed amount is a planning estimate. Federal, state, and company leave may overlap, and the state agency and Lincoln Financial make official determinations.`;
    }

    if (q.includes("next") || q.includes("do")) {
      return `Your active stage is ${activeStage}. Start by checking the Lifecycle To-Dos tab, reviewing any new Lincoln message, and confirming the timing with your manager without sharing medical details.`;
    }

    if (q.includes("return") || q.includes("rtw")) {
      return "Update your return date in MyLincoln Portal, contact Lincoln if you need an extension, confirm the date with your manager, and check system access on your first day back. Use workplace support if job-related adjustments may help.";
    }

    if (q.includes("cert") || q.includes("document")) {
      return `Your certification indicator is “${certStatus}.” Standard timing is Day 1 confirmation, specialist outreach on Days 2–5, and complete certification by calendar Day 15. A one-time 7-day grace period may apply only when incomplete documents are submitted on Days 13–15.`;
    }

    return `I can help with that at an informational level. Based on your verified profile, your leave product is ${leaveProduct} and your active stage is ${activeStage}. Ask me about pay, documents, status, next steps, or return-to-work planning.`;
  };

  const send = (text = input) => {
    const clean = text.trim();
    if (!clean) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: clean },
      { role: "assistant", text: answer(clean) },
    ]);
    setInput("");
  };

  return (
    <Panel className="mx-auto max-w-4xl overflow-hidden">
      <div className="flex items-center gap-4 border-b border-slate-700 bg-gradient-to-r from-violet-500/15 to-rose-500/10 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500 text-xl">
          ✦
        </div>

        <div>
          <h2 className="font-serif text-xl font-bold">
            AI Leave Advocate
          </h2>
          <p className="text-xs text-slate-400">
            Profile-aware, PHI-free informational guidance
          </p>
        </div>

        <span className="ml-auto h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" />
      </div>

      <div className="h-[460px] space-y-4 overflow-y-auto bg-[#11182a] p-5 sm:p-6">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user"
                  ? "rounded-br-md bg-gradient-to-r from-rose-500 to-pink-600 text-white"
                  : "rounded-bl-md border border-slate-700 bg-[#1a2035] text-slate-200"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700 bg-[#1a2035] p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => send(prompt)}
              className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-violet-400 hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your leave plan…"
            className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-[#10172a] px-4 py-3 text-sm text-white outline-none focus:border-violet-400"
          />

          <button className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold hover:bg-violet-400">
            Send
          </button>
        </form>

        <p className="mt-3 text-[11px] text-slate-500">
          Do not enter diagnoses, medical records, claim numbers, or other
          sensitive information.
        </p>
      </div>
    </Panel>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState("todos");
  const [showVerificationMessage, setShowVerificationMessage] = useState(true);

  const content = useMemo(() => {
    if (!employee) return null;
    if (activeTab === "payTimeline") return <PayTimelineTab employee={employee} />;
    if (activeTab === "rtw") return <ReturnToWorkTab employee={employee} />;
    if (activeTab === "resources") {
      return <SupportResourcesTab key={employee.employeeId} onOpenReturnToWork={() => setActiveTab("rtw")} />;
    }
    if (activeTab === "chat") return <ChatTab employee={employee} />;
    return <LifecycleOverview employee={employee} />;
  }, [activeTab, employee]);

  if (!isAuthenticated) {
    return (
      <>
        <PasswordGate onUnlock={() => setIsAuthenticated(true)} />
      </>
    );
  }

  if (!employee) {
    return (
      <>
        <IdentityVerificationGate
          onVerify={(profile) => {
            setEmployee(profile);
            setShowVerificationMessage(true);
          }}
        />
      </>
    );
  }

  return (
    <div className="app-shell min-h-screen text-white selection:bg-rose-500/40">
      <Header
        employee={employee}
        onSignOut={() => {
          setEmployee(null);
          setActiveTab("todos");
          setShowVerificationMessage(true);
        }}
        onLockDemo={() => {
          setEmployee(null);
          setActiveTab("todos");
          setShowVerificationMessage(true);
          setIsAuthenticated(false);
        }}
        onOpenChat={() => setActiveTab("chat")}
      />

      <main className="app-content mx-auto max-w-7xl space-y-6 px-5 py-6 sm:py-8">
        {showVerificationMessage && (
          <div role="status" aria-live="polite" className="flex items-start justify-between gap-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <span>{SUCCESS_STATUS_MESSAGE}</span>
            <button type="button" aria-label="Dismiss verification confirmation" onClick={() => setShowVerificationMessage(false)} className="shrink-0 rounded-md px-2 text-lg leading-5 text-emerald-100 hover:bg-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/60">×</button>
          </div>
        )}
        <PriorityActions employee={employee} />
        <LifecycleAlerts employee={employee} />
        <SummaryCards employee={employee} />
        <TabBar active={activeTab} setActive={setActiveTab} />
        {content}
      </main>

      <footer className="app-footer mt-10 border-t border-[#38425E] px-5 py-6 text-center text-xs text-[#9AA0B4]">
        Twilio LOA Employee Advocate · Internal demo · Informational support
        only
      </footer>
    </div>
  );
}
