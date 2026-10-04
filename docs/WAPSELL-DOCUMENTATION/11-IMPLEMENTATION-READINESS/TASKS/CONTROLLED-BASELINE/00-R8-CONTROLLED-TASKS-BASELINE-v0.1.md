# WAPSELL — R8 CONTROLLED TASKS BASELINE v0.1

**Status:** DRAFT — NOT APPROVED  
**Date:** 2026-10-03  
**Layer:** Tasks — Controlled Baseline  
**Authority:** R7 Transformation Plan v0.2 + current canonical Decisions + Requirements + Contracts + Invariants + Tests/Evals  
**Historical predecessor:** `11-IMPLEMENTATION-READINESS/TASKS/R8/00-R8-TASKS-BASELINE-001-490.md`

> This artifact is a controlled task baseline. It does not authorize implementation, schema changes, migrations, destructive changes, deployment, or resolution of OPEN product/architecture decisions by inference.

## 1. Purpose

Convert the audited R7 transformation sequence into a **small, task-local and auditable R8 work set**.

R8 does not attempt to enumerate every future implementation task. It establishes the controlled prerequisite work required to make the first implementation slice genuinely executable.

Sequence:

`REQUIREMENTS → SPEC → ARCHITECTURE → CONTRACT → INVARIANT → TEST/EVAL → PLAN → TASK → IMPLEMENTATION → VALIDATION`

## 2. Corrections against the historical R8 baseline

The historical R8 baseline is preserved as history and is **not authoritative for current task derivation**.

The following corrections are mandatory:

1. Authorization is `Membership → Role → Permission`. Historical `Profile → Role → Capability → Override` wording is superseded.
2. Current MVP Membership Roles are Owner, Admin, Vendedor and Gestor de Stock.
3. Customer and Supplier are not Membership Roles.
4. Repartidor is not an MVP Membership Role.
5. Purchases/AP are outside the initial MVP; no implementation tasks are derived for them in this baseline.
6. Customer/User association uses controlled association; no automatic association by email alone.
7. Product identity is global; BusinessProduct provides Business-specific commercial context.
8. Anonymous Cart is permitted; Customer is required before Order.
9. Order and Sale remain distinct; Sale is born at commercial confirmation.
10. Commercial Order confirmation requires Business-side authorization via `ORDER_CONFIRM`.
11. Confirmed Order reserves stock; physical decrement is represented by an actual stock-out movement.
12. Inventory uses Business ownership, negative-stock prohibition, FEFO/FIFO and generic Location with MAIN minimum.
13. Fulfillment remains under Orders and does not introduce a Repartidor Membership Role.
14. Messaging is a first-class Wapsell domain and does not depend on WhatsApp in MVP.
15. MFA is mandatory for Owner/Admin; technical mechanism remains OPEN.
16. SaaS Admin is conceptual and outside the operational MVP.

## 3. Task model

### Task classes

- **SPEC-CLOSURE** — close an OPEN normative/technical detail without inventing a solution.
- **ARCHITECTURE** — define and obtain approval for structural architecture.
- **ASIS-EVIDENCE** — inspect and record existing implementation behavior.
- **TEST-DERIVATION** — refine verification criteria from approved specifications.
- **TRANSFORMATION** — change existing behavior/data after local readiness.
- **IMPLEMENTATION** — create approved new behavior.
- **VALIDATION** — execute tests/evidence procedures.
- **REVIEW/DELIVERY** — review and deliver a validated increment.

### Task states

- **PROPOSED** — identified, not yet locally ready.
- **READY** — prerequisites and evidence are sufficient for the stated task class.
- **BLOCKED** — explicit dependency prevents execution.
- **IN PROGRESS** — execution authorized.
- **DONE** — completion and evidence demonstrated.

R8 itself does not move implementation tasks to IN PROGRESS.

## 4. Mandatory task record

Every controlled task must identify:

| Field | Required |
|---|---|
| Class | Yes |
| Scope | Yes |
| Non-scope | Yes |
| Requirement / Decision | Where applicable |
| Specialized Spec | Where applicable |
| Contract | Where applicable |
| Invariant | Where applicable |
| Test/Eval | Where applicable |
| AS-IS evidence | Required for transformation |
| Dependencies | Yes |
| Blockers | Yes |
| Expected evidence | Yes |
| Preservation classification | For affected existing behavior |
| Rollback / containment | Where relevant |
| Exit criteria | Yes |

## 5. P0 — Canonical readiness tasks

### R8-CAN-001 — Reconcile current canonical input set
**Class:** REVIEW/DELIVERY  
**Scope:** Verify that the task baseline references the current Requirements, Owner decisions, Contracts, Invariants, Tests/Evals and R7 Plan.  
**Non-scope:** No changes to canonical semantics.  
**Status:** PROPOSED  
**Dependencies:** None  
**Expected evidence:** source inventory and authority precedence check.  
**Exit:** No task is based on a superseded rule without an explicit historical designation.

### R8-CAN-002 — Audit task traceability model
**Class:** TEST-DERIVATION  
**Scope:** Verify that each executable candidate task can expose its required traceability fields.  
**Non-scope:** No implementation.  
**Status:** PROPOSED  
**Dependencies:** R8-CAN-001  
**Expected evidence:** traceability checklist.  
**Exit:** Task records are structurally auditable.

## 6. P1 — Architecture closure

### R8-ARCH-001 — Close first-slice architectural boundary
**Class:** ARCHITECTURE  
**Scope:** Define the minimum approved technical architecture required for the first structural implementation slice.  
**Non-scope:** No implementation, infrastructure deployment or technology selection beyond what the architecture decision explicitly approves.  
**Status:** BLOCKED — OWNER/ARCHITECTURE APPROVAL REQUIRED  
**Dependencies:** R7 Plan; current Contracts/Invariants/Tests.  
**Blockers:** Architecture is directional but not approved for structural implementation.  
**Expected evidence:** approved architecture artifact and explicit decision.  
**Exit:** First implementation slice has approved structural boundaries.

### R8-ARCH-002 — Close technical tenant-isolation boundary
**Class:** ARCHITECTURE  
**Scope:** Define the approved mechanism by which Business isolation is technically enforced.  
**Non-scope:** No schema/RLS/API implementation.  
**Status:** BLOCKED  
**Dependencies:** R8-ARCH-001  
**Blockers:** Tenant isolation mechanism remains OPEN.  
**Expected evidence:** approved architecture/contract statement.  
**Exit:** Isolation mechanism is explicitly approved.

### R8-ARCH-003 — Close authentication/session boundary
**Class:** SPEC-CLOSURE  
**Scope:** Define the approved technical contract for authentication/session handling needed by the first slice.  
**Non-scope:** No JWT/session implementation by inference.  
**Status:** BLOCKED  
**Dependencies:** R8-ARCH-001  
**Blockers:** Authentication/session mechanics remain OPEN.  
**Expected evidence:** approved contract/spec.  
**Exit:** First slice has a closed authentication/session boundary.

## 7. P2 — Identity & Tenancy

### R8-ID-001 — AS-IS identity/tenancy evidence pack
**Class:** ASIS-EVIDENCE  
**Scope:** Inspect current User/Empresa/session/business-related implementation and document actual behavior.  
**Non-scope:** No migration or refactor.  
**Status:** PROPOSED  
**Dependencies:** R8-CAN-001  
**Expected evidence:** code paths, schema evidence where present, tests/runtime evidence where available.  
**Preservation:** PRESERVED until an approved transformation says otherwise.  
**Exit:** AS-IS behavior is bounded enough to design the first migration increment.

### R8-ID-002 — Close physical User/Business/Membership model
**Class:** SPEC-CLOSURE  
**Scope:** Define the physical model required by the approved architecture and canonical identity/tenancy rules.  
**Non-scope:** No migration.  
**Status:** BLOCKED  
**Dependencies:** R8-ARCH-001; R8-ID-001  
**Blockers:** physical model remains OPEN.  
**Expected evidence:** approved specialized specification/architecture.  
**Exit:** physical model and ownership boundaries are approved.

### R8-ID-003 — Define controlled legacy coexistence for identity
**Class:** SPEC-CLOSURE  
**Scope:** Define bounded coexistence between AS-IS identity and the approved User/Business/Membership model.  
**Non-scope:** No cutover.  
**Status:** BLOCKED  
**Dependencies:** R8-ID-002; R8-ARCH-003  
**Expected evidence:** migration/coexistence specification.  
**Exit:** compatibility and rollback/containment rules are explicit.

## 8. P3 — Authorization

### R8-AUTH-001 — Close Permission catalogue and Role→Permission matrix
**Class:** SPEC-CLOSURE  
**Scope:** Define the exact MVP Permission catalogue and Role→Permission mapping under `Membership → Role → Permission`.  
**Non-scope:** No implementation.  
**Status:** BLOCKED  
**Dependencies:** R8-ID-002  
**Blockers:** exact catalogue/matrix remain OPEN.  
**Expected evidence:** approved authorization specification/contract.  
**Exit:** authorization rules are executable without inventing permissions.

### R8-AUTH-002 — Close Owner/Admin MFA mechanism
**Class:** SPEC-CLOSURE  
**Scope:** Define the technical mechanism satisfying mandatory MFA for Owner/Admin.  
**Non-scope:** No deployment or provider selection unless explicitly approved.  
**Status:** BLOCKED  
**Dependencies:** R8-ARCH-003  
**Blockers:** MFA mechanism remains OPEN.  
**Expected evidence:** approved authentication/security contract.  
**Exit:** MFA behavior and integration boundary are explicit.

### R8-AUTH-003 — AS-IS authorization evidence pack
**Class:** ASIS-EVIDENCE  
**Scope:** Inspect existing authorization behavior, roles, guards/services and tests.  
**Non-scope:** No replacement of current authorization.  
**Status:** PROPOSED  
**Dependencies:** R8-CAN-001  
**Expected evidence:** code/test evidence mapped to current behavior.  
**Exit:** current authorization behavior is distinguishable from target authorization.

## 9. P4 — Customer / Catalog / Cart

### R8-COM-001 — AS-IS Customer/Product/Cart evidence pack
**Class:** ASIS-EVIDENCE  
**Scope:** Inspect existing Customer, Product, cart and related commerce behavior.  
**Non-scope:** No transformation.  
**Status:** PROPOSED  
**Dependencies:** R8-CAN-001  
**Expected evidence:** actual models, services, routes/use cases and tests where present.  
**Exit:** AS-IS boundaries and preservation candidates are recorded.

### R8-COM-002 — Close Customer↔User association mechanics
**Class:** SPEC-CLOSURE  
**Scope:** Define controlled association, disassociation and relevant matching behavior consistent with OR-B3.  
**Non-scope:** No automatic email-only linking.  
**Status:** BLOCKED  
**Dependencies:** R8-ID-002; R8-COM-001  
**Blockers:** exact merge/unlink mechanics remain OPEN.  
**Expected evidence:** approved specialized spec/contract.  
**Exit:** association behavior is explicit and testable.

### R8-COM-003 — Close Product/BusinessProduct physical allocation
**Class:** SPEC-CLOSURE  
**Scope:** Define physical field/entity allocation consistent with global Product + BusinessProduct.  
**Non-scope:** No implementation.  
**Status:** BLOCKED  
**Dependencies:** R8-COM-001; R8-ARCH-001  
**Expected evidence:** approved Commerce specification/architecture.  
**Exit:** no implementation task needs to infer ownership of fields.

### R8-COM-004 — Close anonymous Cart → Customer → Order boundary
**Class:** SPEC-CLOSURE  
**Scope:** Define the behavioral boundary required by canonical Cart/Customer/Order rules.  
**Non-scope:** No Order/Sale state-machine implementation.  
**Status:** PROPOSED  
**Dependencies:** R8-COM-001; applicable Commerce Contract.  
**Expected evidence:** specialized behavior + test criteria.  
**Exit:** Cart behavior can be implemented without inventing Order semantics.

## 10. P5 — Inventory

### R8-INV-001 — AS-IS inventory evidence pack
**Class:** ASIS-EVIDENCE  
**Scope:** Inspect current stock models, movements, reservations, locations and stock-affecting operations.  
**Non-scope:** No stock mutation.  
**Status:** PROPOSED  
**Dependencies:** R8-CAN-001  
**Expected evidence:** code/schema/test evidence.  
**Exit:** actual stock behavior is bounded.

### R8-INV-002 — Close reservation/stock transaction semantics
**Class:** SPEC-CLOSURE  
**Scope:** Define transaction/concurrency semantics for confirmed-Order reservation and physical stock-out movement.  
**Non-scope:** No implementation.  
**Status:** BLOCKED  
**Dependencies:** R8-ARCH-001; R8-INV-001  
**Blockers:** reservation transaction boundaries remain OPEN.  
**Expected evidence:** approved Inventory specification/architecture.  
**Exit:** reservation and physical decrement can be tested without inferred transaction behavior.

### R8-INV-003 — Close physical Location model
**Class:** SPEC-CLOSURE  
**Scope:** Define the physical representation consistent with generic Location, MAIN minimum and multiple Locations.  
**Non-scope:** No creation of Branch/Warehouse concepts by inference.  
**Status:** BLOCKED  
**Dependencies:** R8-ARCH-001; R8-INV-001  
**Expected evidence:** approved Inventory/Architecture artifact.  
**Exit:** location ownership and persistence are explicit.

## 11. P6 — Order / Sale

### R8-ORD-001 — AS-IS Order/Sale evidence pack
**Class:** ASIS-EVIDENCE  
**Scope:** Inspect current Order/Sale creation, confirmation, stock effects and payment relationships.  
**Non-scope:** No behavior change.  
**Status:** PROPOSED  
**Dependencies:** R8-CAN-001  
**Expected evidence:** code/tests/runtime evidence where available.  
**Exit:** current boundaries are documented.

### R8-ORD-002 — Close Order/Sale state and effect boundaries
**Class:** SPEC-CLOSURE  
**Scope:** Define exact state transitions, commercial confirmation, Sale creation and immutable confirmed-Sale correction behavior.  
**Non-scope:** No implementation.  
**Status:** BLOCKED  
**Dependencies:** R8-ORD-001; R8-INV-002; R8-AUTH-001  
**Blockers:** exact state machines and effect matrix remain OPEN.  
**Expected evidence:** approved Commerce specification/contract/invariants/tests.  
**Exit:** Order/Sale implementation can be specified without inference.

## 12. P7 — Payments / Cash / AR

### R8-PAY-001 — AS-IS Payment/Cash/AR evidence pack
**Class:** ASIS-EVIDENCE  
**Scope:** Inspect current payment, cash and AR behavior and coupling.  
**Non-scope:** No economic behavior change.  
**Status:** PROPOSED  
**Dependencies:** R8-CAN-001  
**Expected evidence:** code/schema/test evidence.  
**Exit:** existing behavior and coupling are bounded.

### R8-PAY-002 — Close Payment lifecycle and reconciliation
**Class:** SPEC-CLOSURE  
**Scope:** Define Payment lifecycle and reconciliation boundary independently from Sale.  
**Non-scope:** No provider or transport selection by inference.  
**Status:** BLOCKED  
**Dependencies:** R8-PAY-001; R8-ARCH-001  
**Blockers:** Payment lifecycle/reconciliation remains OPEN.  
**Expected evidence:** approved Payment contract/spec.  
**Exit:** Payment implementation boundary is closed.

### R8-PAY-003 — Close Payment↔Cash and AR effects
**Class:** SPEC-CLOSURE  
**Scope:** Define economic effects and allocation rules where Payment interacts with Cash/AR.  
**Non-scope:** No implementation.  
**Status:** BLOCKED  
**Dependencies:** R8-PAY-002  
**Blockers:** Payment↔Cash effects and AR allocation/credit rules remain OPEN.  
**Expected evidence:** approved cross-domain effect matrix.  
**Exit:** no cross-domain economic effect is inferred.

### R8-CASH-001 — Close Cash detailed state/adjustment semantics
**Class:** SPEC-CLOSURE  
**Scope:** Define detailed Cash states, adjustments and authorization boundaries consistent with sensitive-operation Permissions.  
**Non-scope:** No implementation.  
**Status:** BLOCKED  
**Dependencies:** R8-AUTH-001; R8-PAY-003  
**Expected evidence:** approved Cash specification/contract.  
**Exit:** Cash implementation can be tested against closed semantics.

## 13. P8 — Fulfillment

### R8-FUL-001 — Close Orders-owned Fulfillment lifecycle
**Class:** SPEC-CLOSURE  
**Scope:** Define fulfillment lifecycle, delivery states and future actor boundary while keeping Fulfillment under Orders.  
**Non-scope:** No Repartidor Membership Role creation.  
**Status:** BLOCKED  
**Dependencies:** R8-ORD-002  
**Blockers:** detailed Fulfillment lifecycle remains OPEN.  
**Expected evidence:** approved specialized spec.  
**Exit:** fulfillment behavior is independently testable without changing role model.

## 14. P9 — Returns / Refunds

### R8-RET-001 — Close Return/Refund state and effect matrix
**Class:** SPEC-CLOSURE  
**Scope:** Define Return/Refund states and Inventory/Payment/Cash/AR effects.  
**Non-scope:** No implementation.  
**Status:** BLOCKED  
**Dependencies:** R8-ORD-002; R8-PAY-003  
**Blockers:** Return/Refund state machines and effect matrix remain OPEN.  
**Expected evidence:** approved Commerce/Payment/Cash/AR artifacts.  
**Exit:** post-sale operations are implementable without mutating historical Sale silently.

## 15. P10 — Messaging

### R8-MSG-001 — AS-IS Messaging evidence pack
**Class:** ASIS-EVIDENCE  
**Scope:** Inspect current conversations/messages, participant identity and commerce integration.  
**Non-scope:** No channel replacement.  
**Status:** PROPOSED  
**Dependencies:** R8-CAN-001  
**Expected evidence:** code/schema/test evidence.  
**Exit:** actual Messaging behavior is bounded.

### R8-MSG-002 — Close Messaging physical/API/event boundary
**Class:** SPEC-CLOSURE  
**Scope:** Define Conversation/Message model, participant handling, authorization boundary, realtime/notification requirements and approved API/event boundary.  
**Non-scope:** No WhatsApp dependency and no AI execution in MVP.  
**Status:** BLOCKED  
**Dependencies:** R8-ARCH-001; R8-AUTH-001; R8-MSG-001  
**Blockers:** Messaging physical model and API/event contracts remain OPEN.  
**Expected evidence:** approved Messaging specification/contract.  
**Exit:** Messaging can integrate with Commerce without duplicating ERP semantics.

## 16. P11 — Brand / Experience / Cross-cutting

### R8-BRAND-001 — Close Business Brand configuration boundary
**Class:** SPEC-CLOSURE  
**Scope:** Define Business Brand configuration and customer-facing identity boundary.  
**Non-scope:** No redesign or visual replacement by inference.  
**Status:** PROPOSED  
**Dependencies:** R8-CAN-001  
**Expected evidence:** approved Brand/Experience contract/spec.  
**Exit:** customer-facing Business identity is bounded.

### R8-X-001 — Close audit/notification architecture boundary
**Class:** ARCHITECTURE  
**Scope:** Define the approved cross-cutting boundary for audit and notifications after domain events/contracts are closed.  
**Non-scope:** No provider implementation.  
**Status:** BLOCKED  
**Dependencies:** R8-ARCH-001; applicable domain contracts.  
**Expected evidence:** approved architecture/contract.  
**Exit:** cross-cutting behavior has a controlled integration boundary.

## 17. P12 — First implementation-slice readiness

### R8-READY-001 — Select first implementation slice
**Class:** REVIEW/DELIVERY  
**Scope:** Select one bounded implementation slice from tasks whose local gates are actually satisfied.  
**Non-scope:** No implementation authorization by selection alone.  
**Status:** PROPOSED  
**Dependencies:** R8-ARCH-001; relevant specification and AS-IS tasks.  
**Expected evidence:** explicit slice selection with traceability and non-scope.  
**Exit:** one slice is bounded enough for task-level implementation authorization.

### R8-READY-002 — Generate executable implementation task(s) for selected slice
**Class:** REVIEW/DELIVERY  
**Scope:** Derive implementation task(s) only from the selected slice and closed prerequisites.  
**Non-scope:** No execution.  
**Status:** BLOCKED  
**Dependencies:** R8-READY-001 plus all applicable local gates.  
**Expected evidence:** implementation task records with full traceability.  
**Exit:** implementation tasks are READY without OPEN normative blockers.

## 18. Explicitly excluded from this R8 baseline

No implementation task is created here for:

- Purchases/AP initial MVP;
- AI assistants;
- WhatsApp/external messaging channels;
- SaaS Admin operational functionality;
- Repartidor as Membership Role;
- Kubernetes, GraphQL, REST, Postgres, Prisma, JWT, RLS or other technology choices unless approved by Architecture;
- production migration/cutover;
- deployment;
- destructive replacement of legacy behavior.

## 19. Preservation rule

For every future transformation task, existing behavior must be classified as:

- **PRESERVED**
- **ADAPTED**
- **DEPRECATED**
- **REPLACED — EXPLICITLY APPROVED**

No task may use architectural cleanup as implicit authorization for deletion or replacement.

## 20. R8 gate

**Current gate: CONTROLLED TASK DERIVATION — PASS WITH BLOCKERS.**

The project has a coherent R8 task set, but the majority of structural implementation tasks remain blocked by specification and architecture closure.

The next controlled action is **R8 task audit**, followed by local readiness review. No code/schema/data/deployment change is authorized by this baseline.

## 21. Evidence status

| Layer | Status |
|---|---|
| Requirements | RECONCILED |
| Decisions | OWNER-RULED + CANONICAL RECONCILIATION |
| Contracts | DRAFT / RECONCILED |
| Invariants | v0.2 DRAFT / RECONCILED |
| Tests/Evals | v0.2 DRAFT / REVIEWED / NOT EXECUTED |
| Architecture | DIRECTIONAL / NOT APPROVED |
| R7 Plan | DRAFT / AUDITED |
| R8 Tasks | THIS DOCUMENT / DRAFT |
| Implementation | NOT AUTHORIZED BY R8 |
| Schema/Data/Deploy | NOT AUTHORIZED BY R8 |

