import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "../utils/cn";

const TONES = {
  brand: { ring: "from-sky-500/25", icon: "bg-sky-500/15 text-sky-300", bar: "bg-sky-400" },
  success: {
    ring: "from-emerald-500/25",
    icon: "bg-emerald-500/15 text-emerald-300",
    bar: "bg-emerald-400",
  },
  warning: {
    ring: "from-amber-500/25",
    icon: "bg-amber-500/15 text-amber-300",
    bar: "bg-amber-400",
  },
  danger: { ring: "from-rose-500/25", icon: "bg-rose-500/15 text-rose-300", bar: "bg-rose-400" },
  violet: {
    ring: "from-violet-500/25",
    icon: "bg-violet-500/15 text-violet-300",
    bar: "bg-violet-400",
  },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  change,
  changeLabel = "vs last month",
  footer,
  progress,
  className,
}) {
  const t = TONES[tone] ?? TONES.brand;
  const positive = typeof change === "number" ? change >= 0 : null;

  return (
    <div className={cn("glass-card group overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-0.5", className)}>
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br to-transparent blur-2xl",
          t.ring
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-white lg:text-[28px]">{value}</p>
        </div>
        {Icon && (
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", t.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {typeof progress === "number" && (
        <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className={cn("h-full rounded-full transition-all duration-700", t.bar)}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {(change !== undefined || footer) && (
        <div className="relative mt-4 flex items-center gap-2 text-xs">
          {change !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 font-semibold",
                positive ? "bg-emerald-500/12 text-emerald-300" : "bg-rose-500/12 text-rose-300"
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(change)}%
            </span>
          )}
          <span className="truncate text-slate-500">{footer ?? changeLabel}</span>
        </div>
      )}
    </div>
  );
}
