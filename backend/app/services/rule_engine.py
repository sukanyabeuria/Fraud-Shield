"""
Rule-based fraud detection engine.

Deterministic business rules are evaluated separately from ML predictions.
Their scores can later be combined through hybrid scoring.
"""

from typing import Dict


class RuleEngine:

    def __init__(self, config: dict = None):
        self.config = config or self._default_config()
        self._rule_registry = self._register_rules()

    def _default_config(self) -> dict:
        return {
            "high_amount_threshold": 200000,
            "high_amount_penalty": 25,
            "high_frequency_threshold": 8,
            "new_recipient_penalty": 18,
            "international_penalty": 15,
            "new_device_penalty": 10,
        }

    def _register_rules(self) -> Dict[str, dict]:
        return {
            "HIGH_AMOUNT": {
                "condition": self._check_high_amount,
                "impact": self.config["high_amount_penalty"],
                "severity": "high",
            },
            "NEW_RECIPIENT": {
                "condition": self._check_new_recipient,
                "impact": self.config["new_recipient_penalty"],
                "severity": "medium",
            },
            "INTERNATIONAL_TRANSFER": {
                "condition": self._check_international,
                "impact": self.config["international_penalty"],
                "severity": "medium",
            },
            "HIGH_FREQUENCY": {
                "condition": self._check_high_frequency,
                "impact": 12,
                "severity": "medium",
            },
            "NEW_DEVICE": {
                "condition": self._check_new_device,
                "impact": self.config["new_device_penalty"],
                "severity": "low",
            },
        }

    def evaluate(self, transaction_data: dict) -> dict:
        triggered = []
        total_score = 0

        for rule_name, rule_def in self._rule_registry.items():
            if rule_def["condition"](transaction_data):
                impact = rule_def["impact"]
                total_score += impact

                triggered.append({
                    "rule": rule_name,
                    "impact": impact,
                    "reason": self._get_reason(rule_name, transaction_data),
                })

        return {
            "triggered_rules": triggered,
            "rule_score": total_score,
            "total_rules_triggered": len(triggered),
        }

    def _check_high_amount(self, data: dict) -> bool:
        return data.get("amount", 0) > self.config["high_amount_threshold"]

    def _check_new_recipient(self, data: dict) -> bool:
        return data.get("new_recipient", False)

    def _check_international(self, data: dict) -> bool:
        return data.get("international_transfer", False)

    def _check_high_frequency(self, data: dict) -> bool:
        return data.get("transaction_frequency", 0) > self.config["high_frequency_threshold"]

    def _check_new_device(self, data: dict) -> bool:
        return data.get("is_new_device", False)

    def _get_reason(self, rule_name: str, data: dict) -> str:
        reasons = {
            "HIGH_AMOUNT": (
                f"Transaction amount ${data.get('amount', 0):,.0f} "
                f"exceeds ${self.config['high_amount_threshold']:,.0f} threshold"
            ),
            "NEW_RECIPIENT": "Transaction sent to a newly added recipient",
            "INTERNATIONAL_TRANSFER": "Cross-border transaction without prior travel history",
            "HIGH_FREQUENCY": (
                f"Transaction frequency ({data.get('transaction_frequency', 0)}) "
                f"exceeds threshold of {self.config['high_frequency_threshold']}"
            ),
            "NEW_DEVICE": "Transaction initiated from an unrecognized device",
        }

        return reasons.get(rule_name, "Rule triggered")
