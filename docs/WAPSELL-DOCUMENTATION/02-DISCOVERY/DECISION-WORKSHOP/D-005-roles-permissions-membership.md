# D-005 — ¿Cómo se definen y gestionan los roles y permisos dentro del contexto de `Membership` en la plataforma multi-tenant Wapsell?

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Identity, Authorization, Roles

Related conflicts: CON-013 (Modelo de Roles y Permisos: `RolUsuario` enum y `Permiso` 1:1 `Usuario` (AS-IS) vs. Roles y Permisos en contexto de `Membership` (DEC-001/SPEC))

## Decision Question
Define el modelo canónico para roles y permisos dentro de la plataforma multi-tenant Wapsell. Especifica cómo se definen, gestionan y asocian los roles con los permisos en el contexto de `Membership` (User ↔ Business N:N). Esto incluye la clarificación de la relación entre roles y permisos granulares, y cómo se aplicarán.

## AS-IS Evidence
- `05-ASIS/03-ASIS-DATA.md`: "`RolUsuario` (OWNER/ASISTENTE_LOCAL/PROVEEDOR/REPARTIDOR — no autoriza nada por sí solo, solo determina qué legajo pedir) · `Permiso`/`UsuarioPermiso` (`@@unique([usuarioId, permisoId])`)" (VERIFIED BY CODE)
- `05-ASIS/05-ASIS-AUTHORIZATION.md`: "`PermissionsGuard` (global) — lee metadata de `@RequierePermiso(permiso)`; el permiso viaja granular en una tabla `Permiso`/`UsuarioPermiso`, **independiente** del `RolUsuario` (el rol no autoriza nada por sí mismo, solo determina qué legajo pedir en el alta)." (VERIFIED BY CODE)

## Why This Decision Exists
El AS-IS tiene `RolUsuario` como un enum vinculado a `Usuario`, y los permisos granulares (`Permiso`/`UsuarioPermiso`) son independientes de los roles. DEC-001 establece que "los roles y permisos viven en el contexto de esa `membership`, no en el usuario global" (CON-013). Esto es una **DIRECT_CONTRADICTION / DATA_MODEL_CONFLICT / ROLE_CONFLICT / PERMISSION_CONFLICT** que requiere un rediseño fundamental del modelo de autorización.

## Alternatives
- **Control de Acceso Basado en Roles (RBAC) con roles jerárquicos:** Los roles otorgan permisos, y los roles pueden heredar de otros roles. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Control de Acceso Basado en Atributos (ABAC):** Los permisos se determinan por atributos del usuario, recurso y entorno, permitiendo reglas más dinámicas. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Mantener permisos granulares pero vincularlos a Membership:** Mantener el concepto de `Permiso` existente pero asociarlo con `Membership` en lugar de `Usuario`. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (DEC-001):** "los roles y permisos viven en el contexto de esa `membership`, no en el usuario global."
- **DOCUMENTED (CON-013):** "Requiere una revisión fundamental del sistema de roles y permisos, impactando el modelo de datos y la lógica de autorización."
- **INFERRED:** Cambios en el esquema de la base de datos para roles y permisos, refactorización de `PermissionsGuard` y los decoradores `@RequierePermiso`, actualizaciones de los flujos de gestión de usuarios e invitaciones.

## Dependencies
- Blocks: D-006 (INDIRECT)
- Depends On: D-002 (DIRECT)

## Affected Documents
- `05-ASIS/03-ASIS-DATA.md`
- `05-ASIS/05-ASIS-AUTHORIZATION.md`
- `02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-013)
- `apps/api/prisma/schema.prisma` (modelos `RolUsuario`, `Permiso`, `UsuarioPermiso`).
- Módulos de autenticación y autorización (`auth/`, guards).
- Flujos de gestión de usuarios e invitaciones.

## Implementation Impact
- Cambios en el esquema de Prisma para roles, permisos y relaciones de `Membership`.
- Refactorización de guards y decoradores de autorización para interpretar roles/permisos basados en `Membership`.
- Actualizaciones en las APIs de asignación de usuarios y roles.

## Open Questions
- ¿Cuáles son los roles específicos requeridos para cada `Business` (tenant)?
- ¿Cómo se asignarán los permisos predeterminados a las nuevas `Membership`s?
- ¿Qué componentes de UI son necesarios para la gestión de roles y permisos?

## Decision: PENDING
## Approval: PENDING

---

## POST-WORKSHOP DECISION RECONCILIATION (2026-09-28)

> Everything above this line is the **historical workshop record**, preserved verbatim. The
> original `Status: PENDING` / `## Decision: PENDING` / `## Approval: PENDING` markers were
> the document state as produced in Phase 3.5. They are retained as history, not as current state.

**Owner confirmation:** the Owner confirms this decision was APPROVED during the Decision Workshop.

**Repository evidence of decision text:** none, beyond what DEC-001 provides (below).
### Reconstructable decision text
**`DEC-001 DERIVED` (partial).** Source: `04-DECISIONS/02-MULTITENANCY.md:18-19`

> los roles y permisos viven en el contexto de esa `membership`, no en el usuario global.

**NOT decided.** The role and permission catalog, and how AS-IS `Permiso`/`UsuarioPermiso` rows are migrated. CON-013 remains OPEN.

### Reconciled status

| Field | Value |
|---|---|
| ID | `D-005` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---