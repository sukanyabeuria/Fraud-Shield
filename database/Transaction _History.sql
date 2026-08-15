CREATE TABLE transaction_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE,
    old_status TEXT CHECK (old_status IN ('pending', 'completed', 'failed')),
    new_status TEXT CHECK (new_status IN ('pending', 'completed', 'failed')),
    changed_by BIGINT REFERENCES users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW()
);