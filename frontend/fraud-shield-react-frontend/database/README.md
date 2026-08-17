# Fraud-Shield — Database Layer (PostgreSQL)

Production-ready PostgreSQL schema for **Fraud-Shield**, an AI-powered financial
fraud detection system.

This layer is designed to sit exactly where the architecture expects it:

```
React + Vite frontend  →  Backend REST API  →  ML Fraud Model  →  Explainable AI  →  PostgreSQL
                                    ↑                                                     │
                                    └──────────────── results + explanations ─────────────┘
```

It contains **no backend code and no ML code** — only the database, plus a small
Node connectivity module so you can prove the database works before the API exists.

---

## 1. Folder structure

```
database/
├── README.md                     ← this file
├── schema.sql                    ← MASTER RUNNER (executes everything in order)
├── .env.example                  ← environment variable template (never commit .env)
│
├── sql/
│   ├── 01_extensions.sql         ← pgcrypto, citext, pg_trgm + `fraudshield` schema
│   ├── 02_enums.sql              ← ENUM types + risk-band helper functions
│   ├── 03_tables.sql             ← all 10 tables, PK/FK/UNIQUE/CHECK/defaults
│   ├── 04_indexes.sql            ← 45+ indexes, each with a "why it exists" comment
│   ├── 05_functions_triggers.sql ← business rules enforced inside the DB
│   ├── 06_views.sql              ← 20+ analytics views + materialized view
│   ├── 07_seed.sql               ← consistent demo data (9 users, 50 transactions)
│   ├── 08_queries.sql            ← API functions + search/filter/sort/pagination
│   └── 09_security_roles.sql     ← least-privilege roles, grants, optional RLS
│
└── client/
    ├── db.js                     ← node-postgres pool (env vars, parameterised)
    ├── queries.js                ← repository functions, one per API endpoint
    └── healthcheck.js            ← connectivity + data-integrity smoke test
```

### Why this structure instead of a flat folder?

| Concern | Reason |
| --- | --- |
| **Numbered files** | Execution order is dependency order. `07_seed.sql` cannot run before `05_functions_triggers.sql` because the seed calls `fn_record_prediction()`. Numbers make that impossible to get wrong. |
| **`sql/` subfolder** | Keeps `schema.sql`, `README.md` and `.env.example` visible at the top level instead of buried among nine scripts. |
| **Split `tables` / `indexes` / `views`** | You re-run indexes and views far more often than tables. Separation avoids accidentally dropping data. |
| **`client/`** | Demonstrates connectivity and gives the future backend a ready-made data-access layer, without being a backend. |
| **`09_security_roles.sql` last** | Requires superuser; can be skipped on a laptop and run only in staging/production. |

> The requested flat layout (`schema.sql`, `enums.sql`, `tables.sql`, …) is preserved
> conceptually — same files, same names, just prefixed and grouped.

---

## 2. Database architecture

### 2.1 ER-style relationship model

```
┌────────────────────────┐
│         users          │  console accounts (ADMIN/ANALYST/AUDITOR/SERVICE)
│  PK id (uuid)          │  and customers (CUSTOMER)
│  UQ email              │
│     password_hash      │
└───┬───────┬────────┬───┘
    │1    1 │      1 │N
    │       │        └──────────────────────► audit_logs        (ON DELETE SET NULL)
    │       └───────────────────────────────► user_settings 1:1 (ON DELETE CASCADE)
    │                                        user_sessions  1:N (ON DELETE CASCADE)
    │N
┌───▼────────────────────┐        ┌────────────────────────┐
│      transactions      │        │     model_versions     │
│  PK id (uuid)          │        │  PK id (uuid)          │
│  UQ reference TXN-…    │        │  UQ (model_name,       │
│  FK user_id ──CASCADE  │        │      version)          │
│     amount, currency   │        │     accuracy/precision │
│     type, merchant     │        │     recall/f1/roc_auc  │
│     location, device   │        │     is_active (1 only) │
│     ip, status         │        └───────────┬────────────┘
└───┬───────────────┬────┘                    │1
    │1              │1                        │
    │               │N                        │N
    │        ┌──────▼──────────────┐   ┌──────▼─────────────────────┐
    │        │ transaction_history │   │     fraud_predictions      │
    │        │  PK id (bigserial)  │   │  PK id (uuid)              │
    │        │  FK transaction_id  │◄──┤  FK transaction_id CASCADE │
    │        │     CASCADE         │   │  FK model_version_id       │
    │        │  FK changed_by      │   │        SET NULL            │
    │        │     SET NULL        │   │     prediction  (enum)     │
    │        │     old_status      │   │     fraud_probability      │
    │        │     new_status      │   │     risk_score 0-100       │
    │        │     changed_at      │   │     risk_level  (enum)     │
    │        └─────────────────────┘   │     is_latest (1 per txn)  │
    │                                  └───┬──────────────────┬─────┘
    └── 1:N ───────────────────────────────┘1                 │1
                                            │N                │1
                            ┌───────────────▼──────┐  ┌───────▼──────────────┐
                            │   risk_indicators    │  │     explanations     │
                            │  PK id (uuid)        │  │  PK id (uuid)        │
                            │  FK prediction_id    │  │  FK prediction_id    │
                            │     CASCADE          │  │     CASCADE          │
                            │  UQ (pred, name)     │  │  UQ (pred, method)   │
                            │     indicator_type   │  │     explanation TEXT │
                            │     description      │  │     important_features
                            │     severity (enum)  │  │     feature_contributions
                            │     contribution     │  │     warnings (jsonb) │
                            └──────────────────────┘  └──────────────────────┘
```

### 2.2 Cardinality summary

| Relationship | Type | ON DELETE | Rationale |
| --- | --- | --- | --- |
| users → transactions | 1:N | CASCADE | A customer's transactions have no meaning without the customer. |
| transactions → fraud_predictions | 1:N | CASCADE | Re-scoring keeps history; `is_latest` marks the current one. |
| fraud_predictions → risk_indicators | 1:N | CASCADE | Indicators explain one specific prediction. |
| fraud_predictions → explanations | 1:1 per method | CASCADE | One SHAP explanation (LIME/Anchors can coexist). |
| transactions → transaction_history | 1:N | CASCADE | Status trail belongs to the transaction. |
| users → audit_logs | 1:N | **SET NULL** | Compliance logs must survive user deletion. |
| users → transaction_history.changed_by | 1:N | **SET NULL** | Same reason. |
| model_versions → fraud_predictions | 1:N | **SET NULL** | `model_version` text is also denormalised so the audit survives. |
| users → user_settings | 1:1 | CASCADE | Auto-created by trigger on user insert. |

### 2.3 Tables at a glance

| Table | Purpose | Key columns |
| --- | --- | --- |
| `users` | Accounts + auth | `email` (UNIQUE, citext), `password_hash`, `role` |
| `user_settings` | Profile page toggles | notification/security/theme flags |
| `user_sessions` | Refresh-token registry | `refresh_token_hash`, `expires_at`, `revoked_at` |
| `transactions` | Financial transactions | `reference`, `amount`, `type`, location, device, IP, `status` |
| `fraud_predictions` | ML output | `prediction`, `fraud_probability`, `risk_score`, `risk_level`, `is_latest` |
| `risk_indicators` | Why it's risky | `indicator_type`, `description`, `severity`, `contribution` |
| `explanations` | XAI output | `explanation`, `important_features`, `feature_contributions` (JSONB) |
| `transaction_history` | Status trail | `old_status`, `new_status`, `changed_by`, `changed_at` |
| `audit_logs` | System activity | `action`, `entity_type`, `entity_id`, `details` (JSONB) |
| `model_versions` | Model registry | `version`, `accuracy`, `precision_score`, `recall_score`, `f1_score`, `is_active` |

---

## 3. PostgreSQL setup

### 3.1 Install

```bash
# macOS
brew install postgresql@16 && brew services start postgresql@16

# Ubuntu / Debian
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

# Docker (fastest for a demo)
docker run --name fraudshield-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fraudshield \
  -p 5432:5432 -d postgres:16
```

**Requires PostgreSQL 13+** (uses `gen_random_uuid()`, `FILTER`, `jsonb_path_ops`).
Tested on 14, 15 and 16.

### 3.2 Create the database

```bash
# local install
createdb -U postgres fraudshield

# or from inside psql
psql -U postgres -c "CREATE DATABASE fraudshield WITH ENCODING 'UTF8';"
```

### 3.3 Build the schema (one command)

```bash
# run from the PROJECT ROOT
psql -U postgres -d fraudshield -f database/schema.sql
```

You should see:

```
→ 1/9  extensions + schema
…
 FRAUD-SHIELD SEED COMPLETE
 users .................. 9
 transactions ........... 50
 predictions ............ 50
 risk indicators ........ 400+
 explanations ........... 50
 Demo login: aarav.sharma@fraudshield.io / Shield@123
```

### 3.4 Run files individually (optional)

Each file is standalone and re-runnable, in this order:

```bash
cd database
psql -U postgres -d fraudshield -f sql/01_extensions.sql
psql -U postgres -d fraudshield -f sql/02_enums.sql
psql -U postgres -d fraudshield -f sql/03_tables.sql
psql -U postgres -d fraudshield -f sql/04_indexes.sql
psql -U postgres -d fraudshield -f sql/05_functions_triggers.sql
psql -U postgres -d fraudshield -f sql/06_views.sql
psql -U postgres -d fraudshield -f sql/07_seed.sql          # dev only
psql -U postgres -d fraudshield -f sql/08_queries.sql
psql -U postgres -d fraudshield -f sql/09_security_roles.sql # superuser
```

> ⚠️ `03_tables.sql` **drops and recreates** all tables, and `07_seed.sql`
> **truncates** them. Never run either against production.

### 3.5 Verify

```bash
psql -U postgres -d fraudshield -c "SELECT * FROM v_dashboard_summary;"
psql -U postgres -d fraudshield -c "SELECT jsonb_pretty(fn_get_fraud_result('TXN-0920161'));"
```

---

## 4. Sample data

`07_seed.sql` produces **internally consistent** data, and this is enforced rather
than hoped for. Instead of hand-writing scores, the seed inserts raw transactions
and then runs a PL/pgSQL scoring engine that mirrors the rule weights already used
by the frontend mock (`src/services/fraudApi.js`). Every prediction is written via
`fn_record_prediction()`, and the CHECK constraints reject anything contradictory.

| Data | Count |
| --- | --- |
| Users | 9 (1 admin, 2 analysts, 1 auditor, 1 service, 4 customers) |
| Model versions | 3 (`v1.0`, `v2.0`, `v2.4` — v2.4 active) |
| Transactions | 50 (26 curated + 24 generated over 45 days) |
| Predictions | 50 (one `is_latest` per transaction) |
| Risk indicators | ~400 (7–9 per prediction) |
| Explanations | 50 SHAP-style explanations |
| History rows | 100+ (creation + ML decision + analyst reviews) |
| Audit logs | 60+ (predictions, logins, exports, model activation) |

**Consistency guarantees enforced by CHECK constraints:**

* `risk_score` 0–39 ⇒ `LOW`, 40–69 ⇒ `MEDIUM`, 70–89 ⇒ `HIGH`, 90–100 ⇒ `CRITICAL`
* `prediction = 'FRAUD'` ⇒ `risk_score >= 70` (and vice-versa)
* `|risk_score − fraud_probability × 100| <= 15`
* every fraudulent transaction has matching indicators **and** an explanation
* `transactions.status` is set by a trigger from the latest prediction

**Demo credentials** — every seeded user has password `Shield@123`
(bcrypt cost 12, generated by pgcrypto at seed time):

| Email | Role |
| --- | --- |
| `aarav.sharma@fraudshield.io` | ANALYST |
| `meera.iyer@fraudshield.io` | ADMIN |
| `sana.khan@fraudshield.io` | AUDITOR |
| `priya.nair@example.com` | CUSTOMER |

Interesting references to demo: `TXN-0920145` (safe), `TXN-0920154` (suspicious),
`TXN-0920161` (critical fraud, later reversed), `TXN-0920166` (critical, confirmed fraud).

---

## 5. Important queries

### Dashboard

```sql
SELECT * FROM v_dashboard_summary;              -- all KPI cards in one row
SELECT * FROM v_recent_transactions;            -- Recent Transactions table
SELECT * FROM v_transactions_by_risk_level;     -- Risk Distribution pie
SELECT * FROM v_transaction_activity_hourly;    -- Transaction Activity area chart
```

### Analytics page

```sql
SELECT jsonb_pretty(fn_get_analytics());        -- everything, one round-trip
SELECT * FROM v_fraud_trend_monthly;            -- Fraud Trend chart
SELECT * FROM v_volume_by_type;                 -- Volume by channel
SELECT * FROM v_hourly_risk_profile;            -- Time-based analysis
SELECT * FROM v_device_risk_stats;              -- Device risk statistics
SELECT * FROM v_location_risk_stats;            -- Location risk statistics
SELECT * FROM v_top_suspicious_merchants;       -- Top suspicious merchants
SELECT * FROM v_risk_indicator_frequency;       -- Most common fraud reasons
```

### Fraud Result page

```sql
SELECT jsonb_pretty(fn_get_fraud_result('TXN-0920161'));
```

Returns exactly the object shape `src/pages/FraudResult.jsx` already renders:

```jsonc
{
  "transactionId": "TXN-0920161",
  "isFraud": true,
  "verdict": "Fraudulent",
  "riskScore": 99,
  "riskLevel": "High",          // Low | Medium | High (CRITICAL folded into High)
  "confidence": 96.3,
  "modelVersion": "fraudshield-xgboost v2.4",
  "summary":  { "amount": 487500.00, "location": "Unknown / VPN", ... },
  "reasons":  [ { "title": "...", "text": "...", "detail": "...", "impact": 24 } ],
  "factors":  [ { "label": "...", "impact": 24, "triggered": true } ],
  "warnings": [ "Velocity threshold breached - possible card testing." ],
  "recommendedAction": "Block the transaction and escalate…"
}
```

### Transaction History page (search + filter + sort + pagination)

```sql
-- everything is optional; NULL means "no filter"
SELECT * FROM fn_search_transactions(
  p_search     => 'coin',        -- ID / merchant / location / type / user
  p_status     => 'FRAUD',
  p_risk_level => 'CRITICAL',
  p_date_from  => now() - INTERVAL '30 days',
  p_date_to    => now(),
  p_min_amount => 10000,
  p_max_amount => 500000,
  p_sort       => 'risk_desc',   -- date_desc|date_asc|risk_desc|risk_asc|amount_desc|amount_asc
  p_limit      => 8,
  p_offset     => 0
);
```

`total_count` is returned on every row, so pagination needs only one query.
`08_queries.sql` also installs `PREPARE`d templates for each individual filter.

---

## 6. Indexes — why each one exists

| Index | Powers |
| --- | --- |
| `uq_users_email`, `idx_users_email_active` | Login lookup — the hottest query in the system. |
| `idx_txn_reference_trgm` | History search box (`reference ILIKE '%0920%'`) — a btree cannot do substring matching. |
| `idx_txn_date_desc` | Default listing and every time-series chart. |
| `idx_txn_status_date` | "Filter by status, newest first" in a single index scan. |
| `idx_txn_flagged` (partial) | Fraud/suspicious KPIs — stays tiny even at millions of rows. |
| `idx_txn_merchant`, `idx_txn_merchant_trgm` | Merchant filter + "top suspicious merchants". |
| `idx_txn_amount` | Amount-range filter and "largest transactions" sort. |
| `uq_pred_latest_per_txn` (unique partial) | Guarantees one current score per transaction **and** speeds up every view JOIN. |
| `idx_pred_risk_level`, `idx_pred_risk_score`, `idx_pred_probability` | Risk-level filter, risk sorting, probability thresholds. |
| `idx_pred_prediction` | Fraud/genuine counts on the Dashboard. |
| `idx_pred_high_risk_queue` (partial) | High/critical work queue. |
| `idx_indicator_prediction` | Fetch a prediction's reasons ordered by contribution. |
| `idx_expl_contributions_gin` | Query inside SHAP JSONB output. |
| `idx_history_transaction` | Transaction timeline drawer. |
| `idx_audit_created_at`, `idx_audit_failures` | Security feed and brute-force detection. |
| `uq_model_single_active` | Enforces exactly one active model. |

Check the planner is using them:

```sql
EXPLAIN ANALYZE SELECT * FROM transactions WHERE reference = 'TXN-0920161';
EXPLAIN ANALYZE SELECT * FROM v_transaction_overview WHERE status = 'FRAUD' ORDER BY date DESC LIMIT 20;
```

---

## 7. ENUMs — and where they were deliberately avoided

**Used** (small, stable, the frontend branches on them):
`user_role`, `transaction_status`, `transaction_type`, `risk_level`,
`prediction_result`, `severity_level`, `decision_action`.

**Deliberately NOT enums** (they grow over time; adding an enum value needs DDL):

| Column | Type used | Why |
| --- | --- | --- |
| `merchant`, `merchant_category` | `VARCHAR` | Thousands of values, changes daily. |
| `device_type` | `VARCHAR + CHECK` | New device channels appear regularly. |
| `indicator_type` | `VARCHAR + CHECK` | The ML team adds feature families often. |
| `explanations.method` | `VARCHAR + CHECK` | SHAP today, LIME/Anchors tomorrow. |
| `currency` | `CHAR(3) + CHECK` | ISO-4217 is an external standard. |
| `audit_logs.action` | `VARCHAR` | Free-form, high-cardinality. |

---

## 8. How the backend connects

### 8.1 Environment variables

```bash
cp database/.env.example .env      # then edit — .env must be git-ignored
```

| Variable | Purpose |
| --- | --- |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | Connection parts |
| `DATABASE_URL` | Alternative single connection string |
| `PGSCHEMA` | `fraudshield` (sets `search_path` on every connection) |
| `PGSSLMODE` | `require` / `verify-full` for any hosted database |
| `DB_POOL_MAX`, `DB_IDLE_TIMEOUT_MS`, `DB_STATEMENT_TIMEOUT_MS` | Pool tuning |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS` | Auth (API side) |
| `ML_SERVICE_URL`, `XAI_SERVICE_URL` | Downstream services |

### 8.2 Verify connectivity before writing any backend

```bash
npm install pg dotenv
node database/client/healthcheck.js
```

### 8.3 Endpoint → SQL map

| Endpoint | Repository function (`client/queries.js`) | SQL object |
| --- | --- | --- |
| `POST /api/auth/login` | `authenticate()` | `fn_authenticate()` |
| `POST /api/auth/register` | `createUser()` | `INSERT INTO users` |
| `GET /api/users/me` | `getUserProfile()` | `v_user_profile` |
| `POST /api/transactions` | `createTransaction()` | `fn_create_transaction()` |
| `GET /api/transactions` | `searchTransactions()` | `fn_search_transactions()` |
| `GET /api/transactions/:id` | `getTransaction()` | `fn_get_transaction()` |
| `POST /api/fraud/predict` | `recordPrediction()` | `fn_record_prediction()` |
| `GET /api/fraud/results/:id` | `getFraudResult()` | `v_fraud_result` |
| `GET /api/analytics` | `getAnalytics()` | `fn_get_analytics()` |
| `GET /api/analytics/summary` | `getDashboardSummary()` | `v_dashboard_summary` |
| `GET /api/risk-analysis` | `getRiskAnalysis()` | `fn_get_risk_analysis()` |

### 8.4 The full prediction flow

```js
// POST /api/fraud/predict  (future backend controller)
import { createTransaction, recordPrediction, getFraudResult } from "./database/client/queries.js";

const reference = await createTransaction({ userId, ...req.body });   // 1. store input
const ml  = await fetch(`${process.env.ML_SERVICE_URL}/predict`, {    // 2. ML model
  method: "POST", body: JSON.stringify(req.body),
}).then(r => r.json());
const xai = await fetch(`${process.env.XAI_SERVICE_URL}/explain`, {   // 3. Explainable AI
  method: "POST", body: JSON.stringify({ features: ml.features }),
}).then(r => r.json());

await recordPrediction({                                              // 4. persist atomically
  reference,
  fraudProbability: ml.probability,
  riskScore: Math.round(ml.probability * 100),
  modelVersion: ml.model_version,
  indicators: xai.indicators,
  explanation: xai.summary,
  importantFeatures: xai.important_features,
  featureContributions: xai.shap_values,
  warnings: xai.warnings,
  inferenceMs: ml.latency_ms,
  confidence: ml.confidence,
});

res.json(await getFraudResult(reference));                            // 5. FraudResult payload
```

Triggers then automatically: set `transactions.status`, demote the previous
prediction's `is_latest`, append a `transaction_history` row, and write an
`audit_logs` entry — with no extra backend code.

### 8.5 Frontend compatibility

**No frontend change is required.** The views already emit the keys the existing
components use:

| Frontend field (`mockData.js` / pages) | Database source |
| --- | --- |
| `id` (`TXN-…`) | `v_transaction_overview.id` (= `transactions.reference`) |
| `date`, `amount`, `type`, `merchant`, `location` | same-named view columns |
| `status` → `Safe` / `Suspicious` / `Fraud` | `status_label` |
| `riskScore` (0–100) | `"riskScore"` |
| `riskLevel` → `Low` / `Medium` / `High` | `risk_level_label` |
| `reasons[]`, `factors[]`, `warnings[]`, `summary{}` | `v_fraud_result.payload` |
| Profile `name`, `email`, `role` | `v_user_profile` |

When you are ready, only `src/services/fraudApi.js` changes: replace each mock
body with a `fetch()` to the matching endpoint above. No component, page or route
is touched.

---

## 9. Security considerations

**Implemented in this layer**

* Passwords stored **only** as bcrypt/argon2 digests; a CHECK constraint rejects
  anything shorter than 50 characters so a plain-text password cannot be inserted.
* `fn_authenticate()` uses constant-time `crypt()` comparison, increments
  `failed_login_attempts` and locks the account for 15 minutes after 5 failures.
* No full card numbers, PANs, CVVs or IBANs anywhere — only `recipient_masked`
  (`XXXXXX4412`). `account_balance` is optional and can be dropped entirely.
* `audit_logs` and `transaction_history` are **append-only**, enforced by triggers
  that raise an exception on UPDATE/DELETE.
* Deleting a user never deletes the audit trail (`ON DELETE SET NULL`).
* Least-privilege roles: `fraudshield_app` (DML, no DDL), `fraudshield_ml`
  (reads features, writes predictions), `fraudshield_readonly` (views only, and
  explicitly **revoked** from `users`), `fraudshield_migrator` (DDL only).
* `REVOKE CREATE ON SCHEMA public FROM PUBLIC` blocks `search_path` attacks.
* Optional Row-Level Security policies (commented in `09_security_roles.sql`) so a
  `CUSTOMER` can only ever read their own transactions.
* Every constraint (`CHECK`, `UNIQUE`, `FK`) is a last line of defence against bad
  data from a buggy API.

**Required from the backend**

* **Always** use parameterised queries — `client/queries.js` never concatenates
  user input. Never build SQL with template literals.
* Read credentials from environment variables / a secret manager. Nothing is
  hard-coded; `.env` must be git-ignored.
* Connect as `fraudshield_app`, never as `postgres`.
* Enable TLS (`PGSSLMODE=require`) for any non-local database.
* Set a statement timeout (already configured in `db.js`) and pool limits.
* Rate-limit `POST /api/auth/login` in addition to the DB-side lockout.
* Rotate role passwords; enable `pgaudit` in regulated environments.
* Back up with `pg_dump -Fc` nightly + WAL archiving for point-in-time recovery;
  encrypt backups at rest.

---

## 10. Maintenance

```sql
-- refresh cached analytics after batch scoring (cron / pg_cron)
SELECT fn_refresh_analytics();

-- promote a newly trained model (atomically deactivates the previous one)
SELECT fn_activate_model('<model-uuid>');

-- keep the planner informed
ANALYZE;

-- table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_catalog.pg_statio_user_tables
WHERE schemaname = 'fraudshield'
ORDER BY pg_total_relation_size(relid) DESC;
```

**Scaling notes for later:** partition `audit_logs` and `transactions` by
`RANGE (created_at)` monthly, archive predictions older than 24 months to cold
storage, and move heavy analytics onto `mv_daily_fraud_metrics`.
