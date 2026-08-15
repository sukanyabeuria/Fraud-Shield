CREATE TABLE risk_indicators (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    prediction_id BIGINT REFERENCES fraud_predictions(id) ON DELETE CASCADE,
    indicator_type TEXT NOT NULL,
    indicator_name TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);