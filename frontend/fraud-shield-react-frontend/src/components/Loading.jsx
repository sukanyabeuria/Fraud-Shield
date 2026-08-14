import { ShieldCheck } from "lucide-react";
import { cn } from "../utils/cn";

/** Inline spinner */
export function Spinner({ className }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400",
        className
      )}
    />
  );
}

/** Full-panel loading state with optional message list (used while "the model runs"). */
export default function Loading({ title = "Loading", message, steps, className }) {
  return (
    <div className={cn("flex min-h-[320px] flex-col items-center justify-center gap-5 p-8 text-center", className)}>
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-sky-500/15" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-sky-400 border-r-cyan-400" />
        <ShieldCheck className="h-8 w-8 text-sky-300" />
      </div>
      <div>
        <p className="text-base font-semibold text-white">{title}</p>
        {message && <p className="mt-1 text-sm text-slate-400">{message}</p>}
      </div>
      {steps?.length > 0 && (
        <ul className="space-y-1.5 text-xs text-slate-500">
          {steps.map((s, i) => (
            <li key={s} className="animate-fade-up" style={{ animationDelay: `${i * 180}ms` }}>
              <span className="mr-2 text-sky-400">▸</span>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Skeleton block for table/card placeholders. */
export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/[0.06]", className)} />;
}
