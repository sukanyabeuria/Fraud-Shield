import { cn } from "../utils/cn";

const VARIANTS = {
  primary:
    "bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 hover:from-sky-400 hover:to-cyan-300 shadow-lg shadow-sky-500/25",
  secondary:
    "bg-white/5 text-slate-100 border border-white/12 hover:bg-white/10 hover:border-white/25",
  ghost: "bg-transparent text-slate-300 hover:bg-white/5 hover:text-white",
  danger:
    "bg-gradient-to-r from-rose-600 to-red-500 text-white hover:from-rose-500 hover:to-red-400 shadow-lg shadow-rose-500/20",
  success:
    "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 shadow-lg shadow-emerald-500/20",
  outline:
    "bg-transparent border border-sky-400/40 text-sky-300 hover:bg-sky-400/10 hover:border-sky-400/70",
};

const SIZES = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-sm",
};

export default function Button({
  as: Tag = "button",
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  ...props
}) {
  return (
    <Tag
      disabled={Tag === "button" ? disabled || loading : undefined}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold tracking-wide transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070f]",
        "disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        Icon && <Icon className="h-4 w-4" />
      )}
      {children}
    </Tag>
  );
}
