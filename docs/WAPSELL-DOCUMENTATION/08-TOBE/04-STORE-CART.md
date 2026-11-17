# TO-BE — Tienda online y carrito

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §10.2, §10.11

## Propósito

Cómo compra un cliente en la tienda de un Business.

## Reglas

- Una tienda por Business en `/tienda/<dirección>`; la dirección no cambia. `[OR-B4-030, OR-B4-039]`
- Cuenta de cliente por tienda; el mismo email en dos tiendas son dos Customers. `[OR-B4-030]`
- Carrito en el servidor del Customer autenticado; el visitante lo arma en el navegador y se une al ingresar. `[OR-B4-029]`
- Customer genérico «Consumidor Final» primero; después el Cart anónimo en el servidor. `[OR-B4-014, OR-B4-022]`
- Se requiere Customer antes de crear el Order. `[R8-COM-004]`
- El cliente sigue sus pedidos, sus compras del mostrador, pide devoluciones y conversa con el Business. `[OR-B4-030, OR-B4-035, OR-B4-031]`

## Permisos

| Acción | Permiso |
|---|---|
| Cliente | `CUSTOMER_POLICY`: solo su propio carrito, pedidos y compras, en esa tienda |

## Estado actual (AS-IS, 2026-11-16)

Tienda, cuenta, carrito, pedidos, compras, devoluciones y chat: hechos. Faltan: Consumidor Final en el mostrador y Cart anónimo (#167).

## Abierto

- Pedido anónimo legacy que sobrescribe nombre y teléfono por email (señalado en OR-B4-030)
