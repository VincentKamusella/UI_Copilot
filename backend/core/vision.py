"""OpenAI Vision API integration for usability analysis."""

from __future__ import annotations

import json
from typing import Optional

from openai import AsyncOpenAI

from ..models.schemas import (
    AccessibilityIssue,
    AuditSummary,
    CoverageGap,
    FrictionSeverity,
    UserStoryStep,
)

# ---------------------------------------------------------------------------
# Pass 1 — Initial analysis prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are an expert UX researcher and accessibility auditor specializing in cognitive load analysis and Agile user story writing.

You will receive:
1. A screenshot of a webpage (or uploaded UI image)
2. A structured DOM summary (headings, buttons, inputs, links, forms, ARIA landmarks, alerts)

Your task is to produce a comprehensive usability audit formatted as a strict JSON object matching the schema below.

## Output schema

{
  "summary": {
    "overall_ux_score": <int 0-100>,
    "critical_issues": <int>,
    "high_issues": <int>,
    "medium_issues": <int>,
    "low_issues": <int>,
    "top_recommendation": "<one actionable sentence>",
    "persona_description": "<describe the likely primary user persona in 1-2 sentences>"
  },
  "user_story_timeline": [
    {
      "step": <int starting at 1>,
      "persona": "<persona label, e.g. 'New Visitor', 'Returning User'>",
      "action": "<What the user does — specific, observable>",
      "system_response": "<What the UI does in reaction>",
      "friction_point": "<Specific usability/cognitive/emotional problem encountered, or 'None' if smooth>",
      "friction_severity": "<low|medium|high|critical>",
      "emotional_state": "<e.g. 'Curious', 'Confused', 'Frustrated', 'Relieved'>",
      "ux_recommendation": "<Concrete, implementable fix for this step>"
    }
  ],
  "accessibility_issues": [
    {
      "element": "<element description>",
      "issue": "<specific accessibility problem>",
      "wcag_criterion": "<e.g. '1.1.1 Non-text Content'>",
      "severity": "<low|medium|high|critical>"
    }
  ]
}

## Coverage gap analysis

Always include a "coverage_gaps" array. Evaluate whether the UI surfaces all the use cases the product appears to support.

"coverage_gaps": [
  {
    "use_case": "<feature or user flow>",
    "finding": "<specific observation — what is missing, hidden, or unclear in the UI>",
    "severity": "<low|medium|high|critical>"
  }
]

Severity rules for coverage gaps:
- Use cases explicitly named in the project_description that are absent from the UI → high or critical
- Use cases explicitly named in the project_description that are present but hard to find → medium
- Use cases you infer from the UI context (not named in the description) that appear incomplete → low or medium
- If nothing is missing, return: "coverage_gaps": []

## Rules
- Generate 5–10 user story steps covering the realistic first-time user journey from landing to goal completion.
- Base steps on what is visually present in the screenshot AND the DOM data.
- Be specific: name actual buttons, headings, form fields you see.
- Friction points must name the precise UI element or pattern causing friction.
- UX recommendations must be actionable (not generic advice).
- Return ONLY the JSON object — no markdown fences, no commentary.
"""

# ---------------------------------------------------------------------------
# Pass 2 — Critique prompt
# ---------------------------------------------------------------------------

_CRITIQUE_PROMPT = """\
You are a senior UX audit reviewer. You will receive a usability audit JSON produced by another AI analyst.

Carefully check for the following quality issues:

1. SEVERITY_MISMATCH — friction_point is "None" but friction_severity is not "low", or friction is described as minor but labelled "critical"/"high"
2. VAGUE_FRICTION — friction_point does not name a specific UI element (e.g. "bad UX" or "confusing" with no element named)
3. GENERIC_RECOMMENDATION — ux_recommendation is non-actionable (e.g. "improve the design", "make it clearer") with no concrete change specified
4. DUPLICATE_ISSUE — the same specific problem appears in both user_story_timeline and accessibility_issues
5. SCORE_MISMATCH — overall_ux_score is inconsistent with the severity distribution (e.g. score of 90 but multiple critical issues)

Return ONLY this JSON — no commentary:
{
  "needs_revision": <true|false>,
  "issues": [
    {
      "type": "<issue type from list above>",
      "location": "<e.g. 'step 3' or 'accessibility_issues[1]'>",
      "description": "<one sentence explaining what is wrong>"
    }
  ]
}

If nothing needs fixing, return: {"needs_revision": false, "issues": []}
"""

# ---------------------------------------------------------------------------
# Pass 3 — Refinement prompt
# ---------------------------------------------------------------------------

_REFINE_PROMPT = """\
You are an expert UX researcher. Below is a usability audit JSON that a reviewer has flagged for quality issues.

Your job: fix ONLY the flagged issues and return the corrected audit as a complete JSON object in the same schema.
Do not change anything that was not flagged. Keep all unflagged steps, scores, and findings exactly as they are.

Return ONLY the corrected JSON — no markdown fences, no commentary.
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _dom_to_text(dom_dict: dict, project_description: Optional[str] = None) -> str:
    lines = []
    if project_description:
        lines += [
            "## Project description (provided by the developer)",
            project_description.strip(),
            "",
            "Use cases explicitly named above must be evaluated for UI coverage.",
            "Additional use cases inferred from the UI should also be evaluated.",
            "",
        ]
    lines += [
        f"Page title: {dom_dict.get('title', '')}",
        f"Meta description: {dom_dict.get('meta_description', '')}",
        f"Total elements: {dom_dict.get('total_elements', '?')}",
        f"Interactive elements: {dom_dict.get('total_interactive', '?')}",
        "",
        "Headings:",
        *[f"  • {h}" for h in dom_dict.get("headings", [])],
        "",
        "ARIA landmarks: " + ", ".join(dom_dict.get("aria_landmarks", [])),
        "",
        "Buttons: " + ", ".join(f'"{b}"' for b in dom_dict.get("buttons", [])),
        "",
        "Inputs:",
        *[
            f"  • type={i.get('type')} name={i.get('name')} label={i.get('label')} placeholder={i.get('placeholder')}"
            for i in dom_dict.get("inputs", [])
        ],
        "",
        "Forms:",
        *[
            f"  • action={f.get('action')} method={f.get('method')} fields={f.get('field_count')}"
            for f in dom_dict.get("forms", [])
        ],
        "",
        "Alerts/Errors visible: " + "; ".join(dom_dict.get("alerts_errors", []) or ["none"]),
        "",
        "Images (alt text): " + ", ".join(
            f'"{i.get("alt") or "(missing alt)"}"' for i in dom_dict.get("images", [])
        ),
    ]
    return "\n".join(lines)


def _parse_audit(
    data: dict,
) -> tuple[AuditSummary, list[UserStoryStep], list[AccessibilityIssue], list[CoverageGap]]:
    summary_data = data.get("summary", {})
    summary = AuditSummary(
        overall_ux_score=int(summary_data.get("overall_ux_score", 50)),
        critical_issues=int(summary_data.get("critical_issues", 0)),
        high_issues=int(summary_data.get("high_issues", 0)),
        medium_issues=int(summary_data.get("medium_issues", 0)),
        low_issues=int(summary_data.get("low_issues", 0)),
        top_recommendation=summary_data.get("top_recommendation", ""),
        persona_description=summary_data.get("persona_description", ""),
    )
    steps = [
        UserStoryStep(
            step=s["step"],
            persona=s.get("persona", "User"),
            action=s["action"],
            system_response=s["system_response"],
            friction_point=s["friction_point"],
            friction_severity=FrictionSeverity(s.get("friction_severity", "low")),
            emotional_state=s.get("emotional_state", "Neutral"),
            ux_recommendation=s["ux_recommendation"],
        )
        for s in data.get("user_story_timeline", [])
    ]
    accessibility = [
        AccessibilityIssue(
            element=a["element"],
            issue=a["issue"],
            wcag_criterion=a.get("wcag_criterion", ""),
            severity=FrictionSeverity(a.get("severity", "low")),
        )
        for a in data.get("accessibility_issues", [])
    ]
    coverage_gaps = [
        CoverageGap(
            use_case=g["use_case"],
            finding=g["finding"],
            severity=FrictionSeverity(g.get("severity", "low")),
        )
        for g in data.get("coverage_gaps", [])
    ]
    return summary, steps, accessibility, coverage_gaps


# ---------------------------------------------------------------------------
# Main analysis function — 3-pass self-critique loop
# ---------------------------------------------------------------------------


async def analyze(
    screenshot_b64: str,
    dom: Optional[dict],
    persona_hint: Optional[str],
    project_description: Optional[str],
    model: str,
    client: AsyncOpenAI,
) -> tuple[AuditSummary, list[UserStoryStep], list[AccessibilityIssue], list[CoverageGap]]:

    image_block = {
        "type": "image_url",
        "image_url": {"url": f"data:image/png;base64,{screenshot_b64}", "detail": "high"},
    }

    # Build the user content block (DOM text + screenshot)
    user_content: list[dict] = []
    if dom:
        dom_text = _dom_to_text(dom, project_description)
        if persona_hint:
            dom_text = f"Audit persona hint: {persona_hint}\n\n" + dom_text
        user_content.append({"type": "text", "text": dom_text})
    elif project_description:
        # Image-only path: still inject the project description as a text block
        user_content.append({"type": "text", "text": (
            "## Project description (provided by the developer)\n"
            + project_description.strip()
            + "\n\nUse cases explicitly named above must be evaluated for UI coverage. "
            "Additional use cases inferred from the UI should also be evaluated."
        )})
    user_content.append(image_block)

    # ------------------------------------------------------------------
    # Pass 1 — Initial audit
    # ------------------------------------------------------------------
    r1 = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        max_tokens=4096,
        temperature=0,
        response_format={"type": "json_object"},
    )
    raw_audit = r1.choices[0].message.content or "{}"

    # ------------------------------------------------------------------
    # Pass 2 — Critique
    # ------------------------------------------------------------------
    r2 = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _CRITIQUE_PROMPT},
            {"role": "user", "content": f"Audit to review:\n{raw_audit}"},
        ],
        max_tokens=1024,
        temperature=0,
        response_format={"type": "json_object"},
    )
    critique = json.loads(r2.choices[0].message.content or "{}")

    # ------------------------------------------------------------------
    # Pass 3 — Refinement (only if critique flagged issues)
    # ------------------------------------------------------------------
    if critique.get("needs_revision") and critique.get("issues"):
        issues_text = "\n".join(
            f"- [{i['type']}] {i['location']}: {i['description']}"
            for i in critique["issues"]
        )
        r3 = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _REFINE_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Original audit:\n{raw_audit}\n\nFlagged issues to fix:\n{issues_text}"},
                        image_block,
                    ],
                },
            ],
            max_tokens=4096,
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw_audit = r3.choices[0].message.content or raw_audit

    return _parse_audit(json.loads(raw_audit))
