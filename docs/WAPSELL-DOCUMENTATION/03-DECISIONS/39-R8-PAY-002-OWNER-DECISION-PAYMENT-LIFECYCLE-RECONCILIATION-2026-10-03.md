# WAPSELL — R8-PAY-002 OWNER DECISION — PAYMENT LIFECYCLE AND RECONCILIATION

**Fecha:** 2026-10-03  
**Task:** R8-PAY-002  
**Estado:** CLOSED — OWNER APPROVED  
**Owner ruling:** A1–H1 accepted in full.

## Owner-approved decisions

- **A1:** Retain the AS-IS Payment state vocabulary as the transformation starting point, with semantic reconciliation.
- **B1:** Manual payments may become `APROBADO` at controlled registration; external-provider payments may follow an asynchronous lifecycle.
- **C1:** Payment lifecycle is independent from Sale existence and Sale lifecycle.
- **D1:** Partial payment is valid; multiple Payments may cumulatively settle a Sale.
- **E1:** Overpayment is rejected by default; customer-credit/surplus behavior is not implicitly introduced.
- **F1:** Refund/reversal is an explicit, traceable Payment operation; the original Payment is not treated as if it never existed.
- **G1:** Payment and AR application remain distinct concepts: `Payment ≠ AR Application`.
- **H1:** Payment reconciliation is a distinct capability/lifecycle and is not implicitly Cash or AR reconciliation.

## Authority and limits

These decisions are Owner-approved conceptual/domain direction.

They do **not** approve:
- exact state-transition graph;
- exact permission catalogue or enforcement for Payment operations;
- Mercado Pago integration mode, webhook protocol or credentials;
- idempotency mechanism;
- external reconciliation algorithm;
- refund persistence/transaction model;
- Payment↔Cash economic effects;
- AR allocation rules;
- Cash reconciliation;
- accounting/tax effects;
- schema, migration, API/event contracts or implementation.

**Implementation remains NOT AUTHORIZED.**
