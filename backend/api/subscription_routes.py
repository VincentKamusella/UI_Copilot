"""Subscription endpoints — get plan, upgrade."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db import get_subscription, set_subscription
from .deps import get_current_user

router = APIRouter(prefix="/api/subscription", tags=["subscription"])

VALID_PLANS = {"free", "pro", "premium"}


class UpgradeRequest(BaseModel):
    plan: str


@router.get("")
def get_plan(user: dict = Depends(get_current_user)):
    return get_subscription(user["id"])


@router.post("/upgrade")
def upgrade_plan(body: UpgradeRequest, user: dict = Depends(get_current_user)):
    if body.plan not in VALID_PLANS:
        raise HTTPException(status_code=422, detail="Invalid plan.")
    set_subscription(user["id"], body.plan)
    return get_subscription(user["id"])
