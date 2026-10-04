# WAPSELL — R8-ORD-002 OWNER DECISION — ORDER / SALE STATES AND EFFECTS

**Fecha:** 2026-10-03  
**Task:** R8-ORD-002  
**Decision:** CLOSED — OWNER APPROVED  
**Implementation:** NOT AUTHORIZED

## 1. Purpose

Close the Owner decisions for the conceptual lifecycle and boundary semantics of Order and Sale, using the verified AS-IS implementation and the already-approved Commerce and Inventory decisions.

This decision does not authorize schema changes, migrations, code changes, API contracts or implementation mechanisms.

## 2. Owner decision

The Owner explicitly accepted all recommendations **A1–L1** presented in the R8-ORD-002 decision workshop.

| ID | Decision | Approved option |
|---|---|---|
| **A** | Order lifecycle | **A1 — retain the existing AS-IS Order state vocabulary as the starting lifecycle, with semantic reconciliation** |
| **B** | Commercial boundary | **B1 — `CONFIRMADO` is the commercial confirmation boundary** |
| **C** | Delivery vs Sale | **C1 — delivery does not modify the Sale creation/economic boundary** |
| **D** | Cancellation before physical exit | **D1 — release applicable reservation without inventing a physical stock exit** |
| **E** | Partial delivery | **E1 — retain `PARCIALMENTE_ENTREGADO` as an operational Order state** |
| **F** | Order cancellation | **F1 — `CANCELADO` is terminal** |
| **G** | Sale lifecycle | **G1 — retain `CONFIRMADA / ANULADA` as the conceptual starting point** |
| **H** | Confirmed Sale mutability | **H1 — confirmed Sale is immutable** |
| **I** | Shared Order/Sale state | **I1 — Order and Sale have separate lifecycles** |
| **J** | Payment vs Sale state | **J1 — Payment does not determine the Sale lifecycle state** |
| **K** | Meaning of `ENTREGADO` | **K1 — indicates fulfillment completion, not Sale/payment/cash completion** |
| **L** | Cancellation effects | **L1 — cross-domain effects are defined by the respective specialized domains** |

## 3. Order lifecycle

The current AS-IS Order state vocabulary is retained as the starting point:

`RECIBIDO`, `CONFIRMADO`, `EN_PREPARACION`, `LISTO`, `ASIGNADO`, `EN_CAMINO`, `ENTREGADO`, `PARCIALMENTE_ENTREGADO`, `ENTREGA_FALLIDA`, `CANCELADO`.

These states are retained subject to semantic reconciliation with the canonical Commerce and Fulfillment boundaries.

Retention does not mean that every existing transition or implementation effect is already canonical. Exact transition authorization and technical state enforcement remain implementation/specification work.

## 4. Commercial confirmation boundary

`CONFIRMADO` is the Order's commercial confirmation boundary.

A Business-authorized Order confirmation:

- requires the canonical `ORDER_CONFIRM` authorization;
- establishes the confirmed Order;
- creates the Sale;
- establishes the applicable stock reservation;
- does not itself represent physical stock exit.

Customer intent or confirmation alone does not authorize the Business operation.

Conceptually:

```
Order
  RECIBIDO
      |
      | ORDER_CONFIRM
      v
  CONFIRMADO
      |
      +--> Sale created
      |
      +--> Stock reservation established
```

## 5. Fulfillment and delivery

Fulfillment remains under Orders.

Delivery does not create the Sale and does not redefine the economic creation boundary.

`PARCIALMENTE_ENTREGADO` remains a valid operational Order state.

`ENTREGADO` means fulfillment completion of the Order. It does not mean that:

- the Sale is newly created;
- the Payment lifecycle is complete;
- Cash is reconciled;
- Accounts Receivable is settled.

Those concerns remain owned by their respective domains.

## 6. Cancellation before physical stock exit

When an Order is cancelled or otherwise corrected before physical stock exit:

- the applicable stock reservation is released;
- no physical stock-out is invented merely because the Order was cancelled;
- physical stock remains unchanged unless an actual physical movement occurred.

This is consistent with R8-INV-002:

`reservation != physical stock exit`.

The exact technical reservation release mechanism remains open.

## 7. Order cancellation terminality

`CANCELADO` is treated as a terminal Order state.

A cancelled Order is not reopened by simply toggling its state back into the normal lifecycle.

If a later correction is required, it must use an explicit, traceable operation rather than erasing the historical cancellation.

## 8. Sale lifecycle

The conceptual Sale lifecycle retains the AS-IS starting vocabulary:

`CONFIRMADA` and `ANULADA`.

The canonical rule is:

- a confirmed Sale is immutable;
- a correction is an explicit traceable cancellation, reversal or refund operation;
- Sale state must not be expanded merely to represent Payment, Cash, AR or Fulfillment states.

This deliberately avoids turning Sale into a container for other domain lifecycles.

## 9. Order and Sale remain separate

Order and Sale do not share one state machine.

A valid conceptual situation may therefore be:

```
Order = EN_CAMINO
Sale  = CONFIRMADA
```

The Order represents commercial/operational processing and fulfillment.

The Sale represents the confirmed economic operation.

## 10. Payment boundary

Payment remains separate from Sale.

Payment completion does not define whether the Sale exists.

A Sale may therefore coexist with:

- no payment yet;
- partial payment;
- an outstanding receivable;
- subsequent payment application.

The exact Payment, Cash and Accounts Receivable lifecycles remain specialized domain work.

## 11. Cross-domain correction effects

The Owner approves the following boundary:

> Order/Sale lifecycle decisions define the commercial boundary; each affected domain defines its own correction effects.

Therefore, cancellation, reversal or refund effects are not fully specified inside R8-ORD-002.

They must be reconciled through the relevant specialized domains:

- **Inventory:** reservation release and/or physical stock reversal where applicable;
- **Payments:** payment cancellation/refund/reversal;
- **Cash:** corresponding cash effects;
- **Accounts Receivable:** debt/application effects;
- **Fulfillment:** operational consequences;
- **Messaging/Notifications:** communication/audit consequences where applicable.

This preserves domain ownership and avoids inventing a monolithic Sale state machine.

## 12. Canonical implications

The accepted decisions establish the following conceptual chain:

```
Order creation
    ↓
Commercial processing
    ↓
Business-authorized ORDER_CONFIRM
    ├── Sale created
    └── Stock reservation established
          ↓
     Fulfillment under Order
          ↓
     Physical stock exit when it actually occurs
```

The following are explicitly prohibited conceptual conflations:

- Order confirmation = physical stock exit;
- Delivery = Sale creation;
- Payment completion = Sale creation;
- Cash closure = Sale completion;
- Customer intent = Business authorization;
- Sale mutation = correction.

## 13. AS-IS disposition

The current AS-IS states are retained as transformation starting evidence.

The following AS-IS behavior remains non-compliant and is not approved by this decision:

- direct physical stock decrement on Order confirmation;
- absence of the canonical reservation boundary;
- any implementation that treats Delivery as the Sale creation trigger;
- any implementation that permits arbitrary mutation of a confirmed Sale.

No code correction is authorized by this document.

## 14. Explicitly open

The following remain OPEN:

- exact technical Order transition authorization;
- exact technical Sale transition enforcement;
- physical reservation model;
- transaction/locking/concurrency mechanism;
- exact cancellation/reversal/refund workflows;
- Payment lifecycle and reconciliation;
- Payment↔Cash effects;
- AR allocation/effects;
- detailed Fulfillment lifecycle;
- API/event contracts;
- migration/cutover mechanics.

The accepted A1–L1 decisions do not close these implementation details.

## 15. Evidence classification

- **VERIFICADO POR CÓDIGO:** current `EstadoPedido` vocabulary.
- **VERIFICADO POR CÓDIGO:** current `EstadoVenta` vocabulary.
- **VERIFICADO POR CÓDIGO:** separate `Pedido` and `Venta` models.
- **DOCUMENTADO:** Order/Sale conceptual separation.
- **DOCUMENTADO:** `ORDER_CONFIRM` as Business authorization.
- **DOCUMENTADO:** Sale creation at commercial confirmation.
- **DOCUMENTADO:** stock reservation on confirmed Order.
- **DOCUMENTADO:** physical stock decrement only through stock-out movement.
- **DOCUMENTADO:** Payment separate from Sale.
- **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE:** exact technical state machine and cross-domain correction implementation.

## 16. Gate

**R8-ORD-002: CLOSED — OWNER APPROVED.**

The Owner has explicitly accepted recommendations A1–L1.

No schema, migration, code, infrastructure or deployment change is authorized by this decision.
