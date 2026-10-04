# WAPSELL — R8-ORD-002 ASSESSMENT — ORDER / SALE STATES AND EFFECTS

**Fecha:** 2026-10-03  
**Task:** R8-ORD-002  
**Estado:** CLOSED — OWNER APPROVED  
**Implementation:** NOT AUTHORIZED

## 1. Objective
Define the remaining conceptual boundary between Order and Sale: lifecycle, commercial confirmation, Sale creation, Inventory reservation, Payment boundary, fulfillment, cancellation/correction.

## 2. Already closed
- Order and Sale are distinct.
- Order represents commercial intent/process.
- Sale represents the confirmed economic operation.
- Commercial confirmation is a Business-authorized action governed by `ORDER_CONFIRM`.
- Customer confirmation does not itself authorize the Business operation.
- Sale is created when the Order is commercially confirmed/accepted.
- Delivery is not the trigger for Sale creation.
- A confirmed Sale is immutable.
- Corrections use explicit cancellation/reversal/refund mechanisms with traceability.
- Confirmed Order reserves stock.
- Physical stock decrement occurs only through stock-out movement representing actual physical exit.
- Payment is separate from Sale.
- Fulfillment belongs under Orders.

## 3. AS-IS Order states
The current Prisma schema contains:

`RECIBIDO`, `CONFIRMADO`, `EN_PREPARACION`, `LISTO`, `ASIGNADO`, `EN_CAMINO`, `ENTREGADO`, `PARCIALMENTE_ENTREGADO`, `ENTREGA_FALLIDA`, `CANCELADO`.

These are AS-IS implementation evidence only and must not automatically become the Wapsell canonical state machine.

## 4. AS-IS Sale states
The current Prisma schema contains `CONFIRMADA` and `ANULADA`. This is AS-IS evidence. The canonical rule that a confirmed Sale is immutable supersedes any assumption that arbitrary mutation is permitted.

## 5. Current AS-IS effect problem
The current implementation directly decrements stock when an Order is confirmed. The canonical TO-BE now requires `Order confirmation → stock reservation`, followed separately by `actual physical exit → stock-out movement / physical decrement`. Therefore the current Order confirmation effect is not compliant with the canonical inventory boundary.

## 6. Proposed conceptual lifecycle — OWNER-APPROVED DIRECTION
Recommended minimal conceptual model:

```text
Order created
    ↓
Order under commercial processing
    ↓
Business-authorized confirmation
    ├── reserve stock
    └── create Sale
          ↓
      confirmed Sale
```

Fulfillment operates on the Order without redefining the Sale creation boundary. Cancellation before physical exit releases applicable reservation. Sale correction after confirmation uses explicit traceable correction mechanisms.

Intermediate Order state labels and exact Sale state names are intentionally not proposed as canonical names here.

## 7. Effects by boundary
| Boundary | Canonical effect | Status |
|---|---|---|
| Order creation | Creates commercial intent | CLOSED |
| Order confirmation | Business-authorized `ORDER_CONFIRM` | CLOSED |
| Order confirmation | Reserve stock | CLOSED |
| Order confirmation | Create Sale | CLOSED |
| Order confirmation | Physical stock decrement | PROHIBITED BY TO-BE BOUNDARY |
| Physical stock exit | Stock-out movement / physical decrement | CLOSED |
| Payment | Separate from Sale | CLOSED CONCEPTUALLY |
| Delivery | Does not create Sale | CLOSED |
| Sale correction | Explicit cancellation/reversal/refund | CLOSED DIRECTIONALLY |
| Exact Order states | — | OPEN |
| Exact Sale states | — | OPEN |
| Sale cancellation effects on stock/cash/payment/AR | — | OPEN |
| Payment state/effect timing | — | OPEN |
| Fulfillment state transitions | — | OPEN |

## 8. Owner decision options — CLOSED BY OWNER ACCEPTANCE A1–L1
### Decision A — Order lifecycle
Choose: **A1** retain the existing AS-IS Order state vocabulary as the starting lifecycle, with semantic reconciliation; or **A2** define a new canonical lifecycle vocabulary, leaving AS-IS states as migration evidence.

Recommendation: **A1**, because the existing implementation already contains a meaningful operational lifecycle and transformation should preserve existing functionality unless there is a demonstrated semantic conflict.

### Decision B — Sale lifecycle
Choose: **B1** keep `CONFIRMADA / ANULADA` as the conceptual starting point, with explicit correction mechanisms; or **B2** define a richer canonical Sale lifecycle.

Recommendation: **B1** for the MVP, because the closed rule is confirmed-Sale immutability and explicit correction operations, not a richer lifecycle.

### Decision C — Sale correction effects
The direction requires traceable cancellation/reversal/refund, but cross-domain effects remain open. Recommendation: define these effects in a specialized Commerce/Payments/Cash/Inventory reconciliation rather than embedding them into the basic Sale state machine.

## 9. Evidence
- VERIFICADO POR CÓDIGO: current `EstadoPedido`.
- VERIFICADO POR CÓDIGO: current `EstadoVenta`.
- VERIFICADO POR CÓDIGO: separate `Pedido` and `Venta` models.
- VERIFICADO POR CÓDIGO: current Payment can reference `Pedido` and `Venta`.
- DOCUMENTADO: Order/Sale conceptual separation.
- DOCUMENTADO: `ORDER_CONFIRM`.
- DOCUMENTADO: Sale creation at commercial confirmation.
- DOCUMENTADO: reservation before physical decrement.
- NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE: canonical exact state machine and cross-domain correction effects.

## 10. Gate
**R8-ORD-002: CLOSED — OWNER APPROVED.**

No canonical state names have been invented or approved by this assessment.
No code, schema, migration or data was modified.

## 11. OWNER DECISION CLOSURE — 2026-10-03

The Owner explicitly accepted all recommendations A1–L1.

### Approved decisions

- A1: retain the AS-IS Order state vocabulary as the starting lifecycle, with semantic reconciliation.
- B1: CONFIRMADO is the commercial confirmation boundary.
- C1: delivery does not create the Sale or redefine its economic boundary.
- D1: cancellation before physical stock exit releases the applicable reservation without inventing a physical stock-out.
- E1: retain PARCIALMENTE_ENTREGADO as an operational Order state.
- F1: CANCELADO is terminal.
- G1: retain CONFIRMADA / ANULADA as the conceptual starting Sale lifecycle.
- H1: confirmed Sale is immutable; correction uses explicit traceable operations.
- I1: Order and Sale have separate lifecycles.
- J1: Payment does not determine the Sale lifecycle state.
- K1: ENTREGADO represents fulfillment completion, not Sale/payment/cash completion.
- L1: cross-domain correction effects are defined by the respective specialized domains.

### Closure boundary

R8-ORD-002 now closes the conceptual Order/Sale lifecycle direction. It does not close exact technical transition enforcement, Payment/Cash/AR mechanics, detailed Fulfillment transitions, reservation persistence/locking, or cancellation/reversal/refund implementation.

**R8-ORD-002: CLOSED — OWNER APPROVED.**

Implementation remains NOT AUTHORIZED.
