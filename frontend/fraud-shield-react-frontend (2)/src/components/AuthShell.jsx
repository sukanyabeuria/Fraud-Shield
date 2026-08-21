import { Activity, BrainCircuit, Lock, ShieldCheck } from "lucide-react";
import Logo from "./Logo";

const HIGHLIGHTS = [
  {
    icon: BrainCircuit,
    title: "ML Risk Scoring",
    text: "Every transaction scored 0–100 in under 200 ms.",
  },
  {
    icon: Activity,
    title: "Explainable AI",
    text: "Understand exactly why a transaction was flagged.",
  },
  {
    icon: Lock,
    title: "Bank-grade Security",
    text: "AES-256 encryption with full audit trails.",
  },
];

/** Split-screen wrapper shared by Login & Signup pages. */
export default function AuthShell({ children }) {
  return (
    <div className="grid-bg flex min-h-screen">
      {/* Brand / marketing panel */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/8 p-10 lg:flex xl:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(rgba(56,189,248,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.25) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>

        <Logo size="lg" className="relative" />

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Real-time protection
          </span>
          <h2 className="mt-5 text-4xl font-bold leading-tight text-white xl:text-5xl">
            Detect fraud before <span className="text-gradient">it costs you.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400 xl:text-base">
            Fraud-Shield combines machine learning with Explainable AI to score every financial
            transaction in real time — and tells your analysts exactly why.
          </p>

          <ul className="mt-9 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sky-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{title}</p>
                  <p className="text-xs text-slate-500">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-6 text-xs text-slate-500">
          <span>
            <strong className="text-white">12,847</strong> transactions scanned
          </span>
          <span className="h-4 w-px bg-white/10" />
          <span>
            <strong className="text-white">96.4%</strong> detection accuracy
          </span>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex w-full items-center justify-center p-5 sm:p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-7 flex justify-center lg:hidden">
            <Logo size="lg" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
