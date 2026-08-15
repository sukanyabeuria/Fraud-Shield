"""
ML inference service for Fraud-Shield.

Wraps the existing FraudPredictor so the API layer
does not directly depend on the ML implementation.
"""

from ml.predictor import FraudPredictor


class MLService:
    """Service layer for ML-based fraud detection."""

    def __init__(self):
        self.predictor = FraudPredictor()
        self.initialized = False

    def initialize(self) -> bool:
        """Load ML model and supporting artifacts."""
        self.initialized = self.predictor.initialize()
        return self.initialized

    def predict(self, transaction: dict) -> dict:
        """Analyze a transaction using the trained ML model."""
        if not self.initialized:
            if not self.initialize():
                raise RuntimeError("ML model could not be initialized")

        return self.predictor.analyze(transaction)
