"""Auth endpoints — register, login, verify, me."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..core.auth_utils import (
    create_token,
    hash_password,
    validate_email,
    validate_password,
    validate_username,
    verify_password,
)
from ..db import (
    create_user,
    get_user_by_email,
    get_user_by_username,
    verify_user_by_token,
)
from .deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

_FRONTEND_URL = "http://localhost:5173"


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    login: str   # accepts username OR email
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str
    email: str


class RegisterResponse(BaseModel):
    pending: bool
    message: str


@router.post("/register", response_model=RegisterResponse)
def register(body: RegisterRequest):
    for err in [
        validate_username(body.username),
        validate_password(body.password),
        validate_email(body.email),
    ]:
        if err:
            raise HTTPException(status_code=422, detail=err)

    if get_user_by_username(body.username):
        raise HTTPException(status_code=409, detail="Username already taken.")
    if get_user_by_email(body.email.lower()):
        raise HTTPException(status_code=409, detail="Email already registered.")

    token = secrets.token_urlsafe(32)
    create_user(body.username, body.email, hash_password(body.password), token)

    link = f"{_FRONTEND_URL}/?verify={token}"
    print(f"\n{'='*60}")
    print(f"  UI Copilot — verify email for '{body.username}'")
    print(f"  {link}")
    print(f"{'='*60}\n")

    return RegisterResponse(
        pending=True,
        message=f"Account created. Open the verification link printed in the server terminal to activate your account.",
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    # Accept either username or email in the login field
    if "@" in body.login:
        user = get_user_by_email(body.login.lower())
    else:
        user = get_user_by_username(body.login)

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    if not user["verified"]:
        raise HTTPException(status_code=403, detail="Please verify your email before signing in.")

    return AuthResponse(
        token=create_token(user["id"], user["username"]),
        username=user["username"],
        email=user["email"],
    )


@router.get("/verify/{token}")
def verify_email(token: str):
    user = verify_user_by_token(token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or already used verification link.")
    return {"verified": True, "username": user["username"]}


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {"username": user["username"], "email": user["email"]}
