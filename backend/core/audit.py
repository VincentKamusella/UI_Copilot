"""Orchestration: browser capture → vision analysis → AuditReport."""

from __future__ import annotations

import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Optional

from openai import AsyncOpenAI

from ..models.schemas import AuditReport
from .browser import BrowserCapture, capture_image_bytes, capture_url
from .vision import analyze


async def run_url_audit(
    url: str,
    openai_client: AsyncOpenAI,
    model: str,
    persona_hint: Optional[str] = None,
) -> AuditReport:
    capture: BrowserCapture = await capture_url(url)
    dom_dict = asdict(capture.dom)

    summary, steps, a11y = await analyze(
        screenshot_b64=capture.screenshot_b64,
        dom=dom_dict,
        persona_hint=persona_hint,
        model=model,
        client=openai_client,
    )

    return AuditReport(
        audit_id=str(uuid.uuid4()),
        source_url=capture.page_url,
        source_type="url",
        page_title=capture.dom.title or None,
        created_at=datetime.now(timezone.utc),
        summary=summary,
        user_story_timeline=steps,
        accessibility_issues=a11y,
        dom_element_count=capture.dom.total_elements,
        screenshot_captured=True,
    )


async def run_image_audit(
    image_bytes: bytes,
    openai_client: AsyncOpenAI,
    model: str,
    persona_hint: Optional[str] = None,
) -> AuditReport:
    screenshot_b64 = capture_image_bytes(image_bytes)

    summary, steps, a11y = await analyze(
        screenshot_b64=screenshot_b64,
        dom=None,  # no DOM available for uploaded images
        persona_hint=persona_hint,
        model=model,
        client=openai_client,
    )

    return AuditReport(
        audit_id=str(uuid.uuid4()),
        source_url=None,
        source_type="image",
        page_title=None,
        created_at=datetime.now(timezone.utc),
        summary=summary,
        user_story_timeline=steps,
        accessibility_issues=a11y,
        dom_element_count=None,
        screenshot_captured=True,
    )
