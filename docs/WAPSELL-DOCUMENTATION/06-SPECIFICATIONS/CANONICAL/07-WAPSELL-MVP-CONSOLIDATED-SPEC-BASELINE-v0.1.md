# WAPSELL — MVP CONSOLIDATED SPEC BASELINE

**Version:** 0.1  
**Status:** DRAFT — CONSOLIDATION BASELINE  
**Date:** 2026-10-04  
**Technical Specification:** NOT APPROVED  
**Implementation:** NOT AUTHORIZED

---

## 1. Purpose

This document consolidates the current approved product direction into a single working baseline for the Wapsell MVP.

Its purpose is to establish:

- the frozen MVP scope;
- the currently normative product rules;
- the explicitly open but non-blocking details;
- the functionality deferred to later blocks;
- the first implementation vertical slice;
- the conditions required before implementation authorization.

This document does **not** introduce new product decisions.

It does not replace the Owner Decision Register, Owner Rulings, canonical specifications, contracts, invariants or tests.

---

# 2. Authority

The applicable precedence is:

```text
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

Where this baseline summarizes an approved decision, the underlying decision remains authoritative.

Where a technical mechanism has not been decided, this document does not invent one.

---

# 3. Product Definition

Wapsell is a SaaS multi-tenant platform for conversational commerce and commercial management.

The platform separates:

```text
Wapsell Platform
        │
        ├── Business / Tenant
        │       │
        │       └── Brand
        │
        └── Global User
                │
                └── Membership
```

The Business is the tenant and the unit of commercial and data isolation.

Otra Ronda Más is the first Business using Wapsell.

Otra Ronda Más does not define the platform architecture.

---

# 4. Core UX Principle

Conversation is the principal commercial interface.

Commerce and ERP capabilities operate behind that experience.

A commercial action initiated from Messaging must respect the same authorization and domain rules as the equivalent action initiated elsewhere.

Messaging is therefore a first-class functional domain, even though its complete implementation belongs to a later block.

---

# 5. Frozen MVP Scope

The MVP contains the following domains:

```text
IDENTITY / TENANCY
    User
    Business
    Membership
    Role
    Permission

COMMERCE
    Customer
    Product
    BusinessProduct
    Cart
    Order
    Sale

INVENTORY
    Location
    Stock
    Reservation
    Stock Movement

PAYMENTS
    Payment
    Cash
    Accounts Receivable

MESSAGING
    Conversation / Messages

BRAND
    Business Brand

FULFILLMENT
    Integrated into Orders
```

No new domain is added by this baseline.

---

# 6. Explicitly Outside the Current MVP Block

The following do not block the first implementation slice:

- Purchases / Accounts Payable;
- operating AI assistants;
- WhatsApp dependency;
- Repartidor as Membership Role;
- cross-Business stock;
- full accounting;
- fiscal electronic invoicing;
- advanced platform administration;
- Kubernetes as a requirement;
- advanced reporting;
- advanced promotion mechanics.

Some of these remain part of the broader Wapsell product direction or TO-BE and may be specified later.

Their existence in historical Requirements does not make them Block 1 requirements.

---

# 7. Identity and Tenancy

## 7.1 User

`User` is the global platform identity.

A User:

- is not intrinsically scoped to one Business;
- may belong to multiple Businesses;
- is associated with Businesses through Memberships;
- is identified conceptually by globally unique normalized email.

The physical uniqueness mechanism remains implementation detail.

## 7.2 Business

`Business` is the canonical tenant entity.

Business is the unit of:

- commercial ownership;
- operational context;
- data isolation.

`Tenant` may describe the isolation function but is not the canonical entity name.

## 7.3 Membership

`Membership` represents the User ↔ Business relationship.

A User may have multiple Memberships.

Conceptual lifecycle:

```text
ACTIVE
INACTIVE
```

An inactive Membership cannot operate in the Business.

The mechanism for switching the active Business remains technical detail.

---

# 8. Authorization

The MVP authorization model is:

```text
Membership
     ↓
Role
     ↓
Permission
```

The MVP does not use Profile, Capability or Individual Override as an additional authorization hierarchy.

Every protected Business operation conceptually validates:

1. authenticated User;
2. target Business;
3. valid Membership;
4. Role/Permission authorization.

A valid authentication token alone does not authorize an operation.

## 8.1 MVP Membership Roles

The canonical Membership Roles are:

- Owner
- Admin
- Vendedor
- Gestor de Stock

Owner and Admin are distinct.

Customer and Supplier are not Membership Roles.

Repartidor is outside the MVP Membership Role catalogue.

The exact permission catalogue and role-permission matrix remain implementation detail.

---

# 9. Customer

Customer and User are distinct entities.

A Customer:

- belongs to a Business;
- may exist without a User;
- may optionally be associated with a User;
- represents the commercial relationship with the buyer.

Customer/User association is controlled.

The system may detect or propose a possible match, but email equality alone does not automatically establish the association.

---

# 10. Commerce

## 10.1 Product

The conceptual model is:

```text
Product
   ↓
BusinessProduct
```

`Product` represents global product identity.

`BusinessProduct` represents Business-specific commercial configuration.

Business-specific price, visibility and SKU are not global Product properties.

Exact physical field allocation remains open.

## 10.2 Cart

A Cart may exist without a Customer.

A Customer is required before an Order is created.

The physical anonymous-cart persistence mechanism remains open.

## 10.3 Order

Order and Sale are distinct.

```text
Order
=
commercial intent / process

Sale
=
confirmed economic operation
```

Customer intent or acceptance does not itself constitute Business authorization.

Commercial confirmation is a Business-authorized operation governed by:

```text
ORDER_CONFIRM
```

## 10.4 Sale

A Sale is created at commercial confirmation.

Delivery does not create the Sale.

A confirmed Sale is immutable.

Corrections occur through explicit compensating operations such as cancellation, reversal or refund, preserving traceability.

Payment does not determine the Sale lifecycle.

---

# 11. Inventory

Inventory belongs exclusively to the Business.

There is no global shared stock between Businesses.

Negative stock is prohibited.

## 11.1 Reservation

When an Order is commercially confirmed:

```text
Order confirmation
        ↓
Stock reservation
```

Reservation:

- does not represent physical stock exit;
- cannot exceed available stock;
- must preserve concurrency integrity;
- must not leave partial reservation after a failed operation.

Conceptually:

```text
available = onHand - reserved
```

The physical Reservation model remains open.

## 11.2 Physical Stock Exit

Physical stock is decremented only through a stock-out movement representing actual physical stock exit.

Therefore:

```text
Reservation ≠ physical decrement
```

Cancellation before physical exit releases the applicable reservation.

## 11.3 Rotation

Products with expiry use FEFO.

Products without expiry use FIFO.

## 11.4 Locations

The MVP uses a generic `Location` concept.

Rules:

- Location belongs to exactly one Business;
- a Business has at least one MAIN Location;
- multiple Locations are allowed;
- MAIN is a conceptual role, not a separate entity type;
- Branch/Warehouse/Deposito are not separate MVP entity semantics.

The physical relationship between Location and Inventory remains open.

---

# 12. Payments

Payment is distinct from Sale.

A Payment has its own lifecycle.

Approved conceptual rules:

- partial payments are valid;
- multiple Payments may settle one Sale;
- overpayment is rejected by default;
- refunds/reversals are explicit and traceable;
- the original Payment is not erased;
- Payment reconciliation is distinct from Cash reconciliation;
- Payment reconciliation is distinct from AR reconciliation.

External payment providers remain a later specialized implementation concern.

---

# 13. Cash

Cash belongs to the Business.

Sensitive Cash operations require specific Permissions.

Payment may generate a Cash effect according to the payment method.

Cash timing depends on the method and its confirmation/evidence semantics.

The exact Cash state model, movement model, adjustments and reconciliation remain open.

---

# 14. Accounts Receivable

Accounts Receivable / Cuentas Corrientes is included in the MVP.

Payment and AR application are distinct concepts.

A Payment:

- may exist without an AR obligation;
- may apply partially or completely to AR;
- may apply across multiple obligations where the specialized rules permit.

A partial Payment does not automatically create AR.

The exact debt, allocation, aging and credit rules remain open.

---

# 15. Messaging

Messaging is a first-class Wapsell domain.

A Conversation:

- belongs to exactly one Business;
- may contain User and/or Customer participants;
- may contain a Customer without an associated User;
- is contextual to the active Business;
- must respect Commerce authorization.

The MVP does not depend on WhatsApp.

AI assistants are inactive during the MVP.

## 15.1 Block 1 Messaging Boundary

Block 1 does not implement the complete Messaging system.

It must preserve the integration boundary:

```text
Conversation
      ↓
Customer
      ↓
Commerce Context
      ↓
Cart / Order
```

The complete Messaging implementation belongs to Block 2.

---

# 16. Brand

Each Business has a Brand representing its commercial identity.

Customer-facing experience should primarily identify with the Business Brand.

Wapsell remains the underlying platform.

The following remain open:

- design tokens;
- typography;
- component library;
- customization limits;
- theme model;
- asset model.

Otra Ronda Más is the first Brand/Business implementation.

It does not receive special architectural treatment.

---

# 17. Fulfillment

Fulfillment belongs to Orders.

It is not an independent top-level MVP module.

Detailed fulfillment lifecycle remains open.

Repartidor is not an MVP Membership Role.

---

# 18. Scope Status Model

All unresolved matters must be classified as one of:

```text
CLOSED
OPEN — NON-BLOCKING
OPEN — BLOCKING
OUT OF SCOPE
DEFERRED
```

`OPEN — NON-BLOCKING` does not stop the project.

A matter should only become `OPEN — BLOCKING` when it prevents correct definition or implementation of the current vertical slice.

---

# 19. Block 1

The first implementation block is:

```text
User
  ↓
Business
  ↓
Membership
  ↓
Active Business Context
  ↓
Authorization
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
  ↓
Sale
  ↓
Payment
```

Inventory reservation is coupled to Order confirmation:

```text
ORDER_CONFIRM
     │
     ├── Sale creation
     │
     └── Stock reservation
```

The physical stock-out occurs later when physical stock actually exits.

---

# 20. Block 1 Exclusions

Block 1 does not require implementation of:

- complete Messaging;
- WebSocket/realtime infrastructure;
- AI assistants;
- WhatsApp;
- advanced fulfillment;
- Returns;
- Refund workflows;
- Purchases;
- Accounts Payable;
- advanced Promotions;
- advanced Pricing;
- advanced Reporting;
- SaaS Administration;
- full accounting;
- fiscal invoicing;
- Kubernetes.

These exclusions do not remove their potential place in later Wapsell blocks.

---

# 21. OPEN — NON-BLOCKING

### Identity

- exact authentication provider configuration;
- JWT claims;
- refresh/revocation mechanics;
- session lifecycle;
- MFA technical mechanism;
- Business Switch mechanism.

### Authorization

- exact Permission catalogue;
- Role → Permission matrix;
- technical enforcement mechanism.

### Commerce

- physical Product/BusinessProduct allocation;
- detailed Order state machine;
- detailed Sale correction workflow;
- anonymous Cart persistence.

### Inventory

- Reservation persistence;
- locking/concurrency mechanism;
- physical inventory schema;
- Location ↔ Inventory persistence;
- transaction boundaries.

### Payments

- exact state transition graph;
- external provider integration;
- webhook model;
- idempotency;
- reconciliation mechanism.

### Cash

- Cash state machine;
- movement model;
- adjustment model;
- reconciliation model.

### AR

- debt lifecycle;
- allocation rules;
- aging;
- credit rules.

### Messaging

- physical Message model;
- realtime mechanism;
- attachments;
- read/unread;
- notifications;
- assignment;
- retention.

### Brand

- design tokens;
- theme structure;
- component system;
- customization boundaries.

---

# 22. OPEN — BLOCKING FOR LATER SPECIALIZED DESIGN

These items are not blockers for this consolidated baseline, but must be resolved before their respective technical contracts are finalized:

- physical tenant isolation enforcement;
- exact authentication/session implementation;
- physical Membership schema;
- Permission catalogue;
- Reservation transaction model;
- exact Order/Sale state transitions;
- Payment transaction model;
- Cash state machine;
- AR allocation model;
- Messaging physical/API/event model.

They are therefore domain gates, not product-scope blockers.

---

# 23. Transformation Principle

Existing code is AS-IS evidence.

It is not automatically TO-BE implementation.

The transformation must preserve existing functionality while incrementally introducing the approved Wapsell model.

Conceptually:

```text
AS-IS
  ↓
Transformation Specification
  ↓
TO-BE
  ↓
Controlled Implementation
  ↓
Validation
```

Legacy `Empresa`, `Usuario` and related structures may coexist temporarily during migration.

That coexistence is transitional and bounded.

---

# 24. Engineering Gate Before Implementation

Block 1 implementation must not begin merely because the product scope is frozen.

The following chain must exist for Block 1:

```text
Requirements
      ↓
Consolidated SPEC
      ↓
Architecture
      ↓
Contracts
      ↓
Invariants
      ↓
Tests / Evals
      ↓
Transformation Spec
      ↓
Implementation Plan
      ↓
Implementation Authorization
```

Each layer must be traceable to the preceding layer.

---

# 25. Evidence Classification

Every relevant statement must be classified as:

- VERIFIED BY CODE
- VERIFIED BY TEST
- VERIFIED BY EXECUTION
- DOCUMENTED
- NOT DETERMINABLE WITH AVAILABLE INFORMATION

Existing implementation must never be presented as proof of TO-BE compliance without verification.

---

# 26. Governance

This document does not:

- authorize implementation;
- authorize schema changes;
- authorize migrations;
- authorize destructive changes;
- approve technical mechanisms;
- replace the Decision Register;
- replace specialized Specifications;
- replace Contracts;
- replace Invariants;
- replace Tests/Evals.

Its role is to provide a stable consolidated baseline for the next engineering layers.

---

# 27. Current Project State

```text
DISCOVERY / AS-IS              DONE
REQUIREMENTS RECONCILIATION    DONE
OWNER DECISION PASS            DONE
DOCUMENTARY PROPAGATION        DONE
SCOPE FREEZE                   DONE

SPEC CONSOLIDATION             THIS BASELINE
ARCHITECTURE                   NEXT
CONTRACTS                      AFTER ARCHITECTURE
INVARIANTS                     AFTER CONTRACTS
TESTS / EVALS                  AFTER INVARIANTS
TRANSFORMATION SPEC            AFTER TESTS
IMPLEMENTATION PLAN            AFTER TRANSFORMATION
IMPLEMENTATION                 BLOCK 1
```

---

# 28. Baseline Conclusion

The Wapsell MVP scope is frozen.

No additional Owner Decision Pass is required for the current consolidation.

Remaining technical questions are classified as open details and should be resolved within the appropriate engineering layer unless they contradict an approved product decision or block the current vertical slice.

The immediate engineering objective is therefore:

```text
CONSOLIDATED MVP SPEC
        ↓
BLOCK 1 ARCHITECTURE
        ↓
BLOCK 1 CONTRACTS
        ↓
BLOCK 1 INVARIANTS
        ↓
BLOCK 1 TESTS / EVALS
        ↓
BLOCK 1 TRANSFORMATION
        ↓
IMPLEMENTATION
```

**Status: DRAFT — CONSOLIDATION BASELINE**

**Technical Specification: NOT APPROVED**

**Implementation: NOT AUTHORIZED**
