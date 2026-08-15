"""
Hybrid fraud scoring engine.

Combines:
- 70% Machine Learning risk score
- 30% deterministic business-rule score

Produces a final risk score, risk level, verdict,
and recommended business action.
"""

from typing import Dict, Any


class HybridScorer:

    def __init__(
        self,
        ml_weight: float = 0.70,
        rule_weight: float = 0.30,
    ):
        if abs((ml_weight + rule_weight) - 1.0) > 0.0001:
            raise ValueError("ML and rule weights must add up to 1.0")

        self.ml_weight = ml_weight
        self.rule_weight = rule_weight

    def calculate_score(
        self,
        ml_risk_score: float,
        rule_score: float,
    ) -> float:
        """
        Calculate final weighted fraud risk score.
        Both inputs are expected to be between 0 and 100.
        """

        ml_risk_score = max(0.0, min(100.0, ml_risk_score))
        rule_score = max(0.0, min(100.0, rule_score))

        final_score = (
            ml_risk_score * self.ml_weight
            + rule_score * self.rule_weight
        )

        return round(final_score, 2)

    def get_risk_level(self, score: float) -> str:
        """Convert final score into a business risk level."""

        if score >= 80:
            return "Critical"
        elif score >= 60:
            return "High"
        elif score >= 30:
            return "Medium"
        else:
            return "Low"

    def get_verdict(self, score: float) -> str:
        """Convert risk score into a fraud decision."""

        if score >= 80:
            return "Fraud"
        elif score >= 50:
            return "Suspicious"
        else:
            return "Safe"

    def get_recommended_action(self, score: float) -> str:
        """Return recommended business action."""

        if score >= 80:
            return "Block transaction and initiate manual review"
        elif score >= 60:
            return "Hold transaction for manual review"
        elif score >= 30:
            return "Allow transaction with enhanced monitoring"
        else:
            return "Approve transaction"

    def score(
        self,
        ml_risk_score: float,
        rule_score: float,
    ) -> Dict[str, Any]:
        """Return complete hybrid scoring result."""

        final_score = self.calculate_score(
            ml_risk_score,
            rule_score,
        )

        risk_level = self.get_risk_level(final_score)
        verdict = self.get_verdict(final_score)
        action = self.get_recommended_action(final_score)

        return {
            "ml_risk_score": round(ml_risk_score, 2),
            "rule_score": round(rule_score, 2),
            "ml_weight": self.ml_weight,
            "rule_weight": self.rule_weight,
            "final_risk_score": final_score,
            "risk_level": risk_level,
            "verdict": verdict,
            "recommended_action": action,
        }
