// HashRouter keeps deep links working when the built app is served as a
// single static file. Swap for BrowserRouter once a server with SPA
// fallback routing is available.
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import TransactionCheck from "./pages/TransactionCheck";
import FraudResult from "./pages/FraudResult";
import TransactionHistory from "./pages/TransactionHistory";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";

/**
 * Fraud-Shield — application routes
 *
 *  /                  Login          (public)
 *  /signup            Sign Up        (public)
 *  /dashboard         Dashboard      (protected)
 *  /transaction-check Transaction Check
 *  /fraud-result      Fraud Result
 *  /history           Transaction History
 *  /analytics         Risk Analytics
 *  /profile           Profile / Settings
 */
export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected app shell */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transaction-check" element={<TransactionCheck />} />
            <Route path="/fraud-result" element={<FraudResult />} />
            <Route path="/history" element={<TransactionHistory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
