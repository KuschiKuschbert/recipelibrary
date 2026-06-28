#!/usr/bin/env python3
"""Add selection rules to function_packages.json courses from label text."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PKG = ROOT / "riviera_data" / "function_packages.json"
REPORT = ROOT / "reports" / "package_selection_rules.md"


def parse_selection(course_label: str) -> dict:
    label = course_label.strip()
    low = label.lower()
    if "all included" in low:
        return {"mode": "all"}
    m = re.search(r"choose\s+(\d+)\s*[–-]\s*(\d+)", low)
    if m:
        return {"mode": "pick", "min": int(m.group(1)), "max": int(m.group(2))}
    m = re.search(r"choose\s+(\d+)\s+or\s+(\d+)", low)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        return {"mode": "pick", "min": min(a, b), "max": max(a, b)}
    m = re.search(r"choose\s+(\d+)", low)
    if m:
        n = int(m.group(1))
        return {"mode": "pick", "min": n, "max": n}
    if "choose from" in low or low.startswith("choose one") or low.startswith("choose selection"):
        return {"mode": "pick", "min": 1, "max": None}
    if "choose" in low:
        return {"mode": "pick", "min": 1, "max": None}
    return {"mode": "optional", "min": 0, "max": None}


def main() -> None:
    data = json.loads(PKG.read_text(encoding="utf-8"))
    rows: list[str] = []
    for pkg in data.get("packages", []):
        for sec in pkg.get("sections", []):
            for ci, course in enumerate(sec.get("courses", [])):
                label = course.get("course", "")
                sel = parse_selection(label)
                course["selection"] = sel
                rows.append(
                    f"| {pkg['label']} | {sec['label']} | {label} | `{sel}` |"
                )
    PKG.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    REPORT.write_text(
        "# Package course selection rules\n\n"
        "| Event | Section | Course | selection |\n|---|---|---|---|\n"
        + "\n".join(rows)
        + "\n",
        encoding="utf-8",
    )
    print(f"Annotated courses: {len(rows)}")
    print(f"Wrote {PKG.name}, {REPORT.name}")


if __name__ == "__main__":
    main()
