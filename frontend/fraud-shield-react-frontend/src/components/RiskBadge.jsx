import { cn } from "../utils/cn";

const RISK_STYLES = {
  Low: "bg-emerald-500/12 text-emerald-300 border-emerald-500/30",
  Medium: "bg-amber-500/12 text-amber-300 border-amber-500/30",
  High: "bg-rose-500/12 text-rose-300 border-rose-500/30",
};

const STATUS_STYLES = {
  Safe: "bg-emerald-500/12 text-emerald-300 border-emerald-500/30",
  Genuine: "bg-emerald-500/12 text-emerald-300 border-emerald-500/30",
  Suspicious: "bg-amber-500/12 text-amber-300 border-amber-500/30",
  Fraud: "bg-rose-500/12 text-rose-300 border-rose-500/30",
  Fraudulent: "bg-rose-500/12 text-rose-300 border-rose-500/30",
};

const DOTS = {
  Low: "bg-emerald-400",
  Medium: "bg-amber-400",
  High: "bg-rose-400",
  Safe: "bg-emerald-400",
  Genuine: "bg-emerald-400",
  Suspicious: "bg-amber-400",
  Fraud: "bg-rose-400",
  Fraudulent: "bg-rose-400",
};

/** Generic pill used for both risk levels and transaction statuses. */
export default function RiskBadge({ value, type = "risk", className, size = "sm" }) {
  const styles = type === "status" ? STATUS_STYLES[value] : RISK_STYLES[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs",
        styles ?? "border-white/15 bg-white/5 text-slate-300",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[value] ?? "bg-slate-400")} />
      {value}
      {type === "risk" && " Risk"}
    </span>
  );
}
