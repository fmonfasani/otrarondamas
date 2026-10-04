# WAPSELL — BLOCK 1 IMPLEMENTATION PLAN v0.1

**Status:** DRAFT — IMPLEMENTATION PLAN / NOT APPROVED  
**Date:** 2026-10-04  
**Scope:** Wapsell MVP — Block 1  
**Predecessors:** Block 1 Architecture, Contracts, Invariants, Tests/Evals, Transformation Spec, R7 Transformation Plan, R8 Controlled Tasks  
**Implementation:** NOT AUTHORIZED

## 1. Purpose

This document converts the documentary transformation chain into a controlled implementation plan. It defines increments, dependencies, local readiness gates, evidence requirements and cutover controls. It does not authorize implementation by itself.

## 2. Authority

REQUIREMENTS → OWNER DECISIONS → CANONICAL SPEC → TO-BE → ARCHITECTURE → CONTRACTS → INVARIANTS → TESTS/EVALS → TRANSFORMATION SPEC → IMPLEMENTATION PLAN → TASKS → IMPLEMENTATION → VALIDATION.

A lower layer cannot silently close an OPEN decision from a higher layer.

## 3. Current implementation gate

The project is not globally implementation-ready.

Prerequisites for affected structural implementation remain: technical architecture approval; physical User/Business/Membership model; exact Permission catalogue/matrix; authentication/session contract; MFA mechanism; Business Switch mechanism; detailed Order/Sale state/effect semantics; inventory reservation transaction/concurrency semantics; physical Location model; Payment/Cash/AR detailed effects; Messaging physical/API/event boundary.

Therefore: planning is permitted; general implementation is not authorized.

## 4. Implementation strategy

### Incremental
Each implementation increment has a bounded objective. No broad rewrite is authorized.

### Coexistence
Legacy and target behavior may coexist temporarily where required for continuity. Coexistence must be bounded, observable, reversible where practical and explicitly validated.

### Preservation
Every affected behavior is classified PRESERVED, ADAPTED, DEPRECATED, or REPLACED — EXPLICITLY APPROVED.

### No speculative implementation
Developers must not invent schema fields, IDs, API routes, events, permissions, states, transaction boundaries, JWT claims or migration semantics. OPEN information returns the task to SPEC-CLOSURE.

## 5. Implementation increments

### I0 — Canonical and repository readiness
Objective: verify current decisions, architecture, contracts, invariants, tests/evals, transformation spec and affected AS-IS evidence. Exit evidence: traceability matrix, affected-file inventory and task-local readiness record. State: READY AS PLANNING ACTIVITY.

### I1 — Technical architecture closure
Objective: close the minimum technical architecture for the first implementation slice, including module responsibility, persistence ownership, Business-context enforcement, authentication/session boundary, transaction boundary where required and test boundary. Do not infer ORM, database, API style, event broker, deployment topology, RLS or infrastructure. Gate: BLOCKED until architecture approval.

### I2 — Identity / Tenancy foundation
Target: User ↔ Membership ↔ Business plus Active Business Context. Required: physical model, legacy mapping, coexistence contract, authentication/session boundary, Business Context mechanism and tenant isolation mechanism. Disposition: ADAPTED / COEXISTENCE. Validate TE-ID-001..011 and cross-Business negative evaluations. Gate: BLOCKED until local specification and architecture gates close.

### I3 — Authorization foundation
Target: Membership → Role → Permission. MVP roles: Owner, Admin, Vendedor, Gestor de Stock. Required: exact Permission catalogue, Role→Permission matrix, enforcement boundary and MFA contract. Validate TE-AUTH-001..006. Gate: BLOCKED until authorization specification closes.

### I4 — Customer / Catalog / Cart foundation
Target: Customer, global Product, BusinessProduct and Cart. Required behavior: Customer ≠ User; Business-scoped Customer; controlled Customer↔User association; global Product identity; Business-specific BusinessProduct; anonymous Cart; Customer required before Order. Validate TE-CUST-001..004 and TE-COM-001..004. Gate: affected physical semantics must be closed.

### I5 — Inventory foundation
Target: Order confirmation → Reservation → Physical stock exit → Stock-out movement. Required: Business ownership, no negative stock, reservation integrity, concurrency protection, FEFO/FIFO and generic Location with MAIN minimum. Required before implementation: reservation persistence, transaction boundary, concurrency/locking, Location model and lot/batch semantics. Validate TE-INV-001..014. Gate: BLOCKED until these semantics close.

### I6 — Order / Sale foundation
Target: Cart → Order → ORDER_CONFIRM → Sale + Reservation. Required: Order ≠ Sale; ORDER_CONFIRM authorization; Sale at confirmation; delivery/payment do not create Sale; confirmed Sale immutable; explicit corrections. Required: exact state machines, effect matrix and transaction semantics. Validate TE-ORD-001..008. Gate: BLOCKED.

### I7 — Payment / Cash / AR
Target: independent Payment lifecycle with explicit Cash/AR effects. Required: partial/multiple payments, overpayment rejection by default, historical Payment preservation, explicit reversal/refund, Business-scoped Cash, sensitive Cash permissions and separate AR application. Required: lifecycle, reconciliation, Payment↔Cash matrix, AR allocation, Cash states/adjustments and correction effects. Validate TE-PAY, TE-AR and TE-CASH criteria. Gate: BLOCKED.

### I8 — Fulfillment
Target: Fulfillment within Orders. Required: delivery completion does not create Sale; Repartidor remains outside MVP Membership Roles. Detailed lifecycle, tracking and actor boundary must close first. Validate TE-FUL-001..003. Gate: BLOCKED.

### I9 — Returns / Refunds
Target: explicit post-sale correction operations without silently mutating historical Sale. Required: Return/Refund state and Inventory/Payment/Cash/AR effects. Gate: BLOCKED until effect matrix approval.

### I10 — Messaging
Target: Conversation → Customer → Commerce context → Cart/Order. Required: one Business per Conversation, Customer without User, underlying authorization, no WhatsApp dependency and AI inactive. Required: physical model, participants, realtime, notifications/retention and API/event contracts. Validate TE-MSG-001..006. Gate: BLOCKED.

### I11 — Brand / Experience / Cross-cutting
Target: Business Brand as customer-facing identity over Wapsell. Required: Brand belongs to Business and Wapsell remains platform identity. Validate TE-BRAND-001..002. Gate: Brand/Experience contract required.

### I12 — Cutover and legacy retirement
Only after applicable tests pass, isolation and authorization are validated, migration reconciled, regression assessed, coexistence is no longer required, rollback/containment criteria are satisfied and explicit owner authorization exists. No component is designated for deletion by this plan.

## 6. Dependency graph

I0 → I1 → I2 → I3 → I4 → I5 → I6 → I7.

I6 → I8 → I9.

I2 + I3 + I4 + I6 → I10.

I2 → I11.

Validated increments → I12.

This is dependency planning, not release authorization.

## 7. Task promotion model

A planned implementation task may become READY only when: scope and non-scope are explicit; applicable decisions and Contracts are sufficiently closed; Invariants and Tests/Evals exist; affected AS-IS behavior is evidenced; architecture dependency is closed; migration/coexistence impact is understood; expected evidence is defined; rollback/containment is defined where relevant.

If any applicable condition fails: BLOCKED / SPEC-CLOSURE required.

## 8. Definition of Ready

A task is READY only if no unresolved normative behavior is required, no unapproved technical mechanism is assumed, affected code has been inspected, acceptance criteria are testable, Business isolation and authorization impacts are understood, data/migration impact is understood, and preservation classification is explicit.

## 9. Definition of Done

An increment is DONE only when approved behavior is implemented; relevant automated tests exist and execute successfully; applicable negative/security tests execute; isolation and authorization are validated where applicable; regression is assessed; migration/coexistence evidence is recorded; documentation is reconciled; and no unapproved scope is introduced.

## 10. Evidence requirements

| Evidence | Required |
|---|---|
| Source commit | Yes |
| Changed files | Yes |
| Tests executed | Yes |
| Test results | Yes |
| Runtime evidence where relevant | Yes |
| Migration evidence where relevant | Yes |
| Security/isolation evidence where relevant | Yes |
| Regression assessment | Yes |
| Documentation reconciliation | Yes |

Evidence must be classified as VERIFIED BY CODE, VERIFIED BY TEST, VERIFIED BY EXECUTION, DOCUMENTED, or NOT DETERMINABLE.

## 11. Rollback / containment

Every transformation affecting existing behavior must define reversible code change, feature/configuration rollback, coexistence fallback, data rollback, compensating operation, or an explicit containment strategy where technical reversal is impossible.

No destructive migration proceeds without an approved containment strategy.

## 12. Explicit exclusions

This plan does not authorize Purchases/AP initial MVP implementation, AI assistants, automatic WhatsApp dependency, Kubernetes migration, microservices decomposition, database replacement, ORM replacement, infrastructure migration, production deployment, legacy deletion or broad rewrite.

## 13. Current plan state

| Increment | State |
|---|---|
| I0 Canonical / AS-IS readiness | READY AS PLANNING |
| I1 Architecture | BLOCKED |
| I2 Identity/Tenancy | BLOCKED |
| I3 Authorization | BLOCKED |
| I4 Customer/Catalog/Cart | BLOCKED BY UPSTREAM |
| I5 Inventory | BLOCKED |
| I6 Order/Sale | BLOCKED |
| I7 Payment/Cash/AR | BLOCKED |
| I8 Fulfillment | BLOCKED |
| I9 Returns/Refunds | BLOCKED |
| I10 Messaging | BLOCKED |
| I11 Brand/Experience | SPECIFICATION-FIRST |
| I12 Cutover | NOT REACHABLE |

## 14. Readiness gate

IMPLEMENTATION PLAN: DRAFT — CONTROLLED.

The plan is sufficiently defined to derive task-local implementation work. It does not establish global implementation readiness.

Implementation: NOT AUTHORIZED.

Deployment: NOT AUTHORIZED.

Destructive changes: NOT AUTHORIZED.