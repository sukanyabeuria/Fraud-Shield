CREATE TABLE fraud_predictions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE,
    prediction TEXT CHECK (prediction IN ('fraud', 'genuine')),
    fraud_probability NUMERIC(5, 2) CHECK (fraud_probability BETWEEN 0 AND 1),
    risk_score NUMERIC(5, 2),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    model_version TEXT NOT NULL,
    predicted_at TIMESTAMPTZ DEFAULT NOW()
);