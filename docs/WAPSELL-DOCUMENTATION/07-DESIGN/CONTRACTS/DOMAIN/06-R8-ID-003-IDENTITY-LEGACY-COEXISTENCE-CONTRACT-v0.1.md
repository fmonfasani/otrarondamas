# WAPSELL — R8-ID-003 IDENTITY LEGACY COEXISTENCE CONTRACT v0.1

**Status:** DRAFT — TASK-LOCAL CONTRACT / OWNER REVIEW REQUIRED  
**Date:** 2026-10-04  
**Task:** R8-ID-003  
**Implementation:** NOT AUTHORIZED  
**Migration:** NOT AUTHORIZED

## 1. Purpose

This contract converts the Owner-approved R8-ID-003 coexistence direction into explicit task-local obligations. It does not define a physical migration, schema, JWT format, API, deployment, cutover execution or legacy deletion.

## 2. Authority

Primary authority:
- R8-ID-003 Owner Decision — legacy identity coexistence.
- R8-ID-002 Owner Decision — physical User/Business/Membership direction.
- R8-ARCH-002 Owner Decision — application-level tenant isolation.
- R8-ARCH-003 Owner Decision — JWT-centric authentication with application-controlled Business Context.

Supporting sources:
- Identity & Tenancy Contracts, R5 reconciled.
- Block 1 Transformation Spec.
- Block 1 Implementation Plan.
- R8 Controlled Task Execution Set.

Where a proposal in an older migration document conflicts with the Owner decisions above, the Owner decisions prevail.

## 3. Target boundary

The canonical security boundary during and after coexistence is:

Authenticated User → Active Business Context → ACTIVE Membership → Role → Permission → Authorized Operation

The legacy boundary:

Usuario → Empresa / empresaId → legacy authorization

is compatibility input only during the bounded transition. It is not a second permanent authorization authority.

## 4. Coexistence obligations

### C-COEX-001 — Temporary and bounded
The coexistence period must be temporary and bounded. No permanent dual security model is approved.

**Evidence:** DOCUMENTED — Owner decision.

### C-COEX-002 — Legacy preservation
Existing Usuario, Empresa, legacy identifiers and current authentication behavior may remain as compatibility inputs during transition.

**Constraint:** preservation does not make legacy structures canonical.

### C-COEX-003 — Target authorization authority
Business-scoped authorization must resolve through User + Business Context + ACTIVE Membership + Role/Permission.

Legacy empresaId must not override the effective Business Context.

### C-COEX-004 — Application tenant isolation
Business-scoped operations must preserve application-level tenant isolation during coexistence.

At minimum:
- Business context is established before protected Business-scoped operation;
- the effective context corresponds to an ACTIVE Membership;
- client-supplied Business identifiers cannot override the server-established context;
- creation assigns ownership from context;
- reads, updates and deletes remain constrained to context;
- related/nested persistence cannot cross Business;
- missing or invalid context fails closed.

### C-COEX-005 — Legacy session limitation
A legacy session/token may be adapted as compatibility input only where explicitly supported by the later authentication/session contract.

It cannot permanently substitute for the Membership authorization model.

### C-COEX-006 — No destructive cleanup
Legacy fields, relations, tokens and authentication flows are not removed by this contract.

Cleanup requires a separate approved cutover/legacy-retirement activity.

## 5. Identity mapping boundary

During coexistence the conceptual mapping is:

| Legacy | Target | Status |
|---|---|---|
| Usuario | User | Approved direction |
| Empresa | Business | Approved direction |
| Usuario ↔ Empresa | Membership | Approved direction |
| Usuario.rol / legacy role | Membership Role | Requires approved mapping |
| UsuarioPermiso / Permiso | Permission model | Requires canonical catalogue/matrix |
| Cliente | Customer | Customer remains distinct from User |
| legacy empresaId | Business Context input | Transitional only |

No physical mapping, ID strategy or backfill algorithm is authorized by this contract.

## 6. Source-of-truth rule

During coexistence, each piece of operational data must have an explicitly defined authoritative source before a write path is introduced.

This contract does not approve dual-write.

It also does not approve target-only writes globally.

The write strategy must be established per affected migration slice after AS-IS dependency inspection and explicit approval.

## 7. Customer boundary

Customer remains distinct from User.

Customer may exist without User.

A Customer↔User association is controlled and must not be created solely because email values match.

Customer association is therefore not a prerequisite for establishing User/Membership coexistence.

Detailed matching, merge and unlink mechanics remain under R8-COM-002.

## 8. Authorization boundary

The coexistence layer must not introduce a parallel authorization model.

Required conceptual sequence:

1. authenticate global User;
2. establish effective Business Context;
3. resolve ACTIVE Membership for that Business;
4. evaluate Role/Permission;
5. execute Business-scoped operation.

Exact guards, middleware, interceptors, JWT claims, refresh, revocation, logout and session/device mechanics remain outside this contract.

R8-AUTH-001 remains responsible for the exact Permission catalogue and Role→Permission matrix.

## 9. Business Context boundary

The active Business Context is an application-controlled context.

The following are mandatory contract properties:

- a User may have multiple Memberships;
- the effective Business must correspond to a valid ACTIVE Membership;
- a client-supplied Business ID is untrusted input;
- missing or invalid context fails closed for protected Business-scoped operations;
- legacy empresaId cannot override the effective context.

The exact transport and Business-switch mechanism remain open technical details.

## 10. Cutover boundary

Cutover is a separate controlled task.

Before cutover, the following must be demonstrated for the affected slice:

- target identity mapping is reconciled;
- authorization uses target Membership semantics;
- Business isolation is verified;
- compatibility behavior is bounded;
- rollback/containment is defined;
- affected tests pass;
- no critical legacy dependency remains undocumented.

Token invalidation, re-login and final session migration are downstream authentication/cutover work. This contract does not execute or authorize them.

## 11. Rollback / containment

For the coexistence stage:

- no destructive legacy cleanup is permitted;
- target data and legacy data must remain recoverable within the approved migration procedure;
- a failed transformation must be containable without silently changing authorization semantics;
- any cutover rollback must be defined by the separate cutover task.

No rollback mechanism is invented here.

## 12. Preservation classification

| Existing behavior | Transformation disposition |
|---|---|
| Usuario / Empresa persistence | PRESERVED during coexistence |
| legacy identifiers | PRESERVED as compatibility evidence |
| legacy empresaId | ADAPTED / TRANSITIONAL |
| legacy authentication | ADAPTED / BOUNDED COMPATIBILITY |
| legacy authorization as final authority | DEPRECATED conceptually |
| target User/Business/Membership | NEW CANONICAL BOUNDARY |
| legacy cleanup | NOT AUTHORIZED |

## 13. Required evidence

R8-ID-003 completion requires:

1. Owner decision traceability;
2. current Identity/Tenancy contract reconciliation;
3. explicit coexistence obligations;
4. mapping boundary;
5. Business Context boundary;
6. authorization boundary;
7. preservation classification;
8. explicit non-scope;
9. downstream blockers;
10. review evidence.

Evidence classification:
- DOCUMENTADO: Owner decisions and contract content.
- VERIFIED BY CODE: only where existing AS-IS behavior has already been inspected.
- VERIFIED BY TEST: only after applicable tests execute.
- VERIFIED BY EXECUTION: only after runtime/migration execution.
- NOT DETERMINABLE: technical details not yet implemented or executed.

## 14. Downstream dependencies

R8-ID-003 does not close:

- R8-AUTH-001 Permission catalogue/matrix;
- R8-AUTH-002 MFA mechanism;
- exact authentication/session contract;
- exact Business Switch mechanism;
- physical migration/backfill;
- cutover procedure;
- legacy cleanup;
- Customer↔User merge/unlink mechanics.

These remain separate tasks.

## 15. Task exit criteria

R8-ID-003 may be marked **CONTRACT-CLOSED / READY FOR DOWNSTREAM RECONCILIATION** only when this contract is explicitly reviewed and its propagation is recorded in the relevant Identity/Tenancy transformation and implementation-readiness artifacts.

It must not be marked IMPLEMENTED.

## 16. Gate

**R8-ID-003: CONTRACT DRAFT COMPLETE.**

**Owner approval of the direction already exists.**

**Task-local contract review/propagation: REQUIRED.**

**Migration implementation: NOT AUTHORIZED.**

**Schema/runtime changes: NOT AUTHORIZED.**