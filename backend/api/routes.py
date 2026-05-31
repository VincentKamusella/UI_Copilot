"""FastAPI route handlers."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from openai import AsyncOpenAI

from ..core.audit import run_image_audit, run_url_audit
from ..models.schemas import AuditResponse, AuditURLRequest

router = APIRouter(prefix="/api", tags=["audit"])


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/audit/url", response_model=AuditResponse)
async def audit_url(body: AuditURLRequest, request: Request):
    client: AsyncOpenAI = request.app.state.openai_client
    model: str = request.app.state.openai_model

    try:
        report = await run_url_audit(
            url=body.url,
            openai_client=client,
            model=model,
            persona_hint=body.persona_hint,
        )
        return AuditResponse(success=True, report=report)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.post("/audit/image", response_model=AuditResponse)
async def audit_image(
    request: Request,
    file: UploadFile = File(..., description="PNG, JPEG, or WebP screenshot"),
    persona_hint: str = Form(default="", description="Optional persona context"),
):
    if file.content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only PNG, JPEG, and WebP images are accepted.",
        )

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB guard
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be under 10 MB.",
        )

    client: AsyncOpenAI = request.app.state.openai_client
    model: str = request.app.state.openai_model

    try:
        report = await run_image_audit(
            image_bytes=image_bytes,
            openai_client=client,
            model=model,
            persona_hint=persona_hint or None,
        )
        return AuditResponse(success=True, report=report)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
