# 🛡️ Fraud-Shield

A full-stack **AI-powered financial fraud detection and explainability platform** designed to identify suspicious transactions in real time, combine machine-learning predictions with deterministic fraud rules, and explain the factors behind each fraud decision.

> **Current Stage:** Functional FastAPI backend with real XGBoost inference, SHAP explainability, hybrid risk scoring, PostgreSQL persistence, analytics, and JWT authentication. Frontend-to-backend integration is the next phase.

---

# 📌 About the Project

**Fraud-Shield** detects potentially fraudulent financial transactions using a combination of:

* Machine Learning
* Explainable AI (XAI)
* Rule-based fraud detection
* Hybrid risk scoring
* FastAPI REST APIs
* PostgreSQL database
* SQLAlchemy ORM
* JWT-based authentication
* Transaction persistence
* Fraud analytics
* Interactive monitoring dashboard

The system evaluates transaction characteristics such as transaction amount, transaction type, international transfer status, recipient history, device information, transaction frequency, location, and other transaction attributes.

The platform does not only produce a fraud verdict. It also returns **risk factors, triggered business rules, prediction confidence, recommended actions, and SHAP-based explanations** to make the decision easier to understand.

---

# 🚀 Key Features

## 🔐 Authentication

Backend authentication has been implemented using:

* Login API
* Email validation
* Database user lookup
* Argon2 password hashing through `pwdlib`
* JWT access-token generation using `PyJWT`
* Invalid credential handling
* Authentication request/response schemas
* User ID, email, and role in the login response/JWT payload

### Authentication Endpoint

```text
POST /api/v1/auth/login
```

### Login Request

```json
{
  "email": "demo@fraudshield.com",
  "password": "Demo@123"
}
```

### Successful Response

```json
{
  "access_token": "<JWT_TOKEN>",
  "token_type": "bearer",
  "user_id": 1,
  "email": "demo@fraudshield.com",
  "role": "user"
}
```

### Invalid Credentials

The API correctly returns:

```http
401 Unauthorized
```

with:

```json
{
  "detail": "Invalid email or password"
}
```

### Authentication Schemas

```text
backend/app/schemas/auth.py
```

The backend uses:

* `pwdlib`
* Argon2
* `PyJWT`
* Pydantic `EmailStr`

> **Frontend authentication integration is not yet completed.** The React frontend still needs to call the login endpoint, store/manage the JWT, and attach authentication headers to protected requests.

---

# 🤖 Machine Learning Fraud Detection

Fraud-Shield uses a **real trained XGBoost machine-learning model** for fraud prediction.

The current backend does **not** use hard-coded mock predictions for ML inference.

The prediction flow is:

```text
API Request
     │
     ▼
MLService
     │
     ▼
FraudPredictor
     │
     ▼
MLModelLoader
     │
     ▼
Trained XGBoost Model
     │
     ▼
Fraud Probability
     │
     ▼
ML Risk Score
```

The backend implementation is located in:

```text
backend/app/services/ml_service.py
backend/ml/predictor.py
backend/ml/model_loader.py
```

`MLService` wraps the existing `FraudPredictor`, while `FraudPredictor` loads the trained model through `MLModelLoader`.

### ML Prediction Output

The ML layer produces:

* Fraud probability
* ML risk score
* Model version
* SHAP feature explanations

The ML risk score is derived from the model's fraud probability:

```text
ML Risk Score = fraud_probability × 100
```

rounded to an integer.

---

# 🧠 Model Artifacts

The backend currently uses trained ML artifacts under:

```text
backend/ml/artifacts/
```

Expected artifacts include:

```text
xgboost_model.pkl
feature_engineer.pkl
shap_explainer.pkl
model_metadata.json
```

The active model version is:

```text
fraud-shield-xgboost-v1.0
```

### Model Serialization Note

The current XGBoost model is loaded from a trusted `.pkl` artifact.

XGBoost documents that pickle-based model serialization is a Python memory snapshot and is not a stable cross-version serialization format. For long-term or production model storage, the recommended approach is to export the XGBoost model using its native `save_model()` format such as JSON or UBJSON.

This is a **model artifact maintenance enhancement**, not evidence that the current prediction pipeline is mock-based.

---

# 🔍 Explainable AI (XAI)

Fraud-Shield uses **SHAP (SHapley Additive exPlanations)** to explain individual ML predictions.

Instead of returning only:

```text
Transaction is fraudulent
```

the system can identify the features contributing to the prediction.

Example:

```text
is_new_recipient   → increases risk
is_new_device      → increases risk
amount             → increases risk
international      → increases risk
transaction_frequency → increases risk
```

Each explanation can contain:

* Feature name
* SHAP impact
* Risk direction
* Human-readable explanation

This improves transparency and helps fraud analysts understand why a transaction was classified as risky.

---

# ⚙️ Hybrid Fraud Detection Engine

Fraud-Shield combines the **real ML prediction** with deterministic business rules.

```text
Transaction
     │
     ▼
Feature Engineering
     │
     ├─────────────────┐
     ▼                 ▼
XGBoost Model      Rule Engine
     │                 │
     │                 ├── HIGH_AMOUNT
     │                 ├── NEW_RECIPIENT
     │                 ├── INTERNATIONAL_TRANSFER
     │                 ├── HIGH_FREQUENCY
     │                 └── NEW_DEVICE
     │                 │
     └────────┬────────┘
              ▼
       Hybrid Risk Scoring
              │
              ▼
       Final Fraud Decision
              │
        ┌─────┴─────┐
        ▼           ▼
      SHAP      PostgreSQL
   Explanation   Persistence
        │           │
        └─────┬─────┘
              ▼
          API Response
```

The hybrid approach allows Fraud-Shield to combine:

### Machine Learning

Useful for:

* Complex fraud patterns
* Non-linear relationships
* Historical transaction behavior
* Interacting risk factors

### Business Rules

Useful for:

* Explicit business policies
* Known high-risk conditions
* Immediate fraud signals
* Controllable risk thresholds

### Explainability

Useful for:

* Understanding model decisions
* Manual fraud investigation
* Risk transparency
* Analyst decision support

---

# 🛡️ Rule Engine

The deterministic rule engine is implemented in:

```text
backend/app/services/rule_engine.py
```

Current rules include:

```text
HIGH_AMOUNT
NEW_RECIPIENT
INTERNATIONAL_TRANSFER
HIGH_FREQUENCY
NEW_DEVICE
```

Example configuration:

```text
High amount threshold:       200000
High amount penalty:              25
High frequency threshold:           8
New recipient penalty:             18
International penalty:             15
New device penalty:                10
```

The rule engine returns:

```json
{
  "triggered_rules": [],
  "rule_score": 0,
  "total_rules_triggered": 0
}
```

When a rule is triggered, the API can return a human-readable reason.

---

# 📊 Fraud Detection Dashboard

The backend provides analytics APIs for the monitoring dashboard.

Available metrics include:

* Total transactions
* Safe transactions
* Suspicious transactions
* Fraud detected
* Overall risk score
* Fraud percentage
* High-risk transactions
* Critical-risk transactions
* Total transaction amount
* Blocked amount
* Risk distribution
* Transaction activity
* Fraud trend
* Transaction volume by type
* Hourly risk
* Device risk
* Location risk
* Top merchants
* Model evaluation statistics

### Analytics Endpoints

```text
GET /api/v1/analytics/summary
GET /api/v1/analytics
```

The analytics layer reads persisted transaction data from the database rather than relying on frontend-only mock statistics.

---

# 💳 Real-Time Transaction Analysis

Users can submit transaction information for fraud evaluation.

### Transaction Inputs

* Transaction ID
* Transaction amount
* Currency
* Transaction type
* Merchant category
* Merchant name
* Location
* IP address
* Device type
* International transfer status
* New recipient status
* Transaction frequency
* New device status

The backend processes the transaction and generates:

* Risk score
* Risk level
* Fraud/Safe verdict
* Prediction confidence
* Risk factors
* Triggered fraud rules
* Recommended action
* Model version
* Evaluation timestamp

### Endpoint

```text
POST /api/v1/transactions/analyze
```

Example response concept:

```text
Risk Score: 94
Risk Level: Critical
Verdict: Fraud
Confidence: ~99.5%

Recommended Action:
Block transaction and initiate manual review
```

The exact score and confidence depend on the submitted transaction and the trained model.

---

# 🧠 Prediction Pipeline

The current backend prediction architecture is:

```text
TransactionCreate
       │
       ▼
/transactions/analyze
       │
       ▼
MLService
       │
       ├───────────────┐
       ▼               ▼
FraudPredictor     RuleEngine
       │               │
       ▼               ▼
MLModelLoader      Rule Evaluation
       │               │
       ▼               ▼
XGBoost           Rule Score
       │               │
       └───────┬───────┘
               ▼
        HybridScorer
               │
               ▼
       Final Risk Score
               │
        ┌──────┴──────┐
        ▼             ▼
   Risk Level       Verdict
        │             │
        └──────┬──────┘
               ▼
          SHAP Explain
               │
               ▼
       Fraud Evaluation
               │
               ▼
          PostgreSQL
               │
               ▼
          API Response
```

This means the backend's fraud-analysis path is based on the trained ML artifact plus the deterministic rule engine, rather than a frontend mock prediction.

---

# 🧩 Hybrid Risk Scoring

Fraud-Shield uses a configurable hybrid scoring approach.

Current configuration:

```text
ML_WEIGHT   = 0.70
RULE_WEIGHT = 0.30
```

The final risk assessment combines:

```text
70% Machine Learning signal
+
30% Rule-based signal
```

Risk thresholds are configurable through:

```text
backend/app/core/config.py
```

Current thresholds:

```text
LOW_RISK_THRESHOLD       = 40
HIGH_RISK_THRESHOLD      = 70
CRITICAL_RISK_THRESHOLD  = 90
```

---

# 🗄️ Database

Fraud-Shield uses **PostgreSQL** for persistent storage.

The backend uses:

* SQLAlchemy ORM
* PostgreSQL
* Foreign-key relationships
* Persisted fraud evaluations
* Feature attribution storage

### Stored Information

* User accounts
* Transaction details
* Fraud evaluations
* Risk scores
* Risk levels
* Fraud verdicts
* Prediction confidence
* Feature attributions
* Triggered rules
* Model version
* Evaluation timestamps

### Database Relationships

```text
Users
  │
  └── Transactions
          │
          └── Fraud Evaluations
                  │
                  └── Feature Attributions
```

---

# 💾 Database Persistence

Fraud evaluation results are persisted after transaction analysis.

Conceptually:

```text
Transaction
TXN-DB-001
      │
      ├── Risk Score
      ├── Risk Level
      ├── Verdict
      ├── Confidence
      └── Model Version
             │
             └── Fraud Evaluation
                    │
                    └── Feature Attributions
```

This allows historical analysis and database-backed analytics.

---

# 🔌 Backend API

Fraud-Shield uses **FastAPI** for the REST backend.

## Current Live API Routes

```text
POST /api/v1/auth/login

GET  /api/v1/health

GET  /api/v1/analytics/summary

GET  /api/v1/analytics

GET  /api/v1/transactions

GET  /api/v1/transactions/{id}

POST /api/v1/transactions/analyze

GET  /health
```

These routes were verified against the **running server's OpenAPI specification**.

### Swagger

```text
http://127.0.0.1:8000/docs
```

### OpenAPI

```text
http://127.0.0.1:8000/openapi.json
```

---

# ❤️ Health Check

## Endpoint

```text
GET /api/v1/health
```

Test:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Response:

```json
{
  "status": "healthy",
  "service": "Fraud-Shield API"
}
```

---

# 📊 Analytics API

## Summary

```text
GET /api/v1/analytics/summary
```

The endpoint calculates persisted database metrics including:

```text
Total Transactions
Safe Transactions
Suspicious Transactions
Fraud Detected
Overall Risk Score
Average Fraud Probability
Fraud Percentage
High-Risk Transactions
Critical-Risk Transactions
Total Amount
Blocked Amount
```

## Detailed Analytics

```text
GET /api/v1/analytics
```

The endpoint provides additional dashboard data including:

```text
Risk Distribution
Transaction Activity
Fraud Trend
Volume by Transaction Type
Hourly Risk
Device Risk
Location Risk
Top Merchants
Model Statistics
```

---

# 📜 Transaction History

The backend provides:

```text
GET /api/v1/transactions
GET /api/v1/transactions/{id}
```

The list endpoint supports pagination.

Example:

```text
GET /api/v1/transactions?limit=5&page=1
```

The response contains:

* Transaction records
* Risk score
* Risk level
* Verdict
* Confidence
* Recommended action
* Creation timestamp
* Pagination information

---

# 🔐 Security

The backend includes:

* Argon2 password hashing through `pwdlib`
* JWT authentication using `PyJWT`
* Pydantic email validation
* Environment-based configuration
* Database credentials through environment variables
* SQLAlchemy database queries
* Foreign-key constraints
* `.env` exclusion through `.gitignore`

JWT configuration is maintained in:

```text
backend/app/core/config.py
```

Relevant settings include:

```text
SECRET_KEY
ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
```

> **Production requirement:** `SECRET_KEY` must be supplied through a secure environment variable. The development fallback value must not be used in production.

---

# 👤 User Model

The backend currently contains a database user model with:

```text
id
email
password_hash
first_name
last_name
role
created_at
```

The existing demo account has been migrated from a plaintext placeholder password value to an Argon2 password hash.

Example development credentials:

```text
Email:    demo@fraudshield.com
Password: Demo@123
Role:     user
```

> Development credentials should never be reused in production.

---

# 📦 Backend Dependencies

Backend dependencies are documented in:

```text
backend/requirements.txt
```

The backend requires packages for:

* FastAPI
* Uvicorn
* SQLAlchemy
* PostgreSQL connectivity
* Pydantic
* Pydantic Settings
* XGBoost
* SHAP
* Scikit-learn
* Joblib
* PyJWT
* pwdlib
* Argon2
* Email validation

The virtual environment remains local development infrastructure and should not be committed to Git.

---

# 🛠️ Tech Stack

| Layer               | Technology                          |
| ------------------- | ----------------------------------- |
| Frontend            | React.js                            |
| Build Tool          | Vite                                |
| Language            | JavaScript / JSX                    |
| Styling             | CSS / Tailwind CSS where applicable |
| Routing             | React Router                        |
| Charts              | Recharts                            |
| Backend             | Python                              |
| API Framework       | FastAPI                             |
| ORM                 | SQLAlchemy                          |
| Database            | PostgreSQL                          |
| Validation          | Pydantic                            |
| Configuration       | Pydantic Settings                   |
| Authentication      | JWT / PyJWT                         |
| Password Hashing    | pwdlib / Argon2                     |
| Machine Learning    | XGBoost                             |
| Explainable AI      | SHAP                                |
| ML Processing       | scikit-learn / Python               |
| Model Serialization | Pickle / Joblib artifacts           |
| ASGI Server         | Uvicorn                             |
| Database Migrations | Alembic                             |
| Version Control     | Git                                 |
| Collaboration       | GitHub                              |

---

# 📁 Project Structure

```text
Fraud-Shield/
│
├── backend/
│   │
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       └── router.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   │
│   │   ├── models/
│   │   │   ├── models.py
│   │   │   └── transaction.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── transaction.py
│   │   │   └── auth.py
│   │   │
│   │   ├── services/
│   │   │   ├── ml_service.py
│   │   │   └── rule_engine.py
│   │   │
│   │   ├── utils/
│   │   │   └── hybrid_scoring.py
│   │   │
│   │   ├── main.py
│   │   └── alembic.ini
│   │
│   ├── ml/
│   │   ├── feature_engineering.py
│   │   ├── model_loader.py
│   │   ├── predictor.py
│   │   ├── train_model.py
│   │   │
│   │   └── artifacts/
│   │       ├── feature_engineer.pkl
│   │       ├── model_metadata.json
│   │       ├── shap_explainer.pkl
│   │       └── xgboost_model.pkl
│   │
│   ├── requirements.txt
│   └── README.md
│
├── database/
│   ├── Audit_Logs.sql
│   ├── Explanations.sql
│   ├── fraud_result.sql
│   ├── modelversions.sql
│   ├── risk_indicators.sql
│   ├── Schema.sql
│   ├── Transaction_History.sql
│   ├── transactions.sql
│   └── README.md
│
├── docs/
│   └── README.md
│
├── explainable-ai/
│   └── README.md
│
├── frontend/
│   └── fraud-shield-react-frontend/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── data/
│       │   ├── App.jsx
│       │   ├── main.jsx
│       │   └── index.css
│       │
│       ├── index.html
│       ├── package.json
│       ├── package-lock.json
│       └── vite.config.ts
│
├── .gitignore
├── LICENSE
└── README.md
```

---

# 🔄 End-to-End System Flow

```text
User
 │
 ▼
React Frontend
 │
 │ Login / Transaction Data
 ▼
FastAPI Backend
 │
 ├─────────────────────┐
 ▼                     ▼
Authentication       Fraud Analysis
 │                     │
 ▼               ┌─────┴─────┐
JWT Token        ▼           ▼
               ML Engine   Rule Engine
                  │           │
                  ▼           ▼
               XGBoost    Business Rules
                  │           │
                  └─────┬─────┘
                        ▼
                 Hybrid Scoring
                        │
                        ▼
                 Fraud Evaluation
                    ┌───┴───┐
                    ▼       ▼
                  SHAP   PostgreSQL
               Explanation Storage
                    │       │
                    └───┬───┘
                        ▼
                  API Response
                        │
                        ▼
                 React Dashboard
```

---

# 🧪 Backend Testing & Verification

The backend has been tested locally using Python, FastAPI, Uvicorn, PostgreSQL and `curl`.

## 1. Authentication Schema Test

```bash
python3 - <<'PY'
from app.schemas.auth import LoginRequest, LoginResponse

print("Auth schemas: OK")
PY
```

Result:

```text
Auth schemas: OK
```

---

## 2. Authentication Compilation Test

```bash
python3 -m py_compile app/schemas/auth.py
```

Result:

```text
Successful compilation
```

---

## 3. Password Hash Verification

The demo user's password was migrated to an Argon2 hash and verified.

Correct password:

```text
True
```

Incorrect password:

```text
False
```

---

## 4. Valid Login Test

```text
POST /api/v1/auth/login
```

A valid login successfully returned:

```text
access_token
token_type
user_id
email
role
```

---

## 5. Invalid Login Test

An incorrect password was tested.

The backend correctly returned:

```http
401 Unauthorized
```

with:

```json
{
  "detail": "Invalid email or password"
}
```

---

## 6. Health Check Test

```bash
curl -s http://127.0.0.1:8000/api/v1/health
```

Result:

```json
{
  "status": "healthy",
  "service": "Fraud-Shield API"
}
```

---

## 7. Live OpenAPI Route Verification

The running backend was verified through:

```text
GET /openapi.json
```

Current routes:

```text
/api/v1/auth/login
/api/v1/health
/api/v1/analytics/summary
/api/v1/analytics
/api/v1/transactions/{id}
/api/v1/transactions
/api/v1/transactions/analyze
/health
```

---

## 8. Analytics API Test

The live backend successfully returned persisted analytics including:

```text
Total transactions
Overall risk score
Fraud percentage
High-risk transactions
Risk distribution
Transaction activity
Fraud trend
Volume by transaction type
Hourly risk
Device risk
Location risk
Top merchants
Model statistics
```

---

## 9. Transaction History Test

The transaction history endpoint was successfully tested:

```bash
curl "http://127.0.0.1:8000/api/v1/transactions?limit=5&page=1"
```

The API returned:

```text
items
total
page
page_size
total_pages
```

along with persisted transaction risk information.

---

## 10. Transaction Detail Test

The transaction detail endpoint was successfully tested:

```bash
curl http://127.0.0.1:8000/api/v1/transactions/15
```

The API returned transaction details including:

```text
Transaction ID
Amount
Currency
Transaction Type
Merchant Category
IP Address
Device Type
Risk Score
Risk Level
Verdict
Confidence
Recommended Action
Creation Timestamp
```

---

# 🔧 Running the Backend

Navigate to the backend:

```bash
cd backend
```

Activate the virtual environment:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
python -m uvicorn app.main:app --reload
```

The backend normally runs at:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

OpenAPI:

```text
http://127.0.0.1:8000/openapi.json
```

---

# ⚠️ Port Already in Use

If the following error appears:

```text
ERROR: [Errno 48] Address already in use
```

another process may already be running on port `8000`.

Check the existing backend:

```bash
curl http://127.0.0.1:8000/api/v1/health
```

If it returns:

```json
{
  "status": "healthy",
  "service": "Fraud-Shield API"
}
```

the backend is already running.

---

# 🔗 Frontend Integration Status

The backend APIs are ready for React integration.

Primary endpoints:

```text
POST /api/v1/auth/login
POST /api/v1/transactions/analyze
GET  /api/v1/analytics/summary
GET  /api/v1/analytics
GET  /api/v1/transactions
GET  /api/v1/transactions/{id}
```

### Current Integration Status

```text
Backend Authentication
        ↓
        ✅ Implemented

JWT Generation
        ↓
        ✅ Implemented

Password Hashing
        ↓
        ✅ Implemented

Real XGBoost Prediction
        ↓
        ✅ Implemented

SHAP Explainability
        ↓
        ✅ Implemented

Rule Engine
        ↓
        ✅ Implemented

Hybrid Risk Scoring
        ↓
        ✅ Implemented

Database Persistence
        ↓
        ✅ Implemented

React Login → Backend
        ↓
        ⏳ Pending integration

JWT Management in React
        ↓
        ⏳ Pending integration

React Transaction Form → Backend
        ↓
        ⏳ Pending integration

Replace Frontend Mock Prediction
        ↓
        ⏳ Pending integration

Fraud Result UI → Real API
        ↓
        ⏳ Pending integration

Dashboard → Real Analytics
        ↓
        ⏳ Pending integration

Transaction History → Real API
        ↓
        ⏳ Pending integration
```

> **Important:** "Replace frontend mock prediction" refers to the **React frontend's mock/demo data**, not the backend ML engine. The backend already performs real XGBoost inference.

---

# 👤 Profile & Settings

The application UI is intended to support:

* User information
* Profile management
* Password settings
* Notification settings
* Security settings
* Theme settings
* Logout

Backend login authentication is currently implemented.

Additional account-management APIs remain future work.

---

# 🎯 Business Value

Fraud-Shield is designed around a practical financial fraud-monitoring workflow rather than a simple binary ML classifier.

The platform can help organizations:

* Detect suspicious transactions
* Prioritize high-risk transactions
* Reduce unnecessary manual investigation
* Understand why transactions are flagged
* Combine ML predictions with business policies
* Provide explainable decisions to analysts
* Support automated approval/blocking decisions
* Persist fraud evaluations for historical analysis
* Monitor fraud trends through analytics
* Secure user access through authentication

The combination of:

```text
Machine Learning
+
Business Rules
+
Hybrid Scoring
+
Explainable AI
+
Database Persistence
+
Authentication
+
Analytics
```

provides the foundation for a practical fraud-detection platform.

---

# 📌 Current Status

## Completed

* [x] FastAPI backend
* [x] Health check API
* [x] Transaction analysis API
* [x] Transaction history endpoints
* [x] Transaction detail endpoint
* [x] Analytics summary API
* [x] Analytics API
* [x] Request validation
* [x] Real XGBoost fraud model inference
* [x] Feature engineering pipeline
* [x] Model artifact loading
* [x] SHAP explainability
* [x] Business rule engine
* [x] Hybrid risk scoring
* [x] Risk classification
* [x] Fraud/Safe verdict
* [x] Recommended actions
* [x] Risk factor explanations
* [x] Triggered rule explanations
* [x] Model version tracking
* [x] PostgreSQL/SQLAlchemy integration
* [x] Fraud evaluation persistence
* [x] Database-backed analytics
* [x] User model
* [x] Argon2 password hashing
* [x] JWT login authentication
* [x] Authentication request/response schemas
* [x] Invalid credential handling
* [x] Email validation
* [x] Backend dependency management
* [x] Local API testing
* [x] OpenAPI route verification
* [x] Live authentication verification
* [x] Live analytics verification
* [x] Live transaction history verification

## Pending Integration

* [ ] Connect React login form to `/api/v1/auth/login`
* [ ] Store/manage JWT token in the frontend
* [ ] Add authenticated frontend requests
* [ ] Connect React transaction form to `/api/v1/transactions/analyze`
* [ ] Connect Fraud Result UI with real API response
* [ ] Connect dashboard analytics UI to backend analytics APIs
* [ ] Connect transaction history UI to backend APIs

## Future Enhancements

* [ ] User registration API
* [ ] Refresh-token flow
* [ ] Role-based access control
* [ ] Password reset
* [ ] Production database migrations
* [ ] Automated backend test suite
* [ ] API error handling and structured logging
* [ ] Real-time transaction streaming
* [ ] Advanced anomaly detection
* [ ] Model retraining pipeline
* [ ] Continuous model monitoring
* [ ] Native XGBoost JSON/UBJSON model artifact migration
* [ ] Production deployment
* [ ] Cloud database integration
* [ ] Advanced fraud analytics
* [ ] Alert and notification system

---

# 🏁 Project Status

Fraud-Shield has progressed beyond a frontend prototype into a **functional fraud-detection backend platform** with:

* ✅ React frontend foundation
* ✅ FastAPI backend
* ✅ PostgreSQL database integration
* ✅ SQLAlchemy ORM
* ✅ Real XGBoost fraud detection
* ✅ SHAP-based Explainable AI
* ✅ Rule-based fraud detection
* ✅ Hybrid risk scoring
* ✅ Fraud evaluation persistence
* ✅ Feature-level risk explanations
* ✅ Transaction analysis API
* ✅ Transaction history APIs
* ✅ Analytics APIs
* ✅ JWT-based backend authentication
* ✅ Argon2 password hashing
* ✅ Authentication schemas
* ✅ Email validation
* ✅ Backend dependency management
* ✅ Live API testing
* ✅ OpenAPI verification

The **backend fraud-detection pipeline is implemented and functional**. The remaining major phase is **frontend-to-backend integration**, including JWT handling, real transaction analysis, dashboard analytics, transaction history, and replacing frontend mock/demo data with live API responses.

---
