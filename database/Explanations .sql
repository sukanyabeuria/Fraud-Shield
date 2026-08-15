CREATE TABLE explanations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    prediction_id BIGINT REFERENCES fraud_predictions(id) ON DELETE CASCADE,
    explanation TEXT NOT NULL,
    important_features TEXT,
    feature_contributions TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);