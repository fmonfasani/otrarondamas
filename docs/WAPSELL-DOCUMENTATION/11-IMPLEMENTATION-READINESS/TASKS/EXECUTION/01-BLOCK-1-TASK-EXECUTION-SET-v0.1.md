# WAPSELL — BLOCK 1 TASK EXECUTION SET v0.1

**Status:** DRAFT — CONTROLLED TASK SET / NOT APPROVED  
**Date:** 2026-10-04  
**Authority:** Current Owner decisions + Block 1 Implementation Plan + R8 controlled task baseline/readiness  
**Implementation:** NOT AUTHORIZED

## 1. Purpose

This artifact derives the current execution-oriented task set from the R8 baseline and the Block 1 Implementation Plan. It does not replace the R8 baseline and does not authorize implementation.

R8 remains the historical controlled task baseline. This document is the current operational reconciliation layer for task selection.

## 2. Current authority state

The following previously blocked prerequisites are now closed by explicit Owner decisions:

- R8-ARCH-001 — first-slice architecture direction approved.
- R8-ARCH-002 — application-level tenant isolation approved.
- R8-ARCH-003 — JWT-centric authentication with application-controlled Business Context approved.
- R8-ID-002 — physical User/Business/Membership direction approved.
- R8-ID-003 — bounded legacy identity coexistence direction approved.
- R8-COM-004 — Cart/Customer/Order boundary approved.
- R8-INV-002 — stock reservation direction approved; technical transaction details remain task-local OPEN.
- R8-INV-003 — generic Location model approved; physical representation remains task-local OPEN.
- R8-ORD-002 — Order/Sale lifecycle/effect direction approved; exact technical state implementation remains downstream.
- R8-PAY-002 — Payment lifecycle direction approved; exact transition/reconciliation mechanics remain OPEN.
- R8-PAY-003 — Payment/Cash/AR effect direction approved; detailed models remain OPEN.

Owner approval of a direction does not mean that every technical contract or schema detail is closed.

## 3. Task states

- DONE — evidence/decision closure demonstrated.
- READY — task can be executed without resolving an external OPEN normative decision.
- BLOCKED — dependency or required normative/technical closure remains unresolved.
- PROPOSED — identified but not yet promoted to READY.
- IN PROGRESS — reserved for explicitly authorized execution.

## 4. Current task matrix

| Task | Current state | Next action |
|---|---|---|
| R8-CAN-001 | DONE | Preserve evidence |
| R8-CAN-002 | DONE | Preserve evidence |
| R8-ARCH-001 | DONE | Preserve Owner approval |
| R8-ARCH-002 | DONE | Preserve tenant-isolation decision |
| R8-ARCH-003 | DONE | Close remaining technical session details locally |
| R8-ID-001 | DONE | Preserve AS-IS evidence |
| R8-ID-002 | DONE | Derive technical identity contract |
| R8-ID-003 | DONE / direction approved | Document bounded coexistence contract if not already propagated |
| R8-AUTH-001 | READY | Derive Permission catalogue/matrix |
| R8-AUTH-002 | BLOCKED | Close MFA mechanism |
| R8-AUTH-003 | READY / evidence complete | Consolidate evidence |
| R8-COM-001 | DONE | Preserve AS-IS evidence |
| R8-COM-002 | READY | Close Customer↔User association mechanics |
| R8-COM-003 | READY | Close Product/BusinessProduct physical allocation |
| R8-COM-004 | DONE / direction approved | Preserve propagated decision |
| R8-INV-001 | DONE | Preserve AS-IS evidence |
| R8-INV-002 | READY | Close reservation transaction/concurrency semantics |
| R8-INV-003 | READY | Close physical Location model |
| R8-ORD-001 | DONE | Preserve AS-IS evidence |
| R8-ORD-002 | DONE / direction approved | Refine exact implementation contract after dependencies |
| R8-PAY-001 | DONE | Preserve AS-IS evidence |
| R8-PAY-002 | READY | Close exact Payment lifecycle/reconciliation contract |
| R8-PAY-003 | READY AFTER PAY-002 | Close detailed Payment↔Cash/AR effect contract |
| R8-CASH-001 | BLOCKED | Requires AUTH-001 + PAY-003 |
| R8-FUL-001 | BLOCKED | Requires detailed Fulfillment specification |
| R8-RET-001 | BLOCKED | Requires detailed Return/Refund effects |
| R8-MSG-001 | DONE | Preserve AS-IS evidence |
| R8-MSG-002 | BLOCKED | Requires AUTH-001 + Messaging physical contract |
| R8-BRAND-001 | READY | Close Brand configuration boundary |
| R8-X-001 | BLOCKED | Requires cross-cutting architecture/event boundary |
| R8-READY-001 | BLOCKED | Select slice after local gates close |
| R8-READY-002 | BLOCKED | Derive implementation task only after READY-001 |

## 5. Priority execution set

The next controlled work should not attempt all READY tasks simultaneously. Priority is determined by dependency leverage.

### T1 — R8-AUTH-001
**Class:** SPEC-CLOSURE  
**Objective:** Define exact MVP Permission catalogue and Role→Permission matrix under Membership→Role→Permission.

**Scope:** Owner, Admin, Vendedor, Gestor de Stock and permissions required by the first implementation slice.

**Non-scope:** MFA mechanism, UI redesign, implementation of guards, schema migration.

**Dependencies:** R8-ID-002 DONE; R8-ARCH-001 DONE.

**Open boundary:** exact Permission set and mapping.

**Expected evidence:** approved authorization specification/contract + traceability to relevant invariants/tests.

**Exit:** no first-slice authorization behavior requires inventing a Permission.

### T2 — R8-ID-003
**Class:** SPEC-CLOSURE / TRANSFORMATION PREPARATION  
**Objective:** Make the bounded legacy identity coexistence contract explicit against the approved User/Business/Membership direction.

**Scope:** mapping/coexistence semantics, compatibility boundary, containment and cutover preconditions.

**Non-scope:** physical migration, data migration, legacy deletion.

**Dependencies:** R8-ID-002 DONE; R8-ARCH-003 DONE.

**Expected evidence:** reconciled identity coexistence artifact.

**Exit:** first identity transformation can preserve current behavior while introducing the target model.

### T3 — R8-INV-002
**Class:** SPEC-CLOSURE  
**Objective:** Close reservation transaction, concurrency and atomicity semantics.

**Scope:** reservation persistence boundary, available-stock calculation, concurrent confirmation, failure atomicity, release behavior and physical stock-out separation.

**Non-scope:** implementation, schema migration, final API design.

**Dependencies:** R8-ARCH-001/002 DONE; R8-INV-001 DONE; Owner direction R8-INV-002 approved.

**Expected evidence:** approved Inventory contract/spec + concurrency tests/evals.

**Exit:** reservation behavior is implementable without inventing transaction semantics.

### T4 — R8-INV-003
**Class:** SPEC-CLOSURE  
**Objective:** Close the physical Location model.

**Scope:** fields/identity, Business ownership, MAIN uniqueness, lifecycle, Inventory association and historical behavior.

**Non-scope:** Branch/Warehouse entities by inference; implementation.

**Dependencies:** R8-ARCH-001 DONE; R8-INV-001 DONE; Owner direction approved.

**Expected evidence:** approved physical Location specification.

**Exit:** inventory persistence has an explicit Location boundary.

### T5 — R8-COM-002
**Class:** SPEC-CLOSURE  
**Objective:** Close Customer↔User association, disassociation and controlled matching.

**Scope:** proposal/confirmation, association, unlink, conflict handling and auditability.

**Non-scope:** automatic email-only linking; unrestricted merge.

**Dependencies:** R8-ID-002 DONE; R8-COM-001 DONE.

**Expected evidence:** approved Customer identity association contract + tests.

**Exit:** Customer/User association is deterministic and auditable.

### T6 — R8-COM-003
**Class:** SPEC-CLOSURE  
**Objective:** Close physical Product/BusinessProduct allocation.

**Scope:** global Product identity, BusinessProduct ownership, Business-specific SKU/price/visibility and relevant relationships.

**Non-scope:** implementation or catalog redesign.

**Dependencies:** R8-ARCH-001 DONE; R8-COM-001 DONE.

**Expected evidence:** approved Commerce physical model/contract.

**Exit:** no implementation task must infer whether data is global or Business-scoped.

### T7 — R8-PAY-002
**Class:** SPEC-CLOSURE  
**Objective:** Close exact Payment lifecycle and reconciliation boundary.

**Scope:** transitions, manual/external payment distinction, idempotency boundary, reconciliation and refund/reversal relationship.

**Non-scope:** provider selection or deployment by inference.

**Dependencies:** R8-ARCH-001 DONE; R8-PAY-001 DONE; Owner direction approved.

**Expected evidence:** Payment contract/spec + tests.

**Exit:** Payment implementation can be derived without inventing state transitions.

### T8 — R8-BRAND-001
**Class:** SPEC-CLOSURE  
**Objective:** Close Business Brand configuration boundary.

**Scope:** Business-owned brand configuration and customer-facing identity boundary.

**Non-scope:** visual redesign or new design-system technology by inference.

**Dependencies:** canonical Business/Brand direction.

**Expected evidence:** Brand/Experience contract/spec.

**Exit:** first Business identity can be implemented without coupling it to Wapsell architecture.

## 6. Downstream blocked chain

AUTH-001 unlocks or contributes to:

AUTH-002, ORD-002 refinement, CASH-001, MSG-002.

INV-002 + INV-003 + AUTH-001 contribute to:

Order/Sale implementation readiness.

PAY-002 unlocks PAY-003; PAY-003 contributes to CASH-001 and RET-001.

ORD-002 + PAY-003 contribute to FUL-001 and RET-001.

AUTH-001 + Messaging physical contract are required for MSG-002.

READY-001 must remain blocked until one bounded implementation slice has all local gates satisfied.

## 7. First implementation slice candidate

The plan must not select the first implementation slice merely because a task is marked READY.

The current candidate should be **Identity/Tenancy foundation**, because:

1. the canonical User/Business/Membership direction is approved;
2. tenant isolation direction is approved;
3. JWT-centric authentication direction is approved;
4. AS-IS identity evidence exists;
5. downstream authorization and Business-scoped domains depend on it.

However, implementation still requires closure of the technical authentication/session contract, Business Context mechanism, exact persistence mapping and task-local API/application boundaries.

Therefore the candidate is:

**CANDIDATE — NOT YET IMPLEMENTATION-READY.**

## 8. Implementation task promotion

When the Identity/Tenancy technical closure is complete, R8-READY-001 may select a bounded implementation slice.

Only then may R8-READY-002 derive an IMPLEMENTATION task.

That implementation task must contain:

- exact files/modules in scope;
- exact behavior to add/change;
- preservation classification;
- migration/coexistence behavior;
- authorization requirements;
- tenant-isolation requirements;
- tests to execute;
- runtime evidence where required;
- rollback/containment;
- explicit non-scope.

## 9. Evidence gate

Every task completion must distinguish:

- VERIFIED BY CODE;
- VERIFIED BY TEST;
- VERIFIED BY EXECUTION;
- DOCUMENTED;
- NOT DETERMINABLE.

No task is marked DONE from documentation alone when its class requires execution evidence.

## 10. Prohibited promotion

No task may be promoted to implementation if it requires inventing:

- Permission identifiers;
- JWT claims;
- schema relationships;
- API routes;
- events;
- transaction boundaries;
- migration mappings;
- state transitions;
- external providers.

Such a task returns to SPEC-CLOSURE.

## 11. Gate

**TASK EXECUTION SET: READY FOR CONTROLLED SPECIFICATION WORK.**

**Implementation readiness: NOT ESTABLISHED.**

**Implementation: NOT AUTHORIZED.**

**Deployment: NOT AUTHORIZED.**


## 12. B3 Tests/Evals reconciliation propagation — 2026-10-04

The B3 Tests/Evals reconciliation (`07-DESIGN/TESTS-EVALS/DERIVED/06-BLOCK-3-TESTS-EVALS-RECONCILIATION-v0.1.md`) changes no task state in section 4.

| Task | State | Effect |
|---|---|---|
| R8-ARCH-002 | DONE (unchanged) | Decision preserved. Its 12 properties now map to derived criteria; property 12 stays a verification gate, NOT MET. |
| R8-READY-001 | BLOCKED (unchanged) | No slice is selected. B3 verification still lacks test infrastructure and execution evidence. |
| R8-READY-002 | BLOCKED (unchanged) | Depends on R8-READY-001. |

**No task is created, renamed, renumbered or promoted by this reconciliation.** `B3-SLICE-001` appears only as a proposal in `13-AUDIT/24-B4-IMPLEMENTATION-READINESS-ASSESSMENT-2026-10-04.md` and is not a task of this set.

Task-local specification work that remains, without task identifiers (none is authorized for implementation):

1. approval path for the B3 invariant set (DRAFT);
2. resolution of the TE-ID collision in the upstream Tests/Evals documents;
3. technical resolution of Legajo/DocumentoLegajo ownership (ISO-OPEN-001);
4. test-infrastructure and execution tasks, which require explicit separate authorization and, per section 9, cannot be marked DONE from documentation alone.

Candidate "Identity/Tenancy foundation" (section 7) remains **CANDIDATE — NOT YET IMPLEMENTATION-READY**.

**B3 TESTS/EVALS: CLOSED FOR DERIVATION / RECONCILIATION; NOT EXECUTED; NOT VERIFIED; NOT READY FOR IMPLEMENTATION.**

**Implementation: NOT AUTHORIZED.**


## 13. B3 OWNERSHIP + B4 READINESS DECISION PROPAGATION — 2026-10-04

### B3

Owner Decision 49 closes the former Legajo/DocumentoLegajo ownership ambiguity. ISO-009 is now the canonical B3 invariant. No implementation task is created by this propagation.

### B4

OD-B4-01 confirms B4 as transversal Implementation Readiness.

OD-B4-02 permits verification-infrastructure work before B3 verification is complete, subject to task-local authorization.

### Task consequences

No existing task is promoted to implementation solely by these decisions.

A future verification-infrastructure task may be derived for:
- Jest harness/configuration repair;
- B3/B1/B2 fixtures;
- integration-test support;
- smoke/regression coverage;
- CI verification infrastructure.

Such a task must specify scope, non-scope, dependencies, expected evidence and validation before execution.

**Current implementation status remains NOT AUTHORIZED for product code/schema/migrations.**

## 14. B4 verification infrastructure candidate — 2026-10-04 — CLOSED

OD-B4-02 permitted verification-infrastructure work before B3 is fully VERIFIED. The candidate task was explicitly authorized by the Owner through **Option A** on 2026-10-04.

`11-IMPLEMENTATION-READINESS/TASKS/EXECUTION/02-B4-VERIFICATION-INFRASTRUCTURE-CANDIDATE-v0.1.md`

**State:** COMPLETED / VERIFIED — FRESH CI VERIFIED.

Implemented and technically reconciled:
- Jest integration configuration;
- deterministic two-Business PostgreSQL/Prisma fixture;
- bounded setup/teardown for the current integration suite;
- smoke/regression execution path;
- CI verification workflow.

Evidence closure:
- GitHub Actions run **37210436567** remains documented as a historical result only [D];
- fresh corrected workflow run **37211384785** succeeded and establishes current [T] and [E];
- the CI bootstrap was corrected to remove `--accept-data-loss`;
- no product source, Prisma schema or migration file was changed by B4;
- branch inspection confirms no product source, Prisma schema, or migration changes are part of the B4 implementation [C].

The task remains bounded to verification infrastructure. It does **not** authorize B3 tenant-isolation product implementation and does **not** mark B3 invariants VERIFIED.
