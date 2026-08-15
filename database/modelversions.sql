CREATE TABLE model_versions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    model_name TEXT NOT NULL,
    version TEXT NOT NULL,
    accuracy NUMERIC(5, 2),
    precision NUMERIC(5, 2),
    recall NUMERIC(5, 2),
    f1_score NUMERIC(5, 2),
    trained_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT FALSE
);