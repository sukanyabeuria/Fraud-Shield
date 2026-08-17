-- ============================================================================
--  FRAUD-SHIELD · 01_extensions.sql
--  Extensions + dedicated schema
--  Run order: 1 of 9
-- ----------------------------------------------------------------------------
--  Run as a user with CREATE privilege on the database, e.g.
--      psql -U postgres -d fraudshield -f database/sql/01_extensions.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
-- pgcrypto  : gen_random_uuid() on PG < 13, and crypt()/gen_salt() which we use
--             ONLY to generate real bcrypt hashes for the development seed data.
--             In production the API hashes passwords (bcrypt/argon2) before the
--             value ever reaches PostgreSQL.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- citext    : case-insensitive text — used for the users.email column so that
--             'Aarav@Mail.com' and 'aarav@mail.com' cannot both be registered.
CREATE EXTENSION IF NOT EXISTS citext;

-- pg_trgm   : trigram indexes powering fast ILIKE '%merchant%' search on the
--             Transaction History page.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- btree_gin : lets us combine scalar columns with GIN indexes (JSONB + status).
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ---------------------------------------------------------------------------
-- Dedicated schema
-- ---------------------------------------------------------------------------
-- Why a dedicated schema instead of `public`?
--   * keeps application objects isolated from extensions and third-party tools
--   * makes GRANT/REVOKE and backups scoped and predictable
--   * allows a future `fraudshield_analytics` or `fraudshield_ml` schema
CREATE SCHEMA IF NOT EXISTS fraudshield;

COMMENT ON SCHEMA fraudshield IS
  'Fraud-Shield application schema: users, transactions, ML predictions, XAI explanations, audit trail.';

-- Every file in this folder begins with the same search_path statement so the
-- scripts can also be executed individually and in any SQL client.
SET search_path TO fraudshield, public;

-- Make the setting permanent for every new connection to this database.
-- (Requires ownership of the database; safe to ignore the error if it fails.)
DO $$
BEGIN
    EXECUTE format(
        'ALTER DATABASE %I SET search_path TO fraudshield, public',
        current_database()
    );
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not ALTER DATABASE search_path (insufficient privilege). '
                 'Set search_path per connection instead.';
END
$$;
