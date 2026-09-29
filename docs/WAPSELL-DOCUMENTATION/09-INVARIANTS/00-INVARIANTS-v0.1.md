# Wapsell — Invariants v0.1

**Status:** DRAFT — NOT APPROVED  
**Date:** 2026-09-29  
**Layer:** Invariants  
**Authority:** Decision Register + reconciled Contracts  
**Purpose:** derive only those invariants whose normative meaning is sufficiently bounded by the current documentation.

> This document does not create decisions. It does not define schema, APIs, event names, identifiers, migrations, implementation mechanisms, permissions catalogues, or tests.

---

## 1. Derivation rule

An invariant is a condition that must remain true regardless of implementation.

Only statements that are sufficiently unambiguous in the current Decision Register and reconciled Contracts are included.

A contract that merely identifies an open detail is **not** converted into an invariant.

Implementation evidence does not establish an invariant by itself.

---

## 2. Invariants eligible for formalization

### INV-IDENT-001 — User is global

**Source:** D-002 / C-IDENT-001.

A Wapsell User is a global platform identity and is not intrinsically owned by a single Business.

**Implication:** Business membership must not redefine the global identity itself.

**Open:** physical identity, identifier, lifecycle and persistence.

---

### INV-TEN-001 — Business is the tenancy boundary

**Source:** D-001 / C-TEN-001.

Business is the canonical multi-tenant isolation boundary.

Business-scoped commercial resources must remain associated with their Business context.

**Open:** physical isolation mechanism and context propagation mechanism.

---

### INV-MEM-001 — Membership contextualizes User ↔ Business

**Source:** D-002 / C-MEM-001.

Access of a User to a Business is contextualized through Membership.

A User may have Memberships in multiple Business instances.

**Open:** lifecycle, activation/revocation, role storage and permission storage.

---

### INV-CUST-001 — Customer is distinct from User

**Source:** D-002-bis / C-CUST-001 / C-CUST-002.

Customer and User are distinct concepts.

A Customer may exist without a User and may optionally be linked to a User.

**Open:** linking mechanics, deduplication and lifecycle.

---

### INV-CUST-002 — Customer is Business-scoped

**Source:** D-002-bis / C-CUST-001.

A Customer belongs to the commercial context of one Business.

Customer commercial information must not silently cross Business boundaries.

**Open:** physical enforcement.

---

### INV-INV-001 — Inventory belongs exclusively to Business

**Source:** D-014 / C-INV-001.

Inventory belongs exclusively to the corresponding Business.

There is no global shared stock between Business instances.

---

### INV-INV-002 — Cross-Business stock transfer is currently prohibited

**Source:** D-014 Owner ruling 2026-09-28 / C-INV-002.

Stock must not be transferred between Business instances under the current specification.

A future exception requires an explicit later specification and authorization.

This invariant does not define how such a future specification would operate.

---

### INV-INV-003 — Inventory operations remain Business-scoped

**Source:** D-014 / C-INV-003.

An Inventory operation must execute against the Business to which the affected inventory belongs.

An operation must not silently operate on inventory belonging to another Business.

**Open:** technical context propagation and enforcement mechanism.

---

### INV-INV-004 — Stock movement is atomic

**Source:** D-010 Owner ruling / C-INV-004.

A stock movement must not be partially applied.

The resulting inventory state and the recorded movement must remain consistent.

**Open:** transaction, locking and database mechanisms.

---

### INV-INV-005 — Invalid stock quantities are rejected

**Source:** D-010 Owner ruling / C-INV-005.

Operations producing invalid stock quantities must be rejected.

The current ruling explicitly rejects any Business-specific exception.

**Open:** exact definition of invalid quantity.

---

### INV-SALE-001 — Confirmed Sale is not deleted

**Source:** D-008 / C-SALE-001.

A confirmed Sale must not be deleted as a means of reversing its commercial effects.

Cancellation is an explicit operation.

**Open:** cancellation authorization and exact reversal effects.

---

### INV-SALE-002 — Applicable Sale effects are not partially applied

**Source:** D-008 / C-SALE-001.

For any Sale operation to which an effect applies according to the approved domain specifications, the applicable effects must not be left partially applied.

**Important:** this invariant preserves the consistency requirement without defining which domains are affected by every Sale or cancellation.

---

### INV-CASH-001 — Closed Cash is not directly modified

**Source:** D-013 / C-CASH-003.

A closed Cash cannot be directly modified.

Corrections require a compensating operation or authorized adjustment as defined by the later Cash specification.

**Open:** exact adjustment workflow and authorization.

---

### INV-FUL-001 — Fulfillment belongs to Orders

**Source:** D-016 / C-FUL-001.

Fulfillment is part of the Orders domain.

**Open:** physical model, states, tracking, zones, tariffs and evidence.

---

## 3. Invariants deliberately NOT formalized yet

### D-006 — Exact authorization algorithm

The current documentation establishes contextual authorization but does not freeze the exact enforcement sequence.

**Status:** BLOCKED.

### D-008 — Exact cancellation/reversal matrix

The existence of explicit cancellation is formalizable; the exact effects across Inventory, Cash, Payments and AR are not.

**Status:** BLOCKED.

### D-011 — Payment reconciliation lifecycle

Provider abstraction and payment traceability are documented. Exact reconciliation semantics remain open.

**Status:** BLOCKED.

### D-013 — Sensitive Cash permission matrix

Cash ownership/lifecycle is documented, but the exact sensitive-operation permission rule remains pending.

**Status:** BLOCKED.

### D-015 — Accounts Payable lifecycle

The Business/Supplier/AP boundary is documented, but exact lifecycle and application semantics remain open.

**Status:** BLOCKED.

### D-016 — Detailed fulfillment lifecycle

The domain boundary is formalizable. Exact delivery states, tracking, zones, tariffs and evidence remain open.

**Status:** PARTIAL — only domain ownership invariant formalized.

### D-003 — WhatsApp clause

The canonical Decision Register currently records the specific WhatsApp non-dependency clause as pending Owner ruling.

**Status:** BLOCKED.

### Messaging physical model

Conversation, Message, Participant, realtime, notifications, attachments and retention are not sufficiently specified.

**Status:** BLOCKED.

### AI execution

AI is directionally part of the product and inactive during MVP, but functional scope, permissions and execution model remain open.

**Status:** BLOCKED.

---

## 4. Candidate-to-test boundary

These invariants are documentation-level candidates only.

No test is implied to exist.

The next layer must map each approved invariant to one or more verification mechanisms, distinguishing:

- unit/domain tests;
- integration tests;
- database/invariant tests;
- concurrency tests;
- E2E tests;
- static/documentation validation.

A test must not be written as evidence that an invariant has already been approved.

---

## 5. Traceability

| Invariant | Contract | Decision | Test |
|---|---|---|---|
| INV-IDENT-001 | C-IDENT-001 | D-002 | NOT CREATED |
| INV-TEN-001 | C-TEN-001 | D-001 | NOT CREATED |
| INV-MEM-001 | C-MEM-001 | D-002 | NOT CREATED |
| INV-CUST-001 | C-CUST-001 / C-CUST-002 | D-002-bis | NOT CREATED |
| INV-CUST-002 | C-CUST-001 / C-CUST-002 | D-002-bis | NOT CREATED |
| INV-INV-001 | C-INV-001 | D-014 | NOT CREATED |
| INV-INV-002 | C-INV-002 | D-014 | NOT CREATED |
| INV-INV-003 | C-INV-003 | D-014 | NOT CREATED |
| INV-INV-004 | C-INV-004 | D-010 | NOT CREATED |
| INV-INV-005 | C-INV-005 | D-010 | NOT CREATED |
| INV-SALE-001 | C-SALE-001 | D-008 | NOT CREATED |
| INV-SALE-002 | C-SALE-001 | D-008 | NOT CREATED |
| INV-CASH-001 | C-CASH-003 | D-013 | NOT CREATED |
| INV-FUL-001 | C-FUL-001 | D-016 | NOT CREATED |

---

## 6. Evidence status

All invariants in this document are:

**DOCUMENTED — DERIVED FROM DECISIONS + CONTRACTS**

They are not:

- VERIFIED BY TEST;
- VERIFIED BY EXECUTION;
- VERIFIED BY CODE.

The existing AS-IS code evidence for D-014 and the D-010 implementation gap remains evidence about the current implementation, not proof that the TO-BE invariants are satisfied.

---

## 7. Advancement gate

The Invariants layer must not advance to Tests/Evals until:

- [ ] each invariant has a stable authoritative source;
- [ ] no invariant depends on a pending Owner ruling;
- [ ] no implementation detail has been embedded as normative behavior;
- [ ] cross-domain invariants are explicitly scoped;
- [ ] D-010 implementation gaps are represented as validation targets, not as compliance;
- [ ] test strategy is defined without inventing implementation;
- [ ] traceability from Decision → Contract → Invariant is complete.

**Current status: DRAFT — AUDITED / REFINED; NOT APPROVED.**

---

## 8. Audit reconciliation note

The Invariants audit identified two documentation-level refinements:
- INV-SALE-002 was narrowed to the non-partial consistency property without defining the open Sale effect matrix.
- INV-FUL-001 was narrowed to domain ownership; the navigation statement was removed from the invariant layer.

These refinements do not create decisions or implementation commitments.

---

## 9. Non-actions

This document does not:

- modify the Decision Register;
- resolve pending decisions;
- define database schema;
- define API contracts;
- define event contracts;
- define permission identifiers;
- modify application code;
- create tests;
- claim implementation compliance.

