# Production tablet checklist (manual)

Use on live GitHub Pages after hard refresh (SW v15+).

## Setup
- [ ] Open https://kuschikuschbert.github.io/recipelibrary/riviera.html
- [ ] Hard refresh / clear site data if SW stuck

## Portofino (Weddings)
- [ ] Select 4 canapés + 2 substantial · 120 covers · event date
- [ ] Selected dishes show pairing hint chips
- [ ] Generate → timeline checkboxes persist on reload
- [ ] Shopping shows partial cost estimate (if priced lines)
- [ ] Order list qtys ≈ Shopping
- [ ] Prep board Replace/Append
- [ ] Print / PDF and Download HTML

## Carvery / corporate / plated
- [ ] Repeat Generate for one section each — timeline phases sensible

## Sync
- [ ] Export plan JSON from planner bar → Import on second tab/device simulation
- [ ] Export bundle from planner list includes timeline keys

## Automated gate (local)
```bash
python3 scripts/planner_acceptance_smoke.py
node --check assets/planner-extras.js
```
