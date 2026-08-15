"""
Compatibility exports for Fraud-Shield database models.

All SQLAlchemy models are defined in app.models.models.
This module re-exports them to avoid duplicate model definitions.
"""

from app.models.models import (
    User,
    Transaction,
    FraudEvaluation,
    FeatureAttribution,
)

__all__ = [
    "User",
    "Transaction",
    "FraudEvaluation",
    "FeatureAttribution",
]
