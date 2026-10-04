# R4 — CANONICAL RECONCILIATION REPORT — COMMERCE

**Date:** 2026-10-03  
**Status:** AUDIT COMPLETE — RECONCILIATION NOT YET APPLIED  
**Scope:** `06-SPECIFICATIONS/CANONICAL/02-COMMERCE-SPEC.md`

## 1. Purpose

Audit the Commerce specialized specification against the Owner rulings propagated through OR-B2 and OR-B3.

This report does not approve the Technical Specification and does not authorize implementation.

## 2. Findings

| ID | Area | Current document condition | R4 classification | Required treatment |
|---|---|---|---|---|
| R4-COM-001 | Customer | Customer/User separation and optional link are already documented | CONSISTENT | Preserve; update matching wording per OR-B3 |
| R4-COM-002 | Customer/User matching | Older same-email matching remains OPEN | SUPERSEDED | State detection/proposal + controlled association; no automatic email-only link |
| R4-COM-003 | Product | Historical wording says Product is offered by Tenant | SUPERSEDED | Canonical model: global Product + BusinessProduct for Business commercial configuration |
| R4-COM-004 | Product fields | SKU/price/visibility governance remains broadly proposed/open | CONSISTENT WITH OPEN DETAIL | Keep global-vs-Business field allocation open except where explicitly ruled |
| R4-COM-005 | Cart | Older text leaves holder without Customer open | SUPERSEDED | Cart may exist without Customer; Customer required before Order |
| R4-COM-006 | Order vs Sale | Historical text says distinction is unverified | SUPERSEDED | Order and Sale are distinct conceptual entities |
| R4-COM-007 | Sale birth | Historical text says relationship is not decided | SUPERSEDED | Sale is born at commercial confirmation/acceptance; delivery is not the trigger |
| R4-COM-008 | Order confirmation | Still described as open | SUPERSEDED | Commercial confirmation is a Business-authorized action governed by `ORDER_CONFIRM`; Customer intent does not grant Business authorization |
| R4-COM-009 | Stock reservation | Historical wording references AS-IS confirmation behavior | SUPERSEDED | Confirmed Order reserves stock |
| R4-COM-010 | Physical stock decrement | Previously open | SUPERSEDED | Physical decrement is represented by a registered stock-out movement corresponding to actual stock exit |
| R4-COM-011 | Sale immutability | Historical TO-BE rule was not determinable | SUPERSEDED | Confirmed Sale is immutable; corrections through cancellation/reversal/refund with traceability |
| R4-COM-012 | Returns/Refunds | Previously open / partially attributed to old decisions | SUPERSEDED IN DIRECTION | Commerce TO-BE includes Returns/Refunds; detailed state machine and implementation remain open |
| R4-COM-013 | Pricing/Promotions | Proposed/open | SUPERSEDED IN SCOPE | Included in Commerce TO-BE; detailed rules remain open |
| R4-COM-014 | Inventory rotation | Cross-reference was not canonicalized | SUPERSEDED IN DIRECTION | FEFO for expiring products; FIFO for non-expiring products |
| R4-COM-015 | Locations | Historical open | SUPERSEDED | Generic Location; MAIN minimum; multiple Locations permitted |
| R4-COM-016 | Negative stock | Not established in old Commerce text | SUPERSEDED | Negative stock is not allowed |
| R4-COM-017 | Accounts Receivable | Current section treats AR as proposed/open | SUPERSEDED | AR/Cuentas Corrientes is included in MVP; detailed financial rules remain open |
| R4-COM-018 | Payment states | Open | CONSISTENT | Remains open; no new state machine is invented |
| R4-COM-019 | Cash sensitive operations | Cross-domain only | SUPERSEDED IN DIRECTION | Sensitive Cash operations require specific Permissions; detailed catalog/rules remain open |
| R4-COM-020 | Fulfillment | Not fully integrated | SUPERSEDED | Fulfillment is included in MVP under Orders; Repartidor is not an MVP Membership Role |
| R4-COM-021 | Messaging Customer without User | Historical cross-reference remains open | SUPERSEDED | Customer may participate in commercial Conversation without a User |
| R4-COM-022 | Tenant isolation / authorization | Document uses Tenant terminology and generic open wording | RECONCILE | Business is canonical; authorization follows Membership → Role → Permission; technical enforcement remains open |

## 3. Canonical Commerce model after OR-B3

The conceptual Commerce chain is:

`Customer → Cart → Order → commercial confirmation → Sale`

with these constraints:

- Cart may exist without Customer.
- Customer is required before an Order is created.
- Customer may exist without User.
- Order and Sale are distinct.
- Commercial confirmation is Business-side and requires `ORDER_CONFIRM`.
- Sale is created at commercial confirmation, not at delivery.
- Confirmed Sale is immutable.
- Corrections use cancellation/reversal/refund with traceability.
- Confirmed Order reserves stock.
- Physical stock decrement occurs through a stock-out movement representing actual stock exit.
- Negative stock is not allowed.
- Returns/Refunds belong to Commerce TO-BE.
- Pricing/Promotions belong to Commerce TO-BE.
- AR/Cuentas Corrientes is included in MVP.
- Fulfillment is part of Orders/MVP; Repartidor is not an MVP Membership Role.

## 4. Product model

Canonical direction:

`Product (global identity) → BusinessProduct (Business commercial configuration)`

The ruling does not close every field allocation.

Therefore:
- global Product identity is decided;
- Business-specific commercial configuration is decided;
- exact physical model remains open;
- detailed global-vs-Business field governance remains open unless separately specified.

No stock or Business-specific price should be inferred as a global Product property.

## 5. Remaining Commerce open areas

This audit does not close:

- Order state machine;
- detailed Order attributes;
- detailed permission catalog;
- exact `ORDER_CONFIRM` enforcement implementation;
- payment state model;
- payment method contracts;
- AR financial rules and accounting treatment;
- pricing rule hierarchy;
- promotion combinations;
- returns/refunds state machines;
- cancellation/reversal/refund mechanisms;
- detailed fulfillment workflow;
- Location physical model;
- Product/BusinessProduct physical schema;
- Customer lifecycle and physical Customer↔User association;
- Business isolation mechanism;
- implementation transaction boundaries.

## 6. Evidence status

- **VERIFICADO POR REPOSITORIO:** current Commerce SPEC.
- **VERIFICADO POR REPOSITORIO:** OR-B3 propagation report.
- **VERIFICADO POR REPOSITORIO:** Decision Register OR-B2/OR-B3 state.
- **DOCUMENTADO:** R4 Commerce findings.
- **NOT VERIFIED BY CODE:** this is a documentary reconciliation audit; no implementation claim is made.

## 7. Conclusion

**R4 Commerce audit: COMPLETE.**

The current Commerce specialized specification is not yet canonical-clean. OR-B2/OR-B3 already provide the necessary Owner rulings for the identified conflicts.

The next controlled operation is to reconcile the Commerce SPEC while preserving historical traceability and keeping unresolved technical details explicitly open.

**TECHNICAL SPECIFICATION = NOT APPROVED**

**IMPLEMENTATION = NOT AUTHORIZED**
