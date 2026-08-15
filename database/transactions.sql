CREATE TABLE transactions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    transaction_reference TEXT UNIQUE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')),
    merchant TEXT NOT NULL,
    transaction_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    device_info TEXT,
    ip_info TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);