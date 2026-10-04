# WAPSELL — BLOCK 1 CONTRACTS BASELINE v0.1

**Status:** DRAFT — BLOCK 1 CONTRACTS / NOT APPROVED  
**Date:** 2026-10-04  
**Scope:** Wapsell MVP — Block 1  
**Architecture source:** `06-BLOCK-1-ARCHITECTURE-SPEC-v0.1.md`  
**Technical Specification:** NOT APPROVED  
**Implementation:** NOT AUTHORIZED

---

## 1. Purpose

This document consolidates the contract obligations required by the Block 1 architecture.

It does not create new product decisions.

It translates already-approved conceptual rules into observable domain/application obligations while preserving unresolved technical details as OPEN.

It does not define:

- physical database schema;
- DTOs;
- endpoint paths;
- HTTP/GraphQL protocol;
- JWT claims;
- concrete session storage;
- ORM implementation;
- infrastructure;
- migrations;
- event broker;
- locking implementation;
- code structure.

Existing contract documents remain historical and traceable sources. This document provides the Block 1 consolidated contract surface for downstream Invariants and Tests/Evals.

---

# 2. Authority

Applicable precedence:

```
OWNER RULING
    >
DECISION REGISTER
    >
CANONICAL SPEC
    >
TO-BE
    >
AUDIT
    >
WORKSHOP / PREPARATION
    >
HISTORICAL
```

Primary architectural authority:

- approved R8 architecture decisions;
- Block 1 Architecture Specification v0.1.

Primary product authority:

- MVP Consolidated Spec Baseline v0.1;
- approved Owner decisions through R8.

Existing contract IDs remain valid historical identifiers.

No new Owner decision is created here.

---

# 3. Contract Semantics

A contract defines an observable obligation between actors, application capabilities or domains.

Contract status categories:

- **CLOSED CONCEPTUALLY** — business direction already approved;
- **OPEN DETAIL** — conceptual obligation exists but implementation detail remains open;
- **CONTRACT CANDIDATE** — formalization awaiting downstream review/approval.

A contract is not an implementation authorization.

---

# 4. Identity & Tenancy Contracts

## C-IDENT-001 — Global User Identity

**Status:** CLOSED CONCEPTUALLY

User is a global platform identity.

Observable obligations:

- a User may have Memberships in multiple Businesses;
- User identity is not intrinsically limited to one Business;
- global User identity remains distinct from Customer identity.

Open:

- physical identifier;
- physical persistence;
- authentication registration mechanisms.

---

## C-TEN-001 — Business Isolation Boundary

**Status:** CLOSED CONCEPTUALLY

Business is the canonical tenant and Business/data isolation boundary.

Observable obligations:

- Business-scoped resources operate within one effective Business context;
- data belonging to Business A cannot be exposed through Business B context;
- cross-Business access is denied.

Approved architectural mechanism:

**application-level tenant isolation**.

Open:

- physical schema;
- exact persistence enforcement implementation.

---

## C-MEM-001 — User ↔ Business Membership

**Status:** CLOSED CONCEPTUALLY

Membership represents the User↔Business relationship.

Observable obligations:

- one User may have multiple Memberships;
- Membership identifies the Business context in which the User may operate;
- Membership has conceptual states ACTIVE and INACTIVE;
- INACTIVE Membership cannot operate.

Open:

- physical Membership schema;
- invitation/activation protocol;
- persistence lifecycle;
- revocation mechanism.

---

## C-CONTEXT-001 — Active Business Context

**Status:** CLOSED CONCEPTUALLY

Every protected Business-scoped operation requires an effective Business context.

Observable obligations:

- the context corresponds to a Business;
- the authenticated User must have an ACTIVE Membership for that Business;
- a client-supplied Business identifier cannot override the effective context;
- missing or invalid context fails closed.

Open:

- context transport;
- Business Switch protocol;
- whether context is represented in token/session/request state;
- exact API semantics.

---

## C-AUTH-001 — Contextual Authorization

**Status:** CLOSED CONCEPTUALLY

Authorization follows:

```
Authenticated User
      ↓
Active Business Context
      ↓
ACTIVE Membership
      ↓
Role
      ↓
Permission
      ↓
Authorized Operation
```

Observable obligations:

- successful authentication alone does not authorize Business operations;
- authorization is evaluated against the effective Business context;
- Role/Permission are contextual to Membership;
- Messaging and other entry points cannot bypass the same authorization boundary.

MVP Membership Roles:

- Owner;
- Admin;
- Vendedor;
- Gestor de Stock.

Customer and Supplier are not Membership Roles.

Repartidor is outside the MVP Membership Role catalogue.

Open:

- Permission catalogue;
- Role→Permission matrix;
- technical enforcement;
- failure/error contract;
- MFA mechanism.

---

## C-IDENT-002 — Global Normalized Email Uniqueness

**Status:** CLOSED CONCEPTUALLY

A normalized email identifies at most one global User.

Observable obligation:

- duplicate normalized User email identities are not permitted.

Open:

- normalization algorithm;
- case/Unicode policy;
- physical unique constraint.

---

# 5. Customer Contracts

## C-CUST-001 — Customer ≠ User

**Status:** CLOSED CONCEPTUALLY

Customer represents the Business-scoped commercial relationship.

Observable obligations:

- Customer may exist without User;
- Customer may optionally be associated with User;
- Customer remains Business-scoped;
- Customer and User are not interchangeable identities.

---

## C-CUST-002 — Controlled Customer/User Association

**Status:** CLOSED CONCEPTUALLY

Customer/User association is controlled.

Observable obligations:

- the system may detect or propose a possible match;
- email equality alone does not automatically establish the association;
- association requires controlled confirmation;
- association must respect Business context.

Open:

- matching criteria beyond approved email behavior;
- link/unlink operation;
- merge semantics;
- physical relation.

---

# 6. Commerce Contracts

## C-CAT-001 — Product / BusinessProduct Boundary

**Status:** CLOSED CONCEPTUALLY

Product represents global product identity.

BusinessProduct represents Business-specific commercial configuration.

Observable obligations:

- commercial operations resolve Product under Business context;
- Business-specific SKU, price and visibility do not become global Product properties;
- one Business cannot silently use another Business's commercial configuration.

Open:

- physical model;
- exact field allocation;
- SKU uniqueness;
- variants;
- price-list model.

---

## C-CART-001 — Cart Without Customer

**Status:** CLOSED CONCEPTUALLY

A Cart may exist without Customer.

Observable obligations:

- anonymous Cart is permitted;
- Customer is required before Order creation;
- when Customer exists, Cart may be associated with Customer;
- optional User association does not replace Customer identity.

Open:

- anonymous Cart persistence;
- ownership identifier;
- expiration;
- merge behavior.

---

## C-ORD-001 — Order ≠ Sale

**Status:** CLOSED CONCEPTUALLY

Order and Sale are distinct lifecycles.

Order represents commercial intent/process.

Sale represents the confirmed economic operation.

Observable obligations:

- an Order does not automatically constitute a Sale;
- Sale creation occurs at the approved commercial confirmation boundary;
- delivery does not create the Sale.

Open:

- complete Order state machine;
- complete Sale state machine;
- detailed cancellation transitions.

---

## C-ORD-002 — Commercial Order Confirmation

**Status:** CLOSED CONCEPTUALLY

Commercial confirmation is a Business-authorized operation governed by:

```
ORDER_CONFIRM
```

Observable obligations:

- Customer intent/acceptance does not itself authorize the Business operation;
- confirmation requires the applicable Business authorization;
- the operation executes under active Business context;
- authorization cannot be bypassed through Messaging.

Open:

- exact Permission catalogue entry;
- API contract;
- state transition graph.

---

## C-SALE-001 — Sale Creation Boundary

**Status:** CLOSED CONCEPTUALLY

A Sale is created at commercial confirmation.

Observable obligations:

- confirmation is the economic creation boundary;
- delivery is not the Sale creation boundary;
- Payment does not determine whether the Sale exists.

---

## C-SALE-002 — Confirmed Sale Immutability

**Status:** CLOSED CONCEPTUALLY

A confirmed Sale is immutable as historical commercial fact.

Observable obligations:

- confirmed Sale is not silently overwritten;
- correction occurs through explicit compensating operations;
- cancellation/reversal/refund preserves traceability.

Open:

- exact correction state machine;
- authorization;
- effect matrix.

---

# 7. Inventory Contracts

## C-INV-001 — Business-Owned Inventory

**Status:** CLOSED CONCEPTUALLY

Inventory belongs exclusively to a Business.

Observable obligations:

- inventory operations execute under Business context;
- no global shared stock between Businesses;
- cross-Business stock access is denied.

---

## C-INV-002 — Order Confirmation Reservation

**Status:** CLOSED CONCEPTUALLY

Commercial confirmation establishes the applicable stock reservation.

Observable obligations:

- reservation occurs on Order confirmation;
- reservation is Business-scoped;
- reservation cannot exceed available stock;
- failed reservation cannot leave a partial reservation;
- concurrent confirmations cannot oversubscribe available stock.

Conceptually:

```
available = onHand - reserved
```

Open:

- physical Reservation representation;
- transaction boundary;
- locking/concurrency mechanism;
- expiration;
- partial reservation/fulfillment details.

---

## C-INV-003 — Reservation ≠ Physical Stock Exit

**Status:** CLOSED CONCEPTUALLY

Reservation does not represent physical stock exit.

Observable obligations:

- physical decrement occurs only through a stock-out movement representing actual physical exit;
- cancellation before physical exit releases applicable reservation;
- partial physical exit preserves distinction between reserved and physically removed quantity.

---

## C-INV-004 — Negative Stock Prohibition

**Status:** CLOSED CONCEPTUALLY

Business stock cannot become negative.

Open:

- exact database/application enforcement.

---

## C-INV-005 — Stock Rotation

**Status:** CLOSED CONCEPTUALLY

- FEFO applies to products with expiry;
- FIFO applies to products without expiry.

Open:

- exact lot-selection algorithm;
- tie-breaking;
- reservation/fulfillment interaction.

---

## C-LOC-001 — Generic Business Location

**Status:** CLOSED CONCEPTUALLY

Location is a generic Business-scoped concept.

Observable obligations:

- Location belongs to exactly one Business;
- each Business has at least one MAIN Location;
- multiple Locations are permitted;
- MAIN is a conceptual role;
- Branch/Warehouse/Deposito are not separate MVP entity semantics.

Open:

- physical fields;
- Location↔Inventory relation;
- MAIN uniqueness enforcement;
- lifecycle/deletion;
- transfer semantics.

---

# 8. Payment Contracts

## C-PAY-001 — Payment Separate from Sale

**Status:** CLOSED CONCEPTUALLY

Payment has a lifecycle distinct from Sale.

Observable obligations:

- Payment does not create or define the Sale lifecycle;
- multiple Payments may apply to one Sale;
- partial payment is valid;
- overpayment is rejected by default.

---

## C-PAY-002 — Payment Traceability

**Status:** CLOSED CONCEPTUALLY

Payment corrections preserve historical traceability.

Observable obligations:

- original Payment is not erased;
- reversal/refund is explicit;
- refund/reversal maintains relation to the original Payment;
- Payment reconciliation is distinct from Cash and AR reconciliation.

Open:

- exact state graph;
- refund transaction;
- provider behavior;
- idempotency;
- reconciliation.

---

## C-PAY-003 — Payment/Cash Effect Boundary

**Status:** CLOSED CONCEPTUALLY

An approved Payment may produce a Cash effect according to payment method and its confirmation/evidence semantics.

Observable obligations:

- financial effects are traceable;
- Payment does not directly bypass Cash rules;
- Cash remains Business-scoped.

Open:

- exact timing by method;
- movement model;
- reconciliation;
- bank/external settlement.

---

# 9. Cash Contracts

## C-CASH-001 — Business Cash Ownership

**Status:** CLOSED CONCEPTUALLY

Cash belongs to a Business.

Observable obligations:

- Cash operations require Business context;
- Cash data cannot cross Business boundaries.

---

## C-CASH-002 — Sensitive Cash Authorization

**Status:** CLOSED CONCEPTUALLY

Sensitive Cash operations require specific Permissions.

Observable obligations:

- authentication alone is insufficient;
- authorization must be evaluated within the active Business Membership;
- Messaging cannot bypass Cash authorization.

Open:

- exact permission names;
- thresholds;
- approval workflow;
- Cash state machine;
- movement model.

---

# 10. Accounts Receivable Contracts

## C-AR-001 — Payment and AR Application Separation

**Status:** CLOSED CONCEPTUALLY

Payment and AR application are distinct concepts.

Observable obligations:

- Payment may exist without AR;
- Payment may apply partially to AR;
- Payment may apply completely to AR;
- Payment may apply to multiple obligations where specialized rules permit;
- partial Payment does not automatically create AR.

Open:

- debt lifecycle;
- allocation rules;
- aging;
- credit rules;
- physical AR persistence.

---

# 11. Messaging Contracts

## C-MSG-001 — Business-Owned Conversation

**Status:** CLOSED CONCEPTUALLY

A commercial Conversation belongs exactly to one Business.

Observable obligations:

- conversation operations execute in Business context;
- Conversation data cannot cross Business boundaries.

---

## C-MSG-002 — Customer Participation Without User

**Status:** CLOSED CONCEPTUALLY

A Customer may participate in Messaging without a User identity.

Observable obligations:

- Customer/User association remains optional;
- email equality alone does not auto-link;
- Messaging must preserve Customer identity.

Open:

- participant persistence;
- anonymous-session mechanics;
- identity lifecycle.

---

## C-MSG-003 — Wapsell-Owned MVP Messaging

**Status:** CLOSED CONCEPTUALLY

Messaging is a first-class Wapsell domain.

The MVP does not depend on WhatsApp.

Future external channels remain open.

---

## C-MSG-004 — Messaging Authorization

**Status:** CLOSED CONCEPTUALLY

Actions initiated from Messaging use the authorization of the underlying domain/use case.

Observable obligations:

- Messaging cannot bypass Membership→Role→Permission;
- Messaging cannot bypass Business isolation;
- Messaging cannot redefine Commerce authorization.

---

## C-MSG-005 — Messaging / Commerce Boundary

**Status:** CLOSED CONCEPTUALLY

Block 1 preserves:

```
Conversation
      ↓
Customer
      ↓
Commerce Context
      ↓
Cart / Order
```

Messaging may initiate or contextualize commerce.

Messaging does not own:

- Order state rules;
- Sale creation rules;
- Payment lifecycle;
- Inventory integrity;
- Cash rules;
- AR rules.

---

# 12. Fulfillment Contracts

## C-FUL-001 — Fulfillment Belongs to Orders

**Status:** CLOSED CONCEPTUALLY

Fulfillment is part of Orders.

Observable obligations:

- fulfillment remains associated with an Order;
- fulfillment does not constitute Sale creation;
- fulfillment does not require Repartidor as an MVP Membership Role.

Open:

- exact fulfillment state machine;
- assignment;
- delivery evidence;
- tracking;
- zones/tariffs;
- notifications.

---

# 13. Brand Contracts

## C-BRAND-001 — Business Brand

**Status:** CLOSED CONCEPTUALLY

Brand belongs to Business.

Observable obligations:

- Business Brand is the primary customer-facing identity;
- Wapsell remains the underlying platform identity;
- one Business's Brand cannot be presented as another Business's Brand.

Open:

- token model;
- theme;
- assets;
- customization limits;
- persistence.

---

# 14. Cross-Domain Contract Rules

## C-X-001 — Shared Business Context

Every Business-scoped cross-domain interaction uses the same effective Business context.

No domain may silently substitute another Business context.

---

## C-X-002 — Domain Authority

A domain may request another domain's capability but must not bypass its authoritative business rules.

Examples:

- Messaging requests Commerce behavior; it does not implement Commerce rules.
- Order confirmation triggers Inventory reservation; it does not directly model physical stock exit.
- Payment records settlement; it does not create Sale.
- Fulfillment updates Order fulfillment state; it does not create Sale.
- Customer/User association does not collapse the two identities.

---

## C-X-003 — Atomicity Where Required

Where a confirmed business operation has multiple required effects, the operation must not expose a partially applied business result.

Block 1 critical example:

```
ORDER_CONFIRM
   ├── Sale creation
   └── Stock reservation
```

The exact transaction/locking mechanism remains OPEN.

---

# 15. Block 1 Contract Surface

The minimum contract chain for Block 1 is:

```
IDENTITY / TENANCY
        ↓
AUTHORIZATION
        ↓
CUSTOMER
        ↓
CATALOG
        ↓
CART
        ↓
ORDER
        ↓
ORDER_CONFIRM
   ┌────┴────┐
   ↓         ↓
 SALE    RESERVATION
   ↓
PAYMENT
   ↓
CASH / AR EFFECTS
```

Messaging integrates at:

```
Conversation → Customer → Commerce Context → Cart / Order
```

but complete Messaging contracts remain a later Block 2 implementation concern.

---

# 16. Explicitly Open Contract Details

The following remain intentionally OPEN:

### Identity / Auth

- physical User/Business/Membership schema;
- JWT claims;
- token lifetime;
- refresh;
- revocation;
- logout;
- session/device management;
- Business Switch protocol;
- MFA mechanism;
- Google onboarding.

### Authorization

- Permission catalogue;
- Role→Permission matrix;
- technical enforcement;
- authorization error contract.

### Commerce

- Product/BusinessProduct physical model;
- anonymous Cart persistence;
- exact Order states;
- exact Sale correction workflow.

### Inventory

- Reservation persistence;
- locking;
- transaction boundaries;
- Location persistence;
- inventory/location relation;
- lot/Location selection;
- partial fulfillment mechanics.

### Payment/Cash/AR

- Payment transition graph;
- provider API;
- webhooks;
- idempotency;
- refund transaction;
- Cash state machine;
- Cash movement model;
- reconciliation;
- AR debt/allocation rules.

### Messaging

- Conversation/Message physical model;
- participant model;
- realtime;
- attachments;
- read state;
- notifications;
- retention;
- assignment.

### Brand

- design tokens;
- theme model;
- asset model;
- customization boundaries.

No OPEN detail should be treated as an implicit implementation decision.

---

# 17. Traceability

| Contract group | Primary authority | Architecture boundary | Downstream |
|---|---|---|---|
| Identity/Tenancy | R8-ID / R8-ARCH-002/003 | Identity/Tenancy | Invariants + Tests |
| Authorization | OR-B2 / R8-AUTH-001 / R8-ARCH-003 | Authorization | Permission/Invariants |
| Customer | OR-B2/OR-B3 / R8-COM-004 | Customer | Commerce Invariants |
| Catalog | R8-COM-003 / MVP Spec | Commerce | Commerce Invariants |
| Cart/Order | R8-COM-004 / R8-ORD-002 | Commerce | Order Tests |
| Sale | R8-ORD-002 | Commerce | Sale Invariants |
| Reservation | R8-INV-002 | Inventory | Inventory Tests |
| Location | R8-INV-003 | Inventory | Location Tests |
| Payment | R8-PAY-002 | Payments | Payment Tests |
| Cash/AR | R8-PAY-003 | Financial boundary | Cash/AR Tests |
| Messaging | R5-MSG / R8 decisions | Messaging | Messaging Tests |
| Fulfillment | OR-B3 / R8 scope | Orders | Fulfillment Tests |
| Brand | MVP Spec / approved Brand direction | Brand | Brand Tests later |

---

# 18. Evidence Classification

| Statement type | Evidence |
|---|---|
| Approved product/domain rule | DOCUMENTED / OWNER-RULED |
| Architecture boundary | DOCUMENTED / OWNER-APPROVED |
| Existing implementation behavior | Must be separately VERIFIED BY CODE |
| Existing runtime behavior | Must be VERIFIED BY EXECUTION |
| Contract formalization in this document | DOCUMENTED — CONTRACT CANDIDATE |
| Physical implementation mechanism not selected | NOT DETERMINABLE WITH AVAILABLE INFORMATION |

This document does not convert contract formalization into proof of implementation.

---

# 19. Contract Readiness Gate

Block 1 Contracts are ready for downstream Invariants when:

1. each contract maps to an approved product or architectural boundary;
2. no contract creates a new business rule;
3. open technical details are explicitly identified;
4. Business isolation obligations are explicit;
5. authorization obligations are explicit;
6. Order/Sale separation is explicit;
7. reservation/physical-exit separation is explicit;
8. Payment/Sale separation is explicit;
9. Messaging does not bypass domain authority;
10. cross-domain effects requiring atomicity are identified;
11. AS-IS implementation is not mistaken for contract compliance.

### Current state

**CONTRACTS: DRAFT — REVIEW REQUIRED**

**INVARIANTS: NEXT LAYER**

**IMPLEMENTATION: NOT AUTHORIZED**

---

# 20. Conclusion

The Block 1 contract surface is sufficiently defined to derive the next engineering layer without reopening the current Owner decisions.

The essential contract chain is:

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
   Payment
      ↓
 Cash / AR
```

The contracts establish observable obligations while deliberately leaving physical implementation mechanisms open.

**Status: DRAFT — BLOCK 1 CONTRACTS**

**Technical Specification: NOT APPROVED**

**Implementation: NOT AUTHORIZED**
