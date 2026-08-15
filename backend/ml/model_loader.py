"""
Model loader module for Fraud-Shield.
Loads trained XGBoost model, SHAP explainer and feature engineering pipeline.
"""

import os
import json
import joblib
from typing import List, Dict, Any


class MLModelLoader:

    def __init__(
        self,
        model_path: str = "ml/artifacts/xgboost_model.pkl",
        explainer_path: str = "ml/artifacts/shap_explainer.pkl",
        fe_path: str = "ml/artifacts/feature_engineer.pkl",
        metadata_path: str = "ml/artifacts/model_metadata.json"
    ):
        self.model_path = model_path
        self.explainer_path = explainer_path
        self.fe_path = fe_path
        self.metadata_path = metadata_path

        self.model = None
        self.explainer = None
        self.feature_engineer = None
        self.metadata = None

        self.feature_names = [
            "amount",
            "previous_amount",
            "account_age",
            "transaction_frequency",
            "is_international",
            "is_new_recipient",
            "is_new_device"
        ]

    def load(self) -> bool:
        try:
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(
                    f"Model artifact not found: {self.model_path}"
                )

            if not os.path.exists(self.explainer_path):
                raise FileNotFoundError(
                    f"SHAP explainer not found: {self.explainer_path}"
                )

            if not os.path.exists(self.fe_path):
                raise FileNotFoundError(
                    f"Feature engineer not found: {self.fe_path}"
                )

            self.model = joblib.load(self.model_path)
            self.explainer = joblib.load(self.explainer_path)
            self.feature_engineer = joblib.load(self.fe_path)

            if os.path.exists(self.metadata_path):
                with open(self.metadata_path, "r") as f:
                    self.metadata = json.load(f)

            return True

        except Exception as e:
            print(f"Failed to load model artifacts: {e}")
            return False

    def is_loaded(self) -> bool:
        return (
            self.model is not None
            and self.explainer is not None
            and self.feature_engineer is not None
        )

    def predict(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.is_loaded():
            raise RuntimeError("Model not loaded.")

        import pandas as pd

        features_df = pd.DataFrame([transaction_data])
        transformed = self.feature_engineer.transform(features_df)

        probabilities = self.model.predict_proba(transformed)[0]
        fraud_probability = float(probabilities[1])
        prediction = int(self.model.predict(transformed)[0])

        return {
            "fraud_probability": fraud_probability,
            "raw_prediction": prediction
        }

    def explain(self, transaction_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        if not self.is_loaded():
            raise RuntimeError("Model not loaded.")

        import pandas as pd
        import shap

        features_df = pd.DataFrame([transaction_data])
        transformed = self.feature_engineer.transform(features_df)

        try:
            shap_values = self.explainer.shap_values(transformed)
        except NotImplementedError:
            fallback_explainer = shap.TreeExplainer(
                self.model,
                feature_perturbation="tree_path_dependent"
            )
            shap_values = fallback_explainer.shap_values(transformed)

        if isinstance(shap_values, list):
            shap_values = shap_values[1]

        if len(shap_values.shape) == 2:
            shap_values = shap_values[0]

        explanations = []

        for idx, name in enumerate(self.feature_names):
            value = float(shap_values[idx])

            explanations.append({
                "feature": name,
                "feature_label": self._get_feature_label(name),
                "shap_value": value,
                "impact_points": abs(value),
                "direction": (
                    "increases_risk"
                    if value > 0
                    else "decreases_risk"
                ),
                "explanation": self._generate_explanation(name, value)
            })

        explanations.sort(
            key=lambda x: abs(x["shap_value"]),
            reverse=True
        )

        return explanations[:5]

    def get_model_version(self) -> str:
        if self.metadata:
            return self.metadata.get(
                "model_version",
                "unknown"
            )

        if self.model is not None:
            return "fraud-shield-xgboost-v1.0"

        return "not-loaded"

    def _get_feature_label(self, feature_name: str) -> str:
        labels = {
            "amount": "Transaction Amount",
            "previous_amount": "Previous Transaction Amount",
            "account_age": "Account Age (months)",
            "transaction_frequency": "Transaction Frequency (24h)",
            "is_international": "International Transfer",
            "is_new_recipient": "New Recipient",
            "is_new_device": "New Device"
        }

        return labels.get(
            feature_name,
            feature_name.replace("_", " ").title()
        )

    def _generate_explanation(
        self,
        feature_name: str,
        shap_value: float
    ) -> str:

        explanations = {
            "amount":
                "Transaction amount differs significantly from the account's typical pattern.",
            "previous_amount":
                "Current amount differs notably from the previous transaction.",
            "account_age":
                "Account age provides a historical behavior risk signal.",
            "transaction_frequency":
                "Transaction frequency is unusual for this account.",
            "is_international":
                "Cross-border transaction carries elevated risk.",
            "is_new_recipient":
                "Recipient has not been previously used.",
            "is_new_device":
                "Device is unrecognized or newly added."
        }

        base = explanations.get(
            feature_name,
            f"{feature_name} is influential."
        )

        if shap_value > 0:
            return f"{base} This increases the risk of fraud."

        return f"{base} This decreases the risk of fraud."
