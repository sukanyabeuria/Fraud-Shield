-- ============================================================================
--  FRAUD-SHIELD · 04_indexes.sql
--  Indexes — every index below maps to a real query the frontend already makes
--  Run order: 4 of 9
-- ----------------------------------------------------------------------------
--  Rule of thumb applied here:
--    * index every foreign key (PostgreSQL does NOT do this automatically)
--    * index every column used in a WHERE / ORDER BY of a dashboard query
--    * use PARTIAL indexes for the small "interesting" subsets (fraud, high risk)
--      because they stay tiny even when the table has millions of rows
--    * use COMPOSITE indexes in (filter, sort) order to satisfy
--      "filter by status then order by date" in a single index scan
--    * use GIN + pg_trgm for substring search, GIN for JSONB
-- ============================================================================

SET search_path TO fraudshield, public;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
-- Login: SELECT ... FROM users WHERE email = $1  → the single hottest query.
-- (uq_users_email already creates a unique btree; this partial index keeps
--  logins fast while ignoring deactivated accounts.)
CREATE INDEX IF NOT EXISTS idx_users_email_active
    ON users (email) WHERE is_active;

-- Admin user list: "recently registered analysts first".
CREATE INDEX IF NOT EXISTS idx_users_role_created
    ON users (role, created_at DESC);

-- Sessions lookup on token refresh + "Active Sessions" panel.
CREATE INDEX IF NOT EXISTS idx_sessions_user_active
    ON user_sessions (user_id, expires_at DESC) WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
-- FK index → fast "all transactions of this customer" + fast user deletion.
CREATE INDEX IF NOT EXISTS idx_txn_user_id
    ON transactions (user_id);

-- GET /api/transactions/:reference  (uq_transactions_reference covers equality).
-- This trigram index additionally powers the History page search box, which
-- does  reference ILIKE '%0920%'  — a plain btree cannot help with that.
CREATE INDEX IF NOT EXISTS idx_txn_reference_trgm
    ON transactions USING gin (reference gin_trgm_ops);

-- Default listing + every chart: ORDER BY transaction_date DESC.
CREATE INDEX IF NOT EXISTS idx_txn_date_desc
    ON transactions (transaction_date DESC);

-- History page: "filter by status, newest first" in one index scan.
CREATE INDEX IF NOT EXISTS idx_txn_status_date
    ON transactions (status, transaction_date DESC);

-- Dashboard KPI "Fraud detected / Suspicious": tiny partial index over the
-- few % of rows that are actually interesting.
CREATE INDEX IF NOT EXISTS idx_txn_flagged
    ON transactions (transaction_date DESC)
    WHERE status IN ('SUSPICIOUS', 'FRAUD', 'BLOCKED');

-- "Top suspicious merchants" analytics + merchant filter.
CREATE INDEX IF NOT EXISTS idx_txn_merchant
    ON transactions (merchant);

-- Merchant free-text search: merchant ILIKE '%amazon%'.
CREATE INDEX IF NOT EXISTS idx_txn_merchant_trgm
    ON transactions USING gin (merchant gin_trgm_ops);

-- Amount-range filter and "largest transactions" sort.
CREATE INDEX IF NOT EXISTS idx_txn_amount
    ON transactions (amount DESC);

-- Transaction-type breakdown chart (volume by channel).
CREATE INDEX IF NOT EXISTS idx_txn_type_date
    ON transactions (transaction_type, transaction_date DESC);

-- Location / device risk statistics pages.
CREATE INDEX IF NOT EXISTS idx_txn_location_country
    ON transactions (location_country);
CREATE INDEX IF NOT EXISTS idx_txn_device_type
    ON transactions (device_type);

-- Network-level fraud rings: "all transactions from this IP".
CREATE INDEX IF NOT EXISTS idx_txn_ip_address
    ON transactions (ip_address) WHERE ip_address IS NOT NULL;

-- Ingestion auditing / "created today" reports.
CREATE INDEX IF NOT EXISTS idx_txn_created_at
    ON transactions (created_at DESC);

-- Per-customer history with date sort (customer portal / drill-down).
CREATE INDEX IF NOT EXISTS idx_txn_user_date
    ON transactions (user_id, transaction_date DESC);

-- ---------------------------------------------------------------------------
-- fraud_predictions
-- ---------------------------------------------------------------------------
-- FK index + "all scores of this transaction, newest first" (re-scoring view).
CREATE INDEX IF NOT EXISTS idx_pred_transaction
    ON fraud_predictions (transaction_id, predicted_at DESC);

-- ONE current score per transaction. This unique partial index is both a
-- constraint and the index used by every JOIN in the views.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pred_latest_per_txn
    ON fraud_predictions (transaction_id) WHERE is_latest;

-- Filter by risk level (History page filter + risk distribution chart).
CREATE INDEX IF NOT EXISTS idx_pred_risk_level
    ON fraud_predictions (risk_level) WHERE is_latest;

-- Sort by risk score (Analytics "highest risk transactions").
CREATE INDEX IF NOT EXISTS idx_pred_risk_score
    ON fraud_predictions (risk_score DESC) WHERE is_latest;

-- Fraud probability threshold queries: WHERE fraud_probability >= 0.7.
CREATE INDEX IF NOT EXISTS idx_pred_probability
    ON fraud_predictions (fraud_probability DESC) WHERE is_latest;

-- Verdict counts for the dashboard KPI cards.
CREATE INDEX IF NOT EXISTS idx_pred_prediction
    ON fraud_predictions (prediction) WHERE is_latest;

-- Fraud-trend chart: GROUP BY date_trunc('day', predicted_at).
CREATE INDEX IF NOT EXISTS idx_pred_predicted_at
    ON fraud_predictions (predicted_at DESC);

-- High/critical work queue: very small partial index, extremely fast.
CREATE INDEX IF NOT EXISTS idx_pred_high_risk_queue
    ON fraud_predictions (predicted_at DESC)
    WHERE is_latest AND risk_level IN ('HIGH', 'CRITICAL');

-- Manual-review queue ("unreviewed suspicious cases").
CREATE INDEX IF NOT EXISTS idx_pred_pending_review
    ON fraud_predictions (predicted_at DESC)
    WHERE is_latest AND reviewed_at IS NULL AND prediction <> 'GENUINE';

-- Model comparison / A-B analysis.
CREATE INDEX IF NOT EXISTS idx_pred_model_version
    ON fraud_predictions (model_version_id, predicted_at DESC);

-- Ad-hoc feature querying: feature_snapshot @> '{"is_vpn": true}'.
CREATE INDEX IF NOT EXISTS idx_pred_features_gin
    ON fraud_predictions USING gin (feature_snapshot jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- risk_indicators
-- ---------------------------------------------------------------------------
-- Fraud Result page: fetch all indicators of one prediction, worst first.
CREATE INDEX IF NOT EXISTS idx_indicator_prediction
    ON risk_indicators (prediction_id, contribution DESC);

-- Analytics: "most common fraud reasons" grouped by type/severity.
CREATE INDEX IF NOT EXISTS idx_indicator_type
    ON risk_indicators (indicator_type);
CREATE INDEX IF NOT EXISTS idx_indicator_severity
    ON risk_indicators (severity) WHERE severity IN ('HIGH', 'CRITICAL');
CREATE INDEX IF NOT EXISTS idx_indicator_created_at
    ON risk_indicators (created_at DESC);

-- ---------------------------------------------------------------------------
-- explanations
-- ---------------------------------------------------------------------------
-- 1:1 fetch on the Fraud Result page (uq_explanation_per_method also helps).
CREATE INDEX IF NOT EXISTS idx_expl_prediction
    ON explanations (prediction_id);

-- Search inside SHAP output: feature_contributions ? 'amount_ratio'.
CREATE INDEX IF NOT EXISTS idx_expl_contributions_gin
    ON explanations USING gin (feature_contributions);
CREATE INDEX IF NOT EXISTS idx_expl_features_gin
    ON explanations USING gin (important_features jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_expl_generated_at
    ON explanations (generated_at DESC);

-- ---------------------------------------------------------------------------
-- transaction_history
-- ---------------------------------------------------------------------------
-- Timeline of one transaction (drill-down drawer).
CREATE INDEX IF NOT EXISTS idx_history_transaction
    ON transaction_history (transaction_id, changed_at DESC);

-- "What did this analyst change?" + global recent-activity feed.
CREATE INDEX IF NOT EXISTS idx_history_changed_by
    ON transaction_history (changed_by, changed_at DESC) WHERE changed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_history_changed_at
    ON transaction_history (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_new_status
    ON transaction_history (new_status, changed_at DESC);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
-- Per-user audit trail (compliance requests).
CREATE INDEX IF NOT EXISTS idx_audit_user_created
    ON audit_logs (user_id, created_at DESC);

-- Global security feed, newest first — the default admin query.
CREATE INDEX IF NOT EXISTS idx_audit_created_at
    ON audit_logs (created_at DESC);

-- "Show me every action on this transaction".
CREATE INDEX IF NOT EXISTS idx_audit_entity
    ON audit_logs (entity_type, entity_id);

-- Brute-force detection: failed logins in the last 15 minutes.
CREATE INDEX IF NOT EXISTS idx_audit_failures
    ON audit_logs (action, created_at DESC) WHERE status = 'FAILURE';

-- Flexible querying of the JSONB payload.
CREATE INDEX IF NOT EXISTS idx_audit_details_gin
    ON audit_logs USING gin (details jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- model_versions
-- ---------------------------------------------------------------------------
-- Guarantees at most ONE active model at a time (constraint + fast lookup).
CREATE UNIQUE INDEX IF NOT EXISTS uq_model_single_active
    ON model_versions ((is_active)) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_model_trained_at
    ON model_versions (trained_at DESC);

-- ---------------------------------------------------------------------------
-- Keep the planner honest after a bulk load / seed.
-- ---------------------------------------------------------------------------
ANALYZE;
