#!/usr/bin/env python3
"""
Backward-compatible entry point — delegates to rebuild_catalog_from_detail.py.

The browser catalog is built from **recipe_detail/** (SSOT) together with
**claude_index/** and pantry hay. **alpha/index.json** defines **letter bucket
layout** (logical grouping); the rebuild writes **catalog_01.json** … **catalog_NN.json**
under **alpha_catalog/**. Full **alpha/*.json** recipe archives are optional.

  python3 scripts/build_alpha_catalog_index.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REBUILD = ROOT / "scripts" / "rebuild_catalog_from_detail.py"


def main() -> int:
    r = subprocess.run(
        [sys.executable, str(REBUILD)],
        cwd=str(ROOT),
    )
    return int(r.returncode)


if __name__ == "__main__":
    raise SystemExit(main())
