from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from app.schemas.transaction import (
    TransactionCreate,
    FraudCheckResponse,
)
from app.services.ml_service import MLService
from app.services.rule_engine import RuleEngine
from app.utils.hybrid_scoring import HybridScorer
from app.core.database import SessionLocal
from app.models.models import (
    Transaction as DBTransaction,
    FraudEvaluation,
    FeatureAttribution,
)


api_router = APIRouter()

# Initialize services once
ml_service = MLService()
rule_engine = RuleEngine()
hybrid_scorer = HybridScorer()

# Initialize ML model
ml_service.initialize()


@api_router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Fraud-Shield API",
    }


@api_router.post(
    "/transactions/analyze",
    response_model=FraudCheckResponse,
)
def analyze_transaction(transaction: TransactionCreate):
    """
    Analyze a transaction using:
    1. Machine Learning
    2. Business Rules
    3. Hybrid Risk Scoring
    4. PostgreSQL persistence

    Returns an explainable fraud decision.
    """

    transaction_data = transaction.model_dump()
    db: Session = SessionLocal()

    try:
        # ---------------------------------------------------------
        # 1. ML prediction
        # ---------------------------------------------------------
        ml_result = ml_service.predict(transaction_data)

        # ---------------------------------------------------------
        # 2. Rule-based evaluation
        # ---------------------------------------------------------
        rule_result = rule_engine.evaluate(transaction_data)

        # ---------------------------------------------------------
        # 3. Hybrid scoring
        # ---------------------------------------------------------
        hybrid_result = hybrid_scorer.score(
            ml_risk_score=ml_result["ml_risk_score"],
            rule_score=rule_result["rule_score"],
        )

        final_risk_score = int(
            round(hybrid_result["final_risk_score"])
        )

        # ---------------------------------------------------------
        # 4. Convert ML explanations to API risk factors
        # ---------------------------------------------------------
        risk_factors = []

        for explanation in ml_result.get("explanations", []):
            risk_factors.append({
                "feature": explanation["feature"],
                "impact": explanation["impact_points"],
                "direction": explanation["direction"],
                "explanation": explanation["explanation"],
            })

        # ---------------------------------------------------------
        # 5. Save transaction
        # ---------------------------------------------------------
        db_transaction = DBTransaction(
            transaction_id=transaction.transaction_id,
            amount=transaction.amount,
            currency=transaction.currency,
            transaction_type=transaction.transaction_type,
            merchant_category=transaction.merchant_category,
            merchant_name=None,
            ip_address=transaction.ip_address,
            device_type=transaction.device_type,
            international_transfer=transaction.international_transfer,
            new_recipient=transaction.new_recipient,
            transaction_frequency=transaction.transaction_frequency,
            new_device=transaction.is_new_device,
            user_id=1,
            risk_score=final_risk_score,
            risk_level=hybrid_result["risk_level"],
            verdict=hybrid_result["verdict"],
            confidence=ml_result["fraud_probability"],
            recommended_action=hybrid_result["recommended_action"],
            created_at=datetime.utcnow(),
        )

        db.add(db_transaction)
        db.flush()

        # ---------------------------------------------------------
        # 6. Save fraud evaluation
        # ---------------------------------------------------------
        evaluation = FraudEvaluation(
            transaction_id=transaction.transaction_id,
            risk_score=final_risk_score,
            risk_level=hybrid_result["risk_level"],
            verdict=hybrid_result["verdict"],
            confidence=ml_result["fraud_probability"],
            recommended_action=hybrid_result["recommended_action"],
            model_version=ml_result["model_version"],
        )

        db.add(evaluation)
        db.flush()

        # ---------------------------------------------------------
        # 7. Save feature attributions
        # ---------------------------------------------------------
        for explanation in ml_result.get("explanations", []):
            attribution = FeatureAttribution(
                evaluation_id=evaluation.id,
                feature_name=explanation["feature"],
                feature_label=explanation["feature_label"],
                shap_value=explanation["shap_value"],
                impact_points=explanation["impact_points"],
                direction=explanation["direction"],
                explanation=explanation["explanation"],
            )

            db.add(attribution)

        # ---------------------------------------------------------
        # 8. Commit everything
        # ---------------------------------------------------------
        db.commit()

        # ---------------------------------------------------------
        # 9. Return final API response
        # ---------------------------------------------------------
        return {
            "transaction_id": transaction.transaction_id,
            "risk_score": final_risk_score,
            "risk_level": hybrid_result["risk_level"],
            "verdict": hybrid_result["verdict"],
            "confidence": ml_result["fraud_probability"],
            "recommended_action": hybrid_result["recommended_action"],
            "risk_factors": risk_factors,
            "triggered_rules": rule_result["triggered_rules"],
            "model_version": ml_result["model_version"],
            "evaluated_at": datetime.utcnow().isoformat(),
        }

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Transaction analysis failed: {str(exc)}",
        )

    finally:
        db.close()
