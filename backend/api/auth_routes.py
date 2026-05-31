"""Auth endpoints — register, login, me."""

from __future__ import annotations

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
from ..db import create_user, get_user_by_email, get_user_by_username
from .deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str
    email: str


@router.post("/register", response_model=AuthResponse)
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

    user = create_user(body.username, body.email, hash_password(body.password))
    return AuthResponse(
        token=create_token(user["id"], user["username"]),
        username=user["username"],
        email=user["email"],
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    user = get_user_by_username(body.username)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password.")
    return AuthResponse(
        token=create_token(user["id"], user["username"]),
        username=user["username"],
        email=user["email"],
    )


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {"username": user["username"], "email": user["email"]}
