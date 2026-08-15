"""
Training script for Fraud-Shield XGBoost model.

This script:
1. Generates a synthetic fraud dataset with realistic feature correlations
2. Performs feature engineering
3. Splits data into train/test sets
4. Trains an XGBoost classifier
5. Evaluates the model (accuracy, precision, recall, f1, roc-auc, confusion matrix)
6. Saves the trained model and preprocessing artifacts
7. Saves metadata about the model version

The synthetic dataset is designed for SIH demonstration purposes only.
In production, real transaction data should be used with proper privacy safeguards.
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
import xgboost as xgb
import joblib
from datetime import datetime
import shap

# Import local modules
from ml.feature_engineering import FeatureEngineer

def generate_synthetic_fraud_data(n_samples: int = 10000, random_state: int = 42) -> pd.DataFrame:
    """
    Generate a synthetic fraud dataset with realistic correlations.

    Features:
    - amount: transaction amount (log-normal distribution)
    - previous_amount: previous transaction amount (correlated with current amount)
    - account_age: account age in months
    - transaction_frequency: number of transactions in last 24h
    - is_international: whether transaction is international
    - is_new_recipient: whether recipient is new
    - is_new_device: whether device is new/unknown

    Fraud is more likely when:
    - Amount is unusually high compared to previous amount
    - Transaction is international
    - Recipient is new
    - Device is new
    - Account is young
    - High transaction frequency
    """
    np.random.seed(random_state)

    # Generate base features
    # Amount: log-normal distribution (most transactions small, few large)
    amount = np.random.lognormal(mean=10, sigma=1.5, size=n_samples)  # Mean ~22000
    amount = np.clip(amount, 100, 5000000)  # Reasonable bounds

    # Previous amount: correlated with current amount but with some variation
    previous_amount = amount * np.random.uniform(0.5, 2.0, size=n_samples)
    previous_amount = np.clip(previous_amount, 100, 5000000)

    # Account age: mostly established accounts, some new
    account_age = np.random.exponential(scale=24, size=n_samples)  # Mean 24 months
    account_age = np.clip(account_age, 0, 120).astype(int)  # 0-10 years

    # Transaction frequency: most accounts have low frequency
    transaction_frequency = np.random.poisson(lam=2, size=n_samples)
    transaction_frequency = np.clip(transaction_frequency, 0, 20)  # Reasonable max

    # Binary features with realistic probabilities
    is_international = np.random.binomial(1, 0.05, size=n_samples)  # 5% international
    is_new_recipient = np.random.binomial(1, 0.15, size=n_samples)  # 15% new recipient
    is_new_device = np.random.binomial(1, 0.08, size=n_samples)  # 8% new device

    # Create DataFrame
    df = pd.DataFrame({
        'amount': amount,
        'previous_amount': previous_amount,
        'account_age': account_age,
        'transaction_frequency': transaction_frequency,
        'is_international': is_international,
        'is_new_recipient': is_new_recipient,
        'is_new_device': is_new_device
    })

    # Generate fraud label based on risk factors
    # Higher risk when:
    # - Amount >> previous_amount (unusually large transaction)
    # - International transaction
    # - New recipient
    # - New device
    # - Young account
    # - High frequency

    risk_score = (
        0.3 * np.clip((df['amount'] / df['previous_amount']) - 1, 0, 5) / 5 +  # Ratio >1 indicates increase
        0.2 * df['is_international'] +
        0.2 * df['is_new_recipient'] +
        0.1 * df['is_new_device'] +
        0.1 * (1 - np.clip(df['account_age'] / 60, 0, 1)) +  # Younger accounts riskier
        0.1 * np.clip(df['transaction_frequency'] / 10, 0, 1)  # Higher frequency riskier
    )

    # Add some noise
    risk_score += np.random.normal(0, 0.1, size=n_samples)
    risk_score = np.clip(risk_score, 0, 1)

    # Convert to binary label with approximately 5% fraud rate
    fraud_threshold = np.percentile(risk_score, 95)  # Top 5% as fraud
    df['is_fraud'] = (risk_score >= fraud_threshold).astype(int)

    return df

def train_model():
    """
    Main training function.
    """
    print("🔄 Generating synthetic fraud dataset...")
    df = generate_synthetic_fraud_data(n_samples=15000)

    print(f"📊 Dataset shape: {df.shape}")
    print(f"📈 Fraud rate: {df['is_fraud'].mean():.2%}")

    # Separate features and target
    feature_cols = ['amount', 'previous_amount', 'account_age',
                   'transaction_frequency', 'is_international',
                   'is_new_recipient', 'is_new_device']
    X = df[feature_cols]
    y = df['is_fraud']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"🔄 Training set: {X_train.shape}, Test set: {X_test.shape}")

    # Feature engineering
    print("🔧 Engineering features...")
    fe = FeatureEngineer()
    X_train_engineered = fe.fit_transform(X_train)
    X_test_engineered = fe.transform(X_test)

    # Train XGBoost model
    print("🚂 Training XGBoost model...")
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        objective='binary:logistic',
        eval_metric='logloss',
        random_state=42,
        n_jobs=-1
    )

    model.fit(
        X_train_engineered, y_train,
        eval_set=[(X_test_engineered, y_test)],
        verbose=False
    )

    # Make predictions
    print("🔍 Evaluating model...")
    y_pred = model.predict(X_test_engineered)
    y_pred_proba = model.predict_proba(X_test_engineered)[:, 1]

    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    conf_matrix = confusion_matrix(y_test, y_pred)

    print("\n📊 Model Performance Metrics:")
    print(f"   Accuracy:  {accuracy:.4f}")
    print(f"   Precision: {precision:.4f}")
    print(f"   Recall:    {recall:.4f}")
    print(f"   F1 Score:  {f1:.4f}")
    print(f"   ROC-AUC:   {roc_auc:.4f}")
    print(f"\n📉 Confusion Matrix:")
    print(f"   TN: {conf_matrix[0,0]:4d} | FP: {conf_matrix[0,1]:4d}")
    print(f"   FN: {conf_matrix[1,0]:4d} | TP: {conf_matrix[1,1]:4d}")

    # Feature importance
    feature_importance = model.feature_importances_
    print(f"\n🎯 Feature Importance:")
    for name, importance in zip(feature_cols, feature_importance):
        print(f"   {name:<20}: {importance:.4f}")

    # SHAP explainer (for demonstration, we'll create a small sample)
    print("🔬 Creating SHAP explainer...")
    # Use a subset of training data for SHAP background (to keep it small)
    X_shap_sample = shap.sample(X_train_engineered, 100, random_state=42)
    explainer = shap.TreeExplainer(model, X_shap_sample)

    # Save artifacts
    artifacts_dir = "ml/artifacts"
    os.makedirs(artifacts_dir, exist_ok=True)

    print(f"💾 Saving model artifacts to {artifacts_dir}...")

    # Save model
    model_path = os.path.join(artifacts_dir, "xgboost_model.pkl")
    joblib.dump(model, model_path)

    # Save feature engineer
    fe_path = os.path.join(artifacts_dir, "feature_engineer.pkl")
    joblib.dump(fe, fe_path)

    # Save SHAP explainer
    explainer_path = os.path.join(artifacts_dir, "shap_explainer.pkl")
    joblib.dump(explainer, explainer_path)

    # Save metadata
    metadata = {
        "model_version": "fraud-shield-xgboost-v1.0",
        "training_date": datetime.now().isoformat(),
        "dataset_size": int(len(df)),
        "fraud_rate": float(df['is_fraud'].mean()),
        "features": feature_cols,
        "metrics": {
            "accuracy": float(accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "roc_auc": float(roc_auc),
            "confusion_matrix": conf_matrix.tolist()
        },
        "hyperparameters": {
            "n_estimators": 100,
            "max_depth": 6,
            "learning_rate": 0.1,
            "subsample": 0.8,
            "colsample_bytree": 0.8
        }
    }

    metadata_path = os.path.join(artifacts_dir, "model_metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"✅ Training completed successfully!")
    print(f"📁 Model saved to: {model_path}")
    print(f"📁 Feature engineer saved to: {fe_path}")
    print(f"📁 SHAP explainer saved to: {explainer_path}")
    print(f"📁 Metadata saved to: {metadata_path}")

    return model, fe, explainer, metadata

if __name__ == "__main__":
    train_model()
