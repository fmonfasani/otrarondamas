# WAPSELL — BLOCK 1 INVARIANTS BASELINE v0.1

**Status:** DRAFT — BLOCK 1 INVARIANTS / NOT APPROVED  
**Date:** 2026-10-04  
**Scope:** Wapsell MVP — Block 1  
**Contracts source:** `07-BLOCK-1-CONTRACTS-BASELINE-v0.1.md`  
**Architecture source:** `06-BLOCK-1-ARCHITECTURE-SPEC-v0.1.md`  
**Technical Specification:** NOT APPROVED  
**Implementation:** NOT AUTHORIZED

---

## 1. Purpose

This document derives Block 1 invariants from the approved Owner decisions, reconciled Contracts and Block 1 Architecture.

An invariant is a condition that must remain true independently of the implementation mechanism.

This document does not:

- create new business decisions;
- define physical schema;
- define APIs;
- define DTOs;
- define JWT claims;
- select locking or transaction mechanisms;
- define infrastructure;
- define migrations;
- authorize implementation.

Existing invariant baselines and audits remain historical sources for traceability.

---

# 2. Authority

Authority precedence:

```
OWNER RULING
    >
DECISION REGISTER
    >
CANONICAL SPEC
    >
TO-BE
    >
CONTRACTS
    >
AUDIT
    >
HISTORICAL
```

Primary sources:

- approved R8 Owner decisions;
- R4/R5 reconciliations;
- Block 1 Architecture;
- Block 1 Contracts.

Implementation evidence does not establish TO-BE invariant compliance.

---

# 3. Identity & Tenancy Invariants

## INV-IDENT-001 — User is global

A User is a global Wapsell identity.

A User may participate in multiple Business contexts without becoming a different User identity for each Business.

**Open:** physical identifier and persistence.

---

## INV-TEN-001 — Business is the tenancy boundary

Business is the canonical tenant and isolation boundary.

Every Business-scoped resource remains associated with exactly one applicable Business context.

A resource belonging to Business A must not be exposed or operated through Business B context.

**Open:** physical isolation mechanism.

---

## INV-MEM-001 — Membership contextualizes User access

Access from a User to a Business is contextualized through Membership.

A User may have multiple Memberships.

A Membership for Business A does not authorize access to Business B.

---

## INV-MEM-002 — Inactive Membership cannot operate

An INACTIVE Membership cannot authorize Business-scoped operations.

The invariant does not define the lifecycle workflow or technical enforcement.

---

## INV-CONTEXT-001 — Business-scoped operations use one effective Business context

A protected Business-scoped operation has one effective Business context.

The effective context must correspond to an ACTIVE Membership of the authenticated User.

A client-supplied Business identifier cannot override the server-established effective context.

Missing or invalid Business context fails closed.

---

## INV-IDENT-002 — Normalized User email is globally unique

A normalized email identifies at most one global User.

Two distinct Users cannot simultaneously represent the same normalized email identity.

**Open:** normalization algorithm and physical uniqueness mechanism.

---

# 4. Authorization Invariants

## INV-AUTH-001 — Authentication alone does not authorize

Successful authentication is insufficient to authorize a Business-scoped operation.

Conceptually, authorization requires:

```
Authenticated User
+
Target Business
+
ACTIVE Membership
+
Applicable Role / Permission
```

---

## INV-AUTH-002 — Authorization is Membership → Role → Permission

The canonical MVP authorization model is:

```
Membership → Role → Permission
```

No Profile, Capability or individual Override layer is part of the MVP authorization model.

MVP Membership Roles are:

- Owner;
- Admin;
- Vendedor;
- Gestor de Stock.

Customer and Supplier are not Membership Roles.

Repartidor is outside the MVP Membership Role catalogue.

**Open:** exact Permission catalogue and Role→Permission matrix.

---

## INV-AUTH-003 — UI visibility is not authorization

Showing or hiding an action in the UI does not constitute authorization.

The underlying Business operation must independently satisfy its applicable authorization requirements.

---

## INV-AUTH-004 — Messaging cannot bypass authorization

An operation initiated from Messaging remains subject to the authorization rules of the underlying domain/use case.

Messaging cannot grant additional authorization.

---

# 5. Customer Invariants

## INV-CUST-001 — Customer is distinct from User

Customer and User are distinct concepts.

A Customer may exist without a User.

A Customer may optionally be associated with a User.

---

## INV-CUST-002 — Customer is Business-scoped

A Customer belongs to one Business commercial context.

Customer commercial data must not cross Business boundaries.

---

## INV-CUST-003 — Customer/User association is controlled

Customer↔User association requires controlled confirmation.

System detection or proposal may assist the process.

Email equality alone must not automatically create the association.

**Open:** matching, merge, unlink and lifecycle mechanics.

---

# 6. Commerce Invariants

## INV-COM-001 — Product identity is global; BusinessProduct is Business-specific

Product represents global product identity.

Business-specific commercial configuration belongs to the BusinessProduct concept.

A Business must not silently consume another Business's commercial configuration.

---

## INV-CART-001 — Cart may exist without Customer

A Cart may exist without a Customer.

A Customer is required before an Order is created.

---

## INV-CART-002 — Cart remains within Business context

A Cart must not mix products or commercial configuration across Businesses.

---

## INV-ORD-001 — Order and Sale are distinct

Order and Sale are distinct concepts and lifecycles.

The existence of an Order does not by itself imply the existence of a Sale.

---

## INV-ORD-002 — Commercial confirmation requires Business authorization

Commercial Order confirmation is a Business-authorized action governed by `ORDER_CONFIRM`.

Customer intent or Customer confirmation alone does not constitute Business authorization.

---

## INV-SALE-001 — Sale is created at commercial confirmation

A Sale is created at the approved commercial confirmation boundary.

Delivery does not create the Sale.

Payment does not determine whether the Sale exists.

---

## INV-SALE-002 — Confirmed Sale is immutable

A confirmed Sale must not be silently edited or deleted as if the original operation never occurred.

Corrections use explicit cancellation, reversal or refund operations with traceability.

**Open:** exact correction/state matrix.

---

## INV-SALE-003 — Required Sale effects cannot remain partially applied

When an approved Sale operation requires effects in other domains, those required effects must not result in a partially applied business outcome.

This invariant does not define the complete effect matrix or technical transaction mechanism.

---

# 7. Inventory Invariants

## INV-INV-001 — Inventory is Business-owned

Inventory belongs to a Business.

There is no implicit global shared stock between Businesses.

---

## INV-INV-002 — Inventory operations remain Business-scoped

Inventory operations must operate only against inventory belonging to the effective Business context.

---

## INV-INV-003 — Negative stock is prohibited

A valid inventory operation must not produce a negative stock state where the canonical inventory rule applies.

---

## INV-INV-004 — Confirmed Order establishes reservation

Commercial confirmation of an Order establishes the corresponding stock reservation according to the approved inventory rules.

Reservation must not exceed available stock.

Conceptually:

```
available = onHand - reserved
```

Concurrent confirmations must not oversubscribe available stock.

A failed reservation must not leave a partial reservation.

**Open:** persistence, locking and transaction mechanism.

---

## INV-INV-005 — Reservation is distinct from physical stock exit

Reservation does not constitute physical stock exit.

Physical stock decrement is represented by a stock-out movement corresponding to actual physical stock exit.

Cancellation before physical exit releases the applicable reservation.

---

## INV-INV-006 — FEFO/FIFO rotation

For stock with expiry, selection follows FEFO.

For stock without expiry, selection follows FIFO.

**Open:** exact lot model and tie-breaking.

---

## INV-LOC-001 — Generic Business Location

Location is a generic Business-scoped concept.

Each Business has at least one conceptual MAIN Location.

Multiple Locations are permitted.

Branch, Warehouse and Deposito are not separate conceptual Location entity types in the MVP.

**Open:** physical model and lifecycle.

---

# 8. Payment / Cash / AR Invariants

## INV-PAY-001 — Payment is separate from Sale

Payment has a lifecycle independent from Sale.

Payment does not create the Sale and does not determine the Sale lifecycle.

---

## INV-PAY-002 — Partial and multiple Payments are valid

A Sale may have multiple Payments.

Partial payment is valid.

Overpayment is rejected by default.

---

## INV-PAY-003 — Payment correction preserves history

An original Payment is not silently erased.

Reversal/refund is explicit and traceable to the original Payment.

Payment reconciliation is distinct from Cash and AR reconciliation.

---

## INV-PAY-004 — Payment/Cash relationship preserves domain authority

An approved Payment may produce a Cash effect according to the payment method and its confirmation/evidence semantics.

Payment must not bypass Cash rules.

---

## INV-AR-001 — AR is Business-scoped

A receivable belongs to a Business and the corresponding Customer commercial relationship.

---

## INV-AR-002 — Payment and AR application are distinct

Payment may exist without an AR obligation.

Payment may be applied partially or completely to AR according to the applicable AR rules.

Partial Payment does not automatically create an AR obligation.

---

## INV-CASH-001 — Cash is Business-scoped

A Cash register and its movements belong to one Business.

Cash information must not cross Business boundaries.

---

## INV-CASH-002 — Sensitive Cash operations require specific Permissions

Sensitive Cash operations require explicit authorization through the applicable Permission model.

Authentication alone is insufficient.

**Open:** permission identifiers, thresholds and approval workflow.

---

## INV-CASH-003 — Closed Cash is not directly modified

A closed Cash cannot be directly modified.

Corrections require an explicit compensating or adjustment operation defined by the later Cash specification.

**Open:** exact adjustment mechanism.

---

# 9. Messaging Invariants

## INV-MSG-001 — Conversation belongs exactly to one Business

A commercial Conversation belongs to exactly one Business.

Messaging data and commercial actions are contextualized to that Business.

---

## INV-MSG-002 — Customer may participate without User

A Customer may participate in Messaging without a User identity.

Customer↔User association remains optional and controlled.

---

## INV-MSG-003 — Messaging does not redefine domain authority

Messaging does not own or redefine:

- Order lifecycle;
- Sale lifecycle;
- Payment lifecycle;
- Inventory integrity;
- Cash authorization;
- AR rules.

Messaging invokes or contextualizes underlying domain capabilities.

---

## INV-MSG-004 — MVP Messaging does not depend on WhatsApp

The Wapsell Messaging MVP does not depend on WhatsApp.

This does not prohibit future external channel integrations.

---

## INV-MSG-005 — AI is inactive in MVP

AI assistants remain inactive during MVP.

No autonomous AI execution is authorized by this invariant set.

---

# 10. Fulfillment Invariants

## INV-FUL-001 — Fulfillment belongs to Orders

Fulfillment belongs to the Orders domain.

Fulfillment does not constitute Sale creation.

Fulfillment does not become an independent top-level MVP domain solely because delivery capabilities exist.

---

## INV-FUL-002 — Repartidor is outside MVP Membership Roles

Repartidor is not an MVP Membership Role.

This does not prevent a future Fulfillment actor model.

---

# 11. Brand Invariants

## INV-BRAND-001 — Brand belongs to Business

Brand is associated with the Business.

The Business Brand is the primary customer-facing commercial identity.

Wapsell remains the underlying platform identity and must not replace the Business Brand as the customer-facing identity.

---

# 12. Cross-Domain Invariants

## INV-X-001 — Cross-domain operations preserve Business context

A Business-scoped operation crossing domain boundaries must preserve the same effective Business context.

A domain must not silently substitute another Business.

---

## INV-X-002 — Domain authority cannot be bypassed

A domain may invoke another domain's capability but cannot bypass the receiving domain's authoritative rules.

Examples:

- Messaging may initiate Commerce behavior but does not implement Commerce authorization;
- Order confirmation may establish Inventory reservation but does not represent physical stock exit;
- Payment may produce Cash effects but does not redefine Cash rules;
- Fulfillment updates Order fulfillment state but does not create Sale;
- Customer/User association does not collapse the two identities.

---

## INV-X-003 — Required multi-effect operations cannot expose partial business state

When a confirmed operation requires multiple approved domain effects, the resulting business state must not expose an incomplete combination of those required effects.

Example:

```
ORDER_CONFIRM
   ├── Sale
   └── Stock Reservation
```

The exact transaction and concurrency mechanism remains OPEN.

---

# 13. Explicitly Open — Not Closed Invariants

The following remain outside the closed invariant set:

1. exact authorization algorithm;
2. Permission catalogue and Role→Permission matrix;
3. MFA mechanism;
4. Business Switch mechanism;
5. JWT claims and session representation;
6. physical tenant isolation mechanism;
7. exact Order/Sale state machines;
8. cancellation/reversal/refund effect matrix;
9. Payment state machine;
10. provider/webhook/idempotency mechanics;
11. Payment↔Cash exact timing and reconciliation;
12. AR allocation and aging rules;
13. Cash state machine and adjustment mechanics;
14. reservation persistence, locking and transaction boundaries;
15. physical Location model;
16. lot/batch persistence;
17. Messaging physical model, realtime, retention, attachments and notifications;
18. Fulfillment state machine and delivery mechanics;
19. Return/refund detailed workflows;
20. AI execution model;
21. external channel implementations;
22. Customer/User merge/unlink mechanics;
23. physical User/Business/Membership schema.

No open item above is implicitly approved by appearing in this document.

---

# 14. Evidence Classification

| Evidence type | Meaning |
|---|---|
| Owner decision / closure | DOCUMENTED / OWNER-RULED |
| Architecture boundary | DOCUMENTED / OWNER-APPROVED |
| Contract-derived invariant | DOCUMENTED — DERIVED |
| Existing implementation behavior | Must be VERIFIED BY CODE |
| Runtime behavior | Must be VERIFIED BY EXECUTION |
| Open technical mechanism | NOT DETERMINABLE WITH AVAILABLE INFORMATION |

The existence of an invariant does not establish that the current implementation satisfies it.

---

# 15. Traceability

| Invariant group | Primary contract | Primary authority | Test |
|---|---|---|---|
| Identity/Tenancy | C-IDENT / C-TEN / C-MEM / C-CONTEXT | R8-ARCH / R8-ID | NOT CREATED |
| Authorization | C-AUTH | OR-B2 / R8-ARCH-003 | NOT CREATED |
| Customer | C-CUST | OR-B2 / OR-B3 | NOT CREATED |
| Catalog/Cart | C-CAT / C-CART | R8-COM | NOT CREATED |
| Order/Sale | C-ORD / C-SALE | R8-COM / R8-ORD | NOT CREATED |
| Inventory | C-INV / C-LOC | R8-INV-002/003 | NOT CREATED |
| Payment | C-PAY | R8-PAY-002 | NOT CREATED |
| Cash/AR | C-CASH / C-AR | R8-PAY-003 | NOT CREATED |
| Messaging | C-MSG | OR-B2 / OR-B3 / R5-MSG | NOT CREATED |
| Fulfillment | C-FUL | OR-B3 | NOT CREATED |
| Brand | C-BRAND | MVP Spec / Brand direction | NOT CREATED |
| Cross-domain | C-X | Block 1 Architecture/Contracts | NOT CREATED |

---

# 16. Readiness Gate

Block 1 Invariants are ready to enter Tests/Evals derivation when:

- every retained invariant has an authoritative source;
- no invariant introduces a new business decision;
- implementation mechanisms remain open where not approved;
- Business isolation is explicit;
- authorization is explicit;
- Customer/User separation is explicit;
- Order/Sale separation is explicit;
- reservation/physical-exit separation is explicit;
- Payment/Sale separation is explicit;
- Messaging cannot bypass domain authorization;
- Fulfillment remains correctly scoped;
- historical R6 wording issues are not promoted.

### Current status

**INVARIANTS: DRAFT — REVIEW REQUIRED**

**TESTS / EVALS: NEXT LAYER**

**IMPLEMENTATION: NOT AUTHORIZED**

---

# 17. Conclusion

Block 1 now has a consolidated invariant surface derived from the current Contracts and approved Owner decisions.

The critical integrity chain is:

```
User
 ↓
Business
 ↓
Membership
 ↓
Active Business Context
 ↓
Role / Permission
 ↓
Customer
 ↓
Product / BusinessProduct
 ↓
Cart
 ↓
Order
 ↓
ORDER_CONFIRM
 ├── Sale
 └── Reservation
      ↓
   Physical Exit
      ↓
 Payment
      ↓
 Cash / AR
```

This artifact does not claim that the current AS-IS implementation satisfies these invariants.

**Status: DRAFT — BLOCK 1 INVARIANTS**

**Technical Specification: NOT APPROVED**

**Implementation: NOT AUTHORIZED**
