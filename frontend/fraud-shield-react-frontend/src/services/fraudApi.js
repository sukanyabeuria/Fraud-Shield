/**
 * ---------------------------------------------------------------------------
 * Fraud-Shield — REAL backend API service
 * ---------------------------------------------------------------------------
 * Every function here performs a genuine HTTP request against the FastAPI
 * backend. There is NO mock data, NO local fraud scoring, NO setTimeout fake
 * latency and NO fallback payload. If the backend fails, an ApiError is thrown
 * and the UI renders an error state.
 *
 * Architecture:
 *     React  →  FastAPI  →  Service / ML model (XGBoost + SHAP)  →  PostgreSQL
 *
 * Endpoint paths live in src/config/api.js.
 * ---------------------------------------------------------------------------
 */

import { ENDPOINTS } from "../config/api";
import { get, post, ApiError, ERROR_KIND } from "./httpClient";
import { riskLevelFromScore, toRiskLevelLabel, toPercent } from "../utils/format";

export { ApiError, ERROR_KIND };

/* ========================================================================== */
/* HEALTH — GET /api/v1/health                                                */
/* ========================================================================== */

export async function getHealth({ signal } = {}) {
  // Short timeout: this is a liveness probe, not an inference call.
  return get(ENDPOINTS.health, { signal, timeout: 8000 });
}

/* ========================================================================== */
/* TRANSACTION ANALYSIS — POST /api/v1/transactions/analyze                   */
/* ========================================================================== */

/**
 * Map the Transaction Check form onto the request body the backend expects.
 *
 * ⚠ THIS IS THE ONE PLACE TO EDIT if your Pydantic request schema uses
 *   different field names. Keys are snake_case to match FastAPI convention.
 */
export function buildAnalyzePayload(form) {
  const num = (v) =>
    v === "" || v === null || v === undefined ? null : Number(v);

  // Combine the separate date + time inputs into one ISO timestamp.
  let timestamp = null;

  if (form.transactionDate && form.transactionTime) {
    const parsed = new Date(
      `${form.transactionDate}T${form.transactionTime}`
    );

    if (!Number.isNaN(parsed.getTime())) {
      timestamp = parsed.toISOString();
    }
  }

  return {
    transaction_id: form.transactionId || null,
    amount: num(form.amount),
    currency: "INR",

    transaction_type: form.transactionType || null,
    merchant_category: form.merchantCategory || null,

    account_age_months: num(form.accountAge),

    location: form.location || null,
    device_type: form.deviceType || null,
    ip_address: form.ipAddress || null,

    transaction_date: form.transactionDate || null,
    transaction_time: form.transactionTime || null,
    timestamp,

    previous_amount: num(form.previousAmount),
    account_balance: num(form.accountBalance),

    is_card_present: Boolean(form.cardPresent),

    // Frontend → Backend mapping
    international_transfer: Boolean(form.internationalTransfer),

    // Frontend → Backend mapping
    new_recipient: Boolean(form.newRecipient),

    // Frontend → Backend mapping
    transaction_frequency: num(form.transactionCount),

    // Current UI does not have a separate "new device" checkbox.
    // Keep this false unless you later add that feature.
    is_new_device: false,
  };
}
/** Pull the first defined value from a list of possible key names. */
const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

/** Normalise a verdict string into the three labels FraudResult.jsx themes. */
function normalizeVerdict(raw, riskScore) {
  const v = raw ? String(raw).trim().toUpperCase() : "";
  if (["FRAUD", "FRAUDULENT", "FRAUD_DETECTED", "BLOCKED"].includes(v)) return "Fraudulent";
  if (["SUSPICIOUS", "REVIEW", "FLAGGED", "MEDIUM"].includes(v)) return "Suspicious";
  if (["GENUINE", "LEGITIMATE", "SAFE", "NOT_FRAUD", "APPROVED", "LOW"].includes(v)) return "Genuine";
  // Derive from the real score only if the backend sent no verdict at all.
  if (Number.isFinite(Number(riskScore))) {
    const n = Number(riskScore);
    return n >= 70 ? "Fraudulent" : n >= 40 ? "Suspicious" : "Genuine";
  }
  return raw ? String(raw) : "Unknown";
}

/**
 * Convert whatever explainability structure the backend returns into the
 * `reasons` / `factors` arrays the Fraud Result page renders.
 *
 * Accepts any of:
 *   [{feature, contribution, description, ...}]            (array of objects)
 *   {feature_name: 0.31, ...}                              (SHAP value map)
 *   [{name, value}] / [{label, impact}]                    (other shapes)
 */
function normalizeAttribution(raw) {
  if (!raw) return [];

  let entries = [];
  if (Array.isArray(raw)) {
    entries = raw.map((item) => {
      if (item === null || typeof item !== "object") return null;
      const label =
        pick(item, "feature", "feature_name", "name", "label", "indicator_name", "title") ??
        "Feature";
      const impact = Number(
        pick(item, "contribution", "shap_value", "impact", "value", "weight", "importance") ?? 0
      );
      const text =
        pick(item, "description", "explanation", "reason", "text", "detail") ?? null;
      const detail = pick(item, "observed_value", "observed", "detail_value", "raw_value");
      return { label: String(label), impact, text, detail, severity: pick(item, "severity") };
    }).filter(Boolean);
  } else if (typeof raw === "object") {
    entries = Object.entries(raw).map(([label, value]) => ({
      label,
      impact: Number(value) || 0,
      text: null,
      detail: null,
    }));
  }

  return entries.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

/** Prettify a raw feature key such as `amount_ratio` → `Amount Ratio`. */
const humanize = (key) =>
  String(key)
    .replace(/[_.-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Normalise the backend's analyze response into the shape the existing
 * FraudResult page consumes. Every value comes from the backend — nothing is
 * invented. If the response has no risk score at all we throw, because that
 * means the contract does not match.
 */
export function normalizeAnalysisResponse(raw, requestForm = {}) {
  if (!raw || typeof raw !== "object") {
    throw new ApiError("The backend returned an empty analysis response.", {
      kind: ERROR_KIND.PARSE,
    });
  }

  // Some APIs nest the payload under `data` / `result` / `prediction`.
  const body = pick(raw, "data", "result", "prediction", "analysis") ?? raw;
  const src = typeof body === "object" && !Array.isArray(body) ? body : raw;

  const riskScoreRaw = pick(src, "risk_score", "riskScore", "score");
  if (riskScoreRaw === undefined) {
    throw new ApiError(
      "The backend response did not include `risk_score`. Check the analyze endpoint's response schema.",
      { kind: ERROR_KIND.PARSE, details: Object.keys(src) }
    );
  }

  const riskScore = Math.round(Number(riskScoreRaw));
  const fraudProbability = pick(src, "fraud_probability", "probability", "fraudProbability");

  const riskLevel =
    toRiskLevelLabel(pick(src, "risk_level", "riskLevel")) ?? riskLevelFromScore(riskScore);

  const verdict = normalizeVerdict(
    pick(src, "verdict", "prediction_label", "prediction", "label", "decision"),
    riskScore
  );

  const attribution = normalizeAttribution(
    pick(
      src,
      "feature_contributions",
      "featureContributions",
      "shap_values",
      "shapValues",
      "explanations",
      "explanation_factors",
      "risk_indicators",
      "riskIndicators",
      "factors",
      "top_features",
      "feature_importance"
    )
  );

  // `reasons` = human-readable list rendered as the numbered explanation cards.
  const backendReasons = pick(src, "reasons", "risk_factors", "riskFactors", "warnings_detail");
  const reasons = Array.isArray(backendReasons) && backendReasons.length
    ? backendReasons.map((r) =>
        typeof r === "string"
          ? { key: "reason", title: "Risk Factor", text: r, detail: null, impact: 0 }
          : {
              key: String(pick(r, "type", "key", "feature") ?? "reason").toLowerCase(),
              title: String(pick(r, "title", "name", "indicator_name", "feature") ?? "Risk Factor"),
              text: String(pick(r, "description", "text", "explanation", "reason") ?? ""),
              detail: pick(r, "detail", "observed_value", "value") ?? null,
              impact: Number(pick(r, "impact", "contribution", "shap_value") ?? 0),
            }
        )
    : attribution
        .filter((f) => f.impact > 0)
        .map((f) => ({
          key: f.label.toLowerCase(),
          title: humanize(f.label),
          text: f.text ?? `${humanize(f.label)} contributed to the model's risk assessment.`,
          detail: f.detail ?? null,
          impact: Math.round(Math.abs(f.impact) * 100) / 100,
        }));

  const warningsRaw = pick(src, "warnings", "warning_indicators", "alerts");
  const warnings = Array.isArray(warningsRaw)
    ? warningsRaw.map((w) => (typeof w === "string" ? w : pick(w, "message", "text", "description") ?? String(w)))
    : [];

  const explanationText = pick(src, "explanation", "explanation_summary", "summary_text");

  return {
    transactionId:
      pick(src, "transaction_id", "transactionId", "reference", "id") ??
      requestForm.transactionId ??
      null,
    verdict,
    isFraud: pick(src, "is_fraud", "isFraud") ?? verdict === "Fraudulent",
    riskScore,
    riskLevel,
    fraudProbability: fraudProbability !== undefined ? Number(fraudProbability) : null,
    confidence: toPercent(pick(src, "confidence", "confidence_score", "model_confidence")),
    recommendedAction:
      pick(src, "recommended_action", "recommendedAction", "action", "decision_action") ?? null,
    modelVersion: pick(src, "model_version", "modelVersion", "model") ?? null,
    inferenceMs: pick(src, "inference_time_ms", "inferenceTimeMs", "latency_ms", "processing_time_ms") ?? null,
    evaluatedAt:
      pick(src, "predicted_at", "evaluated_at", "analyzed_at", "created_at", "timestamp") ?? null,
    explanationText: typeof explanationText === "string" ? explanationText : null,
    reasons,
    factors: attribution.map((f) => ({
      label: humanize(f.label),
      impact: Math.round(Math.abs(f.impact) * 100) / 100,
    })),
    warnings,
    /** Values the user submitted — echoed back for the summary panel. */
    summary: { ...requestForm },
    /** Untouched backend payload, for debugging. */
    raw: src,
  };
}

/**
 * POST /api/v1/transactions/analyze
 * Sends the real transaction to FastAPI → ML model → SHAP → PostgreSQL,
 * and returns the real result.
 */
export async function analyzeTransaction(form, { signal } = {}) {
  const payload = buildAnalyzePayload(form);
  const response = await post(ENDPOINTS.analyze, payload, { signal });
  return normalizeAnalysisResponse(response, form);
}

/* ========================================================================== */
/* TRANSACTIONS — GET /api/v1/transactions                                    */
/* ========================================================================== */

/** Normalise one transaction row from the backend to the table's field names. */
export function normalizeTransaction(row) {
  if (!row || typeof row !== "object") return null;
  const riskScore = pick(row, "risk_score", "riskScore");
  return {
    id: pick(row, "transaction_id", "reference", "transactionId", "id"),
    date: pick(row, "transaction_date", "timestamp", "created_at", "date", "analyzed_at"),
    amount: Number(pick(row, "amount") ?? 0),
    currency: pick(row, "currency") ?? "INR",
    type: pick(row, "transaction_type", "type"),
    merchant: pick(row, "merchant", "merchant_name", "merchant_category"),
    location: pick(row, "location", "location_label"),
    device: pick(row, "device_type", "device"),
    status: pick(row, "status", "verdict", "prediction"),
    riskScore: riskScore !== undefined ? Math.round(Number(riskScore)) : null,
    riskLevel: toRiskLevelLabel(pick(row, "risk_level", "riskLevel")),
    accountAge: pick(row, "account_age_months", "accountAge"),
    raw: row,
  };
}

/** Unwrap list responses shaped as [] | {items:[]} | {data:[]} | {results:[]}. */
function unwrapList(payload) {
  if (Array.isArray(payload)) return { items: payload, total: payload.length };
  if (!payload || typeof payload !== "object") return { items: [], total: 0 };
  const items =
    pick(payload, "items", "data", "results", "transactions", "records") ?? [];
  const list = Array.isArray(items) ? items : [];
  return { items: list, total: Number(pick(payload, "total", "count", "total_count") ?? list.length) };
}

/**
 * GET /api/v1/transactions — server-side search/filter/pagination.
 * Query params are only appended when set, so an endpoint that ignores them
 * still works.
 */
export async function getTransactions(params = {}, { signal } = {}) {
  const qs = new URLSearchParams();
  const map = {
    search: "search",
    status: "status",
    riskLevel: "risk_level",
    dateFrom: "date_from",
    dateTo: "date_to",
    minAmount: "min_amount",
    maxAmount: "max_amount",
    sort: "sort",
    page: "page",
    pageSize: "page_size",
    limit: "limit",
  };
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "All") return;
    const name = map[key] ?? key;
    qs.append(name, String(value));
  });

  const query = qs.toString();
  const payload = await get(`${ENDPOINTS.transactions}${query ? `?${query}` : ""}`, { signal });
  const { items, total } = unwrapList(payload);
  return { items: items.map(normalizeTransaction).filter(Boolean), total };
}

/** GET /api/v1/transactions/:id */
export async function getTransactionById(id, { signal } = {}) {
  const payload = await get(ENDPOINTS.transactionById(id), { signal });
  return normalizeTransaction(pick(payload, "data", "transaction") ?? payload);
}

/* ========================================================================== */
/* ANALYTICS — GET /api/v1/analytics/summary and /api/v1/analytics            */
/* ========================================================================== */

/** Normalise the KPI summary used by the Dashboard cards. */
export function normalizeSummary(payload) {
  if (!payload || typeof payload !== "object") return null;
  const src = pick(payload, "data", "summary", "stats") ?? payload;
  const n = (...keys) => {
    const v = pick(src, ...keys);
    return v === undefined ? null : Number(v);
  };
  return {
    totalTransactions: n("total_transactions", "totalTransactions", "total"),
    safeTransactions: n("safe_transactions", "genuine_transactions", "safeTransactions"),
    suspiciousTransactions: n("suspicious_transactions", "suspiciousTransactions"),
    fraudDetected: n("fraud_detected", "fraud_transactions", "fraudDetected", "total_fraud"),
    overallRiskScore: n("overall_risk_score", "avg_risk_score", "average_risk_score"),
    avgFraudProbability: n("avg_fraud_probability", "average_fraud_probability"),
    fraudPercentage: n("fraud_percentage", "fraud_rate", "fraudPercentage"),
    highRiskTransactions: n("high_risk_transactions", "highRiskTransactions"),
    criticalRiskTransactions: n("critical_risk_transactions"),
    blockedAmount: n("blocked_amount", "fraud_amount", "blockedAmount"),
    totalAmount: n("total_amount", "totalAmount"),
    detectionAccuracy: n("detection_accuracy", "accuracy"),
    avgResponseMs: n("avg_response_ms", "avg_inference_ms", "average_latency_ms"),
    raw: src,
  };
}

/** GET /api/v1/analytics/summary — Dashboard KPI cards. */
export async function getDashboardSummary({ signal } = {}) {
  const payload = await get(ENDPOINTS.analyticsSummary, { signal });
  return normalizeSummary(payload);
}

/** GET /api/v1/analytics — full Analytics page dataset. */
export async function getAnalytics({ signal } = {}) {
  const payload = await get(ENDPOINTS.analytics, { signal });
  const src = pick(payload, "data") ?? payload;
  const arr = (...keys) => {
    const v = pick(src, ...keys);
    return Array.isArray(v) ? v : [];
  };
  return {
    stats: normalizeSummary(pick(src, "stats", "summary") ?? src),
    riskDistribution: arr("risk_distribution", "riskDistribution"),
    fraudTrend: arr("fraud_trend", "fraudTrend", "trend"),
    transactionActivity: arr("transaction_activity", "transactionActivity", "activity"),
    volumeByType: arr("volume_by_type", "volumeByType"),
    hourlyRisk: arr("hourly_risk", "hourlyRisk", "time_analysis"),
    deviceRisk: arr("device_risk", "deviceRisk"),
    locationRisk: arr("location_risk", "locationRisk"),
    topMerchants: arr("top_merchants", "topMerchants", "top_suspicious_merchants"),
    models: arr("models", "model_performance"),
    raw: src,
  };
}

/** GET /api/v1/risk-analysis */
export async function getRiskAnalysis({ signal } = {}) {
  const payload = await get(ENDPOINTS.riskAnalysis, { signal });
  return pick(payload, "data") ?? payload;
}

/** GET /api/v1/alerts — navbar alert feed. */
export async function getAlerts({ signal } = {}) {
  const payload = await get(ENDPOINTS.alerts, { signal });
  const { items } = unwrapList(payload);
  return items.map((a) => ({
    id: pick(a, "id", "alert_id") ?? crypto.randomUUID(),
    title: pick(a, "title", "message", "action") ?? "Alert",
    detail: pick(a, "detail", "description", "details") ?? "",
    level: toRiskLevelLabel(pick(a, "level", "severity", "risk_level")) ?? "Medium",
    time: pick(a, "created_at", "time", "timestamp") ?? null,
  }));
}

/* ========================================================================== */
/* AUTH                                                                        */
/* ========================================================================== */

/** Normalise a user object returned by the backend. */
export function normalizeUser(payload) {
  if (!payload || typeof payload !== "object") return null;
  const src = pick(payload, "user", "data") ?? payload;
  const name = pick(src, "full_name", "name", "fullName", "username");
  const email = pick(src, "email");
  if (!name && !email) return null;
  return {
    id: pick(src, "id", "user_id") ?? null,
    name: name ?? email,
    email: email ?? null,
    role: pick(src, "job_title", "role", "title") ?? null,
    team: pick(src, "team", "department") ?? null,
    joined: pick(src, "created_at", "joined_at") ?? null,
  };
}

export async function login(credentials, { signal } = {}) {
  const payload = await post(
    ENDPOINTS.login,
    { email: credentials.email, password: credentials.password },
    { signal }
  );
  return {
    token: pick(payload, "access_token", "token", "accessToken") ?? null,
    user: normalizeUser(payload),
  };
}

export async function register(data, { signal } = {}) {
  const payload = await post(
    ENDPOINTS.register,
    { full_name: data.fullName, email: data.email, password: data.password },
    { signal }
  );
  return {
    token: pick(payload, "access_token", "token", "accessToken") ?? null,
    user: normalizeUser(payload),
  };
}

export async function getCurrentUser({ signal, token } = {}) {
  const payload = await get(ENDPOINTS.me, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return normalizeUser(payload);
}

export default {
  getHealth,
  analyzeTransaction,
  buildAnalyzePayload,
  getTransactions,
  getTransactionById,
  getDashboardSummary,
  getAnalytics,
  getRiskAnalysis,
  getAlerts,
  login,
  register,
  getCurrentUser,
};
