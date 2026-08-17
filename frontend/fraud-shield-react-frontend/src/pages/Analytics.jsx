import { useState } from "react";
import { Activity, Clock3, Gauge, Layers, MapPin, Percent, ShieldAlert, Smartphone } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "../components/StatCard";
import ChartCard, { ChartTooltip } from "../components/ChartCard";
import ErrorState, { EmptyState } from "../components/ErrorState";
import { Skeleton } from "../components/Loading";
import { Select } from "../components/Input";
import { useApi } from "../hooks/useApi";
import { getAnalytics } from "../services/fraudApi";
import { formatNumber } from "../utils/format";
import { cn } from "../utils/cn";

const AXIS = { stroke: "#475569", fontSize: 11, tickLine: false, axisLine: false };
const RISK_COLORS = { Low: "#22c55e", Medium: "#f59e0b", High: "#ef4444", Critical: "#b91c1c" };

const show = (value, formatter = formatNumber) =>
  value === null || value === undefined ? "—" : formatter(value);

export default function Analytics() {
  const [period, setPeriod] = useState("12m");

  // GET /api/v1/analytics — real backend data only.
  const { data, error, loading, refetch } = useApi(
    ({ signal }) => getAnalytics({ signal }),
    [period]
  );

  const stats = data?.stats;

  const riskDistribution = (data?.riskDistribution ?? []).map((d) => ({
    name: d.name ?? d.risk_level ?? d.label,
    value: Number(d.value ?? d.count ?? 0),
    color: d.color ?? RISK_COLORS[d.name ?? d.risk_level] ?? "#38bdf8",
  }));

  const fraudTrend = (data?.fraudTrend ?? []).map((f) => ({
    month: f.month ?? f.period ?? f.day ?? f.label,
    fraud: Number(f.fraud ?? f.fraud_count ?? 0),
    genuine: Number(f.genuine ?? f.genuine_count ?? 0),
    rate: Number(f.rate ?? f.fraud_rate ?? 0),
  }));

  const volumeByType = (data?.volumeByType ?? []).map((v) => ({
    type: v.type ?? v.transaction_type,
    volume: Number(v.volume ?? v.count ?? 0),
    fraud: Number(v.fraud ?? v.fraud_count ?? 0),
  }));

  const hourlyRisk = (data?.hourlyRisk ?? []).map((h) => ({
    hour: h.hour ?? h.hour_of_day,
    avgRisk: Number(h.avgRisk ?? h.avg_risk ?? h.avg_risk_score ?? 0),
    volume: Number(h.volume ?? h.count ?? 0),
  }));

  const deviceRisk = (data?.deviceRisk ?? []).map((d) => ({
    device: d.device ?? d.device_type,
    risk: Number(d.risk ?? d.avg_risk_score ?? 0),
    transactions: Number(d.transactions ?? d.count ?? 0),
  }));

  const locationRisk = (data?.locationRisk ?? []).map((l) => ({
    location: l.location ?? l.location_label ?? l.country,
    risk: Number(l.risk ?? l.avg_risk_score ?? 0),
    fraud: Number(l.fraud ?? l.fraud_count ?? 0),
  }));

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[92px]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[132px]" />
          ))}
        </div>
        <Skeleton className="h-[360px]" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-[340px]" />
          <Skeleton className="h-[340px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <section className="glass-card p-5 lg:p-6">
          <h2 className="text-lg font-bold text-white">Risk &amp; Fraud Analytics</h2>
          <p className="mt-1 text-sm text-slate-400">
            Aggregated insight across channels, devices, geographies and time.
          </p>
        </section>
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div>
          <h2 className="text-lg font-bold text-white">Risk &amp; Fraud Analytics</h2>
          <p className="mt-1 text-sm text-slate-400">
            Aggregated insight across channels, devices, geographies and time.
          </p>
        </div>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} containerClassName="sm:w-48">
          {[
            ["7d", "Last 7 days"],
            ["30d", "Last 30 days"],
            ["3m", "Last 3 months"],
            ["12m", "Last 12 months"],
          ].map(([v, l]) => (
            <option key={v} value={v} className="bg-[#0b1120]">
              {l}
            </option>
          ))}
        </Select>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Transactions" value={show(stats?.totalTransactions)} icon={Layers} tone="brand" />
        <StatCard
          label="Fraud Percentage"
          value={show(stats?.fraudPercentage, (v) => `${Number(v).toFixed(2)}%`)}
          icon={Percent}
          tone="danger"
        />
        <StatCard
          label="Average Risk Score"
          value={show(stats?.overallRiskScore, (v) => Math.round(v))}
          icon={Gauge}
          tone="warning"
          progress={stats?.overallRiskScore ?? undefined}
        />
        <StatCard
          label="High-Risk Transactions"
          value={show(stats?.highRiskTransactions)}
          icon={ShieldAlert}
          tone="violet"
        />
      </section>

      {/* Fraud trend */}
      <ChartCard title="Fraud Trend" subtitle="Confirmed fraud cases and fraud rate over time">
        <div className="h-[300px] w-full">
          {fraudTrend.length === 0 ? (
            <EmptyState title="No fraud trend data returned by the backend" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fraudTrend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="gradFraudTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" {...AXIS} />
                <YAxis yAxisId="left" {...AXIS} />
                <YAxis yAxisId="right" orientation="right" {...AXIS} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#38bdf8", strokeOpacity: 0.2 }} />
                <Area yAxisId="left" type="monotone" dataKey="fraud" name="Fraud cases" stroke="#f43f5e" strokeWidth={2} fill="url(#gradFraudTrend)" />
                <Line yAxisId="right" type="monotone" dataKey="rate" name="Fraud rate %" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      {/* Distribution + volume */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Risk Distribution" subtitle="Transactions per risk band">
          <div className="h-[280px] w-full">
            {riskDistribution.length === 0 ? (
              <EmptyState title="No risk distribution returned" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3} stroke="none">
                    {riskDistribution.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Transaction Volume by Channel" subtitle="Total volume and fraud per channel">
          <div className="h-[280px] w-full">
            {volumeByType.length === 0 ? (
              <EmptyState title="No channel volume returned" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeByType} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="type" {...AXIS} />
                  <YAxis {...AXIS} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="volume" name="Volume" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="fraud" name="Fraud" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </section>

      {/* Fraud vs genuine + time analysis */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Fraud vs Genuine" subtitle="Comparison per reporting period">
          <div className="h-[280px] w-full">
            {fraudTrend.length === 0 ? (
              <EmptyState title="No comparison data returned" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fraudTrend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" {...AXIS} />
                  <YAxis {...AXIS} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                  <Bar dataKey="genuine" name="Genuine" stackId="a" fill="#22c55e" maxBarSize={26} />
                  <Bar dataKey="fraud" name="Fraud" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Time-based Risk Analysis"
          subtitle="Average risk score vs volume across the day"
          action={<Clock3 className="h-4 w-4 text-slate-500" />}
        >
          <div className="h-[280px] w-full">
            {hourlyRisk.length === 0 ? (
              <EmptyState title="No hourly risk data returned" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyRisk} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="hour" {...AXIS} />
                  <YAxis {...AXIS} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#38bdf8", strokeOpacity: 0.2 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                  <Line type="monotone" dataKey="avgRisk" name="Avg risk" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="volume" name="Volume" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </section>

      {/* Device / location */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Device Risk Statistics"
          subtitle="Average risk score by device channel"
          action={<Smartphone className="h-4 w-4 text-slate-500" />}
        >
          {deviceRisk.length === 0 ? (
            <EmptyState title="No device statistics returned" />
          ) : (
            <ul className="space-y-3.5">
              {deviceRisk.map((d) => (
                <li key={d.device}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-300">{d.device}</span>
                    <span className="text-slate-500">
                      {formatNumber(d.transactions)} txns · <strong className="text-white">{Math.round(d.risk)}</strong>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        d.risk >= 70 ? "bg-rose-500" : d.risk >= 40 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, d.risk))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard
          title="Location Risk Statistics"
          subtitle="Geographic fraud concentration"
          action={<MapPin className="h-4 w-4 text-slate-500" />}
        >
          {locationRisk.length === 0 ? (
            <EmptyState title="No location statistics returned" />
          ) : (
            <ul className="space-y-2.5">
              {locationRisk.map((l) => (
                <li
                  key={l.location}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-200">{l.location}</p>
                    <p className="text-[11px] text-slate-500">{formatNumber(l.fraud)} fraud cases</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold",
                      l.risk >= 70
                        ? "bg-rose-500/15 text-rose-300"
                        : l.risk >= 40
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-emerald-500/15 text-emerald-300"
                    )}
                  >
                    {Math.round(l.risk)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </section>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-[11px] text-slate-600">
        <Activity className="h-3 w-3" />
        All analytics are served live by the Fraud-Shield backend.
      </p>
    </div>
  );
}
