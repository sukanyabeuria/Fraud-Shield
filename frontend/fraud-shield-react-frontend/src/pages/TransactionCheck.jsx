import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BrainCircuit,
  Building2,
  CalendarClock,
  CreditCard,
  Hash,
  Info,
  MapPin,
  RefreshCw,
  ScanSearch,
  Smartphone,
  Wallet,
} from "lucide-react";
import Input, { Checkbox, Select } from "../components/Input";
import Button from "../components/Button";
import Loading from "../components/Loading";
import ChartCard from "../components/ChartCard";
import ErrorState from "../components/ErrorState";
import {
  DEVICE_TYPES,
  LOCATIONS,
  MERCHANT_CATEGORIES,
  TRANSACTION_TYPES,
} from "../constants/transactionOptions";
import { analyzeTransaction } from "../services/fraudApi";
import { ERROR_KIND } from "../services/httpClient";

/**
 * Generate a genuinely unique client-side reference for this submission.
 * Uses crypto.randomUUID (not Math.random) — this is a real identifier for the
 * transaction the user is about to submit, not fabricated application data.
 * The backend may override it with its own ID in the response.
 */
const genId = () => {
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now());
  return `TXN-${uuid.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
};

const EMPTY = {
  transactionId: genId(),
  amount: "",
  transactionType: "Transfer",
  accountAge: "",
  location: "Mumbai, IN",
  deviceType: "Mobile App",
  transactionDate: new Date().toISOString().slice(0, 10),
  transactionTime: new Date().toTimeString().slice(0, 5),
  transactionCount: "",
  previousAmount: "",
  merchantCategory: "Retail",
  accountBalance: "",
  ipAddress: "",
  cardPresent: false,
  internationalTransfer: false,
  newRecipient: false,
};

export default function TransactionCheck() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  /* Frontend-only validation */
  const validate = () => {
    const next = {};
    if (!form.transactionId.trim()) next.transactionId = "Transaction ID is required";
    if (!form.amount) next.amount = "Amount is required";
    else if (Number(form.amount) <= 0) next.amount = "Amount must be greater than 0";
    if (form.accountAge === "") next.accountAge = "Account age is required";
    else if (Number(form.accountAge) < 0) next.accountAge = "Cannot be negative";
    if (form.transactionCount === "") next.transactionCount = "Enter number of transactions";
    if (form.previousAmount === "") next.previousAmount = "Enter previous amount";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setAnalyzing(true);

    /**
     * REAL ML CALL
     * ------------
     * POST /api/v1/transactions/analyze
     *   → FastAPI validates the payload
     *   → XGBoost model scores it
     *   → SHAP produces the attributions
     *   → the result is persisted in PostgreSQL by the backend
     *   → the real response is rendered on the Fraud Result page.
     */
    try {
      const result = await analyzeTransaction(form);
      navigate("/fraud-result", { state: { result } });
    } catch (err) {
      setSubmitError(err);
      // Surface field-level validation errors coming back from FastAPI (422).
      if (err?.kind === ERROR_KIND.VALIDATION && Array.isArray(err.details)) {
        const fieldErrors = {};
        err.details.forEach((d) => {
          const loc = Array.isArray(d.loc) ? d.loc.filter((p) => p !== "body") : [];
          const key = loc[loc.length - 1];
          if (key) fieldErrors[key] = d.msg;
        });
        if (Object.keys(fieldErrors).length) setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
    } finally {
      setAnalyzing(false);
    }
  };

  if (analyzing) {
    return (
      <div className="glass-card animate-fade-up">
        <Loading
          title="Analyzing transaction…"
          message={`Sending ${form.transactionId} to the Fraud-Shield ML service`}
          steps={[
            "Posting transaction to the backend",
            "Validating the request payload",
            "Running the fraud detection model",
            "Generating Explainable AI attributions",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Intro */}
      <section className="glass-card animate-fade-up flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Real-time Transaction Screening</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Fill in the transaction attributes below. The risk engine returns a 0–100 score plus a
              human-readable explanation of every contributing factor.
            </p>
          </div>
        </div>
      </section>

      {/* Real backend error — no fabricated result is ever shown */}
      {submitError && (
        <ErrorState
          error={submitError}
          onRetry={() => setSubmitError(null)}
          title={
            submitError.kind === ERROR_KIND.VALIDATION
              ? "The backend rejected this transaction"
              : undefined
          }
        />
      )}

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* Core details */}
          <ChartCard title="Transaction Details" subtitle="Core attributes of the payment">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Transaction ID"
                name="transactionId"
                icon={Hash}
                value={form.transactionId}
                onChange={set("transactionId")}
                error={errors.transactionId}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, transactionId: genId() }))}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-sky-300"
                    aria-label="Regenerate ID"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                }
              />
              <Input
                label="Transaction Amount (₹)"
                name="amount"
                type="number"
                min="0"
                icon={Wallet}
                placeholder="e.g. 45000"
                value={form.amount}
                onChange={set("amount")}
                error={errors.amount}
              />
              <Select label="Transaction Type" name="transactionType" value={form.transactionType} onChange={set("transactionType")}>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#0b1120]">
                    {t}
                  </option>
                ))}
              </Select>
              <Select label="Merchant Category" name="merchantCategory" value={form.merchantCategory} onChange={set("merchantCategory")}>
                {MERCHANT_CATEGORIES.map((t) => (
                  <option key={t} value={t} className="bg-[#0b1120]">
                    {t}
                  </option>
                ))}
              </Select>
              <Input
                label="Transaction Date"
                name="transactionDate"
                type="date"
                icon={CalendarClock}
                value={form.transactionDate}
                onChange={set("transactionDate")}
              />
              <Input
                label="Transaction Time"
                name="transactionTime"
                type="time"
                icon={CalendarClock}
                value={form.transactionTime}
                onChange={set("transactionTime")}
                hint="Transactions between 00:00–05:00 carry higher risk"
              />
            </div>
          </ChartCard>

          {/* Account & behaviour */}
          <ChartCard title="Account & Behaviour" subtitle="Historical context used by the model">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Account Age (months)"
                name="accountAge"
                type="number"
                min="0"
                icon={Building2}
                placeholder="e.g. 24"
                value={form.accountAge}
                onChange={set("accountAge")}
                error={errors.accountAge}
              />
              <Input
                label="Transactions (last 24 h)"
                name="transactionCount"
                type="number"
                min="0"
                icon={CreditCard}
                placeholder="e.g. 5"
                value={form.transactionCount}
                onChange={set("transactionCount")}
                error={errors.transactionCount}
              />
              <Input
                label="Previous Transaction Amount (₹)"
                name="previousAmount"
                type="number"
                min="0"
                icon={Wallet}
                placeholder="e.g. 3500"
                value={form.previousAmount}
                onChange={set("previousAmount")}
                error={errors.previousAmount}
              />
              <Input
                label="Account Balance (₹)"
                name="accountBalance"
                type="number"
                min="0"
                icon={Wallet}
                placeholder="e.g. 120000"
                value={form.accountBalance}
                onChange={set("accountBalance")}
              />
            </div>
          </ChartCard>

          {/* Device & location */}
          <ChartCard title="Device & Location" subtitle="Origin fingerprint signals">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Transaction Location" name="location" value={form.location} onChange={set("location")}>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l} className="bg-[#0b1120]">
                    {l}
                  </option>
                ))}
              </Select>
              <Select label="Device Type" name="deviceType" value={form.deviceType} onChange={set("deviceType")}>
                {DEVICE_TYPES.map((d) => (
                  <option key={d} value={d} className="bg-[#0b1120]">
                    {d}
                  </option>
                ))}
              </Select>
              <Input
                label="IP Address (optional)"
                name="ipAddress"
                icon={MapPin}
                placeholder="e.g. 49.36.212.10"
                value={form.ipAddress}
                onChange={set("ipAddress")}
                containerClassName="sm:col-span-2"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:grid-cols-3">
              <Checkbox label="Card physically present" checked={form.cardPresent} onChange={set("cardPresent")} />
              <Checkbox
                label="International transfer"
                checked={form.internationalTransfer}
                onChange={set("internationalTransfer")}
              />
              <Checkbox label="First-time recipient" checked={form.newRecipient} onChange={set("newRecipient")} />
            </div>
          </ChartCard>
        </div>

        {/* Sidebar summary + submit */}
        <aside className="space-y-4">
          <div className="glass-card sticky top-20 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Smartphone className="h-4 w-4 text-sky-300" /> Input Summary
            </h3>
            <dl className="mt-4 space-y-2.5 text-xs">
              {[
                ["Transaction ID", form.transactionId],
                ["Amount", form.amount ? `₹${Number(form.amount).toLocaleString("en-IN")}` : "—"],
                ["Type", form.transactionType],
                ["Location", form.location],
                ["Device", form.deviceType],
                ["Time", form.transactionTime || "—"],
                ["Account age", form.accountAge ? `${form.accountAge} months` : "—"],
                ["24 h count", form.transactionCount || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="truncate text-right font-medium text-slate-200">{v}</dd>
                </div>
              ))}
            </dl>

            <Button
              type="submit"
              size="lg"
              icon={ScanSearch}
              className="mt-5 w-full"
              loading={analyzing}
              disabled={analyzing}
            >
              {analyzing ? "Analyzing transaction…" : "Check Transaction"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              disabled={analyzing}
              onClick={() => {
                setForm({ ...EMPTY, transactionId: genId() });
                setErrors({});
                setSubmitError(null);
              }}
            >
              Reset form
            </Button>

            {Object.keys(errors).length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" /> Please fix the highlighted fields.
              </p>
            )}
          </div>

          <div className="glass-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Info className="h-4 w-4 text-sky-300" /> How scoring works
            </h3>
            <ol className="mt-3 space-y-2.5 text-xs text-slate-400">
              {[
                "Features are normalised and enriched with account history.",
                "The gradient-boosted classifier outputs a fraud probability.",
                "Explainable AI converts feature attributions into plain English.",
                "You receive a 0–100 risk score and recommended action.",
              ].map((step, i) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[10px] font-bold text-sky-300">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-lg border border-sky-400/20 bg-sky-400/[0.07] px-3 py-2 text-[11px] text-sky-300/90">
              Live mode: every prediction is produced by the Fraud-Shield backend and its trained
              model. No results are generated in the browser.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
