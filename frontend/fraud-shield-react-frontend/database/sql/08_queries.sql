-- ============================================================================
--  FRAUD-SHIELD · 08_queries.sql
--  API-ready query library: search, filtering, sorting, pagination
--  Run order: 8 of 9
-- ----------------------------------------------------------------------------
--  This file installs SQL FUNCTIONS (so the backend calls one statement instead
--  of building SQL strings — which also removes any chance of SQL injection)
--  and, at the bottom, a set of PREPARE templates + copy-paste examples for
--  every endpoint the REST API will expose.
--
--  NEVER concatenate user input into SQL in the backend. Always either:
--      client.query('SELECT * FROM fn_search_transactions($1,$2,...)', [...])
--   or client.query('SELECT ... WHERE reference = $1', [ref])
-- ============================================================================

SET search_path TO fraudshield, public;

-- ===========================================================================
-- 1. ★ fn_search_transactions — the single query behind GET /api/transactions
--    Handles: free-text search, status filter, risk-level filter, date range,
--    amount range, per-user scoping, sorting and pagination.
--    Any NULL parameter means "no filter", so the API can pass req.query
--    straight through.  total_count is returned on every row (window function)
--    so the client gets pagination metadata without a second round-trip.
-- ===========================================================================
DROP FUNCTION IF EXISTS fn_search_transactions(TEXT, transaction_status, risk_level,
    TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, NUMERIC, UUID, transaction_type, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION fn_search_transactions(
    p_search      TEXT               DEFAULT NULL,   -- reference / merchant / location / type
    p_status      transaction_status DEFAULT NULL,
    p_risk_level  risk_level         DEFAULT NULL,
    p_date_from   TIMESTAMPTZ        DEFAULT NULL,
    p_date_to     TIMESTAMPTZ        DEFAULT NULL,
    p_min_amount  NUMERIC            DEFAULT NULL,
    p_max_amount  NUMERIC            DEFAULT NULL,
    p_user_id     UUID               DEFAULT NULL,
    p_type        transaction_type   DEFAULT NULL,
    p_sort        TEXT               DEFAULT 'date_desc',
    p_limit       INT                DEFAULT 20,
    p_offset      INT                DEFAULT 0
)
RETURNS TABLE (
    reference        VARCHAR(40),
    transaction_date TIMESTAMPTZ,
    amount           NUMERIC,
    currency         CHAR(3),
    transaction_type transaction_type,
    merchant         VARCHAR(120),
    location         VARCHAR(80),
    device           VARCHAR(30),
    status           transaction_status,
    status_label     TEXT,
    risk_score       SMALLINT,
    risk_level       risk_level,
    risk_level_label TEXT,
    prediction       prediction_result,
    fraud_probability NUMERIC,
    user_name        VARCHAR(120),
    indicator_count  BIGINT,
    total_count      BIGINT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        v.id, v.date, v.amount, v.currency, v.type, v.merchant, v.location, v.device,
        v.status, v.status_label, v."riskScore", v."riskLevel", v.risk_level_label,
        v.prediction, v.fraud_probability, v.user_name, v.indicator_count,
        count(*) OVER () AS total_count
    FROM v_transaction_overview v
    WHERE (p_search     IS NULL OR
             v.id            ILIKE '%' || p_search || '%' OR
             v.merchant      ILIKE '%' || p_search || '%' OR
             v.location      ILIKE '%' || p_search || '%' OR
             v.user_name     ILIKE '%' || p_search || '%' OR
             v.type::TEXT    ILIKE '%' || p_search || '%')
      AND (p_status     IS NULL OR v.status      = p_status)
      AND (p_risk_level IS NULL OR v."riskLevel" = p_risk_level)
      AND (p_type       IS NULL OR v.type        = p_type)
      AND (p_date_from  IS NULL OR v.date       >= p_date_from)
      AND (p_date_to    IS NULL OR v.date       <= p_date_to)
      AND (p_min_amount IS NULL OR v.amount     >= p_min_amount)
      AND (p_max_amount IS NULL OR v.amount     <= p_max_amount)
      AND (p_user_id    IS NULL OR v.user_id     = p_user_id)
    ORDER BY
        CASE WHEN p_sort = 'risk_desc'   THEN v."riskScore" END DESC NULLS LAST,
        CASE WHEN p_sort = 'risk_asc'    THEN v."riskScore" END ASC  NULLS LAST,
        CASE WHEN p_sort = 'amount_desc' THEN v.amount      END DESC NULLS LAST,
        CASE WHEN p_sort = 'amount_asc'  THEN v.amount      END ASC  NULLS LAST,
        CASE WHEN p_sort = 'date_asc'    THEN v.date        END ASC  NULLS LAST,
        CASE WHEN p_sort IS NULL OR p_sort NOT IN
                  ('risk_desc','risk_asc','amount_desc','amount_asc','date_asc')
             THEN v.date END DESC NULLS LAST
    LIMIT  GREATEST(1, LEAST(COALESCE(p_limit, 20), 200))   -- hard cap protects the API
    OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

COMMENT ON FUNCTION fn_search_transactions IS
  'GET /api/transactions — every filter is optional (NULL = ignore). Returns total_count for pagination.';

-- ===========================================================================
-- 2. fn_get_transaction — GET /api/transactions/:reference
-- ===========================================================================
CREATE OR REPLACE FUNCTION fn_get_transaction(p_reference TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'transaction', to_jsonb(v) - 'uuid',
        'history', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                       'oldStatus', h.old_status,
                       'newStatus', h.new_status,
                       'changedBy', cu.full_name,
                       'source',    h.source,
                       'reason',    h.change_reason,
                       'changedAt', h.changed_at
                   ) ORDER BY h.changed_at DESC)
            FROM transaction_history h
            LEFT JOIN users cu ON cu.id = h.changed_by
            WHERE h.transaction_id = v.uuid
        ), '[]'::jsonb),
        'result', (SELECT r.payload FROM v_fraud_result r WHERE r.transaction_ref = v.id)
    )
    FROM v_transaction_overview v
    WHERE v.id = p_reference;
$$;

-- ===========================================================================
-- 3. fn_get_fraud_result — GET /api/fraud/results/:reference
--    Returns exactly the object shape src/pages/FraudResult.jsx consumes.
-- ===========================================================================
CREATE OR REPLACE FUNCTION fn_get_fraud_result(p_reference TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT payload FROM v_fraud_result WHERE transaction_ref = p_reference;
$$;

-- ===========================================================================
-- 4. fn_get_analytics — GET /api/analytics  (one JSON document, one round-trip)
-- ===========================================================================
CREATE OR REPLACE FUNCTION fn_get_analytics()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'stats',             (SELECT to_jsonb(s) FROM v_dashboard_summary s),
        'riskDistribution',  (SELECT jsonb_agg(to_jsonb(d)) FROM v_transactions_by_risk_level d),
        'statusBreakdown',   (SELECT jsonb_agg(to_jsonb(s)) FROM v_transactions_by_status s),
        'volumeByType',      (SELECT jsonb_agg(to_jsonb(v)) FROM v_volume_by_type v),
        'fraudTrend',        (SELECT jsonb_agg(to_jsonb(f)) FROM v_fraud_trend_monthly f),
        'fraudTrendDaily',   (SELECT jsonb_agg(to_jsonb(f)) FROM v_fraud_trend_daily f),
        'transactionActivity',(SELECT jsonb_agg(to_jsonb(a)) FROM v_transaction_activity_hourly a),
        'hourlyRisk',        (SELECT jsonb_agg(to_jsonb(h)) FROM v_hourly_risk_profile h),
        'deviceRisk',        (SELECT jsonb_agg(to_jsonb(d)) FROM v_device_risk_stats d),
        'locationRisk',      (SELECT jsonb_agg(to_jsonb(l)) FROM v_location_risk_stats l),
        'topMerchants',      (SELECT jsonb_agg(to_jsonb(m)) FROM v_top_suspicious_merchants m),
        'indicatorFrequency',(SELECT jsonb_agg(to_jsonb(i)) FROM v_risk_indicator_frequency i),
        'models',            (SELECT jsonb_agg(to_jsonb(mv)) FROM v_model_performance mv),
        'generatedAt',       now()
    );
$$;

COMMENT ON FUNCTION fn_get_analytics IS
  'GET /api/analytics — full Analytics page payload in a single query.';

-- ===========================================================================
-- 5. fn_get_risk_analysis — GET /api/risk-analysis
-- ===========================================================================
CREATE OR REPLACE FUNCTION fn_get_risk_analysis(p_limit INT DEFAULT 20)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'highRisk',     (SELECT jsonb_agg(to_jsonb(h)) FROM (
                            SELECT * FROM v_high_risk_transactions LIMIT p_limit) h),
        'criticalRisk', (SELECT jsonb_agg(to_jsonb(c)) FROM (
                            SELECT * FROM v_critical_risk_transactions LIMIT p_limit) c),
        'highestRisk',  (SELECT jsonb_agg(to_jsonb(t)) FROM v_highest_risk_transactions t),
        'pendingReview',(SELECT jsonb_agg(to_jsonb(r)) FROM (
                            SELECT * FROM v_pending_review_queue LIMIT p_limit) r),
        'topMerchants', (SELECT jsonb_agg(to_jsonb(m)) FROM v_top_suspicious_merchants m),
        'deviceRisk',   (SELECT jsonb_agg(to_jsonb(d)) FROM v_device_risk_stats d),
        'locationRisk', (SELECT jsonb_agg(to_jsonb(l)) FROM v_location_risk_stats l)
    );
$$;

-- ===========================================================================
-- 6. fn_authenticate — helper for POST /api/auth/login
--    Verifies the bcrypt hash INSIDE PostgreSQL (constant-time crypt()) and
--    records the attempt in audit_logs. The API still issues the JWT.
--    If you prefer to compare hashes in Node (bcrypt.compare), simply select
--    the user row instead — both approaches are supported.
-- ===========================================================================
CREATE OR REPLACE FUNCTION fn_authenticate(
    p_email TEXT,
    p_password TEXT,
    p_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID, name VARCHAR(120), email CITEXT, role user_role,
    job_title VARCHAR(80), team VARCHAR(80), authenticated BOOLEAN, reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    u users%ROWTYPE;
    v_ok BOOLEAN := FALSE;
    v_reason TEXT := 'INVALID_CREDENTIALS';
BEGIN
    SELECT * INTO u FROM users WHERE users.email = p_email;

    IF u.id IS NULL THEN
        INSERT INTO audit_logs (action, entity_type, details, status, ip_address, user_agent)
        VALUES ('LOGIN_FAILED', 'SESSION',
                jsonb_build_object('email', p_email, 'reason', 'unknown_user'),
                'FAILURE', p_ip, p_user_agent);
        RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR(120), NULL::CITEXT, NULL::user_role,
                            NULL::VARCHAR(80), NULL::VARCHAR(80), FALSE, v_reason;
        RETURN;
    END IF;

    IF NOT u.is_active THEN
        v_reason := 'ACCOUNT_DISABLED';
    ELSIF u.locked_until IS NOT NULL AND u.locked_until > now() THEN
        v_reason := 'ACCOUNT_LOCKED';
    ELSIF u.password_hash = crypt(p_password, u.password_hash) THEN
        v_ok := TRUE;
        v_reason := 'OK';
    END IF;

    IF v_ok THEN
        UPDATE users
           SET last_login_at = now(), failed_login_attempts = 0, locked_until = NULL
         WHERE users.id = u.id;
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, status, ip_address, user_agent)
        VALUES (u.id, 'LOGIN', 'SESSION', u.id::TEXT, '{"method":"password"}'::jsonb,
                'SUCCESS', p_ip, p_user_agent);
    ELSE
        UPDATE users
           SET failed_login_attempts = users.failed_login_attempts + 1,
               locked_until = CASE WHEN users.failed_login_attempts + 1 >= 5
                                   THEN now() + INTERVAL '15 minutes' ELSE users.locked_until END
         WHERE users.id = u.id;
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, status, ip_address, user_agent)
        VALUES (u.id, 'LOGIN_FAILED', 'SESSION', u.id::TEXT,
                jsonb_build_object('reason', v_reason), 'FAILURE', p_ip, p_user_agent);
    END IF;

    RETURN QUERY SELECT u.id, u.full_name, u.email, u.role, u.job_title, u.team, v_ok, v_reason;
END;
$$;

-- ===========================================================================
-- 7. fn_create_transaction — POST /api/transactions
--    Returns the new reference so the API can immediately call the ML service.
-- ===========================================================================
CREATE OR REPLACE FUNCTION fn_create_transaction(p_payload JSONB)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_ref TEXT;
BEGIN
    INSERT INTO transactions (
        user_id, reference, amount, currency, transaction_type, merchant, merchant_category,
        transaction_date, location_label, location_city, location_country,
        device_type, ip_address, is_vpn, account_age_months, txn_count_24h,
        previous_amount, account_balance, is_international, is_new_recipient, is_card_present
    ) VALUES (
        (p_payload->>'userId')::UUID,
        COALESCE(p_payload->>'transactionId',
                 'TXN-' || lpad((floor(random() * 8999999) + 1000000)::INT::TEXT, 7, '0')),
        (p_payload->>'amount')::NUMERIC,
        COALESCE(p_payload->>'currency', 'INR'),
        (p_payload->>'transactionType')::transaction_type,
        p_payload->>'merchant',
        p_payload->>'merchantCategory',
        COALESCE((p_payload->>'transactionDate')::TIMESTAMPTZ, now()),
        p_payload->>'location',
        split_part(COALESCE(p_payload->>'location', ''), ',', 1),
        NULLIF(upper(trim(split_part(COALESCE(p_payload->>'location', ''), ',', 2))), ''),
        COALESCE(p_payload->>'deviceType', 'UNKNOWN'),
        NULLIF(p_payload->>'ipAddress', '')::INET,
        COALESCE((p_payload->>'isVpn')::BOOLEAN, FALSE),
        COALESCE((p_payload->>'accountAge')::INT, 0),
        COALESCE((p_payload->>'transactionCount')::INT, 0),
        NULLIF(p_payload->>'previousAmount', '')::NUMERIC,
        NULLIF(p_payload->>'accountBalance', '')::NUMERIC,
        COALESCE((p_payload->>'internationalTransfer')::BOOLEAN, FALSE),
        COALESCE((p_payload->>'newRecipient')::BOOLEAN, FALSE),
        COALESCE((p_payload->>'cardPresent')::BOOLEAN, FALSE)
    )
    RETURNING reference INTO v_ref;

    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES ((p_payload->>'userId')::UUID, 'TRANSACTION_CREATED', 'TRANSACTION', v_ref,
            jsonb_build_object('amount', p_payload->>'amount',
                               'type',   p_payload->>'transactionType'));
    RETURN v_ref;
END;
$$;

COMMENT ON FUNCTION fn_create_transaction IS
  'POST /api/transactions — accepts the exact JSON body the TransactionCheck form already builds.';


-- ############################################################################
-- #  PREPARED STATEMENT TEMPLATES + RUNNABLE EXAMPLES                        #
-- #  (everything below is safe to execute; PREPARE is session-scoped)        #
-- ############################################################################

-- ---------------------------------------------------------------------------
-- 8.1 SEARCH BY TRANSACTION ID (exact — uses the unique index)
-- ---------------------------------------------------------------------------
PREPARE q_txn_by_reference (TEXT) AS
SELECT * FROM v_transaction_overview WHERE id = $1;
-- EXECUTE q_txn_by_reference('TXN-0920161');

-- 8.2 SEARCH BY TRANSACTION ID (partial — uses idx_txn_reference_trgm)
PREPARE q_txn_reference_like (TEXT) AS
SELECT id, date, amount, status, "riskScore", "riskLevel"
FROM v_transaction_overview
WHERE id ILIKE '%' || $1 || '%'
ORDER BY date DESC
LIMIT 50;
-- EXECUTE q_txn_reference_like('09201');

-- 8.3 SEARCH BY MERCHANT (uses idx_txn_merchant_trgm)
PREPARE q_txn_by_merchant (TEXT) AS
SELECT id, date, merchant, amount, status, "riskScore", "riskLevel"
FROM v_transaction_overview
WHERE merchant ILIKE '%' || $1 || '%'
ORDER BY "riskScore" DESC NULLS LAST, date DESC
LIMIT 100;
-- EXECUTE q_txn_by_merchant('coin');

-- 8.4 FILTER BY RISK LEVEL
PREPARE q_txn_by_risk_level (risk_level) AS
SELECT id, date, amount, merchant, status, "riskScore", "riskLevel"
FROM v_transaction_overview
WHERE "riskLevel" = $1
ORDER BY "riskScore" DESC;
-- EXECUTE q_txn_by_risk_level('CRITICAL');

-- 8.5 FILTER BY STATUS
PREPARE q_txn_by_status (transaction_status) AS
SELECT id, date, amount, merchant, status, "riskScore"
FROM v_transaction_overview
WHERE status = $1
ORDER BY date DESC;
-- EXECUTE q_txn_by_status('FRAUD');

-- 8.6 FILTER BY DATE RANGE
PREPARE q_txn_by_date_range (TIMESTAMPTZ, TIMESTAMPTZ) AS
SELECT id, date, amount, status, "riskScore", "riskLevel"
FROM v_transaction_overview
WHERE date >= $1 AND date <= $2
ORDER BY date DESC;
-- EXECUTE q_txn_by_date_range(now() - INTERVAL '7 days', now());

-- 8.7 FILTER BY AMOUNT RANGE
PREPARE q_txn_by_amount_range (NUMERIC, NUMERIC) AS
SELECT id, date, amount, merchant, status, "riskScore"
FROM v_transaction_overview
WHERE amount BETWEEN $1 AND $2
ORDER BY amount DESC;
-- EXECUTE q_txn_by_amount_range(100000, 500000);

-- 8.8 SORT BY RISK SCORE (paginated)
PREPARE q_txn_sort_risk (INT, INT) AS
SELECT id, date, amount, status, "riskScore", "riskLevel"
FROM v_transaction_overview
WHERE "riskScore" IS NOT NULL
ORDER BY "riskScore" DESC, date DESC
LIMIT $1 OFFSET $2;
-- EXECUTE q_txn_sort_risk(10, 0);

-- 8.9 SORT BY TRANSACTION DATE (paginated — default listing)
PREPARE q_txn_sort_date (INT, INT) AS
SELECT id, date, amount, status, "riskScore", "riskLevel"
FROM v_transaction_overview
ORDER BY date DESC
LIMIT $1 OFFSET $2;
-- EXECUTE q_txn_sort_date(10, 0);

-- 8.10 COMBINED FILTER (the History page sends all of these at once)
PREPARE q_history_page (TEXT, transaction_status, risk_level, TIMESTAMPTZ, TIMESTAMPTZ, INT, INT) AS
SELECT * FROM fn_search_transactions(
    p_search     => $1,
    p_status     => $2,
    p_risk_level => $3,
    p_date_from  => $4,
    p_date_to    => $5,
    p_sort       => 'date_desc',
    p_limit      => $6,
    p_offset     => $7
);
-- EXECUTE q_history_page(NULL, NULL, 'HIGH', NULL, NULL, 8, 0);

-- 8.11 FRAUD RESULT PAGE
PREPARE q_fraud_result (TEXT) AS
SELECT fn_get_fraud_result($1) AS result;
-- EXECUTE q_fraud_result('TXN-0920161');

-- 8.12 TRANSACTION TIMELINE (history drawer)
PREPARE q_txn_history (TEXT) AS
SELECT h.old_status, h.new_status, h.source, h.change_reason, h.changed_at,
       u.full_name AS changed_by
FROM transaction_history h
JOIN transactions t ON t.id = h.transaction_id
LEFT JOIN users u   ON u.id = h.changed_by
WHERE t.reference = $1
ORDER BY h.changed_at DESC;
-- EXECUTE q_txn_history('TXN-0920161');

-- 8.13 USER AUDIT TRAIL
PREPARE q_user_audit (UUID, INT) AS
SELECT action, entity_type, entity_id, status, details, created_at
FROM audit_logs
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2;

-- ---------------------------------------------------------------------------
-- 8.14 ANALYTICS ONE-LINERS (runnable as-is — handy for demos)
-- ---------------------------------------------------------------------------
-- Total / genuine / fraudulent / percentage / averages
--   SELECT * FROM v_dashboard_summary;
-- Transactions by risk level
--   SELECT * FROM v_transactions_by_risk_level;
-- Transactions by status
--   SELECT * FROM v_transactions_by_status;
-- Fraud trend over time
--   SELECT * FROM v_fraud_trend_daily ORDER BY day DESC LIMIT 30;
--   SELECT * FROM v_fraud_trend_monthly;
-- Recent transactions
--   SELECT * FROM v_recent_transactions;
-- Top suspicious merchants
--   SELECT * FROM v_top_suspicious_merchants;
-- Highest-risk transactions
--   SELECT * FROM v_highest_risk_transactions;
-- Device / location risk
--   SELECT * FROM v_device_risk_stats;
--   SELECT * FROM v_location_risk_stats;
-- Everything the Analytics page needs, in one JSON document
--   SELECT jsonb_pretty(fn_get_analytics());

-- ---------------------------------------------------------------------------
-- 8.15 Verification queries — prove the seed data is internally consistent
-- ---------------------------------------------------------------------------
-- (a) every fraud prediction must be HIGH/CRITICAL and have >= 1 indicator
--   SELECT count(*) AS violations
--   FROM fraud_predictions p
--   WHERE p.prediction = 'FRAUD'
--     AND (p.risk_level NOT IN ('HIGH','CRITICAL')
--          OR NOT EXISTS (SELECT 1 FROM risk_indicators ri WHERE ri.prediction_id = p.id));
--
-- (b) every prediction must have an explanation
--   SELECT count(*) AS missing_explanations
--   FROM fraud_predictions p
--   WHERE NOT EXISTS (SELECT 1 FROM explanations e WHERE e.prediction_id = p.id);
--
-- (c) statuses must agree with the latest verdict
--   SELECT t.reference, t.status, p.prediction, p.risk_score
--   FROM transactions t JOIN fraud_predictions p
--     ON p.transaction_id = t.id AND p.is_latest
--   WHERE (p.prediction = 'GENUINE'    AND t.status NOT IN ('SAFE','REVERSED'))
--      OR (p.prediction = 'FRAUD'      AND t.status NOT IN ('FRAUD','BLOCKED','REVERSED','SAFE'));

-- ---------------------------------------------------------------------------
-- 8.16 Index sanity check — confirm the planner uses the indexes
-- ---------------------------------------------------------------------------
--   EXPLAIN ANALYZE SELECT * FROM transactions WHERE reference = 'TXN-0920161';
--   EXPLAIN ANALYZE SELECT * FROM v_transaction_overview
--                   WHERE status = 'FRAUD' ORDER BY date DESC LIMIT 20;
