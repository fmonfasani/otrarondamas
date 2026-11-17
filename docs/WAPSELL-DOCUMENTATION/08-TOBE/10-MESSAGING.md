# TO-BE — Mensajería y venta en la conversación

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §12

## Propósito

La conversación como interfaz comercial del Business con sus clientes y su equipo.

## Reglas

- Dominio de primera clase; cada conversación pertenece a un Business. `[OR-B2-019, OR-B2-021]`
- Participan Users y Customers; el Customer no necesita User. `[OR-B2-004]`
- El chat de un cliente de la tienda abre con el Owner. `[OR-B4-031]`
- Vender en la conversación: catálogo, carrito del cliente, pedido, respuestas rápidas, fotos y PDF (10 MB). `[OR-B4-037]`
- Avisos automáticos de pedidos y devoluciones en la conversación. `[OR-B4-037, OR-B4-035]`
- Sin dependencia de WhatsApp; IA inactiva en el MVP. `[OR-B2-020]`

## Permisos

| Acción | Permiso |
|---|---|
| Usar | `MESSAGING_USE` |
| Editar respuestas rápidas | `MESSAGING_MANAGE` |
| Cargar carrito del cliente | `SALES_CREATE` |

## Estado actual (AS-IS, 2026-11-16)

Hecho. Conflicto abierto: OR-B4-031 («puede sumar compañeros») vs invariante I-2 (no se suma un tercero a un chat directo).

## Abierto

- Resolver OR-B4-031 vs I-2 (`Owner Decision`)
- Audios (etapa posterior)
- Reconciliación completa G001–G105
