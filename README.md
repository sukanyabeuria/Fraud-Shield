# 🛡️ Fraud-Shield

A full-stack **AI-powered financial fraud detection and explainability platform** designed to identify suspicious financial transactions in real time and explain the key factors behind each fraud decision.

> **Current Stage:** Full-stack integration complete — Backend + Authentication + PostgreSQL + ML/XAI + React Frontend integration verified locally. Production deployment is the next phase.

---

# 📌 About the Project

**Fraud-Shield** combines:

* Machine Learning
* Explainable AI (XAI)
* Rule-based fraud detection
* Hybrid risk scoring
* FastAPI REST APIs
* PostgreSQL persistence
* JWT-based authentication
* React/Vite frontend
* Transaction history
* Risk analytics
* Profile and security settings
* Live alert feed

The system evaluates transaction characteristics such as transaction amount, international transfer status, recipient history, device information, location and transaction patterns to generate a fraud risk assessment.

The platform does not only predict whether a transaction is fraudulent; it also provides risk factors, triggered rules, confidence information and recommended actions to make the decision easier to understand.

---

# 🚀 Key Features

## 🔐 Authentication

Authentication is implemented end-to-end between the React frontend and FastAPI backend.

Implemented features:

* User registration
* Login API
* Email validation
* Password hashing
* JWT access-token generation
* Database-backed user lookup
* Invalid credential handling
* Frontend authentication context
* Frontend session persistence
* Authenticated API requests
* Logout
* User identity and role information

### Registration

```text
POST /api/v1/auth/register
```

Example request:

```json
{
  "full_name": "Fraud Shield Test",
  "email": "fraudshield.test@example.com",
  "password": "TestPass123!"
}
```

### Login

```text
POST /api/v1/auth/login
```

Example request:

```json
{
  "email": "fraudshield.test@example.com",
  "password": "TestPass123!"
}
```

Successful authentication returns:

```json
{
  "access_token": "<JWT_TOKEN>",
  "token_type": "bearer",
  "user_id": 2,
  "email": "fraudshield.test@example.com",
  "role": "user"
}
```

Invalid credentials correctly return:

```http
401 Unauthorized
```

with:

```json
{
  "detail": "Invalid email or password"
}
```

Authentication schemas are defined in:

```text
backend/app/schemas/auth.py
```

Authentication utilities are implemented in:

```text
backend/app/api/v1/auth_utils.py
```

The frontend authentication flow is handled through:

```text
frontend/fraud-shield-react-frontend (2)/src/context/AuthContext.jsx
```

---

# 👤 Profile & Settings

Profile and settings integration is implemented between the React frontend and backend.

Implemented functionality includes:

### Notification Settings

* Fraud alerts
* High-risk only
* Weekly digest
* Email alerts
* SMS alerts

### Security Settings

* Two-factor authentication
* Login alerts
* Automatic blocking
* Session timeout

### Backend Endpoints

```text
GET   /api/v1/auth/settings
PATCH /api/v1/auth/settings
GET   /api/v1/auth/sessions
```

Settings are stored in PostgreSQL and are user-specific.

The persistence flow has been verified:

```text
Change setting
      ↓
Save
      ↓
PATCH backend API
      ↓
PostgreSQL
      ↓
Refresh application
      ↓
GET settings
      ↓
Saved value restored
```

---

# 📊 Fraud Detection Dashboard

The dashboard consumes backend APIs for real transaction and analytics data.

Supported dashboard information includes:

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
* Critical-risk transaction monitoring

Analytics are calculated from persisted PostgreSQL transaction data.

---

# 💳 Real-Time Transaction Analysis

Users can submit transaction information through the React frontend.

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

### Endpoint

```text
POST /api/v1/transactions/analyze
```

The backend generates:

* Risk score
* Risk level
* Fraud/Genuine verdict
* Prediction confidence
* Risk factors
* Triggered fraud rules
* Recommended action
* Model version
* Evaluation timestamp
* Explainability information

Example:

```text
Risk Score: 83
Risk Level: Critical
Verdict: Fraud
Confidence: 99.63%

Recommended Action:
Block transaction and initiate manual review
```

The React Transaction Check screen is connected to the real API.

The Fraud Result screen renders the returned transaction analysis rather than relying on fabricated prediction data.

---

# 🤖 Machine Learning Fraud Detection

Fraud-Shield uses an **XGBoost-based machine learning model**.

The ML pipeline contains:

```text
backend/ml/
├── feature_engineering.py
├── model_loader.py
├── predictor.py
├── train_model.py
└── artifacts/
    ├── xgboost_model.pkl
    ├── feature_engineer.pkl
    ├── shap_explainer.pkl
    └── model_metadata.json
```

The trained model is loaded through `FraudPredictor`.

The ML service does not use hard-coded fraud predictions.

The generated fraud probability is combined with deterministic fraud rules through the hybrid scoring layer.

---

# 🔍 Explainable AI (XAI)

Fraud-Shield uses **SHAP (SHapley Additive exPlanations)** to explain individual fraud predictions.

Example risk factors:

```text
is_international     → increases risk
is_new_recipient     → increases risk
previous_amount      → increases risk
is_new_device        → increases risk
amount               → increases risk
```

Each explanation can contain:

* Feature name
* Feature impact
* Risk direction
* Human-readable explanation

Example:

```json
{
  "feature": "is_new_recipient",
  "impact": 2.02,
  "direction": "increases_risk",
  "explanation": "Recipient has not been previously used. This increases the risk of fraud."
}
```

---

# ⚙️ Hybrid Fraud Detection Engine

Fraud-Shield combines machine learning and deterministic business rules.

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
     │                 ├── NEW_RECIPIENT
     │                 ├── INTERNATIONAL_TRANSFER
     │                 ├── NEW_DEVICE
     │                 └── HIGH_FREQUENCY
     │
     └────────┬────────┘
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
       Database Persistence
              │
              ▼
          API Response
              │
              ▼
        React Frontend
```

The hybrid approach combines learned fraud patterns with business-defined fraud rules.

---

# 🧠 Risk Classification

The backend uses configured risk thresholds to classify transactions.

```text
Low Risk
Medium Risk
High Risk
Critical Risk
```

The final decision incorporates:

* ML fraud probability
* Rule-based risk signals
* Hybrid scoring
* Configured risk thresholds

---

# 📜 Transaction History

Transaction history is connected to the backend.

### Endpoints

```text
GET /api/v1/transactions
GET /api/v1/transactions/{id}
```

The React History page consumes these endpoints to display persisted transactions.

Historical transaction records include fraud evaluation information such as:

* Risk score
* Risk level
* Verdict
* Confidence
* Recommended action
* Evaluation timestamp

---

# 📈 Risk Analytics

The React Analytics page consumes database-backed analytics APIs.

### Endpoints

```text
GET /api/v1/analytics/summary
GET /api/v1/analytics
```

Supported metrics include:

* Total transactions
* Fraud transactions
* Suspicious transactions
* Safe transactions
* Average risk score
* Average prediction confidence
* Total transaction amount
* High-risk transactions
* Critical-risk transactions
* Risk distribution
* Transaction activity
* Fraud/Genuine analysis

The analytics are calculated from persisted transaction records rather than static frontend data.

---

# 🚨 Navbar Alerts

The navbar alert feed is connected to the backend.

### Endpoint

```text
GET /api/v1/alerts
```

The frontend requests alerts when the alert dropdown is opened.

The UI supports:

* Alert count
* Alert title
* Alert details
* Severity/risk level
* Alert timestamp
* Loading state
* Error state
* Empty state

If no alerts exist, the UI displays:

```text
No active alerts.
```

---

# 🗄️ Database

Fraud-Shield uses **PostgreSQL** for persistent storage.

SQLAlchemy is used as the ORM.

Current database tables include:

```text
users
transactions
fraud_evaluations
feature_attributions
```

### User Data

The `users` table stores:

* User ID
* Email
* Password hash
* First name
* Last name
* Role
* Created timestamp
* Notification settings
* Security settings

### Transaction Data

Transactions store:

* Transaction ID
* Amount
* Currency
* Transaction type
* Merchant information
* Location
* IP address
* Device type
* Transfer indicators
* Recipient indicators
* Frequency
* Risk score
* Risk level
* Verdict
* Confidence
* Recommended action
* User relationship
* Created timestamp

### Fraud Evaluation Data

Fraud evaluations store:

* Transaction ID
* Risk score
* Risk level
* Verdict
* Confidence
* Recommended action
* Model version

### Feature Attribution Data

Feature-level explainability information is persisted through feature attribution records.

---

# 💾 Database Persistence

Fraud analysis results are persisted after transaction evaluation.

Example:

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

This allows:

* Historical analysis
* Analytics calculations
* Transaction history
* Persistent fraud evaluations
* Explainability storage

---

# 🔌 Backend API

Fraud-Shield uses a FastAPI REST backend.

## Current API Routes

```text
POST  /api/v1/auth/register
POST  /api/v1/auth/login

GET   /api/v1/auth/settings
PATCH /api/v1/auth/settings
GET   /api/v1/auth/sessions

GET   /api/v1/health
GET   /health

GET   /api/v1/alerts

GET   /api/v1/analytics/summary
GET   /api/v1/analytics

GET   /api/v1/transactions
GET   /api/v1/transactions/{id}
POST  /api/v1/transactions/analyze
```

The currently implemented routes were verified through the running OpenAPI specification.

---

# ❤️ Health Check

## Backend Health

```text
GET /health
```

Response:

```json
{
  "status": "healthy",
  "service": "fraud-shield-backend"
}
```

## API Health

```text
GET /api/v1/health
```

Response:

```json
{
  "status": "healthy",
  "service": "Fraud-Shield API"
}
```

Both endpoints have been verified locally.

---

# 📖 API Documentation

FastAPI automatically provides:

### Swagger

```text
http://127.0.0.1:8000/docs
```

### OpenAPI

```text
http://127.0.0.1:8000/openapi.json
```

The OpenAPI specification was used to verify the active backend routes.

---

# 🔐 Security

The backend includes:

* Password hashing
* JWT authentication
* Email validation
* Environment-based configuration
* PostgreSQL credentials through environment variables
* SQLAlchemy parameterized database operations
* Foreign key constraints
* `.env` files excluded from Git
* Production `SECRET_KEY` configuration through environment variables

JWT configuration is maintained in:

```text
backend/app/core/config.py
```

Important production variables include:

```text
SECRET_KEY
DATABASE_URL
APP_ENV
```

A secure production secret must be supplied during deployment.

---

# 🌐 Frontend API Configuration

The frontend uses a centralized API configuration:

```text
frontend/fraud-shield-react-frontend (2)/src/config/api.js
```

The backend base URL is configured through:

```text
VITE_API_BASE_URL
```

Example local configuration:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_API_TIMEOUT_MS=30000
```

API endpoint paths are centralized in:

```text
src/config/api.js
```

The frontend does not hard-code backend URLs across individual components.

---

# 🔗 Frontend-to-Backend Integration

The frontend integration phase has been completed for the implemented backend APIs.

Current integration includes:

```text
React Frontend
      │
      ▼
HTTP Client
      │
      ▼
FastAPI Backend
      │
      ├── Authentication
      ├── Profile Settings
      ├── Transactions
      ├── Fraud Analysis
      ├── Transaction History
      ├── Analytics
      └── Alerts
      │
      ▼
PostgreSQL / ML / XAI
```

Integrated frontend services include:

```text
src/services/httpClient.js
src/services/fraudApi.js
src/context/AuthContext.jsx
```

The frontend uses real API responses and real error states instead of fabricated backend data for the implemented flows.

---

# 🧪 Local Testing & Verification

The integrated application has been tested locally.

## 1. Database Connection

Verified successfully:

```text
DATABASE: 1
```

This confirms that SQLAlchemy can connect to PostgreSQL and execute a query.

---

## 2. Backend Health

Verified:

```text
GET /health
GET /api/v1/health
```

Both returned HTTP 200 responses.

---

## 3. User Registration

Verified:

```text
POST /api/v1/auth/register
```

A test user was successfully created and the API returned:

```text
HTTP 201 Created
```

with:

* Access token
* Token type
* User ID
* Email
* Role

---

## 4. Login

Verified:

```text
POST /api/v1/auth/login
```

Successful login returned a valid JWT access token.

---

## 5. Authenticated Settings

Verified using the returned JWT:

```text
GET /api/v1/auth/settings
```

The API returned the user's persisted settings.

---

## 6. Sessions

Verified:

```text
GET /api/v1/auth/sessions
```

The API successfully returned the current authenticated session.

---

## 7. Alerts

Verified:

```text
GET /api/v1/alerts
```

The endpoint correctly returned:

```json
{
  "items": [],
  "total": 0
}
```

when no active alerts existed.

---

## 8. Frontend Production Build

The production frontend build was successfully generated using:

```bash
npm run build
```

Build result:

```text
✓ 2438 modules transformed.
✓ built successfully
```

The generated production artifact:

```text
frontend/fraud-shield-react-frontend (2)/dist/index.html
```

was successfully created.

---

# 🏗️ Frontend Build

Frontend technology:

```text
React
Vite
Tailwind CSS
React Router
Recharts
Lucide React
```

Build command:

```bash
cd frontend/"fraud-shield-react-frontend (2)"
npm install
npm run build
```

Production output is generated under:

```text
dist/
```

---

# 🔧 Running the Backend Locally

Navigate to the project:

```bash
cd ~/Fraud-Shield/backend
```

Activate the virtual environment:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend:

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

# 🔧 Running the Frontend Locally

Navigate to:

```bash
cd ~/Fraud-Shield/frontend/"fraud-shield-react-frontend (2)"
```

Install dependencies:

```bash
npm install
```

Configure:

```text
.env.local
```

Example:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_API_TIMEOUT_MS=30000
```

Start the frontend:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

# ⚠️ Port Already in Use

If FastAPI reports:

```text
ERROR: [Errno 48] Address already in use
```

check whether the existing backend is already running:

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

the backend is already active.

---

# 📁 Project Structure

```text
Fraud-Shield/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth_utils.py
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
│   │   │   ├── auth.py
│   │   │   └── transaction.py
│   │   │
│   │   ├── services/
│   │   │   ├── ml_service.py
│   │   │   └── rule_engine.py
│   │   │
│   │   ├── utils/
│   │   │   └── hybrid_scoring.py
│   │   │
│   │   └── main.py
│   │
│   ├── ml/
│   │   ├── feature_engineering.py
│   │   ├── model_loader.py
│   │   ├── predictor.py
│   │   ├── train_model.py
│   │   └── artifacts/
│   │
│   ├── requirements.txt
│   └── README.md
│
├── database/
├── docs/
├── explainable-ai/
│
├── frontend/
│   └── fraud-shield-react-frontend (2)/
│       ├── src/
│       ├── index.html
│       ├── package.json
│       ├── package-lock.json
│       ├── vite.config.ts
│       └── .env.example
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
 ├── Signup
 ├── Login
 ├── Profile
 ├── Transaction Check
 ├── History
 ├── Analytics
 └── Alerts
 │
 ▼
HTTP Client
 │
 ▼
FastAPI Backend
 │
 ├───────────────────────┐
 ▼                       ▼
Authentication        Fraud Analysis
 │                       │
 ▼                 ┌─────┴─────┐
JWT                ▼           ▼
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

# 🛠️ Tech Stack

| Layer               | Technology         |
| ------------------- | ------------------ |
| Frontend            | React.js           |
| Build Tool          | Vite               |
| Language            | JavaScript / JSX   |
| Styling             | Tailwind CSS / CSS |
| Routing             | React Router       |
| Charts              | Recharts           |
| Icons               | Lucide React       |
| Backend             | Python             |
| API Framework       | FastAPI            |
| ORM                 | SQLAlchemy         |
| Database            | PostgreSQL         |
| Validation          | Pydantic           |
| Configuration       | Pydantic Settings  |
| Authentication      | JWT / PyJWT        |
| Password Hashing    | pwdlib / Argon2    |
| Machine Learning    | XGBoost            |
| Explainable AI      | SHAP               |
| ML Processing       | scikit-learn       |
| Model Serialization | Joblib / Pickle    |
| ASGI Server         | Uvicorn            |
| Database Migrations | Alembic            |
| Version Control     | Git                |
| Collaboration       | GitHub             |

---

# 📦 Backend Dependencies

Backend dependencies are maintained in:

```text
backend/requirements.txt
```

Important dependencies include:

```text
FastAPI
Uvicorn
SQLAlchemy
Pydantic
Pydantic Settings
psycopg2-binary
PyJWT
pwdlib
Argon2
email-validator
NumPy
Pandas
scikit-learn
Joblib
SHAP
XGBoost
```

The virtual environment is local development infrastructure and is not committed to Git.

---

# 🔒 Environment Configuration

## Frontend

Frontend environment variables are configured through:

```text
.env.local
```

Example:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_API_TIMEOUT_MS=30000
```

Production should use the deployed backend URL instead of localhost.

---

## Backend

Production configuration should be supplied through environment variables.

Important variables:

```text
APP_ENV=production
DATABASE_URL=<production-postgresql-url>
SECRET_KEY=<strong-random-production-secret>
```

Never commit production secrets to GitHub.

---

# 🚀 Production Deployment

Production deployment is the next phase.

### Pending deployment work

* [ ] Choose production hosting provider
* [ ] Configure FastAPI production service
* [ ] Configure production PostgreSQL
* [ ] Configure production `DATABASE_URL`
* [ ] Generate secure production `SECRET_KEY`
* [ ] Configure production CORS
* [ ] Configure production frontend API URL
* [ ] Verify ML model artifacts are available in production
* [ ] Run production database migrations
* [ ] Deploy backend
* [ ] Deploy frontend
* [ ] Run production smoke tests
* [ ] Verify browser Console
* [ ] Verify Network tab for unexpected `401`, `404`, or `500`
* [ ] Verify production authentication
* [ ] Verify transaction analysis
* [ ] Verify history
* [ ] Verify analytics
* [ ] Verify alerts
* [ ] Verify settings persistence
* [ ] Run final production build

---

# 🧪 Integration Verification Checklist

The following local integration checks have been completed:

* [x] Backend starts successfully
* [x] PostgreSQL connection verified
* [x] Backend health endpoint verified
* [x] API health endpoint verified
* [x] OpenAPI routes verified
* [x] User registration verified
* [x] User login verified
* [x] JWT token generation verified
* [x] Authenticated settings endpoint verified
* [x] Sessions endpoint verified
* [x] Alerts endpoint verified
* [x] Frontend API configuration verified
* [x] Frontend authentication flow integrated
* [x] Profile/settings API integration implemented
* [x] Transaction analysis API integration implemented
* [x] Transaction history integration implemented
* [x] Analytics integration implemented
* [x] Navbar alerts integration implemented
* [x] Real API error handling implemented
* [x] Frontend production build verified
* [x] Git changes committed
* [x] Changes pushed to GitHub

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
* [x] PostgreSQL integration
* [x] SQLAlchemy ORM
* [x] Fraud evaluation persistence
* [x] Feature attribution persistence
* [x] Database-backed analytics
* [x] User model
* [x] Password hashing
* [x] User registration
* [x] JWT login authentication
* [x] Authentication request/response schemas
* [x] Authenticated settings API
* [x] Settings persistence
* [x] Sessions API
* [x] Alerts API
* [x] React authentication integration
* [x] Frontend API client
* [x] Authenticated frontend requests
* [x] Transaction Check integration
* [x] Fraud Result integration
* [x] Dashboard analytics integration
* [x] Transaction History integration
* [x] Profile & Settings integration
* [x] Navbar Alerts integration
* [x] Local PostgreSQL verification
* [x] Local API verification
* [x] Frontend production build
* [x] Git commit
* [x] GitHub push

---

# ⏳ Remaining Work

## Production Deployment

* [ ] Production hosting configuration
* [ ] Production PostgreSQL database
* [ ] Production environment variables
* [ ] Secure production JWT secret
* [ ] Production CORS configuration
* [ ] ML artifact deployment verification
* [ ] Database migrations
* [ ] Backend deployment
* [ ] Frontend deployment
* [ ] Production smoke testing
* [ ] Production monitoring/logging

## Future Enhancements

* [ ] Refresh-token flow
* [ ] Role-based access control
* [ ] Password reset
* [ ] Automated backend test suite
* [ ] Structured production logging
* [ ] Real-time transaction streaming
* [ ] Advanced anomaly detection
* [ ] Model retraining pipeline
* [ ] Continuous model monitoring
* [ ] Advanced notification delivery
* [ ] Production alerting infrastructure

---

# 🏁 Project Status

Fraud-Shield has progressed from a frontend prototype into a **functional full-stack fraud detection platform**.

The current system includes:

```text
React Frontend
      +
FastAPI Backend
      +
PostgreSQL
      +
JWT Authentication
      +
XGBoost
      +
SHAP Explainability
      +
Rule Engine
      +
Hybrid Risk Scoring
      +
Transaction Persistence
      +
Analytics
      +
Transaction History
      +
Profile & Security Settings
      +
Navbar Alerts
```

The **frontend-to-backend integration phase is complete and has been verified locally**.

The project is now ready for the next phase:

> **Production deployment configuration → Cloud deployment → Production smoke testing → Final release.**
