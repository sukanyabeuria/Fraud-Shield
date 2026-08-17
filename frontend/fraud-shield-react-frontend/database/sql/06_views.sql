-- ============================================================================
--  FRAUD-SHIELD · 06_views.sql
--  Reporting views — each one maps to a specific screen/endpoint
--  Run order: 6 of 9
-- ----------------------------------------------------------------------------
--  VIEW                            FRONTEND CONSUMER                 ENDPOINT
--  v_transaction_overview          History table / Dashboard table   GET  /api/transactions
--  v_fraud_result                  Fraud Result page (full JSON)     GET  /api/fraud/results/:id
--  v_dashboard_summary             Dashboard KPI cards               GET  /api/analytics/summary
--  v_transactions_by_risk_level    Risk Distribution pie             GET  /api/analytics
--  v_transactions_by_status        Status breakdown                  GET  /api/analytics
--  v_fraud_trend_daily / _monthly  Fraud Trend chart                 GET  /api/analytics
--  v_transaction_activity_hourly   Transaction Activity area chart   GET  /api/analytics
--  v_volume_by_type                Volume by Channel bars            GET  /api/analytics
--  v_recent_transactions           Dashboard "Recent Transactions"   GET  /api/transactions?limit=10
--  v_high_risk_transactions        High-risk work queue              GET  /api/risk-analysis
--  v_critical_risk_transactions    Critical queue / auto-blocked     GET  /api/risk-analysis
--  v_highest_risk_transactions     "Highest risk" list               GET  /api/risk-analysis
--  v_top_suspicious_merchants      Top suspicious merchants          GET  /api/risk-analysis
--  v_device_risk_stats             Device Risk Statistics            GET  /api/risk-analysis
--  v_location_risk_stats           Location Risk Statistics          GET  /api/risk-analysis
--  v_risk_indicator_frequency      "Most common fraud reasons"       GET  /api/risk-analysis
--  v_model_performance             Detection statistics panel        GET  /api/analytics/models
--  v_user_profile                  Profile page                      GET  /api/users/me
--  mv_daily_fraud_metrics          cached trend (materialized)       GET  /api/analytics?cached=1
-- ============================================================================

SET search_path TO fraudshield, public;

-- ============================================================================
-- 1. v_transaction_overview — the canonical "one row per transaction" view.
--    Column aliases deliberately match the frontend object keys in
--    src/data/mockData.js (id, date, amount, type, status, riskScore, riskLevel).
-- ============================================================================
CREATE OR REPLACE VIEW v_transaction_overview AS
SELECT
    t.id                                        AS uuid,
    t.reference                                 AS id,             -- UI "Transaction ID"
    t.user_id,
    u.full_name                                 AS user_name,
    u.email                                     AS user_email,
    t.transaction_date                          AS date,
    t.amount,
    t.currency,
    t.transaction_type                          AS type,
    t.merchant,
    t.merchant_category,
    t.location_label                            AS location,
    t.location_country,
    t.device_type                               AS device,
    t.ip_address,
    t.is_vpn,
    t.channel,
    t.account_age_months                        AS account_age,
    t.txn_count_24h,
    t.previous_amount,
    t.is_international,
    t.is_new_recipient,
    t.is_card_present,
    t.status,
    -- latest ML output (NULL while the transaction is still PENDING)
    p.id                                        AS prediction_id,
    p.prediction,
    p.fraud_probability,
    p.risk_score                                AS "riskScore",
    p.risk_level                                AS "riskLevel",          -- enum: LOW|MEDIUM|HIGH|CRITICAL
    -- UI-ready labels so the API does not have to translate enums by hand.
    -- CRITICAL is folded into "High" because RiskBadge.jsx renders Low/Medium/High.
    CASE p.risk_level
        WHEN 'LOW' THEN 'Low' WHEN 'MEDIUM' THEN 'Medium' ELSE 'High'
    END                                         AS risk_level_label,
    CASE t.status
        WHEN 'SAFE' THEN 'Safe'
        WHEN 'SUSPICIOUS' THEN 'Suspicious'
        WHEN 'FRAUD' THEN 'Fraud'
        WHEN 'BLOCKED' THEN 'Fraud'
        WHEN 'REVERSED' THEN 'Fraud'
        ELSE 'Pending'
    END                                         AS status_label,
    p.confidence,
    p.decision,
    p.model_version,
    p.predicted_at,
    p.reviewed_by,
    p.reviewed_at,
    (SELECT count(*) FROM risk_indicators ri WHERE ri.prediction_id = p.id) AS indicator_count,
    t.created_at
FROM transactions t
JOIN users u              ON u.id = t.user_id
LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest;

COMMENT ON VIEW v_transaction_overview IS
  'Transaction + owner + latest prediction. Base view for listing, search and most analytics.';

-- ============================================================================
-- 2. v_fraud_result — complete Fraud Result page payload as a single JSONB row.
--    Keys mirror exactly what src/pages/FraudResult.jsx already consumes.
-- ============================================================================
CREATE OR REPLACE VIEW v_fraud_result AS
SELECT
    t.reference AS transaction_ref,
    p.id        AS prediction_id,
    jsonb_build_object(
        'transactionId', t.reference,
        'isFraud',       (p.prediction = 'FRAUD'),
        'verdict',       CASE p.prediction
                             WHEN 'FRAUD'      THEN 'Fraudulent'
                             WHEN 'SUSPICIOUS' THEN 'Suspicious'
                             ELSE                   'Genuine'
                         END,
        'riskScore',     p.risk_score,
        -- Low | Medium | High — exactly the values RiskBadge.jsx / RiskScore.jsx expect
        'riskLevel',     CASE p.risk_level
                             WHEN 'LOW' THEN 'Low' WHEN 'MEDIUM' THEN 'Medium' ELSE 'High'
                         END,
        'riskLevelRaw',  p.risk_level,
        'fraudProbability', p.fraud_probability,
        'confidence',    p.confidence,
        'decision',      p.decision,
        'modelVersion',  p.model_version,
        'evaluatedAt',   p.predicted_at,
        'status',        t.status,
        'summary', jsonb_build_object(
            'transactionId',   t.reference,
            'amount',          t.amount,
            'currency',        t.currency,
            'transactionType', t.transaction_type,
            'merchant',        t.merchant,
            'merchantCategory',t.merchant_category,
            'location',        t.location_label,
            'deviceType',      t.device_type,
            'ipAddress',       host(t.ip_address),
            'transactionDate', to_char(t.transaction_date, 'YYYY-MM-DD'),
            'transactionTime', to_char(t.transaction_date, 'HH24:MI'),
            'accountAge',      t.account_age_months,
            'transactionCount',t.txn_count_24h,
            'previousAmount',  t.previous_amount,
            'accountBalance',  t.account_balance,
            'cardPresent',     t.is_card_present,
            'internationalTransfer', t.is_international,
            'newRecipient',    t.is_new_recipient
        ),
        -- Only triggered factors become "reasons". If nothing was triggered we
        -- return the same friendly fallback the frontend mock already renders.
        'reasons', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                       'key',    lower(ri.indicator_type),
                       'title',  ri.indicator_name,
                       'text',   ri.description,
                       'detail', COALESCE(ri.observed_value, '') ||
                                 CASE WHEN ri.expected_value IS NOT NULL
                                      THEN ' (expected ' || ri.expected_value || ')' ELSE '' END,
                       'impact', ri.contribution,
                       'severity', ri.severity
                   ) ORDER BY ri.contribution DESC)
            FROM risk_indicators ri
            WHERE ri.prediction_id = p.id AND ri.is_triggered
        ), jsonb_build_array(jsonb_build_object(
               'key',    'safe',
               'title',  'Consistent Behaviour',
               'text',   'All monitored features fall inside this account''s normal behavioural range.',
               'detail', 'No anomaly thresholds were crossed.',
               'impact', 0,
               'severity', 'INFO'
           ))),
        'factors', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                       'label',  ri.indicator_name,
                       'impact', ri.contribution,
                       'triggered', ri.is_triggered
                   ) ORDER BY ri.contribution DESC)
            FROM risk_indicators ri WHERE ri.prediction_id = p.id
        ), '[]'::jsonb),
        'warnings',           COALESCE(e.warnings, '[]'::jsonb),
        'explanation',        e.explanation,
        'importantFeatures',  COALESCE(e.important_features, '[]'::jsonb),
        'featureContributions', COALESCE(e.feature_contributions, '{}'::jsonb),
        'recommendedAction',  e.recommended_action
    ) AS payload
FROM transactions t
JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
LEFT JOIN explanations e ON e.prediction_id = p.id AND e.method = 'SHAP';

COMMENT ON VIEW v_fraud_result IS
  'Single-row JSONB payload for GET /api/fraud/results/:reference — shaped for the existing FraudResult page.';

-- ============================================================================
-- 3. v_dashboard_summary — every KPI card on the Dashboard in ONE row.
-- ============================================================================
CREATE OR REPLACE VIEW v_dashboard_summary AS
WITH base AS (
    SELECT t.id, t.amount, t.status, p.risk_score, p.fraud_probability, p.prediction, p.risk_level
    FROM transactions t
    LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
)
SELECT
    count(*)                                                              AS total_transactions,
    count(*) FILTER (WHERE status = 'SAFE')                               AS safe_transactions,
    count(*) FILTER (WHERE status = 'SUSPICIOUS')                         AS suspicious_transactions,
    count(*) FILTER (WHERE status IN ('FRAUD', 'BLOCKED'))                AS fraud_detected,
    count(*) FILTER (WHERE status = 'PENDING')                            AS pending_transactions,
    count(*) FILTER (WHERE prediction = 'GENUINE')                        AS genuine_predictions,
    count(*) FILTER (WHERE prediction = 'FRAUD')                          AS fraud_predictions,
    count(*) FILTER (WHERE risk_level = 'HIGH')                           AS high_risk_transactions,
    count(*) FILTER (WHERE risk_level = 'CRITICAL')                       AS critical_risk_transactions,
    ROUND(100.0 * count(*) FILTER (WHERE prediction = 'FRAUD')
                / NULLIF(count(*) FILTER (WHERE prediction IS NOT NULL), 0), 2) AS fraud_percentage,
    ROUND(AVG(risk_score)::NUMERIC, 0)                                    AS overall_risk_score,
    ROUND(AVG(risk_score)::NUMERIC, 2)                                    AS avg_risk_score,
    ROUND(AVG(fraud_probability)::NUMERIC, 4)                             AS avg_fraud_probability,
    COALESCE(SUM(amount), 0)                                              AS total_amount,
    COALESCE(SUM(amount) FILTER (WHERE status IN ('FRAUD', 'BLOCKED')), 0) AS blocked_amount,
    ROUND(COALESCE(AVG(amount), 0), 2)                                    AS avg_transaction_amount
FROM base;

COMMENT ON VIEW v_dashboard_summary IS 'One-row KPI payload for GET /api/analytics/summary.';

-- ============================================================================
-- 4. Distribution views (pie / bar charts)
-- ============================================================================
CREATE OR REPLACE VIEW v_transactions_by_risk_level AS
SELECT
    l.risk_level                                                          AS name,
    COALESCE(count(p.id), 0)                                              AS value,
    ROUND(100.0 * COALESCE(count(p.id), 0)
          / NULLIF(SUM(count(p.id)) OVER (), 0), 2)                       AS percentage,
    COALESCE(ROUND(AVG(p.risk_score)::NUMERIC, 1), 0)                     AS avg_risk_score,
    COALESCE(SUM(t.amount), 0)                                            AS total_amount,
    CASE l.risk_level
        WHEN 'LOW' THEN '#22c55e' WHEN 'MEDIUM' THEN '#f59e0b'
        WHEN 'HIGH' THEN '#ef4444' ELSE '#b91c1c' END                     AS color
FROM (SELECT unnest(enum_range(NULL::risk_level)) AS risk_level) l
LEFT JOIN fraud_predictions p ON p.risk_level = l.risk_level AND p.is_latest
LEFT JOIN transactions t      ON t.id = p.transaction_id
GROUP BY l.risk_level
ORDER BY l.risk_level;

CREATE OR REPLACE VIEW v_transactions_by_status AS
SELECT
    s.status                                                     AS name,
    count(t.id)                                                  AS value,
    ROUND(100.0 * count(t.id) / NULLIF(SUM(count(t.id)) OVER (), 0), 2) AS percentage,
    COALESCE(SUM(t.amount), 0)                                   AS total_amount
FROM (SELECT unnest(enum_range(NULL::transaction_status)) AS status) s
LEFT JOIN transactions t ON t.status = s.status
GROUP BY s.status
ORDER BY s.status;

CREATE OR REPLACE VIEW v_volume_by_type AS
SELECT
    t.transaction_type                                            AS type,
    count(*)                                                      AS volume,
    count(*) FILTER (WHERE p.prediction = 'FRAUD')                AS fraud,
    ROUND(100.0 * count(*) FILTER (WHERE p.prediction = 'FRAUD')
          / NULLIF(count(*), 0), 2)                               AS fraud_rate,
    ROUND(COALESCE(AVG(p.risk_score), 0)::NUMERIC, 1)             AS avg_risk_score,
    COALESCE(SUM(t.amount), 0)                                    AS total_amount
FROM transactions t
LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
GROUP BY t.transaction_type
ORDER BY volume DESC;

-- ============================================================================
-- 5. Time-series views (Fraud Trend + Transaction Activity charts)
-- ============================================================================
CREATE OR REPLACE VIEW v_fraud_trend_daily AS
SELECT
    date_trunc('day', t.transaction_date)::DATE                   AS day,
    count(*)                                                      AS total,
    count(*) FILTER (WHERE p.prediction = 'FRAUD')                AS fraud,
    count(*) FILTER (WHERE p.prediction = 'SUSPICIOUS')           AS suspicious,
    count(*) FILTER (WHERE p.prediction = 'GENUINE')              AS genuine,
    ROUND(100.0 * count(*) FILTER (WHERE p.prediction = 'FRAUD')
          / NULLIF(count(*), 0), 2)                               AS fraud_rate,
    ROUND(COALESCE(AVG(p.risk_score), 0)::NUMERIC, 1)             AS avg_risk_score,
    COALESCE(SUM(t.amount) FILTER (WHERE p.prediction = 'FRAUD'), 0) AS fraud_amount
FROM transactions t
LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
GROUP BY 1
ORDER BY 1;

CREATE OR REPLACE VIEW v_fraud_trend_monthly AS
SELECT
    to_char(date_trunc('month', t.transaction_date), 'Mon')       AS month,
    date_trunc('month', t.transaction_date)::DATE                 AS month_start,
    count(*)                                                      AS total,
    count(*) FILTER (WHERE p.prediction = 'FRAUD')                AS fraud,
    count(*) FILTER (WHERE p.prediction <> 'FRAUD')               AS genuine,
    ROUND(100.0 * count(*) FILTER (WHERE p.prediction = 'FRAUD')
          / NULLIF(count(*), 0), 2)                               AS rate,
    ROUND(COALESCE(AVG(p.risk_score), 0)::NUMERIC, 1)             AS avg_risk_score
FROM transactions t
LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
GROUP BY date_trunc('month', t.transaction_date)
ORDER BY month_start;

-- 3-hour buckets over the last 24 h — matches the Dashboard activity chart.
CREATE OR REPLACE VIEW v_transaction_activity_hourly AS
SELECT
    to_char(bucket, 'HH24:00')                                    AS time,
    bucket                                                        AS bucket_start,
    count(t.id)                                                   AS transactions,
    count(t.id) FILTER (WHERE p.prediction <> 'GENUINE')          AS flagged,
    ROUND(COALESCE(AVG(p.risk_score), 0)::NUMERIC, 1)             AS avg_risk_score
FROM generate_series(
        date_trunc('hour', now()) - INTERVAL '21 hours',
        date_trunc('hour', now()),
        INTERVAL '3 hours') AS bucket
LEFT JOIN transactions t
       ON t.transaction_date >= bucket
      AND t.transaction_date <  bucket + INTERVAL '3 hours'
LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
GROUP BY bucket
ORDER BY bucket;

-- Average risk by hour of day (Analytics "Time-based Analysis").
CREATE OR REPLACE VIEW v_hourly_risk_profile AS
SELECT
    lpad(EXTRACT(HOUR FROM t.transaction_date)::TEXT, 2, '0') || ':00' AS hour,
    EXTRACT(HOUR FROM t.transaction_date)::INT                    AS hour_of_day,
    count(*)                                                      AS volume,
    ROUND(COALESCE(AVG(p.risk_score), 0)::NUMERIC, 1)             AS avg_risk,
    count(*) FILTER (WHERE p.prediction = 'FRAUD')                AS fraud
FROM transactions t
LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
GROUP BY 1, 2
ORDER BY hour_of_day;

-- ============================================================================
-- 6. Work-queue / listing views
-- ============================================================================
CREATE OR REPLACE VIEW v_recent_transactions AS
SELECT * FROM v_transaction_overview
ORDER BY date DESC
LIMIT 20;

CREATE OR REPLACE VIEW v_high_risk_transactions AS
SELECT * FROM v_transaction_overview
WHERE "riskLevel" = 'HIGH'
ORDER BY "riskScore" DESC, date DESC;

CREATE OR REPLACE VIEW v_critical_risk_transactions AS
SELECT * FROM v_transaction_overview
WHERE "riskLevel" = 'CRITICAL'
ORDER BY "riskScore" DESC, date DESC;

CREATE OR REPLACE VIEW v_highest_risk_transactions AS
SELECT * FROM v_transaction_overview
WHERE "riskScore" IS NOT NULL
ORDER BY "riskScore" DESC, amount DESC
LIMIT 25;

CREATE OR REPLACE VIEW v_pending_review_queue AS
SELECT * FROM v_transaction_overview
WHERE prediction IN ('SUSPICIOUS', 'FRAUD')
  AND reviewed_at IS NULL
ORDER BY "riskScore" DESC, date DESC;

-- ============================================================================
-- 7. Risk-concentration analytics
-- ============================================================================
CREATE OR REPLACE VIEW v_top_suspicious_merchants AS
SELECT
    t.merchant,
    t.merchant_category,
    count(*)                                                      AS total_transactions,
    count(*) FILTER (WHERE p.prediction = 'FRAUD')                AS fraud_transactions,
    count(*) FILTER (WHERE p.prediction = 'SUSPICIOUS')           AS suspicious_transactions,
    ROUND(100.0 * count(*) FILTER (WHERE p.prediction = 'FRAUD')
          / NULLIF(count(*), 0), 2)                               AS fraud_rate,
    ROUND(COALESCE(AVG(p.risk_score), 0)::NUMERIC, 1)             AS avg_risk_score,
    MAX(p.risk_score)                                             AS max_risk_score,
    COALESCE(SUM(t.amount) FILTER (WHERE p.prediction = 'FRAUD'), 0) AS fraud_amount
FROM transactions t
LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
WHERE t.merchant IS NOT NULL
GROUP BY t.merchant, t.merchant_category
HAVING count(*) >= 1
ORDER BY avg_risk_score DESC, fraud_transactions DESC
LIMIT 20;

CREATE OR REPLACE VIEW v_device_risk_stats AS
SELECT
    t.device_type                                                 AS device,
    count(*)                                                      AS transactions,
    ROUND(COALESCE(AVG(p.risk_score), 0)::NUMERIC, 0)             AS risk,
    count(*) FILTER (WHERE p.prediction = 'FRAUD')                AS fraud,
    ROUND(100.0 * count(*) FILTER (WHERE p.prediction = 'FRAUD')
          / NULLIF(count(*), 0), 2)                               AS fraud_rate
FROM transactions t
LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
GROUP BY t.device_type
ORDER BY risk DESC;

CREATE OR REPLACE VIEW v_location_risk_stats AS
SELECT
    COALESCE(t.location_label, 'Unknown')                         AS location,
    t.location_country                                            AS country,
    count(*)                                                      AS transactions,
    ROUND(COALESCE(AVG(p.risk_score), 0)::NUMERIC, 0)             AS risk,
    count(*) FILTER (WHERE p.prediction = 'FRAUD')                AS fraud,
    bool_or(t.is_vpn)                                             AS has_vpn_traffic,
    COALESCE(SUM(t.amount), 0)                                    AS total_amount
FROM transactions t
LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
GROUP BY t.location_label, t.location_country
ORDER BY risk DESC;

CREATE OR REPLACE VIEW v_risk_indicator_frequency AS
SELECT
    ri.indicator_type,
    ri.indicator_name,
    count(*)                                                      AS occurrences,
    ROUND(AVG(ri.contribution)::NUMERIC, 2)                       AS avg_contribution,
    count(*) FILTER (WHERE ri.severity IN ('HIGH', 'CRITICAL'))   AS severe_occurrences,
    ROUND(100.0 * count(*) / NULLIF(SUM(count(*)) OVER (), 0), 2) AS share_percentage
FROM risk_indicators ri
WHERE ri.is_triggered
GROUP BY ri.indicator_type, ri.indicator_name
ORDER BY occurrences DESC, avg_contribution DESC;

-- ============================================================================
-- 8. Model + user views
-- ============================================================================
CREATE OR REPLACE VIEW v_model_performance AS
SELECT
    m.id,
    m.model_name,
    m.version,
    m.algorithm,
    m.accuracy,
    m.precision_score                       AS "precision",
    m.recall_score                          AS "recall",
    m.f1_score,
    m.roc_auc,
    m.false_positive_rate,
    m.is_active,
    m.trained_at,
    m.deployed_at,
    m.avg_inference_ms,
    count(p.id)                             AS predictions_made,
    count(p.id) FILTER (WHERE p.prediction = 'FRAUD') AS frauds_flagged,
    ROUND(COALESCE(AVG(p.risk_score), 0)::NUMERIC, 1) AS avg_risk_score,
    ROUND(COALESCE(AVG(p.inference_time_ms), 0)::NUMERIC, 0) AS measured_avg_ms
FROM model_versions m
LEFT JOIN fraud_predictions p ON p.model_version_id = m.id
GROUP BY m.id
ORDER BY m.is_active DESC, m.trained_at DESC;

CREATE OR REPLACE VIEW v_user_profile AS
SELECT
    u.id,
    u.full_name                              AS name,   -- frontend key
    u.email,
    u.role,
    u.job_title,
    u.team,
    u.phone,
    u.avatar_url,
    u.is_active,
    u.two_factor_enabled,
    u.last_login_at,
    u.created_at                             AS joined_at,
    s.theme,
    s.notify_fraud_alerts,
    s.notify_high_risk_only,
    s.notify_weekly_digest,
    s.notify_email,
    s.notify_sms,
    s.login_alerts,
    s.auto_block_high_risk,
    s.auto_block_threshold,
    (SELECT count(*) FROM transactions t WHERE t.user_id = u.id) AS transaction_count
FROM users u
LEFT JOIN user_settings s ON s.user_id = u.id;

-- ============================================================================
-- 9. Materialized view — pre-aggregated daily metrics.
--    Use for large datasets; refresh from a cron job / after batch scoring.
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS mv_daily_fraud_metrics;
CREATE MATERIALIZED VIEW mv_daily_fraud_metrics AS
SELECT
    date_trunc('day', t.transaction_date)::DATE                   AS day,
    count(*)                                                      AS total_transactions,
    count(*) FILTER (WHERE p.prediction = 'FRAUD')                AS fraud_count,
    count(*) FILTER (WHERE p.prediction = 'SUSPICIOUS')           AS suspicious_count,
    count(*) FILTER (WHERE p.prediction = 'GENUINE')              AS genuine_count,
    ROUND(COALESCE(AVG(p.risk_score), 0)::NUMERIC, 2)             AS avg_risk_score,
    ROUND(COALESCE(AVG(p.fraud_probability), 0)::NUMERIC, 4)      AS avg_fraud_probability,
    COALESCE(SUM(t.amount), 0)                                    AS total_amount,
    COALESCE(SUM(t.amount) FILTER (WHERE p.prediction = 'FRAUD'), 0) AS fraud_amount
FROM transactions t
LEFT JOIN fraud_predictions p ON p.transaction_id = t.id AND p.is_latest
GROUP BY 1
WITH DATA;

-- unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_daily_fraud_metrics_day
    ON mv_daily_fraud_metrics (day);

CREATE OR REPLACE FUNCTION fn_refresh_analytics()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_fraud_metrics;
EXCEPTION WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW mv_daily_fraud_metrics;  -- first run / no concurrency
END;
$$;

COMMENT ON FUNCTION fn_refresh_analytics() IS
  'Call from a scheduled job (pg_cron / node-cron) after batch scoring: SELECT fn_refresh_analytics();';
