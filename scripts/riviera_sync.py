#!/usr/bin/env python3
"""Verify and rebuild the Riviera source synchronization chain.

GitHub is the only mutable source of truth. The legacy ChatGPT Riviera Project
is a read-only snapshot/mirror because ChatGPT Projects do not expose a
supported source-file synchronization API.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "riviera_sources" / "current" / "manifest.json"
CONTRACT_PATH = ROOT / "riviera_sources" / "sync_contract.json"
LIVE_AUDIT_PATH = ROOT / "riviera_sources" / "current" / "live_project_audit_2026-07-10.json"

SYNC_MANAGED_PREFIXES = (
    ".github/workflows/riviera-sync.yml",
    "AGENTS.md",
    "docs/riviera/RIVIERA_SYNC_RUNBOOK.md",
    "riviera_sources/",
    "scripts/build_riviera_source_of_truth.py",
    "scripts/riviera_sync.py",
    "scripts/sync_riviera_recipe_catalog.py",
)

CHECK_COMMANDS = (
    ("generated SSOT", [sys.executable, "scripts/build_riviera_source_of_truth.py", "--check"]),
    ("catalog → built-ins", [sys.executable, "scripts/sync_riviera_recipe_catalog.py", "--check"]),
    ("built-in schema", [sys.executable, "scripts/validate_riviera_builtins.py"]),
    ("source alignment", [sys.executable, "scripts/audit_riviera_source_alignment.py"]),
    ("recipe standards", [sys.executable, "scripts/audit_riviera_recipe_standards.py", "--strict"]),
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def normalized_text_hash(text: str) -> str:
    normalized = " ".join(text.split())
    return sha256_bytes(normalized.encode("utf-8"))


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def verify_snapshot(manifest: dict[str, Any], errors: list[str]) -> dict[str, Any]:
    source_dir = ROOT / str(manifest.get("chatgptSourceDir") or "")
    source_rows = manifest.get("chatgptSources")
    if not source_dir.is_dir():
        errors.append(f"missing source directory: {rel(source_dir)}")
        return {"sources": 0, "extracts": 0}
    if not isinstance(source_rows, list):
        errors.append("manifest.chatgptSources must be a list")
        return {"sources": 0, "extracts": 0}

    extracts = 0
    for item in source_rows:
        if not isinstance(item, dict):
            errors.append("manifest source row must be an object")
            continue
        path = source_dir / str(item.get("file") or "")
        if not path.is_file():
            errors.append(f"missing source: {rel(path)}")
            continue
        data = path.read_bytes()
        if len(data) != item.get("bytes"):
            errors.append(f"source byte-count drift: {rel(path)}")
        if sha256_bytes(data) != item.get("sha256"):
            errors.append(f"source checksum drift: {rel(path)}")
        extract_rel = item.get("extract")
        if extract_rel:
            extracts += 1
            extract_path = source_dir / str(extract_rel)
            if not extract_path.is_file():
                errors.append(f"missing extract: {rel(extract_path)}")
                continue
            actual_lines = len(extract_path.read_text(encoding="utf-8", errors="replace").splitlines())
            if actual_lines != item.get("extractLines"):
                errors.append(f"extract line-count drift: {rel(extract_path)}")

    return {"sources": len(source_rows), "extracts": extracts}


def verify_live_audit(
    manifest: dict[str, Any],
    contract: dict[str, Any],
    audit: dict[str, Any],
    errors: list[str],
    warnings: list[str],
    *,
    enforce_mirror_freshness: bool,
) -> dict[str, Any]:
    if contract.get("authority") != "github-repository":
        errors.append("sync contract authority must be github-repository")
    if audit.get("status") != "verified":
        errors.append("live Project audit is not verified")

    live_inventory = audit.get("liveProjectInventory") or {}
    live_rows = live_inventory.get("rows") or []
    live_names = [str(row[0]) for row in live_rows if isinstance(row, list) and row]
    inventory_payload = json.dumps(live_rows, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if sha256_bytes(inventory_payload) != live_inventory.get("inventorySha256"):
        errors.append("recorded live Project inventory fingerprint is invalid")
    baseline_names = [str(row.get("liveName")) for row in manifest.get("chatgptSources", [])]
    mirror_paths = contract.get("legacyChatgptProject", {}).get("mirrorArtifacts") or []
    mirror_names = [Path(str(path)).name for path in mirror_paths]
    expected_names = mirror_names + baseline_names
    if live_inventory.get("count") != len(expected_names):
        errors.append("live Project inventory count does not match baseline + mirror contract")
    if live_names != expected_names:
        errors.append("live Project inventory names/order drifted from the recorded audit")

    mirror_evidence = audit.get("mirrorArtifacts") or []
    evidence_by_path = {str(row.get("path")): row for row in mirror_evidence if isinstance(row, dict)}
    for mirror_path in mirror_paths:
        path = ROOT / str(mirror_path)
        if not path.is_file():
            errors.append(f"missing mirror artifact: {mirror_path}")
            continue
        evidence = evidence_by_path.get(str(mirror_path))
        if not evidence:
            errors.append(f"missing live audit evidence for mirror artifact: {mirror_path}")
            continue
        if sha256_file(path) != evidence.get("sha256"):
            message = f"legacy Project mirror is stale for: {mirror_path}"
            if enforce_mirror_freshness:
                errors.append(message)
            else:
                warnings.append(message)

    semantic = audit.get("nonDownloadableSources", {}).get("updatedInstructions") or {}
    instruction_path = ROOT / str(semantic.get("localPath") or "")
    if not instruction_path.is_file():
        errors.append(f"missing normalized instruction source: {semantic.get('localPath')}")
    else:
        text = instruction_path.read_text(encoding="utf-8")
        start_marker = str(semantic.get("startMarker") or "")
        end_marker = str(semantic.get("endMarker") or "")
        try:
            start = text.index(start_marker)
            end = text.index(end_marker, start) + len(end_marker)
        except ValueError:
            errors.append("instruction audit markers are missing from the local extraction")
        else:
            if normalized_text_hash(text[start:end]) != semantic.get("normalizedSha256"):
                errors.append("normalized Updated Riviera instructions drifted from the live Project audit")

    image = audit.get("nonDownloadableSources", {}).get("brandImage") or {}
    image_path = ROOT / str(image.get("encodedPath") or "")
    if not image_path.is_file():
        errors.append(f"missing captured image payload: {image.get('encodedPath')}")
    else:
        try:
            encoded = "".join(image_path.read_text(encoding="ascii").split())
            decoded = base64.b64decode(encoded, validate=True)
        except Exception as exc:  # noqa: BLE001 - report exact local corruption.
            errors.append(f"captured image payload is invalid base64: {exc}")
        else:
            if len(decoded) != image.get("decodedBytes"):
                errors.append("captured image byte count drifted")
            if sha256_bytes(decoded) != image.get("decodedSha256"):
                errors.append("captured image checksum drifted")

    return {
        "liveSources": live_inventory.get("count"),
        "baselineSources": len(baseline_names),
        "mirrorArtifacts": len(mirror_paths),
        "auditedAt": audit.get("auditedAt"),
    }


def run_check(label: str, command: list[str], errors: list[str]) -> dict[str, Any]:
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        errors.append(f"{label} failed: {detail}")
    return {"label": label, "ok": result.returncode == 0}


def git_state(*, remote: bool, errors: list[str]) -> dict[str, Any]:
    if remote:
        result = subprocess.run(
            ["git", "fetch", "origin", "main"], cwd=ROOT, capture_output=True, text=True, check=False
        )
        if result.returncode != 0:
            errors.append(f"git fetch failed: {(result.stderr or result.stdout).strip()}")

    branch = subprocess.run(
        ["git", "branch", "--show-current"], cwd=ROOT, capture_output=True, text=True, check=False
    ).stdout.strip()
    status_lines = subprocess.run(
        ["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True, check=False
    ).stdout.splitlines()
    paths = [line[3:] for line in status_lines if len(line) > 3]
    sync_managed = [path for path in paths if path.startswith(SYNC_MANAGED_PREFIXES)]

    ahead = behind = None
    if remote:
        counts = subprocess.run(
            ["git", "rev-list", "--left-right", "--count", "main...origin/main"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if counts.returncode == 0:
            left, right = counts.stdout.strip().split()
            ahead, behind = int(left), int(right)
            if ahead or behind:
                errors.append(f"main differs from origin/main: ahead={ahead}, behind={behind}")

    return {
        "branch": branch,
        "ahead": ahead,
        "behind": behind,
        "workspaceChanges": paths,
        "syncManagedChanges": sync_managed,
    }


def verify(
    *, remote: bool, require_clean: bool, enforce_mirror_freshness: bool
) -> tuple[dict[str, Any], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    for required in (MANIFEST_PATH, CONTRACT_PATH, LIVE_AUDIT_PATH):
        if not required.is_file():
            errors.append(f"missing sync control file: {rel(required)}")
    if errors:
        return {"status": "failed"}, errors

    manifest = load_json(MANIFEST_PATH)
    contract = load_json(CONTRACT_PATH)
    audit = load_json(LIVE_AUDIT_PATH)
    snapshot = verify_snapshot(manifest, errors)
    live_audit = verify_live_audit(
        manifest,
        contract,
        audit,
        errors,
        warnings,
        enforce_mirror_freshness=enforce_mirror_freshness,
    )
    checks = [run_check(label, command, errors) for label, command in CHECK_COMMANDS]
    git = git_state(remote=remote, errors=errors)
    if require_clean and git["syncManagedChanges"]:
        errors.append("sync-managed files have uncommitted changes")

    report = {
        "status": "verified" if not errors else "failed",
        "authority": contract.get("authority"),
        "activeWorkSurface": contract.get("activeWorkSurface"),
        "snapshot": snapshot,
        "liveProjectAudit": live_audit,
        "checks": checks,
        "git": git,
        "warnings": warnings,
    }
    return report, errors


def print_report(report: dict[str, Any], errors: list[str], *, as_json: bool) -> None:
    if as_json:
        payload = dict(report)
        payload["errors"] = errors
        print(json.dumps(payload, indent=2))
        return

    print("RIVIERA SYNC STATUS")
    print(f"Result: {report.get('status', 'failed').upper()}")
    print(f"Authority: {report.get('authority', '-')}")
    print(f"Active work surface: {report.get('activeWorkSurface', '-')}")
    snapshot = report.get("snapshot") or {}
    live = report.get("liveProjectAudit") or {}
    print(f"Baseline snapshot: {snapshot.get('sources', 0)} sources, {snapshot.get('extracts', 0)} extracts")
    print(
        "Legacy Project audit: "
        f"{live.get('liveSources', 0)} sources "
        f"({live.get('baselineSources', 0)} baseline + {live.get('mirrorArtifacts', 0)} mirror)"
    )
    for check in report.get("checks") or []:
        print(f"{'PASS' if check.get('ok') else 'FAIL'}  {check.get('label')}")
    git = report.get("git") or {}
    if git.get("ahead") is not None:
        print(f"Git main ↔ origin/main: ahead {git['ahead']}, behind {git['behind']}")
    if git.get("workspaceChanges"):
        print(f"Local workspace changes outside committed state: {len(git['workspaceChanges'])}")
    if errors:
        print("ERRORS")
        for error in errors:
            print(f"- {error}")
    warnings = report.get("warnings") or []
    if warnings:
        print("WARNINGS")
        for warning in warnings:
            print(f"- {warning}")


def rebuild(*, include_pdf: bool) -> int:
    commands = [
        [sys.executable, "scripts/build_riviera_source_of_truth.py", "--write"],
        [sys.executable, "scripts/sync_riviera_recipe_catalog.py", "--write"],
    ]
    if include_pdf:
        commands.append([sys.executable, "scripts/generate_riviera_recipe_card_pdf.py"])
    for command in commands:
        result = subprocess.run(command, cwd=ROOT, check=False)
        if result.returncode != 0:
            return result.returncode
    report, errors = verify(
        remote=False,
        require_clean=False,
        enforce_mirror_freshness=False,
    )
    print_report(report, errors, as_json=False)
    return 0 if not errors else 1


def mirror_manifest() -> int:
    contract = load_json(CONTRACT_PATH)
    artifacts = []
    for item in contract.get("legacyChatgptProject", {}).get("mirrorArtifacts") or []:
        path = ROOT / str(item)
        if not path.is_file():
            raise SystemExit(f"Missing mirror artifact: {item}")
        artifacts.append({"path": str(item), "name": path.name, "bytes": path.stat().st_size, "sha256": sha256_file(path)})
    print(
        json.dumps(
            {
                "status": "ready",
                "destination": "legacy ChatGPT Riviera Project",
                "mode": "manual replace-only mirror boundary",
                "artifacts": artifacts,
            },
            indent=2,
        )
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command")

    for name in ("status", "verify"):
        child = subparsers.add_parser(name)
        child.add_argument("--remote", action="store_true", help="fetch and compare origin/main")
        child.add_argument("--require-clean", action="store_true", help="fail on uncommitted sync-managed files")
        child.add_argument("--json", action="store_true", help="print machine-readable output")
        child.add_argument("--ci", action="store_true", help="CI shorthand for --require-clean --json")
        child.add_argument(
            "--enforce-live-mirror",
            action="store_true",
            help="fail when repository mirror artifacts differ from the last authenticated legacy Project audit",
        )

    rebuild_parser = subparsers.add_parser("rebuild")
    rebuild_parser.add_argument("--include-pdf", action="store_true", help="also regenerate the recipe-card PDF")
    subparsers.add_parser("mirror-manifest")

    args = parser.parse_args()
    command = args.command or "status"
    if command == "rebuild":
        return rebuild(include_pdf=args.include_pdf)
    if command == "mirror-manifest":
        return mirror_manifest()

    ci = bool(getattr(args, "ci", False))
    report, errors = verify(
        remote=bool(getattr(args, "remote", False)),
        require_clean=ci or bool(getattr(args, "require_clean", False)),
        enforce_mirror_freshness=bool(getattr(args, "enforce_live_mirror", False)),
    )
    print_report(report, errors, as_json=ci or bool(getattr(args, "json", False)))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
