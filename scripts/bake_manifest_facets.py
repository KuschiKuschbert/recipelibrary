#!/usr/bin/env python3
"""
bake_manifest_facets.py
-----------------------
Reads all alpha_catalog shard files, extracts filter facets (cuisines, proteins,
dietary tags, categories, total count), and writes them into alpha_catalog/manifest.json.

The manifest is already the first fetch made by index.html, so embedding facets there
lets the browser populate filter dropdowns immediately — no 38k-row scan needed.

Run after any rebuild_catalog_from_detail.py run:
    python3 scripts/bake_manifest_facets.py

Safe to run multiple times (idempotent).
"""
import json
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_DIR = os.path.join(REPO_ROOT, 'alpha_catalog')
MANIFEST_PATH = os.path.join(CATALOG_DIR, 'manifest.json')


def to_str_list(v):
    """Flatten a field that might be a list, None, or string into a list of strings."""
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x) for x in v if x is not None and x != '']
    s = str(v).strip()
    return [s] if s else []


def build_facets(catalog_dir, files):
    cuisines = set()
    proteins = set()
    tags = set()
    cats = set()
    total = 0

    for fname in files:
        path = os.path.join(catalog_dir, fname)
        if not os.path.exists(path):
            print(f'  WARNING: shard not found: {path}', file=sys.stderr)
            continue
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        recipes = data.get('recipes', [])
        total += len(recipes)
        for r in recipes:
            cui = r.get('cui')
            if cui and isinstance(cui, str) and cui.strip():
                cuisines.add(cui.strip())
            for p in to_str_list(r.get('protein')):
                proteins.add(p)
            for t in to_str_list(r.get('tags')):
                tags.add(t)
            cat = r.get('cat')
            if cat and isinstance(cat, str) and cat.strip():
                cats.add(cat.strip())

    return {
        'cuisines': sorted(cuisines),
        'proteins': sorted(proteins),
        'tags':     sorted(tags),
        'cats':     sorted(cats),
        'total':    total,
    }


def main():
    if not os.path.exists(MANIFEST_PATH):
        print(f'ERROR: manifest not found at {MANIFEST_PATH}', file=sys.stderr)
        sys.exit(1)

    with open(MANIFEST_PATH, encoding='utf-8') as f:
        manifest = json.load(f)

    files = manifest.get('files', [])
    if not files:
        print('ERROR: manifest has no "files" list', file=sys.stderr)
        sys.exit(1)

    print(f'Building facets from {len(files)} shards...')
    facets = build_facets(CATALOG_DIR, files)

    print(f'  {facets["total"]:,} recipes')
    print(f'  {len(facets["cuisines"])} cuisines, {len(facets["proteins"])} proteins, '
          f'{len(facets["tags"])} tags, {len(facets["cats"])} categories')

    manifest['facets'] = facets

    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, separators=(',', ':'))
    print(f'Written: {MANIFEST_PATH}  ({os.path.getsize(MANIFEST_PATH):,} bytes)')


if __name__ == '__main__':
    main()
