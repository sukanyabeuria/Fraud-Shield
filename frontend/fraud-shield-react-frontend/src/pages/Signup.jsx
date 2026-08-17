import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Lock, Mail, User, UserPlus } from "lucide-react";
import AuthShell from "../components/AuthShell";
import Input, { Checkbox } from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { cn } from "../utils/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH = [
  { label: "Very weak", color: "bg-rose-500", text: "text-rose-400" },
  { label: "Weak", color: "bg-rose-500", text: "text-rose-400" },
  { label: "Fair", color: "bg-amber-500", text: "text-amber-400" },
  { label: "Good", color: "bg-sky-500", text: "text-sky-400" },
  { label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" },
  { label: "Excellent", color: "bg-emerald-400", text: "text-emerald-300" },
];

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [show, setShow] = useState({ pw: false, confirm: false });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => scorePassword(form.password), [form.password]);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  /* Frontend-only validation */
  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Full name is required";
    else if (form.fullName.trim().length < 3) next.fullName = "Enter your full name";

    if (!form.email.trim()) next.email = "Email is required";
    else if (!EMAIL_RE.test(form.email)) next.email = "Enter a valid email address";

    if (!form.password) next.password = "Password is required";
    else if (form.password.length < 8) next.password = "Minimum 8 characters";
    else if (!/[A-Z]/.test(form.password)) next.password = "Include at least one uppercase letter";
    else if (!/\d/.test(form.password)) next.password = "Include at least one number";

    if (!form.confirmPassword) next.confirmPassword = "Please confirm your password";
    else if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice("");
    if (!validate()) return;
    if (!agreed) {
      setNotice("You must accept the Terms & Conditions to continue.");
      return;
    }
    setLoading(true);
    try {
      // Real backend call — see src/context/AuthContext.jsx
      await signup(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setNotice(err?.message ?? "Unable to create the account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="glass-card animate-fade-up p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Join the Fraud-Shield analyst console in under a minute.
        </p>

        {notice && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <Input
            label="Full Name"
            name="fullName"
            icon={User}
            placeholder="Aarav Sharma"
            value={form.fullName}
            onChange={update("fullName")}
            error={errors.fullName}
            autoComplete="name"
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            icon={Mail}
            placeholder="you@company.com"
            value={form.email}
            onChange={update("email")}
            error={errors.email}
            autoComplete="email"
          />

          <div>
            <Input
              label="Password"
              name="password"
              type={show.pw ? "text" : "password"}
              icon={Lock}
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={update("password")}
              error={errors.password}
              autoComplete="new-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShow((s) => ({ ...s, pw: !s.pw }))}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
                  aria-label="Toggle password visibility"
                >
                  {show.pw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {form.password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        i < strength ? STRENGTH[strength].color : "bg-white/10"
                      )}
                    />
                  ))}
                </div>
                <span className={cn("text-[11px] font-semibold", STRENGTH[strength].text)}>
                  {STRENGTH[strength].label}
                </span>
              </div>
            )}
          </div>

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type={show.confirm ? "text" : "password"}
            icon={Lock}
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
            error={errors.confirmPassword}
            autoComplete="new-password"
            rightSlot={
              <button
                type="button"
                onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
                aria-label="Toggle confirm password visibility"
              >
                {show.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <Checkbox
            className="pt-1"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              setNotice("");
            }}
            label={
              <span className="text-xs text-slate-400">
                I agree to the{" "}
                <span className="font-semibold text-sky-300">Terms &amp; Conditions</span> and the{" "}
                <span className="font-semibold text-sky-300">Privacy Policy</span>.
              </span>
            }
          />

          <Button type="submit" size="lg" loading={loading} icon={UserPlus} className="w-full">
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/" className="font-semibold text-sky-300 hover:text-sky-200">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-5 text-center text-[11px] text-slate-600">
        Accounts are created through the Fraud-Shield backend API.
      </p>
    </AuthShell>
  );
}
