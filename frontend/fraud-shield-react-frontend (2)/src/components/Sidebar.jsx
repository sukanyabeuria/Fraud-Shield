import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  History,
  LayoutDashboard,
  LogOut,
  ScanSearch,
  Settings,
  X,
} from "lucide-react";
import Logo from "./Logo";
import BackendStatus from "./BackendStatus";
import { cn } from "../utils/cn";
import { useAuth } from "../context/AuthContext";

export const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Transaction Check", to: "/transaction-check", icon: ScanSearch },
  { label: "Transaction History", to: "/history", icon: History },
  { label: "Risk Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Profile / Settings", to: "/profile", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-white/8 bg-[#080c18]/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/8 px-5">
          <Logo />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Monitoring
          </p>
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-sky-500/18 to-transparent text-white"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "absolute left-0 h-6 w-1 rounded-r-full bg-sky-400 transition-opacity",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      isActive ? "text-sky-300" : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Live backend status — real GET /api/v1/health poll */}
        <BackendStatus />


        <div className="border-t border-white/8 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-xs font-bold text-white">
              {(user?.name ?? "U")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-100">{user?.name ?? "Analyst"}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.role ?? "Risk Analyst"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-300/90 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
