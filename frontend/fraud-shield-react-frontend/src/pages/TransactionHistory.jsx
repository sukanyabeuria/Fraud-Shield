import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import ChartCard from "../components/ChartCard";
import TransactionTable from "../components/TransactionTable";
import RiskBadge from "../components/RiskBadge";
import { RiskBar } from "../components/RiskScore";
import Button from "../components/Button";
import { Select } from "../components/Input";
import StatCard from "../components/StatCard";
import { formatCurrency, formatDateTime, mockTransactions } from "../data/mockData";
import { cn } from "../utils/cn";

const PAGE_SIZE = 8;
const STATUSES = ["All", "Safe", "Suspicious", "Fraud"];
const RISK_LEVELS = ["All", "Low", "Medium", "High"];
const DATE_RANGES = [
  { label: "All time", value: "all" },
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
];

export default function TransactionHistory() {
  const { state } = useLocation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [risk, setRisk] = useState("All");
  const [range, setRange] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  // Deep-link from Dashboard "View" button
  useEffect(() => {
    if (state?.focusId) {
      const found = mockTransactions.find((t) => t.id === state.focusId);
      if (found) setSelected(found);
    }
  }, [state]);

  // FUTURE: move this filtering server-side → GET /api/transactions?search=&status=…
  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = { "24h": 864e5, "7d": 6048e5, "30d": 2592e6 }[range];
    return mockTransactions.filter((t) => {
      if (query) {
        const q = query.toLowerCase();
        const hit =
          t.id.toLowerCase().includes(q) ||
          t.merchant.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (status !== "All" && t.status !== status) return false;
      if (risk !== "All" && t.riskLevel !== risk) return false;
      if (cutoff && now - new Date(t.date).getTime() > cutoff) return false;
      return true;
    });
  }, [query, status, risk, range]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const reset = () => {
    setQuery("");
    setStatus("All");
    setRisk("All");
    setRange("all");
    setPage(1);
  };

  const totals = useMemo(
    () => ({
      count: filtered.length,
      value: filtered.reduce((s, t) => s + t.amount, 0),
      fraud: filtered.filter((t) => t.status === "Fraud").length,
      avgRisk: filtered.length
        ? Math.round(filtered.reduce((s, t) => s + t.riskScore, 0) / filtered.length)
        : 0,
    }),
    [filtered]
  );

  return (
    <div className="space-y-5">
      {/* Summary */}
      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Results" value={totals.count} tone="brand" footer="matching filters" />
        <StatCard label="Total Value" value={formatCurrency(totals.value)} tone="violet" footer="across results" />
        <StatCard label="Fraud Cases" value={totals.fraud} tone="danger" footer="confirmed fraud" />
        <StatCard label="Avg Risk Score" value={totals.avgRisk} tone="warning" progress={totals.avgRisk} footer="0–100 scale" />
      </section>

      {/* Filters */}
      <section className="glass-card p-4 lg:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-sky-300" />
          <h3 className="text-sm font-semibold text-white">Search &amp; Filters</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by ID, merchant, type or location…"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="bg-[#0b1120]">
                Status: {s}
              </option>
            ))}
          </Select>

          <Select
            value={risk}
            onChange={(e) => {
              setRisk(e.target.value);
              setPage(1);
            }}
          >
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r} className="bg-[#0b1120]">
                Risk: {r}
              </option>
            ))}
          </Select>

          <div className="flex gap-2">
            <Select
              containerClassName="flex-1"
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
                setPage(1);
              }}
            >
              {DATE_RANGES.map((d) => (
                <option key={d.value} value={d.value} className="bg-[#0b1120]">
                  {d.label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" size="md" onClick={reset} className="shrink-0 px-3" aria-label="Reset filters">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Table */}
      <ChartCard
        title="Transaction History"
        subtitle={`${filtered.length} transaction(s) · page ${currentPage} of ${totalPages}`}
        action={
          <Button variant="ghost" size="sm" icon={Download} onClick={() => window.print()}>
            Export CSV
          </Button>
        }
      >
        <TransactionTable transactions={pageItems} onView={setSelected} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-4 sm:flex-row">
            <p className="text-xs text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-35"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-1.5">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-xs text-slate-600">…</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={cn(
                        "h-9 min-w-9 rounded-lg border px-3 text-xs font-semibold transition-colors",
                        p === currentPage
                          ? "border-sky-400/60 bg-sky-500/15 text-sky-300"
                          : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10"
                      )}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-35"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </ChartCard>

      {/* Detail drawer */}
      {selected && <DetailDrawer transaction={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DetailDrawer({ transaction: t, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="animate-fade-up relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#0b1120] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Transaction Details</p>
            <h3 className="mt-1 font-mono text-lg font-bold text-sky-300">{t.id}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <RiskBadge value={t.status} type="status" size="md" />
          <RiskBadge value={t.riskLevel} size="md" />
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs text-slate-500">Amount</p>
          <p className="mt-1 text-3xl font-bold text-white">{formatCurrency(t.amount)}</p>
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-slate-500">Risk score</p>
            <RiskBar score={t.riskScore} className="w-full" />
          </div>
        </div>

        <dl className="mt-5 space-y-0">
          {[
            ["Date / Time", formatDateTime(t.date)],
            ["Type", t.type],
            ["Merchant", t.merchant],
            ["Location", t.location],
            ["Device", t.device],
            ["Account Age", `${t.accountAge} months`],
            ["Currency", t.currency],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-3 text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right font-medium text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold text-slate-200">Model Explanation</p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {t.riskScore >= 70
              ? "High transaction amount combined with an unusual location and elevated velocity pushed this transaction above the fraud threshold."
              : t.riskScore >= 40
                ? "Some behavioural drift detected versus the account's historical pattern. Flagged for review."
                : "All monitored features fall inside this account's normal behavioural range."}
          </p>
          <p className="mt-2 text-[11px] text-slate-600">
            Placeholder text — replaced by Explainable AI output after backend integration.
          </p>
        </div>

        <Button variant="secondary" className="mt-5 w-full" onClick={onClose}>
          Close
        </Button>
      </aside>
    </div>
  );
}
