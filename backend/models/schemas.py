from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, HttpUrl, field_validator


class FrictionSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class UserStoryStep(BaseModel):
    step: int
    persona: str
    action: str
    system_response: str
    friction_point: str
    friction_severity: FrictionSeverity
    emotional_state: str
    ux_recommendation: str


class AccessibilityIssue(BaseModel):
    element: str
    issue: str
    wcag_criterion: str
    severity: FrictionSeverity


class AuditSummary(BaseModel):
    overall_ux_score: int  # 0–100
    critical_issues: int
    high_issues: int
    medium_issues: int
    low_issues: int
    top_recommendation: str
    persona_description: str


class AuditReport(BaseModel):
    audit_id: str
    source_url: Optional[str] = None
    source_type: str  # "url" | "image"
    page_title: Optional[str] = None
    created_at: datetime
    summary: AuditSummary
    user_story_timeline: list[UserStoryStep]
    accessibility_issues: list[AccessibilityIssue]
    dom_element_count: Optional[int] = None
    screenshot_captured: bool = False


# --- Request / Response wrappers ---


class AuditURLRequest(BaseModel):
    url: str
    persona_hint: Optional[str] = None

    @field_validator("url")
    @classmethod
    def must_be_http(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class AuditResponse(BaseModel):
    success: bool
    report: Optional[AuditReport] = None
    error: Optional[str] = None
