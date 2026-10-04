# WAPSELL — BLOCK 1 ARCHITECTURE SPECIFICATION v0.1

**Status:** DRAFT — BLOCK 1 ARCHITECTURE / NOT APPROVED  
**Date:** 2026-10-04  
**Scope:** Wapsell MVP — Block 1  
**Technical Specification:** NOT APPROVED  
**Implementation:** NOT AUTHORIZED

---

## 1. Authority & Scope

This document defines the architectural boundary for the first Wapsell implementation block.

It derives from the current consolidated MVP baseline and approved Owner/architecture decisions.

Authority remains:

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

This document does not replace:

- the Decision Register;
- the General Specification;
- specialized Specifications;
- Contracts;
- Invariants;
- Tests/Evals;
- Transformation Specification;
- Implementation Plan.

It does not authorize implementation, schema changes, migrations, deletion, replacement, deployment or infrastructure changes.

### 1.1 Architectural scope

This specification covers the architectural boundary necessary for:

```
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

with:

```
ORDER_CONFIRM
     ├── Sale creation
     └── Stock reservation
```

Physical stock exit occurs later through an actual stock-out movement.

---

# 2. Architectural Principles

## 2.1 Modular Monolith

Wapsell is architecturally a **Modular Monolith initially**.

The modular boundary exists to separate business responsibilities while retaining a single initial deployable application.

The architecture must favor:

- explicit responsibility boundaries;
- controlled dependencies;
- Business isolation;
- centralized authorization semantics;
- reusable domain capabilities;
- testable boundaries;
- incremental transformation;
- preservation of valid AS-IS functionality.

Microservices are not an initial requirement.

## 2.2 Conversation-centric experience

Conversation is the principal commercial experience.

Messaging may initiate or contextualize commerce operations, but it does not own Commerce business rules.

The authoritative operation remains in the corresponding domain capability.

## 2.3 Business is the tenant boundary

Business is the canonical tenant and commercial/data isolation boundary.

Otra Ronda Más is simply the first Business using Wapsell.

No architecture is specialized for Otra Ronda Más.

## 2.4 Global identity

User is a global platform identity.

A User may have multiple Business memberships.

A User is not intrinsically owned by a single Business in the target model.

## 2.5 Authorization follows membership

The conceptual authorization chain is:

```
User
 ↓
Active Business Context
 ↓
Membership
 ↓
Role
 ↓
Permission
 ↓
Authorized Operation
```

Authentication alone does not authorize Business access.

---

# 3. System Boundary

The initial Wapsell system is organized into the following architectural responsibilities:

### Platform / Identity

- User;
- Business/Tenancy;
- Membership;
- active Business context;
- authentication/session boundary;
- authorization.

### Customer

- Business-scoped Customer;
- Customer/User association.

### Commerce

- Product;
- BusinessProduct;
- Cart;
- Order;
- Sale.

### Inventory

- Location;
- stock;
- reservation;
- stock movement.

### Payments / Financial Operations

- Payment;
- Cash;
- Accounts Receivable.

### Messaging

- Conversation;
- Messages;
- contextual Commerce interaction.

### Brand / Experience

- Business Brand;
- Wapsell Design System boundary;
- customer-facing experience.

### Fulfillment

Fulfillment remains a capability of Orders and is not a separate top-level MVP module.

---

# 4. Modular Monolith Responsibility Model

The architecture must prevent one module from silently becoming the owner of another module's business rules.

Conceptually:

```
Experience / Interface
          ↓
Application orchestration
          ↓
Domain capabilities
          ↓
Persistence / external infrastructure
```

This is a responsibility direction, not a mandatory folder or framework structure.

A module may depend on another module's published capability where the domain relationship requires it.

It must not bypass the receiving module's authoritative rules through direct undocumented mutation.

---

# 5. Identity / Tenancy Boundary

## 5.1 User

User is globally identified.

The target architecture must allow:

```
User U
 ├── Membership → Business A
 ├── Membership → Business B
 └── Membership → Business C
```

The current physical `Usuario` model is AS-IS evidence and transitional compatibility.

## 5.2 Business

Business is the canonical tenant.

Business owns or contextualizes Business-scoped commercial and operational data.

## 5.3 Membership

Membership represents:

```
User ↔ Business
```

Membership carries the contextual relationship required for authorization.

Conceptual lifecycle:

- ACTIVE;
- INACTIVE.

An INACTIVE Membership cannot operate within the Business.

## 5.4 Active Business Context

Every protected Business-scoped operation must execute under an established effective Business context.

The context must correspond to a valid ACTIVE Membership of the authenticated User.

A client-supplied Business identifier cannot override the server-established context.

## 5.5 Tenant isolation mechanism

The approved primary mechanism is:

**Application-level tenant isolation.**

The architectural boundary is:

```
Authenticated User
        ↓
Active Business Context
        ↓
Valid ACTIVE Membership
        ↓
Authorized Operation
        ↓
Business-scoped Persistence
```

Required properties:

1. Business context exists before Business-scoped operations.
2. Active Membership validates the context.
3. INACTIVE Membership cannot operate.
4. Client Business identifiers are not authoritative.
5. Create operations derive Business from trusted context.
6. Reads are constrained to the effective Business.
7. Updates/deletes cannot cross Business boundaries.
8. Unique lookups cannot expose another Business.
9. Related/nested persistence preserves ownership.
10. Transactions preserve isolation.
11. Missing/invalid context fails closed.
12. Cross-Business access is negatively verifiable.

The existing `EmpresaScopedPrismaService` and `empresaScopeExtension` are AS-IS mechanisms.

Their approved disposition is **ADAPT**, not automatic replacement.

---

# 6. Authentication / Session Boundary

The approved architectural direction is:

**JWT-centric authentication with application-controlled active Business context.**

Conceptually:

```
Credentials / OAuth
       ↓
Global User authentication
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

JWT authenticates the global User.

JWT alone does not authorize Business access.

The following remain open:

- exact JWT claims;
- token lifetime;
- refresh mechanism;
- revocation;
- logout;
- session/device management;
- Business Switch protocol;
- Google onboarding mechanics;
- exact MFA mechanism.

Owner/Admin MFA is mandatory.

Its technical implementation remains open.

### 6.1 AS-IS authentication disposition

Current repository evidence shows:

- Passport/JWT authentication;
- global JWT guard;
- permission guard;
- password authentication;
- Google OAuth;
- current JWT carrying legacy `empresaId`;
- current permissions/role represented in the JWT;
- no refresh-token mechanism evidenced;
- Google onboarding capable of creating legacy `Usuario`.

Disposition:

| AS-IS capability | Architectural disposition |
|---|---|
| JWT authentication | ADAPT |
| Passport/JWT strategy | ADAPT |
| Global authentication guard | ADAPT |
| Permission guard | ADAPT |
| Legacy `empresaId` JWT claim | RECONCILE |
| Role/permission claims as authority | RECONCILE |
| Password authentication | ADAPT |
| Google OAuth | ADAPT |
| Google auto-provisioning | RECONCILE |
| Current token lifetime | OPEN |
| Refresh mechanism | OPEN |
| Revocation | OPEN |
| MFA mechanism | OPEN |

No replacement is authorized by this table.

---

# 7. Authorization Boundary

The canonical authorization model is:

```
Membership
    ↓
Role
    ↓
Permission
```

MVP Membership Roles:

- Owner;
- Admin;
- Vendedor;
- Gestor de Stock.

Owner and Admin are distinct.

Customer and Supplier are not Membership Roles.

Repartidor is outside the MVP Membership Role catalogue.

The exact Permission catalogue and Role→Permission matrix remain open technical/specification work.

### 7.1 Authorization requirements

A protected Business operation must establish:

1. authenticated User;
2. effective Business context;
3. ACTIVE Membership;
4. applicable Role;
5. applicable Permission.

A token or client-provided Business identifier must not bypass this chain.

Messaging must not bypass it either.

---

# 8. Customer Boundary

Customer is a Business-scoped commercial identity.

Customer:

- is distinct from User;
- may exist without User;
- may optionally be associated with User;
- is controlled in its association with User.

The system may detect/propose a possible Customer/User match.

Email equality alone does not establish the association automatically.

The architecture therefore treats Customer/User association as a controlled domain operation rather than identity equivalence.

---

# 9. Commerce Boundary

Commerce owns the authoritative commercial lifecycle.

## 9.1 Product

Conceptual relationship:

```
Product
   ↓
BusinessProduct
```

Product represents global identity.

BusinessProduct represents Business-specific commercial configuration.

Business-specific properties such as price, SKU and visibility must not become global Product properties.

Physical persistence remains open.

## 9.2 Cart

Cart may exist without Customer.

Customer is required before Order creation.

Anonymous-cart persistence remains open.

## 9.3 Order

Order represents commercial intent/process.

Order confirmation is a Business-authorized operation.

The authorization boundary is:

```
ORDER_CONFIRM
```

Customer acceptance does not itself constitute Business authorization.

## 9.4 Sale

Sale represents the confirmed economic operation.

Sale is created at commercial confirmation.

Delivery does not create the Sale.

Confirmed Sale is immutable.

Corrections occur through explicit compensating operations preserving traceability.

Payment does not determine the Sale lifecycle.

## 9.5 Commerce authority

Other domains may produce effects associated with Commerce, but they must not redefine the authoritative Order/Sale rules.

Messaging, Inventory and Payment therefore integrate with Commerce rather than becoming alternative Commerce implementations.

---

# 10. Inventory Boundary

Inventory is exclusively Business-owned.

There is no shared global stock between Businesses.

Negative stock is prohibited.

## 10.1 Reservation

Order confirmation establishes the applicable stock reservation.

Conceptually:

```
available = onHand - reserved
```

Reservation:

- does not represent physical stock exit;
- cannot exceed available stock;
- requires concurrency integrity;
- must not leave partial reservation after failed confirmation.

The physical Reservation representation remains open.

## 10.2 Physical stock exit

Physical stock is decremented through a stock-out movement representing actual physical stock exit.

Therefore:

```
Reservation ≠ physical decrement
```

Cancellation before physical exit releases the applicable reservation.

## 10.3 Rotation

- FEFO for products with expiry;
- FIFO for products without expiry.

## 10.4 Location

Location is a generic Business-scoped concept.

Requirements:

- at least one MAIN Location per Business;
- multiple Locations permitted;
- MAIN is a conceptual role;
- Branch/Warehouse/Deposito are not separate MVP entity semantics.

Physical Location/Inventory association remains open.

---

# 11. Payment / Cash / AR Boundary

## 11.1 Payment

Payment is distinct from Sale.

Payment has its own lifecycle.

Approved conceptual behavior:

- partial payments valid;
- multiple Payments may settle one Sale;
- overpayment rejected by default;
- refunds/reversals explicit and traceable;
- original Payment is not erased.

Payment reconciliation is distinct from:

- Cash reconciliation;
- AR reconciliation.

External providers remain downstream implementation work.

## 11.2 Cash

Cash is Business-scoped.

Sensitive Cash operations require explicit Permissions.

Payment may generate a Cash effect according to payment method and its confirmation/evidence semantics.

Exact Cash lifecycle remains open.

## 11.3 Accounts Receivable

AR is included in MVP.

Payment and AR application are separate concepts.

A Payment may:

- exist without AR;
- apply partially to AR;
- apply completely to AR;
- apply across multiple obligations where specialized rules permit.

A partial Payment does not automatically create AR.

Exact debt/allocation/aging/credit behavior remains open.

---

# 12. Messaging Integration Boundary

Messaging is a first-class Wapsell domain but complete Messaging implementation belongs to Block 2.

Block 1 preserves this integration point:

```
Conversation
      ↓
Customer
      ↓
Commerce Context
      ↓
Cart / Order
```

Messaging:

- belongs to exactly one Business per Conversation;
- may involve User and/or Customer participants;
- may involve Customer without User;
- must operate within active Business context;
- must respect Commerce authorization.

The MVP does not depend on WhatsApp.

AI assistants are inactive.

Block 1 does not require:

- complete Message infrastructure;
- realtime/WebSockets;
- attachments;
- read state;
- notification system;
- assignment;
- retention implementation;
- AI execution;
- WhatsApp integration.

---

# 13. Brand / Experience Boundary

Each Business has a Brand.

Customer-facing experience is primarily Business-branded.

Wapsell remains the underlying platform.

Conceptual relationship:

```
Wapsell Design System
        ↓
Business Brand
        ↓
Business-facing Experience
```

The following remain open:

- design tokens;
- theme model;
- typography;
- component system;
- customization limits;
- asset model.

Otra Ronda Más is the first Business/Brand implementation and receives no architectural exception.

---

# 14. Fulfillment Boundary

Fulfillment belongs to Orders.

It is not a top-level MVP architectural module.

Detailed fulfillment lifecycle remains open.

Repartidor is not an MVP Membership Role.

---

# 15. Cross-Domain Interaction

The architecture recognizes explicit domain boundaries:

```
Order ↔ Sale
Order ↔ Inventory
Order ↔ Fulfillment
Sale ↔ Payment
Sale ↔ Cash
Sale ↔ AR
Messaging ↔ Commerce
Customer ↔ User
Business ↔ all Business-scoped domains
```

The direction of dependency must preserve domain authority.

Examples:

- Messaging may initiate an Order but does not implement Order rules.
- Order confirmation invokes the approved reservation behavior but does not directly model physical stock exit.
- Payment records financial settlement information but does not create or confirm a Sale.
- Fulfillment updates Order fulfillment state but does not create a Sale.
- Customer/User association does not make Customer and User the same entity.
- Business context constrains all Business-scoped effects.

Cross-domain behavior requiring atomicity must be specified in Contracts/Invariants before implementation.

---

# 16. Persistence Boundary

Persistence is an implementation boundary behind domain/application responsibilities.

The architecture requires:

- Business ownership/isolation where applicable;
- no trust in client-supplied tenant identifiers;
- preservation of Customer/User separation;
- Business-owned Inventory;
- Business-owned Cash;
- traceable financial effects;
- controlled related-entity persistence.

This specification does not select:

- database-per-tenant;
- schema-per-tenant;
- PostgreSQL RLS;
- ORM;
- table names;
- primary/foreign keys;
- index strategy;
- partitioning;
- migration strategy.

The approved tenant isolation strategy is application-level isolation.

---

# 17. Transactional Integrity

Operations with multiple business effects must preserve consistency.

The architecture explicitly requires this for the Block 1 critical boundary:

```
ORDER_CONFIRM
   ├── Sale creation
   └── Reservation
```

The exact transaction mechanism remains open.

The architecture does not yet select:

- database transaction boundaries;
- locks;
- optimistic concurrency;
- pessimistic concurrency;
- event/outbox;
- queue;
- saga/process manager;
- retry strategy.

These require specialized technical specification.

---

# 18. AS-IS → TO-BE Disposition

The transformation must preserve existing functionality unless an approved target rule requires adaptation.

Current evidence supports the following high-level dispositions:

| Area | AS-IS | TO-BE architectural disposition |
|---|---|---|
| Usuario/Empresa identity | legacy Business-coupled model | ADAPT incrementally |
| JWT authentication | implemented | ADAPT |
| Permission authorization | implemented | ADAPT to Membership context |
| Empresa scoped persistence | implemented | ADAPT to Business context |
| Customer | implemented | ADAPT toward Customer≠User |
| Product/catalog | implemented | ADAPT toward Product/BusinessProduct |
| Order | implemented | ADAPT |
| Sale | implemented | ADAPT |
| Stock | implemented | ADAPT; reservation boundary required |
| Payment | implemented | ADAPT |
| Cash | implemented | ADAPT |
| AR | partially/operationally present | ADAPT |
| Messaging | incomplete relative to target | BLOCK 2 / integration boundary only |
| Fulfillment | existing capability | ADAPT under Orders |
| Brand | existing Business experience | ADAPT to Business Brand model |

This table is architectural disposition only.

It does not authorize code deletion, replacement or migration.

---

# 19. Block 1 Architectural Slice

The first vertical architectural slice is:

```
GLOBAL USER
    ↓
BUSINESS
    ↓
MEMBERSHIP
    ↓
ACTIVE BUSINESS CONTEXT
    ↓
AUTHORIZATION
    ↓
CUSTOMER
    ↓
PRODUCT / BUSINESSPRODUCT
    ↓
CART
    ↓
ORDER
    ↓
ORDER_CONFIRM
    ├──────────────┐
    ↓              ↓
   SALE       RESERVATION
    ↓
 PAYMENT
```

The slice must preserve the future Messaging boundary:

```
Conversation → Customer → Commerce Context → Cart / Order
```

but does not implement complete Messaging.

---

# 20. Architectural Constraints

The following are constraints for all downstream engineering work:

1. Do not treat AS-IS code as automatic TO-BE compliance.
2. Do not bypass Business context.
3. Do not trust client-supplied Business identifiers.
4. Do not authorize Business operations from JWT existence alone.
5. Do not make Customer equivalent to User.
6. Do not make Product equivalent to BusinessProduct.
7. Do not make Order equivalent to Sale.
8. Do not make Payment determine Sale creation.
9. Do not use physical stock decrement as the representation of reservation.
10. Do not allow negative stock.
11. Do not allow Messaging to duplicate Commerce authority.
12. Do not introduce AI execution in MVP.
13. Do not introduce WhatsApp as an MVP dependency.
14. Do not make Repartidor an MVP Membership Role.
15. Do not create a separate top-level Fulfillment module.
16. Do not introduce cross-Business stock sharing.
17. Do not delete or replace AS-IS capabilities without explicit transformation authorization.
18. Do not introduce technical mechanisms merely because they are convenient if they alter an approved product boundary.
19. Every new Business-scoped persistence path must preserve tenant isolation.
20. Missing or invalid Business context must fail closed.

---

# 21. Open Technical Decisions

The following remain OPEN and must be resolved in their appropriate engineering layer:

### Identity / Authentication

- exact JWT claims;
- access-token lifetime;
- refresh mechanism;
- revocation;
- logout;
- session/device model;
- Business Switch protocol;
- Google onboarding;
- MFA mechanism.

### Authorization

- canonical Permission catalogue;
- Role→Permission matrix;
- enforcement implementation.

### Identity persistence

- physical User/Membership/Business schema;
- legacy Empresa/Usuario coexistence details;
- migration/backfill;
- cutover.

### Commerce

- Product/BusinessProduct physical model;
- anonymous Cart persistence;
- exact Order states;
- exact Sale correction transitions.

### Inventory

- Reservation entity/persistence;
- concurrency mechanism;
- transaction boundary;
- Location persistence;
- Location↔Inventory relation;
- reservation/location interaction.

### Payments

- exact Payment state graph;
- provider integration;
- webhook/idempotency;
- refund transaction model.

### Cash / AR

- Cash state machine;
- Cash movement model;
- reconciliation;
- AR allocation;
- debt lifecycle.

### Messaging

- physical Message model;
- API model;
- realtime;
- notifications;
- attachments;
- assignment;
- retention.

### Brand

- token model;
- theme structure;
- customization boundary.

### Infrastructure

- deployment topology;
- cloud infrastructure;
- Kubernetes;
- event infrastructure;
- caching;
- observability implementation.

No item above should be treated as implicitly approved.

---

# 22. Evidence Matrix

| Architectural statement | Evidence |
|---|---|
| Modular Monolith direction | DOCUMENTED / OWNER APPROVED |
| Business = tenant boundary | DOCUMENTED / OWNER APPROVED |
| User = global identity | DOCUMENTED / OWNER APPROVED |
| Membership contextualizes User↔Business | DOCUMENTED / OWNER APPROVED |
| Application-level tenant isolation | DOCUMENTED / OWNER APPROVED |
| JWT-centric authentication | DOCUMENTED / OWNER APPROVED |
| Active Business Context | DOCUMENTED / OWNER APPROVED |
| Current JWT implementation | VERIFIED BY CODE |
| Current Empresa-scoped Prisma mechanism | VERIFIED BY CODE |
| Customer distinct from User | DOCUMENTED / OWNER APPROVED |
| Order ≠ Sale | DOCUMENTED / OWNER APPROVED |
| Reservation ≠ physical stock exit | DOCUMENTED / OWNER APPROVED |
| Payment ≠ Sale lifecycle | DOCUMENTED / OWNER APPROVED |
| Messaging first-class | DOCUMENTED / OWNER APPROVED |
| Complete Messaging implementation | NOT IMPLEMENTED / BLOCK 2 |
| Exact physical target schema | NOT DETERMINABLE WITH AVAILABLE INFORMATION |
| Exact JWT/session mechanics | NOT DETERMINABLE WITH AVAILABLE INFORMATION |
| Exact Permission matrix | NOT DETERMINABLE WITH AVAILABLE INFORMATION |
| Implementation authorization | NOT AUTHORIZED |

---

# 23. Readiness Gate

This Architecture Specification is ready for architectural review when:

- every architectural boundary is traceable to an approved product decision or documented evidence;
- unresolved mechanisms remain explicitly OPEN;
- no technical choice is silently introduced;
- AS-IS and TO-BE are distinguished;
- Block 1 responsibility boundaries are explicit;
- tenant isolation and authentication boundaries are closed at the architectural level;
- downstream Contracts can be derived without inventing product rules.

### Current status

**ARCHITECTURE SPECIFICATION: DRAFT — REVIEW REQUIRED**

**ARCHITECTURE APPROVAL: NOT YET GRANTED**

**CONTRACTS: NEXT LAYER**

**IMPLEMENTATION: NOT AUTHORIZED**

---

# 24. Conclusion

The Wapsell Block 1 architecture is sufficiently bounded to proceed to the Contracts layer without reopening the current product decisions.

The architectural foundation is:

```
MODULAR MONOLITH
       ↓
GLOBAL USER
       ↓
BUSINESS TENANT
       ↓
MEMBERSHIP
       ↓
ACTIVE BUSINESS CONTEXT
       ↓
MEMBERSHIP → ROLE → PERMISSION
       ↓
APPLICATION ORCHESTRATION
       ↓
DOMAIN CAPABILITIES
       ↓
BUSINESS-SCOPED PERSISTENCE
```

The first commercial boundary is:

```
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
```

This document closes the **architectural boundary**, not the physical implementation design.

**Status: DRAFT — BLOCK 1 ARCHITECTURE**

**Technical Specification: NOT APPROVED**

**Implementation: NOT AUTHORIZED**
