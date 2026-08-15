from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

# Default to PostgreSQL
DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/fraud_shield"

# Allow SQLite fallback only for local development/tests when explicitly enabled
USE_SQLITE = os.getenv("USE_SQLITE_FALLBACK", "false").lower() == "true"
if USE_SQLITE:
    DATABASE_URL = os.getenv("SQLITE_URL", "sqlite:///./fraud_shield_dev.db")
    logger.warning("Using SQLite fallback for development/testing!")
else:
    DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Create all tables based on defined models.
    """
    try:
        from app.models.models import Base as ModelsBase
        ModelsBase.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise

if __name__ == "__main__":
    init_db()