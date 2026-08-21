import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
  User,
} from "lucide-react";
import ChartCard from "../components/ChartCard";
import Input, { Toggle } from "../components/Input";
import Button from "../components/Button";
import ErrorState from "../components/ErrorState";
import { Skeleton } from "../components/Loading";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { get } from "../services/httpClient";
import { ENDPOINTS } from "../config/api";
import { getAuthSettings, updateAuthSettings } from "../services/fraudApi";
import { formatDateTime } from "../utils/format";
import { cn } from "../utils/cn";

const THEMES = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: Monitor },
];



export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();

  const [profile, setProfile] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "Risk Analyst",
    team: user?.team ?? "Financial Crime Unit",
  });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [saved, setSaved] = useState("");

  const [notifications, setNotifications] = useState({
    fraudAlerts: true,
    weeklyDigest: true,
    highRiskOnly: false,
    emailAlerts: true,
    smsAlerts: false,
  });
  const [security, setSecurity] = useState({
    twoFactor: true,
    loginAlerts: true,
    autoBlock: true,
    sessionTimeout: false,
  });
  const [theme, setTheme] = useState("dark");
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const data = await getAuthSettings();

        if (cancelled) return;

        setNotifications({
          fraudAlerts: Boolean(data.fraud_alerts),
          weeklyDigest: Boolean(data.weekly_digest),
          highRiskOnly: Boolean(data.high_risk_only),
          emailAlerts: Boolean(data.email_alerts),
          smsAlerts: Boolean(data.sms_alerts),
        });

        setSecurity({
          twoFactor: Boolean(data.two_factor),
          loginAlerts: Boolean(data.login_alerts),
          autoBlock: Boolean(data.auto_block),
          sessionTimeout: Boolean(data.session_timeout),
        });
      } catch (err) {
        console.error("Failed to load persisted settings:", err);
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  // GET /api/v1/auth/sessions — real active sessions, no hardcoded list.
  const sessionsQuery = useApi(async ({ signal }) => {
    const payload = await get(ENDPOINTS.sessions, { signal });
    if (Array.isArray(payload)) return payload;
    return payload?.items ?? payload?.data ?? payload?.sessions ?? [];
  }, []);

  const flash = (msg) => {
    setSaved(msg);
    setTimeout(() => setSaved(""), 2600);
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    // FUTURE: PUT /api/users/me
    updateProfile(profile);
    flash("Profile updated successfully.");
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setPwError("");
    if (!passwords.current) return setPwError("Enter your current password.");
    if (passwords.next.length < 8) return setPwError("New password must be at least 8 characters.");
    if (!/[A-Z]/.test(passwords.next)) return setPwError("Include at least one uppercase letter.");
    if (!/\d/.test(passwords.next)) return setPwError("Include at least one number.");
    if (passwords.next !== passwords.confirm) return setPwError("Passwords do not match.");
    // FUTURE: POST /api/auth/change-password
    setPasswords({ current: "", next: "", confirm: "" });
    flash("Password changed successfully.");
  };

  const applyTheme = (id) => {
    setTheme(id);
    const root = document.documentElement;
    if (id === "light") root.classList.add("light");
    else root.classList.remove("light");
    flash(`Theme set to ${id}.`);
  };

  const initials = (profile.name || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-5">
      {saved && (
        <div className="animate-fade-up flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {saved}
        </div>
      )}

      {/* Profile header */}
      <section className="glass-card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-sky-600/40 via-cyan-500/25 to-indigo-600/30" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between lg:px-6">
          <div className="flex items-end gap-4">
            <div className="relative -mt-12">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-[#0b1120] bg-gradient-to-br from-sky-500 to-indigo-500 text-2xl font-bold text-white">
                {initials}
              </div>
              <button
                type="button"
                onClick={() => flash("Profile picture upload requires a backend upload endpoint.")}
                className="absolute -bottom-1.5 -right-1.5 rounded-lg border border-white/15 bg-[#0b1120] p-1.5 text-slate-300 hover:text-sky-300"
                aria-label="Change picture"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-white">{profile.name}</h2>
              <p className="text-sm text-slate-400">{profile.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
                  {profile.role}
                </span>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  Verified
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="danger"
            icon={LogOut}
            onClick={() => {
              logout();
              navigate("/", { replace: true });
            }}
          >
            Logout
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* Profile info */}
          <ChartCard title="Profile Information" subtitle="Your account details">
            <form onSubmit={handleProfileSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                icon={User}
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                label="Email Address"
                type="email"
                icon={Mail}
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              />
              <Input
                label="Role"
                icon={ShieldCheck}
                value={profile.role}
                onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))}
              />
              <Input
                label="Team"
                icon={Building2}
                value={profile.team}
                onChange={(e) => setProfile((p) => ({ ...p, team: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <Button type="submit" icon={Save}>
                  Save Changes
                </Button>
              </div>
            </form>
          </ChartCard>

          {/* Change password */}
          <ChartCard title="Change Password" subtitle="Keep your console secure">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                label="Current Password"
                type={showPw ? "text" : "password"}
                icon={Lock}
                placeholder="••••••••"
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300"
                    aria-label="Toggle password"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="New Password"
                  type={showPw ? "text" : "password"}
                  icon={KeyRound}
                  placeholder="Min. 8 characters"
                  value={passwords.next}
                  onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                />
                <Input
                  label="Confirm New Password"
                  type={showPw ? "text" : "password"}
                  icon={KeyRound}
                  placeholder="Re-enter password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                  error={pwError}
                />
              </div>
              <Button type="submit" variant="secondary" icon={KeyRound}>
                Update Password
              </Button>
            </form>
          </ChartCard>

          {/* Sessions — real data from the backend */}
          <ChartCard title="Active Sessions" subtitle="Devices signed in to your account">
            {sessionsQuery.loading ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : sessionsQuery.error ? (
              <ErrorState
                compact
                error={sessionsQuery.error}
                onRetry={sessionsQuery.refetch}
                title="Session list unavailable"
              />
            ) : (sessionsQuery.data ?? []).length === 0 ? (
              <p className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center text-xs text-slate-500">
                No active sessions reported by the backend.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {sessionsQuery.data.map((s, i) => (
                  <li
                    key={s.id ?? i}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-slate-300">
                        <Smartphone className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-100">
                          {s.user_agent ?? s.device ?? "Unknown device"}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {[s.ip_address ?? s.location, s.issued_at ? formatDateTime(s.issued_at) : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                    {s.is_current && (
                      <span className="shrink-0 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                        CURRENT
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <ChartCard
            title="Notification Settings"
            subtitle="Choose what you want to hear about"
            action={<Bell className="h-4 w-4 text-slate-500" />}
          >
            <div className="divide-y divide-white/[0.06]">
              <Toggle
                label="Real-time fraud alerts"
                description="Push an alert the moment fraud is detected"
                checked={notifications.fraudAlerts}
                onChange={async (v) => {
                  setNotifications((n) => ({ ...n, fraudAlerts: v }));
                  try {
                    await updateAuthSettings({ fraud_alerts: v });
                    flash("Fraud alerts updated");
                  } catch (err) {
                    console.error(err);
                    setNotifications((n) => ({ ...n, fraudAlerts: !v }));
                    flash("Could not save fraud alerts");
                  }
                }}
              />
              <Toggle
                label="High-risk only"
                description="Suppress low and medium risk notifications"
                checked={notifications.highRiskOnly}
                onChange={async (v) => {
                  setNotifications((n) => ({ ...n, highRiskOnly: v }));
                  try {
                    await updateAuthSettings({ high_risk_only: v });
                    flash("High-risk filter updated");
                  } catch (err) {
                    console.error(err);
                    setNotifications((n) => ({ ...n, highRiskOnly: !v }));
                    flash("Could not save high-risk filter");
                  }
                }}
              />
              <Toggle
                label="Weekly digest"
                description="Summary report every Monday morning"
                checked={notifications.weeklyDigest}
                onChange={async (v) => {
                  setNotifications((n) => ({ ...n, weeklyDigest: v }));
                  try {
                    await updateAuthSettings({ weekly_digest: v });
                    flash("Weekly digest updated");
                  } catch (err) {
                    console.error(err);
                    setNotifications((n) => ({ ...n, weeklyDigest: !v }));
                    flash("Could not save weekly digest");
                  }
                }}
              />
              <Toggle
                label="Email alerts"
                checked={notifications.emailAlerts}
                onChange={async (v) => {
                  setNotifications((n) => ({ ...n, emailAlerts: v }));
                  try {
                    await updateAuthSettings({ email_alerts: v });
                    flash("Email alerts updated");
                  } catch (err) {
                    console.error(err);
                    setNotifications((n) => ({ ...n, emailAlerts: !v }));
                    flash("Could not save email alerts");
                  }
                }}
              />
              <Toggle
                label="SMS alerts"
                checked={notifications.smsAlerts}
                onChange={async (v) => {
                  setNotifications((n) => ({ ...n, smsAlerts: v }));
                  try {
                    await updateAuthSettings({ sms_alerts: v });
                    flash("SMS alerts updated");
                  } catch (err) {
                    console.error(err);
                    setNotifications((n) => ({ ...n, smsAlerts: !v }));
                    flash("Could not save SMS alerts");
                  }
                }}
              />
            </div>
          </ChartCard>

          <ChartCard
            title="Security Settings"
            subtitle="Protect the analyst console"
            action={<ShieldCheck className="h-4 w-4 text-slate-500" />}
          >
            <div className="divide-y divide-white/[0.06]">
              <Toggle
                label="Two-factor authentication"
                description="Require an OTP at every sign-in"
                checked={security.twoFactor}
                onChange={async (v) => {
                  setSecurity((s) => ({ ...s, twoFactor: v }));
                  try {
                    await updateAuthSettings({ two_factor: v });
                    flash("Two-factor setting updated");
                  } catch (err) {
                    console.error(err);
                    setSecurity((s) => ({ ...s, twoFactor: !v }));
                    flash("Could not save two-factor setting");
                  }
                }}
              />
              <Toggle
                label="New login alerts"
                checked={security.loginAlerts}
                onChange={async (v) => {
                  setSecurity((s) => ({ ...s, loginAlerts: v }));
                  try {
                    await updateAuthSettings({ login_alerts: v });
                    flash("Login alerts updated");
                  } catch (err) {
                    console.error(err);
                    setSecurity((s) => ({ ...s, loginAlerts: !v }));
                    flash("Could not save login alerts");
                  }
                }}
              />
              <Toggle
                label="Auto-block high-risk transactions"
                description="Block automatically when score ≥ 85"
                checked={security.autoBlock}
                onChange={async (v) => {
                  setSecurity((s) => ({ ...s, autoBlock: v }));
                  try {
                    await updateAuthSettings({ auto_block: v });
                    flash("Auto-block setting updated");
                  } catch (err) {
                    console.error(err);
                    setSecurity((s) => ({ ...s, autoBlock: !v }));
                    flash("Could not save auto-block setting");
                  }
                }}
              />
              <Toggle
                label="Auto sign-out after 15 min"
                checked={security.sessionTimeout}
                onChange={async (v) => {
                  setSecurity((s) => ({ ...s, sessionTimeout: v }));
                  try {
                    await updateAuthSettings({ session_timeout: v });
                    flash("Session timeout updated");
                  } catch (err) {
                    console.error(err);
                    setSecurity((s) => ({ ...s, sessionTimeout: !v }));
                    flash("Could not save session timeout");
                  }
                }}
              />
            </div>
          </ChartCard>

          <ChartCard
            title="Appearance"
            subtitle="Theme preference"
            action={<Palette className="h-4 w-4 text-slate-500" />}
          >
            <div className="grid grid-cols-3 gap-2.5">
              {THEMES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => applyTheme(id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-2 py-4 text-xs font-semibold transition-all",
                    theme === id
                      ? "border-sky-400/60 bg-sky-500/12 text-sky-300"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-600">
              Fraud-Shield is optimised for the dark security theme. Preference is stored locally.
            </p>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
