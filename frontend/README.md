# 🛡️ Fraud-Shield Frontend

The frontend of **Fraud-Shield** is a React-based web application designed to provide an interactive interface for financial fraud detection and risk analysis.

It allows users to enter transaction information, submit transactions for analysis, and view fraud detection results in an understandable and visual format.

The frontend is designed to communicate with the Fraud-Shield FastAPI backend and display:

- Fraud/Safe verdict
- Risk score
- Risk level
- Confidence score
- Risk factors
- Triggered business rules
- Recommended action
- Transaction details
- Model-based explanations

The goal is to provide a clean and user-friendly interface for interacting with the Fraud-Shield fraud detection engine.

---

# 📌 Current Implementation Status

The core frontend interface has been implemented.

The existing frontend currently contains the user interface and mock prediction logic.

The next integration step is to replace the mock prediction logic with the real Fraud-Shield backend API.

## Currently Implemented

- React frontend
- Transaction input interface
- Transaction checking flow
- Fraud result interface
- Risk score visualization
- Risk level display
- Fraud/Safe verdict display
- Confidence display
- Risk factor display
- Recommended action display
- Transaction information display
- Mock prediction logic
- Frontend routing
- Responsive UI components

---

# 🔗 Backend Integration

The frontend is designed to communicate with the Fraud-Shield FastAPI backend.

The primary API endpoint is:

```text
POST /api/v1/transactions/analyze
The integration flow is:
React Frontend
      ↓
Transaction Input
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
The existing frontend currently uses mock prediction logic.
The mock logic will be replaced with the real backend API while preserving the existing frontend UI.
```
```text
🏗️ Frontend Architecture
The frontend follows a component-based React architecture.
frontend/
│
├── src/
│   │
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── TransactionForm.jsx
│   │   ├── RiskScore.jsx
│   │   ├── RiskFactors.jsx
│   │   ├── FraudResult.jsx
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── TransactionCheck.jsx
│   │   ├── FraudResult.jsx
│   │   └── ...
│   │
│   ├── services/
│   │   └── api.js
│   │
│   ├── data/
│   │   └── ...
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── public/
│
├── package.json
└── README.md
Update the component names above according to the actual frontend folder structure.
```
----
⚙️ Technology Stack:

Technology
Purpose
React.js
Frontend framework
JavaScript
Frontend programming language
HTML5
Application structure
CSS3
Styling
React Router
Frontend navigation
REST API
Backend communication
FastAPI
Backend API
PostgreSQL
Transaction data storage
Vite
Frontend development and build tool
-----
🖥️ Main Frontend Features:

----
📊 Dashboard:

The dashboard provides an overview of the fraud detection system.
It is designed to provide users with quick access to:
Transaction analysis
Fraud detection results
Risk information
System information
Transaction-related data
----
💳 Transaction Check:


The Transaction Check interface allows users to enter transaction information.
The transaction data includes:
Field
Description
Transaction ID
Unique transaction identifier
Amount
Transaction amount
Currency
Transaction currency
Transaction Type
Type of transaction
Merchant Category
Merchant/business category
Location
Transaction location
IP Address
IP address associated with transaction
Device Type
Device used for transaction
International Transfer
Whether transaction is international
New Recipient
Whether recipient is new
Transaction Frequency
Number/frequency of transactions
New Device
Whether device is newly detected
The entered information is submitted to the backend for fraud analysis.
----
🔍 Fraud Detection Flow
The frontend follows the following process:
User enters transaction
        ↓
Transaction validation
        ↓
Submit transaction
        ↓
FastAPI API
        ↓
Machine Learning prediction
        ↓
Business rule evaluation
        ↓
SHAP explanation
        ↓
Hybrid risk scoring
        ↓
FraudCheckResponse
        ↓
Frontend displays result
----
🚨 Fraud Result
After analyzing a transaction, the frontend displays the fraud detection result.
The result can contain:
Risk Score
Risk Level
Verdict
Confidence
Recommended Action
Risk Factors
Triggered Rules
Model Version
Evaluation Time
Example:
{
  "transaction_id": "TEST-001",
  "risk_score": 83,
  "risk_level": "Critical",
  "verdict": "Fraud",
  "confidence": 0.9964,
  "recommended_action": "Block transaction and initiate manual review"
}
----
📊 Risk Visualization
The frontend visually represents the calculated risk score.
Risk levels include:
Low
Medium
High
Critical
The final verdict can be:
Safe
Fraud
This allows users to quickly understand the severity of a transaction.
---
🧠 Explainable AI
Fraud-Shield does not only display whether a transaction is fraudulent.
The frontend also displays the factors that contributed to the prediction.
Example:
is_international
        ↓
Increases Risk

is_new_recipient
        ↓
Increases Risk

is_new_device
        ↓
Increases Risk
SHAP-based explanations from the backend are presented in the frontend so that users can understand why a transaction was considered risky.
---
🚨 Triggered Business Rules
The frontend also displays business rules triggered during transaction analysis.
Example:
NEW_RECIPIENT
Impact: +18

INTERNATIONAL_TRANSFER
Impact: +15

NEW_DEVICE
Impact: +10
This provides additional context alongside the machine learning prediction.
---
🎯 Recommended Action
Based on the final risk assessment, the frontend displays a recommended action.
Examples:
Approve transaction
Review transaction
Block transaction and initiate manual review
This allows analysts or users to understand what action should be considered for the transaction.
🔌 API Configuration
The frontend communicates with the FastAPI backend.
When running locally, the backend normally runs at:
http://127.0.0.1:8000
The transaction analysis endpoint is:
POST http://127.0.0.1:8000/api/v1/transactions/analyze
Health check:
GET http://127.0.0.1:8000/api/v1/health
---
🔐 Environment Configuration
API configuration should be stored using environment variables rather than hardcoded values.
Example:
VITE_API_BASE_URL=http://127.0.0.1:8000
The frontend can then use:
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
Do not commit sensitive credentials, API keys, passwords, or other secrets to GitHub.
---
▶️ Running the Frontend
Navigate to the frontend directory:
cd frontend
Install dependencies:
npm install
Start the development server:
npm run dev
The frontend will normally be available at the URL shown by Vite, commonly:
http://localhost:5173
---
🔗 Running Frontend + Backend
The complete Fraud-Shield system can be run as:
React Frontend
      ↓
localhost:5173
      ↓
FastAPI Backend
      ↓
localhost:8000
      ↓
PostgreSQL Database
The frontend sends transaction information to:
POST /api/v1/transactions/analyze
The backend performs:
XGBoost Prediction
        +
Business Rules
        +
SHAP Explainability
        ↓
Hybrid Risk Score
The result is returned to the frontend and displayed to the user.
---
🧪 Frontend Testing
The frontend can be tested using different transaction scenarios.
High-Risk Transaction
Example conditions:
High transaction amount
International transfer
New recipient
New device
High transaction frequency
Expected result:
Risk Level: Critical
Verdict: Fraud
Low-Risk Transaction
Example conditions:
Normal transaction amount
Known recipient
Known device
Normal transaction frequency
Domestic transaction
Expected result:
Risk Level: Low
Verdict: Safe
---
🛠️ Development Workflow
The frontend development workflow is:
Design UI
   ↓
Create React Components
   ↓
Create Transaction Form
   ↓
Implement Result UI
   ↓
Connect FastAPI API
   ↓
Handle API Response
   ↓
Display Fraud Analysis
   ↓
Test High/Low Risk Transactions
----------
📌 Current Status
Completed
React frontend
Dashboard UI
Transaction input interface
Fraud result interface
Risk score display
Risk level display
Fraud/Safe verdict
Confidence display
Risk factor display
Recommended action display
Mock prediction flow
Frontend structure
