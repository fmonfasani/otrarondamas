# Producto → Familia — Relation Isolation Audit

**Fecha:** 2026-10-04  
**Estado:** AUDIT COMPLETED — TEST CANDIDATE CREATED  
**Gate:** B3 — Relation Isolation Coverage  
**Slice:** Producto → Familia  
**Baseline:** 7724b53a75491c278ddf75c30867be5f9a8b12f1

## Objective
Audit exclusively Producto → Familia before any production change.

## Code evidence [C]
Schema:
- Producto has direct empresaId and familiaId → Familia.
- Familia has direct empresaId.
- Producto → Familia is absent from the current relation-ownership registry.

Therefore Business A → Producto A → Familia B is a real persistence-boundary isolation surface.

## Classification
**REQUIRES TEST — HIGH PRIORITY**

Absence from the registry is not a confirmed runtime gap.

## Candidate cases
- PF-01: same-Business Producto → Familia succeeds.
- PF-02: Business A Producto → Familia B rejects with no persistence.
- PF-03: updating Producto A from Familia A to Familia B rejects and preserves Familia A.
- PF-04: mixed createMany with A and B Familia references rejects without partial persistence.
- PF-05: interactive transaction rejects the cross-Business reference and accepts the same-Business reference.

## Expected minimal fix if execution confirms the gap
`Producto: ['familia']`

No production change is authorized before execution.

## Evidence status
- Schema/registry structure: VERIFIED BY CODE [C].
- Runtime isolation behavior: NOT YET EXECUTED [ND].
- No production code changed by this audit.

## Controlled next step
Execute the candidate against disposable PostgreSQL. If cross-Business references are accepted, classify CONFIRMED GAP [E] and then propose the minimal registry change. If rejected AS-IS, record PASS [E] and do not modify production code.
