# WAPSELL — R8-ID-003 CONTRACT PROPAGATION / READINESS UPDATE

**Date:** 2026-10-04  
**Task:** R8-ID-003  
**Status:** RECONCILIATION COMPLETE — TASK-LOCAL CONTRACT CLOSED FOR DOWNSTREAM USE  
**Implementation:** NOT AUTHORIZED

## 1. Purpose

Record the closure of the R8-ID-003 task-local coexistence contract and its impact on downstream readiness.

## 2. Source authority

- R8-ID-003 Owner Decision.
- R8-ID-002 Owner Decision.
- R8-ARCH-002 Owner Decision.
- R8-ARCH-003 Owner Decision.
- R5 Identity/Tenancy Contracts reconciliation.
- Block 1 Transformation Spec.
- Block 1 Implementation Plan.
- R8 Block 1 Task Execution Set.

## 3. Reconciliation result

R8-ID-003 now has an explicit task-local contract covering:

- bounded coexistence;
- legacy preservation;
- target authorization authority;
- application-level Business isolation;
- legacy session/token compatibility boundary;
- identity mapping boundary;
- source-of-truth discipline;
- Customer boundary;
- Business Context boundary;
- cutover separation;
- rollback/containment boundary;
- preservation classification;
- evidence requirements.

## 4. What is now closed

| Item | State | Evidence |
|---|---|---|
| Temporary/bounded coexistence | CLOSED | Owner ruling + contract |
| Legacy structures preserved during coexistence | CLOSED | Owner ruling + contract |
| Legacy empresaId cannot override target context | CLOSED | Owner ruling + contract |
| Target authorization boundary | CLOSED directionally | Owner ruling + contract |
| Application-level tenant isolation during coexistence | CLOSED directionally | R8-ARCH-002 + contract |
| Legacy auth as permanent authority | CLOSED negatively | R8-ID-003 + contract |
| Destructive cleanup | NOT AUTHORIZED | R8-ID-003 |
| Physical migration/backfill | OPEN / separate task | Contract non-scope |
| JWT/session exact mechanics | OPEN | R8-ARCH-003 boundary |
| Business Switch mechanism | OPEN | Architecture boundary |

## 5. Downstream effect

R8-ID-003 no longer blocks the definition of downstream identity transformation work.

It does NOT by itself make Identity/Tenancy implementation-ready.

Remaining relevant blockers include:

1. exact authentication/session technical contract;
2. exact Business Switch mechanism;
3. exact Permission catalogue and Role→Permission matrix;
4. task-local physical persistence mapping;
5. implementation-level API/application boundaries;
6. applicable invariant/test reconciliation for the first implementation slice.

## 6. Readiness impact

R8-ID-003: **CLOSED FOR DOWNSTREAM SPECIFICATION / TRANSFORMATION PLANNING**.

Identity/Tenancy implementation slice: **NOT READY**.

R8-READY-001: remains BLOCKED.

R8-READY-002: remains BLOCKED.

## 7. Preservation

- Usuario/Empresa: PRESERVED during coexistence.
- legacy identifiers: PRESERVED as compatibility evidence.
- empresaId: ADAPTED / TRANSITIONAL.
- legacy authentication: ADAPTED / BOUNDED COMPATIBILITY.
- legacy authorization as final authority: DEPRECATED conceptually.
- legacy cleanup: not authorized.

## 8. Evidence classification

- DOCUMENTADO: Owner decisions and task-local contract.
- VERIFIED BY CODE: existing AS-IS identity/empresaId/JWT coupling where already inspected.
- VERIFIED BY TEST: not newly executed by this closure.
- VERIFIED BY EXECUTION: not executed.
- NOT DETERMINABLE: final physical migration/runtime behavior.

## 9. Gate

**R8-ID-003: CLOSED FOR DOWNSTREAM USE.**

**Identity/Tenancy implementation: NOT AUTHORIZED.**

**Next highest-leverage task: R8-AUTH-001 — exact Permission catalogue and Role→Permission matrix.**