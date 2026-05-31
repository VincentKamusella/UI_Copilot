"""FastAPI route handlers."""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from openai import AsyncOpenAI

from ..core.audit import run_image_audit, run_url_audit
from ..models.schemas import AuditResponse, AuditURLRequest

router = APIRouter(prefix="/api", tags=["audit"])


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
            project_description=body.project_description,
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
    files: list[UploadFile] = File(..., description="One or more PNG, JPEG, or WebP screenshots"),
    persona_hint: str = Form(default="", description="Optional persona context"),
    project_description: str = Form(default="", description="Optional project description"),
):
    if not files:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one image is required.",
        )

    images: list[bytes] = []
    for f in files:
        if f.content_type not in {"image/png", "image/jpeg", "image/webp"}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{f.filename}: only PNG, JPEG, and WebP images are accepted.",
            )
        data = await f.read()
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"{f.filename}: image must be under 10 MB.",
            )
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
        return AuditResponse(success=True, report=report)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
