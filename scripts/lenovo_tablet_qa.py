#!/usr/bin/env python3
"""Live Lenovo tablet QA checks for the static kitchen library."""
from __future__ import annotations

import argparse
import json
import re
import sys
import threading
import time
from dataclasses import dataclass
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable
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

TASK_FIRST_PAGES = (
    "pairing-atlas.html?ingredient=cumin&qa=lenovo",
    "flavor.html?q=cumin&qa=lenovo",
    "aroma.html?tab=browse&qa=lenovo",
)

VIEWPORTS = (
    ("portrait", 800, 1280),
    ("landscape", 1280, 800),
)

LOAD_MS_BUDGET = 10_000
DOM_NODE_BUDGET = 12_000
RESOURCE_BYTE_BUDGET = 28_000_000
HEAP_BYTE_BUDGET = 220_000_000
LONG_TASK_MAX_MS_BUDGET = 250
LONG_TASK_TOTAL_MS_BUDGET = 1_200
LONG_TASK_COUNT_BUDGET = 12
DECISION_RESPONSE_MS_BUDGET = 1_200
ACTION_RESPONSE_MS_BUDGET = 900
FLAVOR_QUICK_ANSWER_MS_BUDGET = 240
TASK_FIRST_READABLE_TEXT_MIN_PX = 12

CaptureState = Callable[[str], None]
TimingSink = Callable[[dict[str, Any]], None]


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


def artifact_slug(value: str, max_len: int = 120) -> str:
    decoded = unquote(value)
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", decoded).strip("-._")
    if len(slug) > max_len:
        slug = slug[:max_len].rstrip("-._")
    return slug or "item"


def resolve_artifacts_dir(value: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = ROOT / path
    return path


def cpu_throttle_label(rate: float) -> str:
    return f"cpu-{rate:g}x".replace(".", "_")


def cpu_throttle_rate(value: str) -> float:
    try:
        rate = float(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("must be a number") from exc
    if rate < 1:
        raise argparse.ArgumentTypeError("must be 1 or greater")
    return rate


def capture_page_artifact(
    page: Any,
    artifacts_dir: Path,
    page_path: str,
    viewport_name: str,
    width: int,
    height: int,
    reduced_motion: bool,
    cpu_throttle_rate_value: float,
    state: str,
    artifacts: list[dict[str, Any]],
) -> str | None:
    motion_name = "reduced-motion" if reduced_motion else "normal-motion"
    cpu_name = cpu_throttle_label(cpu_throttle_rate_value)
    page_slug = artifact_slug(page_path)
    state_slug = artifact_slug(state, max_len=56)
    filename = f"{page_slug}__{viewport_name}-{width}x{height}__{motion_name}__{cpu_name}__{state_slug}.png"
    artifact_path = artifacts_dir / filename
    try:
        artifacts_dir.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(artifact_path), full_page=False)
        scroll_y = page.evaluate("() => Math.round(window.scrollY)")
    except (OSError, PlaywrightError) as exc:
        return f"screenshot artifact failed for {state}: {exc}"
    artifacts.append(
        {
            "page": page_path,
            "viewport": viewport_name,
            "width": width,
            "height": height,
            "motion": motion_name,
            "cpuThrottleRate": cpu_throttle_rate_value,
            "state": state,
            "scrollY": scroll_y,
            "url": page.url,
            "file": artifact_path.name,
        }
    )
    return None


def write_artifact_manifest(
    artifacts_dir: Path,
    pages: tuple[str, ...],
    artifacts: list[dict[str, Any]],
    action_timings: list[dict[str, Any]],
    long_task_metrics: list[dict[str, Any]],
    cpu_throttle_rate_value: float,
    issues: list[Issue],
) -> Path:
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = artifacts_dir / "manifest.json"
    manifest = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pages": list(pages),
        "viewports": [
            {"name": name, "width": width, "height": height}
            for name, width, height in VIEWPORTS
        ],
        "cpuThrottleRate": cpu_throttle_rate_value,
        "artifacts": artifacts,
        "actionTimings": action_timings,
        "longTaskMetrics": long_task_metrics,
        "issues": [issue.__dict__ for issue in issues],
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest_path


def long_task_observer_script() -> str:
    return r"""
(() => {
  window.__lenovoLongTasks = [];
  window.__lenovoLongTaskObserverError = '';
  window.__lenovoLongTaskSupported = false;
  if (!('PerformanceObserver' in window)) return;
  try {
    const supported = PerformanceObserver.supportedEntryTypes || [];
    window.__lenovoLongTaskSupported = Array.isArray(supported) ? supported.includes('longtask') : true;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__lenovoLongTasks.push({
          name: entry.name || 'longtask',
          startTime: Math.round(Number(entry.startTime) || 0),
          duration: Math.round(Number(entry.duration) || 0)
        });
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
    window.__lenovoLongTaskSupported = true;
  } catch (err) {
    window.__lenovoLongTaskObserverError = String((err && err.message) || err);
  }
})();
"""


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
  const longTasks = Array.isArray(window.__lenovoLongTasks) ? window.__lenovoLongTasks : [];
  const longTaskDurations = longTasks.map((task) => Number(task.duration) || 0);
  const longTaskTotalMs = longTaskDurations.reduce((sum, duration) => sum + duration, 0);
  const longTaskMaxMs = longTaskDurations.reduce((max, duration) => Math.max(max, duration), 0);
  const longTaskSample = longTasks
    .slice()
    .sort((a, b) => (Number(b.duration) || 0) - (Number(a.duration) || 0))
    .slice(0, 5)
    .map((task) => ({
      name: String(task.name || 'longtask').slice(0, 80),
      startTime: Math.round(Number(task.startTime) || 0),
      duration: Math.round(Number(task.duration) || 0)
    }));

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
    runningAnimations: runningAnimations.slice(0, 12),
    longTaskSupported: !!window.__lenovoLongTaskSupported,
    longTaskObserverError: window.__lenovoLongTaskObserverError || '',
    longTaskCount: longTasks.length,
    longTaskTotalMs: Math.round(longTaskTotalMs),
    longTaskMaxMs: Math.round(longTaskMaxMs),
    longTaskSample
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


def describe_long_task(task: dict[str, Any]) -> str:
    duration = int(task.get("duration") or 0)
    start_time = int(task.get("startTime") or 0)
    return f"{duration}ms at {start_time}ms"


def timed_interaction(
    page: Any,
    label: str,
    trigger: Any,
    ready_script: str,
    problems: list[str],
    budget_ms: int = DECISION_RESPONSE_MS_BUDGET,
    timing_sink: TimingSink | None = None,
) -> int | None:
    start = time.perf_counter()
    trigger()
    try:
        page.wait_for_function(ready_script, timeout=budget_ms + 1_500)
    except PlaywrightTimeoutError:
        elapsed = int((time.perf_counter() - start) * 1000)
        if timing_sink:
            timing_sink(
                {
                    "label": label,
                    "elapsedMs": elapsed,
                    "budgetMs": budget_ms,
                    "status": "timeout",
                }
            )
        problems.append(f"{label} did not answer within {budget_ms}ms budget")
        return None
    elapsed = int((time.perf_counter() - start) * 1000)
    status = "over-budget" if elapsed > budget_ms else "ok"
    if timing_sink:
        timing_sink(
            {
                "label": label,
                "elapsedMs": elapsed,
                "budgetMs": budget_ms,
                "status": status,
            }
        )
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


def ingredient_flow_priority_problems(
    page: Any,
    selector: str,
    label: str,
    expected_texts: tuple[str, ...],
    before_selector: str | None = None,
) -> list[str]:
    priority = page.locator(selector)
    if priority.count() != 1:
        return [f"{label} priority summary is missing"]
    text = priority.inner_text(timeout=5_000).lower()
    problems: list[str] = []
    for expected in expected_texts:
        if expected.lower() not in text:
            problems.append(f"{label} priority summary missing: {expected}")
    if before_selector:
        priority_before_detail = page.evaluate(
            """([prioritySelector, beforeSelector]) => {
              const priority = document.querySelector(prioritySelector);
              const detail = document.querySelector(beforeSelector);
              return !!(priority && detail &&
                (priority.compareDocumentPosition(detail) & Node.DOCUMENT_POSITION_FOLLOWING));
            }""",
            [selector, before_selector],
        )
        if not priority_before_detail:
            problems.append(f"{label} priority summary is not before supporting detail")
    return problems


def task_first_surface_spec(page_path: str) -> dict[str, Any] | None:
    if "pairing-atlas.html" in page_path:
        return {
            "label": "Pairing Atlas answer surface",
            "items": [
                {
                    "name": "decision search",
                    "selector": "#paDecisionSearch",
                    "role": "control",
                    "beforeSelector": ".pa-toolbar",
                    "beforeName": "matrix controls",
                },
                {
                    "name": "answer button",
                    "selector": "#paDecisionSubmit",
                    "role": "control",
                    "beforeSelector": ".pa-toolbar",
                    "beforeName": "matrix controls",
                },
                {
                    "name": "decision answer",
                    "selector": "#paDecisionBody",
                    "role": "answer",
                    "beforeSelector": ".pa-toolbar",
                    "beforeName": "matrix controls",
                    "readabilitySelector": ".ingredient-flow-priority-value, .ingredient-flow-chip, .ingredient-flow-use-list, .ingredient-flow-section p, .ingredient-flow-note, .ingredient-flow-empty",
                },
            ],
        }
    if "flavor.html" in page_path:
        return {
            "label": "Flavor answer surface",
            "items": [
                {
                    "name": "answer search",
                    "selector": "#flavorSearch",
                    "role": "control",
                    "beforeSelector": ".flavor-tabs",
                    "beforeName": "secondary tabs",
                },
                {
                    "name": "quick answer",
                    "selector": "#flavorAnswer",
                    "role": "answer",
                    "beforeSelector": ".flavor-tabs",
                    "beforeName": "secondary tabs",
                    "readabilitySelector": ".ingredient-flow-priority-value, .ingredient-flow-chip, .ingredient-flow-use-list, .ingredient-flow-section p, .ingredient-flow-note, .ingredient-flow-empty",
                },
            ],
        }
    if "aroma.html" in page_path:
        return {
            "label": "Aroma answer surface",
            "items": [
                {
                    "name": "answer search",
                    "selector": "#aromaSearch",
                    "role": "control",
                    "beforeSelector": ".aroma-modes",
                    "beforeName": "mode tabs",
                },
                {
                    "name": "quick answer",
                    "selector": "#aromaAnswer",
                    "role": "answer",
                    "beforeSelector": ".aroma-modes",
                    "beforeName": "mode tabs",
                    "readabilitySelector": ".ingredient-flow-priority-value, .ingredient-flow-chip, .ingredient-flow-use-list, .ingredient-flow-section p, .ingredient-flow-note, .ingredient-flow-empty",
                },
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
  function label(el) {
    return (el.innerText || el.textContent || el.getAttribute('aria-label') || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 80);
  }
  function isVisible(el) {
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
  function readableTextIssues(el, item) {
    const minPx = Number(item.minReadableTextPx || 12);
    const selector = item.readabilitySelector;
    if (!selector) return [];
    return Array.from(el.querySelectorAll(selector))
      .filter(isVisible)
      .map((node) => {
        const fontSize = parseFloat(getComputedStyle(node).fontSize || '16');
        return {
          tag: node.tagName.toLowerCase(),
          cls: String(node.className || '').slice(0, 80),
          text: label(node),
          fontSize: Number(fontSize.toFixed(1)),
          minPx,
        };
      })
      .filter((entry) => entry.text && entry.fontSize < minPx)
      .slice(0, 8);
  }
  function readItem(item) {
    const el = document.querySelector(item.selector);
    if (!el) return Object.assign({}, item, { missing: true });
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const before = item.beforeSelector ? document.querySelector(item.beforeSelector) : null;
    const beforeStyle = before ? getComputedStyle(before) : null;
    const beforeRect = before ? before.getBoundingClientRect() : null;
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
      beforeMissing: !!item.beforeSelector && !before,
      beforeHidden: !!(before && (
        beforeStyle.display === 'none' ||
        beforeStyle.visibility === 'hidden' ||
        Number(beforeStyle.opacity || 1) === 0 ||
        beforeRect.width <= 0 ||
        beforeRect.height <= 0
      )),
      beforeTop: beforeRect ? Math.round(beforeRect.top) : null,
      tinyReadableText: readableTextIssues(el, item),
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
        tiny_text = item.get("tinyReadableText") or []
        if role == "answer" and tiny_text:
            sample = "; ".join(
                f"{str(t.get('text') or t.get('cls') or t.get('tag') or 'text')} {t.get('fontSize')}px"
                for t in tiny_text[:5]
            )
            min_px = tiny_text[0].get("minPx", TASK_FIRST_READABLE_TEXT_MIN_PX)
            problems.append(f"{label} {name} has answer text below {min_px}px: {sample}")
        before_selector = item.get("beforeSelector")
        if before_selector:
            before_name = str(item.get("beforeName") or before_selector)
            if item.get("beforeMissing"):
                problems.append(f"{label} cannot compare {name} before {before_name}: {before_selector} missing")
            elif not item.get("beforeHidden"):
                before_top = float(item.get("beforeTop") or 0)
                if top > before_top + 1:
                    problems.append(f"{label} {name} appears below {before_name}")
    return problems


def issues_from_metrics(page_path: str, viewport_name: str, metric: dict[str, Any], reduced_motion: bool) -> list[Issue]:
    issues: list[Issue] = []
    prefix = f"scrollY={metric.get('scrollY')}"
    if not metric.get("lenovoProfile"):
        issues.append(Issue(page_path, viewport_name, f"{prefix}: lenovo tablet profile class did not apply"))
    elif not metric.get("lowMemoryProfile"):
        issues.append(Issue(page_path, viewport_name, f"{prefix}: low-memory tablet profile class did not apply"))
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
    long_task_max = int(metric.get("longTaskMaxMs") or 0)
    long_task_total = int(metric.get("longTaskTotalMs") or 0)
    long_task_count = int(metric.get("longTaskCount") or 0)
    long_task_sample = metric.get("longTaskSample") or []
    if long_task_max > LONG_TASK_MAX_MS_BUDGET:
        sample = "; ".join(describe_long_task(t) for t in long_task_sample[:5])
        issues.append(
            Issue(
                page_path,
                viewport_name,
                f"{prefix}: long task max budget exceeded {long_task_max}ms > {LONG_TASK_MAX_MS_BUDGET}ms: {sample}",
            )
        )
    if long_task_total > LONG_TASK_TOTAL_MS_BUDGET:
        sample = "; ".join(describe_long_task(t) for t in long_task_sample[:5])
        issues.append(
            Issue(
                page_path,
                viewport_name,
                f"{prefix}: long task total budget exceeded {long_task_total}ms > {LONG_TASK_TOTAL_MS_BUDGET}ms: {sample}",
            )
        )
    if long_task_count > LONG_TASK_COUNT_BUDGET:
        sample = "; ".join(describe_long_task(t) for t in long_task_sample[:5])
        issues.append(
            Issue(
                page_path,
                viewport_name,
                f"{prefix}: long task count budget exceeded {long_task_count} > {LONG_TASK_COUNT_BUDGET}: {sample}",
            )
        )
    return issues


def run_pairing_decision_smoke(
    page: Any,
    capture_state: CaptureState | None = None,
    timing_sink: TimingSink | None = None,
) -> list[str]:
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
        timing_sink=timing_sink,
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
        timing_sink=timing_sink,
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
        timing_sink=timing_sink,
    )
    body_text = page.locator("#paDecisionBody").inner_text(timeout=5_000)
    if "Cumin" not in body_text:
        problems.append("decision panel did not keep the first ingredient from 'pair cumin with lamb'")
    if capture_state:
        capture_state("pairing-cumin-answer")
    problems.extend(
        ingredient_flow_priority_problems(
            page,
            '#paDecisionBody .pa-answer[data-decision-spice-id="cumin"] [data-pa-answer-priority]',
            "Pairing Atlas Cumin answer",
            ("pair first", "use now", "fenugreek"),
            '#paDecisionBody .pa-answer[data-decision-spice-id="cumin"] .pa-answer__grid',
        )
    )
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
    timed_interaction(
        page,
        "Pairing Atlas decision Show row",
        lambda: page.locator('[data-pa-decision-action="matrix"]').click(),
        "() => !!document.querySelector('tr.pa-data-row[data-spice-id=\"cumin\"].pa-row-open')",
        problems,
        ACTION_RESPONSE_MS_BUDGET,
        timing_sink=timing_sink,
    )
    row_open = page.evaluate(
        "() => !!document.querySelector('tr.pa-data-row[data-spice-id=\"cumin\"].pa-row-open')"
    )
    if not row_open:
        problems.append("decision panel Show row did not open the cumin matrix row")
    selected_profile = page.locator('#paMatrixHost [data-pa-selected-profile][data-selected-spice-id="cumin"]')
    if selected_profile.count() != 1:
        problems.append("Cumin selected profile dock is missing after Show row")
    else:
        selected_text = selected_profile.inner_text(timeout=5_000).lower()
        for expected in ("cumin", "kitchen profile", "pair first", "use now"):
            if expected not in selected_text:
                problems.append(f"Cumin selected profile dock missing: {expected}")
        selected_is_sticky = page.evaluate(
            """() => {
              const profile = document.querySelector('#paMatrixHost [data-pa-selected-profile]');
              return !!profile && getComputedStyle(profile).position === 'sticky';
            }"""
        )
        if not selected_is_sticky:
            problems.append("Cumin selected profile dock is not sticky inside the matrix")
        selected_before_table = page.evaluate(
            """() => {
              const profile = document.querySelector('#paMatrixHost [data-pa-selected-profile]');
              const table = document.querySelector('#paSpiceMatrix');
              return !!(profile && table &&
                (profile.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING));
            }"""
        )
        if not selected_before_table:
            problems.append("Cumin selected profile dock is not before the spice table")
        problems.extend(
            ingredient_flow_control_problems(
                page,
                '#paMatrixHost [data-pa-selected-profile][data-selected-spice-id="cumin"]',
                "Pairing Atlas cumin selected profile dock",
                ("Aroma", "Flavor", "Toolkit"),
            )
        )
    drawer_profile = page.locator('tr.pa-drawer-row[data-drawer-for="cumin"] [data-pa-drawer-profile]')
    if drawer_profile.count() != 0:
        problems.append("Cumin row drawer repeats the selected quick-answer profile")
    drawer_title = page.locator('tr.pa-drawer-row[data-drawer-for="cumin"] .pa-drawer-title')
    if drawer_title.count() != 1 or "Cumin" not in drawer_title.inner_text(timeout=5_000):
        problems.append("Cumin row drawer source detail does not show the ingredient title")
    source_map = page.locator('tr.pa-drawer-row[data-drawer-for="cumin"] [data-pa-source-map]')
    if source_map.count() != 1:
        problems.append("Cumin row drawer source map is missing")
    else:
        source_map_text = source_map.inner_text(timeout=5_000).lower()
        for expected in ("aroma groups", "harmony network", "flavor row", "library context"):
            if expected not in source_map_text:
                problems.append(f"Cumin row source map missing: {expected}")
        if "kitchen profile" in source_map_text or "pair first" in source_map_text:
            problems.append("Cumin row source map duplicates the quick kitchen answer")
    source_detail = page.locator('tr.pa-drawer-row[data-drawer-for="cumin"] [data-pa-source-detail]')
    if source_detail.count() != 1:
        problems.append("Cumin row source detail is missing")
    else:
        source_text = source_detail.inner_text(timeout=5_000).lower()
        for expected in ("aroma groups", "harmonizes with", "flavor thesaurus", "flavor bible"):
            if expected not in source_text:
                problems.append(f"Cumin row source detail missing section: {expected}")
        if "kitchen profile" in source_text or "pair first" in source_text:
            problems.append("Cumin row source detail still duplicates the quick kitchen answer")
    if capture_state:
        capture_state("pairing-cumin-row-open")
    timed_interaction(
        page,
        "Pairing Atlas food phrase answer",
        lambda: (search.fill("what goes with lamb?"), page.locator("#paDecisionSubmit").click()),
        "() => !!document.querySelector('#paDecisionBody .pa-answer[data-decision-food-id=\"roasted-lamb\"]')",
        problems,
        timing_sink=timing_sink,
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
    timed_interaction(
        page,
        "Pairing Atlas herbs-for-lamb phrase answer",
        lambda: (search.fill("what herbs for lamb?"), page.locator("#paDecisionSubmit").click()),
        "() => !!document.querySelector('#paDecisionBody .pa-answer[data-decision-food-id=\"roasted-lamb\"]')",
        problems,
        timing_sink=timing_sink,
    )
    body_text = page.locator("#paDecisionBody").inner_text(timeout=5_000)
    if "Roasted Lamb" not in body_text or "Cumin" not in body_text:
        problems.append("Pairing Atlas herbs-for-lamb phrase did not render the Roasted Lamb seasoning answer")
    timed_interaction(
        page,
        "Pairing Atlas season-lamb phrase answer",
        lambda: (search.fill("what should I season lamb with?"), page.locator("#paDecisionSubmit").click()),
        "() => !!document.querySelector('#paDecisionBody .pa-answer[data-decision-food-id=\"roasted-lamb\"]')",
        problems,
        timing_sink=timing_sink,
    )
    body_text = page.locator("#paDecisionBody").inner_text(timeout=5_000)
    if "Roasted Lamb" not in body_text or "Cumin" not in body_text:
        problems.append("Pairing Atlas season-lamb phrase did not render the Roasted Lamb seasoning answer")
    if capture_state:
        capture_state("pairing-roasted-lamb-answer")
    problems.extend(
        ingredient_flow_priority_problems(
            page,
            '#paDecisionBody .pa-answer[data-decision-food-id="roasted-lamb"] [data-pa-answer-priority]',
            "Pairing Atlas Roasted Lamb answer",
            ("season first", "next check"),
            '#paDecisionBody .pa-answer[data-decision-food-id="roasted-lamb"] .pa-answer__grid',
        )
    )
    problems.extend(
        ingredient_flow_control_problems(
            page,
            "#paDecisionBody .pa-answer.ingredient-flow",
            "Pairing Atlas food decision answer",
            ("Open row", "Aroma", "Flavor"),
        )
    )
    timed_interaction(
        page,
        "Pairing Atlas food decision Open row",
        lambda: page.locator('[data-pa-decision-action="food"]').click(),
        "() => !!document.querySelector('tr.pa-fx-data[data-food-id=\"roasted-lamb\"].pa-row-open')",
        problems,
        ACTION_RESPONSE_MS_BUDGET,
        timing_sink=timing_sink,
    )
    food_drawer = page.locator('tr.pa-drawer-row[data-food-drawer="roasted-lamb"]')
    if food_drawer.count() != 1:
        problems.append("Roasted Lamb food drawer is missing after food decision Open row")
    elif capture_state:
        capture_state("pairing-roasted-lamb-row-open")
    stale_spice_profile = page.locator("#paMatrixHost [data-pa-selected-profile]")
    if stale_spice_profile.count() != 0:
        problems.append("Spice selected profile stayed open after switching to the food matrix")
    return problems


def run_flavor_decision_smoke(
    page: Any,
    capture_state: CaptureState | None = None,
    timing_sink: TimingSink | None = None,
) -> list[str]:
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
        FLAVOR_QUICK_ANSWER_MS_BUDGET,
        timing_sink=timing_sink,
    )
    body_text = answer.inner_text(timeout=5_000)
    if "Lamb" not in body_text:
        problems.append("Flavor answer card did not render Lamb from a kitchen phrase")
    if "Cumin" not in body_text:
        problems.append("Flavor Lamb answer did not surface Cumin from the Aroma food-seasoning row")
    timed_interaction(
        page,
        "Flavor herbs-for-lamb phrase answer",
        lambda: search.fill("what herbs for lamb?"),
        "() => /\\bLamb\\b/.test(document.querySelector('#flavorAnswer .ingredient-flow-title')?.textContent || '')",
        problems,
        FLAVOR_QUICK_ANSWER_MS_BUDGET,
        timing_sink=timing_sink,
    )
    body_text = answer.inner_text(timeout=5_000)
    if "Lamb" not in body_text or "Cumin" not in body_text:
        problems.append("Flavor herbs-for-lamb phrase did not keep the Lamb answer with Cumin context")
    timed_interaction(
        page,
        "Flavor season-lamb phrase answer",
        lambda: search.fill("what should I season lamb with?"),
        "() => /\\bLamb\\b/.test(document.querySelector('#flavorAnswer .ingredient-flow-title')?.textContent || '')",
        problems,
        FLAVOR_QUICK_ANSWER_MS_BUDGET,
        timing_sink=timing_sink,
    )
    body_text = answer.inner_text(timeout=5_000)
    if "Lamb" not in body_text or "Cumin" not in body_text:
        problems.append("Flavor season-lamb phrase did not keep the Lamb answer with Cumin context")
    timed_interaction(
        page,
        "Flavor food phrase answer",
        lambda: search.fill("what goes with roasted lamb?"),
        "() => !!document.querySelector('#flavorAnswer [data-decision-food-id=\"roasted-lamb\"]')",
        problems,
        FLAVOR_QUICK_ANSWER_MS_BUDGET,
        timing_sink=timing_sink,
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
    if capture_state:
        capture_state("flavor-roasted-lamb-answer")
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
        FLAVOR_QUICK_ANSWER_MS_BUDGET,
        timing_sink=timing_sink,
    )
    body_text = answer.inner_text(timeout=5_000)
    if "Cumin" not in body_text:
        problems.append("Flavor answer card did not render Cumin from a kitchen phrase")
    try:
        page.wait_for_function(
            "() => document.querySelector('#flavorDetail')?.getAttribute('data-flavor-detail-id') === 'cumin'",
            timeout=DECISION_RESPONSE_MS_BUDGET,
        )
    except PlaywrightTimeoutError:
        problems.append("Flavor answer did not auto-sync Cumin into the detail pane")
    if capture_state:
        capture_state("flavor-cumin-answer")
    problems.extend(
        ingredient_flow_priority_problems(
            page,
            "#flavorAnswer [data-flavor-answer-priority]",
            "Flavor Cumin answer",
            ("pair first", "use now"),
            "#flavorAnswer .flavor-answer-grid",
        )
    )
    timed_interaction(
        page,
        "Flavor first-ingredient phrase answer",
        lambda: search.fill("pair lamb with cumin"),
        "() => /\\bLamb\\b/.test(document.querySelector('#flavorAnswer .ingredient-flow-title')?.textContent || '')",
        problems,
        FLAVOR_QUICK_ANSWER_MS_BUDGET,
        timing_sink=timing_sink,
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
        FLAVOR_QUICK_ANSWER_MS_BUDGET,
        timing_sink=timing_sink,
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
        timed_interaction(
            page,
            "Flavor answer Full detail",
            lambda: detail_action.click(),
            "() => /CUMIN/.test(document.querySelector('#flavorDetail')?.textContent?.toUpperCase() || '')",
            problems,
            ACTION_RESPONSE_MS_BUDGET,
            timing_sink=timing_sink,
        )
        detail_text = page.locator("#flavorDetail").inner_text(timeout=5_000)
        if "CUMIN" not in detail_text.upper():
            problems.append("Flavor answer Full detail did not open Cumin detail")
        elif capture_state:
            capture_state("flavor-cumin-detail")
    return problems


def run_aroma_answer_smoke(
    page: Any,
    capture_state: CaptureState | None = None,
    timing_sink: TimingSink | None = None,
) -> list[str]:
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
    timed_interaction(
        page,
        "Aroma spice phrase answer",
        lambda: (search.fill("what goes with cumin?"), search.press("Enter")),
        "() => /\\bCumin\\b/.test(document.querySelector('#aromaAnswer .ingredient-flow-title')?.textContent || '')",
        problems,
        timing_sink=timing_sink,
    )
    body_text = answer.inner_text(timeout=5_000)
    if "Cumin" not in body_text:
        problems.append("Aroma answer card did not render Cumin from a kitchen phrase")
    problems.extend(
        ingredient_flow_priority_problems(
            page,
            "#aromaAnswer [data-aroma-answer-priority]",
            "Aroma Cumin answer",
            ("pair first", "use now", "fenugreek"),
            "#aromaAnswer .ingredient-flow-grid",
        )
    )
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
        timed_interaction(
            page,
            "Aroma answer Matrix action",
            lambda: matrix_action.click(),
            "() => document.querySelector('#tabMatrix')?.getAttribute('aria-selected') === 'true' && document.querySelector('#matrixFocus')?.value === 'cumin'",
            problems,
            ACTION_RESPONSE_MS_BUDGET,
            timing_sink=timing_sink,
        )
        matrix_selected = page.locator("#tabMatrix").get_attribute("aria-selected", timeout=5_000)
        matrix_focus = page.locator("#matrixFocus").input_value(timeout=5_000)
        if matrix_selected != "true" or matrix_focus != "cumin":
            problems.append("Aroma answer Matrix action did not focus Cumin in the matrix")
        elif capture_state:
            capture_state("aroma-cumin-matrix")
    profile_action = page.locator('[data-aroma-answer-action="profile"]')
    if profile_action.count() != 1:
        problems.append("Aroma answer Profile action is missing")
    else:
        timed_interaction(
            page,
            "Aroma answer Profile action",
            lambda: profile_action.click(),
            "() => /Cumin/.test(document.querySelector('#spiceProfile')?.textContent || '')",
            problems,
            ACTION_RESPONSE_MS_BUDGET,
            timing_sink=timing_sink,
        )
        profile_text = page.locator("#spiceProfile").inner_text(timeout=5_000)
        if "Cumin" not in profile_text:
            problems.append("Aroma answer Profile action did not open Cumin profile")
        elif capture_state:
            capture_state("aroma-cumin-profile")
    timed_interaction(
        page,
        "Aroma herbs-for-lamb phrase answer",
        lambda: (search.fill("what herbs for lamb?"), search.press("Enter")),
        "() => /\\bRoasted Lamb\\b/.test(document.querySelector('#aromaAnswer .ingredient-flow-title')?.textContent || '')",
        problems,
        timing_sink=timing_sink,
    )
    food_text = answer.inner_text(timeout=5_000)
    if "Roasted Lamb" not in food_text:
        problems.append("Aroma answer card did not render Roasted Lamb food answer from a kitchen phrase")
    timed_interaction(
        page,
        "Aroma season-lamb phrase answer",
        lambda: (search.fill("what should I season lamb with?"), search.press("Enter")),
        "() => /\\bRoasted Lamb\\b/.test(document.querySelector('#aromaAnswer .ingredient-flow-title')?.textContent || '')",
        problems,
        timing_sink=timing_sink,
    )
    food_text = answer.inner_text(timeout=5_000)
    if "Roasted Lamb" not in food_text or "Cumin" not in food_text:
        problems.append("Aroma season-lamb phrase did not render the Roasted Lamb food answer")
    problems.extend(
        ingredient_flow_priority_problems(
            page,
            "#aromaAnswer [data-aroma-answer-priority]",
            "Aroma Roasted Lamb answer",
            ("season first", "next check"),
            "#aromaAnswer .ingredient-flow-grid",
        )
    )
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
        timed_interaction(
            page,
            "Aroma food answer Open row",
            lambda: food_action.click(),
            "() => { const p = new URLSearchParams(location.search); return p.get('tab') === 'food' && p.get('food') === 'roasted-lamb' && document.querySelector('#tabFood')?.getAttribute('aria-selected') === 'true' && !!document.querySelector('#foodResults [data-spice-id=\"cumin\"]'); }",
            problems,
            ACTION_RESPONSE_MS_BUDGET,
            timing_sink=timing_sink,
        )
        food_open = page.evaluate(
            """() => {
              const p = new URLSearchParams(location.search);
              return p.get('tab') === 'food' &&
                p.get('food') === 'roasted-lamb' &&
                document.querySelector('#tabFood')?.getAttribute('aria-selected') === 'true' &&
                !!document.querySelector('#foodResults [data-spice-id="cumin"]');
            }"""
        )
        if not food_open:
            problems.append("Aroma food answer Open row action did not render Roasted Lamb seasonings")
        elif capture_state:
            capture_state("aroma-roasted-lamb-row-open")
    return problems


def run_page(
    browser: Any,
    base: str,
    page_path: str,
    viewport_name: str,
    width: int,
    height: int,
    reduced_motion: bool,
    artifacts_dir: Path | None = None,
    artifacts: list[dict[str, Any]] | None = None,
    action_timings: list[dict[str, Any]] | None = None,
    long_task_metrics: list[dict[str, Any]] | None = None,
    cpu_throttle_rate_value: float = 1.0,
) -> list[Issue]:
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        is_mobile=False,
        has_touch=True,
        reduced_motion="reduce" if reduced_motion else "no-preference",
    )
    page = context.new_page()
    page.add_init_script(long_task_observer_script())
    console_errors: list[str] = []
    page_errors: list[str] = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: page_errors.append(str(exc)) if exc else None)
    issues: list[Issue] = []

    def capture_state(state: str) -> None:
        if artifacts_dir is None or artifacts is None:
            return
        problem = capture_page_artifact(
            page,
            artifacts_dir,
            page_path,
            viewport_name,
            width,
            height,
            reduced_motion,
            cpu_throttle_rate_value,
            state,
            artifacts,
        )
        if problem:
            issues.append(Issue(page_path, viewport_name, problem))

    def record_timing(entry: dict[str, Any]) -> None:
        if action_timings is None:
            return
        motion_name = "reduced-motion" if reduced_motion else "normal-motion"
        action_timings.append(
            {
                "page": page_path,
                "viewport": viewport_name,
                "width": width,
                "height": height,
                "motion": motion_name,
                "cpuThrottleRate": cpu_throttle_rate_value,
                "url": page.url,
                **entry,
            }
        )

    def record_long_task_metric(metric: dict[str, Any]) -> None:
        if long_task_metrics is None:
            return
        motion_name = "reduced-motion" if reduced_motion else "normal-motion"
        long_task_metrics.append(
            {
                "page": page_path,
                "viewport": viewport_name,
                "width": width,
                "height": height,
                "motion": motion_name,
                "cpuThrottleRate": cpu_throttle_rate_value,
                "url": metric.get("url"),
                "scrollY": metric.get("scrollY"),
                "lenovoProfile": bool(metric.get("lenovoProfile")),
                "lowMemoryProfile": bool(metric.get("lowMemoryProfile")),
                "supported": bool(metric.get("longTaskSupported")),
                "observerError": metric.get("longTaskObserverError") or "",
                "count": int(metric.get("longTaskCount") or 0),
                "totalMs": int(metric.get("longTaskTotalMs") or 0),
                "maxMs": int(metric.get("longTaskMaxMs") or 0),
                "sample": metric.get("longTaskSample") or [],
            }
        )

    try:
        if cpu_throttle_rate_value > 1:
            try:
                cdp = context.new_cdp_session(page)
                cdp.send("Emulation.setCPUThrottlingRate", {"rate": cpu_throttle_rate_value})
            except PlaywrightError as exc:
                issues.append(
                    Issue(
                        page_path,
                        viewport_name,
                        f"CPU throttling unavailable at {cpu_throttle_rate_value:g}x: {exc}",
                    )
                )
        page.goto(urljoin(base, page_path), wait_until="networkidle", timeout=25_000)
        page.wait_for_timeout(600)
        capture_state("loaded")
        for problem in task_first_surface_problems(page, page_path):
            issues.append(Issue(page_path, viewport_name, problem))
        if "pairing-atlas.html" in page_path and not reduced_motion and viewport_name == "portrait":
            for problem in run_pairing_decision_smoke(page, capture_state, record_timing):
                issues.append(Issue(page_path, viewport_name, problem))
        if "flavor.html" in page_path and not reduced_motion and viewport_name == "portrait":
            for problem in run_flavor_decision_smoke(page, capture_state, record_timing):
                issues.append(Issue(page_path, viewport_name, problem))
        if "aroma.html" in page_path and "tab=browse" in page_path and not reduced_motion and viewport_name == "portrait":
            for problem in run_aroma_answer_smoke(page, capture_state, record_timing):
                issues.append(Issue(page_path, viewport_name, problem))
        for metric in collect_metrics(page):
            record_long_task_metric(metric)
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
        "--task-first-only",
        action="store_true",
        help="Only run the task-first ingredient decision pages.",
    )
    parser.add_argument(
        "--viewport",
        choices=("all", "portrait", "landscape"),
        default="all",
        help="Viewport subset to run. Defaults to all.",
    )
    parser.add_argument(
        "--motion",
        choices=("all", "normal", "reduced"),
        default="all",
        help="Motion profile subset to run. Defaults to all.",
    )
    parser.add_argument(
        "--reduced-motion",
        action="store_true",
        help="Only run the reduced-motion profile. Equivalent to --motion reduced.",
    )
    parser.add_argument(
        "--cpu-throttle-rate",
        type=cpu_throttle_rate,
        default=1.0,
        help="Optional Chromium CPU throttling rate. Use 1 for no throttling, 2+ for tablet stress.",
    )
    parser.add_argument(
        "--artifacts-dir",
        help="Optional directory for viewport screenshots and manifest.json, e.g. reports/lenovo_tablet_qa/latest.",
    )
    return parser.parse_args(argv)


def selected_pages(args: argparse.Namespace) -> tuple[str, ...]:
    if args.pages:
        return tuple(p.strip() for p in args.pages.split(",") if p.strip())
    if args.task_first_only:
        return TASK_FIRST_PAGES
    return CORE_PAGES


def selected_motion_modes(args: argparse.Namespace) -> tuple[bool, ...]:
    if args.reduced_motion or args.motion == "reduced":
        return (True,)
    if args.motion == "normal":
        return (False,)
    return (False, True)


def selected_viewports(args: argparse.Namespace) -> tuple[tuple[str, int, int], ...]:
    if args.viewport == "all":
        return VIEWPORTS
    return tuple(viewport for viewport in VIEWPORTS if viewport[0] == args.viewport)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    pages = selected_pages(args)
    viewports = selected_viewports(args)
    cpu_throttle_rate_value = float(args.cpu_throttle_rate)
    artifacts_dir = resolve_artifacts_dir(args.artifacts_dir) if args.artifacts_dir else None
    artifacts: list[dict[str, Any]] = []
    action_timings: list[dict[str, Any]] = []
    long_task_metrics: list[dict[str, Any]] = []
    server, base = start_server()
    all_issues: list[Issue] = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                motion_modes = selected_motion_modes(args)
                for reduced_motion in motion_modes:
                    motion_label = "reduced motion" if reduced_motion else "normal motion"
                    for viewport_name, width, height in viewports:
                        label = f"{viewport_name} {width}x{height}, {motion_label}"
                        if cpu_throttle_rate_value > 1:
                            label = f"{label}, {cpu_throttle_rate_value:g}x CPU"
                        for page_path in pages:
                            issues = run_page(
                                browser,
                                base,
                                page_path,
                                viewport_name,
                                width,
                                height,
                                reduced_motion,
                                artifacts_dir,
                                artifacts,
                                action_timings if artifacts_dir else None,
                                long_task_metrics if artifacts_dir else None,
                                cpu_throttle_rate_value,
                            )
                            if issues:
                                all_issues.extend(issues)
                            else:
                                ok(f"{page_path} {label}")
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()

    if artifacts_dir:
        manifest_path = write_artifact_manifest(
            artifacts_dir,
            pages,
            artifacts,
            action_timings,
            long_task_metrics,
            cpu_throttle_rate_value,
            all_issues,
        )
        ok(f"Lenovo tablet QA artifacts written to {manifest_path}")

    if all_issues:
        for issue in all_issues:
            fail(f"{issue.page} [{issue.viewport}]: {issue.message}")
        fail(f"Lenovo tablet QA found {len(all_issues)} issue(s)")
        return 1
    ok("Lenovo tablet QA passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
