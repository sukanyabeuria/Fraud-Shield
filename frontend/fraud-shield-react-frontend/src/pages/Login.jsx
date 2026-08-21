import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Input, { Checkbox } from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  /* Frontend-only validation — server-side validation comes later. */
  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(form.email)) next.email = "Enter a valid email address";
    if (!form.password) next.password = "Password is required";
    else if (form.password.length < 6) next.password = "Password must be at least 6 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice("");
    if (!validate()) return;
    setLoading(true);
    try {
      // FUTURE: POST /api/auth/login → store JWT
      await login({ email: form.email, password: form.password, remember });
      navigate("/dashboard", { replace: true });
    } catch {
      setNotice("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="glass-card animate-fade-up p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Sign in to your Fraud-Shield analyst console.
        </p>

        {notice && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            icon={Mail}
            placeholder="analyst@fraudshield.io"
            value={form.email}
            onChange={update("email")}
            error={errors.email}
            autoComplete="email"
          />

          <Input
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            icon={Lock}
            placeholder="••••••••"
            value={form.password}
            onChange={update("password")}
            error={errors.password}
            autoComplete="current-password"
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <div className="flex items-center justify-between gap-3 pt-1">
            <Checkbox
              label="Remember me"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <button
              type="button"
              onClick={() => setNotice("Password reset link sent to your email (demo only).")}
              className="text-xs font-semibold text-sky-300 hover:text-sky-200"
            >
              Forgot password?
            </button>
          </div>

          <Button type="submit" size="lg" loading={loading} icon={LogIn} className="w-full">
            {loading ? "Verifying…" : "Sign In"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] uppercase tracking-wider text-slate-600">Demo access</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={() => setForm({ email: "analyst@fraudshield.io", password: "shield123" })}
          className="w-full rounded-xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-3 text-left text-xs text-slate-400 transition-colors hover:border-sky-400/40 hover:text-slate-200"
        >
          <span className="font-semibold text-sky-300">Fill demo credentials</span> ·
          analyst@fraudshield.io / shield123
        </button>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-semibold text-sky-300 hover:text-sky-200">
            Create one
          </Link>
        </p>
      </div>

      <p className="mt-5 text-center text-[11px] text-slate-600">
        Protected by mock 2-factor authentication · Frontend demo build
      </p>
    </AuthShell>
  );
}
