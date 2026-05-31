"""Audit history endpoints — list, fetch, delete."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException

from ..db import delete_audit, delete_user_audits, get_audit, list_audits
from .deps import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
def get_history(user: dict = Depends(get_current_user)):
    return list_audits(user["id"])


@router.get("/{audit_id}")
def get_one(audit_id: str, user: dict = Depends(get_current_user)):
    row = get_audit(audit_id, user["id"])
    if not row:
        raise HTTPException(status_code=404, detail="Audit not found.")
    return json.loads(row["report_json"])


@router.delete("")
def clear_history(user: dict = Depends(get_current_user)):
    count = delete_user_audits(user["id"])
    return {"deleted": count}


@router.delete("/{audit_id}")
def delete_one(audit_id: str, user: dict = Depends(get_current_user)):
    if not delete_audit(audit_id, user["id"]):
        raise HTTPException(status_code=404, detail="Audit not found.")
    return {"deleted": 1}
