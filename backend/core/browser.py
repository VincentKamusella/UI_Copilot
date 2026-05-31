"""Playwright-based headless browser capture module."""

from __future__ import annotations

import base64
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse

from playwright.async_api import async_playwright, Page

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

_CRAWL_KEYWORDS = [
    "login", "sign in", "sign up", "register", "get started",
    "pricing", "about", "contact", "features", "demo", "try",
    "dashboard", "product", "solutions", "docs", "help",
    "portfolio", "work", "services", "team", "blog",
]

_SEVERITY_COLORS = {
    "low": "#22c55e",
    "medium": "#f59e0b",
    "high": "#f97316",
    "critical": "#ef4444",
}

_ANNOTATE_JS = """
(annotations) => {
    annotations.forEach(({ selector, step, color }) => {
        if (!selector) return;
        let el;
        try { el = document.querySelector(selector); } catch (_) { return; }
        if (!el) return;

        el.style.outline = `3px solid ${color}`;
        el.style.outlineOffset = '2px';

        const rect = el.getBoundingClientRect();
        const badge = document.createElement('div');
        badge.textContent = String(step);
        badge.style.cssText = [
            'position:fixed',
            `left:${Math.min(rect.right - 14, window.innerWidth - 28)}px`,
            `top:${Math.max(rect.top - 14, 4)}px`,
            'width:26px', 'height:26px',
            `background:${color}`,
            'color:#fff',
            'border-radius:50%',
            'display:flex', 'align-items:center', 'justify-content:center',
            'font-size:12px', 'font-weight:700',
            'z-index:2147483647',
            'font-family:system-ui,sans-serif',
            'pointer-events:none',
            'box-shadow:0 1px 4px rgba(0,0,0,.35)',
        ].join(';');
        document.body.appendChild(badge);
    });
}
"""


@dataclass
class DOMSummary:
    title: str
    meta_description: str
    headings: list[str]
    links: list[dict]
    buttons: list[str]
    inputs: list[dict]
    images: list[dict]
    forms: list[dict]
    alerts_errors: list[str]
    total_interactive: int
    total_elements: int
    aria_landmarks: list[str]
    color_contrast_warnings: list[str] = field(default_factory=list)


@dataclass
class PageCapture:
    url: str
    title: str
    trigger: str          # "Landing page" or the link text that led here
    screenshot_b64: str
    dom: DOMSummary


# kept for annotation pass
@dataclass
class BrowserCapture:
    screenshot_b64: str
    dom: DOMSummary
    page_url: str
    viewport: dict


async def _extract_dom(page: Page) -> DOMSummary:
    title = await page.title()
    meta_desc = await page.evaluate(
        "() => document.querySelector('meta[name=\"description\"]')?.content ?? ''"
    )
    headings = await page.evaluate("""
        () => Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
                  .slice(0, 20)
                  .map(h => `${h.tagName}: ${h.innerText.trim().slice(0, 120)}`)
    """)
    links = await page.evaluate("""
        () => Array.from(document.querySelectorAll('a[href]'))
                  .slice(0, 30)
                  .map(a => ({text: a.innerText.trim().slice(0, 80), href: a.href.slice(0, 100)}))
                  .filter(l => l.text)
    """)
    buttons = await page.evaluate("""
        () => Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'))
                  .slice(0, 20)
                  .map(b => b.innerText?.trim() || b.value || b.getAttribute('aria-label') || '(unlabelled button)')
    """)
    inputs = await page.evaluate("""
        () => Array.from(document.querySelectorAll('input, textarea, select'))
                  .slice(0, 20)
                  .map(el => {
                      const label = document.querySelector(`label[for="${el.id}"]`);
                      return {
                          type: el.type || el.tagName.toLowerCase(),
                          name: el.name || '',
                          placeholder: el.placeholder || '',
                          label: label?.innerText?.trim() || el.getAttribute('aria-label') || ''
                      };
                  })
    """)
    images = await page.evaluate("""
        () => Array.from(document.querySelectorAll('img'))
                  .slice(0, 15)
                  .map(img => ({alt: img.alt || '', src_partial: img.src.split('/').pop()?.slice(0, 60) || ''}))
    """)
    forms = await page.evaluate("""
        () => Array.from(document.querySelectorAll('form'))
                  .map(f => ({
                      action: f.action?.slice(0, 80) || '',
                      method: f.method || 'get',
                      field_count: f.querySelectorAll('input,textarea,select').length
                  }))
    """)
    alerts_errors = await page.evaluate("""
        () => Array.from(document.querySelectorAll('[role="alert"], .error, .alert, [aria-live]'))
                  .slice(0, 10)
                  .map(el => el.innerText?.trim().slice(0, 150))
                  .filter(Boolean)
    """)
    total_elements = await page.evaluate("() => document.querySelectorAll('*').length")
    aria_landmarks = await page.evaluate("""
        () => Array.from(document.querySelectorAll(
            'header, footer, nav, main, aside, section[aria-label], [role="banner"], [role="navigation"], [role="main"], [role="complementary"]'
        )).map(el => el.tagName.toLowerCase() + (el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''))
    """)
    return DOMSummary(
        title=title,
        meta_description=meta_desc,
        headings=headings,
        links=links,
        buttons=buttons,
        inputs=inputs,
        images=images,
        forms=forms,
        alerts_errors=alerts_errors,
        total_interactive=len(links) + len(buttons) + len(inputs),
        total_elements=total_elements,
        aria_landmarks=aria_landmarks,
    )


async def crawl_journey(
    url: str,
    viewport_width: int = 1440,
    viewport_height: int = 900,
    max_pages: int = 6,
) -> list[PageCapture]:
    """Capture the landing page + up to *max_pages-1* same-domain sub-pages."""
    captures: list[PageCapture] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": viewport_width, "height": viewport_height},
            user_agent=_UA,
        )

        # --- Landing page ---
        page = await context.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30_000)
        await page.wait_for_timeout(1_500)

        ss = await page.screenshot(full_page=False, type="png")
        dom = await _extract_dom(page)
        base_origin = urlparse(page.url).netloc

        captures.append(PageCapture(
            url=page.url,
            title=dom.title,
            trigger="Landing page",
            screenshot_b64=base64.b64encode(ss).decode(),
            dom=dom,
        ))

        # --- Discover crawl targets ---
        kw_js = str(_CRAWL_KEYWORDS)
        raw_targets: list[dict] = await page.evaluate(f"""
            () => {{
                const KEYWORDS = {kw_js};
                const seen = new Set();
                const out = [];
                document.querySelectorAll('a[href]').forEach(el => {{
                    const text = (el.innerText || '').trim();
                    const href = el.href;
                    if (!href || !href.startsWith('http') || seen.has(href)) return;
                    seen.add(href);
                    const low = text.toLowerCase();
                    const isKeyword = KEYWORDS.some(kw => low.includes(kw));
                    out.push({{ text, href, isKeyword }});
                }});
                return out.sort((a, b) => (b.isKeyword ? 1 : 0) - (a.isKeyword ? 1 : 0)).slice(0, 12);
            }}
        """)

        # Keep same-domain only, skip pure hash anchors
        targets = [
            t for t in raw_targets
            if urlparse(t["href"]).netloc == base_origin
            and not t["href"].split("#")[0] == page.url.split("#")[0]
        ]

        await page.close()

        # --- Visit each target ---
        for target in targets[: max_pages - 1]:
            try:
                sub = await context.new_page()
                await sub.goto(target["href"], wait_until="networkidle", timeout=15_000)
                await sub.wait_for_timeout(1_000)

                ss = await sub.screenshot(full_page=False, type="png")
                dom = await _extract_dom(sub)
                captures.append(PageCapture(
                    url=sub.url,
                    title=dom.title,
                    trigger=target["text"],
                    screenshot_b64=base64.b64encode(ss).decode(),
                    dom=dom,
                ))
                await sub.close()
            except Exception:
                pass  # skip unreachable pages silently

        await browser.close()

    return captures


async def annotate_screenshot(
    url: str,
    steps: list[dict],
    viewport_width: int = 1440,
    viewport_height: int = 900,
) -> Optional[str]:
    """Re-open the landing page, overlay friction markers, return annotated screenshot b64."""
    annotations = [
        {
            "selector": s["element_selector"],
            "step": s["step"],
            "color": _SEVERITY_COLORS.get(s.get("friction_severity", "medium"), "#f59e0b"),
        }
        for s in steps
        if s.get("element_selector") and s.get("friction_point", "None").lower() != "none"
    ]
    if not annotations:
        return None

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": viewport_width, "height": viewport_height},
            user_agent=_UA,
        )
        page = await context.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30_000)
        await page.wait_for_timeout(1_500)
        try:
            await page.evaluate(_ANNOTATE_JS, annotations)
        except Exception:
            pass
        ss = await page.screenshot(full_page=False, type="png")
        await browser.close()

    return base64.b64encode(ss).decode()


def capture_image_bytes(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode()
