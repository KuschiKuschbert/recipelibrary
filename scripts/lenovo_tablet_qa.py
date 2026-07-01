#!/usr/bin/env python3
"""Live Lenovo tablet QA checks for the static kitchen library."""
from __future__ import annotations

import argparse
import sys
import threading
from dataclasses import dataclass
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

try:
    from playwright.sync_api import Error as PlaywrightError
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
    from playwright.sync_api import sync_playwright
except Exception as exc:  # noqa: BLE001 - this is a command-line gate.
    print(f"FAIL  Python Playwright is required for Lenovo tablet QA: {exc}", file=sys.stderr)
    print("      Install with: python3 -m pip install playwright && python3 -m playwright install chromium", file=sys.stderr)
    raise SystemExit(1)


ROOT = Path(__file__).resolve().parents[1]

CORE_PAGES = (
    "index.html?qa=lenovo",
    "riviera.html?qa=lenovo",
    "kitchen-book.html?qa=lenovo",
    "pantry.html?qa=lenovo",
    "aroma.html?tab=browse&qa=lenovo",
    "aroma.html?tab=matrix&qa=lenovo",
    "flavor.html?q=cumin&qa=lenovo",
    "pairing-atlas.html?qa=lenovo",
    "notebooklm-gallery.html?qa=lenovo",
)

VIEWPORTS = (
    ("portrait", 800, 1280),
    ("landscape", 1280, 800),
)

LOAD_MS_BUDGET = 10_000
DOM_NODE_BUDGET = 12_000
RESOURCE_BYTE_BUDGET = 28_000_000
HEAP_BYTE_BUDGET = 220_000_000


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        return


@dataclass
class Issue:
    page: str
    viewport: str
    message: str


def ok(msg: str) -> None:
    print(f"PASS  {msg}")


def fail(msg: str) -> None:
    print(f"FAIL  {msg}", file=sys.stderr)


def start_server() -> tuple[ThreadingHTTPServer, str]:
    handler = partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address
    return server, f"http://{host}:{port}/"


def page_metric_script() -> str:
    return r"""
() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const doc = document.documentElement;
  const nav = document.querySelector('#appNav');
  const navRect = nav ? nav.getBoundingClientRect() : null;
  const navVisible = !!(navRect && navRect.width > 0 && navRect.height > 0 && navRect.bottom > 0 && navRect.top < vh);
  const navIsBottom = !!(navVisible && navRect.top > vh * 0.55 && navRect.height < vh * 0.35);

  function visible(el) {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) !== 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < vh &&
      rect.right > 0 &&
      rect.left < vw;
  }

  function label(el) {
    return (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80);
  }

  const interactiveSelector = [
    'a[href]',
    'button',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const interactives = Array.from(document.querySelectorAll(interactiveSelector)).filter(visible);
  const smallTargets = [];
  const tinyInteractiveText = [];
  const navOverlap = [];

  for (const el of interactives) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize || '16');
    const isNav = !!el.closest('#appNav');
    if ((rect.width < 44 || rect.height < 44) && !el.closest('.visually-hidden')) {
      smallTargets.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || '').slice(0, 80),
        text: label(el),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.left),
        y: Math.round(rect.top)
      });
    }
    if (fontSize < 12 && label(el)) {
      tinyInteractiveText.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || '').slice(0, 80),
        text: label(el),
        fontSize: Number(fontSize.toFixed(1))
      });
    }
    if (navIsBottom && !isNav && rect.bottom > navRect.top + 1 && rect.top < navRect.bottom - 1) {
      navOverlap.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || '').slice(0, 80),
        text: label(el),
        bottom: Math.round(rect.bottom),
        navTop: Math.round(navRect.top)
      });
    }
  }

  const navEntry = performance.getEntriesByType('navigation')[0];
  const resources = performance.getEntriesByType('resource');
  const resourceBytes = resources.reduce((sum, entry) => {
    return sum + (entry.transferSize || entry.encodedBodySize || 0);
  }, 0);
  const runningAnimations = document.getAnimations ? document.getAnimations().filter((anim) => {
    const effect = anim.effect && anim.effect.getTiming ? anim.effect.getTiming() : null;
    const duration = effect && Number.isFinite(effect.duration) ? Number(effect.duration) : 0;
    return anim.playState === 'running' && duration > 1;
  }).map((anim) => {
    const effect = anim.effect;
    const target = effect && effect.target;
    return {
      tag: target ? target.tagName.toLowerCase() : '',
      cls: target ? String(target.className || '').slice(0, 80) : '',
      duration: effect && effect.getTiming ? effect.getTiming().duration : null
    };
  }) : [];

  return {
    url: location.href,
    scrollY: Math.round(window.scrollY),
    maxScroll: Math.max(0, Math.round(doc.scrollHeight - vh)),
    atBottom: Math.abs(Math.max(0, doc.scrollHeight - vh) - window.scrollY) < 3,
    viewport: `${vw}x${vh}`,
    lenovoProfile: doc.classList.contains('lenovo-tab-one-profile'),
    lowMemoryProfile: doc.classList.contains('low-memory-device'),
    docOverflow: doc.scrollWidth > vw + 1 ? { scrollWidth: doc.scrollWidth, viewportWidth: vw } : null,
    smallTargets: smallTargets.slice(0, 12),
    tinyInteractiveText: tinyInteractiveText.slice(0, 12),
    navOverlap: navOverlap.slice(0, 12),
    loadMs: navEntry ? Math.round(navEntry.loadEventEnd - navEntry.startTime) : null,
    domNodes: document.querySelectorAll('*').length,
    resourceBytes,
    heapUsed: performance.memory && performance.memory.usedJSHeapSize ? performance.memory.usedJSHeapSize : null,
    runningAnimations: runningAnimations.slice(0, 12)
  };
}
"""


def collect_metrics(page: Any) -> list[dict[str, Any]]:
    max_scroll = int(page.evaluate("() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)"))
    positions = [0]
    if max_scroll > 400:
      positions.append(max_scroll // 2)
      positions.append(max_scroll)
    metrics: list[dict[str, Any]] = []
    for pos in positions:
        page.evaluate("(y) => window.scrollTo(0, y)", pos)
        page.wait_for_timeout(120)
        metrics.append(page.evaluate(page_metric_script()))
    return metrics


def describe_target(target: dict[str, Any]) -> str:
    text = target.get("text") or target.get("cls") or target.get("tag") or "element"
    size = ""
    if "width" in target and "height" in target:
        size = f" ({target['width']}x{target['height']})"
    if "fontSize" in target:
        size = f" ({target['fontSize']}px)"
    return f"{text}{size}"


def issues_from_metrics(page_path: str, viewport_name: str, metric: dict[str, Any], reduced_motion: bool) -> list[Issue]:
    issues: list[Issue] = []
    prefix = f"scrollY={metric.get('scrollY')}"
    if not metric.get("lenovoProfile"):
        issues.append(Issue(page_path, viewport_name, f"{prefix}: lenovo tablet profile class did not apply"))
    if metric.get("docOverflow"):
        overflow = metric["docOverflow"]
        issues.append(Issue(page_path, viewport_name, f"{prefix}: document overflows horizontally {overflow['scrollWidth']} > {overflow['viewportWidth']}"))
    if metric.get("smallTargets"):
        sample = "; ".join(describe_target(t) for t in metric["smallTargets"][:5])
        issues.append(Issue(page_path, viewport_name, f"{prefix}: visible tap targets below 44px: {sample}"))
    if metric.get("tinyInteractiveText"):
        sample = "; ".join(describe_target(t) for t in metric["tinyInteractiveText"][:5])
        issues.append(Issue(page_path, viewport_name, f"{prefix}: interactive text below 12px: {sample}"))
    if metric.get("atBottom") and metric.get("navOverlap"):
        sample = "; ".join(describe_target(t) for t in metric["navOverlap"][:5])
        issues.append(Issue(page_path, viewport_name, f"{prefix}: bottom nav overlaps interactives: {sample}"))
    if reduced_motion and metric.get("runningAnimations"):
        sample = "; ".join((a.get("cls") or a.get("tag") or "animation") for a in metric["runningAnimations"][:5])
        issues.append(Issue(page_path, viewport_name, f"{prefix}: animations still running under reduced motion: {sample}"))
    load_ms = metric.get("loadMs")
    if load_ms is not None and load_ms > LOAD_MS_BUDGET:
        issues.append(Issue(page_path, viewport_name, f"{prefix}: load budget exceeded {load_ms}ms > {LOAD_MS_BUDGET}ms"))
    dom_nodes = metric.get("domNodes") or 0
    if dom_nodes > DOM_NODE_BUDGET:
        issues.append(Issue(page_path, viewport_name, f"{prefix}: DOM node budget exceeded {dom_nodes} > {DOM_NODE_BUDGET}"))
    resource_bytes = metric.get("resourceBytes") or 0
    if resource_bytes > RESOURCE_BYTE_BUDGET:
        issues.append(Issue(page_path, viewport_name, f"{prefix}: resource budget exceeded {resource_bytes} > {RESOURCE_BYTE_BUDGET} bytes"))
    heap_used = metric.get("heapUsed")
    if heap_used is not None and heap_used > HEAP_BYTE_BUDGET:
        issues.append(Issue(page_path, viewport_name, f"{prefix}: JS heap budget exceeded {heap_used} > {HEAP_BYTE_BUDGET} bytes"))
    return issues


def run_pairing_decision_smoke(page: Any) -> list[str]:
    problems: list[str] = []
    search = page.locator("#paDecisionSearch")
    if search.count() != 1:
        return ["Pairing Atlas decision search is missing"]
    try:
        page.wait_for_function(
            "() => { const btn = document.querySelector('#paLayerHarmony'); return btn && !btn.disabled; }",
            timeout=5_000,
        )
    except PlaywrightTimeoutError:
        problems.append("Pairing Atlas enrichment did not finish before drawer smoke")
    search.fill("cumin")
    page.locator("#paDecisionSubmit").click()
    page.wait_for_timeout(250)
    body_text = page.locator("#paDecisionBody").inner_text(timeout=5_000)
    if "Cumin" not in body_text:
        problems.append("decision panel did not render Cumin answer")
    page.locator('[data-pa-decision-action="matrix"]').click()
    page.wait_for_timeout(250)
    row_open = page.evaluate(
        "() => !!document.querySelector('tr.pa-data-row[data-spice-id=\"cumin\"].pa-row-open')"
    )
    if not row_open:
        problems.append("decision panel Show row did not open the cumin matrix row")
    drawer_profile = page.locator('tr.pa-drawer-row[data-drawer-for="cumin"] [data-pa-drawer-profile]')
    if drawer_profile.count() != 1:
        problems.append("Cumin drawer profile is missing")
    else:
        drawer_text = drawer_profile.inner_text(timeout=5_000)
        drawer_lower = drawer_text.lower()
        for expected in ("kitchen profile", "pair now", "use it", "foods"):
            if expected not in drawer_lower:
                problems.append(f"Cumin drawer profile missing section: {expected}")
        if "toast cumin seeds" not in drawer_lower:
            problems.append("Cumin drawer profile did not surface the toast/use note")
        instruction_chip = page.evaluate(
            """() => Array.from(document.querySelectorAll(
              'tr.pa-drawer-row[data-drawer-for="cumin"] [data-pa-drawer-profile] .pa-answer__chip'
            )).some((el) => /toast cumin/i.test(el.textContent || ''))"""
        )
        if instruction_chip:
            problems.append("Cumin drawer put an instruction into a pairing chip")
    return problems


def run_flavor_decision_smoke(page: Any) -> list[str]:
    problems: list[str] = []
    search = page.locator("#flavorSearch")
    if search.count() != 1:
        return ["Flavor answer search is missing"]
    answer = page.locator("#flavorAnswer")
    if answer.count() != 1:
        return ["Flavor answer card is missing"]
    search.fill("cumin")
    page.wait_for_timeout(500)
    body_text = answer.inner_text(timeout=5_000)
    if "Cumin" not in body_text:
        problems.append("Flavor answer card did not render Cumin")
    body_lower = body_text.lower()
    for expected in ("best pairings", "use it like this", "aroma links"):
        if expected not in body_lower:
            problems.append(f"Flavor answer card missing section: {expected}")
    detail_action = page.locator('[data-flavor-answer-action="detail"]')
    if detail_action.count() != 1:
        problems.append("Flavor answer Full detail action is missing")
    else:
        detail_action.click()
        page.wait_for_timeout(250)
        detail_text = page.locator("#flavorDetail").inner_text(timeout=5_000)
        if "CUMIN" not in detail_text.upper():
            problems.append("Flavor answer Full detail did not open Cumin detail")
    return problems


def run_page(browser: Any, base: str, page_path: str, viewport_name: str, width: int, height: int, reduced_motion: bool) -> list[Issue]:
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        is_mobile=False,
        has_touch=True,
        reduced_motion="reduce" if reduced_motion else "no-preference",
    )
    page = context.new_page()
    console_errors: list[str] = []
    page_errors: list[str] = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: page_errors.append(str(exc)) if exc else None)
    issues: list[Issue] = []
    try:
        page.goto(urljoin(base, page_path), wait_until="networkidle", timeout=25_000)
        page.wait_for_timeout(600)
        if "pairing-atlas.html" in page_path and not reduced_motion and viewport_name == "portrait":
            for problem in run_pairing_decision_smoke(page):
                issues.append(Issue(page_path, viewport_name, problem))
        if "flavor.html" in page_path and not reduced_motion and viewport_name == "portrait":
            for problem in run_flavor_decision_smoke(page):
                issues.append(Issue(page_path, viewport_name, problem))
        for metric in collect_metrics(page):
            issues.extend(issues_from_metrics(page_path, viewport_name, metric, reduced_motion))
        for msg in console_errors[:5]:
            issues.append(Issue(page_path, viewport_name, f"console error: {msg[:220]}"))
        for msg in page_errors[:5]:
            issues.append(Issue(page_path, viewport_name, f"page error: {msg[:220]}"))
    except (PlaywrightTimeoutError, PlaywrightError) as exc:
        issues.append(Issue(page_path, viewport_name, f"browser QA failed: {exc}"))
    finally:
        context.close()
    return issues


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pages",
        help="Comma-separated page paths. Defaults to the core kitchen pages.",
    )
    parser.add_argument(
        "--reduced-motion",
        action="store_true",
        help="Only run the reduced-motion profile.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    pages = tuple(p.strip() for p in args.pages.split(",")) if args.pages else CORE_PAGES
    server, base = start_server()
    all_issues: list[Issue] = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                motion_modes = (True,) if args.reduced_motion else (False, True)
                for reduced_motion in motion_modes:
                    motion_label = "reduced motion" if reduced_motion else "normal motion"
                    for viewport_name, width, height in VIEWPORTS:
                        label = f"{viewport_name} {width}x{height}, {motion_label}"
                        for page_path in pages:
                            issues = run_page(browser, base, page_path, viewport_name, width, height, reduced_motion)
                            if issues:
                                all_issues.extend(issues)
                            else:
                                ok(f"{page_path} {label}")
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()

    if all_issues:
        for issue in all_issues:
            fail(f"{issue.page} [{issue.viewport}]: {issue.message}")
        fail(f"Lenovo tablet QA found {len(all_issues)} issue(s)")
        return 1
    ok("Lenovo tablet QA passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
