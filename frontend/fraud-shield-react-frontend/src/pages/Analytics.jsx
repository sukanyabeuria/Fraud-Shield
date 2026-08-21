import { useState } from "react";
import {
  Activity,
  Clock3,
  Gauge,
  Layers,
  MapPin,
  Percent,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import StatCard from "../components/StatCard";
import ChartCard, { ChartTooltip } from "../components/ChartCard";
import { Select } from "../components/Input";
import {
  dashboardStats,
  deviceRisk,
  fraudTrend,
  hourlyRisk,
  locationRisk,
  modelRadar,
  riskDistribution,
  volumeByType,
} from "../data/mockData";
import { cn } from "../utils/cn";

const AXIS = { stroke: "#475569", fontSize: 11, tickLine: false, axisLine: false };

export default function Analytics() {
  const [period, setPeriod] = useState("12m");

  // FUTURE: getAnalytics(period) → GET /api/analytics?period=
  const stats = dashboardStats;
  const fraudPct = ((stats.fraudDetected / stats.totalTransactions) * 100).toFixed(2);
  const highRisk = stats.fraudDetected + Math.round(stats.suspiciousTransactions * 0.35);

  const comparison = fraudTrend.map((m) => ({
    month: m.month,
    genuine: m.genuine,
    fraud: m.fraud * 10, // scaled for visual comparison
  }));

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
        <StatCard
          label="Total Transactions"
          value={stats.totalTransactions.toLocaleString("en-IN")}
          icon={Layers}
          tone="brand"
          change={8.2}
        />
        <StatCard label="Fraud Percentage" value={`${fraudPct}%`} icon={Percent} tone="danger" change={0.4} />
        <StatCard
          label="Average Risk Score"
          value={stats.overallRiskScore}
          icon={Gauge}
          tone="warning"
          progress={stats.overallRiskScore}
          footer="0–100 scale"
        />
        <StatCard
          label="High-Risk Transactions"
          value={highRisk.toLocaleString("en-IN")}
          icon={ShieldAlert}
          tone="violet"
          change={-3.1}
        />
      </section>

      {/* Fraud trend */}
      <ChartCard
        title="Fraud Trend"
        subtitle="Confirmed fraud cases and fraud rate over time"
        action={
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" /> Fraud cases
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400" /> Fraud rate %
            </span>
          </div>
        }
      >
        <div className="h-[300px] w-full">
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
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="fraud"
                name="Fraud cases"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="url(#gradFraudTrend)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rate"
                name="Fraud rate %"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Distribution + volume */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Risk Distribution" subtitle="Transactions per risk band">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  stroke="none"
                >
                  {riskDistribution.map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Transaction Volume by Channel" subtitle="Total volume and fraud per channel">
          <div className="h-[280px] w-full">
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
          </div>
        </ChartCard>
      </section>

      {/* Fraud vs genuine + time analysis */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Fraud vs Genuine"
          subtitle="Monthly comparison (fraud scaled ×10 for visibility)"
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" {...AXIS} />
                <YAxis {...AXIS} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Bar dataKey="genuine" name="Genuine" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} maxBarSize={26} />
                <Bar dataKey="fraud" name="Fraud (×10)" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Time-based Risk Analysis"
          subtitle="Average risk score vs volume across the day"
          action={<Clock3 className="h-4 w-4 text-slate-500" />}
        >
          <div className="h-[280px] w-full">
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
          </div>
        </ChartCard>
      </section>

      {/* Device / location / model */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Device Risk Statistics"
          subtitle="Average risk score by device channel"
          action={<Smartphone className="h-4 w-4 text-slate-500" />}
        >
          <ul className="space-y-3.5">
            {deviceRisk.map((d) => (
              <li key={d.device}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-slate-300">{d.device}</span>
                  <span className="text-slate-500">
                    {d.transactions.toLocaleString("en-IN")} txns ·{" "}
                    <strong className="text-white">{d.risk}</strong>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      d.risk >= 70 ? "bg-rose-500" : d.risk >= 40 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${d.risk}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard
          title="Location Risk Statistics"
          subtitle="Geographic fraud concentration"
          action={<MapPin className="h-4 w-4 text-slate-500" />}
        >
          <ul className="space-y-2.5">
            {locationRisk.map((l) => (
              <li
                key={l.location}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-200">{l.location}</p>
                  <p className="text-[11px] text-slate-500">{l.fraud} fraud cases</p>
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
                  {l.risk}
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard
          title="Model Feature Weights"
          subtitle="Relative influence on fraud predictions"
          className="lg:col-span-2 xl:col-span-1"
          action={<Activity className="h-4 w-4 text-slate-500" />}
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={modelRadar} outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="factor" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} />
                <Radar
                  name="Weight"
                  dataKey="score"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.28}
                  strokeWidth={2}
                />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <p className="pb-2 text-center text-[11px] text-slate-600">
        All analytics shown are generated from mock data · live figures will stream from the
        analytics API once the backend is connected.
      </p>
    </div>
  );
}
