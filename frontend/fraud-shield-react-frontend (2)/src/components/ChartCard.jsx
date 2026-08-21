import { cn } from "../utils/cn";

/** Consistent wrapper for every Recharts visualisation. */
export default function ChartCard({ title, subtitle, action, children, className, bodyClassName }) {
  return (
    <section className={cn("glass-card flex flex-col p-5", className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white lg:text-base">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={cn("min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Shared dark tooltip for Recharts. */
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/12 bg-[#0b1120]/95 px-3 py-2 shadow-xl backdrop-blur">
      {label !== undefined && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
      )}
      {payload.map((item) => (
        <p key={item.dataKey ?? item.name} className="flex items-center gap-2 text-xs text-slate-200">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: item.color ?? item.payload?.color ?? "#38bdf8" }}
          />
          <span className="capitalize text-slate-400">{item.name}</span>
          <span className="ml-auto font-semibold text-white">
            {formatter ? formatter(item.value) : item.value?.toLocaleString("en-IN")}
          </span>
        </p>
      ))}
    </div>
  );
}
