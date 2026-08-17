from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pwdlib import PasswordHash
import jwt
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.schemas.transaction import (
    TransactionCreate,
    FraudCheckResponse,
)
from app.schemas.auth import LoginRequest, LoginResponse
from app.services.ml_service import MLService
from app.services.rule_engine import RuleEngine
from app.utils.hybrid_scoring import HybridScorer
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.models import (
    Transaction as DBTransaction,
    FraudEvaluation,
    FeatureAttribution,
    User,
)


api_router = APIRouter()

password_hash = PasswordHash.recommended()

# Initialize services once
ml_service = MLService()
rule_engine = RuleEngine()
hybrid_scorer = HybridScorer()

# Initialize ML model
ml_service.initialize()


@api_router.post("/auth/login", response_model=LoginResponse)
def login(request: LoginRequest):
    """Authenticate user and return a JWT access token."""
    db: Session = SessionLocal()

    try:
        user = (
            db.query(User)
            .filter(User.email == request.email)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password",
            )

        if not password_hash.verify(
            request.password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password",
            )

        payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
        }

        token = jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

        return LoginResponse(
            access_token=token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            role=user.role,
        )

    finally:
        db.close()


@api_router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Fraud-Shield API",
    }



@api_router.get("/analytics/summary")
def analytics_summary():
    """Dashboard KPI summary from persisted transactions."""
    db: Session = SessionLocal()
    try:
        total = db.query(func.count(DBTransaction.id)).scalar() or 0
        fraud = (
            db.query(func.count(DBTransaction.id))
            .filter(func.lower(DBTransaction.verdict).in_(["fraud", "blocked"]))
            .scalar()
            or 0
        )
        suspicious = (
            db.query(func.count(DBTransaction.id))
            .filter(func.lower(DBTransaction.risk_level).in_(["high", "critical", "medium"]))
            .scalar()
            or 0
        )
        safe = max(total - suspicious, 0)

        avg_risk = db.query(func.avg(DBTransaction.risk_score)).scalar()
        avg_probability = db.query(func.avg(DBTransaction.confidence)).scalar()
        total_amount = db.query(func.sum(DBTransaction.amount)).scalar() or 0

        high_risk = (
            db.query(func.count(DBTransaction.id))
            .filter(DBTransaction.risk_score >= 70)
            .scalar()
            or 0
        )

        critical = (
            db.query(func.count(DBTransaction.id))
            .filter(DBTransaction.risk_score >= 90)
            .scalar()
            or 0
        )

        return {
            "total_transactions": total,
            "safe_transactions": safe,
            "suspicious_transactions": suspicious,
            "fraud_detected": fraud,
            "overall_risk_score": round(float(avg_risk or 0), 2),
            "avg_fraud_probability": round(float(avg_probability or 0), 4),
            "fraud_percentage": round((fraud / total * 100) if total else 0, 2),
            "high_risk_transactions": high_risk,
            "critical_risk_transactions": critical,
            "total_amount": float(total_amount),
            "blocked_amount": float(total_amount) if fraud else 0,
        }
    finally:
        db.close()


@api_router.get("/analytics")
def analytics():
    """Dashboard and Analytics page datasets from persisted transactions."""
    db: Session = SessionLocal()

    try:
        total = db.query(func.count(DBTransaction.id)).scalar() or 0
        avg_risk = db.query(func.avg(DBTransaction.risk_score)).scalar() or 0

        # ---------------------------------------------------------
        # Risk distribution
        # ---------------------------------------------------------
        risk_rows = (
            db.query(
                DBTransaction.risk_level,
                func.count(DBTransaction.id),
            )
            .group_by(DBTransaction.risk_level)
            .all()
        )

        risk_distribution = [
            {
                "name": level or "Unknown",
                "value": int(count),
            }
            for level, count in risk_rows
        ]

        # ---------------------------------------------------------
        # Transaction volume by channel/type
        # ---------------------------------------------------------
        type_rows = (
            db.query(
                DBTransaction.transaction_type,
                func.count(DBTransaction.id),
                func.sum(
                    case(
                        (
                            func.lower(DBTransaction.verdict).in_(
                                ["fraud", "blocked"]
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
            )
            .group_by(DBTransaction.transaction_type)
            .all()
        )

        volume_by_type = [
            {
                "type": tx_type or "Unknown",
                "volume": int(volume or 0),
                "fraud": int(fraud or 0),
            }
            for tx_type, volume, fraud in type_rows
        ]

        # ---------------------------------------------------------
        # Daily transaction activity
        # ---------------------------------------------------------
        activity_rows = (
            db.query(
                func.date(DBTransaction.created_at),
                func.count(DBTransaction.id),
                func.sum(
                    case(
                        (
                            func.lower(DBTransaction.verdict).in_(
                                ["fraud", "blocked"]
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
            )
            .group_by(func.date(DBTransaction.created_at))
            .order_by(func.date(DBTransaction.created_at))
            .all()
        )

        transaction_activity = [
            {
                "time": str(day),
                "transactions": int(volume or 0),
                "flagged": int(flagged or 0),
            }
            for day, volume, flagged in activity_rows
        ]

        # ---------------------------------------------------------
        # Monthly fraud trend
        # ---------------------------------------------------------
        trend_rows = (
            db.query(
                func.date_trunc("month", DBTransaction.created_at),
                func.count(DBTransaction.id),
                func.sum(
                    case(
                        (
                            func.lower(DBTransaction.verdict).in_(
                                ["fraud", "blocked"]
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
            )
            .group_by(func.date_trunc("month", DBTransaction.created_at))
            .order_by(func.date_trunc("month", DBTransaction.created_at))
            .all()
        )

        fraud_trend = [
            {
                "month": month.strftime("%Y-%m") if month else "Unknown",
                "fraud": int(fraud or 0),
                "genuine": int((volume or 0) - (fraud or 0)),
                "rate": round(
                    ((fraud or 0) / volume * 100) if volume else 0,
                    2,
                ),
            }
            for month, volume, fraud in trend_rows
        ]

        # ---------------------------------------------------------
        # Hourly risk analysis
        # ---------------------------------------------------------
        hourly_rows = (
            db.query(
                func.extract("hour", DBTransaction.created_at),
                func.avg(DBTransaction.risk_score),
                func.count(DBTransaction.id),
            )
            .group_by(func.extract("hour", DBTransaction.created_at))
            .order_by(func.extract("hour", DBTransaction.created_at))
            .all()
        )

        hourly_risk = [
            {
                "hour": f"{int(hour):02d}:00",
                "avg_risk": round(float(avg_risk or 0), 2),
                "volume": int(volume or 0),
            }
            for hour, avg_risk, volume in hourly_rows
        ]

        # ---------------------------------------------------------
        # Device risk statistics
        # ---------------------------------------------------------
        device_rows = (
            db.query(
                DBTransaction.device_type,
                func.avg(DBTransaction.risk_score),
                func.count(DBTransaction.id),
            )
            .filter(DBTransaction.device_type.isnot(None))
            .group_by(DBTransaction.device_type)
            .order_by(func.avg(DBTransaction.risk_score).desc())
            .all()
        )

        device_risk = [
            {
                "device": device or "Unknown",
                "risk": round(float(avg_risk or 0), 2),
                "transactions": int(volume or 0),
            }
            for device, avg_risk, volume in device_rows
        ]

        # ---------------------------------------------------------
        # Location risk statistics
        #
        # location is currently stored in the API schema but not
        # persisted as a DB column. Use merchant_category as the
        # available persisted geographic/category dimension until
        # a location column is added to transactions.
        # ---------------------------------------------------------
        location_rows = (
            db.query(
                DBTransaction.location,
                func.avg(DBTransaction.risk_score),
                func.sum(
                    case(
                        (
                            func.lower(DBTransaction.verdict).in_(
                                ["fraud", "blocked"]
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                func.count(DBTransaction.id),
            )
            .filter(DBTransaction.location.isnot(None))
            .group_by(DBTransaction.location)
            .order_by(func.avg(DBTransaction.risk_score).desc())
            .all()
        )

        location_risk = [
            {
                "location": category or "Unknown",
                "risk": round(float(avg_risk or 0), 2),
                "fraud": int(fraud or 0),
                "transactions": int(volume or 0),
            }
            for category, avg_risk, fraud, volume in location_rows
        ]

        # ---------------------------------------------------------
        # Top suspicious merchants
        #
        # Group by the actual merchant name stored on the
        # transaction, not merchant category.
        # ---------------------------------------------------------
        merchant_rows = (
            db.query(
                DBTransaction.merchant_name,
                func.avg(DBTransaction.risk_score),
                func.count(DBTransaction.id),
                func.sum(
                    case(
                        (
                            func.lower(DBTransaction.verdict).in_(
                                ["fraud", "blocked"]
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
            )
            .filter(DBTransaction.merchant_name.isnot(None))
            .group_by(DBTransaction.merchant_name)
            .order_by(
                func.sum(
                    case(
                        (
                            func.lower(DBTransaction.verdict).in_(
                                ["fraud", "blocked"]
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ).desc()
            )
            .limit(10)
            .all()
        )

        top_merchants = [
            {
                "merchant": merchant or "Unknown",
                "name": merchant or "Unknown",
                "risk": round(float(avg_risk or 0), 2),
                "transactions": int(volume or 0),
                "fraud": int(fraud or 0),
            }
            for merchant, avg_risk, volume, fraud in merchant_rows
        ]

        # ---------------------------------------------------------
        # Model information
        #
        # Model versions are stored in fraud_evaluations.
        # ---------------------------------------------------------
        model_rows = (
            db.query(
                FraudEvaluation.model_version,
                func.count(FraudEvaluation.id),
                func.avg(FraudEvaluation.risk_score),
                func.avg(FraudEvaluation.confidence),
            )
            .filter(FraudEvaluation.model_version.isnot(None))
            .group_by(FraudEvaluation.model_version)
            .order_by(func.count(FraudEvaluation.id).desc())
            .all()
        )

        models = [
            {
                "model_version": version,
                "version": version,
                "evaluations": int(evaluations or 0),
                "avg_risk": round(float(avg_risk or 0), 2),
                "avg_confidence": round(float(confidence or 0), 4),
            }
            for version, evaluations, avg_risk, confidence in model_rows
        ]

        high_risk = (
            db.query(func.count(DBTransaction.id))
            .filter(DBTransaction.risk_score >= 70)
            .scalar()
            or 0
        )

        fraud_total = sum(item["fraud"] for item in fraud_trend)

        return {
            "stats": {
                "total_transactions": int(total),
                "overall_risk_score": round(float(avg_risk), 2),
                "fraud_percentage": round(
                    (fraud_total / total * 100) if total else 0,
                    2,
                ),
                "high_risk_transactions": int(high_risk),
            },
            "risk_distribution": risk_distribution,
            "transaction_activity": transaction_activity,
            "fraud_trend": fraud_trend,
            "volume_by_type": volume_by_type,
            "hourly_risk": hourly_risk,
            "device_risk": device_risk,
            "location_risk": location_risk,
            "top_merchants": top_merchants,
            "models": models,
        }

    finally:
        db.close()


@api_router.get("/transactions/{id}")
def get_transaction(id: int):
    """Return a single transaction by database ID."""
    db: Session = SessionLocal()

    try:
        row = (
            db.query(DBTransaction)
            .filter(DBTransaction.id == id)
            .first()
        )

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Transaction not found",
            )

        return {
            "id": row.id,
            "transaction_id": row.transaction_id,
            "amount": row.amount,
            "currency": row.currency,
            "transaction_type": row.transaction_type,
            "merchant_category": row.merchant_category,
            "merchant_name": row.merchant_name,
            "location": row.location,
            "ip_address": row.ip_address,
            "device_type": row.device_type,
            "international_transfer": row.international_transfer,
            "new_recipient": row.new_recipient,
            "transaction_frequency": row.transaction_frequency,
            "new_device": row.new_device,
            "user_id": row.user_id,
            "risk_score": row.risk_score,
            "risk_level": row.risk_level,
            "verdict": row.verdict,
            "confidence": row.confidence,
            "recommended_action": row.recommended_action,
            "created_at": (
                row.created_at.isoformat()
                if row.created_at
                else None
            ),
        }

    finally:
        db.close()


@api_router.get("/transactions")
def get_transactions(
    limit: int = Query(20, ge=1, le=100),
    page_size: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
    sort: str = Query("date_desc"),
):
    """Return recent scored transactions for Dashboard/History."""
    db: Session = SessionLocal()
    try:
        size = min(limit, page_size)

        query = db.query(DBTransaction)

        if sort == "date_asc":
            query = query.order_by(DBTransaction.created_at.asc())
        else:
            query = query.order_by(DBTransaction.created_at.desc())

        total = query.count()
        offset = (page - 1) * size

        rows = query.offset(offset).limit(size).all()

        items = [
            {
                "id": row.id,
                "transaction_id": row.transaction_id,
                "amount": row.amount,
                "currency": row.currency,
                "transaction_type": row.transaction_type,
                "merchant_category": row.merchant_category,
                "device_type": row.device_type,
                "risk_score": row.risk_score,
                "risk_level": row.risk_level,
                "verdict": row.verdict,
                "confidence": row.confidence,
                "recommended_action": row.recommended_action,
                "created_at": row.created_at.isoformat()
                if row.created_at
                else None,
            }
            for row in rows
        ]

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": size,
            "total_pages": (total + size - 1) // size if total else 0,
        }
    finally:
        db.close()


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
            merchant_name=transaction.merchant_name,
            location=transaction.location,
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
