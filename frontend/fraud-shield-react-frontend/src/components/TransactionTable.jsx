import { Eye, Inbox } from "lucide-react";
import RiskBadge from "./RiskBadge";
import { RiskBar } from "./RiskScore";
import { formatCurrency, formatDateTime, toRiskLevelLabel, toStatusLabel } from "../utils/format";
import { cn } from "../utils/cn";

/**
 * Reusable, responsive transaction table.
 * Desktop -> real <table>; Mobile -> stacked cards.
 */
export default function TransactionTable({
  transactions = [],
  onView,
  compact = false,
  className,
}) {
  if (!transactions.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-14 text-center">
        <Inbox className="h-8 w-8 text-slate-600" />
        <p className="text-sm font-medium text-slate-400">No transactions found</p>
        <p className="text-xs text-slate-600">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* ---------- Desktop / tablet ---------- */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-3 font-semibold">Transaction ID</th>
              <th className="px-3 py-3 font-semibold">Date / Time</th>
              <th className="px-3 py-3 font-semibold">Amount</th>
              {!compact && <th className="px-3 py-3 font-semibold">Type</th>}
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Risk Score</th>
              {!compact && <th className="px-3 py-3 font-semibold">Risk Level</th>}
              <th className="px-3 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {transactions.map((t) => (
              <tr key={t.id} className="group transition-colors hover:bg-white/[0.035]">
                <td className="px-3 py-3.5">
                  <span className="font-mono text-xs font-semibold text-sky-300">{t.id}</span>
                  {!compact && (
                    <p className="mt-0.5 text-[11px] text-slate-500">{t.merchant}</p>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-xs text-slate-400">
                  {formatDateTime(t.date)}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-sm font-semibold text-white">
                  {formatCurrency(t.amount)}
                </td>
                {!compact && (
                  <td className="whitespace-nowrap px-3 py-3.5 text-xs text-slate-300">{t.type}</td>
                )}
                <td className="px-3 py-3.5">
                  <RiskBadge value={toStatusLabel(t.status)} type="status" />
                </td>
                <td className="px-3 py-3.5">
                  {t.riskScore === null || t.riskScore === undefined ? (
                    <span className="text-xs text-slate-600">Not scored</span>
                  ) : (
                    <RiskBar score={t.riskScore} />
                  )}
                </td>
                {!compact && (
                  <td className="px-3 py-3.5">
                    {t.riskLevel ? <RiskBadge value={toRiskLevelLabel(t.riskLevel)} /> : "—"}
                  </td>
                )}
                <td className="px-3 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => onView?.(t)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-sky-400/50 hover:bg-sky-400/10 hover:text-sky-300"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Mobile ---------- */}
      <div className="space-y-3 md:hidden">
        {transactions.map((t) => (
          <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-sky-300">{t.id}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{formatDateTime(t.date)}</p>
              </div>
              <RiskBadge value={toStatusLabel(t.status)} type="status" />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-white">{formatCurrency(t.amount, t.currency)}</p>
                <p className="text-[11px] text-slate-500">
                  {[t.type, t.location].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="text-right">
                {t.riskScore === null || t.riskScore === undefined ? (
                  <span className="text-xs text-slate-600">Not scored</span>
                ) : (
                  <>
                    <RiskBar score={t.riskScore} />
                    <p className="mt-1 text-[11px] text-slate-500">
                      {toRiskLevelLabel(t.riskLevel) ?? "—"} risk
                    </p>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onView?.(t)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-sky-400/50 hover:text-sky-300"
            >
              <Eye className="h-3.5 w-3.5" /> View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
