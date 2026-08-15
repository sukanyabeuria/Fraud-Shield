import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Fraud-Shield"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/fraud_shield")
    USE_SQLITE_FALLBACK: bool = os.getenv("USE_SQLITE_FALLBACK", "false").lower() == "true"

    MODEL_PATH: str = "ml/artifacts/xgboost_model.pkl"
    SHAP_EXPLAINER_PATH: str = "ml/artifacts/shap_explainer.pkl"
    MODEL_VERSION: str = "fraud-shield-xgboost-v1.0"

    # Hybrid scoring weights
    ML_WEIGHT: float = 0.70
    RULE_WEIGHT: float = 0.30

    # Decision thresholds
    LOW_RISK_THRESHOLD: int = 40
    HIGH_RISK_THRESHOLD: int = 70
    CRITICAL_RISK_THRESHOLD: int = 90

settings = Settings()