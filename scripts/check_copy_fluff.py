#!/usr/bin/env python3
"""Warn on placeholder, vague, or marketing-ish copy in UI/docs files.

This is intentionally warning-first. It avoids recipe/data shards and scans only
human-authored page/docs copy plus user-facing JavaScript string literals.
"""
from __future__ import annotations

import argparse
import html
import re
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CORE_HTML = (
    "index.html",
    "riviera.html",
    "kitchen-book.html",
    "pantry.html",
    "aroma.html",
    "flavor.html",
    "pairing-atlas.html",
    "notebooklm-gallery.html",
)
GENERATED_JS = {
    "assets/qrcodejs-1.0.0.min.js",
    "assets/riviera-order-override-remap-v2.js",
}

ALLOWLIST = (
    {
        "path": "README.md",
        "rule": "placeholder",
        "contains": "your-worker.workers.dev",
        "reason": "Documented example proxy URL for local setup.",
    },
    {
        "path": "reports/workbook_catalogue.md",
        "rule": "placeholder",
        "contains": "template_demo",
        "reason": "Workbook parser category for legacy template/demo tabs.",
    },
)


@dataclass(frozen=True)
class Rule:
    name: str
    severity: str
    pattern: re.Pattern[str]


@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    severity: str
    rule: str
    text: str


RULES = (
    Rule(
        "placeholder",
        "severe",
        re.compile(
            r"\b(?:lorem\s+ipsum|tbd|todo|fixme|xxx|coming\s+soon|"
            r"under\s+construction|insert\s+(?:copy|text|content|title)|"
            r"sample\s+text|dummy\s+text|your[-\s]?(?:worker|api|key)|"
            r"template_demo)\b",
            re.IGNORECASE,
        ),
    ),
    Rule(
        "marketing-fluff",
        "warn",
        re.compile(
            r"\b(?:revolutionary|game-changing|best-in-class|world-class|"
            r"next-level|cutting-edge|powerful|robust|seamless|"
            r"effortless(?:ly)?|ultimate|unleash|elevate|"
            r"supercharge|transformative)\b",
            re.IGNORECASE,
        ),
    ),
    Rule(
        "ai-filler",
        "warn",
        re.compile(
            r"\b(?:delve|dive\s+into|journey|tapestry|crafted\s+to|"
            r"designed\s+to\s+help\s+you|at\s+your\s+fingertips|"
            r"in\s+today'?s)\b",
            re.IGNORECASE,
        ),
    ),
    Rule(
        "vague-copy",
        "warn",
        re.compile(
            r"\b(?:stuff|various|and\s+more|nice|some\s+kind\s+of|"
            r"a\s+bunch\s+of)\b",
            re.IGNORECASE,
        ),
    ),
)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def candidate_files() -> list[Path]:
    files: list[Path] = [ROOT / p for p in CORE_HTML]
    files.append(ROOT / "README.md")
    files.extend(sorted((ROOT / "docs").glob("**/*.md")))
    files.extend(sorted((ROOT / "reports").glob("*.md")))
    for p in sorted((ROOT / "assets").glob("*.js")):
        rp = rel(p)
        if rp in GENERATED_JS or p.name.endswith(".min.js"):
            continue
        files.append(p)
    return [p for p in files if p.is_file()]


def clean_text(raw: str) -> str:
    raw = html.unescape(raw)
    raw = re.sub(r"<[^>]+>", " ", raw)
    raw = raw.replace("\\n", " ").replace("\\t", " ")
    raw = raw.replace("\\'", "'").replace('\\"', '"')
    raw = re.sub(r"\s+", " ", raw)
    return raw.strip()


def looks_technical(text: str) -> bool:
    if len(text) < 8:
        return True
    if not re.search(r"[A-Za-z]{3}", text):
        return True
    if re.fullmatch(r"[.#]?[A-Za-z0-9_./:#?=&%+\-[\]{}()]+", text):
        return True
    if re.fullmatch(r"[a-z][a-z0-9_-]*(?:\s+[a-z][a-z0-9_-]*)?", text) and len(text) < 24:
        return True
    return False


def scan_text(path: Path, line_no: int, raw: str) -> list[Finding]:
    text = clean_text(raw)
    if looks_technical(text):
        return []
    out: list[Finding] = []
    for rule in RULES:
        if rule.pattern.search(text):
            if is_allowlisted(rel(path), rule.name, text):
                continue
            out.append(
                Finding(
                    path=rel(path),
                    line=line_no,
                    severity=rule.severity,
                    rule=rule.name,
                    text=text[:180],
                )
            )
    return out


def is_allowlisted(path: str, rule_name: str, text: str) -> bool:
    for item in ALLOWLIST:
        if item["path"] != path:
            continue
        if item["rule"] != rule_name:
            continue
        if item["contains"] in text:
            return True
    return False


def scan_html_or_md(path: Path) -> list[Finding]:
    findings: list[Finding] = []
    in_ignored_block = False
    in_code_fence = False
    for line_no, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        stripped = line.strip()
        if path.suffix == ".md" and stripped.startswith("```"):
            in_code_fence = not in_code_fence
            continue
        if in_code_fence:
            continue
        lower = stripped.lower()
        if "<script" in lower or "<style" in lower:
            in_ignored_block = True
        if not in_ignored_block:
            findings.extend(scan_text(path, line_no, line))
        if "</script>" in lower or "</style>" in lower:
            in_ignored_block = False
    return findings


def iter_js_strings(source: str) -> list[tuple[int, str]]:
    strings: list[tuple[int, str]] = []
    i = 0
    line_no = 1
    n = len(source)
    while i < n:
        ch = source[i]
        if ch == "\n":
            line_no += 1
            i += 1
            continue
        if ch not in ("'", '"', "`"):
            i += 1
            continue
        quote = ch
        start_line = line_no
        i += 1
        buf: list[str] = []
        escaped = False
        while i < n:
            ch = source[i]
            if ch == "\n":
                line_no += 1
            if escaped:
                buf.append(ch)
                escaped = False
                i += 1
                continue
            if ch == "\\":
                escaped = True
                i += 1
                continue
            if ch == quote:
                i += 1
                break
            buf.append(ch)
            i += 1
        strings.append((start_line, "".join(buf)))
    return strings


def scan_js(path: Path) -> list[Finding]:
    findings: list[Finding] = []
    source = path.read_text(encoding="utf-8", errors="replace")
    for line_no, string in iter_js_strings(source):
        findings.extend(scan_text(path, line_no, string))
    return findings


def collect_findings(paths: list[Path] | None = None) -> list[Finding]:
    findings: list[Finding] = []
    for path in paths or candidate_files():
        if path.suffix == ".js":
            findings.extend(scan_js(path))
        else:
            findings.extend(scan_html_or_md(path))
    return findings


def run_self_test() -> int:
    samples = {
        "Lorem ipsum placeholder copy goes here": ("severe", "placeholder"),
        "Unlock a seamless next-level experience": ("warn", "marketing-fluff"),
        "Dive into a journey of kitchen clarity": ("warn", "ai-filler"),
        "Open the order list and choose a storage zone": None,
    }
    errors = 0
    fake = ROOT / "SELFTEST.md"
    for text, expected in samples.items():
        got = scan_text(fake, 1, text)
        actual = (got[0].severity, got[0].rule) if got else None
        if actual != expected:
            errors += 1
            print(f"FAIL  self-test {text!r}: expected {expected}, got {actual}", file=sys.stderr)
    if errors:
        return 1
    print("PASS  check_copy_fluff self-test")
    return 0


def print_findings(findings: list[Finding], max_findings: int) -> None:
    severe = sum(1 for f in findings if f.severity == "severe")
    warn = len(findings) - severe
    if not findings:
        print("PASS  copy fluff: no findings")
        return
    print(f"WARN  copy fluff: {len(findings)} finding(s), {severe} severe, {warn} warn")
    for f in findings[:max_findings]:
        print(f"WARN  {f.path}:{f.line} [{f.severity}/{f.rule}] {f.text}")
    if len(findings) > max_findings:
        print(f"WARN  ... and {len(findings) - max_findings} more finding(s)")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--warn-only", action="store_true", help="Alias for --fail-on none")
    parser.add_argument(
        "--fail-on",
        choices=("none", "severe", "any"),
        default="none",
        help="Escalate findings to a non-zero exit code.",
    )
    parser.add_argument("--max-findings", type=int, default=80)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)

    if args.self_test:
        return run_self_test()

    fail_on = "none" if args.warn_only else args.fail_on
    findings = collect_findings()
    print_findings(findings, max(1, args.max_findings))
    if fail_on == "any" and findings:
        return 1
    if fail_on == "severe" and any(f.severity == "severe" for f in findings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
