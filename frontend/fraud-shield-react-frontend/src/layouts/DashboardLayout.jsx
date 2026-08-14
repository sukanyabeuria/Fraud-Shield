import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

/**
 * Protected app shell: fixed sidebar (desktop) + collapsible drawer (mobile)
 * + sticky top navbar + scrollable main content area.
 */
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, booting } = useAuth();

  if (booting) return null;
  // FUTURE: replace with real session/JWT validation
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="grid-bg min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-[264px]">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] p-4 lg:p-6">
          <Outlet />
        </main>
        <footer className="border-t border-white/5 px-6 py-5 text-center text-[11px] text-slate-600">
          Fraud-Shield · AI Risk Engine · Demo build with mock data — backend, ML model &amp;
          Explainable AI integration pending
        </footer>
      </div>
    </div>
  );
}
