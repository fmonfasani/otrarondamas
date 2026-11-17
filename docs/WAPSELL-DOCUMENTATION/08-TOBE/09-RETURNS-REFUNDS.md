# TO-BE — Devoluciones y reembolsos

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §10.10

## Propósito

Qué pasa cuando un cliente devuelve una compra.

## Reglas

- Flujo: por autorizar → por recibir (inspección) → por reembolsar → cerrada; puede cancelarse o rechazarse con motivo. `[OR-B4-034, OR-B4-035]`
- La registra el equipo desde la venta o la pide el cliente desde «Mis compras». `[OR-B4-035]`
- Plazo por Business (10 días por defecto); fuera de plazo el Owner autoriza con motivo. `[OR-B4-034, OR-B4-035]`
- Inspección antes de reponer; reembolso por el medio original, total, parcial o cambio. `[OR-B4-034, OR-B4-035]`
- Cada paso avisa al cliente en su conversación. `[OR-B4-035]`

## Permisos

| Acción | Permiso |
|---|---|
| Registrar | `SALES_CREATE` |
| Autorizar / cancelar | `REFUNDS_MANAGE` |
| Recibir e inspeccionar | `RETURNS_RECEIVE` |
| Reembolsar | `PAYMENTS_REFUND` |

## Estado actual (AS-IS, 2026-11-16)

Hecho (reglas 1–7, 10–12 de OR-B4-035). Abiertas: reembolso automático por Mercado Pago (regla 8) y costo de envío (regla 13).

## Abierto

- Excepciones de plazo por producto
- Devolver pedidos de la tienda (necesita que el pedido entregado se vuelva venta)
