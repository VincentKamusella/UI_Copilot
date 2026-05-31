"""Playwright-based headless browser capture module."""

from __future__ import annotations

import base64
from dataclasses import dataclass, field
from typing import Optional

from playwright.async_api import async_playwright, Page


@dataclass
class DOMSummary:
    title: str
    meta_description: str
    headings: list[str]
    links: list[dict]          # [{text, href}]
    buttons: list[str]
    inputs: list[dict]         # [{type, name, placeholder, label}]
    images: list[dict]         # [{alt, src_partial}]
    forms: list[dict]          # [{action, method, field_count}]
    alerts_errors: list[str]
    total_interactive: int
    total_elements: int
    aria_landmarks: list[str]
    color_contrast_warnings: list[str] = field(default_factory=list)


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

    total_elements = await page.evaluate(
        "() => document.querySelectorAll('*').length"
    )

    aria_landmarks = await page.evaluate("""
        () => Array.from(document.querySelectorAll(
            'header, footer, nav, main, aside, section[aria-label], [role="banner"], [role="navigation"], [role="main"], [role="complementary"]'
        )).map(el => el.tagName.toLowerCase() + (el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : ''))
    """)

    total_interactive = len(links) + len(buttons) + len(inputs)

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
        total_interactive=total_interactive,
        total_elements=total_elements,
        aria_landmarks=aria_landmarks,
    )


async def capture_url(url: str, viewport_width: int = 1440, viewport_height: int = 900) -> BrowserCapture:
    """Launch a headless Chromium browser, navigate to *url*, and return a screenshot + DOM summary."""
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": viewport_width, "height": viewport_height},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        await page.goto(url, wait_until="networkidle", timeout=30_000)
        # Give JS-heavy pages a moment to settle
        await page.wait_for_timeout(1_500)

        screenshot_bytes = await page.screenshot(full_page=False, type="png")
        screenshot_b64 = base64.b64encode(screenshot_bytes).decode()

        dom = await _extract_dom(page)
        final_url = page.url

        await browser.close()

    return BrowserCapture(
        screenshot_b64=screenshot_b64,
        dom=dom,
        page_url=final_url,
        viewport={"width": viewport_width, "height": viewport_height},
    )


def capture_image_bytes(image_bytes: bytes) -> str:
    """Return a base64-encoded PNG string from raw image bytes (upload path)."""
    return base64.b64encode(image_bytes).decode()
