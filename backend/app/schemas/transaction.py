from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class TransactionBase(BaseModel):
    transaction_id: str = Field(..., example="TXN-123456")
    amount: float = Field(..., gt=0, example=45000)
    currency: str = Field(..., example="INR")
    transaction_type: str = Field(..., example="Online Purchase")
    merchant_category: str = Field(..., example="Electronics")
    location: str = Field(..., example="Mumbai")
    ip_address: str = Field(..., example="192.168.1.1")
    device_type: str = Field(..., example="Mobile App")
    international_transfer: bool = Field(..., example=False)
    new_recipient: bool = Field(..., example=False)
    transaction_frequency: int = Field(..., ge=0, example=5)
    is_new_device: bool = Field(..., example=False)

class TransactionCreate(TransactionBase):
    pass

class TransactionInDB(TransactionBase):
    id: int
    evaluated_at: datetime

    class Config:
        from_attributes = True

class FeatureAttributionBase(BaseModel):
    feature_name: str
    feature_label: str
    shap_value: float
    impact_points: float
    direction: str
    explanation: str

class FeatureAttributionCreate(FeatureAttributionBase):
    evaluation_id: int

class FraudEvaluationBase(BaseModel):
    transaction_id: str
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: str
    verdict: str
    confidence: float = Field(..., ge=0, le=1)
    recommended_action: str
    model_version: str
    rule_score: int
    ml_probability: float

class FraudEvaluationCreate(FraudEvaluationBase):
    pass

class FraudEvaluationInDB(FraudEvaluationBase):
    id: int
    created_at: datetime
    attributions: List[FeatureAttributionBase] = []

    class Config:
        from_attributes = True

class RiskFactor(BaseModel):
    feature: str
    impact: float
    direction: str
    explanation: str

class TriggeredRule(BaseModel):
    rule: str
    impact: float
    reason: str

class FraudCheckResponse(BaseModel):
    transaction_id: str
    risk_score: int
    risk_level: str
    verdict: str
    confidence: float
    recommended_action: str
    risk_factors: List[RiskFactor]
    triggered_rules: List[TriggeredRule]
    model_version: str
    evaluated_at: str