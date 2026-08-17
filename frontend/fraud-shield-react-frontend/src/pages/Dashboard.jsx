import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Layers,
  ScanSearch,
  ShieldX,
  Timer,
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
import ErrorState, { EmptyState } from "../components/ErrorState";
import { Skeleton } from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { getAnalytics, getDashboardSummary, getTransactions } from "../services/fraudApi";
import { formatCurrency, formatNumber } from "../utils/format";

const RISK_COLORS = { Low: "#22c55e", Medium: "#f59e0b", High: "#ef4444", Critical: "#b91c1c" };

/** Render a metric only when the backend actually supplied it. */
const show = (value, formatter = formatNumber) =>
  value === null || value === undefined ? "—" : formatter(value);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // GET /api/v1/analytics/summary
  const summaryQuery = useApi(({ signal }) => getDashboardSummary({ signal }), []);
  // GET /api/v1/analytics  (charts)
  const analyticsQuery = useApi(({ signal }) => getAnalytics({ signal }), []);
  // GET /api/v1/transactions?limit=6
  const recentQuery = useApi(
    ({ signal }) => getTransactions({ limit: 6, pageSize: 6, sort: "date_desc" }, { signal }),
    []
  );

  const stats = summaryQuery.data;
  const charts = analyticsQuery.data;
  const recent = recentQuery.data?.items ?? [];

  const retryAll = useCallback(() => {
    summaryQuery.refetch();
    analyticsQuery.refetch();
    recentQuery.refetch();
  }, [summaryQuery, analyticsQuery, recentQuery]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const pct = (part) =>
    stats?.totalTransactions && part !== null && part !== undefined
      ? (part / stats.totalTransactions) * 100
      : undefined;

  const riskDistribution = (charts?.riskDistribution ?? []).map((d) => ({
    name: d.name ?? d.risk_level ?? d.label,
    value: Number(d.value ?? d.count ?? 0),
    color: d.color ?? RISK_COLORS[d.name ?? d.risk_level] ?? "#38bdf8",
  }));

  const activity = (charts?.transactionActivity ?? []).map((a) => ({
    time: a.time ?? a.hour ?? a.bucket,
    transactions: Number(a.transactions ?? a.total ?? 0),
    flagged: Number(a.flagged ?? a.fraud ?? 0),
  }));

  const volumeByType = (charts?.volumeByType ?? []).map((v) => ({
    type: v.type ?? v.transaction_type,
    volume: Number(v.volume ?? v.count ?? 0),
    fraud: Number(v.fraud ?? v.fraud_count ?? 0),
  }));

  return (
    <div className="space-y-5">
      {/* ---------------- Welcome banner ---------------- */}
      <section className="glass-card scan-line animate-fade-up overflow-hidden p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white lg:text-3xl">
              {greeting}, {user?.name?.split(" ")[0] ?? "Analyst"}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
              {summaryQuery.loading
                ? "Loading live figures from the Fraud-Shield backend…"
                : stats
                  ? `The risk engine has scored ${show(stats.totalTransactions)} transactions${
                      stats.blockedAmount !== null && stats.blockedAmount !== undefined
                        ? ` and blocked ${formatCurrency(stats.blockedAmount)} in flagged value`
                        : ""
                    }.`
                  : "Live transaction metrics are served by the Fraud-Shield backend."}
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
      {summaryQuery.loading ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[132px]" />
          ))}
        </section>
      ) : summaryQuery.error ? (
        <ErrorState error={summaryQuery.error} onRetry={retryAll} />
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Transactions"
            value={show(stats?.totalTransactions)}
            icon={Layers}
            tone="brand"
            footer="from the backend database"
          />
          <StatCard
            label="Safe Transactions"
            value={show(stats?.safeTransactions)}
            icon={CheckCircle2}
            tone="success"
            progress={pct(stats?.safeTransactions)}
            footer="classified genuine"
          />
          <StatCard
            label="Suspicious"
            value={show(stats?.suspiciousTransactions)}
            icon={AlertTriangle}
            tone="warning"
            progress={pct(stats?.suspiciousTransactions)}
            footer="awaiting review"
          />
          <StatCard
            label="Fraud Detected"
            value={show(stats?.fraudDetected)}
            icon={ShieldX}
            tone="danger"
            progress={pct(stats?.fraudDetected)}
            footer="confirmed by the model"
          />
        </section>
      )}

      {/* ---------------- Risk score + activity chart ---------------- */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Overall Risk Score"
          subtitle="Average score reported by the backend"
          className="items-center"
          bodyClassName="flex flex-col items-center"
        >
          {summaryQuery.loading ? (
            <Skeleton className="h-[190px] w-[190px] rounded-full" />
          ) : summaryQuery.error ? (
            <ErrorState compact error={summaryQuery.error} onRetry={summaryQuery.refetch} />
          ) : stats?.overallRiskScore === null || stats?.overallRiskScore === undefined ? (
            <EmptyState
              title="No risk score available"
              hint="The analytics summary did not include an average risk score."
            />
          ) : (
            <>
              <RiskScore score={Math.round(stats.overallRiskScore)} size={190} />
              <div className="mt-5 grid w-full grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-3">
                  <Gauge className="mx-auto mb-1 h-4 w-4 text-sky-300" />
                  <p className="text-sm font-bold text-white">
                    {show(stats.detectionAccuracy, (v) => `${v}%`)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Accuracy</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-3">
                  <Timer className="mx-auto mb-1 h-4 w-4 text-sky-300" />
                  <p className="text-sm font-bold text-white">
                    {show(stats.avgResponseMs, (v) => `${Math.round(v)}ms`)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Avg Latency</p>
                </div>
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard
          title="Transaction Activity"
          subtitle="Volume vs flagged transactions"
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
            {analyticsQuery.loading ? (
              <Skeleton className="h-full w-full" />
            ) : analyticsQuery.error ? (
              <ErrorState error={analyticsQuery.error} onRetry={analyticsQuery.refetch} />
            ) : activity.length === 0 ? (
              <EmptyState title="No activity data returned" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activity} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
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
                  <Area type="monotone" dataKey="transactions" stroke="#38bdf8" strokeWidth={2} fill="url(#gradTx)" name="Transactions" />
                  <Area type="monotone" dataKey="flagged" stroke="#f43f5e" strokeWidth={2} fill="url(#gradFlag)" name="Flagged" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </section>

      {/* ---------------- Distribution + volume ---------------- */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Risk Distribution" subtitle="Share of transactions by risk band">
          <div className="h-[260px] w-full">
            {analyticsQuery.loading ? (
              <Skeleton className="h-full w-full" />
            ) : analyticsQuery.error ? (
              <ErrorState compact error={analyticsQuery.error} onRetry={analyticsQuery.refetch} />
            ) : riskDistribution.length === 0 ? (
              <EmptyState title="No risk distribution returned" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDistribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">
                    {riskDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Volume by Channel" subtitle="Transactions vs confirmed fraud">
          <div className="h-[260px] w-full">
            {analyticsQuery.loading ? (
              <Skeleton className="h-full w-full" />
            ) : analyticsQuery.error ? (
              <ErrorState compact error={analyticsQuery.error} onRetry={analyticsQuery.refetch} />
            ) : volumeByType.length === 0 ? (
              <EmptyState title="No channel data returned" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeByType} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <XAxis dataKey="type" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="volume" name="Volume" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={26} />
                  <Bar dataKey="fraud" name="Fraud" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
        {recentQuery.loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : recentQuery.error ? (
          <ErrorState error={recentQuery.error} onRetry={recentQuery.refetch} />
        ) : (
          <TransactionTable
            transactions={recent}
            onView={(t) => navigate("/history", { state: { focusId: t.id } })}
          />
        )}
      </ChartCard>
    </div>
  );
}
