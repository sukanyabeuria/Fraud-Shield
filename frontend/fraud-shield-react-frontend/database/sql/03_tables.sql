-- ============================================================================
--  FRAUD-SHIELD · 03_tables.sql
--  Tables, primary keys, foreign keys, CHECK constraints, defaults
--  Run order: 3 of 9
-- ----------------------------------------------------------------------------
--  RELATIONSHIP MAP
--
--    users ──1:N──> transactions ──1:N──> fraud_predictions ──1:N──> risk_indicators
--      │                  │                       └────────1:1──────> explanations
--      │                  └──1:N──> transaction_history
--      ├──1:N──> audit_logs
--      ├──1:N──> user_sessions
--      └──1:1──> user_settings
--
--    model_versions ──1:N──> fraud_predictions
--
--  ON DELETE strategy
--    * CASCADE  : child rows are meaningless without the parent
--                 (transaction -> prediction -> indicator/explanation/history)
--    * SET NULL : the reference is informational and history must survive
--                 (audit_logs.user_id, transaction_history.changed_by,
--                  fraud_predictions.model_version_id, reviewed_by)
--    * RESTRICT : never used — we prefer explicit CASCADE/SET NULL semantics.
-- ============================================================================

SET search_path TO fraudshield, public;

-- Drop in reverse dependency order so the file is re-runnable during dev.
DROP TABLE IF EXISTS audit_logs          CASCADE;
DROP TABLE IF EXISTS transaction_history CASCADE;
DROP TABLE IF EXISTS explanations        CASCADE;
DROP TABLE IF EXISTS risk_indicators     CASCADE;
DROP TABLE IF EXISTS fraud_predictions   CASCADE;
DROP TABLE IF EXISTS transactions        CASCADE;
DROP TABLE IF EXISTS user_sessions       CASCADE;
DROP TABLE IF EXISTS user_settings       CASCADE;
DROP TABLE IF EXISTS users               CASCADE;
DROP TABLE IF EXISTS model_versions      CASCADE;


-- ============================================================================
-- A. users
--    Console accounts (analysts/admins) and customer accounts.
--    NOTE: the column is `full_name`; every API-facing view exposes it as
--    `name` so the existing frontend payload shape is unchanged.
-- ============================================================================
CREATE TABLE users (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    full_name             VARCHAR(120) NOT NULL,
    email                 CITEXT       NOT NULL,
    password_hash         TEXT         NOT NULL,   -- bcrypt/argon2 digest ONLY
    role                  user_role    NOT NULL DEFAULT 'ANALYST',

    -- profile extras used by the existing Profile / Settings page
    job_title             VARCHAR(80)          DEFAULT 'Risk Analyst',
    team                  VARCHAR(80)          DEFAULT 'Financial Crime Unit',
    phone                 VARCHAR(20),
    avatar_url            TEXT,

    -- account state / login hardening
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    is_email_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    two_factor_enabled    BOOLEAN      NOT NULL DEFAULT FALSE,
    failed_login_attempts SMALLINT     NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ,
    last_login_at         TIMESTAMPTZ,

    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_email          UNIQUE (email),
    CONSTRAINT chk_users_name_length   CHECK (char_length(trim(full_name)) BETWEEN 2 AND 120),
    -- basic RFC-ish shape check; full validation stays in the API layer
    CONSTRAINT chk_users_email_format  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    -- a bcrypt hash is 60 chars, argon2 is longer: anything short means someone
    -- tried to insert a plain-text password.
    CONSTRAINT chk_users_password_hash CHECK (char_length(password_hash) >= 50),
    CONSTRAINT chk_users_failed_logins CHECK (failed_login_attempts >= 0),
    CONSTRAINT chk_users_phone         CHECK (phone IS NULL OR phone ~ '^[0-9+][0-9 ()-]{5,19}$')
);

COMMENT ON TABLE  users                IS 'Console + customer accounts. Passwords are never stored in plain text.';
COMMENT ON COLUMN users.full_name      IS 'Exposed to the API/frontend as "name".';
COMMENT ON COLUMN users.password_hash  IS 'bcrypt (cost >= 12) or argon2id digest produced by the API layer.';
COMMENT ON COLUMN users.locked_until   IS 'Set by the API after N failed logins; login rejected while in the future.';


-- ============================================================================
--    user_settings — 1:1 preferences behind the Profile / Settings page
-- ============================================================================
CREATE TABLE user_settings (
    user_id             UUID        PRIMARY KEY
                                    REFERENCES users(id) ON DELETE CASCADE,

    -- notification settings
    notify_fraud_alerts BOOLEAN     NOT NULL DEFAULT TRUE,
    notify_high_risk_only BOOLEAN   NOT NULL DEFAULT FALSE,
    notify_weekly_digest BOOLEAN    NOT NULL DEFAULT TRUE,
    notify_email        BOOLEAN     NOT NULL DEFAULT TRUE,
    notify_sms          BOOLEAN     NOT NULL DEFAULT FALSE,

    -- security settings
    login_alerts        BOOLEAN     NOT NULL DEFAULT TRUE,
    auto_block_high_risk BOOLEAN    NOT NULL DEFAULT TRUE,
    auto_block_threshold SMALLINT   NOT NULL DEFAULT 85,
    session_timeout_minutes SMALLINT NOT NULL DEFAULT 60,

    -- appearance
    theme               VARCHAR(10) NOT NULL DEFAULT 'dark',

    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_settings_theme     CHECK (theme IN ('dark', 'light', 'system')),
    CONSTRAINT chk_settings_threshold CHECK (auto_block_threshold BETWEEN 50 AND 100),
    CONSTRAINT chk_settings_timeout   CHECK (session_timeout_minutes BETWEEN 5 AND 1440)
);

COMMENT ON TABLE user_settings IS 'Per-user notification / security / theme preferences (Profile page).';


-- ============================================================================
--    user_sessions — refresh tokens for POST /api/auth/login & logout
--    Only a HASH of the token is stored, never the token itself.
-- ============================================================================
CREATE TABLE user_sessions (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    refresh_token_hash TEXT        NOT NULL,
    user_agent         TEXT,
    ip_address         INET,
    remember_me        BOOLEAN     NOT NULL DEFAULT FALSE,

    issued_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,

    CONSTRAINT uq_sessions_token   UNIQUE (refresh_token_hash),
    CONSTRAINT chk_sessions_expiry CHECK (expires_at > issued_at)
);

COMMENT ON TABLE user_sessions IS 'Server-side refresh-token registry so sessions can be revoked (Active Sessions panel).';


-- ============================================================================
-- H. model_versions
--    Registry of trained ML models. Created before fraud_predictions because
--    predictions reference it.
-- ============================================================================
CREATE TABLE model_versions (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

    model_name        VARCHAR(80)   NOT NULL,
    version           VARCHAR(30)   NOT NULL,
    algorithm         VARCHAR(60)           DEFAULT 'XGBoost',
    description       TEXT,

    -- evaluation metrics, stored as 0.0000 - 1.0000 fractions
    accuracy          NUMERIC(5,4),
    precision_score   NUMERIC(5,4),   -- exposed as "precision" in views (PRECISION is a SQL keyword)
    recall_score      NUMERIC(5,4),   -- exposed as "recall"
    f1_score          NUMERIC(5,4),
    roc_auc           NUMERIC(5,4),
    false_positive_rate NUMERIC(5,4),

    -- training metadata
    training_rows     BIGINT,
    feature_count     SMALLINT,
    hyperparameters   JSONB         NOT NULL DEFAULT '{}'::jsonb,
    feature_importance JSONB        NOT NULL DEFAULT '{}'::jsonb,
    decision_threshold NUMERIC(5,4) NOT NULL DEFAULT 0.5000,

    avg_inference_ms  INTEGER,
    trained_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deployed_at       TIMESTAMPTZ,
    is_active         BOOLEAN       NOT NULL DEFAULT FALSE,

    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_model_name_version  UNIQUE (model_name, version),
    CONSTRAINT chk_model_accuracy     CHECK (accuracy            IS NULL OR accuracy            BETWEEN 0 AND 1),
    CONSTRAINT chk_model_precision    CHECK (precision_score     IS NULL OR precision_score     BETWEEN 0 AND 1),
    CONSTRAINT chk_model_recall       CHECK (recall_score        IS NULL OR recall_score        BETWEEN 0 AND 1),
    CONSTRAINT chk_model_f1           CHECK (f1_score            IS NULL OR f1_score            BETWEEN 0 AND 1),
    CONSTRAINT chk_model_auc          CHECK (roc_auc             IS NULL OR roc_auc             BETWEEN 0 AND 1),
    CONSTRAINT chk_model_fpr          CHECK (false_positive_rate IS NULL OR false_positive_rate BETWEEN 0 AND 1),
    CONSTRAINT chk_model_threshold    CHECK (decision_threshold BETWEEN 0 AND 1),
    CONSTRAINT chk_model_rows         CHECK (training_rows IS NULL OR training_rows > 0),
    CONSTRAINT chk_model_deploy_order CHECK (deployed_at IS NULL OR deployed_at >= trained_at),
    CONSTRAINT chk_model_hyperparams  CHECK (jsonb_typeof(hyperparameters) = 'object'),
    CONSTRAINT chk_model_importance   CHECK (jsonb_typeof(feature_importance) = 'object')
);

COMMENT ON TABLE  model_versions                 IS 'ML model registry; every prediction records which model produced it.';
COMMENT ON COLUMN model_versions.precision_score IS 'Precision metric (column suffixed because PRECISION is a SQL keyword).';
COMMENT ON COLUMN model_versions.is_active       IS 'Exactly one row may be TRUE — enforced by uq_model_single_active.';


-- ============================================================================
-- B. transactions
--    One row per financial transaction submitted through the
--    Transaction Check page or the ingestion API.
-- ============================================================================
CREATE TABLE transactions (
    id                  UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID               NOT NULL
                                           REFERENCES users(id) ON DELETE CASCADE,

    -- Business reference shown in the UI ("TXN-0920145"). Unique + client supplied.
    reference           VARCHAR(40)        NOT NULL,

    -- money
    amount              NUMERIC(18,2)      NOT NULL,
    currency            CHAR(3)            NOT NULL DEFAULT 'INR',
    transaction_type    transaction_type   NOT NULL,

    -- counterparty
    merchant            VARCHAR(120),
    merchant_category   VARCHAR(60),
    recipient_masked    VARCHAR(32),       -- e.g. 'XXXXXX4412' — NEVER a full account/card number

    -- when
    transaction_date    TIMESTAMPTZ        NOT NULL DEFAULT now(),

    -- where
    location_label      VARCHAR(80),       -- denormalised 'Mumbai, IN' for the UI
    location_city       VARCHAR(60),
    location_country    CHAR(2),           -- ISO-3166-1 alpha-2
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6),

    -- device / network fingerprint
    device_type         VARCHAR(30)        NOT NULL DEFAULT 'UNKNOWN',
    device_id           VARCHAR(128),      -- hashed device fingerprint, not a raw identifier
    device_os           VARCHAR(40),
    ip_address          INET,
    ip_country          CHAR(2),
    is_vpn              BOOLEAN            NOT NULL DEFAULT FALSE,
    channel             VARCHAR(20)        NOT NULL DEFAULT 'ONLINE',

    -- behavioural features consumed by the ML model
    account_age_months  INTEGER            NOT NULL DEFAULT 0,
    txn_count_24h       INTEGER            NOT NULL DEFAULT 0,
    previous_amount     NUMERIC(18,2),
    account_balance     NUMERIC(18,2),     -- optional; omit in production if not required
    is_international    BOOLEAN            NOT NULL DEFAULT FALSE,
    is_new_recipient    BOOLEAN            NOT NULL DEFAULT FALSE,
    is_card_present     BOOLEAN            NOT NULL DEFAULT FALSE,

    -- lifecycle
    status              transaction_status NOT NULL DEFAULT 'PENDING',
    notes               TEXT,

    created_at          TIMESTAMPTZ        NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ        NOT NULL DEFAULT now(),

    CONSTRAINT uq_transactions_reference   UNIQUE (reference),
    CONSTRAINT chk_txn_reference_format    CHECK (reference ~ '^TXN-[A-Z0-9._-]{3,35}$'),
    CONSTRAINT chk_txn_amount_positive     CHECK (amount > 0 AND amount <= 999999999999.99),
    CONSTRAINT chk_txn_currency_iso        CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT chk_txn_prev_amount         CHECK (previous_amount IS NULL OR previous_amount >= 0),
    CONSTRAINT chk_txn_balance             CHECK (account_balance IS NULL OR account_balance >= 0),
    CONSTRAINT chk_txn_account_age         CHECK (account_age_months BETWEEN 0 AND 1200),
    CONSTRAINT chk_txn_count_24h           CHECK (txn_count_24h BETWEEN 0 AND 10000),
    CONSTRAINT chk_txn_latitude            CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
    CONSTRAINT chk_txn_longitude           CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CONSTRAINT chk_txn_country             CHECK (location_country IS NULL OR location_country ~ '^[A-Z]{2}$'),
    CONSTRAINT chk_txn_ip_country          CHECK (ip_country       IS NULL OR ip_country       ~ '^[A-Z]{2}$'),
    -- VARCHAR + CHECK instead of ENUM: new device channels appear regularly
    CONSTRAINT chk_txn_device_type         CHECK (device_type IN
        ('MOBILE_APP','WEB_BROWSER','ATM','POS_TERMINAL','API_CLIENT','UNKNOWN')),
    CONSTRAINT chk_txn_channel             CHECK (channel IN
        ('ONLINE','IN_STORE','ATM','BRANCH','API','RECURRING')),
    -- Sanity bound only. NOTE: PostgreSQL forbids non-IMMUTABLE functions such as
    -- now() inside CHECK constraints, so "not in the future" is validated by the
    -- API layer / fn_create_transaction, not here.
    CONSTRAINT chk_txn_date_sane           CHECK (transaction_date >= TIMESTAMPTZ '2000-01-01')
);

COMMENT ON TABLE  transactions                  IS 'Financial transactions submitted for fraud screening.';
COMMENT ON COLUMN transactions.reference        IS 'Public transaction ID used by the UI and API routes (TXN-XXXXXXX).';
COMMENT ON COLUMN transactions.recipient_masked IS 'Masked beneficiary only. Full PAN/IBAN must never be stored here.';
COMMENT ON COLUMN transactions.previous_amount  IS 'Customer''s previous transaction amount — feature for the amount-ratio rule.';
COMMENT ON COLUMN transactions.status           IS 'Kept in sync with the latest prediction by trg_prediction_apply_status.';


-- ============================================================================
-- C. fraud_predictions
--    One row per ML scoring run. A transaction can be re-scored by a newer
--    model, so this is 1:N; the current row is flagged with is_latest.
-- ============================================================================
CREATE TABLE fraud_predictions (
    id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id    UUID              NOT NULL
                                        REFERENCES transactions(id) ON DELETE CASCADE,
    model_version_id  UUID              REFERENCES model_versions(id) ON DELETE SET NULL,

    prediction        prediction_result NOT NULL,
    fraud_probability NUMERIC(6,5)      NOT NULL,   -- 0.00000 - 1.00000
    risk_score        SMALLINT          NOT NULL,   -- 0 - 100 (UI gauge)
    risk_level        risk_level        NOT NULL,
    confidence        NUMERIC(5,2),                 -- 0 - 100 %
    model_version     VARCHAR(50)       NOT NULL,   -- denormalised for immutable audit
    threshold_used    NUMERIC(5,4)      NOT NULL DEFAULT 0.5000,
    decision          decision_action   NOT NULL DEFAULT 'ALLOW',
    inference_time_ms INTEGER,
    feature_snapshot  JSONB             NOT NULL DEFAULT '{}'::jsonb, -- exact model input, for reproducibility

    -- manual review workflow
    reviewed_by       UUID              REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at       TIMESTAMPTZ,
    review_notes      TEXT,
    is_latest         BOOLEAN           NOT NULL DEFAULT TRUE,

    predicted_at      TIMESTAMPTZ       NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ       NOT NULL DEFAULT now(),

    CONSTRAINT chk_pred_probability  CHECK (fraud_probability BETWEEN 0 AND 1),
    CONSTRAINT chk_pred_risk_score   CHECK (risk_score BETWEEN 0 AND 100),
    CONSTRAINT chk_pred_confidence   CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
    CONSTRAINT chk_pred_threshold    CHECK (threshold_used BETWEEN 0 AND 1),
    CONSTRAINT chk_pred_latency      CHECK (inference_time_ms IS NULL OR inference_time_ms >= 0),
    CONSTRAINT chk_pred_snapshot     CHECK (jsonb_typeof(feature_snapshot) = 'object'),
    CONSTRAINT chk_pred_review_pair  CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL)),

    -- INTERNAL CONSISTENCY GUARANTEES ----------------------------------------
    -- risk_level must match the band of risk_score
    CONSTRAINT chk_pred_level_matches_score CHECK (
        (risk_score BETWEEN  0 AND 39 AND risk_level = 'LOW')      OR
        (risk_score BETWEEN 40 AND 69 AND risk_level = 'MEDIUM')   OR
        (risk_score BETWEEN 70 AND 89 AND risk_level = 'HIGH')     OR
        (risk_score BETWEEN 90 AND 100 AND risk_level = 'CRITICAL')
    ),
    -- verdict must match the band of risk_score
    CONSTRAINT chk_pred_verdict_matches_score CHECK (
        (prediction = 'GENUINE'    AND risk_score < 40)                OR
        (prediction = 'SUSPICIOUS' AND risk_score BETWEEN 40 AND 69)   OR
        (prediction = 'FRAUD'      AND risk_score >= 70)
    ),
    -- probability and score must tell the same story (15-point tolerance)
    CONSTRAINT chk_pred_prob_score_align CHECK (
        abs(risk_score - (fraud_probability * 100)) <= 15
    )
);

COMMENT ON TABLE  fraud_predictions                  IS 'ML scoring results. Powers the Fraud Result page and all analytics.';
COMMENT ON COLUMN fraud_predictions.is_latest        IS 'TRUE for the current score of a transaction (one per transaction).';
COMMENT ON COLUMN fraud_predictions.feature_snapshot IS 'Exact feature vector sent to the model — required for reproducible XAI.';
COMMENT ON COLUMN fraud_predictions.model_version    IS 'Copied from model_versions so the audit trail survives model deletion.';


-- ============================================================================
-- D. risk_indicators
--    Individual reasons ("Transaction occurred from an unusual location") that
--    the Fraud Result page renders as the numbered explanation list.
-- ============================================================================
CREATE TABLE risk_indicators (
    id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id  UUID           NOT NULL
                                  REFERENCES fraud_predictions(id) ON DELETE CASCADE,

    indicator_type VARCHAR(40)    NOT NULL,   -- feature family (AMOUNT, LOCATION, …)
    indicator_name VARCHAR(80)    NOT NULL,   -- short label shown as the card title
    description    TEXT           NOT NULL,   -- human-readable sentence
    severity       severity_level NOT NULL DEFAULT 'MEDIUM',
    contribution   NUMERIC(6,2)   NOT NULL DEFAULT 0,  -- risk points added by this factor
    observed_value TEXT,                       -- e.g. '₹487,500'
    expected_value TEXT,                       -- e.g. '≈ ₹4,200 (90-day median)'
    is_triggered   BOOLEAN        NOT NULL DEFAULT TRUE,

    created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),

    CONSTRAINT uq_indicator_per_prediction UNIQUE (prediction_id, indicator_name),
    CONSTRAINT chk_indicator_contribution  CHECK (contribution BETWEEN -100 AND 100),
    -- VARCHAR + CHECK, not ENUM: the ML team adds new feature families often
    CONSTRAINT chk_indicator_type CHECK (indicator_type IN (
        'AMOUNT', 'LOCATION', 'VELOCITY', 'TIME', 'DEVICE', 'NETWORK',
        'ACCOUNT_AGE', 'MERCHANT', 'BEHAVIOUR', 'RECIPIENT', 'CHANNEL', 'OTHER'
    ))
);

COMMENT ON TABLE  risk_indicators              IS 'Why a transaction was flagged — one row per contributing factor.';
COMMENT ON COLUMN risk_indicators.contribution IS 'Risk points this factor added to the 0-100 score (SHAP-style attribution).';


-- ============================================================================
-- E. explanations
--    Explainable-AI output (SHAP/LIME). One explanation per prediction+method.
-- ============================================================================
CREATE TABLE explanations (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id         UUID        NOT NULL
                                      REFERENCES fraud_predictions(id) ON DELETE CASCADE,

    method                VARCHAR(20) NOT NULL DEFAULT 'SHAP',
    explanation           TEXT        NOT NULL,   -- natural-language summary
    important_features    JSONB       NOT NULL DEFAULT '[]'::jsonb, -- ordered array of feature names
    feature_contributions JSONB       NOT NULL DEFAULT '{}'::jsonb, -- {"amount_ratio": 0.31, ...}
    base_value            NUMERIC(6,5),          -- SHAP expected value
    output_value          NUMERIC(6,5),          -- model output for this row
    confidence            NUMERIC(5,2),
    warnings              JSONB       NOT NULL DEFAULT '[]'::jsonb, -- array of warning strings
    recommended_action    TEXT,

    generated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_explanation_per_method  UNIQUE (prediction_id, method),
    CONSTRAINT chk_expl_method            CHECK (method IN ('SHAP', 'LIME', 'ANCHORS', 'RULES', 'COUNTERFACTUAL')),
    CONSTRAINT chk_expl_text              CHECK (char_length(trim(explanation)) >= 10),
    CONSTRAINT chk_expl_features_array    CHECK (jsonb_typeof(important_features)    = 'array'),
    CONSTRAINT chk_expl_contrib_object    CHECK (jsonb_typeof(feature_contributions) = 'object'),
    CONSTRAINT chk_expl_warnings_array    CHECK (jsonb_typeof(warnings)              = 'array'),
    CONSTRAINT chk_expl_confidence        CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100)
);

COMMENT ON TABLE  explanations                       IS 'Explainable-AI output rendered on the Fraud Result page.';
COMMENT ON COLUMN explanations.feature_contributions IS 'JSONB map of feature -> signed SHAP contribution.';


-- ============================================================================
-- F. transaction_history
--    Immutable status-change trail (append-only, written by triggers).
-- ============================================================================
CREATE TABLE transaction_history (
    id             BIGSERIAL          PRIMARY KEY,
    transaction_id UUID               NOT NULL
                                      REFERENCES transactions(id) ON DELETE CASCADE,

    old_status     transaction_status,               -- NULL on creation
    new_status     transaction_status NOT NULL,
    changed_by     UUID               REFERENCES users(id) ON DELETE SET NULL, -- NULL = system/ML
    change_reason  TEXT,
    source         VARCHAR(20)        NOT NULL DEFAULT 'SYSTEM',
    metadata       JSONB              NOT NULL DEFAULT '{}'::jsonb,

    changed_at     TIMESTAMPTZ        NOT NULL DEFAULT now(),

    CONSTRAINT chk_history_status_changed CHECK (old_status IS DISTINCT FROM new_status),
    CONSTRAINT chk_history_source         CHECK (source IN ('SYSTEM', 'ML_MODEL', 'ANALYST', 'API', 'BATCH')),
    CONSTRAINT chk_history_metadata       CHECK (jsonb_typeof(metadata) = 'object')
);

COMMENT ON TABLE transaction_history IS 'Append-only status trail for each transaction (written by triggers).';


-- ============================================================================
-- G. audit_logs
--    Security / compliance trail for every meaningful system action.
--    BIGSERIAL because this table grows fastest; ready for future RANGE
--    partitioning on created_at.
-- ============================================================================
CREATE TABLE audit_logs (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     UUID        REFERENCES users(id) ON DELETE SET NULL, -- keep the log if the user is deleted

    action      VARCHAR(60) NOT NULL,   -- LOGIN, LOGIN_FAILED, TRANSACTION_CREATED, FRAUD_PREDICTED, …
    entity_type VARCHAR(40) NOT NULL,   -- USER | TRANSACTION | PREDICTION | MODEL | SETTINGS | SESSION
    entity_id   TEXT,                   -- UUID or business reference, kept as TEXT for flexibility
    details     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    status      VARCHAR(10) NOT NULL DEFAULT 'SUCCESS',
    ip_address  INET,
    user_agent  TEXT,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_audit_status      CHECK (status IN ('SUCCESS', 'FAILURE', 'WARNING')),
    CONSTRAINT chk_audit_entity_type CHECK (entity_type IN
        ('USER', 'TRANSACTION', 'PREDICTION', 'INDICATOR', 'EXPLANATION',
         'MODEL', 'SETTINGS', 'SESSION', 'SYSTEM')),
    CONSTRAINT chk_audit_details     CHECK (jsonb_typeof(details) = 'object')
);

COMMENT ON TABLE audit_logs IS 'Who did what, when and from where. Never updated or deleted by the application.';
