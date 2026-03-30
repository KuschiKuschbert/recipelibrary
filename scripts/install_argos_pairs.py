#!/usr/bin/env python3
"""
Download Argos Translate language pairs into the local Argos package store.

Usage:
  python3 scripts/install_argos_pairs.py es pt fr it de

Default (no args): es pt (covers many Spanish/Portuguese catalog strings).
Requires: pip install argostranslate
"""
from __future__ import annotations

import argparse
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description="Install Argos es->en, etc. packages")
    ap.add_argument(
        "langs",
        nargs="*",
        default=["es", "pt"],
        help="Source language codes (target is always en)",
    )
    args = ap.parse_args()

    try:
        import argostranslate.package
    except ImportError:
        print("ERROR: pip install argostranslate", file=sys.stderr)
        return 1

    print("Updating package index...", flush=True)
    argostranslate.package.update_package_index()
    avail = argostranslate.package.get_available_packages()

    for code in args.langs:
        code = code.strip().lower()
        found = [p for p in avail if p.from_code == code and p.to_code == "en"]
        if not found:
            print(f"WARN: no Argos package for {code} -> en", file=sys.stderr)
            continue
        p = found[0]
        print(f"Installing {p.from_code} -> en ...", flush=True)
        argostranslate.package.install_from_path(p.download())

    print("Done.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
