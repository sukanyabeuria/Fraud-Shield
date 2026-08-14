# 🛡️ Fraud-Shield

A modern frontend for a real-time financial fraud detection system powered by Machine Learning and Explainable AI.

> **Current Stage:** Frontend Development  
> Backend, Database, Machine Learning and Explainable AI integration will be added later.

---

## 📌 About the Project

Fraud-Shield is designed to help detect suspicious financial transactions in real time.

The final system will use:

- Machine Learning for fraud detection
- Explainable AI (XAI) to explain why a transaction is considered risky
- Backend APIs for communication
- Database for storing transaction information
- A modern web dashboard for monitoring fraud

Currently, we are developing the **frontend interface using mock data**.

---

## 🚀 Current Frontend Features

### 🔐 Authentication
- Login page
- Sign Up page
- Password visibility toggle
- Frontend form validation
- Remember me option

### 📊 Dashboard
- Total transactions
- Safe transactions
- Suspicious transactions
- Fraud detected
- Overall risk score
- Recent transactions
- Fraud statistics
- Risk distribution
- Transaction activity

### 💳 Transaction Check
Users can enter transaction information such as:

- Transaction ID
- Transaction amount
- Transaction type
- Account age
- Location
- Device type
- Transaction time
- Transaction frequency
- Previous transaction amount

Currently, the result is generated using **mock logic**.

### 🚨 Fraud Result
Displays:

- Fraud / Genuine result
- Risk score
- Risk level
- Risk indicators
- Transaction summary
- Explanation of suspicious factors

### 📜 Transaction History
- Search transactions
- Filter transactions
- Risk level
- Transaction status
- Transaction amount
- Transaction date
- Risk score

### 📈 Risk Analytics
- Fraud percentage
- Average risk score
- High-risk transactions
- Fraud trends
- Risk distribution
- Transaction volume
- Fraud vs Genuine analysis

### 👤 Profile & Settings
- User information
- Profile section
- Password settings
- Notification settings
- Security settings
- Theme settings
- Logout

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend framework |
| Vite | Development/build tool |
| JavaScript | Programming language |
| Tailwind CSS | UI styling |
| React Router | Page navigation |
| Recharts | Charts and analytics |
| Git | Version control |
| GitHub | Team collaboration |

---

## 📁 Project Structure

```text
frontend/
│
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Navbar.jsx
│   │   ├── StatCard.jsx
│   │   ├── TransactionTable.jsx
│   │   ├── RiskBadge.jsx
│   │   ├── RiskScore.jsx
│   │   ├── ChartCard.jsx
│   │   ├── Button.jsx
│   │   └── Input.jsx
│   │
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── Dashboard.jsx
│   │   ├── TransactionCheck.jsx
│   │   ├── FraudResult.jsx
│   │   ├── TransactionHistory.jsx
│   │   ├── Analytics.jsx
│   │   └── Profile.jsx
│   │
│   ├── data/
│   │   └── mockData.js
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── package.json
└── README.md

📄 Project Status
Current: Frontend Development 🚧
Next: Backend + Machine Learning + Explainable AI + Database Integration
Current Frontend Workflow
Login
  ↓
Dashboard
  ↓
Transaction Check
  ↓
Mock Fraud Detection
  ↓
Fraud Result
  ↓
Risk Score + Explanation
