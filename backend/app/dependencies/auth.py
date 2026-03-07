from dataclasses import dataclass
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.config import settings
from app.database import get_db

_bearer = HTTPBearer()


@dataclass
class AuthUser:
    id: str
    email: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> AuthUser:
    token = credentials.credentials

    try:
        db = get_db()
        response = db.auth.get_user(token)
        user = response.user
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    # Email whitelist check
    allowed = [e.strip() for e in settings.allowed_emails.split(",") if e.strip()]
    if allowed and user.email not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return AuthUser(id=str(user.id), email=user.email or "")
