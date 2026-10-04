# Wapsell — Contracts / Payments & Cash
**Fase:** Contracts 4.0 — Payments + Cash · **Creado:** 2026-09-29 · **Estado:** DRAFT — NOT APPROVED

> Este documento formaliza únicamente las direcciones ya documentadas de D-011, D-012 y D-013.
> La frontera Payments ↔ Cash permanece abierta donde las fuentes no la definen.
>
> No crea decisiones, estados, schema, APIs, permisos, invariantes, tests ni implementación.

## 1. C-PAY-002 — External payment provider abstraction
**Source:** D-011.

Wapsell debe soportar proveedores externos de pago mediante una abstracción que desacople el
núcleo comercial de un proveedor concreto.

**Observable obligations**
- Mercado Pago es la integración prioritaria.
- Deben existir trazabilidad y estados del proceso externo cuando correspondan: autorización,
  aprobación, rechazo, cancelación y conciliación.
- Incorporar otro proveedor no debe exigir acoplar el núcleo comercial a la implementación
  específica del proveedor.

**Open:** API, checkout, webhooks, credentials, idempotency, reconciliation and exact state model.

## 2. C-PAY-003 — Payment traceability
**Source:** D-011.

Un pago externo debe conservar trazabilidad suficiente del proceso que corresponda.

No se define aquí el formato, persistence model, identifiers ni webhook protocol.

## 3. C-AR-002 — Accounts Receivable
**Source:** D-012.

Cuando una venta no queda completamente cancelada puede existir una obligación de cobro asociada
al Customer dentro del Business.

**Observable obligations**
- consultar saldos pendientes;
- registrar cobros posteriores;
- aplicar cobros a las obligaciones correspondientes;
- mantener trazabilidad de deuda, cobro y aplicación;
- permitir determinar el saldo del Customer según las operaciones registradas.

**Open:** debt states, allocation rules, credit rules and physical accounting model.

## 4. C-CASH-001 — Cash ownership and lifecycle
**Source:** D-013.

Cada Business gestiona sus propias cajas.

El lifecycle conceptual contractual es:

`Apertura → Operaciones/Movimientos → Arqueo → Cierre`

No se definen estados formales ni cardinalidad física.

## 5. C-CASH-002 — Cash movement attribution
**Source:** D-013.

Los movimientos de caja deben registrar, conceptualmente:

- Business;
- origen;
- importe;
- medio de pago;
- usuario responsable.

No se define el modelo físico ni el catálogo de medios de pago.

## 6. C-CASH-003 — Closed cash immutability
**Source:** D-013.

Una caja cerrada no se modifica directamente.

Las correcciones deben realizarse mediante una operación compensatoria o un mecanismo de ajuste
autorizado.

**Open:** exact adjustment mechanism and authorization semantics.

## 7. C-CASH-004 — Cash authorization boundary
**Source:** D-005, D-006, D-013.

La autorización de operaciones de Cash debe respetar el contexto Business/Membership cuando la
regla aprobada aplicable así lo determine.

**Importante:** la frase de D-013 sobre "operaciones sensibles" y permisos del Membership continúa
`OPEN DETAIL — PENDING OWNER RULING`. Este contrato **no la promueve a requisito aprobado** y
no define permisos de caja.

## 8. C-PAY-CASH-001 — Payments/Cash boundary
**Status: OPEN CONTRACT BOUNDARY**

Las fuentes disponibles no determinan:

- si un pago externo de D-011 genera un movimiento de Cash;
- si un cobro de AR de D-012 genera un movimiento de Cash;
- si la conciliación de Payments y la conciliación de Cash son el mismo proceso;
- cómo se relaciona una anulación de Sale con Cash.

No se inventa una frontera.

El único vínculo explícito de D-013 es que un movimiento de Cash registra el medio de pago.

## 9. Commerce boundaries

D-008 establece que la confirmación de Sale aplica efectos económicos y que una anulación
puede generar reversiones/ajustes sobre los dominios correspondientes. La matriz exacta de
efectos continúa abierta.

Por tanto:

- Commerce determina la frontera comercial.
- Payments determina el contrato de proveedor externo.
- AR determina obligaciones de cobro.
- Cash determina su propio lifecycle.
- La interacción exacta entre ellos requiere definición posterior.

## 10. AS-IS → GAP → DECISION → CONTRACT → OPEN DETAIL

| AS-IS / evidence | GAP | Decision | Contract | Open Detail |
|---|---|---|---|---|
| Pago existe AS-IS; no gateway externo | External provider direction | D-011 | C-PAY-002 | provider/API |
| Payment process lacks canonical external contract | Traceability direction | D-011 | C-PAY-003 | states/webhooks/idempotency |
| Cuenta corriente/deuda exists AS-IS | AR lifecycle not fully formalized | D-012 | C-AR-002 | debt/allocation |
| Caja has lifecycle AS-IS | TO-BE direction formalized | D-013 | C-CASH-001 | states/cardinality |
| MovimientoCaja exists | Required attribution | D-013 | C-CASH-002 | physical model/payment methods |
| Closed cash correction rules need formalization | Direct mutation prohibited | D-013 | C-CASH-003 | adjustment |
| Cash authorization is partially AS-IS and disputed in D-013 | No approved permission catalogue | D-005/D-006/D-013 | C-CASH-004 | owner ruling |
| Payments/Cash relationship unresolved | No Payments TO-BE exists | D-011/D-012/D-013 | C-PAY-CASH-001 | boundary |

## 11. Traceability

| Contract | Decision | TO-BE | Invariant | Test |
|---|---|---|---|---|
| C-PAY-002 | D-011 | 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-PAY-003 | D-011 | 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-AR-002 | D-012 | 02-COMMERCE | NOT CREATED | NOT CREATED |
| C-CASH-001 | D-013 | 04-CASH | NOT CREATED | NOT CREATED |
| C-CASH-002 | D-013 | 04-CASH | NOT CREATED | NOT CREATED |
| C-CASH-003 | D-013 | 04-CASH | NOT CREATED | NOT CREATED |
| C-CASH-004 | D-005/D-006/D-013 | 01-IDENTITY + 04-CASH | NOT CREATED | NOT CREATED |
| C-PAY-CASH-001 | D-011/D-012/D-013 | 02-COMMERCE + 04-CASH | NOT CREATED | NOT CREATED |

## 12. Open Details

1. Payment state model.
2. Mercado Pago API/webhook contract.
3. Payment idempotency.
4. Payment reconciliation.
5. AR debt lifecycle.
6. AR allocation rules.
7. Credit rules.
8. Cash formal states.
9. Cash cardinality per Business.
10. Cash adjustment mechanism.
11. Cash reconciliation.
12. Cash permission catalogue.
13. Definition of sensitive Cash operations.
14. Payments → Cash relationship.
15. AR collection → Cash relationship.
16. Payment reconciliation → Cash reconciliation relationship.
17. Sale cancellation → Cash effect.
18. Payment reversal/refund semantics.
19. Exact payment methods catalogue.
20. Physical models.

## 13. Evidence classification

| Statement | Classification |
|---|---|
| Mercado Pago is priority | DOCUMENTED — D-011 |
| Provider abstraction | DOCUMENTED — D-011 |
| AR by Business/Customer | DOCUMENTED — D-012 |
| Cash lifecycle | DOCUMENTED — D-013 |
| Closed cash cannot be directly modified | DOCUMENTED — D-013 |
| Cash ↔ Payments exact boundary | NOT DETERMINABLE |
| Exact payment states | NOT DETERMINABLE |
| Exact cash states | NOT DETERMINABLE |
| Concrete permissions | NOT DETERMINABLE / OWNER RULING PENDING |
| Payment API contract | NOT DETERMINABLE |

## 14. Closure

**Contracts 4.0 — Payments + Cash: drafted.**

The critical boundary remains explicitly OPEN. No undocumented coupling between external Payments,
AR and Cash was introduced.

No decision, invariant, test, schema, migration or implementation change was created.

**Next contract group:** Messaging.


---

# R5 Canonical Reconciliation — 2026-10-03

> Additive reconciliation against OR-B3 and the reconciled Cash TO-BE. Historical contract text above is retained for traceability.

## R5-CASH-001 — Sensitive Cash authorization

Sensitive Cash operations require specific Permissions.

This closes the conceptual authorization boundary. Exact permission names, permission-to-role mapping, thresholds and approval workflows remain OPEN.

## R5-CASH-002 — Cash boundary remains otherwise open

The following remain OPEN unless separately specified: formal Cash states, adjustment/compensation mechanics, Payment↔Cash effects, AR collection↔Cash effects, reconciliation relationships and detailed economic effects of cancellation/reversal/refund.

## R8-PAY-002 — Canonical Reconciliation — 2026-10-03

The Owner-approved Payment lifecycle direction is now closed conceptually:

- Payment retains the AS-IS state vocabulary as transformation starting point: `PENDIENTE`, `EN_PROCESO`, `APROBADO`, `RECHAZADO`, `CANCELADO`, `REEMBOLSADO_PARCIAL`, `REEMBOLSADO_TOTAL`.
- Manual payments may be approved at controlled registration; external-provider flows may be asynchronous.
- Payment lifecycle is independent from Sale lifecycle.
- Partial settlement through multiple Payments is allowed.
- Overpayment is rejected by default; no implicit customer-credit rule is introduced.
- Refund/reversal is an explicit traceable Payment operation.
- Payment and AR application remain distinct.
- Payment reconciliation is distinct from Cash reconciliation and AR reconciliation.

The following remain OPEN: exact transition graph, provider/webhook/idempotency mechanics, refund persistence model, Payment↔Cash effects, AR allocation rules, Cash reconciliation and technical API/event contracts.


## R8-PAY-003 — Canonical Reconciliation — 2026-10-03

The Owner-approved Payment↔Cash/AR boundaries are:

- approved Payment may produce a Cash effect according to payment method;
- Cash impact timing depends on payment method and confirmation/evidence semantics;
- Payment and AR application remain distinct;
- a Payment may be allocated fully or partially to one or more applicable AR obligations;
- a Payment may exist without creating AR;
- partial Payment does not automatically create AR;
- refunds may generate compensating Cash effects when applicable;
- Sale cancellation does not erase historical Payments; compensating effects belong to the respective domains.

Exact Cash states, movement model, confirmation rules, reconciliation, AR debt/allocation rules, refund/cancellation mechanics and technical contracts remain OPEN.
