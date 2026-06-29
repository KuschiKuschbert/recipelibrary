---
name: Filename audit pipeline
overview: Yes—investigation is warranted. The T-Z shard was one class of problem (invisible Unicode in the filename). `recipe_detail/` has additional corrupt names (variation selector, curly quotes) and many non–A–Z suffixes; the Kitchen client only ever requests `detail_${letter}.json` where `letter` is ASCII A–Z (or `_USER`), so misaligned naming can cause “not in detail file” even when JSON exists elsewhere.
todos:
  - id: add-shard-checker
    content: Add scripts/check-recipe-shards.* to verify INDEX_FILES on disk, simulate buildRecipeIndex letter, and report missing ids + orphan detail_*.json
    status: completed
  - id: fix-corrupt-detail-files
    content: Inspect detail_’.json, detail_“.json, detail_️.json; merge recipes into correct detail_[A-Z].json; remove bad files
    status: completed
  - id: reconcile-nonascii-detail
    content: Run checker across full library; merge or re-export digit/Unicode-named detail shards into ASCII buckets (or document + align client rule)
    status: completed
  - id: optional-ci
    content: Wire checker into GitHub Actions on push (optional)
    status: completed
isProject: false
---

