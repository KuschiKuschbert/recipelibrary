#!/usr/bin/env python3
"""Live Lenovo tablet QA checks for the static kitchen library."""
from __future__ import annotations

import argparse
import sys
import threading
import time
from dataclasses import dataclass
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urljoin, urlparse

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
    "aroma.html?food=roasted-lamb&qa=lenovo",
    "flavor.html?q=cumin&qa=lenovo",
    "pairing-atlas.html?qa=lenovo",
    "pairing-atlas.html?ingredient=cumin&qa=lenovo",
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
DECISION_RESPONSE_MS_BUDGET = 1_200


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


def timed_interaction(
    page: Any,
    label: str,
    trigger: Any,
    ready_script: str,
    problems: list[str],
    budget_ms: int = DECISION_RESPONSE_MS_BUDGET,
) -> int | None:
    start = time.perf_counter()
    trigger()
    try:
        page.wait_for_function(ready_script, timeout=budget_ms + 1_500)
    except PlaywrightTimeoutError:
        problems.append(f"{label} did not answer within {budget_ms}ms budget")
        return None
    elapsed = int((time.perf_counter() - start) * 1000)
    if elapsed > budget_ms:
        problems.append(f"{label} answered in {elapsed}ms, over {budget_ms}ms budget")
    return elapsed


def ingredient_flow_control_problems(
    page: Any,
    scope: str,
    label: str,
    expected_labels: tuple[str, ...] = (),
) -> list[str]:
    data = page.evaluate(
        r"""
(scope) => {
  const root = document.querySelector(scope);
  if (!root) return { missing: true, controls: [] };
  const controls = Array.from(root.querySelectorAll('.ingredient-flow-action')).filter((el) => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) !== 0 &&
      rect.width > 0 &&
      rect.height > 0;
  }).map((el) => ({
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' '),
    href: el.getAttribute('href') || '',
    absoluteHref: el.href || '',
    type: el.getAttribute('type') || '',
    dataAction: Array.from(el.attributes)
      .filter((attr) => /^data-.*action$/.test(attr.name))
      .map((attr) => attr.name + '=' + attr.value)
      .join(','),
  }));
  return { missing: false, controls };
}
""",
        scope,
    )
    if data.get("missing"):
        return [f"{label} scope is missing: {scope}"]

    controls = data.get("controls") or []
    problems: list[str] = []
    current_origin = urlparse(page.url).netloc
    visible_labels = [str(control.get("text") or "").strip() for control in controls]
    lower_labels = [text.lower() for text in visible_labels]
    for expected in expected_labels:
        if expected.lower() not in lower_labels:
            problems.append(f"{label} missing ingredient-flow action: {expected}")

    for control in controls:
        text = str(control.get("text") or "").strip() or "<unlabelled>"
        tag = control.get("tag")
        if tag == "button":
            if control.get("type") != "button":
                problems.append(f"{label} button action {text} is not type=button")
            if not control.get("dataAction"):
                problems.append(f"{label} button action {text} has no data action hook")
            continue

        if tag != "a":
            problems.append(f"{label} action {text} is a {tag}, expected button or link")
            continue

        href = str(control.get("href") or "").strip()
        absolute_href = str(control.get("absoluteHref") or "").strip()
        if not href or href == "#" or href.lower().startswith("javascript:"):
            problems.append(f"{label} link action {text} has an unsafe or empty href")
            continue

        parsed = urlparse(absolute_href)
        if parsed.scheme not in {"http", "https"}:
            problems.append(f"{label} link action {text} has unsupported href: {href}")
            continue
        if parsed.netloc and parsed.netloc != current_origin:
            problems.append(f"{label} link action {text} points off-site: {href}")
            continue
        path = unquote(parsed.path.lstrip("/"))
        if path and not (ROOT / path).exists():
            problems.append(f"{label} link action {text} points to missing local page: {path}")

    return problems


def task_first_surface_spec(page_path: str) -> dict[str, Any] | None:
    if "pairing-atlas.html" in page_path:
        return {
            "label": "Pairing Atlas answer surface",
            "items": [
                {"name": "decision search", "selector": "#paDecisionSearch", "role": "control"},
                {"name": "answer button", "selector": "#paDecisionSubmit", "role": "control"},
                {"name": "decision answer", "selector": "#paDecisionBody", "role": "answer"},
            ],
        }
    if "flavor.html" in page_path:
        return {
            "label": "Flavor answer surface",
            "items": [
                {"name": "answer search", "selector": "#flavorSearch", "role": "control"},
                {"name": "quick answer", "selector": "#flavorAnswer", "role": "answer"},
            ],
        }
    return None


def task_first_surface_problems(page: Any, page_path: str) -> list[str]:
    spec = task_first_surface_spec(page_path)
    if not spec:
        return []
    data = page.evaluate(
        r"""
(spec) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  function readItem(item) {
    const el = document.querySelector(item.selector);
    if (!el) return Object.assign({}, item, { missing: true });
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const hidden = style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number(style.opacity || 1) === 0 ||
      rect.width <= 0 ||
      rect.height <= 0;
    return Object.assign({}, item, {
      missing: false,
      hidden,
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    });
  }
  return {
    label: spec.label,
    viewportWidth: vw,
    viewportHeight: vh,
    scrollY: Math.round(window.scrollY),
    items: (spec.items || []).map(readItem),
  };
}
""",
        spec,
    )
    problems: list[str] = []
    vh = float(data.get("viewportHeight") or 0)
    vw = float(data.get("viewportWidth") or 0)
    label = str(data.get("label") or "task-first surface")
    for item in data.get("items") or []:
        name = str(item.get("name") or item.get("selector") or "surface item")
        if item.get("missing"):
            problems.append(f"{label} missing {name}: {item.get('selector')}")
            continue
        if item.get("hidden"):
            problems.append(f"{label} hidden {name}: {item.get('selector')}")
            continue
        width = int(item.get("width") or 0)
        height = int(item.get("height") or 0)
        role = str(item.get("role") or "")
        if role == "control" and (width < 44 or height < 44):
            problems.append(f"{label} {name} is below 44px tap target ({width}x{height})")
        top = float(item.get("top") or 0)
        bottom = float(item.get("bottom") or 0)
        left = float(item.get("left") or 0)
        right = float(item.get("right") or 0)
        if bottom <= 0:
            problems.append(f"{label} {name} sits above the initial viewport")
        first_view_limit = 0.86 if role == "answer" else 0.72
        if vh and top > vh * first_view_limit:
            problems.append(
                f"{label} {name} starts too low in the initial viewport ({int(top)}px of {int(vh)}px)"
            )
        if vw and (left < -1 or right > vw + 1):
            problems.append(f"{label} {name} overflows horizontally ({int(left)}..{int(right)} of {int(vw)}px)")
    return problems


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
    timed_interaction(
        page,
        "Pairing Atlas phrase answer",
        lambda: (search.fill("what goes with cumin?"), page.locator("#paDecisionSubmit").click()),
        "() => !!document.querySelector('#paDecisionBody .pa-answer[data-decision-spice-id=\"cumin\"]')",
        problems,
    )
    body_text = page.locator("#paDecisionBody").inner_text(timeout=5_000)
    if "Cumin" not in body_text:
        problems.append("decision panel did not render Cumin answer from a kitchen phrase")
    timed_interaction(
        page,
        "Pairing Atlas first-ingredient phrase answer",
        lambda: (search.fill("pair basil with lamb"), page.locator("#paDecisionSubmit").click()),
        "() => !!document.querySelector('#paDecisionBody .pa-answer[data-decision-spice-id=\"basil\"]')",
        problems,
    )
    body_text = page.locator("#paDecisionBody").inner_text(timeout=5_000)
    if "Basil" not in body_text:
        problems.append("decision panel did not keep the first ingredient from 'pair basil with lamb'")
    timed_interaction(
        page,
        "Pairing Atlas return-to-cumin answer",
        lambda: (search.fill("pair cumin with lamb"), page.locator("#paDecisionSubmit").click()),
        "() => !!document.querySelector('#paDecisionBody .pa-answer[data-decision-spice-id=\"cumin\"]')",
        problems,
    )
    body_text = page.locator("#paDecisionBody").inner_text(timeout=5_000)
    if "Cumin" not in body_text:
        problems.append("decision panel did not keep the first ingredient from 'pair cumin with lamb'")
    shared_answer = page.evaluate(
        "() => !!document.querySelector('#paDecisionBody .pa-answer.ingredient-flow .ingredient-flow-grid')"
    )
    if not shared_answer:
        problems.append("Pairing Atlas decision answer is not using shared ingredient-flow styles")
    problems.extend(
        ingredient_flow_control_problems(
            page,
            "#paDecisionBody .pa-answer.ingredient-flow",
            "Pairing Atlas decision answer",
            ("Show row", "Aroma", "Flavor"),
        )
    )
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
        shared_profile = page.evaluate(
            """() => !!document.querySelector(
              'tr.pa-drawer-row[data-drawer-for="cumin"] [data-pa-drawer-profile].ingredient-flow-profile'
            )"""
        )
        if not shared_profile:
            problems.append("Cumin drawer profile is not using shared ingredient-flow styles")
        drawer_text = drawer_profile.inner_text(timeout=5_000)
        drawer_lower = drawer_text.lower()
        for expected in ("kitchen profile", "at a glance", "pair first", "pair now", "use it", "foods"):
            if expected not in drawer_lower:
                problems.append(f"Cumin drawer profile missing section: {expected}")
        if "toast cumin seeds" not in drawer_lower:
            problems.append("Cumin drawer profile did not surface the toast/use note")
        problems.extend(
            ingredient_flow_control_problems(
                page,
                'tr.pa-drawer-row[data-drawer-for="cumin"]',
                "Pairing Atlas cumin drawer",
                ("Aroma", "Flavor", "Toolkit"),
            )
        )
        instruction_chip = page.evaluate(
            """() => Array.from(document.querySelectorAll(
              'tr.pa-drawer-row[data-drawer-for="cumin"] [data-pa-drawer-profile] .pa-answer__chip'
            )).some((el) => /toast cumin/i.test(el.textContent || ''))"""
        )
        if instruction_chip:
            problems.append("Cumin drawer put an instruction into a pairing chip")
    timed_interaction(
        page,
        "Pairing Atlas food phrase answer",
        lambda: (search.fill("what goes with lamb?"), page.locator("#paDecisionSubmit").click()),
        "() => !!document.querySelector('#paDecisionBody .pa-answer[data-decision-food-id=\"roasted-lamb\"]')",
        problems,
    )
    body_text = page.locator("#paDecisionBody").inner_text(timeout=5_000)
    if "Roasted Lamb" not in body_text:
        problems.append("decision panel did not render Roasted Lamb from a food phrase")
    if "Cumin" not in body_text:
        problems.append("Roasted Lamb food answer did not surface Cumin as a seasoning")
    body_lower = body_text.lower()
    for expected in ("Seasonings", "More options"):
        if expected.lower() not in body_lower:
            problems.append(f"Roasted Lamb food answer missing section: {expected}")
    problems.extend(
        ingredient_flow_control_problems(
            page,
            "#paDecisionBody .pa-answer.ingredient-flow",
            "Pairing Atlas food decision answer",
            ("Open row", "Aroma", "Flavor"),
        )
    )
    page.locator('[data-pa-decision-action="food"]').click()
    try:
        page.wait_for_function(
            "() => !!document.querySelector('tr.pa-fx-data[data-food-id=\"roasted-lamb\"].pa-row-open')",
            timeout=5_000,
        )
    except PlaywrightTimeoutError:
        problems.append("food decision Open row did not open the Roasted Lamb food matrix row")
    food_drawer = page.locator('tr.pa-drawer-row[data-food-drawer="roasted-lamb"]')
    if food_drawer.count() != 1:
        problems.append("Roasted Lamb food drawer is missing after food decision Open row")
    return problems


def run_flavor_decision_smoke(page: Any) -> list[str]:
    problems: list[str] = []
    search = page.locator("#flavorSearch")
    if search.count() != 1:
        return ["Flavor answer search is missing"]
    answer = page.locator("#flavorAnswer")
    if answer.count() != 1:
        return ["Flavor answer card is missing"]
    timed_interaction(
        page,
        "Flavor warmup phrase answer",
        lambda: search.fill("what goes with lamb?"),
        "() => /\\bLamb\\b/.test(document.querySelector('#flavorAnswer .ingredient-flow-title')?.textContent || '')",
        problems,
    )
    body_text = answer.inner_text(timeout=5_000)
    if "Lamb" not in body_text:
        problems.append("Flavor answer card did not render Lamb from a kitchen phrase")
    if "Cumin" not in body_text:
        problems.append("Flavor Lamb answer did not surface Cumin from the Aroma food-seasoning row")
    timed_interaction(
        page,
        "Flavor food phrase answer",
        lambda: search.fill("what goes with roasted lamb?"),
        "() => !!document.querySelector('#flavorAnswer [data-decision-food-id=\"roasted-lamb\"]')",
        problems,
    )
    body_text = answer.inner_text(timeout=5_000)
    if "Roasted Lamb" not in body_text:
        problems.append("Flavor answer card did not render Roasted Lamb from a food phrase")
    if "Cumin" not in body_text:
        problems.append("Flavor Roasted Lamb answer did not surface Cumin as a seasoning")
    body_lower = body_text.lower()
    for expected in ("seasonings", "more options"):
        if expected not in body_lower:
            problems.append(f"Flavor food answer card missing section: {expected}")
    problems.extend(
        ingredient_flow_control_problems(
            page,
            "#flavorAnswer .flavor-answer-food",
            "Flavor food answer card",
            ("Matrix", "Aroma"),
        )
    )
    timed_interaction(
        page,
        "Flavor phrase answer",
        lambda: search.fill("what goes with cumin?"),
        "() => /\\bCumin\\b/.test(document.querySelector('#flavorAnswer .ingredient-flow-title')?.textContent || '')",
        problems,
    )
    body_text = answer.inner_text(timeout=5_000)
    if "Cumin" not in body_text:
        problems.append("Flavor answer card did not render Cumin from a kitchen phrase")
    timed_interaction(
        page,
        "Flavor first-ingredient phrase answer",
        lambda: search.fill("pair lamb with cumin"),
        "() => /\\bLamb\\b/.test(document.querySelector('#flavorAnswer .ingredient-flow-title')?.textContent || '')",
        problems,
    )
    body_text = answer.inner_text(timeout=5_000)
    if "Lamb" not in body_text:
        problems.append("Flavor answer card did not keep the first ingredient from 'pair lamb with cumin'")
    timed_interaction(
        page,
        "Flavor return-to-cumin phrase answer",
        lambda: search.fill("pair cumin with lamb"),
        "() => /\\bCumin\\b/.test(document.querySelector('#flavorAnswer .ingredient-flow-title')?.textContent || '')",
        problems,
    )
    body_text = answer.inner_text(timeout=5_000)
    if "Cumin" not in body_text:
        problems.append("Flavor answer card did not keep the first ingredient from 'pair cumin with lamb'")
    shared_answer = page.evaluate(
        "() => !!document.querySelector('#flavorAnswer.ingredient-flow-card .ingredient-flow-grid')"
    )
    if not shared_answer:
        problems.append("Flavor answer card is not using shared ingredient-flow styles")
    body_lower = body_text.lower()
    for expected in ("best pairings", "use it like this", "aroma links"):
        if expected not in body_lower:
            problems.append(f"Flavor answer card missing section: {expected}")
    problems.extend(
        ingredient_flow_control_problems(
            page,
            "#flavorAnswer",
            "Flavor answer card",
            ("Full detail", "Matrix", "Aroma"),
        )
    )
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


def run_aroma_answer_smoke(page: Any) -> list[str]:
    problems: list[str] = []
    search = page.locator("#aromaSearch")
    if search.count() != 1:
        return ["Aroma answer search is missing"]
    answer = page.locator("#aromaAnswer")
    if answer.count() != 1:
        return ["Aroma answer card is missing"]
    try:
        page.wait_for_selector("#aromaAnswer .ingredient-flow-grid", timeout=5_000)
    except PlaywrightTimeoutError:
        problems.append("Aroma answer card did not render shared grid")
    body_text = answer.inner_text(timeout=5_000)
    if "Cumin" not in body_text:
        problems.append("Aroma answer card did not render default Cumin")
    shared_answer = page.evaluate(
        "() => !!document.querySelector('#aromaAnswer.ingredient-flow-card .ingredient-flow-grid')"
    )
    if not shared_answer:
        problems.append("Aroma answer card is not using shared ingredient-flow styles")
    body_lower = body_text.lower()
    for expected in ("harmony partners", "foods that use it", "use it"):
        if expected not in body_lower:
            problems.append(f"Aroma answer card missing section: {expected}")
    problems.extend(
        ingredient_flow_control_problems(
            page,
            "#aromaAnswer",
            "Aroma spice answer card",
            ("Profile", "Matrix", "Atlas", "Flavor"),
        )
    )
    matrix_action = page.locator('[data-aroma-answer-action="matrix"]')
    if matrix_action.count() != 1:
        problems.append("Aroma answer Matrix action is missing")
    else:
        matrix_action.click()
        page.wait_for_timeout(250)
        matrix_selected = page.locator("#tabMatrix").get_attribute("aria-selected", timeout=5_000)
        matrix_focus = page.locator("#matrixFocus").input_value(timeout=5_000)
        if matrix_selected != "true" or matrix_focus != "cumin":
            problems.append("Aroma answer Matrix action did not focus Cumin in the matrix")
    profile_action = page.locator('[data-aroma-answer-action="profile"]')
    if profile_action.count() != 1:
        problems.append("Aroma answer Profile action is missing")
    else:
        profile_action.click()
        page.wait_for_timeout(250)
        profile_text = page.locator("#spiceProfile").inner_text(timeout=5_000)
        if "Cumin" not in profile_text:
            problems.append("Aroma answer Profile action did not open Cumin profile")
    search.fill("roasted lamb")
    search.press("Enter")
    page.wait_for_timeout(600)
    food_text = answer.inner_text(timeout=5_000)
    if "Roasted Lamb" not in food_text:
        problems.append("Aroma answer card did not render Roasted Lamb food answer")
    food_lower = food_text.lower()
    for expected in ("seasonings", "more options", "next check"):
        if expected not in food_lower:
            problems.append(f"Aroma food answer card missing section: {expected}")
    problems.extend(
        ingredient_flow_control_problems(
            page,
            "#aromaAnswer",
            "Aroma food answer card",
            ("Open row", "Flavor", "Pantry"),
        )
    )
    food_action = page.locator('[data-aroma-answer-action="food"]')
    if food_action.count() != 1:
        problems.append("Aroma food answer Open row action is missing")
    else:
        food_action.click()
        page.wait_for_timeout(250)
        food_selected = page.locator("#tabFood").get_attribute("aria-selected", timeout=5_000)
        food_results = page.locator("#foodResults").inner_text(timeout=5_000)
        if food_selected != "true" or "Cumin" not in food_results:
            problems.append("Aroma food answer Open row action did not render Roasted Lamb seasonings")
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
        for problem in task_first_surface_problems(page, page_path):
            issues.append(Issue(page_path, viewport_name, problem))
        if "pairing-atlas.html" in page_path and not reduced_motion and viewport_name == "portrait":
            for problem in run_pairing_decision_smoke(page):
                issues.append(Issue(page_path, viewport_name, problem))
        if "flavor.html" in page_path and not reduced_motion and viewport_name == "portrait":
            for problem in run_flavor_decision_smoke(page):
                issues.append(Issue(page_path, viewport_name, problem))
        if "aroma.html" in page_path and "tab=browse" in page_path and not reduced_motion and viewport_name == "portrait":
            for problem in run_aroma_answer_smoke(page):
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
