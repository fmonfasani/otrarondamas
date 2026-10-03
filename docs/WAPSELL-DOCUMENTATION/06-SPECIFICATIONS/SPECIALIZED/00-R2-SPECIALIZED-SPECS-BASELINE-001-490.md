# WAPSELL — R2 SPECIALIZED FUNCTIONAL SPECS — BASELINE

**Version:** v0.1  
**Fecha:** 2026-10-03  
**Estado:** DRAFT / NOT APPROVED  
**Fase:** R2 — SPECIALIZED FUNCTIONAL SPECS  
**Fuentes:** R1 Requirements Reconciled 001–490 + Owner Workshop 001–490 + Workshop Reconciliation + Decision Register

> Este documento organiza el contenido funcional en Specialized Specs. No constituye aprobación normativa ni autoriza Contracts, Invariants, schema, migraciones o implementación.

---

## 1. Objetivo de R2

Transformar R1 en especificaciones funcionales especializadas por dominio, manteniendo trazabilidad y dejando explícitamente abiertos los puntos que requieren resolución.

R2 no intenta cerrar todos los blockers antes de avanzar. Un OPEN puede afectar sólo una parte de una spec.

Regla:

**R1 Requirement → Specialized Spec → Open/Blocker → Contract/Invariant cuando corresponda.**

---

# 2. Mapa de Specialized Specs

| ID | Specialized Spec | Alcance | Estado |
|---|---|---|---|
| R2-01 | Identity & Tenancy | User, Business, Membership, Context | DRAFT |
| R2-02 | Authorization & Team | Roles, Profiles, Capabilities, Team | DRAFT / BLOCKED IN PARTS |
| R2-03 | Messaging | Conversations, Groups, Messages, ERP actions | DRAFT |
| R2-04 | Contacts & Customer | Contacts, Customer relationship | DRAFT |
| R2-05 | Catalog & Product | Product, variants, categories, homologation | DRAFT / BLOCKED HOMOLOGATION |
| R2-06 | Cart & Commerce | Cart, commercial initiation | DRAFT |
| R2-07 | Orders & Sales | Order, fulfillment relation, Sale | DRAFT / BLOCKED STATE MATRIX |
| R2-08 | Inventory | Stock, reservation, locations, transfers | DRAFT / BLOCKED STOCK SEMANTICS |
| R2-09 | Purchases & Suppliers | Supplier, PO, receiving, AP | DRAFT |
| R2-10 | Pricing & Promotions | Price lists, tiers, promotions | DRAFT |
| R2-11 | AR & Credit | Debt, credit, collections | DRAFT / BLOCKED CREDIT SEMANTICS |
| R2-12 | Payments & Cash | Payments, external gateways, Cash | DRAFT / BLOCKED ORDER/PAYMENT EDGE |
| R2-13 | Fulfillment & Repartidores | Delivery, pickup, drivers, tracking | DRAFT / BLOCKED CONFIRMATION ESCALATION |
| R2-14 | Returns & Refunds | Return, inspection, refund, exchange | DRAFT / BLOCKED STATE DETAILS |
| R2-15 | Notifications | Customer/internal notifications | DRAFT |
| R2-16 | Audit | Audit and historical traceability | DRAFT |
| R2-17 | Business & SaaS Administration | onboarding, lifecycle, ownership, SaaS Admin | DRAFT / OPEN GOVERNANCE |
| R2-18 | Branding & Experience | Brand, Design System, Spaces, role UX | DRAFT |

---

# 3. R2-01 — Identity & Tenancy

## Functional scope

- Global User identity.
- Business as commercial/tenant boundary.
- User ↔ Business through Membership.
- Membership ACTIVA/INACTIVA and reactivation.
- Multiple Businesses per User.
- Business Context and switching.
- Business-scoped resources.
- Legacy transition.

## Functional rules

1. A User may belong to multiple Businesses.
2. Membership determines contextual belonging.
3. Membership can be active or inactive.
4. An inactive Membership does not authorize Business operations.
5. A valid Membership can be reactivated.
6. Switching Business does not inherently require reauthentication when valid access exists.
7. Business is the isolation boundary.

## OPEN

- exact Membership lifecycle;
- invitation/acceptance mechanics;
- Business Context representation;
- session/token mechanics;
- user/business states;
- migration mechanics.

---

# 4. R2-02 — Authorization & Team

## Functional scope

- Owner.
- Asistente de local.
- Cliente mayorista.
- Proveedor.
- Repartidor.
- Cliente minorista.
- Administrador SaaS.
- Profiles.
- Roles.
- Atomic capabilities.
- Individual overrides.
- Team visibility.

## Functional rules

Authorization is contextual to Membership and Business.

ERP actions initiated through Messaging must evaluate the same effective capability required by the underlying operation.

## OPEN/BLOCKED

The workshop introduces:

**Profile → Roles atomizados → Capabilities**

while existing decisions establish contextual roles/permissions.

The precedence between Profile, Role, Capability and individual override must be defined before Contracts.

---

# 5. R2-03 — Messaging

## Functional scope

- 1:1 conversations.
- Groups.
- Business conversations.
- Multiple participants.
- Conversation assignment/reassignment.
- User/Business contacts.
- Text, image, file, audio, video, location, contacts, products and Orders.
- Interactive messages.
- System messages.
- Reply/quote.
- Read state.
- Typing indicator.
- Mute.
- Edit/delete with traceability.
- ERP actions in conversation.
- Catalog/cart/order/delivery/return/refund events.

## Functional rules

Messaging is the central commercial interface.

A conversation may surface ERP information and execute ERP operations subject to authorization.

Business conversations may include multiple sellers and operational participants.

## OPEN

- exact conversation state model;
- notification delivery mechanics;
- retention;
- technical message/event contracts.

---

# 6. R2-04 — Contacts & Customer

## Contacts

Contacts are private to each User.

Discovery uses phone/email/username according to the workshop rules.

Blocking is contextual.

## Customer

Customer is independent from User.

A Customer can exist without login and can later link to a User.

Customer belongs commercially to Business.

## OPEN

Customer ↔ User automatic matching remains open in the canonical register.

Customer lifecycle and deactivation semantics require formalization.

---

# 7. R2-05 — Catalog & Product

## Functional scope

- Product canonical identity.
- Business commercial data.
- Variants.
- Images.
- Categories.
- Global Wapsell categories.
- Business-specific products.
- EAN/GTIN.
- Supplier SKU.
- Homologation.

## Homologation

Conceptual lifecycle:

**PROPOSED → VALIDATED → RELIABLE → CONSOLIDATED**

Homologation can use EAN/GTIN or other product characteristics.

It is reused across Catalog, Pricing, Cart, Orders, Purchases, Suppliers, Inventory and Reports.

## OPEN/BLOCKED

Thresholds for each confidence transition and automatic confirmation are not closed.

No technical matching algorithm is authorized.

---

# 8. R2-06 — Cart & Commerce

## Functional scope

- Persistent Cart.
- Cart per Business.
- Cart outside Messaging.
- Product search/add from Messaging.
- Quantity modification.
- Product removal.
- Seller-created cart.
- Customer confirmation.

## Functional rule

Cart and Order are distinct functional stages even when their UX state is continuous.

## OPEN

Exact transition from Cart to Order and payment interaction must be reconciled with Orders/Payments/AR.

---

# 9. R2-07 — Orders & Sales

## Order

Order represents request/process/preparation/delivery.

Required concepts:

- confirmation;
- preparation;
- ready;
- pickup/delivery;
- cancellation;
- state history;
- originating conversation;
- customer confirmation.

## Sale

Sale is the confirmed commercial operation.

Confirmed Sale is immutable.

Cancellation is an explicit operation that reverses applicable effects.

## BLOCKED

### Stock timing
Depends on Inventory reservation semantics.

### Payment/AR
Depends on whether an Order can proceed with debt/credit.

### Order → Sale
The exact state and preconditions for automatic conversion remain open.

### Cancellation
Actor/state/confirmation matrix remains open.

---

# 10. R2-08 — Inventory

## Functional scope

- Physical stock.
- Available stock.
- Reserved stock.
- Locations.
- Warehouses.
- Lots.
- Expiration.
- FEFO.
- Adjustments.
- Internal transfers.
- Inter-Business commercial operations.
- FIFO cost.
- Traceability.
- Concurrency.
- No negative stock.

## Functional rules

Inventory belongs to Business.

Expired stock is excluded from available stock.

Stock adjustments require reason and responsible actor.

Approved receipts are immutable; corrections use adjustments.

## BLOCKED

The workshop contains two timing concepts:

- stock deduction when Order is created;
- reservation at Order confirmation.

A single authoritative timing rule must be established before Inventory Contracts/Invariants are closed.

---

# 11. R2-09 — Purchases & Suppliers

## Functional scope

- Supplier.
- Supplier SKU.
- Purchase Order.
- Quotes.
- Supplier conversation.
- PO confirmation/rejection.
- Receiving.
- Partial receipts.
- Discrepancies.
- Supplier documents.
- Accounts Payable.

## Functional rules

Receiving records actual quantities.

Differences against PO remain traceable and do not silently overwrite the PO.

Approved receipts are immutable.

## OPEN

Detailed PO and receiving state machines remain to be formalized.

---

# 12. R2-10 — Pricing & Promotions

## Functional scope

- Multiple price lists.
- Wholesale.
- Quantity tiers.
- Customer-specific conditions.
- Temporal validity.
- Branch-specific price.
- Promotions.
- Combination rules.
- Target margin and suggested pricing.

## OPEN

Promotion precedence and combination engine remain unspecified.

Margin calculation details must be formalized before financial Contracts.

---

# 13. R2-11 — AR & Credit

## Functional scope

- Business-scoped AR.
- Customer debts.
- Partial payments.
- Multiple debts per payment.
- Automatic application by age.
- Due dates.
- Overdue.
- Reminders.
- Credit limits.
- Payment terms.
- Interest/late fees.
- Credit suspension.

## BLOCKED

Workshop item 198 establishes a specific behavior for existing debt, while item 229 describes available credit automatically considering debt.

The precise formula and treatment of the new purchase must be reconciled before Contracts.

---

# 14. R2-12 — Payments & Cash

## Payments

- Business-configured payment methods.
- Mixed payments.
- External payments.
- Pending/rejected/confirmed/reversed states.
- External provider IDs.
- Reconciliation.
- Refund distinction.

Mercado Pago remains the priority external gateway direction from D-011.

## Cash

Lifecycle:

**Apertura → Operaciones/Movimientos → Arqueo → Cierre**

Multiple Cash registers are supported.

Cash movements record origin, amount, method and responsible actor.

## OPEN

The exact interaction between Order confirmation, payment requirement, credit and AR remains a cross-domain dependency.

---

# 15. R2-13 — Fulfillment & Repartidores

## Functional scope

- Repartidores Space.
- Driver availability.
- Wapsell suggestions.
- Business selection.
- Driver accept/reject.
- Trip.
- In-transit.
- Delivery.
- Tracking.
- Customer visibility.
- Pickup.
- Delivery zones.
- Delivery cost.
- Evidence/PIN.

## Functional rules

Fulfillment belongs to Orders.

Driver assignment does not complete the delivery; driver acceptance is required.

Customer can see delivery progress.

## OPEN/BLOCKED

If Driver marks delivered and Customer does not confirm:

- system contacts Customer;
- evidence may use Customer-only code/PIN;
- timeout/channel/escalation remain open.

Pickup modality/location needs final specialized wording.

---

# 16. R2-14 — Returns & Refunds

## Return

Return is independent from Sale.

Supports:

- request;
- approval;
- physical receipt;
- inspection;
- quarantine;
- restock;
- incident;
- replacement;
- exchange;
- partial quantities;
- reasons;
- Product/Customer rules.

## Refund

Refund is distinct from Payment.

Supports:

- original payment linkage;
- Return/Sale linkage;
- partial refund;
- Cash;
- transfer;
- pending;
- confirmed;
- rejected;
- cancellation before execution;
- maximum refundable amount;
- duplicate prevention;
- AR adjustment;
- discounts/promotions;
- shipping/taxes/charges;
- alternative refund method;
- audit.

## BLOCKED

The full Return and Refund state machines and approval/inspection transitions must be formalized before Contracts.

---

# 17. R2-15 — Notifications

## Functional scope

- Customer notifications.
- Internal notifications.
- Return/refund/replacement events.
- Seller alerts.
- Stock inspection alerts.
- Cash/Finance alerts.
- Deduplication.
- Event traceability.
- Delivery/read state where applicable.

## OPEN

Technical channel, provider, retry, batching and retention.

---

# 18. R2-16 — Audit

## Functional scope

Audit must cover:

- Sale changes;
- actor;
- timestamp;
- old/new state;
- cancellation;
- price;
- stock;
- credit;
- Cash;
- profiles/permissions;
- ownership;
- Business lifecycle;
- Membership lifecycle;
- SaaS Admin actions.

Audit respects Business isolation.

SaaS Admin may audit Businesses under its administrative scope.

Logical deletion preserves historical audit.

## OPEN

Technical retention, storage and query strategy.

---

# 19. R2-17 — Business & SaaS Administration

## Functional scope

- Business creation request.
- Wapsell approval.
- Owner assignment.
- Multiple Owners.
- Ownership transfer.
- Business lifecycle.
- Public identity.
- Public slug.
- Branches.
- Warehouses.
- Locations.
- Business configuration.
- Subscription-related restrictions.
- SaaS Admin.

## OPEN

- exact onboarding flow;
- SaaS Admin authority boundary;
- subscription model;
- Business states;
- governance rules.

---

# 20. R2-18 — Branding & Experience

## Functional scope

Wapsell Design System is canonical.

Business may configure its Brand over the Design System.

Customer-facing experience should identify the Business as the commercial identity while Wapsell remains the underlying platform.

Spaces and navigation are contextual to User, Membership, Business and effective capabilities.

## OPEN

- exact Brand configuration model;
- theme token ownership;
- customization limits;
- responsive UX specification;
- final navigation matrix.

---

# 21. Cross-domain dependency map

| Dependency | Domains |
|---|---|
| User/Membership/Business Context | Identity ↔ Authorization ↔ every Business domain |
| Product identity | Catalog ↔ Pricing ↔ Cart ↔ Orders ↔ Purchases ↔ Inventory |
| Stock reservation | Inventory ↔ Orders ↔ Cancellation |
| Order → Sale | Orders ↔ Sales ↔ Payments ↔ AR ↔ Cash |
| Credit | AR ↔ Customer ↔ Orders ↔ Payments |
| Delivery | Orders ↔ Inventory ↔ Repartidores ↔ Messaging |
| Return | Sale ↔ Inventory ↔ Refund ↔ Notifications |
| Refund | Return ↔ Payment ↔ Cash ↔ AR |
| Audit | transversal |
| Notifications | transversal |
| Brand/Spaces | Business ↔ Experience ↔ Authorization |

---

# 22. R2 blocker classification

### Can proceed without resolution

- base Messaging model;
- Contacts;
- Customer structure;
- Business structure;
- Audit functional scope;
- Notifications functional scope;
- Supplier/Purchase foundations;
- Branch/warehouse foundations;
- basic Catalog;
- basic Pricing;
- basic Fulfillment model.

### Can proceed partially, but cannot close

- Authorization;
- Catalog/Homologation;
- Cart;
- Orders/Sales;
- Inventory;
- AR/Credit;
- Payments;
- Fulfillment;
- Returns/Refunds;
- Customer ↔ User;
- Business Context.

### Must be closed before Contracts/Invariants

1. Stock reservation semantics.
2. Order/Payment/AR semantics.
3. Order → Sale transition.
4. Cancellation matrix.
5. Homologation thresholds.
6. Credit calculation semantics.
7. Authorization precedence.
8. Return/Refund state machines.
9. Customer ↔ User matching.
10. Business Context authorization behavior.

---

# 23. R2 output

R2 establishes the functional boundaries required for specialized specification.

It does **not** establish:

- physical schema;
- API endpoints;
- DTOs;
- JWT claims;
- database isolation mechanism;
- event transport;
- microservices;
- migration implementation;
- code.

Those belong to later phases.

---

# 24. Next phase

The correct next sequence is:

**R2 Specialized Specs**
→ **R3 Architecture**
→ **R4 Contracts**
→ **R5 Invariants**
→ **R6 Tests/Evals**

However, R3 should only define architecture around functional boundaries that are sufficiently stable. It must preserve OPEN items rather than silently resolving them.

---

# 25. Evidence

| Element | Status |
|---|---|
| Workshop 001–490 | DOCUMENTED / PERSISTED |
| Reconciliation | DOCUMENTED / PERSISTED |
| R1 Requirements | DOCUMENTED / DRAFT |
| R2 Specialized Specs | THIS DOCUMENT / DRAFT |
| Decision Register | NOT MODIFIED |
| TO-BE canonical docs | NOT MODIFIED |
| Contracts | NOT CREATED |
| Invariants | NOT CREATED |
| Tests/Evals | NOT CREATED |
| Schema | NOT MODIFIED |
| Code | NOT MODIFIED |

**R2 STATUS: SPECIALIZED FUNCTIONAL BASELINE CREATED — DRAFT / NOT APPROVED.**
