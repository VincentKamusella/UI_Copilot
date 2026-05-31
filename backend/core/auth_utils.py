"""Password hashing, JWT creation/validation, field validation."""

from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

_SECRET = os.getenv("JWT_SECRET", "ui-copilot-dev-secret-change-in-prod")
_ALGO = "HS256"
_EXPIRE_DAYS = 7


# ── Validation ────────────────────────────────────────────────────────────────

def validate_username(v: str) -> Optional[str]:
    if not (4 <= len(v) <= 20):
        return "Username must be 4–20 characters."
    if not re.match(r"^[a-zA-Z0-9_]+$", v):
        return "Username may only contain letters, numbers, and underscores."
    return None


def validate_password(v: str) -> Optional[str]:
    if not (4 <= len(v) <= 20):
        return "Password must be 4–20 characters."
    if not re.search(r"[a-zA-Z]", v):
        return "Password must contain at least one letter."
    if not re.search(r"[0-9]", v):
        return "Password must contain at least one number."
    return None


def validate_email(v: str) -> Optional[str]:
    if v.count("@") != 1:
        return "Email must contain exactly one @."
    local, domain = v.split("@")
    if not local:
        return "Email address before @ cannot be empty."
    if "." not in domain:
        return "Email domain must include a valid extension."
    tld = domain.rsplit(".", 1)[-1]
    if len(tld) < 2:
        return "Email domain extension must be at least 2 characters (e.g. .com, .io)."
    return None


# ── Password ──────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_token(user_id: int, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=_EXPIRE_DAYS)
    return jwt.encode(
        {"sub": str(user_id), "username": username, "exp": expire},
        _SECRET,
        algorithm=_ALGO,
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, _SECRET, algorithms=[_ALGO])
    except JWTError:
        return None
