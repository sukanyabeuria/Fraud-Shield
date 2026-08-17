/**
 * ---------------------------------------------------------------------------
 * Fraud-Shield — HTTP client
 * ---------------------------------------------------------------------------
 * Thin fetch wrapper around the real FastAPI backend.
 *
 * Guarantees:
 *   • never returns fabricated data — a failure always throws an ApiError
 *   • distinguishes network failure / timeout / HTTP error / validation error
 *   • surfaces FastAPI's error shapes ({detail: "..."} and 422 {detail:[...]})
 * ---------------------------------------------------------------------------
 */

import { API_BASE_URL, REQUEST_TIMEOUT_MS, apiUrl } from "../config/api";

export const ERROR_KIND = {
  NETWORK: "NETWORK",       // backend unreachable / CORS / DNS
  TIMEOUT: "TIMEOUT",       // request exceeded REQUEST_TIMEOUT_MS
  VALIDATION: "VALIDATION", // 400 / 422 — invalid transaction data
  NOT_FOUND: "NOT_FOUND",   // 404 — route or record missing
  AUTH: "AUTH",             // 401 / 403
  SERVER: "SERVER",         // 5xx — includes database errors raised by backend
  HTTP: "HTTP",             // any other non-2xx
  PARSE: "PARSE",           // response was not valid JSON
};

export class ApiError extends Error {
  constructor(message, { kind = ERROR_KIND.HTTP, status = null, details = null, url = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.details = details;
    this.url = url;
  }

  /** True when the backend process itself could not be reached. */
  get isOffline() {
    return this.kind === ERROR_KIND.NETWORK || this.kind === ERROR_KIND.TIMEOUT;
  }
}

/** Turn a FastAPI error body into a readable message. */
function extractMessage(body, status) {
  if (!body) return `Request failed with status ${status}`;
  const { detail } = body;

  // FastAPI 422: detail is an array of {loc, msg, type}
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc.filter((p) => p !== "body").join(".") : null;
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join(" · ");
  }
  if (typeof detail === "string") return detail;
  if (typeof body.message === "string") return body.message;
  if (typeof body.error === "string") return body.error;
  return `Request failed with status ${status}`;
}

function kindFromStatus(status) {
  if (status === 400 || status === 422) return ERROR_KIND.VALIDATION;
  if (status === 401 || status === 403) return ERROR_KIND.AUTH;
  if (status === 404 || status === 405) return ERROR_KIND.NOT_FOUND;
  if (status >= 500) return ERROR_KIND.SERVER;
  return ERROR_KIND.HTTP;
}

/**
 * Perform a request against the backend.
 * @param {string} path   endpoint path from ENDPOINTS
 * @param {object} options  { method, body, signal, timeout, headers }
 */
export async function request(path, { method = "GET", body, headers, signal, timeout } = {}) {
  const url = apiUrl(path);
  const controller = new AbortController();
  const timeoutMs = timeout ?? REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);

  // Allow a caller-provided signal (React StrictMode / unmount) to abort too.
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      throw new ApiError(
        `The request to the Fraud-Shield backend timed out after ${Math.round(timeoutMs / 1000)}s.`,
        { kind: ERROR_KIND.TIMEOUT, url }
      );
    }
    // TypeError from fetch === connection refused / CORS blocked / offline
    throw new ApiError(
      `Unable to connect to Fraud-Shield backend at ${API_BASE_URL}.`,
      { kind: ERROR_KIND.NETWORK, url, details: err?.message }
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new ApiError("The backend returned a response that is not valid JSON.", {
          kind: ERROR_KIND.PARSE,
          status: response.status,
          url,
        });
      }
    }
  }

  if (!response.ok) {
    throw new ApiError(extractMessage(payload, response.status), {
      kind: kindFromStatus(response.status),
      status: response.status,
      details: payload?.detail ?? null,
      url,
    });
  }

  return payload;
}

export const get = (path, options) => request(path, { ...options, method: "GET" });
export const post = (path, body, options) => request(path, { ...options, method: "POST", body });
export const put = (path, body, options) => request(path, { ...options, method: "PUT", body });
export const patch = (path, body, options) => request(path, { ...options, method: "PATCH", body });

export default { request, get, post, put, patch, ApiError, ERROR_KIND };
