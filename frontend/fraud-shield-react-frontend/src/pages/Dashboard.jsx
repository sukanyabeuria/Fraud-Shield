import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Layers,
  ScanSearch,
  ShieldAlert,
  ShieldX,
  Timer,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "../components/StatCard";
import ChartCard, { ChartTooltip } from "../components/ChartCard";
import TransactionTable from "../components/TransactionTable";
import RiskScore from "../components/RiskScore";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import {
  dashboardStats,
  formatCurrency,
  mockTransactions,
  riskDistribution,
  transactionActivity,
  volumeByType,
} from "../data/mockData";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // FUTURE: const { data } = useQuery(getDashboardSummary)
  const stats = dashboardStats;
  const recent = useMemo(() => mockTransactions.slice(0, 6), []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-5">
      {/* ---------------- Welcome banner ---------------- */}
      <section className="glass-card scan-line animate-fade-up overflow-hidden p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live monitoring active
            </span>
            <h2 className="mt-3 text-2xl font-bold text-white lg:text-3xl">
              {greeting}, {user?.name?.split(" ")[0] ?? "Analyst"} 👋
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
              Your risk engine scanned{" "}
              <strong className="text-slate-200">{stats.totalTransactions.toLocaleString("en-IN")}</strong>{" "}
              transactions and blocked{" "}
              <strong className="text-rose-300">{formatCurrency(stats.blockedAmount)}</strong> in
              potentially fraudulent value this month.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row lg:shrink-0">
            <Button icon={ScanSearch} onClick={() => navigate("/transaction-check")}>
              Check Transaction
            </Button>
            <Button variant="secondary" icon={ArrowRight} onClick={() => navigate("/analytics")}>
              View Analytics
            </Button>
          </div>
        </div>
      </section>

      {/* ---------------- KPI cards ---------------- */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Transactions"
          value={stats.totalTransactions.toLocaleString("en-IN")}
          icon={Layers}
          tone="brand"
          change={8.2}
        />
        <StatCard
          label="Safe Transactions"
          value={stats.safeTransactions.toLocaleString("en-IN")}
          icon={CheckCircle2}
          tone="success"
          change={4.6}
          progress={(stats.safeTransactions / stats.totalTransactions) * 100}
        />
        <StatCard
          label="Suspicious"
          value={stats.suspiciousTransactions.toLocaleString("en-IN")}
          icon={AlertTriangle}
          tone="warning"
          change={-2.4}
          progress={(stats.suspiciousTransactions / stats.totalTransactions) * 100}
        />
        <StatCard
          label="Fraud Detected"
          value={stats.fraudDetected.toLocaleString("en-IN")}
          icon={ShieldX}
          tone="danger"
          change={12.8}
          progress={(stats.fraudDetected / stats.totalTransactions) * 100}
        />
      </section>

      {/* ---------------- Risk score + activity chart ---------------- */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Overall Risk Score"
          subtitle="Weighted portfolio exposure"
          className="items-center"
          bodyClassName="flex flex-col items-center"
        >
          <RiskScore score={stats.overallRiskScore} size={190} />
          <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
            {[
              { label: "Accuracy", value: `${stats.detectionAccuracy}%`, icon: Gauge },
              { label: "Avg Latency", value: `${stats.avgResponseMs}ms`, icon: Timer },
              { label: "Models", value: "3 live", icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-3">
                <Icon className="mx-auto mb-1 h-4 w-4 text-sky-300" />
                <p className="text-sm font-bold text-white">{value}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Transaction Activity"
          subtitle="Volume vs flagged transactions (last 24 h)"
          className="xl:col-span-2"
          action={
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-400" /> Transactions
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> Flagged
              </span>
            </div>
          }
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={transactionActivity} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="gradTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradFlag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#38bdf8", strokeOpacity: 0.2 }} />
                <Area
                  type="monotone"
                  dataKey="transactions"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#gradTx)"
                  name="Transactions"
                />
                <Area
                  type="monotone"
                  dataKey="flagged"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#gradFlag)"
                  name="Flagged"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      {/* ---------------- Distribution + detection stats ---------------- */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Risk Distribution" subtitle="Share of transactions by risk band">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  stroke="none"
                >
                  {riskDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Volume by Channel" subtitle="Transactions vs confirmed fraud">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeByType} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="type" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="volume" name="Volume" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={26} />
                <Bar dataKey="fraud" name="Fraud" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Fraud Detection Statistics"
          subtitle="Model performance snapshot"
          className="lg:col-span-2 xl:col-span-1"
        >
          <ul className="space-y-3">
            {[
              { label: "Detection Accuracy", value: 96.4, color: "bg-emerald-400", suffix: "%" },
              { label: "Precision", value: 92.1, color: "bg-sky-400", suffix: "%" },
              { label: "Recall", value: 89.7, color: "bg-violet-400", suffix: "%" },
              { label: "False Positive Rate", value: 3.6, color: "bg-amber-400", suffix: "%" },
            ].map((m) => (
              <li key={m.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{m.label}</span>
                  <span className="font-semibold text-white">
                    {m.value}
                    {m.suffix}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <ShieldAlert className="mb-1.5 h-4 w-4 text-rose-300" />
              <p className="text-lg font-bold text-white">412</p>
              <p className="text-[11px] text-slate-500">Frauds blocked</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <Activity className="mb-1.5 h-4 w-4 text-sky-300" />
              <p className="text-lg font-bold text-white">148 ms</p>
              <p className="text-[11px] text-slate-500">Avg inference</p>
            </div>
          </div>
        </ChartCard>
      </section>

      {/* ---------------- Recent transactions ---------------- */}
      <ChartCard
        title="Recent Transactions"
        subtitle="Latest activity scored by the risk engine"
        action={
          <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => navigate("/history")}>
            View all
          </Button>
        }
      >
        <TransactionTable
          transactions={recent}
          onView={(t) => navigate("/history", { state: { focusId: t.id } })}
        />
      </ChartCard>
    </div>
  );
}
