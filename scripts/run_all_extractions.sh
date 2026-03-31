#!/usr/bin/env bash
# Run all flavor/science extractors then merge. Requires PDFs/EPUBs in ~/Downloads (see each script).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
python3 scripts/extract_flavor_data.py
python3 scripts/extract_thesaurus_data.py
python3 scripts/extract_science_data.py
python3 scripts/extract_sfah_data.py
python3 scripts/extract_supplementary.py
python3 scripts/merge_all_sources.py
echo "Done. Outputs: flavor_data/ thesaurus_data/ science_data/ sfah_data/ supplementary_data/ combined_data/"
