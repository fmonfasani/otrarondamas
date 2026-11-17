# TO-BE — Identity, Tenancy y Membership

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

**Fuente en la SPEC General:** SPEC §5, §7, §8

## Propósito

Quién es quién en Wapsell: una identidad global por persona, negocios aislados entre sí y la relación persona ↔ negocio con un rol.

## Reglas

- `User` global, único por email normalizado; `Customer` es otra entidad y puede existir sin `User`. `[D-002, OR-B2-004, OR-B2-005]`
- `Business = Tenant`: datos, configuración y marca propios, aislados de los demás. `[D-001, DEC-001]`
- `Membership` N:N con un rol: Owner, Admin, Vendedor, Gestor de Stock. Owner ≠ Admin. `[OR-B2-007…009]`
- Membership con tres estados: ACTIVE, SUSPENDED (reversible), INACTIVE (baja); solo ACTIVE opera. `[OR-B2-003, OR-B4-008]`
- Transición de roles: invitaciones nuevas crean VENDEDOR; ASISTENTE_LOCAL es alias hasta 2026-12-31. `[OR-B4-027]`
- La convivencia `Usuario/Empresa` ↔ `User/Business` termina por criterios, no por fecha. `[OR-B4-010]`
- Un User con varias Memberships elige el Business activo; siempre validado contra una Membership activa. `[OR-B2-007]`

## Permisos

| Acción | Permiso |
|---|---|
| Equipo: ver | `USERS_VIEW` |
| Equipo: invitar, suspender, reactivar, aprobar legajo | `USERS_MANAGE` (Owner, Admin; solo el Owner sobre otro Owner) |

## Estado actual (AS-IS, 2026-11-16)

Roles canónicos y transición hechos (#160). Faltan: estado INACTIVE (#162) y cut-over legacy (#164). Business Switch en el panel: hecho.

## Abierto

- Algoritmo de normalización de email
- Criterio para vincular Customer con User
- Quitar ASISTENTE_LOCAL del modelo (después de 2026-12-31)
