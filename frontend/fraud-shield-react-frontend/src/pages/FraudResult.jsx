import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  Clock,
  Download,
  History,
  Info,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import RiskScore from "../components/RiskScore";
import RiskBadge from "../components/RiskBadge";
import Button from "../components/Button";
import ChartCard, { ChartTooltip } from "../components/ChartCard";
import { cn } from "../utils/cn";
import { formatDateTime } from "../data/mockData";

const VERDICT_THEME = {
  Fraudulent: {
    wrap: "border-rose-500/30 bg-gradient-to-r from-rose-500/12 to-transparent",
    icon: ShieldAlert,
    iconCls: "bg-rose-500/15 text-rose-300",
    title: "text-rose-300",
    action: "Block the transaction and escalate to the fraud operations team.",
  },
  Suspicious: {
    wrap: "border-amber-500/30 bg-gradient-to-r from-amber-500/12 to-transparent",
    icon: AlertTriangle,
    iconCls: "bg-amber-500/15 text-amber-300",
    title: "text-amber-300",
    action: "Hold for manual review and request step-up authentication.",
  },
  Genuine: {
    wrap: "border-emerald-500/30 bg-gradient-to-r from-emerald-500/12 to-transparent",
    icon: ShieldCheck,
    iconCls: "bg-emerald-500/15 text-emerald-300",
    title: "text-emerald-300",
    action: "Approve the transaction — no anomalous behaviour detected.",
  },
};

const BAR_COLOR = (impact) => (impact >= 18 ? "#f43f5e" : impact >= 10 ? "#f59e0b" : "#38bdf8");

export default function FraudResult() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const result = state?.result;

  // No result in router state (e.g. direct URL hit) → send back to the form
  if (!result) return <Navigate to="/transaction-check" replace />;

  const theme = VERDICT_THEME[result.verdict] ?? VERDICT_THEME.Suspicious;
  const VerdictIcon = theme.icon;
  const s = result.summary ?? {};

  const summaryRows = [
    ["Transaction ID", result.transactionId],
    ["Amount", s.amount ? `₹${Number(s.amount).toLocaleString("en-IN")}` : "—"],
    ["Type", s.transactionType],
    ["Merchant Category", s.merchantCategory],
    ["Location", s.location],
    ["Device", s.deviceType],
    ["Date / Time", `${s.transactionDate ?? "—"} · ${s.transactionTime ?? "—"}`],
    ["Account Age", s.accountAge ? `${s.accountAge} months` : "—"],
    ["24 h Transaction Count", s.transactionCount ?? "—"],
    ["Previous Amount", s.previousAmount ? `₹${Number(s.previousAmount).toLocaleString("en-IN")}` : "—"],
    ["Account Balance", s.accountBalance ? `₹${Number(s.accountBalance).toLocaleString("en-IN")}` : "—"],
    ["IP Address", s.ipAddress || "Not captured"],
  ];

  return (
    <div className="space-y-5">
      {/* ---------------- Verdict banner ---------------- */}
      <section className={cn("glass-card animate-fade-up border p-5 lg:p-6", theme.wrap)}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", theme.iconCls)}>
              <VerdictIcon className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={cn("text-2xl font-bold", theme.title)}>{result.verdict}</h2>
                <RiskBadge value={result.riskLevel} size="md" />
              </div>
              <p className="mt-1 font-mono text-xs text-slate-400">{result.transactionId}</p>
              <p className="mt-2 max-w-xl text-sm text-slate-300">{theme.action}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:shrink-0">
            <Button icon={ScanSearch} onClick={() => navigate("/transaction-check")}>
              Check Another Transaction
            </Button>
            <Button variant="secondary" icon={History} onClick={() => navigate("/history")}>
              View Transaction History
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* ---------------- Risk gauge ---------------- */}
        <ChartCard title="Risk Score" subtitle="0 = safe · 100 = certain fraud" bodyClassName="flex flex-col items-center">
          <RiskScore score={result.riskScore} size={200} />

          <div className="mt-5 w-full space-y-2">
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500">
              <div
                className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-white shadow-lg ring-2 ring-white/40"
                style={{ left: `calc(${result.riskScore}% - 2px)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Low 0–39</span>
              <span>Medium 40–69</span>
              <span>High 70–100</span>
            </div>
          </div>

          <div className="mt-5 grid w-full grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
              <BadgeCheck className="mx-auto mb-1 h-4 w-4 text-sky-300" />
              <p className="text-base font-bold text-white">{result.confidence}%</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Confidence</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-center">
              <Clock className="mx-auto mb-1 h-4 w-4 text-sky-300" />
              <p className="text-base font-bold text-white">148 ms</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Inference</p>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-600">
            Model {result.modelVersion} · {formatDateTime(result.evaluatedAt)}
          </p>
        </ChartCard>

        {/* ---------------- Explainable AI ---------------- */}
        <ChartCard
          title="Why was this decision made?"
          subtitle="Explainable AI · feature attributions (mock SHAP output)"
          className="xl:col-span-2"
        >
          <ul className="space-y-3">
            {result.reasons.map((r, i) => (
              <li
                key={`${r.key}-${i}`}
                className="animate-fade-up flex gap-3.5 rounded-xl border border-white/8 bg-white/[0.03] p-3.5"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    r.impact >= 18
                      ? "bg-rose-500/15 text-rose-300"
                      : r.impact >= 10
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-sky-500/15 text-sky-300"
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{r.title}</p>
                    {r.impact > 0 && (
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        +{r.impact} pts
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{r.text}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-600">{r.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={result.factors}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
              >
                <XAxis type="number" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#475569"
                  fontSize={10}
                  width={130}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="impact" name="Risk contribution" radius={[0, 6, 6, 0]} maxBarSize={16}>
                  {result.factors.map((f) => (
                    <Cell key={f.label} fill={BAR_COLOR(f.impact)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---------------- Transaction summary ---------------- */}
        <ChartCard
          title="Transaction Summary"
          subtitle="Submitted attributes"
          className="lg:col-span-2"
          action={
            <Button
              variant="ghost"
              size="sm"
              icon={Download}
              onClick={() => window.print()}
            >
              Export
            </Button>
          }
        >
          <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
            {summaryRows.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-2.5 text-xs"
              >
                <dt className="text-slate-500">{k}</dt>
                <dd className="truncate text-right font-medium text-slate-200">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {s.cardPresent && <Chip text="Card present" tone="ok" />}
            {s.internationalTransfer && <Chip text="International" tone="warn" />}
            {s.newRecipient && <Chip text="New recipient" tone="warn" />}
          </div>
        </ChartCard>

        {/* ---------------- Warnings ---------------- */}
        <ChartCard title="Warning Indicators" subtitle="Automated compliance signals">
          {result.warnings.length ? (
            <ul className="space-y-2.5">
              {result.warnings.map((w) => (
                <li
                  key={w}
                  className="flex gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] p-3 text-xs leading-relaxed text-rose-200"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-6 text-center">
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-300">No warnings raised</p>
              <p className="text-xs text-emerald-200/70">
                This transaction matches the customer&apos;s normal behaviour.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
            <p className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <BrainCircuit className="h-4 w-4 text-sky-300" /> Recommended Action
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{theme.action}</p>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Explanations shown here are mock placeholders. They will be produced by the SHAP-based
            Explainable AI service once the ML backend is connected.
          </p>
        </ChartCard>
      </section>

      {/* ---------------- Bottom actions ---------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" icon={ScanSearch} onClick={() => navigate("/transaction-check")}>
          Check Another Transaction
        </Button>
        <Button size="lg" variant="secondary" icon={History} onClick={() => navigate("/history")}>
          View Transaction History
        </Button>
      </div>
    </div>
  );
}

function Chip({ text, tone }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        tone === "ok"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
      )}
    >
      {text}
    </span>
  );
}
