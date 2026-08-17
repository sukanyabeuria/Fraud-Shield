-- ============================================================================
--  FRAUD-SHIELD · 05_functions_triggers.sql
--  Business logic that must never be bypassed, enforced inside the database
--  Run order: 5 of 9
-- ----------------------------------------------------------------------------
--  What lives here and WHY it is in the database rather than the API:
--    1. updated_at maintenance          — must be true for every writer
--    2. one "latest" prediction per txn — race-condition safe
--    3. transaction.status kept in sync with the newest prediction
--    4. append-only status history      — cannot be forgotten by a developer
--    5. audit logging of predictions    — compliance requirement
--    6. a helper to record a full prediction + indicators + explanation in one
--       call, which is exactly what POST /api/fraud/predict needs
-- ============================================================================

SET search_path TO fraudshield, public;

-- ---------------------------------------------------------------------------
-- 1. Generic updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_models_updated_at ON model_versions;
CREATE TRIGGER trg_models_updated_at
    BEFORE UPDATE ON model_versions
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON user_settings;
CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Create default settings row whenever a user is created
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_create_default_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_default_settings ON users;
CREATE TRIGGER trg_users_default_settings
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION fn_create_default_settings();

-- ---------------------------------------------------------------------------
-- 3. Log the initial status of every new transaction
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_log_transaction_created()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO transaction_history (transaction_id, old_status, new_status, source, change_reason)
    VALUES (NEW.id, NULL, NEW.status, 'API', 'Transaction received and queued for scoring');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_txn_created_history ON transactions;
CREATE TRIGGER trg_txn_created_history
    AFTER INSERT ON transactions
    FOR EACH ROW EXECUTE FUNCTION fn_log_transaction_created();

-- ---------------------------------------------------------------------------
-- 4. Append-only history for every status change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_log_transaction_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO transaction_history (
            transaction_id, old_status, new_status, source, change_reason
        )
        VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            COALESCE(current_setting('fraudshield.change_source', TRUE), 'SYSTEM'),
            COALESCE(current_setting('fraudshield.change_reason', TRUE),
                     'Status updated from ' || OLD.status || ' to ' || NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_log_transaction_status_change() IS
  'The API may set  SET LOCAL fraudshield.change_source / fraudshield.change_reason  before an UPDATE to enrich the history row.';

DROP TRIGGER IF EXISTS trg_txn_status_history ON transactions;
CREATE TRIGGER trg_txn_status_history
    AFTER UPDATE OF status ON transactions
    FOR EACH ROW EXECUTE FUNCTION fn_log_transaction_status_change();

-- ---------------------------------------------------------------------------
-- 5. Exactly one is_latest prediction per transaction
--    (BEFORE INSERT so the unique partial index is never violated)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prediction_demote_previous()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_latest THEN
        UPDATE fraud_predictions
           SET is_latest = FALSE
         WHERE transaction_id = NEW.transaction_id
           AND is_latest
           AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pred_demote_previous ON fraud_predictions;
CREATE TRIGGER trg_pred_demote_previous
    BEFORE INSERT ON fraud_predictions
    FOR EACH ROW EXECUTE FUNCTION fn_prediction_demote_previous();

-- ---------------------------------------------------------------------------
-- 6. Apply the prediction to the transaction:
--    status + decision, and write the audit log entry.
--    This is what makes  Transaction Check → Fraud Result → History  consistent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prediction_apply_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_status transaction_status;
    v_auto_block BOOLEAN;
    v_threshold  SMALLINT;
    v_owner      UUID;
BEGIN
    IF NOT NEW.is_latest THEN
        RETURN NEW;                       -- historical re-score, do not touch the txn
    END IF;

    SELECT t.user_id INTO v_owner FROM transactions t WHERE t.id = NEW.transaction_id;

    SELECT COALESCE(s.auto_block_high_risk, TRUE), COALESCE(s.auto_block_threshold, 85)
      INTO v_auto_block, v_threshold
      FROM user_settings s
     WHERE s.user_id = v_owner;

    v_new_status := fn_status_from_prediction(NEW.prediction);

    IF COALESCE(v_auto_block, TRUE) AND NEW.risk_score >= COALESCE(v_threshold, 85) THEN
        v_new_status := 'BLOCKED';
    END IF;

    PERFORM set_config('fraudshield.change_source', 'ML_MODEL', TRUE);
    PERFORM set_config('fraudshield.change_reason',
                       format('Model %s scored %s/100 (%s, p=%s)',
                              NEW.model_version, NEW.risk_score,
                              NEW.prediction, NEW.fraud_probability), TRUE);

    UPDATE transactions
       SET status = v_new_status
     WHERE id = NEW.transaction_id
       AND status IS DISTINCT FROM v_new_status;

    -- compliance trail
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, status)
    VALUES (
        v_owner,
        'FRAUD_PREDICTED',
        'PREDICTION',
        NEW.id::TEXT,
        jsonb_build_object(
            'transaction_id',    NEW.transaction_id,
            'prediction',        NEW.prediction,
            'risk_score',        NEW.risk_score,
            'risk_level',        NEW.risk_level,
            'fraud_probability', NEW.fraud_probability,
            'model_version',     NEW.model_version,
            'resulting_status',  v_new_status
        ),
        'SUCCESS'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pred_apply_status ON fraud_predictions;
CREATE TRIGGER trg_pred_apply_status
    AFTER INSERT ON fraud_predictions
    FOR EACH ROW EXECUTE FUNCTION fn_prediction_apply_status();

-- ---------------------------------------------------------------------------
-- 7. Derive decision_action from the score if the caller did not supply one
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prediction_set_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.decision IS NULL OR NEW.decision = 'ALLOW' THEN
        NEW.decision := CASE
            WHEN NEW.risk_score >= 90 THEN 'BLOCK'::decision_action
            WHEN NEW.risk_score >= 70 THEN 'REVIEW'::decision_action
            WHEN NEW.risk_score >= 40 THEN 'CHALLENGE'::decision_action
            ELSE                           'ALLOW'::decision_action
        END;
    END IF;

    -- keep risk_level authoritative even if the caller sent a wrong band
    NEW.risk_level := fn_risk_level_from_score(NEW.risk_score);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pred_set_decision ON fraud_predictions;
CREATE TRIGGER trg_pred_set_decision
    BEFORE INSERT ON fraud_predictions
    FOR EACH ROW EXECUTE FUNCTION fn_prediction_set_decision();

-- ---------------------------------------------------------------------------
-- 8. Protect the audit trail: audit_logs and transaction_history are append-only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_block_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION '% is append-only: % is not permitted', TG_TABLE_NAME, TG_OP
        USING HINT = 'Insert a compensating row instead of modifying history.';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_immutable ON audit_logs;
CREATE TRIGGER trg_audit_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();

DROP TRIGGER IF EXISTS trg_history_immutable ON transaction_history;
CREATE TRIGGER trg_history_immutable
    BEFORE UPDATE ON transaction_history
    FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();

-- ---------------------------------------------------------------------------
-- 9. Activate a model version (deactivates all others atomically)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_activate_model(p_model_id UUID)
RETURNS model_versions
LANGUAGE plpgsql
AS $$
DECLARE
    v_row model_versions;
BEGIN
    UPDATE model_versions SET is_active = FALSE WHERE is_active AND id <> p_model_id;

    UPDATE model_versions
       SET is_active   = TRUE,
           deployed_at = COALESCE(deployed_at, now())
     WHERE id = p_model_id
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RAISE EXCEPTION 'Model version % not found', p_model_id;
    END IF;

    INSERT INTO audit_logs (action, entity_type, entity_id, details)
    VALUES ('MODEL_ACTIVATED', 'MODEL', p_model_id::TEXT,
            jsonb_build_object('model_name', v_row.model_name, 'version', v_row.version));

    RETURN v_row;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. ★ fn_record_prediction — the single call behind POST /api/fraud/predict
--     Writes the prediction, all risk indicators and the XAI explanation in ONE
--     transaction, so the Fraud Result page can never read a half-written row.
--
--     p_indicators example:
--       '[{"type":"AMOUNT","name":"Transaction Amount vs History",
--          "description":"High transaction amount compared with previous transactions.",
--          "severity":"HIGH","contribution":24,
--          "observed":"₹487,500","expected":"≈ ₹4,200"}]'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_record_prediction(
    p_transaction_ref   TEXT,
    p_fraud_probability NUMERIC,
    p_risk_score        INTEGER,
    p_model_version     TEXT,
    p_indicators        JSONB DEFAULT '[]'::jsonb,
    p_explanation       TEXT  DEFAULT NULL,
    p_important_features JSONB DEFAULT '[]'::jsonb,
    p_feature_contributions JSONB DEFAULT '{}'::jsonb,
    p_warnings          JSONB DEFAULT '[]'::jsonb,
    p_feature_snapshot  JSONB DEFAULT '{}'::jsonb,
    p_inference_ms      INTEGER DEFAULT NULL,
    p_confidence        NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_txn_id   UUID;
    v_model_id UUID;
    v_pred_id  UUID;
    v_ind      JSONB;
BEGIN
    SELECT id INTO v_txn_id FROM transactions WHERE reference = p_transaction_ref;
    IF v_txn_id IS NULL THEN
        RAISE EXCEPTION 'Transaction % does not exist', p_transaction_ref
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    SELECT id INTO v_model_id
      FROM model_versions
     WHERE model_name || ' ' || version = p_model_version
        OR version = p_model_version
     ORDER BY is_active DESC, trained_at DESC
     LIMIT 1;

    INSERT INTO fraud_predictions (
        transaction_id, model_version_id, prediction, fraud_probability,
        risk_score, risk_level, confidence, model_version,
        inference_time_ms, feature_snapshot, is_latest
    ) VALUES (
        v_txn_id,
        v_model_id,
        fn_prediction_from_score(p_risk_score),
        p_fraud_probability,
        p_risk_score,
        fn_risk_level_from_score(p_risk_score),
        p_confidence,
        p_model_version,
        p_inference_ms,
        COALESCE(p_feature_snapshot, '{}'::jsonb),
        TRUE
    )
    RETURNING id INTO v_pred_id;

    -- risk indicators
    FOR v_ind IN SELECT * FROM jsonb_array_elements(COALESCE(p_indicators, '[]'::jsonb))
    LOOP
        INSERT INTO risk_indicators (
            prediction_id, indicator_type, indicator_name, description,
            severity, contribution, observed_value, expected_value, is_triggered
        ) VALUES (
            v_pred_id,
            COALESCE(v_ind->>'type', 'OTHER'),
            COALESCE(v_ind->>'name', 'Unnamed indicator'),
            COALESCE(v_ind->>'description', 'No description supplied.'),
            COALESCE((v_ind->>'severity')::severity_level, 'MEDIUM'),
            COALESCE((v_ind->>'contribution')::NUMERIC, 0),
            v_ind->>'observed',
            v_ind->>'expected',
            -- only "triggered" factors are shown as reasons on the Fraud Result page;
            -- the rest are still stored so the attribution chart is complete
            COALESCE((v_ind->>'triggered')::BOOLEAN, TRUE)
        )
        ON CONFLICT (prediction_id, indicator_name) DO NOTHING;
    END LOOP;

    -- XAI explanation
    IF p_explanation IS NOT NULL THEN
        INSERT INTO explanations (
            prediction_id, method, explanation, important_features,
            feature_contributions, warnings, confidence, output_value,
            recommended_action
        ) VALUES (
            v_pred_id,
            'SHAP',
            p_explanation,
            COALESCE(p_important_features, '[]'::jsonb),
            COALESCE(p_feature_contributions, '{}'::jsonb),
            COALESCE(p_warnings, '[]'::jsonb),
            p_confidence,
            p_fraud_probability,
            CASE
                WHEN p_risk_score >= 90 THEN 'Block the transaction and freeze the account pending investigation.'
                WHEN p_risk_score >= 70 THEN 'Block the transaction and escalate to the fraud operations team.'
                WHEN p_risk_score >= 40 THEN 'Hold for manual review and request step-up authentication.'
                ELSE 'Approve the transaction — no anomalous behaviour detected.'
            END
        );
    END IF;

    RETURN v_pred_id;
END;
$$;

COMMENT ON FUNCTION fn_record_prediction IS
  'Atomically stores an ML prediction + its risk indicators + XAI explanation. Backing call for POST /api/fraud/predict.';

-- ---------------------------------------------------------------------------
-- 11. Analyst review action (used by the Fraud Result page action buttons)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_review_transaction(
    p_transaction_ref TEXT,
    p_reviewer_id     UUID,
    p_new_status      transaction_status,
    p_notes           TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_txn_id UUID;
BEGIN
    SELECT id INTO v_txn_id FROM transactions WHERE reference = p_transaction_ref;
    IF v_txn_id IS NULL THEN
        RAISE EXCEPTION 'Transaction % does not exist', p_transaction_ref;
    END IF;

    UPDATE fraud_predictions
       SET reviewed_by = p_reviewer_id,
           reviewed_at = now(),
           review_notes = p_notes
     WHERE transaction_id = v_txn_id AND is_latest;

    PERFORM set_config('fraudshield.change_source', 'ANALYST', TRUE);
    PERFORM set_config('fraudshield.change_reason',
                       COALESCE(p_notes, 'Manual review decision'), TRUE);

    UPDATE transactions SET status = p_new_status WHERE id = v_txn_id;

    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (p_reviewer_id, 'TRANSACTION_REVIEWED', 'TRANSACTION', p_transaction_ref,
            jsonb_build_object('new_status', p_new_status, 'notes', p_notes));
END;
$$;
