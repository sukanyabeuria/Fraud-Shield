import { ShieldCheck } from "lucide-react";
import { cn } from "../utils/cn";

export default function Logo({ size = "md", showText = true, className }) {
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/30",
          box
        )}
      >
        <ShieldCheck className={cn("text-slate-950", icon)} strokeWidth={2.4} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#05070f] bg-emerald-400" />
      </div>
      {showText && (
        <div className="leading-none">
          <p className={cn("font-bold tracking-tight text-white", text)}>
            Fraud<span className="text-gradient">Shield</span>
          </p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            AI Risk Engine
          </p>
        </div>
      )}
    </div>
  );
}
