# TO-BE — Caja

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §10.9

## Propósito

El efectivo del Business por turno.

## Reglas

- Caja del Business: apertura → movimientos → arqueo → cierre. `[D-013]`
- Operaciones sensibles con permisos específicos, no por rol. `[OR-B4-023]`
- El arqueo lo confirman dos personas; una diferencia grande necesita autorización. `[RF-09, D-06]`
- Las devoluciones en efectivo salen de la caja abierta. `[OR-B4-034]`
- Toda operación de caja queda en la auditoría. `[OR-B4-041]`

## Permisos

| Acción | Permiso |
|---|---|
| Abrir / cerrar | `CASH_OPEN` / `CASH_CLOSE` |
| Gastos | `CASH_EXPENSE` |
| Ajustes y retiros | `CASH_ADJUST` / `CASH_WITHDRAW` |

## Estado actual (AS-IS, 2026-11-16)

Hecho, auditado. Falta: sumar las cobranzas de cuenta corriente cuando exista esa función.

## Abierto

- Umbral definitivo de diferencia (hoy $5.000 de referencia)
