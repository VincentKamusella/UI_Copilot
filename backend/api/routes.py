"""FastAPI route handlers."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from openai import AsyncOpenAI

from ..core.audit import run_image_audit, run_url_audit
from ..db import get_subscription, save_audit, use_credit
from ..models.schemas import AuditResponse, AuditURLRequest
from .deps import get_current_user

router = APIRouter(prefix="/api", tags=["audit"])


@router.get("/health")
async def health():
    return {"status": "ok"}


def _check_credits(user: dict) -> None:
    info = get_subscription(user["id"])
    if info["credits_remaining"] is not None and info["credits_remaining"] <= 0:
        raise HTTPException(
            status_code=402,
            detail=f"Monthly credit limit reached ({info['credits_limit']} audits). Upgrade your plan to continue.",
        )


@router.post("/audit/url", response_model=AuditResponse)
async def audit_url(
    body: AuditURLRequest,
    request: Request,
    user: dict = Depends(get_current_user),
):
    _check_credits(user)
    client: AsyncOpenAI = request.app.state.openai_client
    model: str = request.app.state.openai_model

    try:
        report = await run_url_audit(
            url=body.url,
            openai_client=client,
            model=model,
            persona_hint=body.persona_hint,
            project_description=body.project_description,
        )
        save_audit(
            user_id=user["id"],
            audit_id=report.audit_id,
            source_url=report.source_url,
            source_type=report.source_type,
            page_title=report.page_title,
            ux_score=report.summary.overall_ux_score,
            pages_crawled=report.pages_crawled,
            report_json=report.model_dump_json(),
        )
        use_credit(user["id"])
        return AuditResponse(success=True, report=report)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc


@router.post("/audit/image", response_model=AuditResponse)
async def audit_image(
    request: Request,
    files: list[UploadFile] = File(..., description="One or more PNG, JPEG, or WebP screenshots"),
    persona_hint: str = Form(default=""),
    project_description: str = Form(default=""),
    user: dict = Depends(get_current_user),
):
    _check_credits(user)
    if not files:
        raise HTTPException(status_code=422, detail="At least one image is required.")

    images: list[bytes] = []
    for f in files:
        if f.content_type not in {"image/png", "image/jpeg", "image/webp"}:
            raise HTTPException(status_code=422, detail=f"{f.filename}: only PNG, JPEG, and WebP images are accepted.")
        data = await f.read()
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"{f.filename}: image must be under 10 MB.")
        images.append(data)

    client: AsyncOpenAI = request.app.state.openai_client
    model: str = request.app.state.openai_model

    try:
        report = await run_image_audit(
            images=images,
            openai_client=client,
            model=model,
            persona_hint=persona_hint or None,
            project_description=project_description or None,
        )
        save_audit(
            user_id=user["id"],
            audit_id=report.audit_id,
            source_url=None,
            source_type="image",
            page_title=None,
            ux_score=report.summary.overall_ux_score,
            pages_crawled=report.pages_crawled,
            report_json=report.model_dump_json(),
        )
        use_credit(user["id"])
        return AuditResponse(success=True, report=report)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
