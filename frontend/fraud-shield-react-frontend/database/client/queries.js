/**
 * ============================================================================
 *  FRAUD-SHIELD — Data-access layer (repository functions)
 * ============================================================================
 *  Every function here is a thin, fully parameterised wrapper around the SQL
 *  installed by database/sql/*.sql. The future REST API just calls these.
 *
 *  ENDPOINT → FUNCTION MAP
 *  ------------------------------------------------------------------------
 *  POST   /api/auth/login          → authenticate()
 *  POST   /api/auth/register       → createUser()
 *  GET    /api/users/me            → getUserProfile()
 *  POST   /api/transactions        → createTransaction()
 *  GET    /api/transactions        → searchTransactions()
 *  GET    /api/transactions/:id    → getTransaction()
 *  POST   /api/fraud/predict       → recordPrediction()
 *  GET    /api/fraud/results/:id   → getFraudResult()
 *  GET    /api/analytics           → getAnalytics() / getDashboardSummary()
 *  GET    /api/risk-analysis       → getRiskAnalysis()
 * ============================================================================
 */

import { query, queryOne } from "./db.js";

/* ========================================================================== */
/* AUTH & USERS                                                               */
/* ========================================================================== */

/** POST /api/auth/login — verifies bcrypt hash in-database and audits the try. */
export async function authenticate(email, password, ip = null, userAgent = null) {
  return queryOne("SELECT * FROM fn_authenticate($1, $2, $3, $4)", [
    email,
    password,
    ip,
    userAgent,
  ]);
}

/**
 * POST /api/auth/register
 * `passwordHash` MUST already be hashed by the API (bcrypt cost >= 12).
 * The plain password never travels to the database.
 */
export async function createUser({ fullName, email, passwordHash, role = "ANALYST" }) {
  return queryOne(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name AS name, email, role, created_at`,
    [fullName, email, passwordHash, role]
  );
}

/** GET /api/users/me */
export async function getUserProfile(userId) {
  return queryOne("SELECT * FROM v_user_profile WHERE id = $1", [userId]);
}

/** PUT /api/users/me */
export async function updateUserProfile(userId, { fullName, email, jobTitle, team, phone }) {
  return queryOne(
    `UPDATE users
        SET full_name = COALESCE($2, full_name),
            email     = COALESCE($3, email),
            job_title = COALESCE($4, job_title),
            team      = COALESCE($5, team),
            phone     = COALESCE($6, phone)
      WHERE id = $1
      RETURNING id, full_name AS name, email, role, job_title, team, phone`,
    [userId, fullName, email, jobTitle, team, phone]
  );
}

/** PUT /api/users/me/settings */
export async function updateUserSettings(userId, settings) {
  return queryOne(
    `UPDATE user_settings SET
        notify_fraud_alerts   = COALESCE($2,  notify_fraud_alerts),
        notify_high_risk_only = COALESCE($3,  notify_high_risk_only),
        notify_weekly_digest  = COALESCE($4,  notify_weekly_digest),
        notify_email          = COALESCE($5,  notify_email),
        notify_sms            = COALESCE($6,  notify_sms),
        login_alerts          = COALESCE($7,  login_alerts),
        auto_block_high_risk  = COALESCE($8,  auto_block_high_risk),
        auto_block_threshold  = COALESCE($9,  auto_block_threshold),
        theme                 = COALESCE($10, theme)
      WHERE user_id = $1
      RETURNING *`,
    [
      userId,
      settings.notifyFraudAlerts ?? null,
      settings.notifyHighRiskOnly ?? null,
      settings.notifyWeeklyDigest ?? null,
      settings.notifyEmail ?? null,
      settings.notifySms ?? null,
      settings.loginAlerts ?? null,
      settings.autoBlockHighRisk ?? null,
      settings.autoBlockThreshold ?? null,
      settings.theme ?? null,
    ]
  );
}

/* ========================================================================== */
/* TRANSACTIONS                                                               */
/* ========================================================================== */

/**
 * POST /api/transactions
 * Accepts the exact JSON body the TransactionCheck form already builds
 * (transactionId, amount, transactionType, accountAge, location, deviceType,
 *  transactionDate, transactionTime, transactionCount, previousAmount, …).
 */
export async function createTransaction(payload) {
  const { rows } = await query("SELECT fn_create_transaction($1::jsonb) AS reference", [
    JSON.stringify(payload),
  ]);
  return rows[0].reference;
}

/**
 * GET /api/transactions
 * All filters optional — pass `null` to ignore one.
 * Returns { data, page, pageSize, total, totalPages }.
 */
export async function searchTransactions({
  search = null,
  status = null,
  riskLevel = null,
  dateFrom = null,
  dateTo = null,
  minAmount = null,
  maxAmount = null,
  userId = null,
  type = null,
  sort = "date_desc",
  page = 1,
  pageSize = 20,
} = {}) {
  const limit = Math.min(Math.max(Number(pageSize) || 20, 1), 200);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const { rows } = await query(
    `SELECT * FROM fn_search_transactions($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [search, status, riskLevel, dateFrom, dateTo, minAmount, maxAmount, userId, type, sort, limit, offset]
  );

  const total = rows.length ? Number(rows[0].total_count) : 0;
  return {
    data: rows.map(({ total_count, ...row }) => row),
    page: Number(page) || 1,
    pageSize: limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/** GET /api/transactions/:reference — transaction + status timeline + result. */
export async function getTransaction(reference) {
  const row = await queryOne("SELECT fn_get_transaction($1) AS data", [reference]);
  return row?.data ?? null;
}

/** PATCH /api/transactions/:reference/review — analyst decision. */
export async function reviewTransaction(reference, reviewerId, newStatus, notes = null) {
  await query("SELECT fn_review_transaction($1, $2, $3::transaction_status, $4)", [
    reference,
    reviewerId,
    newStatus,
    notes,
  ]);
  return getTransaction(reference);
}

/* ========================================================================== */
/* FRAUD PREDICTION (ML + XAI)                                                */
/* ========================================================================== */

/**
 * POST /api/fraud/predict — persist what the ML + XAI services returned.
 *
 * Flow once the model exists:
 *   1. reference = await createTransaction(formBody)
 *   2. mlOutput  = await fetch(ML_SERVICE_URL + '/predict', …)
 *   3. await recordPrediction({ reference, ...mlOutput })
 *   4. return await getFraudResult(reference)   ← FraudResult page payload
 */
export async function recordPrediction({
  reference,
  fraudProbability,
  riskScore,
  modelVersion,
  indicators = [],
  explanation = null,
  importantFeatures = [],
  featureContributions = {},
  warnings = [],
  featureSnapshot = {},
  inferenceMs = null,
  confidence = null,
}) {
  const row = await queryOne(
    `SELECT fn_record_prediction(
        $1, $2, $3, $4,
        $5::jsonb, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12
     ) AS prediction_id`,
    [
      reference,
      fraudProbability,
      riskScore,
      modelVersion,
      JSON.stringify(indicators),
      explanation,
      JSON.stringify(importantFeatures),
      JSON.stringify(featureContributions),
      JSON.stringify(warnings),
      JSON.stringify(featureSnapshot),
      inferenceMs,
      confidence,
    ]
  );
  return row.prediction_id;
}

/** GET /api/fraud/results/:reference — ready-to-render FraudResult payload. */
export async function getFraudResult(reference) {
  const row = await queryOne("SELECT fn_get_fraud_result($1) AS result", [reference]);
  return row?.result ?? null;
}

/* ========================================================================== */
/* ANALYTICS                                                                  */
/* ========================================================================== */

/** GET /api/analytics/summary — Dashboard KPI cards. */
export async function getDashboardSummary() {
  return queryOne("SELECT * FROM v_dashboard_summary");
}

/** GET /api/analytics — full Analytics page payload. */
export async function getAnalytics() {
  const row = await queryOne("SELECT fn_get_analytics() AS data");
  return row?.data ?? null;
}

/** GET /api/risk-analysis */
export async function getRiskAnalysis(limit = 20) {
  const row = await queryOne("SELECT fn_get_risk_analysis($1) AS data", [limit]);
  return row?.data ?? null;
}

/** GET /api/transactions?limit=10 — Dashboard "Recent Transactions" table. */
export async function getRecentTransactions(limit = 10) {
  const { rows } = await query("SELECT * FROM v_recent_transactions LIMIT $1", [limit]);
  return rows;
}

/** GET /api/analytics/models */
export async function getModelPerformance() {
  const { rows } = await query("SELECT * FROM v_model_performance");
  return rows;
}

/** POST /api/analytics/refresh — refresh the materialized view after batch scoring. */
export async function refreshAnalytics() {
  await query("SELECT fn_refresh_analytics()");
  return { refreshed: true };
}

/* ========================================================================== */
/* AUDIT                                                                      */
/* ========================================================================== */

export async function logAudit({
  userId = null,
  action,
  entityType,
  entityId = null,
  details = {},
  status = "SUCCESS",
  ip = null,
  userAgent = null,
}) {
  return queryOne(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, status, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
     RETURNING id, created_at`,
    [userId, action, entityType, entityId, JSON.stringify(details), status, ip, userAgent]
  );
}

export async function getAuditTrail(userId, limit = 50) {
  const { rows } = await query(
    `SELECT action, entity_type, entity_id, status, details, ip_address, created_at
       FROM audit_logs
      WHERE ($1::uuid IS NULL OR user_id = $1)
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export default {
  authenticate,
  createUser,
  getUserProfile,
  updateUserProfile,
  updateUserSettings,
  createTransaction,
  searchTransactions,
  getTransaction,
  reviewTransaction,
  recordPrediction,
  getFraudResult,
  getDashboardSummary,
  getAnalytics,
  getRiskAnalysis,
  getRecentTransactions,
  getModelPerformance,
  refreshAnalytics,
  logAudit,
  getAuditTrail,
};
