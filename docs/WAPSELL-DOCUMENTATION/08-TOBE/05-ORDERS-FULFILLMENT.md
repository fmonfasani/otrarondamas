# TO-BE — Pedidos y entrega

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §10.3, §11

## Propósito

El camino de un pedido desde que llega hasta que el cliente lo recibe.

## Reglas

- Order ≠ Sale; la confirmación comercial del Order genera la Sale. `[OR-B2-012, OR-B2-013]`
- Estados: RECIBIDO, CONFIRMADO, EN_PREPARACION, LISTO, ASIGNADO, EN_CAMINO, ENTREGADO, PARCIALMENTE_ENTREGADO, ENTREGA_FALLIDA, CANCELADO. `[R8-ORD-002, OR-B4-013]`
- Confirmar requiere `ORDER_CONFIRM`, sin atarlo a un rol. `[R8-COM-004]`
- Al confirmar se **reserva** el stock; la salida física descuenta. Cancelar antes de la salida libera la reserva. `[OR-B2-014, OR-B4-012, R8-ORD-002]`
- Fulfillment es parte de Orders, no un módulo aparte; Repartidor no es Membership Role en el MVP. `[D-016, OR-B2-008]`
- Cada cambio de estado avisa al cliente en su conversación. `[OR-B4-037]`

## Permisos

| Acción | Permiso |
|---|---|
| Ver | `ORDERS_VIEW` |
| Confirmar | `ORDER_CONFIRM` |
| Cancelar | `ORDER_CANCEL` |
| Avanzar estados | `ORDERS_MANAGE` |

## Estado actual (AS-IS, 2026-11-16)

**Brecha P1:** solo existen CONFIRMADO y CANCELADO (#168); el stock se descuenta al confirmar, sin reserva (#165). Un pedido de la tienda nunca llega a ENTREGADO, lo que también impide que se vuelva venta y se pueda devolver.

## Abierto

- Responsables de la entrega, zonas, tarifas y evidencia de entrega (D-016)
- Cuándo un pedido entregado se vuelve Sale (enmienda de OR-B4-035)
