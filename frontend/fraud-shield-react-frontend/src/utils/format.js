/**
 * Pure presentation helpers.
 * These contain NO application data — they only format values that come from
 * the backend. (Relocated out of the deleted src/data/mockData.js.)
 */

export const formatCurrency = (value, currency = "INR") => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString("en-IN") : "—";
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Risk band boundaries — must mirror the backend / database definition
 * (0-39 Low, 40-69 Medium, 70+ High).
 * Only used as a display fallback when the backend omits risk_level.
 */
export const riskLevelFromScore = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n)) return "Low";
  if (n >= 70) return "High";
  if (n >= 40) return "Medium";
  return "Low";
};

/** Normalise a backend risk level (LOW / CRITICAL / high …) to UI casing. */
export const toRiskLevelLabel = (level) => {
  if (!level) return null;
  const v = String(level).trim().toUpperCase();
  if (v === "CRITICAL" || v === "HIGH") return "High";
  if (v === "MEDIUM" || v === "MODERATE") return "Medium";
  if (v === "LOW" || v === "SAFE" || v === "MINIMAL") return "Low";
  return String(level).charAt(0).toUpperCase() + String(level).slice(1).toLowerCase();
};

/** Normalise a backend transaction status to the labels the table renders. */
export const toStatusLabel = (status) => {
  if (!status) return "Pending";
  const v = String(status).trim().toUpperCase();
  if (["FRAUD", "FRAUDULENT", "BLOCKED", "REVERSED"].includes(v)) return "Fraud";
  if (["SUSPICIOUS", "REVIEW", "FLAGGED"].includes(v)) return "Suspicious";
  if (["SAFE", "GENUINE", "APPROVED", "LEGITIMATE"].includes(v)) return "Safe";
  return String(status).charAt(0).toUpperCase() + String(status).slice(1).toLowerCase();
};

/** Convert a confidence value that may be 0-1 or 0-100 into a 0-100 number. */
export const toPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n > 0 && n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
};
