# TO-BE — Authorization

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §6; Authorization SPEC (APPROVED)

## Propósito

Qué puede hacer cada rol en un Business. La regla vive en la Authorization SPEC aprobada; este documento es su resumen TO-BE.

## Reglas

- Modelo `Membership → Role → Permission`, un único catálogo de permisos y una matriz fija por rol; sin permisos individuales. `[OR-B2-001, AUTH-02…04]`
- Un token no autoriza solo: usuario autenticado, Business objetivo, Membership activa y permiso. `[OR-B2-002]`
- Las políticas desconocidas fallan cerrado; un único motor decide. `[AUTH-08, AUTH-10]`
- La matriz canónica decide en producción (`enforce`). `[OR-B4-026]`
- Solo del Owner: cuenta de cobro, marca y auditoría completa. `[OR-B4-033, OR-B4-041]`
- MFA obligatorio para Owner y Admin, antes del segundo Business. `[OR-B3-014, OR-B4-009, OR-B4-042]`

## Permisos

| Acción | Permiso |
|---|---|
| Catálogo completo | `05-AUTHORIZATION-SPEC.md` §2 |
| Matriz por rol | `05-AUTHORIZATION-SPEC.md` §4 |

## Estado actual (AS-IS, 2026-11-16)

Matriz canónica en `enforce` (hecho, #161). Faltan: MFA (#163) y retirar el sistema legacy de permisos que hoy solo sirve al modo `shadow`.

## Abierto

- Método de MFA, enrolamiento y recuperación
- Fecha y criterios de retiro del legacy
