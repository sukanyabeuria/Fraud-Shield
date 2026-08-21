import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Filter, RotateCcw, Search, X } from "lucide-react";
import ChartCard from "../components/ChartCard";
import TransactionTable from "../components/TransactionTable";
import RiskBadge from "../components/RiskBadge";
import { RiskBar } from "../components/RiskScore";
import Button from "../components/Button";
import { Select } from "../components/Input";
import ErrorState from "../components/ErrorState";
import { Skeleton } from "../components/Loading";
import { useApi } from "../hooks/useApi";
import { getTransactions } from "../services/fraudApi";
import {
  DATE_RANGE_FILTERS,
  RISK_LEVEL_FILTERS,
  STATUS_FILTERS,
} from "../constants/transactionOptions";
import {
  formatCurrency,
  formatDateTime,
  toRiskLevelLabel,
  toStatusLabel,
} from "../utils/format";
import { cn } from "../utils/cn";

const PAGE_SIZE = 8;

/** Convert the date-range filter into an ISO lower bound for the API. */
function rangeToDateFrom(range) {
  const ms = { "24h": 864e5, "7d": 6048e5, "30d": 2592e6 }[range];
  return ms ? new Date(Date.now() - ms).toISOString() : null;
}

export default function TransactionHistory() {
  const { state } = useLocation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [risk, setRisk] = useState("All");
  const [range, setRange] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  // Debounce the search box so we do not hammer the backend on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  /**
   * GET /api/v1/transactions — filtering, sorting and pagination are performed
   * by the backend against PostgreSQL. Nothing is filtered from a local array.
   */
  const { data, error, loading, refetch } = useApi(
    ({ signal }) =>
      getTransactions(
        {
          search: debouncedQuery || null,
          status: status === "All" ? null : status.toUpperCase(),
          riskLevel: risk === "All" ? null : risk.toUpperCase(),
          dateFrom: rangeToDateFrom(range),
          sort: "date_desc",
          page,
          pageSize: PAGE_SIZE,
          limit: PAGE_SIZE,
        },
        { signal }
      ),
    [debouncedQuery, status, risk, range, page]
  );

  const rows = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Deep-link from the Dashboard "View" button.
  useEffect(() => {
    if (state?.focusId && rows.length) {
      const found = rows.find((t) => t.id === state.focusId);
      if (found) setSelected(found);
    }
  }, [state, rows]);

  const reset = () => {
    setQuery("");
    setDebouncedQuery("");
    setStatus("All");
    setRisk("All");
    setRange("all");
    setPage(1);
  };

  return (
    <div className="space-y-5">
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
              onChange={(e) => setQuery(e.target.value)}
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
            {STATUS_FILTERS.map((s) => (
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
            {RISK_LEVEL_FILTERS.map((r) => (
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
              {DATE_RANGE_FILTERS.map((d) => (
                <option key={d.value} value={d.value} className="bg-[#0b1120]">
                  {d.label}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              size="md"
              onClick={reset}
              className="shrink-0 px-3"
              aria-label="Reset filters"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Table */}
      <ChartCard
        title="Transaction History"
        subtitle={
          loading
            ? "Loading transactions…"
            : error
              ? "Could not load transactions"
              : `${total} transaction(s) · page ${page} of ${totalPages}`
        }
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <TransactionTable transactions={rows} onView={setSelected} />

            {totalPages > 1 && (
              <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-4 sm:flex-row">
                <p className="text-xs text-slate-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-35"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center gap-1.5">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-xs text-slate-600">…</span>
                        )}
                        <button
                          onClick={() => setPage(p)}
                          className={cn(
                            "h-9 min-w-9 rounded-lg border px-3 text-xs font-semibold transition-colors",
                            p === page
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
                    disabled={page === totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-35"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </ChartCard>

      {selected && <DetailDrawer transaction={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/** Detail drawer — renders only fields the backend actually returned. */
function DetailDrawer({ transaction: t, onClose }) {
  const rows = [
    ["Date / Time", t.date ? formatDateTime(t.date) : null],
    ["Type", t.type],
    ["Merchant", t.merchant],
    ["Location", t.location],
    ["Device", t.device],
    ["Account Age", t.accountAge !== undefined && t.accountAge !== null ? `${t.accountAge} months` : null],
    ["Currency", t.currency],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="animate-fade-up relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-[#0b1120] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Transaction Details</p>
            <h3 className="mt-1 break-all font-mono text-lg font-bold text-sky-300">{t.id}</h3>
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
          {t.status && <RiskBadge value={toStatusLabel(t.status)} type="status" size="md" />}
          {t.riskLevel && <RiskBadge value={toRiskLevelLabel(t.riskLevel)} size="md" />}
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs text-slate-500">Amount</p>
          <p className="mt-1 text-3xl font-bold text-white">{formatCurrency(t.amount, t.currency)}</p>
          {t.riskScore !== null && t.riskScore !== undefined && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs text-slate-500">Risk score</p>
              <RiskBar score={t.riskScore} className="w-full" />
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <dl className="mt-5 space-y-0">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-3 text-sm"
              >
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium text-slate-200">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        <Button variant="secondary" className="mt-5 w-full" onClick={onClose}>
          Close
        </Button>
      </aside>
    </div>
  );
}
