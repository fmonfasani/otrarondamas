# WAPSELL — R8-PAY-003 OWNER DECISION — PAYMENT ↔ CASH / AR EFFECTS

**Fecha:** 2026-10-03  
**Task:** R8-PAY-003  
**Estado:** CLOSED — OWNER APPROVED

## Owner-approved decisions

- **A1:** A Payment approved may produce a Cash effect according to the payment method and applicable Cash boundary.
- **B3:** The timing of Cash impact depends on the payment method and its confirmation/evidence semantics.
- **C1:** Payment and AR application remain separate operations.
- **D1:** A Payment may be applied totally or partially to one or more applicable AR obligations, subject to specialized allocation rules.
- **E1:** A Payment may exist without creating an AR obligation.
- **F2:** A partial Payment does not automatically imply creation of AR; whether an outstanding amount becomes AR belongs to the Commerce/AR business rule.
- **G1:** A refund may produce the corresponding compensating Cash effect when applicable.
- **H1:** Sale cancellation does not erase or directly mutate historical Payments; compensating effects are handled by the respective domains.

## Explicitly OPEN

These decisions do not close:

- exact Cash states and transitions;
- exact Cash movement model;
- exact payment-method catalogue;
- exact confirmation/evidence rules per method;
- bank/external reconciliation;
- Mercado Pago mechanics;
- AR debt-creation rules;
- AR allocation ordering/strategy;
- refund transaction model;
- Sale cancellation workflow;
- accounting/tax effects;
- API/event contracts;
- schema/migrations;
- implementation.

**Implementation remains NOT AUTHORIZED.**
