# 🛡️ Fraud-Shield Backend

The backend of **Fraud-Shield** is a FastAPI-based fraud detection and explainability engine designed to analyze financial transactions in real time.

It combines:

* Machine Learning-based fraud prediction
* Explainable AI using SHAP
* Business rule-based fraud detection
* Hybrid risk scoring
* PostgreSQL database integration
* REST APIs for frontend communication

The backend is designed to provide not only a fraud/genuine decision but also **why a transaction was considered risky**, making the system more transparent and useful for financial decision-making.

---

## 📌 Current Implementation Status

The core fraud detection backend and explainable ML engine have been implemented and tested successfully.

### Currently Implemented

* FastAPI REST API
* Transaction analysis endpoint
* Health check endpoint
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

### Frontend Integration

The backend API is ready to be consumed by the React frontend.

The existing frontend currently contains mock prediction logic. The next integration step is to replace the mock prediction flow with the real backend API:

```text
React Frontend
      ↓
POST /api/v1/transactions/analyze
      ↓
FastAPI Backend
      ↓
ML Prediction + Business Rules
      ↓
SHAP Explainability
      ↓
Hybrid Risk Scoring
      ↓
FraudCheckResponse
      ↓
React Fraud Result UI
```

---

# 🏗️ Backend Architecture

The backend follows a modular architecture separating API handling, business logic, machine learning, explainability, and database functionality.

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
├── README.md
└── venv/
```

---

# ⚙️ Technology Stack

| Technology    | Purpose                        |
| ------------- | ------------------------------ |
| Python        | Backend programming language   |
| FastAPI       | REST API framework             |
| Uvicorn       | ASGI server                    |
| Pydantic      | Request/response validation    |
| SQLAlchemy    | Database ORM                   |
| PostgreSQL    | Relational database            |
| XGBoost       | Fraud classification model     |
| SHAP          | Explainable AI                 |
| Scikit-learn  | ML preprocessing and utilities |
| Joblib/Pickle | Model artifact serialization   |
| Alembic       | Database migrations            |

---

# 🚀 FastAPI Application

The main FastAPI application is defined in:

```text
app/main.py
```

The application provides API routes for health monitoring and transaction analysis.

### API Base URL

When running locally:

```text
http://127.0.0.1:8000
```

### Swagger Documentation

FastAPI automatically provides interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

The OpenAPI specification is available at:

```text
http://127.0.0.1:8000/openapi.json
```

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

The API returns an explainable fraud decision.

---

# 📥 Transaction Request

The endpoint accepts the following transaction information:

| Field                  | Type    | Description                            |
| ---------------------- | ------- | -------------------------------------- |
| transaction_id         | string  | Unique transaction identifier          |
| amount                 | number  | Transaction amount                     |
| currency               | string  | Transaction currency                   |
| transaction_type       | string  | Type of transaction                    |
| merchant_category      | string  | Merchant/business category             |
| location               | string  | Transaction location                   |
| ip_address             | string  | IP address associated with transaction |
| device_type            | string  | Device used for transaction            |
| international_transfer | boolean | Whether transaction is international   |
| new_recipient          | boolean | Whether recipient is new               |
| transaction_frequency  | integer | Transaction frequency                  |
| is_new_device          | boolean | Whether device is newly detected       |

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
  "is_new_device": true
}
```

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

Examples of implemented rules include:

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

This provides a more practical fraud detection approach because:

* ML identifies complex patterns
* Business rules capture known risk conditions
* SHAP explains ML-driven risk factors
* Hybrid scoring combines the signals into a final decision

---

# 📊 Risk Classification

The calculated risk score is converted into a risk level.

The API response can contain levels such as:

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

# 🧪 Backend Testing

The backend has been tested locally using the FastAPI server and `curl`.

## 1. Package Import Test

The following core packages were successfully imported:

```bash
python -c "import fastapi, uvicorn, sqlalchemy, xgboost, shap; print('All core packages imported successfully')"
```

Result:

```text
All core packages imported successfully
```

---

## 2. API Documentation Test

```bash
curl http://127.0.0.1:8000/docs
```

Swagger UI successfully returned.

---

## 3. OpenAPI Test

```bash
curl http://127.0.0.1:8000/openapi.json
```

The API schema successfully exposed:

```text
/api/v1/health
/api/v1/transactions/analyze
```

---

## 4. Health Check Test

```bash
curl http://127.0.0.1:8000/api/v1/health
```

Result:

```json
{
  "status": "healthy",
  "service": "Fraud-Shield API"
}
```

---

## 5. High-Risk Transaction Test

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

## 6. Low-Risk Transaction Test

A normal transaction was also tested.

Example result:

```text
Risk Score: 5
Risk Level: Low
Verdict: Safe
Confidence: 0.0234
```

The system correctly classified the transaction as safe while still providing risk factors and rule evaluation.

---

# 🗄️ Database Integration

The backend is configured to work with PostgreSQL.

Database functionality is handled using:

```text
SQLAlchemy
```

and configuration is maintained through environment variables.

The database layer is located in:

```text
app/core/database.py
```

Database models are located in:

```text
app/models/
```

Transaction schemas are defined in:

```text
app/schemas/transaction.py
```

Alembic configuration is available for database migration management.

---

# 🔐 Environment Configuration

Sensitive configuration should be stored in environment variables rather than hardcoded in source code.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/fraud_shield
```

Do not commit real database credentials, API keys, passwords, or other secrets to GitHub.

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

You can verify whether the existing server is running using:

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

The backend exposes a REST API intended to be consumed by the React frontend.

The main integration point is:

```text
POST /api/v1/transactions/analyze
```

The final frontend flow will be:

```text
User enters transaction
        ↓
React TransactionCheck page
        ↓
POST transaction to FastAPI
        ↓
ML prediction
        ↓
Business rule evaluation
        ↓
SHAP explanation
        ↓
Hybrid risk score
        ↓
FraudCheckResponse
        ↓
React FraudResult page
```

The existing frontend currently contains mock prediction logic. The mock prediction will be replaced with the real backend API integration while preserving the existing frontend UI.

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

The combination of **ML + business rules + explainability** makes the system more suitable for practical fraud monitoring.

---

# 📌 Current Status

### Completed

* [x] FastAPI backend
* [x] Health check API
* [x] Transaction analysis API
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
* [x] Local API testing

### Next Steps

* [ ] Connect existing React frontend to the backend API
* [ ] Replace frontend mock prediction logic
* [ ] Connect Fraud Result UI with real API response
* [ ] Connect transaction history with PostgreSQL
* [ ] Add authentication and authorization
* [ ] Add production database migrations
* [ ] Add automated backend tests
* [ ] Add API error handling and logging
* [ ] Deploy backend and database
* [ ] Integrate production frontend and backend

---

# 🛡️ Fraud-Shield

**AI-powered financial fraud detection with explainable decisions.**

The goal is not only to detect fraud, but to provide a clear and understandable explanation of **why a transaction was considered risky**.

