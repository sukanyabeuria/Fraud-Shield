-- ============================================================================
--  FRAUD-SHIELD · 09_security_roles.sql
--  Least-privilege roles, grants and optional Row-Level Security
--  Run order: 9 of 9   (run as a superuser / database owner)
-- ----------------------------------------------------------------------------
--  ⚠ PASSWORDS
--  The role passwords below are intentionally placeholders. Set real ones from
--  your shell so they never end up in git:
--
--     psql -d fraudshield -v api_pw="$DB_API_PASSWORD" \
--          -f database/sql/09_security_roles.sql
--
--  ...or run the ALTER ROLE statements manually after this file.
-- ============================================================================

SET search_path TO fraudshield, public;

-- ---------------------------------------------------------------------------
-- 1. Roles
--    fraudshield_app       → the REST API (read/write, no DDL)
--    fraudshield_ml        → the ML scoring service (reads features, writes predictions)
--    fraudshield_readonly  → BI tools, analysts running ad-hoc SQL, dashboards
--    fraudshield_migrator  → CI/CD migrations only (owns the schema)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fraudshield_app') THEN
        CREATE ROLE fraudshield_app LOGIN PASSWORD 'CHANGE_ME_app';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fraudshield_ml') THEN
        CREATE ROLE fraudshield_ml LOGIN PASSWORD 'CHANGE_ME_ml';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fraudshield_readonly') THEN
        CREATE ROLE fraudshield_readonly LOGIN PASSWORD 'CHANGE_ME_ro';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fraudshield_migrator') THEN
        CREATE ROLE fraudshield_migrator LOGIN PASSWORD 'CHANGE_ME_migrate';
    END IF;
END $$;

-- Nobody may create objects in public (defence against search_path attacks).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA fraudshield TO fraudshield_app, fraudshield_ml, fraudshield_readonly;
GRANT ALL   ON SCHEMA fraudshield TO fraudshield_migrator;

-- ---------------------------------------------------------------------------
-- 2. Table privileges
-- ---------------------------------------------------------------------------
-- API: full DML on operational tables …
GRANT SELECT, INSERT, UPDATE ON
    users, user_settings, user_sessions, transactions, fraud_predictions,
    risk_indicators, explanations, model_versions
TO fraudshield_app;

-- … but append-only on the audit trail (no UPDATE / DELETE — ever).
GRANT SELECT, INSERT ON audit_logs, transaction_history TO fraudshield_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA fraudshield TO fraudshield_app;

-- ML service: reads features, writes predictions + XAI output only.
GRANT SELECT ON transactions, users, model_versions TO fraudshield_ml;
GRANT SELECT, INSERT ON fraud_predictions, risk_indicators, explanations TO fraudshield_ml;
GRANT SELECT, INSERT ON audit_logs TO fraudshield_ml;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA fraudshield TO fraudshield_ml;

-- Read-only analyst / BI role: views only, never base tables with credentials.
GRANT SELECT ON
    v_transaction_overview, v_fraud_result, v_dashboard_summary,
    v_transactions_by_risk_level, v_transactions_by_status, v_volume_by_type,
    v_fraud_trend_daily, v_fraud_trend_monthly, v_transaction_activity_hourly,
    v_hourly_risk_profile, v_recent_transactions, v_high_risk_transactions,
    v_critical_risk_transactions, v_highest_risk_transactions,
    v_pending_review_queue, v_top_suspicious_merchants, v_device_risk_stats,
    v_location_risk_stats, v_risk_indicator_frequency, v_model_performance,
    mv_daily_fraud_metrics
TO fraudshield_readonly;

-- IMPORTANT: the read-only role must never see password hashes.
REVOKE ALL ON users FROM fraudshield_readonly;

-- Function execution
GRANT EXECUTE ON FUNCTION
    fn_search_transactions(TEXT, transaction_status, risk_level, TIMESTAMPTZ,
                           TIMESTAMPTZ, NUMERIC, NUMERIC, UUID, transaction_type, TEXT, INT, INT),
    fn_get_transaction(TEXT), fn_get_fraud_result(TEXT), fn_get_analytics(),
    fn_get_risk_analysis(INT), fn_create_transaction(JSONB),
    fn_review_transaction(TEXT, UUID, transaction_status, TEXT)
TO fraudshield_app;

GRANT EXECUTE ON FUNCTION fn_authenticate(TEXT, TEXT, INET, TEXT) TO fraudshield_app;
GRANT EXECUTE ON FUNCTION fn_record_prediction(TEXT, NUMERIC, INTEGER, TEXT, JSONB, TEXT,
                                               JSONB, JSONB, JSONB, JSONB, INTEGER, NUMERIC)
TO fraudshield_app, fraudshield_ml;
GRANT EXECUTE ON FUNCTION fn_refresh_analytics() TO fraudshield_app, fraudshield_ml;

-- Future objects created by the migrator inherit sane defaults.
ALTER DEFAULT PRIVILEGES IN SCHEMA fraudshield
    GRANT SELECT, INSERT, UPDATE ON TABLES TO fraudshield_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA fraudshield
    GRANT SELECT ON TABLES TO fraudshield_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA fraudshield
    GRANT USAGE, SELECT ON SEQUENCES TO fraudshield_app;

-- ---------------------------------------------------------------------------
-- 3. OPTIONAL — Row-Level Security so CUSTOMER accounts can only ever read
--    their own transactions, even if the API has a bug.
--    The API sets the current user per request:
--        SET LOCAL fraudshield.current_user_id = '<uuid>';
--        SET LOCAL fraudshield.current_role    = 'CUSTOMER';
--    Enable by uncommenting the block below.
-- ---------------------------------------------------------------------------
/*
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_txn_staff_all ON transactions
    FOR ALL
    USING (COALESCE(current_setting('fraudshield.current_role', TRUE), 'ANALYST')
           IN ('ADMIN', 'ANALYST', 'AUDITOR', 'SERVICE'));

CREATE POLICY p_txn_customer_own ON transactions
    FOR SELECT
    USING (user_id = NULLIF(current_setting('fraudshield.current_user_id', TRUE), '')::UUID);

ALTER TABLE fraud_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_pred_visibility ON fraud_predictions
    FOR ALL
    USING (EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id));
*/

-- ---------------------------------------------------------------------------
-- 4. Hardening checklist (apply outside SQL)
-- ---------------------------------------------------------------------------
--  [ ] postgresql.conf : ssl = on, log_connections = on, log_statement = 'ddl'
--  [ ] pg_hba.conf     : hostssl fraudshield fraudshield_app 0.0.0.0/0 scram-sha-256
--  [ ] never expose port 5432 to the public internet
--  [ ] rotate role passwords via your secret manager, never in git
--  [ ] enable pgaudit for regulated environments
--  [ ] nightly `pg_dump -Fc` + point-in-time recovery (WAL archiving)
--  [ ] encrypt backups at rest; restrict who can read them
--  [ ] the API connects ONLY as fraudshield_app (never as postgres)
-- ---------------------------------------------------------------------------
