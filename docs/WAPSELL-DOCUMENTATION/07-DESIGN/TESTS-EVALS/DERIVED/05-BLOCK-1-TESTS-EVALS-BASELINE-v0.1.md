# WAPSELL — BLOCK 1 TESTS / EVALS BASELINE v0.1

**Status:** DRAFT — BLOCK 1 TESTS / EVALS / NOT APPROVED  
**Date:** 2026-10-04  
**Scope:** Wapsell MVP — Block 1  
**Invariants source:** `05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md`  
**Technical Specification:** NOT APPROVED  
**Implementation:** NOT AUTHORIZED

---

## 1. Purpose

This document defines verification criteria derived from the Block 1 invariant layer.

It distinguishes specification of a verification criterion from implementation, execution and evidence.

It does not:

- create business decisions;
- define API paths;
- select a test framework;
- define database constraints;
- define JWT/session mechanics;
- define locking or transaction mechanisms;
- claim current implementation compliance.

Verification chain:

```
Requirement
   ↓
Contract
   ↓
Invariant
   ↓
Test / Eval
   ↓
Implementation
   ↓
Evidence
```

---

# 2. Evidence States

- **SPECIFIED** — criterion defined.
- **IMPLEMENTED** — automated/manual test exists.
- **EXECUTED** — criterion has been executed.
- **PASSED** — execution produced acceptable evidence.
- **FAILED** — execution produced evidence of non-compliance.
- **BLOCKED** — governing semantics or implementation surface remains OPEN.
- **NOT EXECUTED** — specified but no execution evidence exists.

All criteria in this artifact start as **SPECIFIED** unless explicitly stated otherwise.

Current implementation status is not inferred from these criteria.

---

# 3. Identity / Tenancy

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-ID-001 | INV-IDENT-001 | The same User identity can participate in multiple Business contexts without becoming separate User identities. | Functional | SPECIFIED |
| TE-ID-002 | INV-MEM-001 | Membership for Business A does not authorize operation in Business B. | Isolation | SPECIFIED |
| TE-ID-003 | INV-MEM-002 | INACTIVE Membership cannot authorize a protected Business-scoped operation. | Authorization | SPECIFIED |
| TE-ID-004 | INV-CONTEXT-001 | Missing Business Context fails closed for protected Business-scoped operations. | Security | SPECIFIED |
| TE-ID-005 | INV-CONTEXT-001 | Invalid Business Context fails closed. | Security | SPECIFIED |
| TE-ID-006 | INV-CONTEXT-001 | A client-supplied Business identifier cannot override the established Business Context. | Security | SPECIFIED |
| TE-ID-007 | INV-IDENT-002 | Two distinct Users cannot represent the same normalized email identity. | Integrity | SPECIFIED |
| TE-ID-008 | INV-TEN-001 | Business A resources cannot be read through Business B context. | Isolation | SPECIFIED |
| TE-ID-009 | INV-TEN-001 | Business A resources cannot be updated or deleted through Business B context. | Isolation | SPECIFIED |
| TE-ID-010 | INV-TEN-001 | Unique lookups cannot expose a resource belonging to another Business. | Isolation | SPECIFIED |
| TE-ID-011 | INV-TEN-001 | Nested/related persistence cannot escape Business ownership. | Isolation | SPECIFIED |

Open: physical identity model, normalization algorithm, physical tenant isolation and exact context transport.

---

# 4. Authorization

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-AUTH-001 | INV-AUTH-001 | Authentication without valid Membership for the target Business is insufficient for a Business-scoped operation. | Security | SPECIFIED |
| TE-AUTH-002 | INV-AUTH-001 | Valid Membership without applicable Role/Permission authorization is insufficient for a protected operation. | Security | SPECIFIED |
| TE-AUTH-003 | INV-AUTH-002 | Authorization remains conceptually constrained to Membership→Role→Permission. | Architecture | SPECIFIED |
| TE-AUTH-004 | INV-AUTH-003 | UI visibility does not determine authorization of the underlying operation. | Security | SPECIFIED |
| TE-AUTH-005 | INV-AUTH-004 | An action initiated through Messaging cannot bypass the underlying domain authorization. | Security/Integration | SPECIFIED |
| TE-AUTH-006 | INV-AUTH-002 | MVP Membership Role catalogue does not treat Customer, Supplier or Repartidor as MVP Membership Roles. | Scope | SPECIFIED |

Exact Permission catalogue, Role→Permission matrix and technical enforcement remain OPEN.

---

# 5. Customer

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-CUST-001 | INV-CUST-001 | Customer can exist without a User association. | Domain | SPECIFIED |
| TE-CUST-002 | INV-CUST-002 | Customer data from Business A cannot appear through Business B context. | Isolation | SPECIFIED |
| TE-CUST-003 | INV-CUST-003 | Equal email alone does not automatically establish Customer↔User association. | Domain/Security | SPECIFIED |
| TE-CUST-004 | INV-CUST-003 | A proposed Customer↔User match requires controlled confirmation before association. | Domain | SPECIFIED |

Exact matching, merge and unlink mechanics remain OPEN.

---

# 6. Catalog / Cart / Order / Sale

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-COM-001 | INV-COM-001 | Business-specific commercial configuration is not treated as global Product identity. | Domain | SPECIFIED |
| TE-COM-002 | INV-CART-001 | Cart can exist without Customer. | Domain | SPECIFIED |
| TE-COM-003 | INV-CART-001 | Order creation is blocked when required Customer context is absent. | Domain | SPECIFIED |
| TE-COM-004 | INV-CART-002 | Cart cannot mix Products/BusinessProducts across Businesses. | Isolation | SPECIFIED |
| TE-ORD-001 | INV-ORD-001 | Order existence does not by itself create a Sale. | Domain | SPECIFIED |
| TE-ORD-002 | INV-ORD-002 | Commercial Order confirmation requires `ORDER_CONFIRM` authorization. | Authorization | SPECIFIED |
| TE-ORD-003 | INV-ORD-002 | Customer intent/confirmation alone cannot authorize commercial Order confirmation. | Security | SPECIFIED |
| TE-ORD-004 | INV-SALE-001 | Sale is created at commercial confirmation, not at delivery. | Domain | SPECIFIED |
| TE-ORD-005 | INV-SALE-001 | Payment completion does not determine Sale creation. | Domain | SPECIFIED |
| TE-ORD-006 | INV-SALE-002 | Confirmed Sale cannot be silently edited or deleted as though it never existed. | Integrity | SPECIFIED |
| TE-ORD-007 | INV-SALE-002 | Sale correction preserves traceability through an explicit compensating operation. | Integrity | SPECIFIED |
| TE-ORD-008 | INV-SALE-003 | Required effects of an approved Sale operation are not left partially applied. | Integrity | SPECIFIED |

Exact state machines and correction effect matrices remain OPEN.

---

# 7. Inventory

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-INV-001 | INV-INV-001 | Business A inventory cannot be operated on through Business B context. | Isolation | SPECIFIED |
| TE-INV-002 | INV-INV-002 | Inventory operations preserve effective Business ownership. | Isolation | SPECIFIED |
| TE-INV-003 | INV-INV-003 | A valid inventory operation cannot produce negative stock. | Integrity | SPECIFIED |
| TE-INV-004 | INV-INV-004 | Order confirmation establishes the required reservation. | Domain | SPECIFIED |
| TE-INV-005 | INV-INV-004 | Reservation cannot exceed available stock. | Integrity | SPECIFIED |
| TE-INV-006 | INV-INV-004 | Concurrent confirmations cannot oversubscribe available stock. | Concurrency | SPECIFIED |
| TE-INV-007 | INV-INV-004 | Failed reservation leaves no partial reservation effect. | Integrity | SPECIFIED |
| TE-INV-008 | INV-INV-005 | Reservation does not reduce physical on-hand stock merely by being created. | Domain | SPECIFIED |
| TE-INV-009 | INV-INV-005 | Physical stock exit is represented by a stock-out movement corresponding to actual physical exit. | Domain/Audit | SPECIFIED |
| TE-INV-010 | INV-INV-005 | Cancellation before physical exit releases applicable reservation without inventing a physical stock-out. | Domain | SPECIFIED |
| TE-INV-011 | INV-INV-006 | Stock with expiry follows FEFO selection. | Domain | SPECIFIED |
| TE-INV-012 | INV-INV-006 | Stock without expiry follows FIFO selection. | Domain | SPECIFIED |
| TE-INV-013 | INV-LOC-001 | Business has at least one conceptual MAIN Location. | Domain | SPECIFIED |
| TE-INV-014 | INV-LOC-001 | Location belonging to Business A cannot be operated through Business B context. | Isolation | SPECIFIED |

Exact locking, transaction boundary, lot model and physical Location model remain OPEN.

---

# 8. Payment / Cash / AR

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-PAY-001 | INV-PAY-001 | Payment lifecycle remains independent from Sale lifecycle. | Domain | SPECIFIED |
| TE-PAY-002 | INV-PAY-002 | Multiple partial Payments can cumulatively settle a Sale. | Domain | SPECIFIED |
| TE-PAY-003 | INV-PAY-002 | Payment exceeding applicable outstanding amount is rejected by default. | Integrity | SPECIFIED |
| TE-PAY-004 | INV-PAY-003 | Original Payment is preserved when reversal/refund occurs. | Audit/Integrity | SPECIFIED |
| TE-PAY-005 | INV-PAY-003 | Payment reconciliation does not implicitly reconcile Cash or AR. | Domain | SPECIFIED |
| TE-PAY-006 | INV-PAY-004 | Approved Payment Cash effects remain within Cash authorization and Business context. | Integration | SPECIFIED |
| TE-AR-001 | INV-AR-001 | Receivable remains associated with its Business and Customer context. | Isolation | SPECIFIED |
| TE-AR-002 | INV-AR-002 | Payment and AR application remain distinguishable. | Domain | SPECIFIED |
| TE-AR-003 | INV-AR-002 | Payment can exist without AR obligation. | Domain | SPECIFIED |
| TE-CASH-001 | INV-CASH-001 | Cash from Business A cannot be mixed with Business B. | Isolation | SPECIFIED |
| TE-CASH-002 | INV-CASH-002 | Cash follows the conceptual Apertura→Operaciones/Movimientos→Arqueo→Cierre lifecycle. | Domain | SPECIFIED |
| TE-CASH-003 | INV-CASH-003 | Closed Cash cannot be directly modified. | Integrity | SPECIFIED |
| TE-CASH-004 | INV-CASH-002 | Cash correction uses an explicit compensating/adjustment operation rather than direct mutation. | Integrity | BLOCKED |
| TE-CASH-005 | INV-CASH-002 | Sensitive Cash operation requires applicable specific Permission. | Security | SPECIFIED |

Cash adjustment semantics, detailed lifecycle and Payment↔Cash timing remain OPEN.

---

# 9. Messaging

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-MSG-001 | INV-MSG-001 | Conversation belongs to exactly one Business. | Isolation | SPECIFIED |
| TE-MSG-002 | INV-MSG-001 | Conversation from Business A cannot be read or modified in Business B context. | Isolation | SPECIFIED |
| TE-MSG-003 | INV-MSG-002 | Customer can participate without a User identity. | Domain | SPECIFIED |
| TE-MSG-004 | INV-MSG-003 | Messaging action is rejected when underlying domain authorization is absent. | Security/Integration | SPECIFIED |
| TE-MSG-005 | INV-MSG-004 | MVP Messaging does not require WhatsApp to perform its core function. | Architecture | SPECIFIED |
| TE-MSG-006 | INV-MSG-005 | MVP does not execute autonomous AI assistant behavior. | Scope/Security | SPECIFIED |

Physical Conversation/Message model, realtime, retention, notifications and external channels remain OPEN.

---

# 10. Fulfillment

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-FUL-001 | INV-FUL-001 | Fulfillment remains within the Orders domain boundary. | Domain | SPECIFIED |
| TE-FUL-002 | INV-FUL-001 | Fulfillment completion does not create the Sale. | Domain | SPECIFIED |
| TE-FUL-003 | INV-FUL-002 | Repartidor is not required as an MVP Membership Role. | Scope | SPECIFIED |

Detailed delivery state machine and future actor model remain OPEN.

---

# 11. Brand

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-BRAND-001 | INV-BRAND-001 | Brand is associated with the Business and cannot silently cross Business context. | Isolation | SPECIFIED |
| TE-BRAND-002 | INV-BRAND-001 | Customer-facing identity resolves to the Business Brand rather than replacing it with Wapsell identity. | Experience | SPECIFIED |

Physical Brand/theme/assets model remains OPEN.

---

# 12. Cross-Domain Negative Evaluation Families

The following evaluation families are mandatory candidates once the relevant implementation surfaces exist:

1. User with Membership only in Business A attempts Business B access.
2. INACTIVE Membership attempts protected operation.
3. Missing Business Context.
4. Invalid Business Context.
5. Client-supplied Business ID attempts context override.
6. JWT/authentication without target Membership.
7. Cross-Business create/read/update/delete.
8. Cross-Business unique lookup.
9. Nested persistence escaping Business ownership.
10. Customer↔User association triggered only by equal email.
11. Customer intent used as substitute for `ORDER_CONFIRM`.
12. Order confirmation without required Permission.
13. Confirmed Sale mutation/deletion.
14. Negative stock operation.
15. Reservation exceeding available stock.
16. Concurrent confirmations oversubscribing stock.
17. Failed reservation leaving partial state.
18. Closed Cash direct mutation.
19. Sensitive Cash operation without Permission.
20. Cross-Business Conversation access.
21. Messaging action bypassing underlying domain authorization.

These are evaluation families, not claims that automated tests already exist.

---

# 13. Blocked Criteria

The following remain blocked because their governing semantics are OPEN:

- exact JWT/session tests;
- exact MFA mechanism tests;
- exact Permission matrix tests;
- exact Order/Sale state-transition tests;
- cancellation/reversal/refund complete effect matrix;
- Payment provider/webhook/idempotency tests;
- detailed Payment↔Cash reconciliation;
- AR allocation/aging formulas;
- Cash detailed state machine;
- Cash adjustment mechanics;
- reservation locking implementation;
- physical Location schema;
- detailed Messaging realtime/retention/notification behavior;
- Return/Refund state machines;
- delivery timeout/escalation;
- AI execution;
- external channel implementation;
- Customer/User merge/unlink mechanics;
- exact API/event contract tests.

Blocked criteria must not be made executable by inventing missing semantics.

---

# 14. Historical Test Baseline

The existing R6/R7 Tests/Evals baseline remains historical and is not deleted.

Historical criteria involving superseded or OPEN concepts are not promoted automatically, including:

- Profile/Capability/Individual Override authorization;
- Repartidor-specific MVP workflow;
- Purchase/AP implementation tests outside initial MVP;
- detailed Promotion combination rules;
- provider-specific behavior not contractually closed;
- technical legacy-session transition semantics;
- detailed Return/Refund state machines.

---

# 15. Traceability

| Area | Invariants | Verification | Status |
|---|---|---|---|
| Identity/Tenancy | INV-IDENT / INV-TEN / INV-MEM / INV-CONTEXT | TE-ID | SPECIFIED |
| Authorization | INV-AUTH | TE-AUTH | SPECIFIED |
| Customer | INV-CUST | TE-CUST | SPECIFIED |
| Commerce | INV-COM / INV-CART / INV-ORD / INV-SALE | TE-COM / TE-ORD | SPECIFIED |
| Inventory | INV-INV / INV-LOC | TE-INV | SPECIFIED |
| Payment | INV-PAY | TE-PAY | SPECIFIED |
| Cash/AR | INV-CASH / INV-AR | TE-CASH / TE-AR | SPECIFIED / BLOCKED where semantics open |
| Messaging | INV-MSG | TE-MSG | SPECIFIED |
| Fulfillment | INV-FUL | TE-FUL | SPECIFIED |
| Brand | INV-BRAND | TE-BRAND | SPECIFIED |
| Cross-domain | INV-X | negative evaluation families | SPECIFIED |

---

# 16. Evidence Status

No criterion in this artifact is claimed as implemented or executed.

| Evidence | Current state |
|---|---|
| Verification criteria | SPECIFIED |
| Automated tests | NOT CREATED |
| Manual test execution | NOT EXECUTED |
| CI execution | NOT EXECUTED |
| E2E execution | NOT EXECUTED |
| Production validation | NOT EXECUTED |
| Compliance coverage | NOT DETERMINABLE |

---

# 17. Readiness Gate

Block 1 Tests/Evals are ready for the next planning layer when:

- each canonical invariant has a verification criterion or documented reason why it is blocked;
- negative tenant/authentication cases are represented;
- inventory reservation/concurrency criteria are represented;
- Order/Sale boundaries are represented;
- Payment/Cash/AR separation is represented;
- Messaging authorization boundaries are represented;
- historical tests are not silently promoted;
- no test assumes an unapproved technical mechanism;
- evidence states distinguish specification from execution.

### Current status

**TESTS / EVALS: DRAFT — REVIEW REQUIRED**

**TRANSFORMATION SPEC: NEXT LAYER**

**IMPLEMENTATION OF TESTS: NOT AUTHORIZED**

**APPLICATION IMPLEMENTATION: NOT AUTHORIZED**

---

# 18. Conclusion

Block 1 now has a verification surface derived from the current Invariants.

The critical verification chain is:

```
Business Isolation
      ↓
Authentication
      ↓
Membership
      ↓
Role / Permission
      ↓
Commerce
      ↓
ORDER_CONFIRM
   ├── Sale
   └── Reservation
         ↓
   Physical Exit
         ↓
      Payment
      ↙   ↘
   Cash    AR
```

Messaging is evaluated as an authorized entry point into the underlying domains, not as a bypass layer.

This document specifies what must eventually be verified. It does not claim that the current AS-IS system passes these criteria.

**Status: DRAFT — BLOCK 1 TESTS / EVALS**

**Technical Specification: NOT APPROVED**

**Implementation: NOT AUTHORIZED**
