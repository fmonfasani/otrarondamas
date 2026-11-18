# TO-BE — Reportes y auditoría del negocio

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §14.2, §14.3

## Propósito

Lo que el Business vendió y quién hizo qué.

## Reglas

- Vendido = mostrador no anulado + pedidos pagados o entregados, neto de devoluciones; comparado con el período anterior. `[OR-B4-036]`
- Auditoría inmutable de quién, cuándo y qué cambió; contraseñas y claves ocultas. `[OR-B4-041]`
- El Owner ve todo y descarga CSV (registrado); el resto ve lo suyo. `[OR-B4-041]`
- Se conserva 5 años. `[OR-B4-041]`

## Permisos

| Acción | Permiso |
|---|---|
| Reportes | `REPORTS_VIEW` (Owner, Admin) |
| Auditoría propia | `AUDIT_VIEW_OWN` |
| Auditoría completa y descarga | `AUDIT_VIEW_ALL` (Owner) |

## Estado actual (AS-IS, 2026-11-16)

Hecho. Falta registrar en la auditoría los ajustes de stock, los descuentos, la conexión de Mercado Pago y los ingresos fallidos.

## Abierto

- Alertas sobre la auditoría
- Tarea programada de retención
