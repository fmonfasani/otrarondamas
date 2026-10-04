# Wapsell — Canonical Invariants v0.2

**Status:** DRAFT — NOT APPROVED  
**Date:** 2026-10-03  
**Layer:** Invariants  
**Authority:** OR-B2 / OR-B3 Owner rulings + R4 reconciliation + R5 canonical Contracts  
**Reconciled from:** v0.1 + R6 Invariants Canonical Audit

> This document is the reconciled canonical candidate for the Invariants layer. It does not create decisions. It does not define schema, APIs, event names, identifiers, migrations, implementation mechanisms, permission catalogues, or tests.

---

## 1. Derivation and authority rule

An invariant is a condition that must remain true regardless of implementation.

Only statements whose normative meaning is sufficiently bounded by the current authoritative documentation are included.

Authority precedence:

1. Owner rulings and their closure/propagation reports.
2. Canonical reconciliation reports.
3. Reconciled Contracts.
4. Historical invariant drafts/audits.
5. Workshop/research material as non-normative secondary evidence.

A lower-authority historical statement must not override a later Owner ruling or reconciled Contract.

Implementation evidence does not establish TO-BE invariant compliance.

---

## 2. Canonical candidate invariants

### Identity & Tenancy

#### INV-IDENT-001 — User is global

**Source:** D-002 / C-IDENT-001 / R5-IDENTITY-001.

A Wapsell User is a global platform identity and is not intrinsically owned by a single Business.

A User may participate in multiple Business contexts without becoming a different global identity for each Business.

**Open:** physical identity, identifier, lifecycle and persistence.

---

#### INV-TEN-001 — Business is the tenancy boundary

**Source:** D-001 / C-TEN-001 / R5-IDENTITY-001.

Business is the canonical business entity and multi-tenant isolation boundary.

Business-scoped resources must remain associated with their Business context.

**Open:** physical isolation mechanism and context propagation mechanism.

---

#### INV-MEM-001 — Membership contextualizes User ↔ Business

**Source:** D-002 / C-MEM-001 / R5-IDENTITY-001.

Access of a User to a Business is contextualized through Membership.

A User may have Memberships in multiple Business instances.

A Membership for one Business does not by itself authorize access to another Business.

**Open:** physical model, invitation/activation workflow and persistence mechanics.

---

#### INV-MEM-002 — Inactive Membership cannot operate

**Source:** OR-B2-003 / R5-IDENTITY-002.

A Membership in state INACTIVE cannot authorize Business-scoped operations.

The invariant does not define activation/revocation actors, workflow or technical enforcement.

---

#### INV-IDENT-002 — Normalized email is globally unique for User

**Source:** OR-B2-005 / R5-IDENTITY-004.

The normalized email identifying a User is globally unique across Wapsell Users.

Two distinct Users must not simultaneously represent the same normalized email identity.

**Open:** normalization algorithm and physical uniqueness mechanism.

---

#### INV-CUST-001 — Customer is distinct from User

**Source:** D-002-bis / C-CUST-001 / R5-IDENTITY-005.

Customer and User are distinct concepts.

A Customer may exist without a User and may optionally be associated with a User.

---

#### INV-CUST-002 — Customer association is controlled

**Source:** OR-B3-001 / OR-B3-002 / R5-IDENTITY-005.

Customer ↔ User association requires controlled confirmation.

System detection/proposal may support the process, but email equality alone must not automatically create the association.

**Open:** exact matching, merge/unlink mechanics and lifecycle.

---

#### INV-CUST-003 — Customer is Business-scoped

**Source:** D-002-bis / C-CUST-001.

A Customer belongs to the commercial context of a Business.

Customer commercial information must not silently cross Business boundaries.

**Open:** physical enforcement.

---

### Authorization

#### INV-AUTH-001 — Authentication alone does not authorize Business operations

**Source:** OR-B2-002 / R5-IDENTITY-001 / C-AUTH-001.

Authentication alone is insufficient to authorize a Business-scoped operation.

Authorization requires, conceptually:

1. authenticated User;
2. target Business;
3. valid Membership for that Business;
4. applicable Role/Permission authorization.

This is a conceptual boundary, not a technical guard algorithm.

---

#### INV-AUTH-002 — Authorization is Membership → Role → Permission

**Source:** OR-B2-001 / R5-IDENTITY-001.

MVP authorization is modeled through:

`Membership → Role → Permission`

No Profile, Capability or Individual Override layer is part of the canonical MVP authorization model.

**Open:** Permission catalogue, Role → Permission matrix and technical enforcement.

---

#### INV-AUTH-003 — UI visibility is not authorization

**Source:** canonical authorization boundary / R5-IDENTITY-001.

Hiding or showing an action in the user interface does not itself authorize or prohibit the underlying Business operation.

The underlying operation must enforce its applicable authorization independently.

---

### Commerce

#### INV-COM-001 — Product identity is global; commercial configuration is Business-specific

**Source:** OR-B2-010 / OR-B3-005 / R5-COMMERCE-003.

Product represents global product identity.

Business-specific commercial configuration belongs to the Business context through the BusinessProduct concept.

The invariant does not define the physical field allocation.

---

#### INV-CART-001 — Anonymous Cart is permitted

**Source:** OR-B3-007 / R5-COMMERCE-004.

A Cart may exist without a Customer.

A Customer is required before an Order is created.

---

#### INV-CART-002 — Cart cannot cross Business context

**Source:** OR-B2-011 / R5-COMMERCE-004.

A Cart must remain within its Business commercial context and must not silently mix products or commercial configuration belonging to another Business.

**Open:** physical persistence and context mechanism.

---

#### INV-ORD-001 — Order and Sale are distinct

**Source:** OR-B2-012 / R5-COMMERCE-002.

Order and Sale are distinct concepts.

The existence of an Order does not by itself imply that a Sale exists.

---

#### INV-ORD-002 — Commercial confirmation requires Business authorization

**Source:** OR-B3-006 / R5-COMMERCE-001.

Commercial confirmation of an Order is a Business-authorized action governed by `ORDER_CONFIRM`.

Customer intent or Customer confirmation alone does not constitute Business authorization.

**Open:** physical permission catalogue and enforcement mechanism.

---

#### INV-SALE-001 — Sale is created at commercial confirmation

**Source:** OR-B2-013 / R5-COMMERCE-002.

A Sale is created at commercial confirmation, not merely because an Order exists and not because delivery occurred.

Exact state model remains OPEN.

---

#### INV-SALE-002 — Confirmed Sale is immutable

**Source:** OR-B2-015 / R5-COMMERCE-002.

A confirmed Sale must not be edited or deleted as though the original commercial operation never existed.

Corrections require explicit cancellation, reversal or refund operations with traceability.

The exact correction matrix remains OPEN.

---

#### INV-SALE-003 — Applicable Sale effects are not partially applied

**Source:** D-008 / C-SALE-001 / previous invariant audit CORR-INV-001.

For any Sale operation to which an effect applies according to the approved domain specifications, the applicable effects must not be left partially applied.

This invariant does not define the complete effect matrix.

---

### Inventory

#### INV-INV-001 — Inventory is Business-owned

**Source:** D-014 / C-INV-001 / R5-COMMERCE-005.

Inventory belongs to a Business.

There is no implicit global shared inventory between Business instances.

---

#### INV-INV-002 — Inventory operations remain Business-scoped

**Source:** D-014 / C-INV-003.

An Inventory operation must operate against the Business to which the affected inventory belongs.

An operation must not silently operate on another Business's inventory.

**Open:** technical enforcement and context propagation.

---

#### INV-INV-003 — Negative stock is prohibited

**Source:** OR-B3-009 / R5-COMMERCE-005.

A valid inventory operation must not produce a negative stock state where the canonical rule prohibits negative stock.

The invariant does not define the physical representation of available, reserved or physical quantities.

---

#### INV-INV-004 — Confirmed Order reserves stock

**Source:** OR-B2-014 / OR-B3-009 / R5-COMMERCE-005.

Confirmation of an Order requires the corresponding stock to be reserved according to the approved inventory rules.

The reservation mechanism, concurrency control and transaction boundaries remain OPEN.

---

#### INV-INV-005 — Physical stock decrement represents actual physical exit

**Source:** OR-B3-009 / R5-COMMERCE-005.

Physical stock decrement must be represented by a stock-out movement corresponding to an actual physical stock exit.

The invariant does not define implementation timing or transaction mechanics.

---

#### INV-INV-006 — Stock selection follows FEFO/FIFO

**Source:** OR-B2-016 / R5-COMMERCE-005.

Where expiry information applies, stock selection follows FEFO.

Where expiry does not apply, stock selection follows FIFO.

The physical lot/batch model remains OPEN.

---

#### INV-INV-007 — Inventory uses the generic Location concept

**Source:** OR-B3-004 / R5-COMMERCE-005.

Inventory locations use the generic Location concept.

At least one MAIN Location exists conceptually, and multiple Locations are permitted.

Branch and Warehouse are not separate conceptual inventory types in the MVP model.

**Open:** physical Location model.

---

### Cash / AR / Payments

#### INV-AR-001 — Receivables are Business-scoped

**Source:** OR-B2 / Commerce Contracts / AR boundary.

A receivable belongs to the Business and the corresponding Customer commercial relationship.

**Open:** AR lifecycle, allocation and credit calculation.

---

#### INV-CASH-001 — Cash is Business-scoped

**Source:** D-013 / C-CASH-001 / R5-CASH-001.

A Cash register belongs to a Business and its movements must not be mixed with another Business's Cash context.

---

#### INV-CASH-002 — Cash follows its conceptual lifecycle

**Source:** D-013 / C-CASH-001.

Cash operations follow the conceptual lifecycle:

`Apertura → Operaciones/Movimientos → Arqueo → Cierre`

The exact state machine and transition rules remain OPEN.

---

#### INV-CASH-003 — Closed Cash is not directly modified

**Source:** D-013 / C-CASH-003.

A closed Cash cannot be directly modified.

Corrections require an explicit compensating/adjustment operation as defined by the later Cash specification.

**Open:** exact adjustment workflow and authorization.

---

#### INV-CASH-004 — Sensitive Cash operations require specific Permissions

**Source:** OR-B3-010 / R5-CASH-001.

Sensitive Cash operations require specific Permissions.

The invariant does not define permission identifiers, role mapping, thresholds or approval workflow.

---

### Messaging

#### INV-MSG-001 — Conversation belongs exactly to one Business

**Source:** OR-B2-021 / R5-MSG-001.

A commercial Conversation belongs exactly to one Business.

Messaging operations and related commercial data are contextualized to that Business.

---

#### INV-MSG-002 — Customer may participate without User

**Source:** OR-B3-008 / R5-MSG-002.

A Customer may participate in Messaging without a User identity.

Customer ↔ User association remains optional and controlled.

---

#### INV-MSG-003 — Messaging cannot bypass underlying domain authorization

**Source:** OR-B2-019 / R5-MSG-005.

An action initiated from Messaging must use the authorization required by the underlying domain/use case.

Messaging does not grant additional authorization merely because the action originated in a conversation.

---

#### INV-MSG-004 — MVP Messaging does not depend on WhatsApp

**Source:** OR-B2-020 / R5-MSG-003.

Wapsell Messaging MVP does not depend on WhatsApp.

This does not prohibit future external channel integrations.

---

#### INV-MSG-005 — AI is inactive in MVP

**Source:** OR-B2-020 / R5-MSG-004.

AI assistants remain inactive during the MVP.

This invariant does not authorize autonomous AI execution or define AI permissions, models, providers or activation criteria.

---

### Fulfillment

#### INV-FUL-001 — Fulfillment belongs to Orders

**Source:** OR-B3-011 / D-016 / C-FUL-001 / previous invariant audit CORR-INV-002.

Fulfillment is part of the Orders domain.

This invariant does not define tracking, delivery states, zones, tariffs, evidence or notification mechanics.

---

#### INV-FUL-002 — Repartidor is not an MVP Membership Role

**Source:** OR-B2-008 / OR-B3-011.

Repartidor is not part of the MVP Membership Role catalogue.

This does not prohibit a future Fulfillment actor model.

---

## 3. Historical invariants retained for traceability but not promoted

The following historical formulations remain represented by Git history and prior audit artifacts, but are not part of the canonical v0.2 set unless reintroduced by later approved specification:

### Historical authorization composition

`Profile → Roles → Capabilities → Individual Overrides`

**Disposition:** SUPERSEDED by INV-AUTH-002.

### Historical driver workflow invariants

Driver acceptance, delivery visibility and delivery escalation/timeouts.

**Disposition:** NOT CANONICAL / OPEN. Detailed Fulfillment lifecycle remains unspecified and Repartidor is not an MVP Membership Role.

### Historical stock atomicity formulation

The previous `INV-INV-004 — Stock movement is atomic` remains historical.

**Disposition:** NOT PROMOTED in v0.2 because current R5 leaves reservation/transaction boundaries open. No transaction mechanism is inferred here.

### Historical invalid-stock-quantity formulation

The previous `INV-INV-005 — Invalid stock quantities are rejected` remains historical.

**Disposition:** NOT PROMOTED as a separate invariant because the canonical rule that is currently closed is prohibition of negative stock. Other invalid-quantity semantics remain unspecified.

### Historical cross-Business stock transfer prohibition

The previous `INV-INV-002` formulation remains historical.

**Disposition:** NOT PROMOTED as an independent v0.2 invariant. Business ownership/isolation and no global shared inventory remain canonical; future cross-Business operations require explicit specification.

---

## 4. Deliberately OPEN — not formalized as closed invariants

The following remain outside the canonical invariant set:

1. Exact authorization algorithm and technical enforcement.
2. Permission catalogue and Role → Permission matrix.
3. MFA technical mechanism.
4. Business Switch mechanism.
5. Token/session representation and claims.
6. Physical tenant-isolation mechanism.
7. Exact Order/Sale state machines.
8. Cancellation/reversal/refund effect matrix.
9. Payment state and reconciliation lifecycle.
10. Payment ↔ Cash effects.
11. AR allocation and credit formula.
12. Cash state machine details and adjustment mechanics.
13. Inventory reservation transaction boundaries and locking.
14. Physical Location model.
15. Messaging physical model, realtime, retention, attachments and notifications.
16. Return state machine.
17. Refund state machine.
18. Delivery timeout/escalation rules.
19. AI execution model.
20. External channel implementation.
21. Exact Customer ↔ User matching/merge/unlink mechanics.
22. Physical Business/User/Membership schema.
23. Exact authentication/session contract.
24. API/event contracts.

No item above should be converted into an invariant by inference.

---

## 5. Candidate-to-test boundary

These invariants remain documentation-level candidates.

No test is implied to exist.

The next layer may map each approved invariant to one or more verification mechanisms, distinguishing:

- unit/domain tests;
- integration tests;
- database/invariant tests;
- concurrency tests where a concurrency property is explicitly approved;
- E2E tests;
- static/documentation validation.

Tests must not introduce implementation decisions that are absent from the invariant or its authoritative source.

---

## 6. Traceability

| Invariant | Contract / source | Decision / ruling | Test |
|---|---|---|---|
| INV-IDENT-001 | C-IDENT-001 | D-002 | NOT CREATED |
| INV-TEN-001 | C-TEN-001 | D-001 | NOT CREATED |
| INV-MEM-001 | C-MEM-001 | D-002 | NOT CREATED |
| INV-MEM-002 | R5-IDENTITY-002 | OR-B2-003 | NOT CREATED |
| INV-IDENT-002 | R5-IDENTITY-004 | OR-B2-005 | NOT CREATED |
| INV-CUST-001 | C-CUST-001 | D-002-bis | NOT CREATED |
| INV-CUST-002 | R5-IDENTITY-005 | OR-B3-001/002 | NOT CREATED |
| INV-CUST-003 | C-CUST-001 | D-002-bis | NOT CREATED |
| INV-AUTH-001 | C-AUTH-001 / R5-IDENTITY-001 | OR-B2-002 | NOT CREATED |
| INV-AUTH-002 | R5-IDENTITY-001 | OR-B2-001 | NOT CREATED |
| INV-AUTH-003 | R5-IDENTITY-001 | OR-B2-002 | NOT CREATED |
| INV-COM-001 | R5-COMMERCE-003 | OR-B2-010 / OR-B3-005 | NOT CREATED |
| INV-CART-001 | R5-COMMERCE-004 | OR-B3-007 | NOT CREATED |
| INV-CART-002 | R5-COMMERCE-004 | OR-B2-011 / OR-B3-007 | NOT CREATED |
| INV-ORD-001 | R5-COMMERCE-002 | OR-B2-012 | NOT CREATED |
| INV-ORD-002 | R5-COMMERCE-001 | OR-B3-006 | NOT CREATED |
| INV-SALE-001 | R5-COMMERCE-002 | OR-B2-013 | NOT CREATED |
| INV-SALE-002 | R5-COMMERCE-002 | OR-B2-015 | NOT CREATED |
| INV-SALE-003 | C-SALE-001 | D-008 | NOT CREATED |
| INV-INV-001 | C-INV-001 | D-014 | NOT CREATED |
| INV-INV-002 | C-INV-003 | D-014 | NOT CREATED |
| INV-INV-003 | R5-COMMERCE-005 | OR-B3-009 | NOT CREATED |
| INV-INV-004 | R5-COMMERCE-005 | OR-B2-014 / OR-B3-009 | NOT CREATED |
| INV-INV-005 | R5-COMMERCE-005 | OR-B3-009 | NOT CREATED |
| INV-INV-006 | R5-COMMERCE-005 | OR-B2-016 | NOT CREATED |
| INV-INV-007 | R5-COMMERCE-005 | OR-B3-004 | NOT CREATED |
| INV-AR-001 | Commerce/AR boundary | OR-B2 Commerce ruling | NOT CREATED |
| INV-CASH-001 | C-CASH-001 | D-013 | NOT CREATED |
| INV-CASH-002 | C-CASH-001 | D-013 | NOT CREATED |
| INV-CASH-003 | C-CASH-003 | D-013 | NOT CREATED |
| INV-CASH-004 | R5-CASH-001 | OR-B3-010 | NOT CREATED |
| INV-MSG-001 | R5-MSG-001 | OR-B2-021 | NOT CREATED |
| INV-MSG-002 | R5-MSG-002 | OR-B3-008 | NOT CREATED |
| INV-MSG-003 | R5-MSG-005 | OR-B2-019 | NOT CREATED |
| INV-MSG-004 | R5-MSG-003 | OR-B2-020 | NOT CREATED |
| INV-MSG-005 | R5-MSG-004 | OR-B2-020 | NOT CREATED |
| INV-FUL-001 | C-FUL-001 / R5-MSG-005 | OR-B3-011 / D-016 | NOT CREATED |
| INV-FUL-002 | R5-COMMERCE-006 | OR-B2-008 / OR-B3-011 | NOT CREATED |

---

## 7. Evidence status

All invariants in this document are:

**DOCUMENTED — DERIVED FROM OWNER RULINGS + CANONICAL RECONCILIATION + CONTRACTS**

They are not:

- VERIFIED BY TEST;
- VERIFIED BY EXECUTION;
- VERIFIED BY CODE.

Existing AS-IS code evidence remains evidence about current implementation and does not prove TO-BE invariant compliance.

---

## 8. Advancement gate

The Invariants layer is ready for controlled Test/Eval derivation only after this document receives the appropriate review/approval.

Current state:

- [x] historical invariant work preserved;
- [x] stale authorization model superseded;
- [x] OR-B2/OR-B3 closed conceptual rules propagated;
- [x] R4/R5 reconciliation reflected;
- [x] OPEN details kept outside canonical invariants;
- [x] no schema/API/event/implementation mechanism introduced;
- [x] Decision → Contract/source → Invariant traceability recorded;
- [ ] Owner approval of canonical Invariants v0.2;
- [ ] Tests/Evals derived;
- [ ] Tests executed.

**Current status: DRAFT — RECONCILED / NOT APPROVED.**

---

## 9. Reconciliation record

This v0.2 reconciliation:

- preserves the prior v0.1 document history through Git;
- preserves the prior audit/reconciliation artifacts;
- supersedes the obsolete Profile/Capability/Override authorization formulation;
- promotes already closed OR-B2/OR-B3/R4/R5 conceptual rules into explicit invariant candidates;
- does not resolve any OPEN technical or functional detail;
- does not create tests;
- does not modify code, schema, migrations or infrastructure.

**R6 CANONICAL INVARIANTS RECONCILIATION: COMPLETE — DRAFT / NOT APPROVED.**
