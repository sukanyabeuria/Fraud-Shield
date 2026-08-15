"""
Predictor module for Fraud-Shield.
Provides clean interface for fraud prediction with consistent feature engineering.
"""

from typing import Dict, Any, List, Optional
from ml.model_loader import MLModelLoader


class FraudPredictor:
    """
    High-level interface for fraud prediction.
    Uses the same feature engineering pipeline as training.
    """

    def __init__(self, model_path: str = "ml/artifacts/xgboost_model.pkl"):
        self.loader = MLModelLoader(model_path=model_path)
        self._loaded = False

    def initialize(self) -> bool:
        """Load model artifacts. Call before predict/explain."""
        self._loaded = self.loader.load()
        return self._loaded

    def predict(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict fraud probability for a transaction.

        Args:
            transaction: Dictionary with transaction features

        Returns:
            Dict with fraud_probability, ml_risk_score, model_version
        """
        if not self._loaded:
            raise RuntimeError("Model not initialized. Call initialize() first.")

        result = self.loader.predict(transaction)
        ml_risk_score = round(result['fraud_probability'] * 100)

        return {
            "fraud_probability": result['fraud_probability'],
            "ml_risk_score": ml_risk_score,
            "model_version": self.loader.get_model_version()
        }

    def explain(self, transaction: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate SHAP explanations for a transaction.

        Args:
            transaction: Dictionary with transaction features

        Returns:
            List of feature attributions
        """
        if not self._loaded:
            raise RuntimeError("Model not initialized. Call initialize() first.")

        return self.loader.explain(transaction)

    def analyze(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Full analysis: prediction + explanation.

        Args:
            transaction: Dictionary with transaction features

        Returns:
            Complete analysis result
        """
        prediction = self.predict(transaction)
        explanations = self.explain(transaction)

        return {
            "fraud_probability": prediction['fraud_probability'],
            "ml_risk_score": prediction['ml_risk_score'],
            "model_version": prediction['model_version'],
            "explanations": explanations
        }