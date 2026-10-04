# WAPSELL — R7 TRANSFORMATION PLAN v0.2

**Status:** DRAFT — NOT APPROVED  
**Date:** 2026-10-03  
**Layer:** Plan — Transformation  
**Authority:** Canonical Requirements + Owner rulings + reconciled Contracts + Canonical Invariants v0.2 + Canonical Tests/Evals v0.2 + AS-IS evidence  
**Predecessor:** `00-R7-TRANSFORMATION-PLAN-BASELINE-001-490.md`

> This is a controlled planning artifact. It does not authorize implementation, schema changes, migrations, destructive changes, deployment or product decisions.

---

## 1. Purpose

Convert the reconciled specification chain into a controlled transformation sequence while preserving the separation:

`AS-IS → GAP → TO-BE → CONTRACT → INVARIANT → TEST/EVAL → PLAN → TASK → IMPLEMENTATION → VALIDATION`

The plan is incremental and task-local. It must not convert OPEN details into implementation requirements.

---

## 2. Planning principles

1. **AS-IS is evidence, not TO-BE compliance.**
2. **Owner rulings and canonical reconciliations govern lower-level planning.**
3. **OPEN details remain blockers or specification work.**
4. **A plan item does not authorize implementation.**
5. **Existing functionality is preserved unless an approved transformation explicitly changes it.**
6. **Every future implementation task must be traceable to its applicable Requirement, Contract, Invariant and Test/Eval.**
7. **Migration is incremental and coexistence-based where existing behavior must remain operational.**
8. **No technical mechanism is selected by inference from a domain invariant.**

---

## 3. Current readiness

| Layer | Current state | Planning implication |
|---|---|---|
| Requirements | Reconciled baseline | Usable as source |
| Decisions | Owner rulings propagated | Use current authority precedence |
| Specialized Specs | Partial / several OPEN details | Domain-local closure required |
| Architecture | Direction exists, technical architecture not approved | Structural implementation blocked |
| Contracts | R5 reconciled, DRAFT | Use only reconciled boundaries |
| Invariants | v0.2 reconciled, DRAFT / NOT APPROVED | Verification source, not implementation authorization |
| Tests/Evals | v0.2 reviewed/reconciled, DRAFT / NOT APPROVED | Criteria source, no execution claimed |
| AS-IS | Repository evidence available in bounded areas | Inspect affected code before transformation |
| Implementation | Existing application remains AS-IS | No transformation implied by this plan |

---

## 4. Gates

### G0 — Canonical planning input

**Required:**
- current authoritative decision chain;
- applicable Contract;
- applicable Invariant;
- applicable Test/Eval;
- AS-IS evidence for affected existing behavior.

**Status:** READY FOR CONTROLLED PLANNING.

---

### G1 — Specification closure

A task may proceed only if every normative behavior it changes is closed by an applicable specification/decision.

**Status:** PARTIAL.

Examples still OPEN:
- exact authorization catalogue/matrix;
- authentication/session mechanics;
- Business Switch mechanism;
- exact Order/Sale state machines;
- cancellation/reversal/refund effects;
- Payment reconciliation;
- Payment↔Cash effects;
- AR allocation/credit formula;
- Cash detailed state machine;
- inventory transaction boundaries;
- physical Location model;
- Messaging physical model;
- detailed Fulfillment lifecycle.

---

### G2 — Architecture closure

Structural implementation requires approved architecture.

The current Modular Monolith direction is architectural direction only; it does not by itself approve:
- exact module decomposition;
- persistence ownership;
- API style;
- event transport;
- infrastructure;
- deployment topology;
- technical tenant isolation;
- transaction boundaries.

**Status:** NOT READY FOR STRUCTURAL IMPLEMENTATION.

---

### G3 — Task readiness

Every executable task must have:

- explicit scope;
- explicit non-scope;
- applicable Requirement/Decision;
- applicable Contract;
- applicable Invariant where relevant;
- applicable Test/Eval;
- AS-IS evidence when transforming existing behavior;
- dependencies/blockers;
- expected evidence;
- rollback/containment strategy when relevant.

**Status:** DEFINITION READY; TASK DERIVATION NOT YET AUTHORIZED GLOBALLY.

---

### G4 — Validation readiness

Transformation completion requires:
- implementation evidence;
- relevant test execution;
- result evidence;
- regression assessment;
- documentation update;
- no unresolved critical discrepancy.

**Status:** NOT REACHED.

---

## 5. Transformation workstreams

### WS-01 — Identity & Tenancy

**Target:** User + Business + Membership contextual model.

**Canonical rules:**
- User is global.
- Business is tenancy boundary.
- Membership contextualizes User↔Business.
- INACTIVE Membership cannot operate.
- normalized User email is globally unique.
- Customer is distinct from User.
- Customer/User association is controlled.

**Required specification closure before structural implementation:**
- physical identity model;
- Membership persistence;
- Business Context mechanism;
- tenant isolation mechanism;
- authentication/session mechanics;
- Business Switch mechanism;
- migration/coexistence details.

**Plan state:** SPECIFICATION / ARCHITECTURE BLOCKED.

---

### WS-02 — Authorization & Team

**Target:** Membership→Role→Permission.

**Canonical MVP Membership Roles:**
- Owner;
- Admin;
- Vendedor;
- Gestor de Stock.

Customer and Supplier are not Membership Roles. Repartidor is not an MVP Membership Role.

**Required closure:**
- Permission catalogue;
- Role→Permission matrix;
- technical enforcement mechanism;
- MFA mechanism for Owner/Admin;
- exact authorization contracts.

**Plan state:** SPECIFICATION BLOCKED.

---

### WS-03 — Customer / Catalog / BusinessProduct

**Target:** preserve global Product identity while Business-specific commercial configuration is represented by BusinessProduct; preserve Customer Business scope.

**Canonical rules:**
- Product identity global.
- BusinessProduct provides Business commercial context.
- Customer is Business-scoped.
- Customer may exist without User.
- controlled Customer↔User association.

**Required closure:**
- exact physical field allocation;
- matching/merge/unlink mechanics;
- catalog-specific open rules where applicable.

**Plan state:** PARTIAL — AS-IS evidence/specification work may proceed.

---

### WS-04 — Cart / Order / Sale

**Target:** preserve explicit boundaries between Cart, Order and Sale.

**Canonical rules:**
- anonymous Cart permitted;
- Customer required before Order;
- Order ≠ Sale;
- commercial confirmation requires Business authorization via ORDER_CONFIRM;
- Sale is created at commercial confirmation;
- confirmed Sale is immutable;
- corrections use explicit cancellation/reversal/refund operations.

**Required closure:**
- exact state machines;
- cancellation/reversal/refund effect matrix;
- Payment/AR effects where affected;
- exact transaction boundaries.

**Plan state:** SPECIFICATION BLOCKED FOR CROSS-DOMAIN IMPLEMENTATION.

---

### WS-05 — Inventory

**Target:** Business-owned inventory with canonical stock integrity rules.

**Canonical rules:**
- Business-owned inventory;
- negative stock prohibited;
- confirmed Order reserves stock;
- physical decrement represented by actual stock-out movement;
- FEFO with expiry;
- FIFO without expiry;
- generic Location with MAIN minimum;
- multiple Locations allowed.

**Required closure:**
- reservation transaction boundaries;
- concurrency/locking semantics;
- physical Location model;
- lot/batch representation.

**Plan state:** DOMAIN RULES CLOSED; TECHNICAL IMPLEMENTATION BLOCKED BY ARCHITECTURE/OPEN DETAILS.

---

### WS-06 — Cash / AR / Payments

**Target:** maintain explicit domain boundaries without inventing cross-domain economic effects.

**Canonical rules:**
- Cash is Business-scoped;
- Cash follows conceptual Apertura→Operaciones/Movimientos→Arqueo→Cierre;
- closed Cash cannot be directly modified;
- sensitive Cash operations require specific Permissions;
- AR is Business/Customer scoped;
- Payment remains separate from Sale.

**Required closure:**
- Payment lifecycle/reconciliation;
- Payment↔Cash effects;
- AR allocation/credit rules;
- Cash detailed states/adjustments;
- cancellation/reversal/refund economic effects.

**Plan state:** CROSS-DOMAIN IMPLEMENTATION BLOCKED.

---

### WS-07 — Messaging

**Target:** first-class Wapsell-owned conversational commerce domain.

**Canonical rules:**
- Conversation belongs exactly to one Business;
- Customer may participate without User;
- Messaging cannot bypass underlying domain authorization;
- MVP Messaging does not depend on WhatsApp;
- AI is inactive in MVP.

**Required closure:**
- Conversation/Message physical model;
- participant identity/lifecycle;
- realtime;
- notifications;
- retention;
- attachments;
- assignment/human attention;
- exact Messaging API/events;
- integration boundaries with Order/Sale/Fulfillment.

**Plan state:** SPECIFICATION-FIRST.

---

### WS-08 — Fulfillment

**Target:** Fulfillment remains within Orders.

**Canonical rules:**
- Fulfillment belongs to Orders;
- Repartidor is not an MVP Membership Role.

**Required closure:**
- delivery states;
- tracking;
- zones/tariffs;
- evidence;
- timeout/escalation;
- future actor model.

**Plan state:** SPECIFICATION BLOCKED.

---

### WS-09 — Returns / Refunds

**Target:** explicit post-sale operations without mutating historical Sale.

**Canonical direction:** part of Commerce TO-BE.

**Required closure:**
- Return state machine;
- Refund state machine;
- maximum refundable semantics;
- Inventory/Cash/Payment/AR effects.

**Plan state:** SPECIFICATION BLOCKED.

---

### WS-10 — Purchases / AP

**Target:** future Commerce capability.

Purchases/AP are outside the initial MVP.

**Plan state:** OUTSIDE INITIAL MVP / NO IMPLEMENTATION TASK.

---

### WS-11 — Brand / Experience

**Target:** Business Brand is customer-facing identity over Wapsell platform capabilities.

**Required closure:**
- canonical Brand/System Design contract;
- configuration boundaries;
- customer-facing identity rules;
- role/business contextual navigation.

**Plan state:** SPECIFICATION-FIRST.

---

### WS-12 — Audit / Notifications / Cross-cutting

**Target:** evidence and side effects around approved domain operations.

**Required closure where applicable:**
- audit contract;
- notification semantics;
- provider/retry/deduplication;
- event strategy.

**Plan state:** CROSS-CUTTING / DEPENDENT ON ARCHITECTURE AND DOMAIN CLOSURE.

---

## 6. Recommended transformation sequence

This is sequencing, not implementation authorization.

### P0 — Canonical readiness
Maintain reconciled Decisions → Contracts → Invariants → Tests/Evals.

### P1 — Architecture closure
Define and obtain approval for the technical architecture needed by the first structural implementation slice.

### P2 — Identity/Tenancy specification and controlled foundation
Close task-local technical semantics, inspect AS-IS, then transform User/Business/Membership incrementally.

### P3 — Authorization
Close exact authorization contracts, then implement Membership-contextual authorization.

### P4 — Customer / Catalog / Cart
Transform lower-dependency commerce foundations.

### P5 — Inventory
Implement canonical stock rules after reservation/location/transaction semantics are sufficiently closed.

### P6 — Order / Sale
Implement commercial confirmation and Sale boundary after state/effect semantics are closed.

### P7 — Cash / Payment / AR
Implement each domain separately and integrate only where cross-domain effects are specified.

### P8 — Fulfillment
Implement Orders-owned fulfillment after its behavioral specification is closed.

### P9 — Returns / Refunds
Implement post-sale operations after effect matrices are approved.

### P10 — Messaging
Implement physical Messaging and connect approved Commerce use cases without bypassing domain authorization.

### P11 — Brand / Experience / Notifications / Audit
Complete customer-facing experience and cross-cutting capabilities according to approved contracts.

### P12 — Migration cutover / legacy retirement
Only after validation evidence and explicit authorization.

---

## 7. Migration strategy

The transformation remains:

**incremental + coexistence temporal + bounded + reversible where practical.**

For every migration task:

1. identify AS-IS evidence;
2. define applicable TO-BE rule;
3. define compatibility/coexistence behavior;
4. define data transformation;
5. define validation;
6. define containment/rollback;
7. record evidence;
8. define cutoff criteria.

No big-bang migration is implied.

---

## 8. Task dependency model

The expected dependency direction is:

`Identity/Tenancy → Authorization → Business-scoped domains`

Then:

`Product/Customer → Cart → Order → Sale`

With Inventory, Payment and AR integrated only where their contracts are closed.

Messaging depends on authorization and the relevant Commerce use cases, but does not own their business semantics.

Fulfillment remains under Orders.

Returns/Refunds depend on Sale and their approved effect matrices.

Notifications/Audit depend on approved domain events/contracts and architecture.

---

## 9. Task classes

Future tasks must be classified explicitly:

1. **SPEC-CLOSURE** — resolve/document an OPEN detail without silently deciding it.
2. **ASIS-EVIDENCE** — inspect existing implementation.
3. **ARCHITECTURE** — define/approve structural architecture.
4. **TEST-DERIVATION** — refine verification criteria.
5. **TRANSFORMATION** — modify existing behavior/data after readiness.
6. **IMPLEMENTATION** — create approved new behavior.
7. **VALIDATION** — execute tests/evidence procedures.
8. **REVIEW/DELIVERY** — review and deliver a validated increment.

A task classified as IMPLEMENTATION or TRANSFORMATION is not automatically authorized by appearing in this plan.

---

## 10. Definition of Ready

A task is not implementation-ready when any of the following applies:

- required Owner ruling is OPEN;
- applicable Contract is not sufficiently defined;
- invariant boundary is unresolved;
- Test/Eval criterion is absent where required;
- affected AS-IS behavior has not been inspected;
- architecture dependency is unresolved;
- migration/coexistence impact is unknown;
- the task would require inventing an identifier, schema, API, event or permission.

---

## 11. Definition of Done

A transformation increment is complete only when:

1. approved scope is implemented;
2. applicable tests exist;
3. applicable tests are executed;
4. evidence is recorded;
5. AS-IS regression is evaluated;
6. Business isolation is validated where applicable;
7. authorization is validated where applicable;
8. auditability is validated where applicable;
9. documentation is reconciled;
10. no unapproved scope was introduced.

This is a process criterion, not a claim of current compliance.

---

## 12. Traceability requirement for future tasks

Each task must expose:

| Field | Required |
|---|---|
| Task class | Yes |
| Scope / non-scope | Yes |
| Requirement | Yes where applicable |
| Decision | Yes where applicable |
| Specialized Spec | Yes where applicable |
| Contract | Yes where applicable |
| Invariant | Yes where applicable |
| Test/Eval | Yes where applicable |
| AS-IS evidence | Yes for transformation |
| Dependencies | Yes |
| Blockers | Yes |
| Expected evidence | Yes |
| Rollback/containment | Where relevant |
| Validation result | Required at completion |

---

## 13. Current blockers

These are planning blockers, not unresolved by inference:

1. exact authorization catalogue/matrix/enforcement;
2. MFA mechanism;
3. Business Switch mechanism;
4. authentication/session technical contract;
5. physical Business/User/Membership model;
6. tenant isolation mechanism;
7. exact Order/Sale state machines;
8. cancellation/reversal/refund effect matrix;
9. Payment lifecycle/reconciliation;
10. Payment↔Cash effects;
11. AR allocation/credit formula;
12. Cash detailed state machine/adjustments;
13. inventory reservation transaction boundaries;
14. physical Location model;
15. Messaging physical/realtime/retention model;
16. detailed Fulfillment lifecycle;
17. Return/Refund state machines;
18. AI execution model;
19. external channel implementation;
20. exact Customer↔User merge/unlink mechanics;
21. API/event contracts not yet approved;
22. Architecture approval.

No blocker is closed by this plan.

---

## 14. Preservation controls

For every transformation affecting existing functionality, the task must explicitly classify the behavior as:

- **PRESERVED**
- **ADAPTED**
- **DEPRECATED**
- **REPLACED — EXPLICITLY APPROVED**

Architectural transformation alone does not authorize deletion or replacement.

---

## 15. Evidence status

| Artifact | State |
|---|---|
| AS-IS | DOCUMENTED / VERIFIED WHERE SPECIFIED |
| Requirements | RECONCILED |
| Decisions | OWNER-RULED + CANONICAL RECONCILIATION |
| Contracts | DRAFT / RECONCILED |
| Invariants | v0.2 DRAFT / RECONCILED |
| Tests/Evals | v0.2 DRAFT / REVIEWED / NOT EXECUTED |
| Architecture | DIRECTIONAL / NOT APPROVED FOR STRUCTURAL IMPLEMENTATION |
| Plan | THIS DOCUMENT / DRAFT |
| Tasks | NOT CREATED BY THIS PLAN |
| Implementation | NOT AUTHORIZED BY THIS PLAN |
| Deployment | NOT EXECUTED |

---

## 16. Plan gate

### PASS

The project has a controlled transformation sequence suitable for deriving task-local work.

### NOT PASSED

General implementation readiness is not established.

The plan therefore authorizes no code, schema, migration, deployment or destructive change.

---

## 17. Next controlled step

The next layer is **TASKS**.

However, Tasks must first be derived and classified against this plan. The first task set should prioritize:

1. task-local specification closure where necessary;
2. architecture closure;
3. AS-IS evidence for the first implementation slice;
4. only then implementation/transformation tasks whose local gates are satisfied.

**R7 TRANSFORMATION PLAN v0.2: COMPLETE — DRAFT / NOT APPROVED.**

## R8-B2 OWNER CLOSURE PROPAGATION — 2026-10-04

The B2 Owner Decision Closure reduces the following blockers at the normative level:

- ACTIVE Membership uniqueness is closed.
- Exactly one effective Membership Role is closed for MVP.
- Permission domains are closed conceptually; atomic catalogue/matrix/persistence remain technical blockers.
- Legacy coexistence is bounded and temporary; cutover remains a separate task.
- Legacy authorization mapping is mandatory before affected legacy retirement.
- Protected Business-scoped operations use current server-side authorization state and fail closed when authorization is absent/invalid.
- Public/pre-context paths remain separately classified.
- Customer response security is a cross-cutting requirement.
- Critical-operation additional authorization remains conceptually required but needs dedicated downstream contract closure.

Remaining technical blockers are still valid and include exact atomic authorization mapping, enforcement, session/revocation mechanics, Business Switch, physical identity/tenant model, and the dedicated critical-operation authorization contract.

**Reference:** `03-DECISIONS/47-B2-OWNER-DECISION-CLOSURE-2026-10-04.md`.

**Implementation:** NOT AUTHORIZED.
