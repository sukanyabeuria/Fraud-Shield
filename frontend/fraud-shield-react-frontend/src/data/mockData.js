/**
 * ---------------------------------------------------------------------------
 * Fraud-Shield — MOCK DATA LAYER
 * ---------------------------------------------------------------------------
 * Everything in this file is dummy/static data used to build & demo the UI.
 *
 * FUTURE INTEGRATION:
 *   Replace these exports with real data fetched from the backend API, e.g.
 *     GET /api/transactions
 *     GET /api/analytics/summary
 *   See `src/services/fraudApi.js` for the single place where the swap happens.
 * ---------------------------------------------------------------------------
 */

export const TRANSACTION_TYPES = [
  "Transfer",
  "Payment",
  "Withdrawal",
  "Deposit",
  "Card Purchase",
  "Online Purchase",
  "Crypto Exchange",
];

export const DEVICE_TYPES = ["Mobile App", "Web Browser", "ATM", "POS Terminal", "API / Bot"];

export const LOCATIONS = [
  "Mumbai, IN",
  "Delhi, IN",
  "Bengaluru, IN",
  "London, UK",
  "New York, US",
  "Singapore, SG",
  "Dubai, AE",
  "Lagos, NG",
  "Moscow, RU",
  "Unknown / VPN",
];

export const CURRENT_USER = {
  name: "Aarav Sharma",
  email: "aarav.sharma@fraudshield.io",
  role: "Senior Risk Analyst",
  team: "Financial Crime Unit",
  joined: "March 2023",
  avatar: null, // placeholder — future: profile picture upload
};

/* -------------------------------------------------------------------------- */
/* Deterministic pseudo-random helpers so the mock data stays stable           */
/* -------------------------------------------------------------------------- */
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seeded(42);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

export function riskLevelFromScore(score) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function statusFromScore(score) {
  if (score >= 70) return "Fraud";
  if (score >= 40) return "Suspicious";
  return "Safe";
}

const MERCHANTS = [
  "Amazon Pay",
  "Swiggy",
  "IndiGo Airlines",
  "CoinBridge Exchange",
  "Apple Store",
  "Reliance Digital",
  "Uber",
  "Netflix",
  "LuxeWatch Ltd",
  "GlobalWire Transfer",
];

function makeTransaction(i) {
  const score = Math.floor(rand() * 100);
  const date = new Date(Date.now() - i * 3600 * 1000 * (1 + rand() * 5));
  const amount = Math.round((rand() * 480000 + 250) * 100) / 100;
  return {
    id: `TXN-${(920145 - i * 37).toString().padStart(7, "0")}`,
    date: date.toISOString(),
    amount,
    currency: "INR",
    type: pick(TRANSACTION_TYPES),
    merchant: pick(MERCHANTS),
    location: pick(LOCATIONS),
    device: pick(DEVICE_TYPES),
    accountAge: Math.floor(rand() * 96) + 1,
    riskScore: score,
    riskLevel: riskLevelFromScore(score),
    status: statusFromScore(score),
  };
}

/** 84 mock transactions — used by Dashboard, History & Analytics pages. */
export const mockTransactions = Array.from({ length: 84 }, (_, i) => makeTransaction(i)).sort(
  (a, b) => new Date(b.date) - new Date(a.date)
);

/* -------------------------------------------------------------------------- */
/* Aggregated KPI stats (future: GET /api/analytics/summary)                   */
/* -------------------------------------------------------------------------- */
const total = mockTransactions.length;
const safe = mockTransactions.filter((t) => t.status === "Safe").length;
const suspicious = mockTransactions.filter((t) => t.status === "Suspicious").length;
const fraud = mockTransactions.filter((t) => t.status === "Fraud").length;
const avgRisk = Math.round(mockTransactions.reduce((s, t) => s + t.riskScore, 0) / total);

export const dashboardStats = {
  totalTransactions: 12847,
  safeTransactions: 11392,
  suspiciousTransactions: 1043,
  fraudDetected: 412,
  overallRiskScore: avgRisk,
  blockedAmount: 18420000,
  detectionAccuracy: 96.4,
  avgResponseMs: 148,
  sampleTotals: { total, safe, suspicious, fraud },
};

/* -------------------------------------------------------------------------- */
/* Chart datasets                                                             */
/* -------------------------------------------------------------------------- */
export const riskDistribution = [
  { name: "Low Risk", value: 11392, color: "#22c55e" },
  { name: "Medium Risk", value: 1043, color: "#f59e0b" },
  { name: "High Risk", value: 412, color: "#ef4444" },
];

export const transactionActivity = [
  { time: "00:00", transactions: 320, flagged: 12 },
  { time: "03:00", transactions: 180, flagged: 21 },
  { time: "06:00", transactions: 410, flagged: 9 },
  { time: "09:00", transactions: 1290, flagged: 34 },
  { time: "12:00", transactions: 1740, flagged: 48 },
  { time: "15:00", transactions: 1580, flagged: 41 },
  { time: "18:00", transactions: 1930, flagged: 66 },
  { time: "21:00", transactions: 980, flagged: 52 },
];

export const fraudTrend = [
  { month: "Jan", fraud: 210, genuine: 8420, rate: 2.4 },
  { month: "Feb", fraud: 248, genuine: 8890, rate: 2.7 },
  { month: "Mar", fraud: 196, genuine: 9310, rate: 2.1 },
  { month: "Apr", fraud: 305, genuine: 9880, rate: 3.0 },
  { month: "May", fraud: 274, genuine: 10240, rate: 2.6 },
  { month: "Jun", fraud: 338, genuine: 10910, rate: 3.1 },
  { month: "Jul", fraud: 291, genuine: 11480, rate: 2.5 },
  { month: "Aug", fraud: 366, genuine: 11920, rate: 3.0 },
  { month: "Sep", fraud: 402, genuine: 12310, rate: 3.2 },
  { month: "Oct", fraud: 351, genuine: 12680, rate: 2.7 },
  { month: "Nov", fraud: 419, genuine: 13040, rate: 3.2 },
  { month: "Dec", fraud: 412, genuine: 12435, rate: 3.3 },
];

export const volumeByType = [
  { type: "Transfer", volume: 3420, fraud: 132 },
  { type: "Payment", volume: 2980, fraud: 61 },
  { type: "Withdrawal", volume: 1890, fraud: 88 },
  { type: "Card", volume: 2410, fraud: 47 },
  { type: "Online", volume: 1740, fraud: 74 },
  { type: "Crypto", volume: 407, fraud: 96 },
];

export const deviceRisk = [
  { device: "Mobile App", risk: 28, transactions: 5820 },
  { device: "Web Browser", risk: 41, transactions: 3910 },
  { device: "ATM", risk: 36, transactions: 1420 },
  { device: "POS Terminal", risk: 22, transactions: 1290 },
  { device: "API / Bot", risk: 78, transactions: 407 },
];

export const locationRisk = [
  { location: "Mumbai, IN", risk: 24, fraud: 41 },
  { location: "Delhi, IN", risk: 31, fraud: 55 },
  { location: "London, UK", risk: 38, fraud: 33 },
  { location: "New York, US", risk: 42, fraud: 47 },
  { location: "Lagos, NG", risk: 69, fraud: 74 },
  { location: "Unknown / VPN", risk: 91, fraud: 162 },
];

export const hourlyRisk = Array.from({ length: 12 }, (_, i) => {
  const hour = i * 2;
  const base = hour >= 0 && hour <= 5 ? 62 : hour >= 18 ? 48 : 27;
  return {
    hour: `${hour.toString().padStart(2, "0")}:00`,
    avgRisk: base + Math.round(rand() * 12),
    volume: Math.round(300 + rand() * 1500),
  };
});

export const modelRadar = [
  { factor: "Amount", score: 82 },
  { factor: "Velocity", score: 68 },
  { factor: "Location", score: 91 },
  { factor: "Device", score: 55 },
  { factor: "Account Age", score: 47 },
  { factor: "Behaviour", score: 74 },
];

/* -------------------------------------------------------------------------- */
/* Alerts feed shown in the navbar dropdown                                    */
/* -------------------------------------------------------------------------- */
export const mockAlerts = [
  {
    id: 1,
    title: "High-risk transfer blocked",
    detail: "TXN-0920145 · ₹4,82,000 · Unknown / VPN",
    level: "High",
    time: "2 min ago",
  },
  {
    id: 2,
    title: "Velocity anomaly detected",
    detail: "Account #8841 · 9 transactions in 4 minutes",
    level: "Medium",
    time: "18 min ago",
  },
  {
    id: 3,
    title: "New device login",
    detail: "Account #2210 · API / Bot · Lagos, NG",
    level: "Medium",
    time: "1 hr ago",
  },
  {
    id: 4,
    title: "Model retraining completed",
    detail: "XGBoost v2.4 · accuracy 96.4%",
    level: "Low",
    time: "5 hr ago",
  },
];

/* -------------------------------------------------------------------------- */
/* Explanation templates — placeholder for the Explainable AI (SHAP) output    */
/* -------------------------------------------------------------------------- */
export const explanationLibrary = {
  amount: "High transaction amount compared with previous transactions.",
  location: "Transaction occurred from an unusual location for this account.",
  frequency: "Transaction frequency is higher than normal for this account.",
  time: "Transaction executed during an unusual hour (00:00 – 05:00).",
  device: "Transaction initiated from an unrecognised device or automated client.",
  accountAge: "Account is relatively new, limiting historical behaviour signals.",
  merchant: "Merchant category is frequently associated with chargebacks.",
  international: "Cross-border transaction without prior travel history.",
};

export const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
