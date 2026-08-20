/**
 * ---------------------------------------------------------------------------
 * Fraud-Shield — API SERVICE LAYER (MOCK)
 * ---------------------------------------------------------------------------
 * This is THE ONLY file that the UI talks to for "server" data.
 * Every function below currently returns mock data after a fake delay.
 *
 * FUTURE INTEGRATION MAP
 * ----------------------
 *   Frontend  →  Backend API  →  ML Model  →  Explainable AI  →  Result
 *
 *   predictFraud(payload)        →  POST {API_BASE}/api/predict
 *   getTransactions(query)       →  GET  {API_BASE}/api/transactions
 *   getDashboardSummary()        →  GET  {API_BASE}/api/analytics/summary
 *   getAnalytics()               →  GET  {API_BASE}/api/analytics
 *   login(credentials)           →  POST {API_BASE}/api/auth/login
 *   signup(payload)              →  POST {API_BASE}/api/auth/register
 *
 * When the backend is ready simply:
 *   1. set API_BASE (import.meta.env.VITE_API_BASE)
 *   2. replace the `return mock...` bodies with `fetch()` calls
 *   3. keep the exact same return shape so no component needs changing.
 * ---------------------------------------------------------------------------
 */

import {
  mockTransactions,
  dashboardStats,
  riskDistribution,
  transactionActivity,
  fraudTrend,
  volumeByType,
  deviceRisk,
  locationRisk,
  hourlyRisk,
  modelRadar,
  explanationLibrary,
  riskLevelFromScore,
} from "../data/mockData";

// export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const delay = (ms = 700) => new Promise((res) => setTimeout(res, ms));

/* ========================================================================== */
/* AUTH — replace with real JWT auth later                                     */
/* ========================================================================== */
export async function login({ email }) {
  await delay(650);
  return {
    token: "mock-jwt-token",
    user: { name: email.split("@")[0].replace(/[._]/g, " "), email },
  };
}

export async function signup({ fullName, email }) {
  await delay(750);
  return { token: "mock-jwt-token", user: { name: fullName, email } };
}

/* ========================================================================== */
/* DATA READS                                                                  */
/* ========================================================================== */
export async function getTransactions() {
  await delay(250);
  return mockTransactions;
}

export async function getDashboardSummary() {
  await delay(250);
  return { stats: dashboardStats, riskDistribution, transactionActivity };
}

export async function getAnalytics() {
  await delay(250);
  return {
    fraudTrend,
    riskDistribution,
    volumeByType,
    deviceRisk,
    locationRisk,
    hourlyRisk,
    modelRadar,
    stats: dashboardStats,
  };
}

/* ========================================================================== */
/* FRAUD PREDICTION — MOCK ML MODEL + MOCK EXPLAINABLE AI                      */
/* ========================================================================== */

/**
 * Rule-based stand-in for the real ML model.
 * Produces a deterministic risk score plus SHAP-style feature contributions.
 *
 * @param {object} form  Transaction form values from TransactionCheck page
 * @returns {Promise<object>} prediction result consumed by FraudResult page
 */
export async function predictFraud(form) {
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  const payload = {
    transaction_id: form.transactionId,
    amount: Number(form.amount),
    currency: "INR",
    transaction_type: form.transactionType,
    merchant_category: form.merchantCategory,
    location: form.location,
    ip_address: form.ipAddress || "",
    device_type: form.deviceType,
    international_transfer: Boolean(form.internationalTransfer),
    new_recipient: Boolean(form.newRecipient),
    transaction_frequency: Number(form.transactionCount),
    is_new_device: false,
  };

  const response = await fetch(
    `${API_BASE}/api/v1/transactions/analyze`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Transaction analysis failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  const isFraud = data.verdict === "Fraudulent";

  const factors = (data.risk_factors || []).map((factor) => ({
    key: factor.feature,
    label: factor.feature,
    impact: factor.impact,
    triggered: true,
    detail: factor.explanation,
  }));

  const reasons = (data.risk_factors || []).map((factor) => ({
    key: factor.feature,
    title: factor.feature,
    text: factor.explanation,
    detail: factor.explanation,
    impact: factor.impact,
  }));

  const warnings = (data.triggered_rules || []).map((rule) => {
    if (typeof rule === "string") return rule;

    return (
      rule.rule_name ||
      rule.name ||
      rule.description ||
      rule.message ||
      "A fraud detection rule was triggered."
    );
  });

  return {
    transactionId: data.transaction_id,
    isFraud,
    verdict: data.verdict,
    riskScore: data.risk_score,
    riskLevel: data.risk_level,

    confidence:
      Number(data.confidence) <= 1
        ? Math.round(Number(data.confidence) * 100)
        : Math.round(Number(data.confidence)),

    modelVersion: data.model_version,
    evaluatedAt: data.evaluated_at,

    summary: { ...form },

    factors,
    reasons,
    warnings,

    recommendedAction: data.recommended_action,
  };
}