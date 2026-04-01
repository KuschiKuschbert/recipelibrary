#!/usr/bin/env bash
# Run from repo root: bash scripts/run_full_translation.sh
# Detect → install Argos pairs → translate all candidates → repartition → sync index → verify.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PY="${PYTHON:-python3}"

echo "== detect =="
"$PY" scripts/detect-nonenglish-recipes.py

echo "== install Argos language packages (first run downloads ~hundreds of MB) =="
"$PY" scripts/install_argos_pairs.py

echo "== translate (long) =="
"$PY" scripts/translate_recipes.py \
  --candidates-file reports/translation_candidates.jsonl \
  --backend argos \
  --checkpoint-every 100 \
  --quiet

echo "== sync claude_index from detail =="
"$PY" scripts/sync_claude_index_from_detail.py --ids-from reports/translation_candidates.jsonl

echo "== repartition detail shards by index name letter =="
"$PY" scripts/repartition_detail_shards.py

echo "== repartition detail sub-shards (hash buckets) =="
"$PY" scripts/repartition_detail_subshards.py

echo "== verify =="
"$PY" scripts/check-recipe-shards.py

echo "OK: full translation pipeline finished."
