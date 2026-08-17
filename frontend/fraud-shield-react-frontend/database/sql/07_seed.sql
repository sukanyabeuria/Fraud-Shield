-- ============================================================================
--  FRAUD-SHIELD · 07_seed.sql
--  Realistic development / demo data
--  Run order: 7 of 9
-- ----------------------------------------------------------------------------
--  ⚠ DEVELOPMENT ONLY — never run against production.
--
--  HOW CONSISTENCY IS GUARANTEED
--  -----------------------------
--  Rather than hand-writing scores (which drift out of sync with indicators),
--  this file inserts raw transactions and then runs a small PL/pgSQL scoring
--  engine that mirrors the rules already used by the frontend mock in
--  src/services/fraudApi.js. Every prediction therefore has:
--      score  ⇄  probability  ⇄  risk level  ⇄  verdict  ⇄  status
--      ⇄ matching risk indicators ⇄ matching XAI explanation
--  ...and the CHECK constraints in 03_tables.sql refuse anything inconsistent.
--
--  Demo login password for EVERY seeded user:   Shield@123
--  (hashed here with pgcrypto bcrypt cost 12 — the API will hash its own)
-- ============================================================================

SET search_path TO fraudshield, public;

-- Reproducible pseudo-random data
SELECT setseed(0.4242);

-- ---------------------------------------------------------------------------
-- Clean slate
-- ---------------------------------------------------------------------------
TRUNCATE TABLE audit_logs, transaction_history, explanations, risk_indicators,
               fraud_predictions, transactions, user_sessions, user_settings,
               users, model_versions
    RESTART IDENTITY CASCADE;

-- ===========================================================================
-- 1. MODEL VERSIONS
-- ===========================================================================
INSERT INTO model_versions (
    model_name, version, algorithm, description,
    accuracy, precision_score, recall_score, f1_score, roc_auc, false_positive_rate,
    training_rows, feature_count, decision_threshold, avg_inference_ms,
    hyperparameters, feature_importance, trained_at, deployed_at, is_active
) VALUES
(
    'fraudshield-baseline', 'v1.0', 'LogisticRegression',
    'Baseline linear model used for the first Fraud-Shield release.',
    0.8910, 0.8020, 0.7640, 0.7825, 0.9010, 0.0980,
    240000, 18, 0.5000, 62,
    '{"C": 1.0, "penalty": "l2", "solver": "lbfgs"}'::jsonb,
    '{"amount_ratio": 0.21, "velocity_24h": 0.17, "location_risk": 0.15}'::jsonb,
    now() - INTERVAL '14 months', now() - INTERVAL '14 months', FALSE
),
(
    'fraudshield-rf', 'v2.0', 'RandomForest',
    'Random-forest model with engineered velocity and geo features.',
    0.9420, 0.8830, 0.8510, 0.8667, 0.9520, 0.0610,
    680000, 26, 0.5000, 121,
    '{"n_estimators": 400, "max_depth": 18, "min_samples_leaf": 4}'::jsonb,
    '{"amount_ratio": 0.24, "velocity_24h": 0.19, "location_risk": 0.18, "device_risk": 0.12}'::jsonb,
    now() - INTERVAL '7 months', now() - INTERVAL '7 months', FALSE
),
(
    'fraudshield-xgboost', 'v2.4', 'XGBoost',
    'Production gradient-boosted model with SHAP explainability enabled.',
    0.9640, 0.9210, 0.8970, 0.9088, 0.9780, 0.0360,
    1240000, 34, 0.5200, 148,
    '{"n_estimators": 900, "max_depth": 8, "learning_rate": 0.05, "subsample": 0.9, "scale_pos_weight": 12}'::jsonb,
    '{"amount_ratio": 0.26, "location_risk": 0.21, "velocity_24h": 0.17, "device_risk": 0.13, "account_age": 0.11, "hour_of_day": 0.12}'::jsonb,
    now() - INTERVAL '21 days', now() - INTERVAL '20 days', TRUE
);

-- ===========================================================================
-- 2. USERS  (2 admins/auditor + 3 analysts + 4 customers = 9)
-- ===========================================================================
INSERT INTO users (full_name, email, password_hash, role, job_title, team,
                   is_email_verified, two_factor_enabled, last_login_at, created_at)
VALUES
('Aarav Sharma',    'aarav.sharma@fraudshield.io',  crypt('Shield@123', gen_salt('bf', 12)), 'ANALYST', 'Senior Risk Analyst',  'Financial Crime Unit', TRUE,  TRUE,  now() - INTERVAL '2 hours',  now() - INTERVAL '20 months'),
('Meera Iyer',      'meera.iyer@fraudshield.io',    crypt('Shield@123', gen_salt('bf', 12)), 'ADMIN',   'Head of Risk',         'Financial Crime Unit', TRUE,  TRUE,  now() - INTERVAL '1 day',    now() - INTERVAL '26 months'),
('Rahul Verma',     'rahul.verma@fraudshield.io',   crypt('Shield@123', gen_salt('bf', 12)), 'ANALYST', 'Fraud Analyst',        'Payments Monitoring',  TRUE,  FALSE, now() - INTERVAL '5 hours',  now() - INTERVAL '9 months'),
('Sana Khan',       'sana.khan@fraudshield.io',     crypt('Shield@123', gen_salt('bf', 12)), 'AUDITOR', 'Compliance Auditor',   'Compliance',           TRUE,  TRUE,  now() - INTERVAL '3 days',   now() - INTERVAL '12 months'),
('ML Scoring Bot',  'service.ml@fraudshield.io',    crypt('Shield@123', gen_salt('bf', 12)), 'SERVICE', 'Automated Service',    'Platform',             TRUE,  FALSE, now() - INTERVAL '1 minute', now() - INTERVAL '21 days'),
('Priya Nair',      'priya.nair@example.com',       crypt('Shield@123', gen_salt('bf', 12)), 'CUSTOMER','Customer',             'Retail Banking',       TRUE,  FALSE, now() - INTERVAL '6 hours',  now() - INTERVAL '48 months'),
('Vikram Desai',    'vikram.desai@example.com',     crypt('Shield@123', gen_salt('bf', 12)), 'CUSTOMER','Customer',             'Retail Banking',       TRUE,  FALSE, now() - INTERVAL '2 days',   now() - INTERVAL '30 months'),
('Neha Gupta',      'neha.gupta@example.com',       crypt('Shield@123', gen_salt('bf', 12)), 'CUSTOMER','Customer',             'Retail Banking',       TRUE,  FALSE, now() - INTERVAL '9 hours',  now() - INTERVAL '5 months'),
('Arjun Mehta',     'arjun.mehta@example.com',      crypt('Shield@123', gen_salt('bf', 12)), 'CUSTOMER','Customer',             'Retail Banking',       FALSE, FALSE, now() - INTERVAL '30 minutes', now() - INTERVAL '2 months');

-- tighten a couple of settings so the demo shows variety
UPDATE user_settings SET theme = 'light', notify_sms = TRUE
 WHERE user_id = (SELECT id FROM users WHERE email = 'meera.iyer@fraudshield.io');
UPDATE user_settings SET auto_block_threshold = 90
 WHERE user_id IN (SELECT id FROM users WHERE role = 'CUSTOMER');

-- ===========================================================================
-- 3. TRANSACTIONS — 26 curated + 24 generated
-- ===========================================================================
WITH raw(email, reference, amount, txn_type, merchant, category, hours_ago,
         location_label, country, device_type, ip, is_vpn, account_age,
         txn_24h, prev_amount, balance, intl, new_recipient, card_present) AS (
    VALUES
    -- ---------- clearly GENUINE / low risk -------------------------------
    ('priya.nair@example.com',  'TXN-0920145',    3250.00::NUMERIC, 'PAYMENT'::transaction_type,        'Swiggy',              'Food & Delivery',  2::INT,   'Mumbai, IN',    'IN'::CHAR(2), 'MOBILE_APP',   '49.36.212.10'::INET,   FALSE, 48::INT, 3::INT,  2800.00::NUMERIC, 184000.00::NUMERIC, FALSE, FALSE, TRUE),
    ('priya.nair@example.com',  'TXN-0920146',    1899.00,          'CARD_PURCHASE',                    'Reliance Digital',    'Electronics',      6,        'Mumbai, IN',    'IN',          'POS_TERMINAL', '49.36.212.10',         FALSE, 48,      2,       3250.00,          182100.00,          FALSE, FALSE, TRUE),
    ('vikram.desai@example.com','TXN-0920147',   12400.00,          'PAYMENT',                          'IndiGo Airlines',     'Travel',           9,        'Delhi, IN',     'IN',          'WEB_BROWSER',  '103.21.58.9',          FALSE, 30,      1,       9800.00,          412000.00,          FALSE, FALSE, FALSE),
    ('priya.nair@example.com',  'TXN-0920148',     799.00,          'ONLINE_PURCHASE',                  'Netflix',             'Utilities',        14,       'Mumbai, IN',    'IN',          'MOBILE_APP',   '49.36.212.10',         FALSE, 48,      1,       1899.00,          181300.00,          FALSE, FALSE, FALSE),
    ('vikram.desai@example.com','TXN-0920149',   25000.00,          'TRANSFER',                         'GlobalWire Transfer', 'Retail',           20,       'Delhi, IN',     'IN',          'WEB_BROWSER',  '103.21.58.9',          FALSE, 30,      2,       22000.00,         387000.00,          FALSE, FALSE, FALSE),
    ('neha.gupta@example.com',  'TXN-0920150',    4599.00,          'CARD_PURCHASE',                    'Amazon Pay',          'Retail',           26,       'Bengaluru, IN', 'IN',          'MOBILE_APP',   '106.51.74.22',         FALSE, 5,       4,       3980.00,          64000.00,           FALSE, FALSE, TRUE),
    ('priya.nair@example.com',  'TXN-0920151',    2150.00,          'PAYMENT',                          'Uber',                'Travel',           33,       'Mumbai, IN',    'IN',          'MOBILE_APP',   '49.36.212.10',         FALSE, 48,      3,       799.00,           179150.00,          FALSE, FALSE, FALSE),
    ('vikram.desai@example.com','TXN-0920152',    8900.00,          'ONLINE_PURCHASE',                  'Apple Store',         'Electronics',      41,       'Delhi, IN',     'IN',          'WEB_BROWSER',  '103.21.58.9',          FALSE, 30,      1,       25000.00,         378100.00,          FALSE, FALSE, FALSE),
    ('neha.gupta@example.com',  'TXN-0920153',   15000.00,          'DEPOSIT',                          'Salary Credit',       'Utilities',        50,       'Bengaluru, IN', 'IN',          'WEB_BROWSER',  '106.51.74.22',         FALSE, 5,       1,       4599.00,          79000.00,           FALSE, FALSE, FALSE),

    -- ---------- MEDIUM risk / suspicious ---------------------------------
    ('neha.gupta@example.com',  'TXN-0920154',   96500.00,          'TRANSFER',                         'GlobalWire Transfer', 'Retail',           4,        'Bengaluru, IN', 'IN',          'WEB_BROWSER',  '106.51.74.22',         FALSE, 5,       6,       4599.00,          79000.00,           FALSE, TRUE,  FALSE),
    ('arjun.mehta@example.com', 'TXN-0920155',   48000.00,          'WITHDRAWAL',                       'ATM Cash Withdrawal', 'Utilities',        7,        'Delhi, IN',     'IN',          'ATM',          '117.203.9.140',        FALSE, 2,       4,       12000.00,         51000.00,           FALSE, FALSE, TRUE),
    ('vikram.desai@example.com','TXN-0920156',  142000.00,          'ONLINE_PURCHASE',                  'LuxeWatch Ltd',       'Luxury Goods',     11,       'London, UK',    'GB',          'WEB_BROWSER',  '81.2.69.142',          FALSE, 30,      3,       8900.00,         369200.00,           TRUE,  TRUE,  FALSE),
    ('neha.gupta@example.com',  'TXN-0920157',   31200.00,          'CARD_PURCHASE',                    'Gaming Nexus',        'Gaming',           16,       'Bengaluru, IN', 'IN',          'MOBILE_APP',   '106.51.74.22',         FALSE, 5,       11,      2100.00,          47800.00,           FALSE, FALSE, FALSE),
    ('arjun.mehta@example.com', 'TXN-0920158',   67500.00,          'TRANSFER',                         'P2P Transfer',        'Retail',           23,       'Dubai, AE',     'AE',          'MOBILE_APP',   '94.200.14.7',          FALSE, 2,       5,       48000.00,         38000.00,           TRUE,  TRUE,  FALSE),
    ('priya.nair@example.com',  'TXN-0920159',  118000.00,          'PAYMENT',                          'Apple Store',         'Electronics',      29,       'Singapore, SG', 'SG',          'WEB_BROWSER',  '203.116.44.8',         FALSE, 48,      2,       2150.00,         177000.00,           TRUE,  FALSE, FALSE),
    ('arjun.mehta@example.com', 'TXN-0920160',   22500.00,          'ONLINE_PURCHASE',                  'CoinBridge Exchange', 'Crypto',           37,       'Delhi, IN',     'IN',          'WEB_BROWSER',  '117.203.9.140',        FALSE, 2,       7,       67500.00,         29000.00,           FALSE, FALSE, FALSE),

    -- ---------- HIGH / CRITICAL fraud ------------------------------------
    ('arjun.mehta@example.com', 'TXN-0920161',  487500.00,          'CRYPTO_EXCHANGE',                  'CoinBridge Exchange', 'Crypto',           1,        'Unknown / VPN', NULL,          'API_CLIENT',   '185.220.101.44',       TRUE,  2,       14,      4200.00,         512000.00,           TRUE,  TRUE,  FALSE),
    ('neha.gupta@example.com',  'TXN-0920162',  312000.00,          'TRANSFER',                         'GlobalWire Transfer', 'Retail',           3,        'Lagos, NG',     'NG',          'WEB_BROWSER',  '197.210.44.19',        FALSE, 5,       12,      4599.00,         320000.00,           TRUE,  TRUE,  FALSE),
    ('arjun.mehta@example.com', 'TXN-0920163',  254000.00,          'WITHDRAWAL',                       'ATM Cash Withdrawal', 'Utilities',        5,        'Moscow, RU',    'RU',          'ATM',          '95.213.185.2',         FALSE, 2,       9,       22500.00,        266000.00,           TRUE,  FALSE, TRUE),
    ('vikram.desai@example.com','TXN-0920164',  398000.00,          'CRYPTO_EXCHANGE',                  'CoinBridge Exchange', 'Crypto',           8,        'Unknown / VPN', NULL,          'API_CLIENT',   '185.220.101.87',       TRUE,  30,      16,      8900.00,         402000.00,           TRUE,  TRUE,  FALSE),
    ('neha.gupta@example.com',  'TXN-0920165',  176500.00,          'ONLINE_PURCHASE',                  'LuxeWatch Ltd',       'Luxury Goods',     12,       'Lagos, NG',     'NG',          'WEB_BROWSER',  '197.210.44.19',        FALSE, 5,       10,      4599.00,         188000.00,           TRUE,  TRUE,  FALSE),
    ('arjun.mehta@example.com', 'TXN-0920166',  445000.00,          'TRANSFER',                         'P2P Transfer',        'Retail',           18,       'Unknown / VPN', NULL,          'API_CLIENT',   '185.220.101.12',       TRUE,  2,       19,      12000.00,        460000.00,           TRUE,  TRUE,  FALSE),
    ('priya.nair@example.com',  'TXN-0920167',  289000.00,          'CRYPTO_EXCHANGE',                  'CoinBridge Exchange', 'Crypto',           27,       'Moscow, RU',    'RU',          'API_CLIENT',   '95.213.185.44',        TRUE,  48,      13,      2150.00,         295000.00,           TRUE,  TRUE,  FALSE),
    ('neha.gupta@example.com',  'TXN-0920168',  208000.00,          'WITHDRAWAL',                       'ATM Cash Withdrawal', 'Utilities',        34,       'Lagos, NG',     'NG',          'ATM',          '197.210.44.55',        FALSE, 5,       15,      4599.00,         215000.00,           TRUE,  FALSE, TRUE),
    ('arjun.mehta@example.com', 'TXN-0920169',  367000.00,          'ONLINE_PURCHASE',                  'Gaming Nexus',        'Gaming',           44,       'Unknown / VPN', NULL,          'API_CLIENT',   '185.220.101.99',       TRUE,  2,       21,      22500.00,        372000.00,           TRUE,  TRUE,  FALSE),
    ('vikram.desai@example.com','TXN-0920170',  156000.00,          'TRANSFER',                         'GlobalWire Transfer', 'Retail',           52,       'Lagos, NG',     'NG',          'WEB_BROWSER',  '197.210.44.19',        FALSE, 30,      9,       8900.00,         168000.00,           TRUE,  TRUE,  FALSE)
)
INSERT INTO transactions (
    user_id, reference, amount, currency, transaction_type, merchant, merchant_category,
    transaction_date, location_label, location_city, location_country,
    device_type, ip_address, ip_country, is_vpn, channel,
    account_age_months, txn_count_24h, previous_amount, account_balance,
    is_international, is_new_recipient, is_card_present, recipient_masked
)
SELECT
    u.id,
    r.reference,
    r.amount,
    'INR',
    r.txn_type,
    r.merchant,
    r.category,
    now() - (r.hours_ago || ' hours')::INTERVAL,
    r.location_label,
    split_part(r.location_label, ',', 1),
    r.country,
    r.device_type,
    r.ip,
    r.country,
    r.is_vpn,
    CASE r.device_type
        WHEN 'ATM' THEN 'ATM'
        WHEN 'POS_TERMINAL' THEN 'IN_STORE'
        WHEN 'API_CLIENT' THEN 'API'
        ELSE 'ONLINE'
    END,
    r.account_age,
    r.txn_24h,
    r.prev_amount,
    r.balance,
    r.intl,
    r.new_recipient,
    r.card_present,
    'XXXXXX' || lpad((1000 + floor(random() * 8999))::INT::TEXT, 4, '0')
FROM raw r
JOIN users u ON u.email = r.email;

-- ---------------------------------------------------------------------------
-- 24 additional generated transactions spread over the last 45 days
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_users        UUID[];
    v_merchants    TEXT[] := ARRAY['Amazon Pay','Swiggy','IndiGo Airlines','CoinBridge Exchange',
                                   'Apple Store','Reliance Digital','Uber','Netflix','LuxeWatch Ltd',
                                   'GlobalWire Transfer','Gaming Nexus','P2P Transfer'];
    v_categories   TEXT[] := ARRAY['Retail','Travel','Electronics','Food & Delivery','Crypto',
                                   'Gaming','Luxury Goods','Utilities'];
    v_locations    TEXT[] := ARRAY['Mumbai, IN','Delhi, IN','Bengaluru, IN','London, UK',
                                   'New York, US','Singapore, SG','Dubai, AE','Lagos, NG',
                                   'Moscow, RU','Unknown / VPN'];
    v_countries    TEXT[] := ARRAY['IN','IN','IN','GB','US','SG','AE','NG','RU',NULL];
    v_devices      TEXT[] := ARRAY['MOBILE_APP','WEB_BROWSER','ATM','POS_TERMINAL','API_CLIENT'];
    v_types        transaction_type[] := ARRAY['TRANSFER','PAYMENT','WITHDRAWAL','DEPOSIT',
                                               'CARD_PURCHASE','ONLINE_PURCHASE','CRYPTO_EXCHANGE'];
    i              INT;
    v_loc_idx      INT;
    v_amount       NUMERIC;
    v_prev         NUMERIC;
    v_ref          TEXT;
BEGIN
    SELECT array_agg(id) INTO v_users FROM users WHERE role = 'CUSTOMER';

    FOR i IN 1..24 LOOP
        v_loc_idx := 1 + floor(random() * array_length(v_locations, 1))::INT;
        v_amount  := ROUND((random() * 180000 + 400)::NUMERIC, 2);
        v_prev    := ROUND((random() * 40000 + 300)::NUMERIC, 2);
        v_ref     := 'TXN-' || lpad((0910000 + i * 13)::TEXT, 7, '0');

        INSERT INTO transactions (
            user_id, reference, amount, transaction_type, merchant, merchant_category,
            transaction_date, location_label, location_city, location_country,
            device_type, ip_address, is_vpn, channel,
            account_age_months, txn_count_24h, previous_amount, account_balance,
            is_international, is_new_recipient, is_card_present, recipient_masked
        ) VALUES (
            v_users[1 + floor(random() * array_length(v_users, 1))::INT],
            v_ref,
            v_amount,
            v_types[1 + floor(random() * array_length(v_types, 1))::INT],
            v_merchants[1 + floor(random() * array_length(v_merchants, 1))::INT],
            v_categories[1 + floor(random() * array_length(v_categories, 1))::INT],
            now() - (random() * 45 || ' days')::INTERVAL - (random() * 24 || ' hours')::INTERVAL,
            v_locations[v_loc_idx],
            split_part(v_locations[v_loc_idx], ',', 1),
            v_countries[v_loc_idx],
            v_devices[1 + floor(random() * array_length(v_devices, 1))::INT],
            ('49.36.' || floor(random() * 255)::INT || '.' || floor(random() * 255)::INT)::INET,
            (v_loc_idx = 10),
            'ONLINE',
            1 + floor(random() * 60)::INT,
            floor(random() * 18)::INT,
            v_prev,
            ROUND((v_amount + random() * 90000)::NUMERIC, 2),
            (v_loc_idx > 3),
            (random() > 0.6),
            (random() > 0.7),
            'XXXXXX' || lpad((1000 + floor(random() * 8999))::INT::TEXT, 4, '0')
        );
    END LOOP;
END $$;

-- ===========================================================================
-- 4. SCORING ENGINE — produces predictions + indicators + XAI explanations
--    Mirrors the rule weights in src/services/fraudApi.js so the demo data and
--    the frontend mock tell the same story.
-- ===========================================================================

-- Helper that builds one indicator object with a derived severity
CREATE OR REPLACE FUNCTION fn_seed_indicator(
    p_type TEXT, p_name TEXT, p_description TEXT,
    p_impact NUMERIC, p_triggered BOOLEAN,
    p_observed TEXT DEFAULT NULL, p_expected TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE sql IMMUTABLE AS $$
    SELECT jsonb_build_object(
        'type', p_type,
        'name', p_name,
        'description', p_description,
        'contribution', p_impact,
        'severity', CASE
                        WHEN NOT p_triggered  THEN 'INFO'
                        WHEN p_impact >= 20   THEN 'CRITICAL'
                        WHEN p_impact >= 12   THEN 'HIGH'
                        WHEN p_impact >= 6    THEN 'MEDIUM'
                        ELSE 'LOW'
                    END,
        'observed', p_observed,
        'expected', p_expected,
        'triggered', p_triggered
    );
$$;

DO $$
DECLARE
    t                RECORD;
    v_indicators     JSONB;
    v_ratio          NUMERIC;
    v_hour           INT;
    v_impact         NUMERIC;
    v_trig           BOOLEAN;
    v_score          INT;
    v_total          NUMERIC;
    v_prob           NUMERIC;
    v_warnings       JSONB;
    v_features       JSONB;
    v_contribs       JSONB;
    v_summary        TEXT;
    v_model          TEXT;
    v_risky_location BOOLEAN;
    v_pred_id        UUID;
    v_reason_list    TEXT;
BEGIN
    SELECT model_name || ' ' || version INTO v_model FROM model_versions WHERE is_active;

    FOR t IN SELECT * FROM transactions ORDER BY transaction_date LOOP
        v_indicators := '[]'::jsonb;
        v_warnings   := '[]'::jsonb;
        v_total      := 0;

        v_ratio := t.amount / GREATEST(COALESCE(t.previous_amount, 1), 1);
        v_hour  := EXTRACT(HOUR FROM t.transaction_date)::INT;
        v_risky_location := COALESCE(t.is_vpn, FALSE)
                            OR COALESCE(t.location_country, 'XX') IN ('NG', 'RU')
                            OR t.location_label ILIKE '%unknown%';

        -- 1. amount vs history ------------------------------------------------
        v_impact := LEAST(32, ROUND(v_ratio * 6));
        v_trig   := (v_ratio > 3 OR t.amount > 200000);
        v_total  := v_total + v_impact;
        v_indicators := v_indicators || fn_seed_indicator(
            'AMOUNT', 'Transaction Amount vs History',
            'High transaction amount compared with previous transactions.',
            v_impact, v_trig,
            '₹' || to_char(t.amount, 'FM999,999,999'),
            '≈ ₹' || to_char(COALESCE(t.previous_amount, 0), 'FM999,999,999') || ' previously');

        -- 2. geo-location ------------------------------------------------------
        v_impact := CASE WHEN v_risky_location THEN 24 ELSE 6 END;
        v_total  := v_total + v_impact;
        v_indicators := v_indicators || fn_seed_indicator(
            'LOCATION', 'Geo-location Anomaly',
            'Transaction occurred from an unusual location for this account.',
            v_impact, v_risky_location,
            COALESCE(t.location_label, 'Unknown'), 'Usual region: India');

        -- 3. velocity ----------------------------------------------------------
        v_impact := LEAST(20, ROUND(t.txn_count_24h * 1.8));
        v_trig   := (t.txn_count_24h > 8);
        v_total  := v_total + v_impact;
        v_indicators := v_indicators || fn_seed_indicator(
            'VELOCITY', 'Transaction Velocity',
            'Transaction frequency is higher than normal for this account.',
            v_impact, v_trig,
            t.txn_count_24h || ' transactions / 24 h', '≤ 8 transactions / 24 h');

        -- 4. time of day -------------------------------------------------------
        v_trig   := (v_hour <= 5);
        v_impact := CASE WHEN v_trig THEN 14 ELSE 4 END;
        v_total  := v_total + v_impact;
        v_indicators := v_indicators || fn_seed_indicator(
            'TIME', 'Time-of-day Pattern',
            'Transaction executed during an unusual hour (00:00 - 05:00).',
            v_impact, v_trig,
            to_char(t.transaction_date, 'HH24:MI'), '08:00 - 22:00');

        -- 5. device ------------------------------------------------------------
        v_trig   := (t.device_type IN ('API_CLIENT', 'ATM'));
        v_impact := CASE WHEN v_trig THEN 16 ELSE 5 END;
        v_total  := v_total + v_impact;
        v_indicators := v_indicators || fn_seed_indicator(
            'DEVICE', 'Device Fingerprint',
            'Transaction initiated from an unrecognised device or automated client.',
            v_impact, v_trig, t.device_type, 'Known mobile / browser device');

        -- 6. account maturity --------------------------------------------------
        v_trig   := (t.account_age_months < 6);
        v_impact := CASE WHEN v_trig THEN 13 ELSE 3 END;
        v_total  := v_total + v_impact;
        v_indicators := v_indicators || fn_seed_indicator(
            'ACCOUNT_AGE', 'Account Maturity',
            'Account is relatively new, limiting historical behaviour signals.',
            v_impact, v_trig, t.account_age_months || ' months', '≥ 6 months');

        -- 7. channel / category risk -------------------------------------------
        v_trig   := (t.transaction_type IN ('CRYPTO_EXCHANGE', 'TRANSFER', 'WITHDRAWAL'));
        v_impact := CASE WHEN v_trig THEN 11 ELSE 4 END;
        v_total  := v_total + v_impact;
        v_indicators := v_indicators || fn_seed_indicator(
            'MERCHANT', 'Channel / Category Risk',
            'Merchant category is frequently associated with chargebacks.',
            v_impact, v_trig, t.transaction_type::TEXT || ' / ' || COALESCE(t.merchant_category, 'n/a'),
            'Low-risk retail categories');

        -- 8. cross-border --------------------------------------------------------
        IF t.is_international THEN
            v_total := v_total + 12;
            v_indicators := v_indicators || fn_seed_indicator(
                'CHANNEL', 'Cross-border Transfer',
                'Cross-border transaction without prior travel history.',
                12, TRUE, 'International transfer flag enabled', 'Domestic transfer');
        END IF;

        -- 9. new recipient -------------------------------------------------------
        IF t.is_new_recipient THEN
            v_total := v_total + 9;
            v_indicators := v_indicators || fn_seed_indicator(
                'RECIPIENT', 'First-time Recipient',
                'Beneficiary was added within the last 24 hours.',
                9, TRUE, COALESCE(t.recipient_masked, 'new beneficiary'), 'Known beneficiary');
        END IF;

        -- final score ------------------------------------------------------------
        v_score := GREATEST(3, LEAST(99, ROUND(v_total)::INT));
        v_prob  := ROUND(LEAST(0.99, GREATEST(0.01, v_score / 100.0
                     + (random() * 0.04 - 0.02)))::NUMERIC, 5);

        -- warnings ---------------------------------------------------------------
        IF v_ratio > 5 THEN
            v_warnings := v_warnings || to_jsonb('Amount exceeds 5x the customer''s typical transaction size.'::TEXT);
        END IF;
        IF v_risky_location THEN
            v_warnings := v_warnings || to_jsonb('Originating IP resolves to a high-risk or anonymising network.'::TEXT);
        END IF;
        IF t.txn_count_24h > 8 THEN
            v_warnings := v_warnings || to_jsonb('Velocity threshold breached - possible card testing.'::TEXT);
        END IF;
        IF v_hour <= 5 THEN
            v_warnings := v_warnings || to_jsonb('Activity outside the customer''s usual active hours.'::TEXT);
        END IF;
        IF v_score >= 70 THEN
            v_warnings := v_warnings || to_jsonb('Recommended action: hold funds and trigger manual review.'::TEXT);
        END IF;

        -- XAI payload -------------------------------------------------------------
        SELECT jsonb_agg(elem->>'type' ORDER BY (elem->>'contribution')::NUMERIC DESC)
          INTO v_features
          FROM jsonb_array_elements(v_indicators) elem
         WHERE (elem->>'triggered')::BOOLEAN;

        SELECT COALESCE(jsonb_object_agg(lower(elem->>'type'),
                        ROUND(((elem->>'contribution')::NUMERIC / 100), 4)), '{}'::jsonb)
          INTO v_contribs
          FROM jsonb_array_elements(v_indicators) elem;

        SELECT string_agg(elem->>'description', ' ' ORDER BY (elem->>'contribution')::NUMERIC DESC)
          INTO v_reason_list
          FROM jsonb_array_elements(v_indicators) elem
         WHERE (elem->>'triggered')::BOOLEAN;

        v_summary := CASE
            WHEN v_score >= 70 THEN
                format('Transaction %s scored %s/100 and was classified as FRAUD. ', t.reference, v_score)
            WHEN v_score >= 40 THEN
                format('Transaction %s scored %s/100 and was flagged as SUSPICIOUS. ', t.reference, v_score)
            ELSE
                format('Transaction %s scored %s/100 and was classified as GENUINE. ', t.reference, v_score)
        END || COALESCE(v_reason_list,
               'All monitored features fall inside this account''s normal behavioural range.');

        -- persist everything atomically ------------------------------------------
        v_pred_id := fn_record_prediction(
            p_transaction_ref       => t.reference,
            p_fraud_probability     => v_prob,
            p_risk_score            => v_score,
            p_model_version         => v_model,
            p_indicators            => v_indicators,
            p_explanation           => v_summary,
            p_important_features    => COALESCE(v_features, '[]'::jsonb),
            p_feature_contributions => v_contribs,
            p_warnings              => v_warnings,
            p_feature_snapshot      => jsonb_build_object(
                                          'amount', t.amount,
                                          'amount_ratio', ROUND(v_ratio, 3),
                                          'txn_count_24h', t.txn_count_24h,
                                          'account_age_months', t.account_age_months,
                                          'hour_of_day', v_hour,
                                          'device_type', t.device_type,
                                          'location', t.location_label,
                                          'is_vpn', t.is_vpn,
                                          'is_international', t.is_international,
                                          'is_new_recipient', t.is_new_recipient),
            p_inference_ms          => 90 + floor(random() * 120)::INT,
            p_confidence            => ROUND((62 + abs(v_score - 50) * 0.7)::NUMERIC, 2)
        );
    END LOOP;
END $$;

-- ===========================================================================
-- 5. ANALYST REVIEW ACTIONS (creates realistic transaction_history entries)
-- ===========================================================================
DO $$
DECLARE
    v_analyst UUID;
    v_admin   UUID;
BEGIN
    SELECT id INTO v_analyst FROM users WHERE email = 'aarav.sharma@fraudshield.io';
    SELECT id INTO v_admin   FROM users WHERE email = 'meera.iyer@fraudshield.io';

    -- confirmed fraud, money clawed back
    PERFORM fn_review_transaction('TXN-0920161', v_analyst, 'REVERSED',
            'Customer confirmed they did not authorise this crypto transfer. Funds recalled.');

    -- false positive released after step-up authentication
    PERFORM fn_review_transaction('TXN-0920156', v_analyst, 'SAFE',
            'Customer verified purchase via OTP and travel itinerary. Released.');

    -- escalated and kept blocked
    PERFORM fn_review_transaction('TXN-0920166', v_admin, 'FRAUD',
            'Matches known mule-account pattern. Case forwarded to law enforcement.');
END $$;

-- ===========================================================================
-- 6. EXTRA AUDIT LOG ENTRIES (logins, exports, settings changes)
-- ===========================================================================
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, status, ip_address, user_agent, created_at)
SELECT u.id, 'LOGIN', 'SESSION', u.id::TEXT,
       jsonb_build_object('method', 'password', 'remember_me', TRUE),
       'SUCCESS', '49.36.212.10'::INET, 'Mozilla/5.0 (Macintosh) Chrome/120', now() - INTERVAL '2 hours'
FROM users u WHERE u.role IN ('ANALYST', 'ADMIN');

INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, status, ip_address, created_at)
VALUES
((SELECT id FROM users WHERE email = 'arjun.mehta@example.com'),
 'LOGIN_FAILED', 'SESSION', NULL,
 '{"reason": "invalid_password", "attempt": 3}'::jsonb, 'FAILURE', '185.220.101.44', now() - INTERVAL '70 minutes'),
((SELECT id FROM users WHERE email = 'sana.khan@fraudshield.io'),
 'REPORT_EXPORTED', 'TRANSACTION', NULL,
 '{"format": "csv", "rows": 50, "filters": {"risk_level": "HIGH"}}'::jsonb, 'SUCCESS', '103.21.58.9', now() - INTERVAL '1 day'),
((SELECT id FROM users WHERE email = 'meera.iyer@fraudshield.io'),
 'SETTINGS_UPDATED', 'SETTINGS', NULL,
 '{"changed": ["theme", "notify_sms"]}'::jsonb, 'SUCCESS', '103.21.58.9', now() - INTERVAL '3 days'),
((SELECT id FROM users WHERE email = 'meera.iyer@fraudshield.io'),
 'MODEL_ACTIVATED', 'MODEL', NULL,
 '{"model_name": "fraudshield-xgboost", "version": "v2.4"}'::jsonb, 'SUCCESS', '103.21.58.9', now() - INTERVAL '20 days');

-- ===========================================================================
-- 7. ACTIVE SESSIONS (Profile page "Active Sessions" panel)
-- ===========================================================================
INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, remember_me, expires_at)
SELECT u.id,
       encode(digest(u.email || 'demo-refresh-token', 'sha256'), 'hex'),
       'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0 Safari/537.36',
       '49.36.212.10'::INET, TRUE, now() + INTERVAL '30 days'
FROM users u WHERE u.role IN ('ANALYST', 'ADMIN');

-- ===========================================================================
-- 8. REFRESH ANALYTICS + REPORT
-- ===========================================================================
SELECT fn_refresh_analytics();
ANALYZE;

DO $$
DECLARE r RECORD;
BEGIN
    SELECT * INTO r FROM v_dashboard_summary;
    RAISE NOTICE '───────────────────────────────────────────────';
    RAISE NOTICE ' FRAUD-SHIELD SEED COMPLETE';
    RAISE NOTICE '───────────────────────────────────────────────';
    RAISE NOTICE ' users .................. %', (SELECT count(*) FROM users);
    RAISE NOTICE ' model versions ......... %', (SELECT count(*) FROM model_versions);
    RAISE NOTICE ' transactions ........... %', r.total_transactions;
    RAISE NOTICE '   safe ................. %', r.safe_transactions;
    RAISE NOTICE '   suspicious ........... %', r.suspicious_transactions;
    RAISE NOTICE '   fraud / blocked ...... %', r.fraud_detected;
    RAISE NOTICE ' predictions ............ %', (SELECT count(*) FROM fraud_predictions);
    RAISE NOTICE ' risk indicators ........ %', (SELECT count(*) FROM risk_indicators);
    RAISE NOTICE ' explanations ........... %', (SELECT count(*) FROM explanations);
    RAISE NOTICE ' history entries ........ %', (SELECT count(*) FROM transaction_history);
    RAISE NOTICE ' audit logs ............. %', (SELECT count(*) FROM audit_logs);
    RAISE NOTICE ' fraud percentage ....... % %%', r.fraud_percentage;
    RAISE NOTICE ' average risk score ..... %', r.avg_risk_score;
    RAISE NOTICE '───────────────────────────────────────────────';
    RAISE NOTICE ' Demo login: aarav.sharma@fraudshield.io / Shield@123';
    RAISE NOTICE '───────────────────────────────────────────────';
END $$;
