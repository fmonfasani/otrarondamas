# ADM-004 — Balance Invariants and Financial Source of Truth

**Status:** TECHNICAL RECONCILIATION — PROPOSED / OWNER-FINANCE APPROVAL REQUIRED  
**Date:** 2026-10-21  
**Scope:** Current-account balances and debt collection across `CuentaCorriente`, `Deuda`, `Pago`, `AplicacionPago`, and operational `MovimientoCaja`.  
**Baseline:** `main` at `0388abd95f498f3e3505c9b2f1c3716b5620a62a`  
**Authority:** Evidence-backed working document. It does not approve accounting policy, lifecycle transitions, schema changes, endpoints, migrations, or implementation.

## 1. Executive finding

The current Prisma schema contains models for current accounts and debt allocation, but repository documentation says the accounts-receivable/debt-collection flow is not implemented by an executable service. Therefore, **there is no verified operational source of truth for customer receivable balances yet**. A field named `saldo` or `montoPendiente` is not, by itself, evidence of a maintained balance.

This work is a specification/reconciliation step only. It intentionally does not modify application behavior.

## 2. Verified AS-IS model facts

Inspected `apps/api/prisma/schema.prisma` on `main`.

| Model | Fields / relations verified in schema | What this proves | What it does not prove |
|---|---|---|---|
| `CuentaCorriente` | `empresaId`, `clienteId`, `saldo Decimal @default(0)`; unique `[empresaId, clienteId]`; relations to `Deuda[]` and `Pago[]`. | One current-account row per Business/customer pair is structurally permitted; a stored saldo field exists. | No verified calculation, posting lifecycle, or reconciliation rule for `saldo`. |
| `Deuda` | `empresaId`, `clienteId`, optional `ventaId`, `montoTotal`, `montoPendiente`, optional `fechaVencimiento`, optional `cuentaCorrienteId`, relation to `AplicacionPago[]`. | A debt can be associated with a customer, optionally a sale and current account; total and pending amounts are stored. | No verified rules for creation, partial payment, settlement, cancellation, credit note, overdue status, or synchronizing `montoPendiente`. |
| `Pago` | `empresaId`, optional `ventaId`, `deudaId` relation to `CuentaCorriente?`, `monto`, `medio`, `estado`, `comision`, optional cash/change/reference fields; relation to `AplicacionPago[]`. | A payment may be associated with a sale and/or current account, and has a state. | Field name `deudaId` is ambiguous because it points to `CuentaCorriente`, not `Deuda`; payment state semantics and allocation eligibility are not established by the schema. |
| `AplicacionPago` | `pagoId`, `deudaId` referencing concrete `Deuda`, `montoAplicado`; unique `[pagoId, deudaId]`. | The model can record an amount of a payment applied to a specific debt, with at most one row per payment/debt pair. | No verified enforcement that payment/debt belong to the same Business, that the payment is eligible, or that applied amounts reconcile with stored balances. |
| `MovimientoCaja` | `cajaId`, optional `aperturaCajaId`, `tipo`, `monto`, optional `referenciaId`, timestamps and actor. | Cash movements are a separate operational record with a free-text type and optional reference. | A cash movement is not automatically an accounting entry, payment, recognized revenue, or receivable settlement. |
| `Venta` | `empresaId`, `clienteId?`, `estado`, `total`, `descuento`, `idempotencyKey`; relations to payments and debts. | Sales may be related to payment and debt records. | Sale total alone does not establish amount collected, amount due, recognized income, or cash movement. |

## 3. Current contract boundary

The existing repository inventory records that `CuentaCorriente`, `Deuda`, and `AplicacionPago` are not currently used by a debt-collection service. It also identifies the semantics of `Pago.deuda` as unresolved. See:

- [Admin Web / Figma Screen Specification](./01-ADMIN-WEB-FIGMA-SCREEN-SPEC-v0.1.md), B14 Finance reconciliation: Finance/current-account collection is not implemented; schema presence is not executable capability.
- [Policy/backlog reconciliation](../../09-TRANSFORMATION/28-POLICY-BACKLOG-RECONCILIATION-2026-10-04.md), BL-08: `Pago.deuda` is ambiguous and requires a decision.
- [Payments service](../../../../apps/api/src/payments/payments.service.ts): current manual sale-payment scope; cash-register limitations must be treated separately.
- [Sales service](../../../../apps/api/src/sales/sales.service.ts): current sale lifecycle.
- [Cash register service](../../../../apps/api/src/cash-register/cash-register.service.ts): operational cash flow.

**Important distinction:** a successful CI run for existing API and cash tests does not prove an unimplemented receivables workflow.

## 4. Candidate invariants — not approved accounting policy

The following are proposed properties that any implementation should be able to prove once Owner/Finance approves the business semantics. They are not authorization to implement the flow now.

### INV-AR-01 — Non-negative principal and pending balance
For ordinary debt collection, `montoTotal >= 0` and `0 <= montoPendiente <= montoTotal`. Any credit balance, write-off, refund, or adjustment that could violate these bounds must have an explicitly approved representation rather than silently forcing values.

### INV-AR-02 — Allocation conservation
For each eligible payment, the sum of its valid allocations must not exceed the amount available for allocation. Define whether fees/commission, change, failed/pending payment states, and sale-linked payment amounts affect the allocatable amount before implementing the invariant.

### INV-AR-03 — Debt reconciliation
For each debt, the pending amount must reconcile to the approved original amount plus/minus approved adjustments and reversals, less valid settled allocations. The exact event set, ordering, and reversal semantics are **OPEN**.

### INV-AR-04 — Current-account reconciliation
If `CuentaCorriente.saldo` is retained as a materialized balance, it must equal the aggregate defined by the approved debt/credit policy for the same Business/customer. Otherwise, derive the balance from authoritative entries and do not treat the stored field as authoritative. Owner/Finance must choose the model before implementation.

### INV-AR-05 — Business and customer consistency
Every debt, payment, allocation, current account, sale, and cash movement participating in a financial operation must be verified against the same active Business context and valid relationship chain on the server. Client-provided IDs are not authority.

### INV-AR-06 — Atomicity and concurrency
Payment acceptance, allocation creation, debt pending-balance updates, and any materialized account-balance update must commit atomically or be recoverable by a documented reconciliation mechanism. Concurrent collections must not over-apply a debt.

### INV-AR-07 — Idempotency and duplicate delivery
Retries of the same payment/collection command must not create duplicate accepted payments, duplicate allocations, or duplicate cash movements. The idempotency key/scope and replay response are **OPEN**.

### INV-AR-08 — Reversal traceability
A reversal/cancellation must preserve traceability to the original payment/allocation and must not silently erase historical financial facts. Whether reversals are represented by status transitions, compensating records, or both requires approval.

### INV-AR-09 — Separation of domains
Cash on hand, payments received, receivables outstanding, sales value, and recognized income are different measures. No dashboard/report may substitute one for another without an approved definition and source.

### INV-AR-10 — Decimal precision and currency
All monetary calculations must use the approved decimal precision and a single documented currency/rounding policy. Multi-currency support, if any, is not established by this schema and remains out of scope until specified.

## 5. Decisions required before implementation

| Decision ID | Question to resolve | Why it blocks implementation | Owner needed |
|---|---|---|---|
| AR-D-01 | Is `CuentaCorriente.saldo` a materialized balance or a derived display value? | Determines write path, reconciliation and race conditions. | Owner + Finance/Product |
| AR-D-02 | Does a debt arise only from an explicitly approved credit sale, or from other flows? Which Sale states qualify? | Prevents duplicate or premature debt creation. | Owner + Sales/Finance |
| AR-D-03 | What exactly does `Pago.deudaId` mean, given its FK targets `CuentaCorriente` while `AplicacionPago.deudaId` targets `Deuda`? | Ambiguous data contract and relation naming. | Owner + domain maintainer |
| AR-D-04 | Which payment states are allocatable/settled, and what are the semantics of `PENDIENTE`, confirmation, failure, and reversal? | Allocation cannot rely on a schema enum alone. | Owner + Payments |
| AR-D-05 | Can one payment cover multiple debts? Can one debt be paid by multiple payments? | Determines allocation and unique-key behavior. | Owner + Finance |
| AR-D-06 | What is the policy for overpayment, unallocated credit, customer credit balance, and change? | Prevents silent excess/negative balances. | Owner + Finance |
| AR-D-07 | How do cancellation, refund, chargeback, partial refund, and debt adjustment affect allocations and balances? | Reversal policy must be coherent across Sale, Payment, Cash and AR. | Owner + Sales/Payments/Finance |
| AR-D-08 | Which events create cash movements, and how are no-open-register cases handled? | Prevents divergence between accepted payment and physical cash record. | Owner + Cash/Payments |
| AR-D-09 | Which currency, rounding and due-date/time-zone rules apply? | Required for exact balances, overdue reports and reconciliation. | Owner + Finance |
| AR-D-10 | Is an audit ledger required for every financial adjustment, who may authorize it, and can records ever be edited/deleted? | Determines controls and auditability. | Owner + Security/Finance |

## 6. Required transaction/test matrix

These are acceptance tests to write after decisions are approved; this document does not claim that these tests already exist or passed.

| Case | Required assertion |
|---|---|
| New debt | Debt is created only for an approved trigger/state, in the same Business as its customer and optional sale. |
| Partial collection | Valid allocation reduces pending debt by exactly the applied amount; totals reconcile. |
| Full settlement | Pending debt reaches zero exactly once; repeated command is idempotent. |
| Allocation exceeds payment | Rejected atomically; no partial side effects remain. |
| Allocation exceeds debt pending | Rejected or handled by the explicitly approved overpayment policy. |
| Payment pending/failed | Cannot reduce receivable unless the approved state policy explicitly permits it. |
| Duplicate request/retry | No duplicate payment, allocation, or cash movement. |
| Concurrent collectors | Combined accepted allocations cannot exceed the permitted amount; account/debt balances remain consistent. |
| Cross-Business IDs | Foreign customer, debt, payment, sale, account or cash register is denied without leakage or mutation. |
| Cancellation/refund/reversal | Original facts remain traceable; compensating effects reconcile all affected domains. |
| Cash register closed | Behavior matches the approved policy; no silent gap between payment state and cash evidence. |
| Reconciliation | Independently recomputed aggregate matches every materialized balance, or a documented discrepancy is surfaced. |
| Decimal boundaries | Rounding and precision follow the approved currency policy without floating-point drift. |

## 7. Definition of Ready for implementation

ADM-004 is ready only when:

1. AR-D-01 through AR-D-10 are decided or explicitly marked out of scope with Owner approval.
2. An approved state/effect matrix defines Sale, Payment, Debt, Allocation, Cash and reversal boundaries.
3. The source of truth for customer balance is selected: derived aggregate or materialized balance with reconciliation.
4. Tenant consistency, authorization, atomicity, idempotency and concurrency behavior are specified.
5. The transaction/test matrix maps to automated tests and CI workflows.
6. Any schema/API changes are separately reviewed and authorized.
7. Existing records and migration/backfill/reconciliation strategy are understood before writing financial data.

## 8. Recommended next step

Complete a focused AS-IS trace through `PaymentsService`, `SalesService`, and `CashRegisterService`, including their tests, to produce a source-to-side-effect matrix. Then take the ten open decisions to Owner/Finance review. Do not implement AR writes, schema changes, or dashboard financial totals until that review is recorded.

## 9. Validation boundary

- **Verified by schema inspection:** fields, relations and unique constraints described in §2.
- **Documented repository finding:** AR/debt collection service is not implemented; `Pago.deuda` semantics remain ambiguous.
- **Not verified in this task:** runtime behavior of all referenced services, execution of existing tests, production data consistency, accounting policy, and whether any external/manual process maintains these balances.
- **No code, schema, migration, or production data changed.**
