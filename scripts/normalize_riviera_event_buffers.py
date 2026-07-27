#!/usr/bin/env python3
"""Normalise planner-consumed Riviera buffer fields to the V13 policy.

The planner previously mixed an already-buffered ``production_*`` quantity with
another multiplier, which could apply an allowance twice.  V13 keeps the
service target as the base quantity and records one explicit automatic event
buffer:

* 1.09 for applicable event buffet, canapé/cocktail, plated and dessert work;
* 1.00 for fixed platter and corporate-box modules that previously carried a
  generic allowance;
* no automatic buffer on tapas records.

Run from the repository root:
    python3 scripts/normalize_riviera_event_buffers.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PATHS = (
    ROOT / "riviera_data" / "service_variants.json",
    ROOT / "riviera_data" / "service_variants_canapes.json",
    ROOT / "riviera_data" / "service_variants_corporate.json",
    ROOT / "riviera_data" / "service_variants_mains_sides.json",
)

EVENT_KEYS = {
    "buffet",
    "cocktail",
    "plated_main",
    "plated_entree",
    "plated_dessert",
    "dessert_buffet",
    "roving_dessert",
}
FIXED_KEYS = {"platter", "corporate_boxed", "high_tea"}
LEGACY_ALLOWANCE_RE = re.compile(
    r"\s+(?:with\s+\d+(?:\.\d+)?(?:\s+[^;·]+?)?\s+production allowance"
    r"|—\s+production\s+\d+(?:\.\d+)?\s+per guest)",
    flags=re.IGNORECASE,
)


def is_derived_production_key(key: str) -> bool:
    return bool(
        re.fullmatch(r"production_.+_per_guest", key)
        or re.fullmatch(r".+_per_guest_production", key)
    )


def carries_legacy_allowance(record: dict[str, Any]) -> bool:
    if "production_buffer_multiplier" in record or "automatic_event_buffer_multiplier" in record:
        return True
    if any(is_derived_production_key(str(key)) for key in record):
        return True
    portion = str(record.get("portion") or "")
    return "production allowance" in portion.lower() or bool(
        re.search(r"—\s+production\s+\d", portion, flags=re.IGNORECASE)
    )


def normalise_portion(portion: str, *, multiplier: float) -> str:
    clean = LEGACY_ALLOWANCE_RE.sub("", portion).strip()
    clean = re.sub(r"\s{2,}", " ", clean)
    suffix = (
        "Riviera 9% event buffer applies once"
        if multiplier == 1.09
        else "Fixed module; no automatic event buffer"
    )
    if suffix.lower() not in clean.lower():
        clean = f"{clean} · {suffix}" if clean else suffix
    return clean


def normalise_record(record: dict[str, Any], service_key: str) -> bool:
    if not carries_legacy_allowance(record):
        return False
    if service_key in EVENT_KEYS:
        multiplier = 1.09
        rule = "Apply the Riviera 9% event buffer once to the unbuffered service target."
    elif service_key in FIXED_KEYS:
        multiplier = 1.0
        rule = "Fixed module; do not apply an automatic event buffer."
    else:
        return False

    changed = record.pop("production_buffer_multiplier", None) is not None
    for key in list(record):
        if is_derived_production_key(str(key)):
            del record[key]
            changed = True

    if record.get("automatic_event_buffer_multiplier") != multiplier:
        record["automatic_event_buffer_multiplier"] = multiplier
        changed = True
    if record.get("buffer_rule") != rule:
        record["buffer_rule"] = rule
        changed = True
    if isinstance(record.get("portion"), str):
        portion = normalise_portion(record["portion"], multiplier=multiplier)
        if portion != record["portion"]:
            record["portion"] = portion
            changed = True
    return changed


def main() -> int:
    changed_files: list[str] = []
    changed_records = 0
    for path in PATHS:
        payload = json.loads(path.read_text(encoding="utf-8"))
        groups = payload.get("service_variants") or {}
        file_changed = False
        for group in groups.values():
            if not isinstance(group, dict):
                continue
            for service_key, record in group.items():
                if not isinstance(record, dict):
                    continue
                if normalise_record(record, service_key):
                    changed_records += 1
                    file_changed = True

        policy = {
            "releaseId": "RIV-KNOWLEDGE-2026-07-27-V13",
            "eventMultiplier": 1.09,
            "applyOnce": True,
            "eventServiceKeys": sorted(EVENT_KEYS),
            "fixedModuleMultiplier": 1.0,
            "fixedModuleServiceKeys": sorted(FIXED_KEYS),
            "excludedServiceKeys": ["tapas"],
            "note": "High Tea and Sunday Tapas have no automatic event buffer. Fixed High Tea, platter and corporate modules are not buffered unless an event-specific source says otherwise.",
        }
        if payload.get("buffer_policy") != policy:
            payload["buffer_policy"] = policy
            file_changed = True

        if file_changed:
            path.write_text(
                json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            changed_files.append(str(path.relative_to(ROOT)))

    print(
        json.dumps(
            {
                "status": "ok",
                "changedFiles": changed_files,
                "normalisedRecords": changed_records,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
