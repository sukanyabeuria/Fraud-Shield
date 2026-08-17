# 🛡️ Fraud-Shield

A full-stack **AI-powered financial fraud detection and explainability platform** designed to identify suspicious transactions in real time and explain the key factors behind each fraud decision.

> **Current Stage:** Backend API + Authentication + Fraud Detection + Database Integration — Frontend-to-backend integration pending

---

# 📌 About the Project

**Fraud-Shield** is designed to detect potentially fraudulent financial transactions using a combination of:

* Machine Learning
* Explainable AI (XAI)
* Rule-based fraud detection
* Hybrid risk scoring
* REST APIs
* PostgreSQL database
* JWT-based authentication
* Interactive monitoring dashboard

The system evaluates transaction characteristics such as transaction amount, international transfer status, recipient history, device information and transaction patterns to generate a fraud risk assessment.

The platform not only predicts whether a transaction is fraudulent but also provides **explanations for the prediction**, helping users and analysts understand why a transaction was considered risky.

---

# 🚀 Key Features

## 🔐 Authentication

Backend authentication has now been implemented using:

* Login API
* Email and password validation
* Password hashing
* JWT access-token generation
* User lookup through the database
* Invalid credential handling
* Auth request/response schemas
* User ID, email and role included in the JWT/login response

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

Authentication request and response models are defined in:

```text
backend/app/schemas/auth.py
```

The backend uses:

* `pwdlib` for password hashing
* `PyJWT` for JWT token generation
* `pydantic` / `EmailStr` for request validation

> **Frontend authentication integration is not yet completed.** The React frontend still needs to call the authentication API and manage the returned JWT token.

---

# 📊 Fraud Detection Dashboard

The dashboard is designed to provide an overview of transaction activity and fraud risk.

Features include:

* Total transactions
* Safe transactions
* Suspicious transactions
* Fraud detected
* Overall risk score
* Recent transactions
* Fraud statistics
* Risk distribution
* Transaction activity
* High-risk transaction monitoring

The backend now provides analytics APIs to support dashboard data.

### Analytics Endpoints

```text
GET /api/v1/analytics/summary
GET /api/v1/analytics
```

The analytics layer uses persisted transaction data to calculate metrics such as:

* Total transactions
* Fraud/blocked transactions
* Suspicious transactions
* Safe transactions
* Average risk score
* Average prediction confidence
* Total transaction amount
* High-risk transaction count
* Critical-risk transaction count

---

# 💳 Real-Time Transaction Analysis

Users can submit transaction information for fraud evaluation.

### Transaction Inputs

* Transaction ID
* Transaction amount
* Currency
* Transaction type
* Merchant category
* Location
* IP address
* Device type
* International transfer status
* New recipient status
* Transaction frequency
* New device status

The backend processes the transaction using the trained ML model and deterministic fraud rules and generates:

* Risk score
* Risk level
* Fraud/Genuine verdict
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

### Example Result

```text
Risk Score: 83
Risk Level: Critical
Verdict: Fraud
Confidence: 99.63%

Recommended Action:
Block transaction and initiate manual review
```

---

# 🤖 Machine Learning Fraud Detection

Fraud-Shield uses an **XGBoost-based machine learning model** for transaction risk prediction.

The ML pipeline contains:

* Feature engineering
* Feature transformation
* XGBoost model
* Model loading and prediction
* Model metadata
* Fraud probability estimation

### ML Components

```text
backend/ml/
│
├── feature_engineering.py
├── model_loader.py
├── predictor.py
├── train_model.py
│
└── artifacts/
    ├── xgboost_model.pkl
    ├── feature_engineer.pkl
    ├── shap_explainer.pkl
    └── model_metadata.json
```

The trained model produces a fraud probability that is combined with rule-based signals through the hybrid scoring layer to generate the final risk assessment.

The API's ML service delegates prediction to the trained `FraudPredictor`, which loads the configured XGBoost model and supporting artifacts rather than using hard-coded prediction responses.

---

# 🔍 Explainable AI (XAI)

Fraud-Shield uses **SHAP (SHapley Additive exPlanations)** to explain individual fraud predictions.

Instead of only displaying:

> "Transaction is fraudulent"

the system identifies the features that contributed to the prediction.

### Example Risk Factors

```text
is_international     → increases risk
is_new_recipient     → increases risk
previous_amount      → increases risk
is_new_device        → increases risk
amount               → increases risk
```

Each explanation contains:

* Feature name
* Feature impact
* Risk direction
* Human-readable explanation

This makes the ML prediction more transparent and easier for fraud analysts to understand.

---

# ⚙️ Hybrid Fraud Detection Engine

Fraud-Shield combines **Machine Learning and deterministic fraud rules**.

```text
Transaction
     │
     ▼
Feature Engineering
     │
     ├───────────────┐
     ▼               ▼
XGBoost Model    Rule Engine
     │               │
     │               ├── NEW_RECIPIENT
     │               ├── INTERNATIONAL_TRANSFER
     │               ├── NEW_DEVICE
     │               └── HIGH_FREQUENCY
     │
     └───────┬───────┘
             ▼
      Hybrid Risk Scoring
             │
             ▼
      Final Fraud Decision
             │
             ▼
      SHAP Explanation
             │
             ▼
        API Response
```

The hybrid approach allows the system to combine **learned fraud patterns** with **business-defined fraud rules**.

---

# 🧠 Explainability Output

For every evaluated transaction, Fraud-Shield can store and return feature-level explanations.

Example:

```json
{
  "feature": "is_new_recipient",
  "impact": 2.02,
  "direction": "increases_risk",
  "explanation": "Recipient has not been previously used. This increases the risk of fraud."
}
```

This provides transparency into the decision-making process of the fraud detection system.

---

# 🔌 Backend API

Fraud-Shield uses a **FastAPI-based REST backend**.

## Current API Routes

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

The API is documented automatically through FastAPI.

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

Example:

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

The backend now exposes persisted transaction analytics.

## Summary

```text
GET /api/v1/analytics/summary
```

The summary endpoint calculates dashboard-level KPIs from stored transactions.

Metrics include:

```text
Total Transactions
Fraud Transactions
Suspicious Transactions
Safe Transactions
Average Risk Score
Average Confidence
Total Transaction Amount
High-Risk Transactions
Critical-Risk Transactions
```

This provides the backend foundation required for connecting the React dashboard to real database-backed analytics.

---

# 🗄️ Database

Fraud-Shield uses **PostgreSQL** for persistent storage of fraud-related information.

The backend uses **SQLAlchemy ORM** for database interaction.

### Stored Information

* User accounts
* Transaction details
* Fraud evaluations
* Risk scores
* Risk levels
* Fraud verdicts
* Feature attributions
* Triggered rules
* Model version information
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

Foreign keys and relationships are used to maintain data consistency between entities.

---

# 💾 Database Persistence

Fraud evaluation results are persisted after transaction analysis.

For example:

```text
Transaction
TXN-DB-001
        │
        ├── Risk Score: 83
        ├── Risk Level: Critical
        └── Verdict: Fraud
                │
                └── Feature Attributions
                     ├── is_international
                     ├── is_new_recipient
                     ├── previous_amount
                     ├── is_new_device
                     └── amount
```

This allows historical fraud analysis and dashboard analytics.

---

# 🛡️ Security

The backend now includes basic authentication and security mechanisms:

* Password hashing using `pwdlib`
* JWT authentication using `PyJWT`
* Email validation using Pydantic `EmailStr`
* Environment-based configuration
* Database credentials through environment variables
* Parameterized database queries
* Foreign key constraints
* Sensitive information excluded from source control
* `.env` files excluded through `.gitignore`

### JWT Configuration

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

For production deployment, `SECRET_KEY` must be replaced with a secure environment variable.

---

# 📊 Fraud Result

The Fraud Result interface is designed to display the complete evaluation of a transaction.

It includes:

* Fraud / Genuine verdict
* Risk score
* Risk level
* Prediction confidence
* Risk indicators
* Triggered rules
* Transaction summary
* Explainable AI factors
* Recommended action

---

# 📜 Transaction History

The backend provides transaction history endpoints:

```text
GET /api/v1/transactions
GET /api/v1/transactions/{id}
```

These endpoints support retrieving previously evaluated transactions and their associated fraud evaluation information.

---

# 📈 Risk Analytics

The analytics dashboard is supported by backend APIs that calculate:

* Fraud percentage
* Average risk score
* High-risk transactions
* Critical-risk transactions
* Transaction volume
* Fraud vs Genuine analysis
* Average prediction confidence
* Total transaction amount

The React frontend can consume these APIs during the integration phase.

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

Backend authentication is currently implemented for login. Full frontend token management and additional account-management APIs remain future integration work.

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
| ML Processing       | Python / scikit-learn               |
| Model Serialization | Joblib / Pickle                     |
| ASGI Server         | Uvicorn                             |
| Database Migrations | Alembic                             |
| Version Control     | Git                                 |
| Collaboration       | GitHub                              |

---

# 📦 Backend Dependencies

Backend Python dependencies are documented in:

```text
backend/requirements.txt
```

This includes the packages required for:

* FastAPI
* Uvicorn
* SQLAlchemy
* Pydantic
* Pydantic Settings
* PostgreSQL connectivity
* XGBoost
* SHAP
* Scikit-learn
* Joblib
* JWT authentication
* Password hashing
* Email validation
* Environment configuration

The virtual environment itself is local development infrastructure and should not be committed to Git.

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

The backend has been tested locally using FastAPI, Python and `curl`.

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

## 3. Login API Test

A valid login was tested:

```text
POST /api/v1/auth/login
```

The API successfully returned:

```text
access_token
token_type
user_id
email
role
```

---

## 4. Invalid Login Test

An incorrect password was tested.

The API correctly returned:

```http
401 Unauthorized
```

---

## 5. Health Check Test

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

## 6. OpenAPI Route Verification

The running backend currently exposes:

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

The routes were verified through:

```text
GET /openapi.json
```

---

## 7. High-Risk Transaction Test

A transaction with:

* High amount
* International transfer
* New recipient
* New device

was tested.

Example result:

```text
Risk Score: 83
Risk Level: Critical
Verdict: Fraud
Confidence: 0.9964
```

Triggered rules included:

```text
NEW_RECIPIENT
INTERNATIONAL_TRANSFER
NEW_DEVICE
```

SHAP also identified major risk-contributing features.

---

## 8. Low-Risk Transaction Test

A normal transaction was also tested.

Example result:

```text
Risk Score: 5
Risk Level: Low
Verdict: Safe
Confidence: 0.0234
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

The backend will normally run at:

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

another process may already be using port `8000`.

Verify the existing server:

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

The backend API is ready to be consumed by the React frontend.

The primary fraud-analysis integration point is:

```text
POST /api/v1/transactions/analyze
```

Authentication integration point:

```text
POST /api/v1/auth/login
```

### Current Status

```text
Backend Authentication
        ↓
        ✅ Implemented

JWT Generation
        ↓
        ✅ Implemented

React Login → Backend
        ↓
        ⏳ Pending integration

JWT Storage in React
        ↓
        ⏳ Pending integration

React Transaction Form → Backend
        ↓
        ⏳ Pending integration

Real Fraud Result UI
        ↓
        ⏳ Pending integration

Dashboard Analytics → Backend
        ↓
        ⏳ Pending integration

Transaction History → Backend
        ↓
        ⏳ Pending integration
```

The frontend integration work focuses on connecting the existing React UI to the completed backend APIs.

---

# 🧩 Design Approach

Fraud-Shield follows a hybrid fraud detection approach.

### Machine Learning

Useful for identifying:

* Complex fraud patterns
* Non-linear relationships
* Historical transaction patterns
* Multiple interacting risk factors

### Business Rules

Useful for:

* Known fraud scenarios
* Explicit business policies
* Immediate risk conditions
* Controllable fraud thresholds

### Explainable AI

Useful for:

* Understanding model decisions
* Identifying major risk factors
* Supporting manual review
* Improving transparency and trust

### Authentication

Provides:

* Secure login
* Password hashing
* JWT-based session authentication
* User identity and role information

### Hybrid Scoring

Combines ML and business signals into a practical final risk assessment.

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
* Secure access through authenticated user accounts
* Provide analytics from persisted transaction data

The combination of **ML + business rules + explainability + authentication + persistent analytics** makes the system more suitable for practical fraud monitoring.

---

# 📌 Current Status

## Completed

* [x] FastAPI backend
* [x] Health check API
* [x] Transaction analysis API
* [x] Transaction history endpoints
* [x] Analytics summary API
* [x] Analytics API
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
* [x] Fraud evaluation persistence
* [x] Database-backed analytics
* [x] User model
* [x] Password hashing
* [x] JWT login authentication
* [x] Authentication request/response schemas
* [x] Invalid credential handling
* [x] Backend dependency requirements file
* [x] Local API testing
* [x] OpenAPI route verification
* [x] Trained ML model integration through `FraudPredictor`

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
* [ ] Automated backend tests
* [ ] API error handling and structured logging
* [ ] Real-time transaction streaming
* [ ] Advanced anomaly detection
* [ ] Model retraining pipeline
* [ ] Continuous model monitoring
* [ ] Production deployment
* [ ] Cloud database integration
* [ ] Advanced fraud analytics
* [ ] Alert and notification system

---

# 🏁 Project Status

Fraud-Shield has progressed from a frontend prototype into a functional fraud-detection backend platform with:

* ✅ React frontend foundation
* ✅ FastAPI backend
* ✅ PostgreSQL database integration
* ✅ SQLAlchemy ORM
* ✅ XGBoost fraud detection
* ✅ SHAP-based Explainable AI
* ✅ Rule-based fraud detection
* ✅ Hybrid risk scoring
* ✅ Fraud evaluation persistence
* ✅ Feature-level risk explanations
* ✅ Transaction analysis API
* ✅ Transaction history APIs
* ✅ Analytics APIs
* ✅ JWT-based backend authentication
* ✅ Password hashing
* ✅ Authentication schemas
* ✅ Backend dependency management
* ✅ Local API and authentication testing
* ✅ Trained ML model integration

The backend is currently ready for the next phase: **frontend-to-backend integration**, including JWT handling, real transaction analysis, dashboard analytics, and transaction history integration.

