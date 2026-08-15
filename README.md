# 🛡️ Fraud-Shield

A full-stack **AI-powered financial fraud detection and explainability platform** designed to identify suspicious transactions in real time and explain the key factors behind each fraud decision.

> **Current Stage:** Full-Stack Integration — Frontend + Backend + Database + Machine Learning + Explainable AI

---

## 📌 About the Project

**Fraud-Shield** is designed to detect potentially fraudulent financial transactions using a combination of:

* Machine Learning
* Explainable AI (XAI)
* Rule-based fraud detection
* Hybrid risk scoring
* REST APIs
* PostgreSQL database
* Interactive monitoring dashboard

The system evaluates transaction characteristics such as transaction amount, international transfer status, recipient history, device information and transaction patterns to generate a fraud risk assessment.

The platform not only predicts whether a transaction is fraudulent but also provides **explanations for the prediction**, helping users and analysts understand why a transaction was considered risky.

---

# 🚀 Key Features

## 🔐 Authentication

* Login and Sign Up interface
* Password visibility toggle
* Frontend form validation
* Remember me option
* User profile management

---

## 📊 Fraud Detection Dashboard

The dashboard provides an overview of transaction activity and fraud risk.

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

The backend processes the transaction and generates:

* Risk score
* Risk level
* Fraud/Genuine verdict
* Prediction confidence
* Risk factors
* Triggered fraud rules
* Recommended action
* Model version
* Evaluation timestamp

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

The trained model produces a fraud prediction that is combined with rule-based signals to generate the final risk assessment.

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
     │               └── NEW_DEVICE
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

### Example Triggered Rules

* `NEW_RECIPIENT`
* `INTERNATIONAL_TRANSFER`
* `NEW_DEVICE`

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

### Main Transaction Analysis Endpoint

```text
POST /api/v1/transactions/analyze
```

The endpoint accepts transaction information and returns the fraud evaluation.

### Response includes

```text
transaction_id
risk_score
risk_level
verdict
confidence
recommended_action
risk_factors
triggered_rules
model_version
evaluated_at
```

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

This allows historical fraud analysis and future dashboard analytics.

---

# 🛡️ Security

The system follows basic application security practices including:

* Password hashing
* Environment-based configuration
* Database credentials stored using environment variables
* Parameterized database queries
* Foreign key constraints
* Sensitive information excluded from source control
* `.env` files excluded through `.gitignore`

---

# 📊 Fraud Result

The Fraud Result interface displays the complete evaluation of a transaction.

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

Users can view previously evaluated transactions.

Features include:

* Search transactions
* Filter transactions
* Transaction status
* Risk level
* Transaction amount
* Transaction date
* Risk score
* Fraud verdict

---

# 📈 Risk Analytics

The analytics dashboard provides insights into transaction risk.

Features include:

* Fraud percentage
* Average risk score
* High-risk transactions
* Fraud trends
* Risk distribution
* Transaction volume
* Fraud vs Genuine analysis

---

# 👤 Profile & Settings

* User information
* Profile management
* Password settings
* Notification settings
* Security settings
* Theme settings
* Logout

---

# 🛠️ Tech Stack

| Layer            | Technology            |
| ---------------- | --------------------- |
| Frontend         | React.js              |
| Build Tool       | Vite                  |
| Language         | JavaScript            |
| Styling          | Tailwind CSS          |
| Routing          | React Router          |
| Charts           | Recharts              |
| Backend          | Python                |
| API Framework    | FastAPI               |
| ORM              | SQLAlchemy            |
| Database         | PostgreSQL            |
| Machine Learning | XGBoost               |
| Explainable AI   | SHAP                  |
| ML Processing    | Python / scikit-learn |
| Version Control  | Git                   |
| Collaboration    | GitHub                |

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
│   │   │   └── transaction.py
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
│   └── ml/
│       ├── feature_engineering.py
│       ├── model_loader.py
│       ├── predictor.py
│       ├── train_model.py
│       │
│       └── artifacts/
│           ├── feature_engineer.pkl
│           ├── model_metadata.json
│           ├── shap_explainer.pkl
│           └── xgboost_model.pkl
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
 │ Transaction Data
 ▼
FastAPI Backend
 │
 ├───────────────┐
 ▼               ▼
ML Engine      Rule Engine
 │               │
 ▼               ▼
XGBoost       Business Rules
 │               │
 └───────┬───────┘
         ▼
   Hybrid Scoring
         │
         ▼
   Fraud Evaluation
         │
    ┌────┴─────┐
    ▼          ▼
   SHAP     PostgreSQL
 Explanation  Storage
    │          │
    └────┬─────┘
         ▼
   Fraud Result
         │
         ▼
   React Dashboard
```

---

# 🎯 Project Objective

The primary objective of Fraud-Shield is to create a fraud detection platform that is:

* **Accurate** — uses machine learning to identify complex fraud patterns
* **Explainable** — provides understandable reasons behind predictions
* **Practical** — combines ML predictions with business fraud rules
* **Scalable** — uses modular backend and service architecture
* **Data-driven** — stores transaction and fraud evaluation history
* **User-friendly** — presents fraud insights through an interactive dashboard

---

# 🚧 Future Enhancements

Potential future improvements include:

* Real-time transaction streaming
* Advanced anomaly detection
* Model retraining pipeline
* Continuous model monitoring
* Advanced user authentication
* Role-based access control
* Production deployment
* Cloud database integration
* Automated model performance monitoring
* Advanced fraud analytics
* Alert and notification system

---

# 👥 Team Collaboration

Fraud-Shield is developed collaboratively using Git and GitHub.

The project follows a modular architecture where different team members can work independently on:

* Frontend
* Backend
* Database
* Machine Learning
* Explainable AI
* Documentation

---

## 🏁 Project Status

Fraud-Shield has progressed from a frontend prototype to an integrated fraud detection platform with:

* ✅ React frontend
* ✅ FastAPI backend
* ✅ PostgreSQL database integration
* ✅ XGBoost fraud detection
* ✅ SHAP-based Explainable AI
* ✅ Rule-based fraud detection
* ✅ Hybrid risk scoring
* ✅ Fraud evaluation persistence
* ✅ Feature-level risk explanations
* ✅ Transaction analysis API

The system is currently being prepared for further integration, testing and deployment.
