import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, ShieldAlert, User } from "lucide-react";
import { mockAlerts } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { cn } from "../utils/cn";

const TITLES = {
  "/dashboard": { title: "Fraud Monitoring Dashboard", sub: "Real-time overview of transaction risk" },
  "/transaction-check": { title: "Transaction Check", sub: "Run a transaction through the risk engine" },
  "/fraud-result": { title: "Fraud Analysis Result", sub: "Model prediction with explainability" },
  "/history": { title: "Transaction History", sub: "Search, filter and audit past transactions" },
  "/analytics": { title: "Risk Analytics", sub: "Trends, distributions and model insights" },
  "/profile": { title: "Profile & Settings", sub: "Manage your account and preferences" },
};

const LEVEL_COLOR = {
  High: "text-rose-300 bg-rose-500/12",
  Medium: "text-amber-300 bg-amber-500/12",
  Low: "text-sky-300 bg-sky-500/12",
};

export default function Navbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  const meta = TITLES[pathname] ?? { title: "Fraud-Shield", sub: "AI powered fraud detection" };

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setAlertsOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const initials = (user?.name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#070b16]/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-white sm:text-base">{meta.title}</h1>
          <p className="hidden truncate text-xs text-slate-500 sm:block">{meta.sub}</p>
        </div>

        {/* Global search (mock) */}
        <div className="relative hidden xl:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            placeholder="Search transaction ID…"
            onKeyDown={(e) => e.key === "Enter" && navigate("/history")}
            className="h-10 w-64 rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
          />
        </div>

        <div ref={wrapRef} className="flex items-center gap-1.5">
          {/* Alerts */}
          <div className="relative">
            <button
              onClick={() => {
                setAlertsOpen((v) => !v);
                setMenuOpen(false);
              }}
              className="relative rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Alerts"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
            </button>

            {alertsOpen && (
              <div className="animate-fade-up absolute right-0 mt-2 w-[300px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120]/98 shadow-2xl backdrop-blur-xl sm:w-[340px]">
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Live Alerts</p>
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    {mockAlerts.length} NEW
                  </span>
                </div>
                <ul className="max-h-80 divide-y divide-white/[0.06] overflow-y-auto">
                  {mockAlerts.map((a) => (
                    <li key={a.id} className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]">
                      <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", LEVEL_COLOR[a.level])}>
                        <ShieldAlert className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-100">{a.title}</p>
                        <p className="truncate text-[11px] text-slate-500">{a.detail}</p>
                        <p className="mt-0.5 text-[10px] text-slate-600">{a.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/history"
                  onClick={() => setAlertsOpen(false)}
                  className="block border-t border-white/8 px-4 py-2.5 text-center text-xs font-semibold text-sky-300 hover:bg-sky-500/10"
                >
                  View all transactions
                </Link>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setMenuOpen((v) => !v);
                setAlertsOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] py-1.5 pl-1.5 pr-2 transition-colors hover:bg-white/[0.08]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-[11px] font-bold text-white">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[120px] truncate text-xs font-semibold text-slate-100">
                  {user?.name ?? "Analyst"}
                </span>
                <span className="block text-[10px] text-slate-500">{user?.role ?? "Risk Analyst"}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
            </button>

            {menuOpen && (
              <div className="animate-fade-up absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120]/98 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-white/8 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <User className="h-4 w-4" /> My Profile
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <button
                  onClick={() => {
                    logout();
                    navigate("/", { replace: true });
                  }}
                  className="flex w-full items-center gap-2.5 border-t border-white/8 px-4 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
