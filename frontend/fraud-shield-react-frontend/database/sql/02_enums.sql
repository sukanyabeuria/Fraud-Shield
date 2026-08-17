-- ============================================================================
--  FRAUD-SHIELD · 02_enums.sql
--  PostgreSQL ENUM types
--  Run order: 2 of 9
-- ----------------------------------------------------------------------------
--  DESIGN NOTE — when to use an ENUM and when NOT to
--  ------------------------------------------------------------------------
--  ENUM is used ONLY for small, stable, business-critical vocabularies that the
--  application branches on (roles, statuses, risk bands, prediction results).
--  These values are baked into the frontend (RiskBadge, filters, charts), so
--  they must never contain a typo.
--
--  Values that WILL grow over time are deliberately NOT enums, because adding a
--  value to an enum requires a DDL migration and cannot be done inside some
--  transactional migration tools. Those columns use VARCHAR + CHECK or a
--  lookup table instead:
--      * merchant / merchant_category   -> VARCHAR (free text, thousands of values)
--      * device_type                    -> VARCHAR + CHECK (easy to extend)
--      * indicator_type                 -> VARCHAR + CHECK (new ML features appear often)
--      * explanation method             -> VARCHAR + CHECK (SHAP/LIME/…)
--      * currency                       -> CHAR(3) ISO-4217 + CHECK
--
--  All enum blocks are idempotent so the file can be re-run safely.
-- ============================================================================

SET search_path TO fraudshield, public;

-- ---------------------------------------------------------------------------
-- 1. user_role — authorisation level used by the API middleware
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'ADMIN',      -- full access, manages users and models
        'ANALYST',    -- reviews flagged transactions (default console user)
        'AUDITOR',    -- read-only access to transactions + audit logs
        'CUSTOMER',   -- end user, can only see their own transactions
        'SERVICE'     -- machine account used by the ML scoring service
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. transaction_status — lifecycle state shown in the History table
--    Frontend mapping (TransactionTable / RiskBadge):
--      SAFE       -> "Safe"        (green)
--      SUSPICIOUS -> "Suspicious"  (amber)
--      FRAUD      -> "Fraud"       (red)
--      PENDING / BLOCKED / REVERSED are backend states the UI can render later
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM (
        'PENDING',      -- received, not scored yet
        'SAFE',         -- scored genuine, approved
        'SUSPICIOUS',   -- scored medium risk, awaiting manual review
        'FRAUD',        -- confirmed / auto-classified as fraud
        'BLOCKED',      -- stopped by the auto-block rule (score >= 85)
        'REVERSED'      -- money returned to the customer after investigation
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 3. transaction_type — matches TRANSACTION_TYPES in src/data/mockData.js
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'TRANSFER',
        'PAYMENT',
        'WITHDRAWAL',
        'DEPOSIT',
        'CARD_PURCHASE',
        'ONLINE_PURCHASE',
        'CRYPTO_EXCHANGE'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4. risk_level — risk band derived from the 0-100 risk score
--      LOW      0  - 39   (frontend: "Low")
--      MEDIUM   40 - 69   (frontend: "Medium")
--      HIGH     70 - 89   (frontend: "High")
--      CRITICAL 90 - 100  (frontend renders as "High" + auto-block banner)
--    The band boundaries are enforced by a CHECK constraint on fraud_predictions
--    so a row can never disagree with its own score.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 5. prediction_result — raw ML verdict (FraudResult page "verdict")
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE prediction_result AS ENUM ('GENUINE', 'SUSPICIOUS', 'FRAUD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 6. severity_level — severity of an individual risk indicator
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE severity_level AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 7. decision_action — what the platform did with the transaction
--    (drives the "Recommended Action" panel on the Fraud Result page)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE decision_action AS ENUM ('ALLOW', 'REVIEW', 'CHALLENGE', 'BLOCK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Helper: convert a 0-100 risk score into a risk_level.
-- IMMUTABLE so it can be used inside generated columns / index expressions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_risk_level_from_score(p_score INTEGER)
RETURNS risk_level
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
    SELECT CASE
             WHEN p_score >= 90 THEN 'CRITICAL'::risk_level
             WHEN p_score >= 70 THEN 'HIGH'::risk_level
             WHEN p_score >= 40 THEN 'MEDIUM'::risk_level
             ELSE                    'LOW'::risk_level
           END;
$$;

COMMENT ON FUNCTION fn_risk_level_from_score(INTEGER) IS
  'Single source of truth for risk band boundaries (0-39 LOW, 40-69 MEDIUM, 70-89 HIGH, 90-100 CRITICAL).';

-- ---------------------------------------------------------------------------
-- Helper: convert a 0-100 risk score into the ML verdict.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prediction_from_score(p_score INTEGER)
RETURNS prediction_result
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
    SELECT CASE
             WHEN p_score >= 70 THEN 'FRAUD'::prediction_result
             WHEN p_score >= 40 THEN 'SUSPICIOUS'::prediction_result
             ELSE                    'GENUINE'::prediction_result
           END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: map a verdict onto the transaction status the UI displays.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_status_from_prediction(p_prediction prediction_result)
RETURNS transaction_status
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
    SELECT CASE p_prediction
             WHEN 'FRAUD'      THEN 'FRAUD'::transaction_status
             WHEN 'SUSPICIOUS' THEN 'SUSPICIOUS'::transaction_status
             ELSE                   'SAFE'::transaction_status
           END;
$$;
