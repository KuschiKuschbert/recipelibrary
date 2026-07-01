#!/usr/bin/env python3
"""Run the local pre-ship checks for the static kitchen library."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def ok(msg: str) -> None:
    print(f"PASS  {msg}")


def fail(msg: str) -> None:
    print(f"FAIL  {msg}", file=sys.stderr)


def run_cmd(label: str, cmd: list[str]) -> int:
    print(f"\n== {label} ==", flush=True)
    r = subprocess.run(cmd, cwd=ROOT)
    if r.returncode == 0:
        ok(label)
    else:
        fail(f"{label} exited {r.returncode}")
    return r.returncode


def asset_js_files() -> list[str]:
    files: list[str] = []
    for p in sorted((ROOT / "assets").glob("*.js")):
        if p.name.endswith(".min.js"):
            continue
        files.append(p.relative_to(ROOT).as_posix())
    return files


def check_js_files(files: list[str]) -> int:
    print("\n== node --check assets/*.js ==", flush=True)
    errors = 0
    for rel in files:
        r = subprocess.run(["node", "--check", rel], cwd=ROOT, capture_output=True, text=True)
        if r.returncode == 0:
            ok(f"node --check {rel}")
        else:
            errors += 1
            fail(f"node --check {rel}: {r.stderr.strip()}")
    return errors


def main() -> int:
    errors = 0

    js_files = asset_js_files()
    if js_files:
        errors += check_js_files(js_files)

    checks = (
        ("planner acceptance smoke", [sys.executable, "scripts/planner_acceptance_smoke.py"]),
        ("service-worker validation", [sys.executable, "scripts/validate_sw.py"]),
        ("static smoke", [sys.executable, "scripts/static_smoke.py"]),
        ("Lenovo tablet browser QA", [sys.executable, "scripts/lenovo_tablet_qa.py"]),
        ("copy fluff warnings", [sys.executable, "scripts/check_copy_fluff.py", "--warn-only"]),
    )
    for label, cmd in checks:
        errors += run_cmd(label, cmd)

    if errors:
        fail("ship check failed")
        return 1
    ok("ship check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
