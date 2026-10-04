# WAPSELL — R8-INV-002 OWNER DECISION — STOCK RESERVATION / TRANSACTION SEMANTICS

**Fecha:** 2026-10-03  
**Task:** R8-INV-002  
**Decision:** CLOSED — OWNER APPROVED DIRECTION  
**Implementation:** NOT AUTHORIZED

## 1. Purpose

Close the conceptual inventory semantics required to implement the already-approved rule:

> A confirmed Order reserves stock. Physical stock decrement occurs only through a registered stock-out movement representing actual physical stock exit.

This document deliberately does not define database schema, ORM transactions, locking primitives or API contracts.

## 2. Canonical stock concepts

The TO-BE distinguishes conceptually between:

- **Physical/on-hand stock:** stock physically present and not yet removed through a stock-out.
- **Reserved stock:** stock committed to confirmed Orders but not yet physically removed.
- **Available stock:** stock that may still be committed to new Orders.

Conceptually:

`available = onHand - reserved`

The exact physical representation of these quantities remains open.

## 3. Reservation boundary

A confirmed Order creates the obligation to reserve the required stock.

The reservation:

- belongs to the same Business as the Order;
- applies to the relevant Business product/inventory;
- must not consume physical stock merely by being created;
- must reduce the quantity available for other Orders;
- must not permit the same physical availability to be committed twice.

## 4. No overselling

The system must reject an Order confirmation when sufficient available stock cannot be reserved.

Therefore:

`requested quantity <= available quantity`

must hold for every successful reservation.

Negative stock remains prohibited.

## 5. Atomicity and concurrency

Reservation must be concurrency-safe.

Two concurrent confirmations cannot both succeed by observing the same available quantity.

A successful reservation must establish a consistent reservation effect; a failed reservation must not leave a partial reservation.

The concrete mechanism is OPEN implementation detail and may use transaction/locking/constraint techniques as determined by the implementation specification.

## 6. Physical decrement boundary

Reservation is not physical stock decrement.

Physical decrement occurs only when the product actually exits physical inventory and is represented by a registered stock-out movement.

The mechanism for linking a stock-out movement to a prior reservation remains open.

## 7. Reservation lifecycle

The following conceptual outcomes are required:

- confirmed Order → reservation established;
- physical stock exit → corresponding reserved quantity can be released from reservation and represented as stock-out;
- Order cancellation or other authorized commercial correction → reservation must be released when the stock has not physically exited;
- partial fulfillment/partial physical exit → reserved and physical quantities must remain distinguishable.

Exact state names and lifecycle transitions remain open.

## 8. Business isolation

Reservation and stock operations must obey the approved Business Context:

`Authenticated User → Active Business Context → ACTIVE Membership → Role → Permission → Business-scoped Inventory`

A client-supplied Business identifier cannot override the active context.

Cross-Business reservation is prohibited.

## 9. Lot rotation

When inventory is lot-based:

- products with expiry use FEFO;
- products without expiry use FIFO.

The exact allocation algorithm and lot reservation representation remain open implementation detail.

## 10. AS-IS gap

Verified AS-IS:

- stock is stored in `Lote.cantidad`;
- Order confirmation currently decrements stock directly;
- no persisted reservation mechanism was evidenced in the inspected implementation;
- stock decrement creates a stock-out movement;
- lots are ordered by expiry ascending.

Therefore the current implementation is **NOT COMPLIANT WITH THE TO-BE RESERVATION BOUNDARY**.

No code correction is authorized by this document.

## 11. Explicitly open

- physical reservation entity/fields;
- whether reservation is persisted separately or represented through another inventory structure;
- transaction/locking mechanism;
- database constraints;
- exact reservation state model;
- reservation expiration;
- exact cancellation/release workflow;
- partial fulfillment allocation;
- stock-out ↔ reservation linkage;
- lot-level reservation persistence;
- API/event contracts;
- migration of current direct-decrement flow.

## 12. Evidence classification

- VERIFICADO POR CÓDIGO: current Business-scoped Product/Lote/MovimientoStock model.
- VERIFICADO POR CÓDIGO: current stock decrement behavior on Order confirmation.
- VERIFICADO POR CÓDIGO: stock-out movement creation.
- DOCUMENTADO: reservation on Order confirmation.
- DOCUMENTADO: physical decrement on actual stock-out.
- DOCUMENTADO: FEFO/FIFO.
- NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE: physical reservation model and transaction mechanism.

**R8-INV-002: CLOSED — OWNER APPROVED DIRECTION.**
