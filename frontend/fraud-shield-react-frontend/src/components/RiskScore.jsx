import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { riskLevelFromScore } from "../data/mockData";

const COLORS = {
  Low: { stroke: "#22c55e", text: "text-emerald-300", glow: "shadow-emerald-500/30" },
  Medium: { stroke: "#f59e0b", text: "text-amber-300", glow: "shadow-amber-500/30" },
  High: { stroke: "#ef4444", text: "text-rose-300", glow: "shadow-rose-500/30" },
};

/**
 * Animated circular risk gauge (0–100).
 * FUTURE: `score` will come straight from the ML model response.
 */
export default function RiskScore({ score = 0, size = 180, stroke = 14, label = "Risk Score", className }) {
  const [animated, setAnimated] = useState(0);
  const level = riskLevelFromScore(score);
  const color = COLORS[level];
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 120);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`riskGrad-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color.stroke} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color.stroke} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#riskGrad-${level})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-bold tabular-nums", color.text)}>{Math.round(animated)}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </span>
        <span className={cn("mt-1 text-xs font-semibold", color.text)}>{level}</span>
      </div>
    </div>
  );
}

/** Slim horizontal bar variant, used inside tables & lists. */
export function RiskBar({ score, showValue = true, className }) {
  const level = riskLevelFromScore(score);
  const color = COLORS[level].stroke;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/8 sm:w-24">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      {showValue && (
        <span className="w-6 text-xs font-semibold tabular-nums text-slate-300">{score}</span>
      )}
    </div>
  );
}
