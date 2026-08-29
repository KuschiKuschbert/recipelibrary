# Riviera v15.2 GitHub Alignment — 2026-08-29

**Release:** `RIV-KNOWLEDGE-V15.2`  
**Scope:** GitHub recipe library, package policy, release metadata and Drive recipe-source routing  
**Status:** Aligned with open confirmations retained

## Authority

- Google Drive remains canonical for operational SOPs, package rules, live orders and release control.
- This repository remains canonical for structured recipe data.
- The active Drive release manifest is `1gymFSa18m_CGVzm2aMBGQ5arA5OiQSNuVg6niLoF6lk`.
- The active Drive Recipe Source Adapter is `14ARSDcPNUFvMfVTzcUbrd4-51BKdAdhiGBj-yRsBgxE`.
- The costing workbook is `1gThBJ-dWytj-1iUjl4bSdZmgCU3bbxvP`; the Menu Builder is supporting evidence, not an automatic recipe override.

## Conflict Resolution

The Drive source swap and Drive readback are complete. Live ChatGPT Project retrieval remains **PENDING**. No source may describe the v15.2 live retrieval test as passed until that check has actually been completed.

Recipe reconciliation uses exact recipe identity and the matching ACTIVE service module. Similar names, composed dishes and service-specific versions are not merged, and yields are not transferred between formats. A missing method, ambiguous title, conflicting yield or incomplete control remains `WAITING` or `NEEDS CONFIRMATION`.

## Recipe Publication State

- The structured catalog remains at 157 recipes.
- Existing lifecycle states are preserved: 22 `LOCKED`, 128 `ACTIVE WORKING`, 5 `TRIAL ONLY`, 2 `RETIRED`.
- No LOCKED recipe ingredient, yield, method or lifecycle state is changed by this alignment release.
- Costing-workbook candidates may enter the catalog only after exact identity, complete source detail and the normal trial/approval gate are satisfied.
- RETIRED recipes remain excluded from normal retrieval.

## v15.2 Package Rule Added

`FEAST-001 v1.2` is represented as a locked package-specific operational standard:

- selected shared-protein portions = `ceil(guest count × 4 ÷ 3)`;
- 90 guests = 120 selected protein portions;
- the uplift is applied once, with no additional standard 9% event buffer;
- dietary alternatives are produced to the exact confirmed count outside the shared-protein total;
- French green beans use 10 kg raw per 90 guests, equivalent to 1 kg per 9 guests.

The planner recognises `Shared feast` as a distinct service style so it cannot silently fall back to the standard buffered buffet rule. Allocation of the shared-protein total across selected dishes still requires the confirmed menu selection.

## Publication And Verification

The Git commit containing this record is the authoritative GitHub publication point for v15.2. After publication, record that commit in the Drive Active Release Manifest, Recipe Source Adapter and Ops Orchestrator. Do not mark live ChatGPT Project retrieval complete until independently verified in the project.
