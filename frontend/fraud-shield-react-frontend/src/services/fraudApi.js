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
  // FUTURE:
  // const res = await fetch(`${API_BASE}/api/predict`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(form),
  // });
  // return res.json();

  await delay(1600); // simulate model inference latency

  const amount = Number(form.amount) || 0;
  const prevAmount = Number(form.previousAmount) || 1;
  const accountAge = Number(form.accountAge) || 0;
  const txCount = Number(form.transactionCount) || 0;
  const hour = Number((form.transactionTime || "12:00").split(":")[0]);

  /** Each factor => { key, label, impact (0-100), triggered } */
  const factors = [];

  const amountRatio = amount / Math.max(prevAmount, 1);
  const amountImpact = Math.min(32, Math.round(amountRatio * 6));
  factors.push({
    key: "amount",
    label: "Transaction Amount vs History",
    impact: amountImpact,
    triggered: amountRatio > 3 || amount > 200000,
    detail: `Current ₹${amount.toLocaleString("en-IN")} vs previous ₹${prevAmount.toLocaleString(
      "en-IN"
    )} (${amountRatio.toFixed(1)}×)`,
  });

  const riskyLocation = /unknown|vpn|lagos|moscow/i.test(form.location || "");
  factors.push({
    key: "location",
    label: "Geo-location Anomaly",
    impact: riskyLocation ? 24 : 6,
    triggered: riskyLocation,
    detail: form.location || "Not provided",
  });

  const highVelocity = txCount > 8;
  factors.push({
    key: "frequency",
    label: "Transaction Velocity",
    impact: Math.min(20, Math.round(txCount * 1.8)),
    triggered: highVelocity,
    detail: `${txCount} transactions in the last 24 hours`,
  });

  const oddHour = hour <= 5;
  factors.push({
    key: "time",
    label: "Time-of-day Pattern",
    impact: oddHour ? 14 : 4,
    triggered: oddHour,
    detail: `Executed at ${form.transactionTime || "—"}`,
  });

  const riskyDevice = /api|bot|atm/i.test(form.deviceType || "");
  factors.push({
    key: "device",
    label: "Device Fingerprint",
    impact: riskyDevice ? 16 : 5,
    triggered: riskyDevice,
    detail: form.deviceType || "Not provided",
  });

  const newAccount = accountAge < 6;
  factors.push({
    key: "accountAge",
    label: "Account Maturity",
    impact: newAccount ? 13 : 3,
    triggered: newAccount,
    detail: `${accountAge} month(s) old`,
  });

  const crypto = /crypto|transfer|withdraw/i.test(form.transactionType || "");
  factors.push({
    key: "merchant",
    label: "Channel / Category Risk",
    impact: crypto ? 11 : 4,
    triggered: crypto,
    detail: form.transactionType || "Not provided",
  });

  if (form.internationalTransfer) {
    factors.push({
      key: "international",
      label: "Cross-border Transfer",
      impact: 12,
      triggered: true,
      detail: "International transfer flag enabled",
    });
  }

  if (form.newRecipient) {
    factors.push({
      key: "frequency",
      label: "First-time Recipient",
      impact: 9,
      triggered: true,
      detail: "Beneficiary added within the last 24 hours",
    });
  }

  const raw = factors.reduce((sum, f) => sum + f.impact, 0);
  const riskScore = Math.max(3, Math.min(99, Math.round(raw)));
  const riskLevel = riskLevelFromScore(riskScore);
  const isFraud = riskScore >= 70;

  // --- Mock Explainable AI output (later: SHAP / LIME from the model service)
  const reasons = factors
    .filter((f) => f.triggered)
    .sort((a, b) => b.impact - a.impact)
    .map((f) => ({
      key: f.key,
      title: f.label,
      text: explanationLibrary[f.key] ?? f.label,
      detail: f.detail,
      impact: f.impact,
    }));

  if (reasons.length === 0) {
    reasons.push({
      key: "safe",
      title: "Consistent Behaviour",
      text: "All monitored features fall inside this account's normal behavioural range.",
      detail: "No anomaly thresholds were crossed.",
      impact: 0,
    });
  }

  const warnings = [];
  if (amountRatio > 5) warnings.push("Amount exceeds 5× the customer's typical transaction size.");
  if (riskyLocation) warnings.push("Originating IP resolves to an anonymising network.");
  if (highVelocity) warnings.push("Velocity threshold breached — possible card testing.");
  if (oddHour) warnings.push("Activity outside the customer's usual active hours.");
  if (isFraud) warnings.push("Recommended action: hold funds and trigger manual review.");

  return {
    transactionId: form.transactionId,
    isFraud,
    verdict: isFraud ? "Fraudulent" : riskScore >= 40 ? "Suspicious" : "Genuine",
    riskScore,
    riskLevel,
    confidence: Math.min(99, 62 + Math.round(Math.abs(riskScore - 50) * 0.7)),
    modelVersion: "mock-xgboost-v2.4",
    evaluatedAt: new Date().toISOString(),
    summary: { ...form },
    factors: factors.sort((a, b) => b.impact - a.impact),
    reasons,
    warnings,
  };
}
