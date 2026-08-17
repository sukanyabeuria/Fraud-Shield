/**
 * ---------------------------------------------------------------------------
 * Fraud-Shield — API configuration
 * ---------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for the backend base URL and every endpoint path.
 * If your FastAPI routes differ from the defaults below, change them HERE ONLY
 * — no component or page hardcodes a URL.
 *
 * The base URL comes from the Vite environment variable:
 *     VITE_API_BASE_URL=http://127.0.0.1:8000
 * (see .env.example). Never put database credentials or secrets in this file:
 * anything under src/ is shipped to the browser.
 * ---------------------------------------------------------------------------
 */

/** Backend origin, e.g. http://127.0.0.1:8000 (no trailing slash). */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/** Request timeout in milliseconds (ML inference can be slow on first call). */
export const REQUEST_TIMEOUT_MS = Number(
  import.meta.env.VITE_API_TIMEOUT_MS ?? 30000
);

/** API version prefix used by the FastAPI app. */
const V1 = "/api/v1";

export const ENDPOINTS = {
  /* ---- CONFIRMED endpoints (documented as existing on the backend) ------ */
  health: `${V1}/health`,
  analyze: `${V1}/transactions/analyze`,

  /* ---- Conventional REST paths for the remaining screens ----------------
   * These follow the same `${V1}/...` convention as the two confirmed routes.
   * If your backend exposes them under different paths, edit them here.
   * If a route does not exist yet, the UI shows a real error state — it does
   * NOT fall back to fabricated data.
   * --------------------------------------------------------------------- */
  transactions: `${V1}/transactions`,
  transactionById: (id) => `${V1}/transactions/${encodeURIComponent(id)}`,
  analyticsSummary: `${V1}/analytics/summary`,
  analytics: `${V1}/analytics`,
  riskAnalysis: `${V1}/risk-analysis`,
  alerts: `${V1}/alerts`,
  modelVersions: `${V1}/models`,

  /* ---- Auth ------------------------------------------------------------- */
  login: `${V1}/auth/login`,
  register: `${V1}/auth/register`,
  me: `${V1}/auth/me`,
  sessions: `${V1}/auth/sessions`,
};

/** Build an absolute URL from an endpoint path. */
export const apiUrl = (path) => `${API_BASE_URL}${path}`;
