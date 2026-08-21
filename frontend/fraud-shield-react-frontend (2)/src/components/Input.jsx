import { cn } from "../utils/cn";

const baseField =
  "w-full rounded-xl border bg-white/[0.04] px-4 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/60 disabled:opacity-50";

export default function Input({
  label,
  error,
  hint,
  icon: Icon,
  rightSlot,
  className,
  containerClassName,
  id,
  ...props
}) {
  const inputId = id || props.name;
  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        )}
        <input
          id={inputId}
          className={cn(
            baseField,
            "h-11",
            Icon && "pl-10",
            rightSlot && "pr-11",
            error ? "border-rose-500/70 focus:ring-rose-500/40" : "border-white/10",
            className
          )}
          {...props}
        />
        {rightSlot && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Select({ label, error, hint, children, className, containerClassName, id, ...props }) {
  const selectId = id || props.name;
  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          baseField,
          "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat pr-10",
          error ? "border-rose-500/70" : "border-white/10",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="text-xs font-medium text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, className, ...props }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-slate-300", className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-white/20 bg-white/5 transition-colors checked:border-sky-400 checked:bg-sky-500 checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 stroke=%22%23050b14%22 stroke-width=%223%22 viewBox=%220 0 24 24%22><path d=%22M20 6L9 17l-5-5%22/></svg>')] checked:bg-center checked:bg-no-repeat"
        {...props}
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-sky-500" : "bg-white/15"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
