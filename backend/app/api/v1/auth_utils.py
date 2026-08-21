from fastapi import Header, HTTPException
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import User


def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
        )

    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token",
        )

    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.id == int(user_id)).first()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="User not found",
            )

        return user

    finally:
        db.close()
