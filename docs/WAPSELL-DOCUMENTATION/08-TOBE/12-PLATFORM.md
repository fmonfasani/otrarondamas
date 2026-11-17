# TO-BE — Plataforma Wapsell

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §1.3, §7.1

## Propósito

La administración de Wapsell como plataforma, separada de los negocios.

## Reglas

- No es un Membership Role: solo las cuentas de la lista del servidor. `[OR-B4-020, OR-B4-038]`
- Totales por Business, nunca datos de sus clientes; abrir un Business queda en su auditoría. `[OR-B4-038]`
- Salud, actividad, uso de funciones y auditoría de la plataforma. `[OR-B4-040]`
- Alta de negocios con su Owner, **en pausa hasta MFA**. `[OR-B4-039, OR-B4-042]`

## Permisos

| Acción | Permiso |
|---|---|
| Ver | `PLATFORM_BUSINESSES_VIEW` |
| Crear negocios | `PLATFORM_BUSINESSES_MANAGE` (en pausa) |

## Estado actual (AS-IS, 2026-11-16)

Hecho, en uso interno.

## Abierto

- Suspender o reactivar negocios
- Acceso de soporte acotado
- Planes y cobro a los negocios
- MFA de plataforma
