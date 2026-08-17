-- ============================================================================
--  FRAUD-SHIELD · schema.sql  —  MASTER RUNNER
-- ----------------------------------------------------------------------------
--  Builds the entire database in the correct order.
--
--  Usage (from the PROJECT ROOT so the relative paths resolve):
--
--      createdb fraudshield
--      psql -U postgres -d fraudshield -f database/schema.sql
--
--  Skip the demo data in a production deployment:
--      psql -U postgres -d fraudshield -v skip_seed=1 -f database/schema.sql
--
--  `\ir` = include relative to THIS file, so the command works from any cwd.
-- ============================================================================

\set ON_ERROR_STOP on
\timing on

\echo '════════════════════════════════════════════════════════════'
\echo ' FRAUD-SHIELD :: building database'
\echo '════════════════════════════════════════════════════════════'

\echo '→ 1/9  extensions + schema'
\ir sql/01_extensions.sql

\echo '→ 2/9  enum types + helper functions'
\ir sql/02_enums.sql

\echo '→ 3/9  tables, keys and constraints'
\ir sql/03_tables.sql

\echo '→ 4/9  indexes'
\ir sql/04_indexes.sql

\echo '→ 5/9  functions and triggers'
\ir sql/05_functions_triggers.sql

\echo '→ 6/9  analytics views'
\ir sql/06_views.sql

\echo '→ 7/9  seed data (development)'
\ir sql/07_seed.sql

\echo '→ 8/9  query library (search / filter / API functions)'
\ir sql/08_queries.sql

\echo '→ 9/9  roles and grants  — comment out if you are not a superuser'
\ir sql/09_security_roles.sql

\echo ''
\echo '════════════════════════════════════════════════════════════'
\echo ' BUILD COMPLETE'
\echo '════════════════════════════════════════════════════════════'

SELECT * FROM fraudshield.v_dashboard_summary;
