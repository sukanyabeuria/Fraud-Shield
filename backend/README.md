# 🛡️ Fraud-Shield Backend

The backend of **Fraud-Shield** is a FastAPI-based fraud detection, authentication, analytics, and explainability engine designed to analyze financial transactions in real time.

It combines:

* Machine Learning-based fraud prediction
* Explainable AI using SHAP
* Business rule-based fraud detection
* Hybrid risk scoring
* JWT-based authentication
* Argon2 password hashing
* PostgreSQL/SQLAlchemy database integration
* Transaction persistence and history
* Analytics and dashboard APIs
* REST APIs for frontend communication

The backend is designed to provide not only a fraud/genuine decision but also **why a transaction was considered risky**, making the system more transparent and useful for financial decision-making.

---

# 📌 Current Implementation Status

The core fraud detection backend, explainable ML engine, authentication system, transaction persistence, and analytics APIs have been implemented and tested successfully.

## Currently Implemented

* FastAPI REST API
* API versioning through `/api/v1`
* Health check endpoint
* User authentication
* JWT access-token generation
* Argon2 password hashing
* Password verification
* Login validation
* Transaction analysis endpoint
* Transaction persistence
* Transaction history endpoint
* Individual transaction lookup
* Analytics summary endpoint
* Analytics endpoint
* XGBoost fraud detection model
* Feature engineering pipeline
* Model loading and prediction
* SHAP-based explainability
* Business rule engine
* Hybrid risk scoring
* Risk classification
* Fraud/Safe verdict generation
* Recommended action generation
* Risk factor explanations
* Triggered rule explanations
* Model version tracking
* Transaction analysis timestamp
* PostgreSQL database configuration
* SQLAlchemy database integration
* Pydantic request/response schemas
* Authentication request/response schemas
* Backend dependency specification through `requirements.txt`

---

# 🏗️ Backend Architecture

The backend follows a modular architecture separating API handling, authentication, business logic, machine learning, explainability, and database functionality.

```text
backend/
│
├── app/
│   │
│   ├── api/
│   │   └── v1/
│   │       └── router.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   └── database.py
│   │
│   ├── models/
│   │   ├── models.py
│   │   └── transaction.py
│   │
│   ├── schemas/
│   │   ├── auth.py
│   │   └── transaction.py
│   │
│   ├── services/
│   │   ├── ml_service.py
│   │   └── rule_engine.py
│   │
│   ├── utils/
│   │   └── hybrid_scoring.py
│   │
│   ├── alembic.ini
│   └── main.py
│
├── ml/
│   ├── feature_engineering.py
│   ├── model_loader.py
│   ├── predictor.py
│   ├── train_model.py
│   ├── __init__.py
│   │
│   └── artifacts/
│       ├── feature_engineer.pkl
│       ├── model_metadata.json
│       ├── shap_explainer.pkl
│       └── xgboost_model.pkl
│
├── requirements.txt
├── README.md
└── venv/
```

---

# ⚙️ Technology Stack

| Technology        | Purpose                           |
| ----------------- | --------------------------------- |
| Python            | Backend programming language      |
| FastAPI           | REST API framework                |
| Uvicorn           | ASGI server                       |
| Pydantic          | Request/response validation       |
| Pydantic Settings | Environment configuration         |
| SQLAlchemy        | Database ORM                      |
| PostgreSQL        | Relational database               |
| XGBoost           | Fraud classification model        |
| SHAP              | Explainable AI                    |
| Scikit-learn      | ML preprocessing and utilities    |
| NumPy             | Numerical processing              |
| Pandas            | Data processing                   |
| Joblib/Pickle     | Model artifact serialization      |
| JWT / PyJWT       | Authentication tokens             |
| pwdlib            | Password hashing                  |
| Argon2            | Secure password hashing algorithm |
| Alembic           | Database migrations               |

---

# 🚀 FastAPI Application

The main FastAPI application is defined in:

```text
app/main.py
```

The API uses the `/api/v1` prefix for versioned application endpoints.

## API Base URL

When running locally:

```text
http://127.0.0.1:8000
```

## Swagger Documentation

FastAPI automatically provides interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

## OpenAPI Specification

```text
http://127.0.0.1:8000/openapi.json
```

---

# 🛣️ Available API Routes

The currently exposed API routes are:

```text
POST /api/v1/auth/login

GET  /api/v1/health

GET  /api/v1/analytics/summary
GET  /api/v1/analytics

GET  /api/v1/transactions
GET  /api/v1/transactions/{id}

POST /api/v1/transactions/analyze
```

A root health endpoint is also available:

```text
GET /health
```

---

# 🔐 Authentication

Fraud-Shield now includes a backend authentication system.

Authentication is implemented using:

* JWT access tokens
* PyJWT
* Argon2 password hashing through `pwdlib`
* Pydantic email/password validation
* SQLAlchemy `User` model

Authentication-related schemas are defined in:

```text
app/schemas/auth.py
```

The user model is defined in:

```text
app/models/models.py
```

---

# 🔑 Login API

## Endpoint

```http
POST /api/v1/auth/login
```

The login endpoint validates the supplied email and password against the stored user credentials.

A successful login returns a JWT access token.

## Example Request

```json
{
  "email": "demo@fraudshield.com",
  "password": "Demo@123"
}
```

## Example Response

```json
{
  "access_token": "<JWT_ACCESS_TOKEN>",
  "token_type": "bearer",
  "user_id": 1,
  "email": "demo@fraudshield.com",
  "role": "user"
}
```

## Authentication Flow

```text
User
  ↓
POST /api/v1/auth/login
  ↓
Validate email
  ↓
Load User from database
  ↓
Verify Argon2 password hash
  ↓
Generate JWT
  ↓
Return access token
```

---

# 🔒 Password Security

Passwords are not stored as plain text.

The backend uses:

```text
pwdlib
    ↓
Argon2
    ↓
password_hash
```

Stored password hashes use the Argon2id format.

Example hash prefix:

```text
$argon2id$v=19$...
```

Password verification is performed against the stored hash rather than comparing plain-text passwords.

This provides a significantly safer authentication mechanism than storing passwords directly.

---

# 🎫 JWT Tokens

JWT tokens are generated using **PyJWT**.

The token contains authentication information such as:

```text
sub
email
role
```

JWT configuration is maintained through:

```text
app/core/config.py
```

Relevant settings include:

```text
SECRET_KEY
ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
```

The production `SECRET_KEY` should always be supplied through environment variables.

Never commit a real production secret key to GitHub.

---

# ❤️ Health Check API

## Endpoint

```http
GET /api/v1/health
```

### Purpose

Used to verify whether the Fraud-Shield backend service is running correctly.

### Example

```bash
curl http://127.0.0.1:8000/api/v1/health
```

### Response

```json
{
  "status": "healthy",
  "service": "Fraud-Shield API"
}
```

---

# 🔍 Transaction Analysis API

## Endpoint

```http
POST /api/v1/transactions/analyze
```

This is the primary fraud detection endpoint.

It analyzes a transaction using:

1. Machine Learning
2. Business Rules
3. SHAP Explainability
4. Hybrid Risk Scoring

The API returns an explainable fraud decision and persists the transaction/evaluation data in the database.

---

# 📥 Transaction Request

The endpoint accepts transaction information including:

| Field                  | Type    | Description                            |
| ---------------------- | ------- | -------------------------------------- |
| transaction_id         | string  | Unique transaction identifier          |
| amount                 | number  | Transaction amount                     |
| currency               | string  | Transaction currency                   |
| transaction_type       | string  | Type of transaction                    |
| merchant_category      | string  | Merchant/business category             |
| merchant_name          | string  | Merchant name                          |
| location               | string  | Transaction location                   |
| ip_address             | string  | IP address associated with transaction |
| device_type            | string  | Device used for transaction            |
| international_transfer | boolean | Whether transaction is international   |
| new_recipient          | boolean | Whether recipient is new               |
| transaction_frequency  | integer | Transaction frequency                  |
| new_device             | boolean | Whether device is newly detected       |
| merchant_id            | integer | Merchant identifier when available     |

### Example Request

```json
{
  "transaction_id": "TEST-001",
  "amount": 45000,
  "currency": "INR",
  "transaction_type": "Online Purchase",
  "merchant_category": "Electronics",
  "location": "Mumbai",
  "ip_address": "192.168.1.1",
  "device_type": "Mobile App",
  "international_transfer": true,
  "new_recipient": true,
  "transaction_frequency": 1,
  "new_device": true
}
```

---

# 📋 Transaction History API

## Endpoint

```http
GET /api/v1/transactions
```

This endpoint retrieves persisted transaction records from the database.

It can be used by the frontend for:

* Transaction history
* Fraud monitoring
* Analyst dashboards
* Reviewing previously evaluated transactions

---

# 🔎 Transaction Detail API

## Endpoint

```http
GET /api/v1/transactions/{id}
```

Returns the details of an individual persisted transaction.

The endpoint can be used to display a detailed fraud evaluation and transaction information.

---

# 📊 Analytics APIs

Fraud-Shield exposes analytics endpoints for dashboard KPI and fraud monitoring functionality.

## Analytics Summary

```http
GET /api/v1/analytics/summary
```

The summary endpoint calculates persisted transaction statistics such as:

* Total transactions
* Fraud/blocked transactions
* Suspicious transactions
* Safe transactions
* Average risk score
* Average confidence/probability
* Total transaction amount
* High-risk transaction count
* Critical transaction count

These values are calculated from the database rather than hardcoded dashboard values.

## Analytics

```http
GET /api/v1/analytics
```

Provides additional persisted transaction analytics for dashboard and frontend consumption.

---

# 🤖 Machine Learning Engine

The ML engine is located inside:

```text
backend/ml/
```

The system uses an **XGBoost-based classification model** for fraud prediction.

### Main ML Components

### `feature_engineering.py`

Responsible for transforming transaction data into the feature representation required by the trained model.

### `model_loader.py`

Loads the trained model and supporting artifacts.

### `predictor.py`

Uses the loaded model to generate the fraud prediction and probability.

### `train_model.py`

Contains the model training pipeline used to train the fraud detection model.

---

# 🧠 Model Artifacts

The trained ML artifacts are stored in:

```text
backend/ml/artifacts/
```

### `xgboost_model.pkl`

Trained XGBoost fraud classification model.

### `feature_engineer.pkl`

Serialized feature engineering/preprocessing component used to ensure inference uses the same transformation pipeline as training.

### `shap_explainer.pkl`

Serialized SHAP explainer used to generate feature-level explanations.

### `model_metadata.json`

Stores metadata associated with the fraud detection model.

---

# 🔎 Explainable AI — SHAP

Fraud detection should not only answer:

> "Is this transaction fraudulent?"

It should also answer:

> "Why was this transaction considered risky?"

Fraud-Shield uses **SHAP (SHapley Additive exPlanations)** to provide feature-level explanations.

For example, a prediction can identify factors such as:

```text
is_international
is_new_recipient
previous_amount
is_new_device
amount
```

Each factor receives an impact value and direction.

Example:

```json
{
  "feature": "is_international",
  "impact": 2.895,
  "direction": "increases_risk",
  "explanation": "Cross-border transaction carries elevated risk. This increases the risk of fraud."
}
```

This allows users and analysts to understand the major contributors to a fraud prediction.

---

# 🚨 Business Rule Engine

Machine learning predictions are combined with deterministic business rules.

The rule engine is implemented in:

```text
app/services/rule_engine.py
```

Rules can identify transaction conditions that are considered suspicious from a business perspective.

Examples include:

### NEW_RECIPIENT

Triggered when a transaction is sent to a newly added recipient.

Example impact:

```text
+18
```

### INTERNATIONAL_TRANSFER

Triggered for suspicious cross-border transactions.

Example impact:

```text
+15
```

### NEW_DEVICE

Triggered when the transaction originates from an unrecognized device.

Example impact:

```text
+10
```

### HIGH_FREQUENCY

Triggered when transaction frequency exceeds the defined threshold.

Example:

```text
Transaction frequency = 10
Threshold = 8
```

---

# ⚖️ Hybrid Risk Scoring

Fraud-Shield does not depend solely on the ML model.

The system combines:

```text
Machine Learning Risk
        +
Business Rule Risk
        ↓
Hybrid Risk Score
```

The hybrid scoring logic is implemented in:

```text
app/utils/hybrid_scoring.py
```

Configured weights currently include:

```text
ML Weight   = 0.70
Rule Weight = 0.30
```

This provides a more practical fraud detection approach because:

* ML identifies complex patterns
* Business rules capture known risk conditions
* SHAP explains ML-driven risk factors
* Hybrid scoring combines the signals into a final decision

---

# 📊 Risk Classification

The calculated risk score is converted into a risk level.

The system supports levels such as:

```text
Low
Medium
High
Critical
```

The final verdict can be:

```text
Safe
Fraud
```

The system also generates a recommended action based on the final risk.

Examples:

```text
Approve transaction
Review transaction
Block transaction and initiate manual review
```

Risk thresholds are configured in:

```text
app/core/config.py
```

Current thresholds include:

```text
LOW_RISK_THRESHOLD      = 40
HIGH_RISK_THRESHOLD     = 70
CRITICAL_RISK_THRESHOLD = 90
```

---

# 🧾 API Response

A successful transaction analysis returns information such as:

```json
{
  "transaction_id": "TEST-001",
  "risk_score": 83,
  "risk_level": "Critical",
  "verdict": "Fraud",
  "confidence": 0.9964,
  "recommended_action": "Block transaction and initiate manual review",
  "risk_factors": [
    {
      "feature": "is_international",
      "impact": 2.895,
      "direction": "increases_risk",
      "explanation": "Cross-border transaction carries elevated risk."
    }
  ],
  "triggered_rules": [
    {
      "rule": "NEW_RECIPIENT",
      "impact": 18,
      "reason": "Transaction sent to a newly added recipient"
    }
  ],
  "model_version": "fraud-shield-xgboost-v1.0",
  "evaluated_at": "2026-08-15T17:17:10"
}
```

---

# 🗄️ Database Integration

The backend is configured to work with PostgreSQL.

Database functionality is handled using:

```text
SQLAlchemy
```

The database layer is located in:

```text
app/core/database.py
```

Database models are located in:

```text
app/models/
```

The main database models include:

* `User`
* `Transaction`
* `FraudEvaluation`
* `FeatureAttribution`

The `User` model stores authentication-related information including:

```text
email
password_hash
first_name
last_name
role
created_at
```

The `Transaction` model stores evaluated transaction and fraud-risk information.

Alembic configuration is available for database migration management.

---

# 📦 Backend Dependencies

Backend dependencies are now explicitly tracked in:

```text
backend/requirements.txt
```

The dependency list includes the packages required for:

* FastAPI
* Uvicorn
* SQLAlchemy
* Pydantic
* Pydantic Settings
* PostgreSQL connectivity
* XGBoost
* SHAP
* Scikit-learn
* Pandas
* NumPy
* Joblib
* PyJWT
* pwdlib
* Argon2
* email validation
* Python dotenv

After cloning the repository, dependencies can be installed using:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

# 🔐 Environment Configuration

Sensitive configuration should be stored in environment variables rather than hardcoded in source code.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/fraud_shield
SECRET_KEY=your-production-secret-key
APP_ENV=development
```

The backend configuration is maintained in:

```text
app/core/config.py
```

Important configuration values include:

```text
APP_NAME
APP_ENV
SECRET_KEY
ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
DATABASE_URL
USE_SQLITE_FALLBACK
MODEL_PATH
SHAP_EXPLAINER_PATH
MODEL_VERSION
ML_WEIGHT
RULE_WEIGHT
LOW_RISK_THRESHOLD
HIGH_RISK_THRESHOLD
CRITICAL_RISK_THRESHOLD
```

## Security Warning

Do not commit:

* Production secret keys
* Database passwords
* API keys
* Personal credentials
* Real user passwords

to GitHub.

---

# 🧪 Backend Testing

The backend has been tested locally using Python imports, compilation checks, FastAPI/OpenAPI inspection, database verification, and `curl`.

## 1. Authentication Package Test

The following packages were successfully installed and imported:

```text
pwdlib
PyJWT
argon2-cffi
email-validator
```

Import verification succeeded.

---

## 2. Authentication Schema Test

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

The authentication schema was also successfully compiled using:

```bash
python3 -m py_compile app/schemas/auth.py
```

---

## 3. Password Hash Verification

The demo user's password was converted from the previous placeholder value to an Argon2 password hash.

Password verification was tested with:

```text
Correct password: True
Wrong password: False
```

This confirms that password hashing and verification are functioning correctly.

---

## 4. Login API Test

Successful login was tested using:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@fraudshield.com",
    "password": "Demo@123"
  }'
```

The endpoint successfully returned:

```json
{
  "access_token": "<JWT_ACCESS_TOKEN>",
  "token_type": "bearer",
  "user_id": 1,
  "email": "demo@fraudshield.com",
  "role": "user"
}
```

---

## 5. Invalid Login Test

Invalid credentials were also tested.

Example:

```text
WrongPassword
```

The API correctly returned:

```text
HTTP 401 Unauthorized
```

with:

```json
{
  "detail": "Invalid email or password"
}
```

---

## 6. API Route Verification

The live OpenAPI specification was checked using:

```bash
curl -s http://127.0.0.1:8000/openapi.json
```

The following routes were confirmed:

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

## 7. Health Check Test

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

## 8. API Documentation Test

```text
http://127.0.0.1:8000/docs
```

Swagger UI successfully loads.

---

## 9. OpenAPI Test

```text
http://127.0.0.1:8000/openapi.json
```

The live API schema exposes authentication, analytics, transaction, and health routes.

---

# ⚠️ XGBoost Serialization Warning

When loading the existing serialized XGBoost model, the current environment may display a warning indicating that the model was serialized using an older XGBoost version.

This warning does not currently prevent the backend from loading the model or serving the API.

For long-term production compatibility, the model artifact should eventually be exported using a compatible XGBoost model format/version.

---

# ▶️ Running the Backend

Navigate to the backend directory:

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

The backend will normally run at:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

---

# ⚠️ Port Already in Use

If the following error appears:

```text
ERROR: [Errno 48] Address already in use
```

it means another process is already using port `8000`.

This does not necessarily mean the backend is broken.

Verify whether the existing server is running:

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

# 🔗 Frontend Integration

The backend is ready to be consumed by the React frontend.

The main fraud-analysis integration point is:

```text
POST /api/v1/transactions/analyze
```

The authentication integration point is:

```text
POST /api/v1/auth/login
```

The intended frontend flow is:

```text
User
  ↓
React Login
  ↓
POST /api/v1/auth/login
  ↓
JWT Access Token
  ↓
Authenticated React Application
  ↓
Transaction Check
  ↓
POST /api/v1/transactions/analyze
  ↓
ML Prediction
  ↓
Business Rule Evaluation
  ↓
SHAP Explanation
  ↓
Hybrid Risk Score
  ↓
FraudCheckResponse
  ↓
Fraud Result UI
```

Additional frontend data can be retrieved through:

```text
GET /api/v1/transactions
GET /api/v1/transactions/{id}
GET /api/v1/analytics
GET /api/v1/analytics/summary
```

The actual React-to-backend integration remains a separate next step.

---

# 🧩 Design Approach

Fraud-Shield follows a hybrid fraud detection approach.

## Machine Learning

Useful for identifying:

* Complex fraud patterns
* Non-linear relationships
* Historical transaction patterns
* Multiple interacting risk factors

## Business Rules

Useful for:

* Known fraud scenarios
* Explicit business policies
* Immediate risk conditions
* Controllable fraud thresholds

## Explainable AI

Useful for:

* Understanding model decisions
* Identifying major risk factors
* Supporting manual review
* Improving transparency and trust

## Hybrid Scoring

Combines ML and business signals into a practical final risk assessment.

## Authentication

Provides:

* Secure password hashing
* Login validation
* JWT-based session authentication
* User role information

## Analytics

Provides:

* Dashboard KPIs
* Fraud counts
* Risk statistics
* Transaction totals
* High/critical risk counts

---

# 🎯 Business Value

The backend is designed around a real-world financial fraud detection workflow rather than simply producing a binary ML prediction.

The system helps financial organizations:

* Detect suspicious transactions
* Prioritize high-risk transactions
* Reduce unnecessary manual investigation
* Understand why transactions are flagged
* Apply business-specific fraud rules
* Provide explainable decisions to analysts
* Support automated approval or blocking decisions
* Authenticate users securely
* Monitor fraud trends through analytics
* Persist transaction evaluation history

The combination of **ML + business rules + explainability + authentication + analytics** makes the backend suitable for practical fraud monitoring.

---

# 📌 Current Status

## Completed

* [x] FastAPI backend
* [x] API versioning
* [x] Health check API
* [x] Transaction analysis API
* [x] Transaction persistence
* [x] Transaction history API
* [x] Individual transaction API
* [x] Analytics API
* [x] Analytics summary API
* [x] Request validation
* [x] XGBoost fraud model
* [x] Feature engineering
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
* [x] User database model
* [x] JWT authentication
* [x] Login endpoint
* [x] Argon2 password hashing
* [x] Password verification
* [x] Authentication schemas
* [x] Backend dependency file
* [x] Local API testing
* [x] Authentication testing
* [x] OpenAPI route verification

## Next Steps

* [ ] Connect existing React frontend to authentication API
* [ ] Store and manage JWT token in the frontend
* [ ] Connect React transaction form to `/api/v1/transactions/analyze`
* [ ] Replace frontend mock prediction logic
* [ ] Connect Fraud Result UI with real API response
* [ ] Connect transaction history UI with `/api/v1/transactions`
* [ ] Connect dashboard analytics UI with `/api/v1/analytics`
* [ ] Add authorization middleware/dependencies to protected endpoints
* [ ] Add role-based authorization where required
* [ ] Add production database migrations
* [ ] Add automated backend tests
* [ ] Add API error handling and logging
* [ ] Resolve long-term XGBoost model serialization compatibility
* [ ] Deploy backend and database
* [ ] Complete production frontend/backend integration

---

# 🛡️ Fraud-Shield

**AI-powered financial fraud detection with secure authentication and explainable decisions.**

The goal is not only to detect fraud, but to provide a clear and understandable explanation of **why a transaction was considered risky**, while providing secure authentication, persistent transaction records, and analytics for the application dashboard.

