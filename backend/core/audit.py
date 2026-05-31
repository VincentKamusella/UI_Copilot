"""Orchestration: browser crawl → vision analysis → AuditReport."""

from __future__ import annotations

import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Optional

from openai import AsyncOpenAI

from ..models.schemas import AuditReport
from .browser import capture_image_bytes, crawl_journey
from .vision import analyze


async def run_url_audit(
    url: str,
    openai_client: AsyncOpenAI,
    model: str,
    persona_hint: Optional[str] = None,
    project_description: Optional[str] = None,
) -> AuditReport:
    page_captures = await crawl_journey(url)

    pages = [
        {
            "url": p.url,
            "title": p.title,
            "trigger": p.trigger,
            "screenshot_b64": p.screenshot_b64,
            "dom": asdict(p.dom),
        }
        for p in page_captures
    ]

    summary, steps, a11y, coverage_gaps = await analyze(
        pages=pages,
        persona_hint=persona_hint,
        project_description=project_description,
        model=model,
        client=openai_client,
    )

    return AuditReport(
        audit_id=str(uuid.uuid4()),
        source_url=page_captures[0].url,
        source_type="url",
        page_title=page_captures[0].title or None,
        created_at=datetime.now(timezone.utc),
        summary=summary,
        user_story_timeline=steps,
        accessibility_issues=a11y,
        coverage_gaps=coverage_gaps,
        pages_crawled=len(page_captures),
        dom_element_count=page_captures[0].dom.total_elements,
        screenshot_captured=True,
    )


async def run_image_audit(
    images: list[bytes],
    openai_client: AsyncOpenAI,
    model: str,
    persona_hint: Optional[str] = None,
    project_description: Optional[str] = None,
) -> AuditReport:
    total = len(images)
    pages = [
        {
            "url": None,
            "title": None,
            "trigger": f"Screenshot {i + 1} of {total}" if total > 1 else "Uploaded screenshot",
            "screenshot_b64": capture_image_bytes(img),
            "dom": None,
        }
        for i, img in enumerate(images)
    ]

    summary, steps, a11y, coverage_gaps = await analyze(
        pages=pages,
        persona_hint=persona_hint,
        project_description=project_description,
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
        coverage_gaps=coverage_gaps,
        pages_crawled=total,
        dom_element_count=None,
        screenshot_captured=True,
    )
