from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(50), nullable=False, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship(
        "Transaction",
        back_populates="user",
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    transaction_id = Column(String, unique=True, index=True)

    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)
    transaction_type = Column(String, nullable=False)

    merchant_category = Column(String)
    merchant_name = Column(String)

    ip_address = Column(String)
    device_type = Column(String)

    international_transfer = Column(Boolean, default=False)
    new_recipient = Column(Boolean, default=False)
    transaction_frequency = Column(Integer, nullable=False)
    new_device = Column(Boolean, default=False)

    merchant_id = Column(Integer)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )

    created_at = Column(DateTime, default=datetime.utcnow)

    risk_score = Column(Integer, nullable=False, default=0)
    risk_level = Column(String, nullable=False)
    verdict = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    recommended_action = Column(String)

    user = relationship(
        "User",
        back_populates="transactions",
    )

    fraud_evaluations = relationship(
        "FraudEvaluation",
        primaryjoin="Transaction.transaction_id == foreign(FraudEvaluation.transaction_id)",
        back_populates="transaction",
    )


class FraudEvaluation(Base):
    __tablename__ = "fraud_evaluations"

    id = Column(Integer, primary_key=True)

    transaction_id = Column(
        String,
        nullable=False,
    )

    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String, nullable=False)
    verdict = Column(String, nullable=False)

    confidence = Column(Float, nullable=True)
    recommended_action = Column(String)

    model_version = Column(String)

    transaction = relationship(
        "Transaction",
        primaryjoin="foreign(FraudEvaluation.transaction_id) == Transaction.transaction_id",
        back_populates="fraud_evaluations",
    )

    attributions = relationship(
        "FeatureAttribution",
        back_populates="evaluation",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return (
            f"<FraudEvaluation("
            f"id={self.id}, "
            f"transaction_id={self.transaction_id})>"
        )


class FeatureAttribution(Base):
    __tablename__ = "feature_attributions"

    id = Column(Integer, primary_key=True)

    evaluation_id = Column(
        Integer,
        ForeignKey("fraud_evaluations.id"),
        nullable=False,
    )

    feature_name = Column(String, nullable=False)
    feature_label = Column(String, nullable=False)

    shap_value = Column(Float, nullable=False)
    impact_points = Column(Float, nullable=False)

    direction = Column(String, nullable=False)
    explanation = Column(Text, nullable=False)

    evaluation = relationship(
        "FraudEvaluation",
        back_populates="attributions",
    )
