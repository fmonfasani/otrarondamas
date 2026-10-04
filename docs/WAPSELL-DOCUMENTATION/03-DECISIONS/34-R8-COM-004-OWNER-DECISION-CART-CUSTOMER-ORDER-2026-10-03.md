# WAPSELL — R8-COM-004 OWNER DECISION — CART → CUSTOMER → ORDER BOUNDARY

**Fecha:** 2026-10-03  
**Task:** R8-COM-004  
**Decision:** CLOSED — OWNER APPROVED  
**Implementation:** NOT AUTHORIZED

## 1. Owner ruling

The Owner accepts the canonical Cart → Customer → Order boundary.

## 2. Approved behavior

1. A Cart may exist without a Customer.
2. A Customer becomes mandatory before an Order is created.
3. A Customer may exist without a User.
4. A Cart associated with a Customer may optionally carry a User association.
5. The commercial Customer identity remains distinct from global User identity.
6. Customer↔User association is controlled; matching by email alone does not automatically establish the association.
7. Order creation and confirmation remain distinct operations.
8. Order confirmation remains a Business-authorized operation governed by `ORDER_CONFIRM`.
9. This task does not collapse Order into Sale.
10. Sale remains born at commercial confirmation according to the approved Commerce boundary.

## 3. Anonymous Cart

The anonymous Cart is a pre-order interaction state.

It does not authorize:

- Order creation without Customer;
- Business-scoped persistence outside the applicable Business Context;
- commercial confirmation.

## 4. Explicit non-approval

This decision does not define:

- physical Cart schema;
- anonymous Cart identifier mechanism;
- session/cookie mechanism;
- exact Customer creation workflow;
- exact Order state machine;
- API endpoints;
- database constraints;
- persistence technology.

Those remain downstream implementation/specification details.

## 5. Evidence

- DOCUMENTADO: OR-B2-007 canonical Cart rule.
- DOCUMENTADO: OR-B3-007 canonical anonymous Cart rule.
- DOCUMENTADO: OR-B2-004 Customer/User distinction.
- DOCUMENTADO: OR-B3-002 controlled Customer↔User association.
- DOCUMENTADO: OR-B2-012 Order/Sale distinction.
- DOCUMENTADO: OR-B3-006 ORDER_CONFIRM authorization.

**R8-COM-004: CLOSED — OWNER APPROVED.**
