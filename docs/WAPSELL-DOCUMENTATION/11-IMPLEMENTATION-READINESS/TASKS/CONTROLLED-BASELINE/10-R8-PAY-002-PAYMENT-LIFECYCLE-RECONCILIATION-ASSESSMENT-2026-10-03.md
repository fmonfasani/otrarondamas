# WAPSELL — R8-PAY-002 ASSESSMENT — PAYMENT LIFECYCLE AND RECONCILIATION

**Fecha:** 2026-10-03  
**Task:** R8-PAY-002  
**Estado:** READY FOR OWNER DECISION  
**Implementation:** NOT AUTHORIZED

## 1. Objective

Define the conceptual Payment lifecycle and reconciliation boundary independently from Sale, using verified AS-IS evidence and the Owner decisions already closed.

This task does not decide external provider API details, Cash effects, AR allocation mechanics, schema, migrations or implementation.

## 2. Canonical boundaries already closed

The following are already authoritative:

- Payment is distinct from Sale.
- Payment does not determine whether a Sale exists or its lifecycle.
- A Sale may exist with no payment, partial payment or outstanding receivable.
- Cash and Accounts Receivable have separate responsibilities.
- Sensitive Cash operations require specific Permissions.
- Cross-domain Payment↔Cash and AR effects remain OPEN.
- External provider details remain OPEN.

## 3. AS-IS evidence

### Payment model

The current Prisma model `Pago` contains:

- Business/Empresa scope;
- optional User/Usuario responsible for registration;
- optional Sale reference;
- optional debt/current-account reference;
- amount;
- payment method;
- `EstadoPago`;
- commission;
- cash change fields;
- external/reference field;
- optional Order reference;
- payment-application records.

### AS-IS Payment states

The current enum is:

`PENDIENTE`, `EN_PROCESO`, `APROBADO`, `RECHAZADO`, `CANCELADO`, `REEMBOLSADO_PARCIAL`, `REEMBOLSADO_TOTAL`.

These values are AS-IS evidence. They are not automatically canonical TO-BE states.

### AS-IS service behavior

The current Payment service:

- registers manual payments for confirmed Sales;
- supports `efectivo`, `transferencia` and `QR`;
- records manual payments directly as `APROBADO`;
- rejects payment amounts above the current Sale balance;
- calculates approved paid amount from existing payments;
- creates a Cash movement for cash payments only when a cash opening exists;
- does not implement Mercado Pago;
- does not implement refunds;
- does not implement reconciliation;
- does not implement the documented AR/debt-payment flow in this service.

Therefore the AS-IS implementation is a partial operational model, not a complete Payment lifecycle.

## 4. OWNER DECISIONS REQUIRED

### Decision A — Payment lifecycle vocabulary

**A1 — Retain the existing AS-IS vocabulary as the starting lifecycle, with semantic reconciliation**

Retain:

`PENDIENTE → EN_PROCESO → APROBADO`

with alternative outcomes:

`RECHAZADO`, `CANCELADO`, `REEMBOLSADO_PARCIAL`, `REEMBOLSADO_TOTAL`.

The exact legal/technical transition graph remains specialized work.

**A2 — Replace it with a new canonical lifecycle vocabulary**

Define a new state model independently and treat all current enum values as migration evidence.

**Recommendation: A1.**

The existing vocabulary already distinguishes pending, processing, approval, rejection, cancellation and refunds. Replacing it would add transformation cost without evidence of a semantic contradiction.

---

### Decision B — Manual payment confirmation

**B1 — Manual payments may become APROBADO at controlled registration**

For trusted/manual methods such as cash, transfer and QR, the Payment may be recorded as approved when the Business records the payment, subject to the applicable authorization and operational rules.

External provider payments can follow a different asynchronous lifecycle.

**B2 — All payments must start pending**

Every payment starts `PENDIENTE` and requires a separate approval operation.

**Recommendation: B1.**

This preserves verified AS-IS behavior for manual payments while leaving external provider confirmation asynchronous.

---

### Decision C — Payment vs Sale

**C1 — Payment lifecycle is independent**

A Payment may move through its lifecycle without changing the existence or lifecycle of the Sale.

Examples:

- Sale confirmed + no Payment;
- Sale confirmed + Payment approved;
- Sale confirmed + Payment partially refunded.

**C2 — Payment completion closes the Sale**

The Sale cannot be considered complete until payment is fully approved.

**Recommendation: C1.**

C2 conflicts with the already-approved Order/Sale and Payment boundaries.

---

### Decision D — Partial payment

**D1 — Partial payment is valid**

Multiple Payments may cumulatively settle a Sale.

Conceptually:

`Total Sale = Payment 1 + Payment 2 + ... + Outstanding balance`.

The exact AR representation remains specialized.

**D2 — A Sale must be paid in one Payment**

This would prevent partial settlement.

**Recommendation: D1.**

The AS-IS service already calculates accumulated approved payments and remaining balance, providing direct evidence for partial settlement behavior.

---

### Decision E — Overpayment

**E1 — Reject overpayment by default**

A Payment cannot exceed the applicable outstanding amount unless a separate approved credit/surplus rule exists.

The current AS-IS service already rejects payment amounts above the Sale balance.

**E2 — Permit overpayment and create customer credit**

The excess becomes a credit balance for the Customer.

**Recommendation: E1.**

The credit/surplus mechanism is not currently specified. E2 would invent an AR/credit rule.

---

### Decision F — Refund/reversal relationship

**F1 — Refund/reversal is an explicit Payment operation**

A refund does not mutate the historical Payment amount as if it never existed.

The existing conceptual states `REEMBOLSADO_PARCIAL` and `REEMBOLSADO_TOTAL` may represent resulting Payment status, while the exact refund transaction/effect model remains OPEN.

**F2 — Edit or delete the original Payment**

The original Payment is modified/deleted to represent the refund.

**Recommendation: F1.**

This preserves financial traceability and is consistent with the immutable/corrective approach already established for confirmed Sales.

---

### Decision G — Payment-to-AR application

**G1 — Payment and AR application remain distinct**

A Payment represents the receipt/collection event.

An AR application represents how that Payment is allocated to a specific debt/obligation.

Therefore:

`Payment ≠ AR Application`.

**G2 — Payment directly equals debt settlement**

Every Payment is inherently an AR settlement.

**Recommendation: G1.**

The AS-IS schema already contains both `Pago` and `AplicacionPago`, providing direct structural evidence for the distinction.

Exact allocation rules remain R8-PAY-003 / AR work.

---

### Decision H — Reconciliation boundary

**H1 — Payment reconciliation is its own lifecycle/capability**

Payment reconciliation verifies that Payment records and external/manual confirmation evidence are consistent.

It does not implicitly mean Cash reconciliation or AR reconciliation.

**H2 — One global reconciliation process**

Payment, Cash and AR reconciliation are treated as one process.

**Recommendation: H1.**

The contracts currently identify Payment↔Cash as an OPEN boundary. H2 would collapse distinct responsibilities without evidence.

## 5. Recommended Owner ruling

| Decision | Recommendation |
|---|---|
| A | **A1 — retain AS-IS Payment vocabulary with semantic reconciliation** |
| B | **B1 — controlled manual payments may be approved at registration** |
| C | **C1 — Payment lifecycle independent from Sale** |
| D | **D1 — partial payment allowed** |
| E | **E1 — reject overpayment by default** |
| F | **F1 — refund/reversal as explicit traceable operation** |
| G | **G1 — Payment distinct from AR application** |
| H | **H1 — Payment reconciliation remains distinct** |

## 6. Explicitly NOT closed by this task

Even if A1–H1 are accepted, the following remain OPEN:

- exact Payment transition graph;
- exact authorization requirements;
- exact payment-method catalogue;
- Mercado Pago integration mode;
- external webhook semantics;
- idempotency mechanism;
- external reconciliation rules;
- refund transaction model;
- Payment↔Cash economic effects;
- AR allocation rules;
- Cash reconciliation;
- accounting effects;
- tax effects;
- migration/cutover;
- physical persistence details;
- API/event contracts.

## 7. Evidence classification

| Statement | Classification |
|---|---|
| Payment model exists AS-IS | VERIFIED BY CODE |
| Current Payment states | VERIFIED BY CODE |
| Manual payments are registered as APROBADO | VERIFIED BY CODE |
| Current service rejects overpayment | VERIFIED BY CODE |
| Current service accumulates approved payments | VERIFIED BY CODE |
| Current service does not implement Mercado Pago | VERIFIED BY CODE |
| Current service does not implement refunds/reconciliation | VERIFIED BY CODE |
| Payment separate from Sale | DOCUMENTED / OWNER APPROVED |
| Payment does not determine Sale state | DOCUMENTED / OWNER APPROVED |
| Payment↔Cash exact boundary | OPEN |
| AR allocation rules | OPEN |
| External provider lifecycle | OPEN |

## 8. Gate

**R8-PAY-002: READY FOR OWNER DECISION.**

No code, schema, migration, data or infrastructure was modified.
