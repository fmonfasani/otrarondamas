# OR-B3 — OWNER DECISIONS

**Date:** 2026-10-03  
**Status:** OWNER DECISIONS ACCEPTED  
**Scope:** Identity/Tenancy, Commerce, Governance and Architecture follow-ups

## 1. Decision status

The Owner accepted all recommendations presented in the OR-B3 decision pass. These decisions are recorded as Owner Rulings for subsequent documentary propagation.

Acceptance of these decisions does **not** by itself constitute approval of the Wapsell Technical Specification or authorization to implement code, schema, infrastructure or deployment changes.

## 2. Identity & Tenancy

### OR-B3-001 — Customer/User matching
**Decision:** Hybrid controlled association.

The system may detect or propose a possible Customer ↔ User match, but must not automatically establish the association solely from a matching email without the applicable confirmation/control mechanism.

**Status:** CLOSED — OWNER RULING.

### OR-B3-002 — Customer/User association lifecycle
**Decision:** Customer ↔ User association is supported as a controlled relationship. It is not an automatic conversion of a Customer into a User.

The Customer remains a valid commercial entity independently of User existence; association is optional and controlled.

**Status:** CLOSED — OWNER RULING.

### OR-B3-003 — SaaS Admin
**Decision:** SaaS Admin exists conceptually at platform level but is outside the operational MVP scope.

**Status:** CLOSED — OWNER RULING.

### OR-B3-004 — Locations
**Decision:** Use a generic Location concept. A Business must support at least one MAIN Location, while the model must permit multiple Locations.

This does not establish separate Branch and Warehouse entities in the MVP.

**Status:** CLOSED — OWNER RULING.

### OR-B3-005 — Product ownership/model
**Decision:** Hybrid model: global Product identity plus BusinessProduct for Business-specific commercial configuration.

Business-specific attributes include, at minimum, SKU, price and visibility. The exact complete field governance remains a specialized-spec concern.

**Status:** CLOSED — OWNER RULING.

### OR-B3-006 — Order confirmation
**Decision:** Customer and Business-side actors may participate in the order flow, but commercial confirmation is a Business-authorized action governed by ORDER_CONFIRM. Customer confirmation may represent customer intent/acceptance; it must not be interpreted as granting the Customer the Business authorization to commercially confirm a Sale.

The exact channel-specific flow may be specialized later without changing the authorization principle.

**Status:** CLOSED — OWNER RULING.

### OR-B3-007 — Cart without Customer
**Decision:** Cart may exist without an identified Customer. A Customer association is required before an Order is created.

**Status:** CLOSED — OWNER RULING.

### OR-B3-008 — Customer without User in Messaging
**Decision:** A Customer may participate in Messaging without having a Wapsell User identity. A separate ConversationIdentity abstraction is not required by this ruling.

The exact technical representation remains a specialized design concern.

**Status:** CLOSED — OWNER RULING.

## 3. Commerce / Operations

### OR-B3-009 — Physical stock decrement
**Decision:** Physical stock is decremented through a registered stock-out movement representing the actual physical exit of inventory.

Order confirmation reserves stock; the reservation does not by itself imply physical stock decrement.

**Status:** CLOSED — OWNER RULING.

### OR-B3-010 — Sensitive Cash authorization
**Decision:** Sensitive cash operations are governed through specific permissions rather than an Owner-only or Owner+Admin hard-code.

The exact permission catalog and operation matrix remain specialized authorization design work.

**Status:** CLOSED — OWNER RULING.

### OR-B3-011 — Fulfillment
**Decision:** Fulfillment is part of the MVP operational scope under Orders, but Repartidor is not an MVP Membership Role.

Fulfillment must therefore operate without requiring the future Repartidor role to be implemented as an MVP membership role.

**Status:** CLOSED — OWNER RULING.

## 4. Architecture

### OR-B3-012 — Kubernetes / GraphQL
**Decision:** Kubernetes and GraphQL are neither prohibited nor approved as current implementation choices. They remain undecided and may be evaluated later when architectural requirements justify the decision.

**Status:** CLOSED as an Owner non-commitment — implementation choice remains OPEN.

## 5. Governance / evidence

### OR-B3-013 — G001–G105 authority
**Decision:** G001–G105 are a secondary functional source. They do not have the authority of an Owner Ruling and do not override the approved precedence order.

**Status:** CLOSED — OWNER RULING.

## 6. Security

### OR-B3-014 — MFA / 2FA
**Decision:** MFA/2FA is mandatory for Owner and Admin roles in the MVP security direction.

The exact mechanism, enrollment/recovery flow and technical enforcement remain specialized security/architecture work.

**Status:** CLOSED — OWNER RULING.

## 7. Scope boundary

These decisions close the specific OR-B3 questions above. They do **not** automatically close unrelated open decisions such as payment state modeling, detailed cash operation matrices, detailed fulfillment workflows, remaining governance labels, unresolved historical conflicts, or other items explicitly marked OPEN in the canonical documentation.

## 8. Propagation rule

The decisions above are authoritative under the established precedence:

OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > AUDIT > WORKSHOP/PREPARATION > HISTORICAL

They should be propagated to the relevant canonical/specification documents only through a controlled documentary update. No implementation authorization is implied.
