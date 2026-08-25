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

const CONFLICTED_EMPLOYEE_IDS = new Set(
  CONFLICTING_EMPLOYEE_IDS.map((value) => normalizeEmployeeId(value))
);

const TEXT_NOT_AVAILABLE = "Not available in source report";

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
  ["pay", "$", "Pay & Top-Up Calc"],
  ["plan", "⌁", "Visual Leave Plan"],
  ["ada", "♿", "ADA Request Draft"],
  ["benefits", "♥", "Specialized Benefits"],
  ["chat", "✦", "AI Advocate Chat"],
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
                estimate, documentation clock, ADA draft, and benefit routing.
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
                estimate, documentation clock, ADA draft, and benefit routing.
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
      <header className="bg-[#0F1830] px-5 py-5 shadow-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ff5b52] to-[#ef223a] text-lg shadow-lg">
              ◆
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-xl font-bold sm:text-2xl">
                  Twilio LOA Employee Advocate
                </h1>
                <Badge tone="pink">Internal Demo</Badge>
              </div>

              <p className="mt-0.5 text-xs text-[#9AA0B4] sm:text-sm">
                Empathetic Leave Guidance, Salary Top-Up Calculator & ADA
                Interactive Assistant
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-[#38425E] bg-[#000D25] px-4 py-2 text-sm font-semibold text-[#F7F4F7] hover:bg-[#1B66EE]/10"
            >
              ▣ Print Plan
            </button>

            <button
              onClick={onOpenChat}
              className="rounded-lg bg-[#1B66EE] px-4 py-2 text-sm font-bold text-white hover:bg-[#1B66EE]/90"
            >
              ✦ AI Leave Advisor
            </button>

            <button
              onClick={onSignOut}
              className="rounded-lg border border-[#38425E] px-4 py-2 text-sm text-[#F7F4F7] hover:bg-[#1B66EE]/10"
            >
              Switch profile
            </button>

            <button
              onClick={onLockDemo}
              className="rounded-lg border border-[#EF223A]/40 bg-[#EF223A]/10 px-4 py-2 text-sm font-semibold text-[#F7F4F7] hover:bg-[#EF223A]/15"
            >
              Lock demo
            </button>
          </div>
        </div>

        <div className="mx-auto mt-5 max-w-7xl rounded-xl border border-[#38425E] bg-[#000D25]/60 px-4 py-3 text-sm text-[#F7F4F7]">
          <span className="mr-2 text-[#1B66EE]">●</span>
          <strong>Verified Profile:</strong> {employee.firstName}{" "}
          {employee.lastName} <span className="text-[#9AA0B4]">|</span> ID:{" "}
          {employee.employeeId} <span className="text-[#9AA0B4]">|</span>{" "}
          Location: {getDisplayLocation(employee)}
        </div>
      </header>

      <div className="border-y border-[#38425E] bg-[#0F1830] px-5 py-2.5 text-xs text-[#9AA0B4]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-1 sm:flex-row">
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
  const cards = [
    {
      label: "Current Report Status",
      value: safeText(employee?.currentReportStatus, TEXT_NOT_AVAILABLE),
      note: safeText(employee?.stageNote, TEXT_NOT_AVAILABLE),
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
      label: "Certification / Approval Status",
      value: safeText(employee?.certStatus, TEXT_NOT_AVAILABLE),
      note: "Check Gmail / MyLincoln Portal",
      icon: "✎",
      color: "amber",
    },
    {
      label: "Est. Biweekly Base Pay",
      value: pay.hasPayData ? money(pay.biweeklySalary) : PAY_UNAVAILABLE_MESSAGE,
      note: pay.hasPayData ? "Verified ATP salary input" : PAY_UNAVAILABLE_MESSAGE,
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
              {card.details && (
                <details className="mt-2 text-xs text-slate-400">
                  <summary className="cursor-pointer font-semibold text-slate-300">Duration details</summary>
                  <dl className="mt-2 space-y-1">
                    {[
                      ["Source report", card.details.sourceSheet],
                      ["Begin date", card.details.startDate],
                      [card.details.endDateLabel, card.details.endDate],
                      ["Calculation", card.details.calculationMethod],
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

function Responsibility({ title, tone, items, contact }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#10172a] p-4">
      <h4
        className={`text-xs font-bold uppercase tracking-wider ${
          tone === "cyan" ? "text-cyan-300" : "text-rose-300"
        }`}
      >
        {title}
      </h4>

      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>

      <div className="mt-4 border-t border-slate-700/70 pt-3 text-xs text-slate-400">
        {contact}
      </div>
    </div>
  );
}

function TodosTab({ employee }) {
  const [stage, setStage] = useState("all");
  const [checked, setChecked] = useState({});

  const toggle = (id) =>
    setChecked((current) => ({ ...current, [id]: !current[id] }));

  const leaveProductText = safeText(employee?.leaveProduct);
  const stages = [
    {
      id: "pre",
      title: "Stage 1: Pre-Leave Planning",
      subtitle: "Milestone & Administrative Setup",
      timing: "30–60 days prior",
      tone: "cyan",
      items: [
        "File the formal leave intake with Lincoln Financial through MyLincoln Portal or 800-377-1568.",
        leaveProductText
          ? `Confirm the leave product shown on file: ${leaveProductText}.`
          : "Leave product is not available in the source report.",
        "Notify your manager and HRBP of the expected start date and business handoff timeline—no medical details needed.",
        "Set Workday and Ramp delegations and prepare your out-of-office message.",
      ],
    },
    {
      id: "med",
      title: "Stage 2: Medical Documentation",
      subtitle: "Lincoln Financial Certification Tracking",
      timing: "15 calendar-day deadline",
      tone: "amber",
      items: [
        "Day 1: Confirm the intake acknowledgment reached your email.",
        "Days 2–5: Watch for the specialist call and COM01/COM02 correspondence.",
        "Upload complete certification by Day 15; confirm receipt in the portal.",
        "If incomplete documents were submitted on Days 13–15, verify whether the one-time 7-day grace period applies.",
      ],
    },
    {
      id: "handoff",
      title: "Stage 3: Three-Day Handoff",
      subtitle: "Final Business Readiness",
      timing: "3 days before leave",
      tone: "violet",
      items: [
        "Confirm project owners, escalation contacts, and manager coverage.",
        "Verify Workday and Ramp delegation activation dates.",
        "Schedule out-of-office notifications without medical or claim details.",
      ],
    },
    {
      id: "return",
      title: "Stage 4: Welcome Back & RTW",
      subtitle: "Return-to-Work Readiness",
      timing: "Before return",
      tone: "green",
      items: [
        "Confirm Lincoln has your release to return, when required.",
        "Coordinate access restoration, calendar reset, and a phased hand-back with your manager.",
        "If restrictions remain, use the ADA draft tab to request an interactive-process conversation.",
      ],
    },
  ];

  const visible =
    stage === "all" ? stages : stages.filter((item) => item.id === stage);

  return (
    <div className="space-y-5">
      <Panel className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold">
            📍 Interactive Leave Lifecycle Journey
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Filter the checklist by stage and mark completed tasks locally.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ["all", "All Stages"],
            ["pre", "1. Pre-Leave"],
            ["med", "2. Med Cert"],
            ["handoff", "3. Handoff"],
            ["return", "4. RTW"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setStage(id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                stage === id
                  ? "bg-rose-500 text-white"
                  : "border border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-5">
          {visible.map((item) => (
            <Panel
              key={item.id}
              className={`border-l-4 p-5 ${
                item.tone === "cyan"
                  ? "border-l-cyan-400"
                  : item.tone === "amber"
                    ? "border-l-amber-400"
                    : item.tone === "violet"
                      ? "border-l-violet-400"
                      : "border-l-emerald-400"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge tone={item.tone}>{item.title}</Badge>
                <span className="text-xs text-slate-400">
                  ◷ {item.timing}
                </span>
              </div>

              <h3 className="mt-4 text-base font-bold">{item.subtitle}</h3>

              <div className="mt-3">
                {item.items.map((text, index) => {
                  const id = `${item.id}-${index}`;

                  return (
                    <CheckItem
                      key={id}
                      checked={Boolean(checked[id])}
                      onChange={() => toggle(id)}
                      accent={item.tone}
                    >
                      {text}
                    </CheckItem>
                  );
                })}
              </div>
            </Panel>
          ))}
        </div>

        <div className="space-y-5">
          <Panel className="p-5">
            <h3 className="font-serif text-lg font-bold">
              ♟ Administration Responsibility Matrix
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Who owns each part of your leave experience.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Responsibility
                title="Lincoln Financial"
                tone="cyan"
                items={[
                  "Claim intake and certification review",
                  "Eligibility and claim decisions",
                  "Disability benefit calculation",
                  "Case manager communications",
                ]}
                contact="800-377-1568 · MyLincoln Portal"
              />

              <Responsibility
                title="Twilio Internal Ops"
                tone="pink"
                items={[
                  "Salary top-up on payroll",
                  "Workday leave-status updates",
                  "Ramp and system access delegation",
                  "RTW and accommodation coordination",
                ]}
                contact="leave-ops@twilio.com"
              />
            </div>
          </Panel>

          <Panel className="p-5">
            <h3 className="font-serif text-lg font-bold">
              🏛 State Statutory Leave Coordination
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Your location on file is <strong>{getDisplayLocation(employee)}</strong>. Any
              state-paid benefit is generally coordinated as an offset, with
              Twilio paying the eligible remaining difference on regular
              payroll dates.
            </p>

            <div className="mt-4 rounded-xl bg-[#10172a] p-4 text-sm text-slate-300">
              <span className="text-emerald-300">♢</span>{" "}
              <strong>Goal:</strong> coordinate eligible benefits toward 100%
              of base pay without duplicating payments.
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif text-lg font-bold">Profile Snapshot</h3>
              <Badge tone="green">Verified</Badge>
            </div>

            <dl className="mt-4 divide-y divide-slate-700/70 text-sm">
              {[
                ["Leave product", safeText(employee?.leaveProduct, TEXT_NOT_AVAILABLE)],
                ["Claim status", safeText(employee?.claimStatus, TEXT_NOT_AVAILABLE)],
                [
                  "Plan dates",
                  `${safeText(employee?.startDate, TEXT_NOT_AVAILABLE)} — ${safeText(employee?.endDate, TEXT_NOT_AVAILABLE)}`,
                ],
                ["Annual base salary", "Pay information is not available in this source report."],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-6 py-3"
                >
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-right font-semibold text-slate-100">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
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

function PayTab({ employee }) {
  const pay = getEmployeePaySummary(employee);

  if (!pay.hasPayData) {
    return (
      <Panel className="p-6">
        <Badge tone="amber">Pay record unavailable</Badge>
        <h2 className="mt-4 font-serif text-2xl font-bold">Pay & Top-Up Calculator</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          {PAY_UNAVAILABLE_MESSAGE}
        </p>
      </Panel>
    );
  }

  const [offset, setOffset] = useState(Number(employee.stateOffset ?? 0));
  const annualSalary = Number(employee.annualSalary ?? 0);
  const biweeklySalary = pay.biweeklySalary;
  const daily = biweeklySalary / 10;
  const epPay = daily * 5;
  const disability = biweeklySalary * 0.6667;
  const topUp = biweeklySalary - disability;
  const netDisability = Math.max(
    0,
    disability - Number(offset || 0)
  );
  const coordinated =
    netDisability + topUp + Number(offset || 0);

  return (
    <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <div className="space-y-5">
        <Panel className="p-6">
          <Badge tone="green">Verified salary input</Badge>

          <h2 className="mt-4 font-serif text-2xl font-bold">
            Pay & Top-Up Calculator
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Transparent estimates based on {employee.firstName}’s salary
            record. Taxes, deductions, eligibility, and agency awards can
            change final pay.
          </p>

          <dl className="mt-6 space-y-3">
            <PayRow
              label="Annual base salary"
              value={employee.annualSalary == null ? "Not available in source report" : money(employee.annualSalary)}
            />
            <PayRow
              label="Biweekly base salary"
              value={money(pay.biweeklySalary)}
              highlight
            />
            <PayRow
              label="ATP calculated salary amount (source)"
              value={pay.payableCalculatedSalaryAmount == null ? "Not available in source report" : money(pay.payableCalculatedSalaryAmount)}
            />
            <PayRow label="ATP product (source)" value={safeText(pay.product, "Not available in source report")} />
            <PayRow label="ATP pay code (source)" value={safeText(pay.payCode, "Not available in source report")} />
            <PayRow
              label="ATP benefit gross amount (source)"
              value={pay.benefitGrossAmount == null ? "Not available in source report" : money(pay.benefitGrossAmount)}
            />
            <PayRow
              label="ATP total offsets (source)"
              value={pay.totalOffsets == null ? "Not available in source report" : money(pay.totalOffsets)}
            />
            <PayRow
              label="ATP payable benefit percentage (source)"
              value={pay.payableBenefitPercentage == null ? "Not available in source report" : `${pay.payableBenefitPercentage}%`}
            />
            <PayRow
              label="ATP pay period (source)"
              value={pay.payPeriodFromDate && pay.payPeriodThroughDate ? `${pay.payPeriodFromDate} — ${pay.payPeriodThroughDate}` : "Not available in source report"}
            />
            <PayRow
              label="Estimated daily base rate"
              value={money(daily)}
            />
          </dl>
        </Panel>

        <Panel className="p-6">
          <label
            className="block text-xs font-bold uppercase tracking-wider text-slate-400"
            htmlFor="offset"
          >
            Estimated state benefit offset
          </label>

          <div className="mt-3 flex rounded-xl border border-slate-600 bg-[#10172a] focus-within:border-cyan-400">
            <span className="px-4 py-3 text-slate-500">$</span>
            <input
              id="offset"
              type="number"
              min="0"
              step="0.01"
              value={offset}
              onChange={(event) => setOffset(event.target.value)}
              className="w-full bg-transparent py-3 pr-4 text-white outline-none"
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Enter the award expected for the same biweekly period. This is an
            offset, not extra pay.
          </p>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="border-b border-slate-700 bg-slate-800/40 p-5">
          <h3 className="font-serif text-xl font-bold">
            Estimated Pay Coordination
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Illustrative gross amounts before taxes and deductions
          </p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/[.05] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone="cyan">
                Days 1–7 · Elimination Period
              </Badge>
              <strong className="text-cyan-300">100% protected</strong>
            </div>

            <p className="mt-3 text-sm text-slate-300">
              Twilio income protection covers the first seven calendar days.
              The estimate below uses five scheduled workdays.
            </p>

            <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400" />
            </div>

            <div className="mt-3 flex justify-between text-sm">
              <span className="text-slate-400">Estimated EP pay</span>
              <strong>{money(epPay)}</strong>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-400/25 bg-violet-400/[.05] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone="violet">Day 8+ · Coordinated Pay</Badge>
              <strong className="text-violet-300">100% target</strong>
            </div>

            <div className="mt-5 overflow-hidden rounded-full bg-slate-800 sm:flex">
              <div className="bg-violet-500 px-3 py-2 text-center text-xs font-bold sm:w-2/3">
                66.67% STD
              </div>
              <div className="bg-rose-500 px-3 py-2 text-center text-xs font-bold sm:w-1/3">
                33.33% top-up
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <PayRow
                label="Gross STD component (66.67%)"
                value={money(disability)}
              />
              <PayRow
                label={`Less ${employee.state} state offset`}
                value={`− ${money(offset)}`}
              />
              <PayRow
                label="Net carrier-funded component"
                value={money(netDisability)}
              />
              <PayRow
                label="Estimated top-up component (33.33%)"
                value={money(topUp)}
              />

              <div className="border-t border-slate-600 pt-3">
                <PayRow
                  label="Coordinated biweekly estimate"
                  value={money(coordinated)}
                  highlight
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-xs leading-5 text-amber-100">
            ⚠ Estimates are informational. Lincoln Financial owns claim
            calculations; government agencies own statutory awards; payroll
            deductions and taxes are not shown.
          </div>
        </div>
      </Panel>
    </div>
  );
}

function TimelineCard({ tone, title, text }) {
  return (
    <Panel className="p-5">
      <Badge tone={tone}>{title}</Badge>
      <p className="mt-4 text-sm leading-6 text-slate-300">{text}</p>
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
              Visual Leave Plan
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
          text="Connect with your manager before returning; use the ADA tab if restrictions remain."
        />
      </div>
    </div>
  );
}

function AdaTab({ employee }) {
  const [reason, setReason] = useState(
    "Workplace schedule adjustment"
  );
  const [manager, setManager] = useState(employee.manager);
  const [hrbp, setHrbp] = useState(employee.hrbp);
  const [copied, setCopied] = useState(false);

  const draft = `Subject: Request to begin the accommodation interactive process

Hi ${manager},

I’m requesting a conversation about a workplace accommodation related to ${reason.toLowerCase()}. I would like to begin the interactive process and discuss effective options that would help me perform the essential functions of my role.

My requested start date is [DATE]. I will provide any required supporting documentation through the approved confidential process and will not include medical details in this email.

Please include ${hrbp} as appropriate. Thank you for partnering with me on next steps.

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

  return (
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

          <Field
            label="HRBP"
            value={hrbp}
            onChange={(event) => setHrbp(event.target.value)}
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
  );
}

function BenefitsTab({ employee }) {
  const benefits = [
    {
      name: "Lyra",
      icon: "◌",
      tone: "cyan",
      description: "Confidential mental health coaching and therapy support for you and eligible dependents.",
      action: "Explore mental health support",
      best: "Stress, anxiety, caregiving, transitions",
    },
    {
      name: "Hinge Health",
      icon: "⌁",
      tone: "green",
      description: "Digital musculoskeletal care and guided exercise support for back, joint, and mobility needs.",
      action: "Explore MSK support",
      best: "Back, neck, joint, and mobility support",
    },
    {
      name: "Transform Oncology",
      icon: "✦",
      tone: "pink",
      description: "Navigation support for employees and families facing a cancer diagnosis or treatment journey.",
      action: "Explore oncology navigation",
      best: "Care navigation and second-opinion support",
    },
    {
      name: "Cleo",
      icon: "♥",
      tone: "violet",
      description: "Family support for pregnancy, parenting, caregiving, and major family transitions.",
      action: "Explore family support",
      best: "Parenthood and caregiving",
    },
  ];

  const leaveReasonText = safeText(employee?.leaveReason);
  const safeLeaveReason = leaveReasonText || "leave plan";

  return (
    <div className="space-y-5">
      <Panel className="p-6">
        <Badge tone="pink">Personalized routing</Badge>
        <h2 className="mt-4 font-serif text-2xl font-bold">
          Specialized Benefits
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Optional resources that may complement your {safeLeaveReason} plan. Eligibility and availability vary by benefit enrollment and location.
        </p>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        {benefits.map((benefit) => (
          <Panel key={benefit.name} className="group p-6 transition hover:-translate-y-1 hover:border-slate-500">
            <div className="flex items-start justify-between">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl text-xl ${benefit.tone === "cyan" ? "bg-cyan-400/10 text-cyan-300" : benefit.tone === "green" ? "bg-emerald-400/10 text-emerald-300" : benefit.tone === "pink" ? "bg-rose-400/10 text-rose-300" : "bg-violet-400/10 text-violet-300"}`}>
                {benefit.icon}
              </div>
              <Badge tone={benefit.tone}>Available resource</Badge>
            </div>

            <h3 className="mt-5 font-serif text-xl font-bold">{benefit.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{benefit.description}</p>

            <div className="mt-4 rounded-xl bg-slate-900/45 p-3 text-xs text-slate-300">
              <strong className="text-white">Best for:</strong> {benefit.best}
            </div>

            <button className="mt-5 text-sm font-bold text-cyan-300 hover:text-cyan-200">
              {benefit.action} →
            </button>
          </Panel>
        ))}
      </div>
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

    if (q.includes("pay") || q.includes("salary")) {
      return `Pay information is not available in this source report. The payroll team can confirm the latest pay and top-up guidance in the official source record.`;
    }

    if (q.includes("status") || q.includes("claim")) {
      return `The latest normalized status in this demo record is “${claimStatus}.” For the official live status, check MyLincoln Portal and your latest Lincoln email. Lincoln Financial owns the final claim determination.`;
    }

    if (q.includes("next") || q.includes("do")) {
      return `Your active stage is ${activeStage}. Start by checking the Lifecycle To-Dos tab, reviewing any new Lincoln message, and confirming that your manager and HRBP know the timing without sharing medical details.`;
    }

    if (q.includes("return") || q.includes("rtw")) {
      return "Before returning, confirm whether Lincoln requires a release, align your return date with your manager, and verify system access. If restrictions remain, use the ADA Request Draft tab to begin a PHI-free interactive-process conversation.";
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

  const content = useMemo(() => {
    if (!employee) return null;
    if (activeTab === "pay") return <PayTab employee={employee} />;
    if (activeTab === "plan") return <PlanTab employee={employee} />;
    if (activeTab === "ada") return <AdaTab employee={employee} />;
    if (activeTab === "benefits") {
      return <BenefitsTab employee={employee} />;
    }
    if (activeTab === "chat") return <ChatTab employee={employee} />;
    return <TodosTab employee={employee} />;
  }, [activeTab, employee]);

  if (!isAuthenticated) {
    return (
      <>
        <AppStyles />
        <PasswordGate onUnlock={() => setIsAuthenticated(true)} />
      </>
    );
  }

  if (!employee) {
    return (
      <>
        <AppStyles />
        <IdentityVerificationGate onVerify={setEmployee} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1425] text-white selection:bg-rose-500/40">
      <AppStyles />

      <Header
        employee={employee}
        onSignOut={() => {
          setEmployee(null);
          setActiveTab("todos");
        }}
        onLockDemo={() => {
          setEmployee(null);
          setActiveTab("todos");
          setIsAuthenticated(false);
        }}
        onOpenChat={() => setActiveTab("chat")}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-6 sm:py-8">
        <p role="status" aria-live="polite" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {SUCCESS_STATUS_MESSAGE}
        </p>
        <SummaryCards employee={employee} />
        <TabBar active={activeTab} setActive={setActiveTab} />
        {content}
      </main>

      <footer className="mt-10 border-t border-[#38425E] px-5 py-6 text-center text-xs text-[#9AA0B4]">
        Twilio LOA Employee Advocate · Internal demo · Informational support
        only
      </footer>
    </div>
  );
}

function AppStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');

      :root {
        color-scheme: dark;
        --navy: #000D25;
        --navy-surface: #0F1830;
        --border: #38425E;
        --muted: #9AA0B4;
        --disabled: #656E87;
        --blue: #1B66EE;
        --red: #EF223A;
        --text: #FFFFFF;
        --surface-text: #F7F4F7;
      }

      html {
        scroll-behavior: smooth;
        background: var(--navy);
      }

      body {
        margin: 0;
        background: var(--navy);
        color: var(--text);
        font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
      }

      #root {
        min-height: 100vh;
        background: var(--navy);
      }

      .font-serif {
        font-family: 'DM Serif Display', Georgia, serif !important;
      }

      * {
        box-sizing: border-box;
      }

      button,
      input,
      select,
      textarea {
        font: inherit;
      }

      button:focus-visible,
      input:focus-visible,
      select:focus-visible,
      textarea:focus-visible {
        outline: 2px solid var(--blue);
        outline-offset: 2px;
        box-shadow: 0 0 0 3px rgba(27, 102, 238, 0.18);
      }

      .border-slate-700,
      .border-slate-700\/80,
      .border-slate-700\/90,
      .border-slate-700\/70,
      .border-slate-600,
      .border-slate-600\/60,
      .border-slate-800,
      .border-slate-800\/40,
      .border-slate-800\/50 {
        border-color: var(--border) !important;
      }

      .bg-\[#0e1425\],
      .bg-\[#000D25\],
      .bg-\[#10172a\],
      .bg-\[#1a2035\],
      .bg-\[#171e32\],
      .bg-\[#232b45\],
      .bg-slate-900,
      .bg-slate-900\/45,
      .bg-slate-950,
      .bg-slate-950\/25,
      .bg-slate-800,
      .bg-slate-800\/40,
      .bg-slate-800\/50 {
        background-color: var(--navy) !important;
      }

      .text-slate-100,
      .text-slate-200,
      .text-slate-300 {
        color: var(--surface-text) !important;
      }

      .text-slate-400,
      .text-slate-500 {
        color: var(--muted) !important;
      }

      .text-slate-600 {
        color: var(--disabled) !important;
      }

      .bg-\[#0F1830\],
      .bg-\[#0f1830\],
      .bg-\[#0F1830\]\/90,
      .bg-\[#0F1830\]\/80,
      .bg-\[#0F1830\]\/60,
      .bg-\[#0F1830\]\/40 {
        background-color: var(--navy-surface) !important;
      }

      .bg-gradient-to-r {
        background-image: none !important;
      }

      @media print {
        nav,
        button,
        footer {
          display: none !important;
        }

        body,
        main,
        section,
        header,
        div {
          color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    `}</style>
  );
}
