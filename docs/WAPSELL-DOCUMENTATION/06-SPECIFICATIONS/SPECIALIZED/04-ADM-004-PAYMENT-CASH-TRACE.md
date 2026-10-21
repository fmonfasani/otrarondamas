# ADM-004 — Payment / Sale / Cash Side-Effect Trace

**Status:** AS-IS RECONCILIATION — VERIFIED BY SOURCE INSPECTION; RUNTIME NOT VERIFIED  
**Date:** 2026-10-21  
**Baseline:** `main` at `0388abd95f498f3e3505c9b2f1c3716b5620a62a`  
**Scope:** Trace existing sale creation, payment recording and operational cash movements to prepare the ADM-004 Owner/Finance decisions.  
**Authority:** This is not an approved accounting policy and does not authorize code/schema changes.

## 1. Executive summary

The inspected code reveals two payment paths with materially different cash-register behavior:

1. `SalesService.createPayment()` — the newer sale-payment flow — rejects cash payments when there is no open register (`CAJA_CERRADA`), then creates a `Pago` and a `MovimientoCaja` inside a transaction.
2. `PaymentsService.create()` — the manual payment endpoint/service — creates an approved payment even when no cash opening exists; in that case it silently creates no cash movement.

This is a verified **source-level contract divergence**, not proof that both routes are exposed to the same actors or currently used by the UI. Controller routing, permissions and endpoint consumers must be checked before choosing a remediation. Do not normalize the behavior by editing one service without resolving route usage and the governing decision.

Separately, sale creation creates a confirmed `Venta` and inventory/audit side effects, but does not create a `Deuda` or `CuentaCorriente` record in the inspected creation path. The current balance returned by `SalesService` is derived as sale total minus approved payments. This is a **sale payment balance**, not evidence of a customer-wide accounts-receivable balance.

## 2. Source-to-side-effect matrix

| Operation | Verified source behavior | Transaction / atomicity evidence | Financial interpretation boundary |
|---|---|---|---|
| Create sale — `SalesService.create()` | Validates optional customer, resolves product/price/discount, calculates total with `Prisma.Decimal`, creates `Venta` in `CONFIRMADA` state with items, sequential number and idempotency key; creates an audit log in the transaction. | Sale and nested items plus audit are created inside a Prisma transaction. Idempotency key lookup occurs before the create transaction; concurrency behavior needs test/DB constraint review. | No debt or current-account posting is visible in the inspected create path. Do not infer a receivable from an unpaid sale without an approved rule. |
| Record sale payment — `SalesService.createPayment()` | Loads sale and approved payments; rejects missing/foreign sale and `ANULADA`; computes remaining sale balance using `Prisma.Decimal`; rejects payment beyond balance; cash requires an open register and validates received amount/change. | Payment plus cash movement are written inside a transaction (confirm full method and transaction isolation in implementation review). | Balance is per-sale total minus approved payments. It is not a customer AR ledger. |
| Record manual payment — `PaymentsService.create()` | Loads sale and its payments inside a transaction; sums `APROBADO`; rejects amount above sale balance; creates payment with `estado: APROBADO`. Cash creates a `MovimientoCaja` only if an open cash opening is found. | Payment and optional movement are inside one transaction. However, the current-opening check is not itself a documented locking/serialization contract. | A cash payment can be persisted without a matching cash movement if no opening exists. This can make payment totals and cash expected totals diverge. |
| Expected cash — `CashRegisterService.countCash()` | Calculates opening float + `Venta` cash movements + `DeudaCobro` movements + manual `Ingreso` - `Gasto`/`Retiro`. The code comments that debt collection is not implemented, so the debt-cash term remains zero. | Reads current opening and movements, then records cash count in a transaction. | Expected cash is an operational drawer reconciliation, not revenue, profit, total payments, or customer balance. |
| Register movement — `CashRegisterService.registerMovement()` | Requires a configured cash register and an open opening; records the movement with type, amount and description. | A single movement create; no link to payment unless caller's payload/business flow supplies one (the method itself does not create a payment). | Manual movement is not automatically a sale, payment, income recognition, or debt allocation. |
| Debt / current account | Prisma models exist, but the inspected service inventory documents no debt-collection service. | No executable write path verified in this trace. | `CuentaCorriente.saldo`, `Deuda.montoPendiente` and `AplicacionPago` cannot be declared maintained authoritative balances based on model presence. |

## 3. Critical divergence: cash paid while register is closed

| Path | Closed / missing cash opening | Result |
|---|---|---|
| `SalesService.createPayment()` | Calls `isCashRegisterOpen(companyId)`; throws `ConflictException('CAJA_CERRADA')`. | No payment should be created by the later transaction because the check fails before it begins. |
| `PaymentsService.create()` | Checks for an open opening, but does not throw if none exists. | Payment is created as `APROBADO`; no `MovimientoCaja` is created. |

**Risk:** if both paths are reachable, a sale may be fully/partially marked paid while the cash drawer ledger omits that collection. The expected-cash calculation cannot include a movement that was never recorded. This is not a claim of data corruption in production; production usage and existing records were not inspected.

**Required next verification:** inspect both controllers/routes, module wiring, frontend call sites and tests; identify whether these are duplicate public paths or intentionally different contracts. Then choose one approved behavior and add regression tests before changing code.

## 4. Balance definitions supported by the current source

| Measure | Current evidence | Can it be used as authoritative? |
|---|---|---|
| Sale remaining balance | Derived from `Venta.total - sum(Pago.monto where estado = APROBADO)` in inspected sale code. | For that sale's recorded approved payments, subject to the identified concurrency and route differences. Not a customer-wide balance. |
| Cash expected | Derived from opening float and categorized `MovimientoCaja` rows. | For cash movements that were actually recorded under the current opening; it omits cash payments that bypassed movement creation. |
| Customer current-account balance | `CuentaCorriente.saldo` field exists; no AR service was verified. | **No — not verified as maintained or reconciled.** |
| Debt outstanding | `Deuda.montoPendiente` field exists; no AR service was verified. | **No — not verified as maintained or reconciled.** |
| Recognized revenue / profit | No accounting posting or recognition rule established by this trace. | **No — not established by sale totals or cash movements alone.** |

## 5. Open decisions that remain

1. **Route authority:** which payment route is canonical for POS sale collection, and can the legacy manual endpoint remain callable?
2. **Closed register:** should every cash collection be rejected when the register is closed, or is there an approved exception workflow with explicit audit and later reconciliation?
3. **Atomic cash evidence:** must an approved cash payment and its cash movement always be created in one transaction? Proposed default: yes, unless an approved exception is modeled explicitly.
4. **Sale state eligibility:** confirm which Sale states may accept payment and how cancellation/reversal interacts with already-approved payments.
5. **Overpayment/rounding:** preserve exact Decimal precision and approve the tolerance policy; `SalesService` currently compares against balance plus `0.001`, while the other service compares directly against the numeric pending balance.
6. **Debt creation:** define whether/when a sale creates a `Deuda` and how that differs from the derived per-sale balance.
7. **Allocation:** define how a payment is allocated to one or multiple debts, and how duplicate, partial, failed and reversed payments affect allocations.
8. **Reconciliation:** define a safe report/recovery process for approved cash payments without linked `MovimientoCaja`, if historical cases exist.

These decisions must be recorded by Owner/Finance and reconciled with the decision register and the approved Sales/Payments/Cash contracts. This document does not close them.

## 6. Tests required before any remediation

- Both payment routes: cash with open register creates exactly one approved payment and one matching movement.
- Both payment routes: cash with no register/opening follows the approved behavior and cannot silently create a paid-without-cash-evidence state.
- Transfer/QR creates no physical cash movement.
- Payment over the per-sale balance is rejected without side effects.
- A failed transaction leaves neither payment nor movement.
- Concurrent requests cannot over-collect a sale.
- Foreign-business sale/payment/register identifiers cannot mutate data.
- Repeated request/retry cannot duplicate payment or movement.
- Sale cancellation/refund preserves traceability and reconciles the approved payment/cash policy.
- Cash count equals the approved formula for all supported movement types.
- If a reconciliation repair path is approved, it is idempotent and audited.

## 7. Evidence boundary

**Verified by source inspection:** service behavior summarized above in `apps/api/src/payments/payments.service.ts`, `apps/api/src/sales/sales.service.ts`, and `apps/api/src/cash-register/cash-register.service.ts`, plus schema fields described in `03-ADM-004-BALANCE-INVARIANTS.md`.

**Not verified in this task:** controller route exposure, active frontend call sites, execution of existing tests, runtime transaction isolation under concurrent load, production records, and accounting/Owner policy.

**No application code, schema, migrations, or production data changed.**


## 8. Additional controller finding: duplicate route declaration

After tracing the services, the controllers were inspected too:

- `PaymentsController`: `@Controller('ventas/:ventaId/pagos')` + `@Post()` → `POST /ventas/:ventaId/pagos`, delegates to `PaymentsService.create()`.
- `SalesController`: `@Controller('ventas')` + `@Post(':id/pagos')` → the same HTTP path `POST /ventas/:id/pagos`, delegates to `SalesService.createPayment()`.

Both handlers also declare `@RequirePermission('ventas.crear')` and the `ApprovedDossierGuard` controller guard. This makes the divergence more concrete: **the repository declares two POST handlers for the same route template**. The actual route selected/registered by Nest depends on framework/module registration details and must not be guessed from source alone.

### Immediate priority

Treat this as **P0 route ambiguity / payment integrity risk**. Before changing behavior:

1. Inspect module imports/provider registration and boot logs to establish whether both controllers are registered together and how Nest resolves the duplicate route.
2. Check API bootstrap/route mapping in CI or a local environment; capture the effective handler for `POST /ventas/:id/pagos`.
3. Identify frontend call sites and request DTO differences (`CreatePaymentDto` vs `CreateSalePaymentDto`), including cash received/change/reference fields.
4. Decide which service/contract is canonical, or whether one route should be removed/versioned after Owner/domain review.
5. Add HTTP regression tests proving the effective route, closed-register behavior, amount validation, and exactly-one payment plus exactly-one cash movement.

Do not simply delete either controller or change the cash policy without confirming route consumers and contract compatibility.


## 9. Frontend call-site confirmation

The POS payment modal `apps/pos-admin/src/features/ventas/ModalCobro.tsx` calls `api.crearPago(ventaId, dto)`. The helper in `apps/pos-admin/src/lib/api.ts` sends that request to `POST /ventas/${ventaId}/pagos`. The modal uses the sale-payment DTO shape, including `montoRecibido` for cash and `referencia` for transfer/QR, and expects a response with `saldo` and `pago`.

This confirms that the **frontend currently targets the duplicated route template**, but it does not establish which controller handles it at runtime. The two controllers use different DTO and response contracts, so a route-resolution mismatch could surface as validation errors or a response-shape failure in the modal.

### Safe resolution plan

- Reproduce the registered route table using the same Nest application/module composition as CI.
- Add an HTTP-level test that submits the exact frontend payload and asserts the expected response contract.
- Verify both cash-open and cash-closed behavior against the selected canonical handler.
- Only then remove, relocate, or adapt one route. Preserve existing consumers or provide a deliberate compatibility migration; do not silently break the POS modal.


## 10. Module registration and DTO contract confirmed

The application module imports both `SalesModule` and `PaymentsModule`; their respective modules register `SalesController` and `PaymentsController`. Thus, both route declarations are included in the application module graph (source-level confirmation). The actual effective handler still requires runtime route inspection.

The DTOs are not equivalent:

- `CreatePaymentDto` accepts `medio` and `monto`.
- `CreateSalePaymentDto` accepts those fields plus optional `montoRecibido` and `referencia`.
- The POS sends `montoRecibido` for cash and `referencia` for transfer/QR, and expects the sale-payment response shape.

The legacy manual controller delegates to `PaymentsService` with the narrower DTO; the sale controller delegates to `SalesService` with the POS DTO. The frontend contract therefore aligns with the sale-specific service, but this is not enough by itself to authorize deleting or moving the legacy route: external API consumers have not been inventoried.

**Verification boundary:** connected repository tools can inspect source and CI metadata but cannot start the application or capture the live Nest route table in this session. No runtime handler selection is claimed.
