import React, { useEffect, useMemo, useState } from "react";

const EMPLOYEES = [
  {
    firstName: "Buzz",
    lastName: "Lightyear",
    employeeId: "839201",
    annualSalary: 157650.66,
    biweeklySalary: 6063.49,
    location: "Remote — USA — Denver, CO",
    state: "CO",
    leaveProduct: "STD / Own Medical",
    leaveReason: "Own medical condition",
    claimStatus: "Closed — coordinated claim",
    activeStage: "Welcome Back & RTW",
    stageNote: "Claim closed",
    durationWeeks: 9,
    startDate: "Jul 22, 2026",
    endDate: "Sep 22, 2026",
    certStatus: "Complete",
    stateOffset: 0,
    manager: "Alex Morgan",
    hrbp: "Jordan Lee",
  },
  {
    firstName: "Robin",
    lastName: "Christopher",
    employeeId: "293877",
    annualSalary: 239700,
    biweeklySalary: 9219.23,
    location: "Remote — USA",
    state: "US",
    leaveProduct: "STDCP / Company Parental",
    leaveReason: "Parental leave",
    claimStatus: "Approved through Aug 23, 2026",
    activeStage: "Active Leave",
    stageNote: "Benefits in pay",
    durationWeeks: 36,
    startDate: "Dec 10, 2025",
    endDate: "Aug 23, 2026",
    certStatus: "Complete",
    stateOffset: 0,
    manager: "Avery Chen",
    hrbp: "Jordan Lee",
  },
  {
    firstName: "Mickey",
    lastName: "Mouse",
    employeeId: "100865",
    annualSalary: 328418.43,
    biweeklySalary: 12631.48,
    location: "Remote — USA — New Jersey",
    state: "NJ",
    leaveProduct: "STDCP / Company Parental",
    leaveReason: "Baby bonding",
    claimStatus: "Closed — returned to work",
    activeStage: "Welcome Back & RTW",
    stageNote: "Returned to work",
    durationWeeks: 52,
    startDate: "Aug 17, 2025",
    endDate: "Aug 16, 2026",
    certStatus: "Complete",
    stateOffset: 3530,
    manager: "Casey Rivera",
    hrbp: "Morgan Taylor",
  },
  {
    firstName: "Tinker",
    lastName: "Bell",
    employeeId: "582970",
    annualSalary: 155000,
    biweeklySalary: 5961.54,
    location: "Remote — USA — Pennsylvania",
    state: "PA",
    leaveProduct: "STD + PLCOB / Medical Leave",
    leaveReason: "Medical leave",
    claimStatus: "Pended — review in progress",
    activeStage: "Medical Documentation",
    stageNote: "Action may be needed",
    durationWeeks: 11,
    startDate: "May 30, 2026",
    endDate: "Aug 11, 2026",
    certStatus: "3 days remaining",
    stateOffset: 0,
    manager: "Sam Patel",
    hrbp: "Morgan Taylor",
  },
];

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

const normalize = (value) => String(value || "").trim().toLowerCase();

function Badge({ children, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    pink: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    violet: "border-violet-400/30 bg-violet-400/10 text-violet-300",
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
      className={`rounded-2xl border border-slate-700/90 bg-[#1a2035] shadow-[0_16px_42px_rgba(3,8,24,.18)] ${className}`}
    >
      {children}
    </section>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <input
        required
        {...props}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15 ${
          props.disabled
            ? "cursor-not-allowed border-slate-700 bg-slate-950 text-slate-500 opacity-60"
            : "border-slate-600 bg-[#0f1628]"
        }`}
      />
    </label>
  );
}

function CheckItem({ children, checked, onChange, accent = "cyan" }) {
  const colors = {
    cyan: "accent-cyan-400",
    amber: "accent-amber-400",
    violet: "accent-violet-400",
    green: "accent-emerald-400",
  };

  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-800/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={`mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 ${colors[accent]}`}
      />
      <span
        className={`text-sm leading-5 ${
          checked ? "text-slate-500 line-through" : "text-slate-200"
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

            <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-300">
              {[
                ["◈", "Restricted Demo"],
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

            <Badge tone="pink">Restricted Demo</Badge>

            <h2 className="mt-5 font-serif text-3xl font-bold">Welcome</h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
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
                className="w-full rounded-xl bg-gradient-to-r from-[#ef223a] to-[#e82e85] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-950/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLocked ? "Access locked for 30 seconds" : "Continue to employee verification →"}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-700/80 pt-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
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

    const match = EMPLOYEES.find(
      (employee) =>
        normalize(employee.firstName) === normalize(form.firstName) &&
        normalize(employee.lastName) === normalize(form.lastName) &&
        employee.employeeId === form.employeeId.trim()
    );

    if (!match) {
      setError(
        "We couldn’t verify that three-field combination. Check each field and try again."
      );
      return;
    }

    onVerify(match);
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
                className="w-full rounded-xl bg-gradient-to-r from-[#ef223a] to-[#e82e85] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-950/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Verify & open my leave plan →
              </button>
            </form>

            <div className="mt-8 border-t border-slate-700/80 pt-6">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Demo profiles
              </p>

              <div className="flex flex-wrap gap-2">
                {EMPLOYEES.map((employee) => (
                  <button
                    key={employee.employeeId}
                    type="button"
                    onClick={() =>
                      setForm({
                        firstName: employee.firstName,
                        lastName: employee.lastName,
                        employeeId: employee.employeeId,
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900/45 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
                  >
                    {employee.firstName} {employee.lastName} ·{" "}
                    {employee.employeeId}
                  </button>
                ))}
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-500">
                Demo only. Production identity verification must be enforced by
                authenticated server-side access controls.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Header({ employee, onSignOut, onLockDemo, onOpenChat }) {
  return (
    <>
      <header className="bg-[#232b45] px-5 py-5 shadow-xl">
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

              <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                Empathetic Leave Guidance, Salary Top-Up Calculator & ADA
                Interactive Assistant
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-slate-600 bg-slate-800/40 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
            >
              ▣ Print Plan
            </button>

            <button
              onClick={onOpenChat}
              className="rounded-lg bg-gradient-to-r from-[#ef223a] to-[#e82e85] px-4 py-2 text-sm font-bold text-white hover:brightness-110"
            >
              ✦ AI Leave Advisor
            </button>

            <button
              onClick={onSignOut}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
            >
              Switch profile
            </button>

            <button
              onClick={onLockDemo}
              className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20"
            >
              Lock demo
            </button>
          </div>
        </div>

        <div className="mx-auto mt-5 max-w-7xl rounded-xl border border-cyan-400/20 bg-slate-950/25 px-4 py-3 text-sm text-slate-200">
          <span className="mr-2 text-emerald-300">●</span>
          <strong>Verified Profile:</strong> {employee.firstName}{" "}
          {employee.lastName} <span className="text-slate-500">|</span> ID:{" "}
          {employee.employeeId} <span className="text-slate-500">|</span>{" "}
          Location: {employee.location}
        </div>
      </header>

      <div className="border-y border-slate-800 bg-[#10172a] px-5 py-2.5 text-xs text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-1 sm:flex-row">
          <span>
            <strong className="text-slate-200">ⓘ Disclaimer:</strong>{" "}
            Informational guidance and estimates only. Lincoln Financial and
            applicable agencies make official determinations.
          </span>
          <span className="shrink-0 text-emerald-300">
            ♢ PHI-Free Demo Data
          </span>
        </div>
      </div>
    </>
  );
}

function SummaryCards({ employee }) {
  const cards = [
    {
      label: "Active Stage",
      value: employee.activeStage,
      note: employee.stageNote,
      icon: "▣",
      color: "cyan",
    },
    {
      label: "Total Planned Duration",
      value: `${employee.durationWeeks} Weeks`,
      note: employee.leaveReason,
      icon: "⌛",
      color: "pink",
    },
    {
      label: "15-Day Med Cert Clock",
      value: employee.certStatus,
      note: "Check Gmail / MyLincoln Portal",
      icon: "✎",
      color: "amber",
    },
    {
      label: "Est. Biweekly Base Pay",
      value: money(employee.biweeklySalary),
      note: "Before taxes & deductions",
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

  const stages = [
    {
      id: "pre",
      title: "Stage 1: Pre-Leave Planning",
      subtitle: "Milestone & Administrative Setup",
      timing: "30–60 days prior",
      tone: "cyan",
      items: [
        "File the formal leave intake with Lincoln Financial through MyLincoln Portal or 800-377-1568.",
        `Confirm the leave product shown on file: ${employee.leaveProduct}.`,
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
              Your location on file is <strong>{employee.state}</strong>. Any
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
                ["Leave product", employee.leaveProduct],
                ["Claim status", employee.claimStatus],
                [
                  "Plan dates",
                  `${employee.startDate} — ${employee.endDate}`,
                ],
                ["Annual base salary", money(employee.annualSalary)],
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
  const [offset, setOffset] = useState(employee.stateOffset);
  const daily = employee.biweeklySalary / 10;
  const epPay = daily * 5;
  const disability = employee.biweeklySalary * 0.6667;
  const topUp = employee.biweeklySalary - disability;
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
              value={money(employee.annualSalary)}
            />
            <PayRow
              label="Biweekly base salary"
              value={money(employee.biweeklySalary)}
              highlight
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
                label="Twilio top-up component (33.33%)"
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
      description:
        "Confidential mental health coaching and therapy support for you and eligible dependents.",
      action: "Explore mental health support",
      best: "Stress, anxiety, caregiving, transitions",
    },
    {
      name: "Hinge Health",
      icon: "⌁",
      tone: "green",
      description:
        "Digital musculoskeletal care and guided exercise support for back, joint, and mobility needs.",
      action: "Explore MSK support",
      best: "Back, neck, joint, and mobility support",
    },
    {
      name: "Transform Oncology",
      icon: "✦",
      tone: "pink",
      description:
        "Navigation support for employees and families facing a cancer diagnosis or treatment journey.",
      action: "Explore oncology navigation",
      best: "Care navigation and second-opinion support",
    },
    {
      name: "Cleo",
      icon: "♥",
      tone: "violet",
      description:
        "Family support for pregnancy, parenting, caregiving, and major family transitions.",
      action: "Explore family support",
      best: "Parenthood and caregiving",
    },
  ];

  return (
    <div className="space-y-5">
      <Panel className="p-6">
        <Badge tone="pink">Personalized routing</Badge>
        <h2 className="mt-4 font-serif text-2xl font-bold">
          Specialized Benefits
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Optional resources that may complement your{" "}
          {employee.leaveReason.toLowerCase()} plan. Eligibility and
          availability vary by benefit enrollment and location.
        </p>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        {benefits.map((benefit) => (
          <Panel
            key={benefit.name}
            className="group p-6 transition hover:-translate-y-1 hover:border-slate-500"
          >
            <div className="flex items-start justify-between">
              <div
                className={`grid h-12 w-12 place-items-center rounded-2xl text-xl ${
                  benefit.tone === "cyan"
                    ? "bg-cyan-400/10 text-cyan-300"
                    : benefit.tone === "green"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : benefit.tone === "pink"
                        ? "bg-rose-400/10 text-rose-300"
                        : "bg-violet-400/10 text-violet-300"
                }`}
              >
                {benefit.icon}
              </div>
              <Badge tone={benefit.tone}>Available resource</Badge>
            </div>

            <h3 className="mt-5 font-serif text-xl font-bold">
              {benefit.name}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {benefit.description}
            </p>

            <div className="mt-4 rounded-xl bg-slate-900/45 p-3 text-xs text-slate-300">
              <strong className="text-white">Best for:</strong>{" "}
              {benefit.best}
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
      text: `Hi ${employee.firstName} — I’ve verified your profile. I can explain your ${employee.leaveProduct} plan, ${employee.claimStatus.toLowerCase()}, pay estimate, medical-certification timing, or return-to-work steps. What would help most?`,
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
    const q = question.toLowerCase();

    if (q.includes("pay") || q.includes("salary")) {
      return `Your verified biweekly base salary is ${money(
        employee.biweeklySalary
      )}. During eligible Day 8+ disability periods, the illustration is 66.67% from the disability component plus a 33.33% Twilio top-up, coordinated with any ${
        employee.state
      } benefit offset. Final amounts depend on eligibility, taxes, deductions, and official awards.`;
    }

    if (q.includes("status") || q.includes("claim")) {
      return `The latest normalized status in this demo record is “${employee.claimStatus}.” For the official live status, check MyLincoln Portal and your latest Lincoln email. Lincoln Financial owns the final claim determination.`;
    }

    if (q.includes("next") || q.includes("do")) {
      return `Your active stage is ${employee.activeStage}. Start by checking the Lifecycle To-Dos tab, reviewing any new Lincoln message, and confirming that your manager and HRBP know the timing without sharing medical details.`;
    }

    if (q.includes("return") || q.includes("rtw")) {
      return "Before returning, confirm whether Lincoln requires a release, align your return date with your manager, and verify system access. If restrictions remain, use the ADA Request Draft tab to begin a PHI-free interactive-process conversation.";
    }

    if (q.includes("cert") || q.includes("document")) {
      return `Your certification indicator is “${employee.certStatus}.” Standard timing is Day 1 confirmation, specialist outreach on Days 2–5, and complete certification by calendar Day 15. A one-time 7-day grace period may apply only when incomplete documents are submitted on Days 13–15.`;
    }

    return `I can help with that at an informational level. Based on your verified profile, your leave product is ${employee.leaveProduct} and your active stage is ${employee.activeStage}. Ask me about pay, documents, status, next steps, or return-to-work planning.`;
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
        <SummaryCards employee={employee} />
        <TabBar active={activeTab} setActive={setActiveTab} />
        {content}
      </main>

      <footer className="mt-10 border-t border-slate-800 px-5 py-6 text-center text-xs text-slate-500">
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
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        background: #0e1425;
        font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
      }

      .font-serif {
        font-family: 'DM Serif Display', Georgia, serif !important;
      }

      * {
        box-sizing: border-box;
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
