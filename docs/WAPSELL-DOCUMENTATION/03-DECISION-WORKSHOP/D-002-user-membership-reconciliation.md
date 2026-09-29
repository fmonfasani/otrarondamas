# D-002 — ¿Cómo se reconcilian las tablas `Usuario` y `Cliente` con una única identidad `User` global, y cómo se modela la relación N:N `User ↔ Business` (Membership)?

Status: APPROVED — OWNER-VERBATIM (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Identity, Tenancy, Data, Authorization

Related conflicts: CON-010 (Modelo de Datos de Identidad: `Usuario` 1:1 `Empresa` (AS-IS) vs. `User` N:N `Business` via `Membership` (DEC-001/SPEC))

## Decision Question
Define cómo las tablas `Usuario` y `Cliente` existentes se reconcilian en una única identidad `User` global. Posteriormente, especificar el modelo de datos y las relaciones para `User ↔ Business` (Membership N:N), incluyendo cómo los roles y permisos serán asociados con este contexto de `Membership`.

## AS-IS Evidence
- `05-ASIS/03-ASIS-DATA.md`: "`Usuario` (`email @unique` **global**, no por empresa)... `Cliente` (`@@unique([empresaId, email])`, soporta minorista y mayorista vía `esMayorista`)... No hay tabla `Membership`." (VERIFIED BY CODE)
- `05-ASIS/04-ASIS-IDENTITY.md`: "`Usuario.email` es **único globalmente** (no por empresa) — consecuencia práctica: **una misma persona no puede tener cuenta de `Usuario` en dos empresas distintas** con el mismo email. Esto es lo opuesto de "User = identidad global reutilizable entre Business" que pide DEC-001... No hay tabla `Membership`: la relación Usuario↔Empresa es **1:N directa y fija** (`Usuario.empresaId`, escalar y obligatorio)." (VERIFIED BY CODE)
- `04-DECISIONS/02-MULTITENANCY.md` (DEC-001 - Qué NO decide): "1. **Modelo de datos concreto.** ...en particular `Empresa` (hoy 1:1 con `Usuario` vía `empresaId`)..." y "3. **Alcance funcional de messaging y asistentes de IA.**...todo lo de "Usuario" e "invitación" en SRC-006 asume un solo Business)." (APPROVED)

## Why This Decision Exists
El AS-IS tiene dos modelos de identidad distintos (`Usuario` para el panel de administración, `Cliente` para la tienda online), ambos vinculados 1:1 a una `Empresa`. El `Usuario.email` es globalmente único. DEC-001 dicta una identidad `User` global con `Membership` N:N a `Business` (CON-010). Esto es una **DIRECT_CONTRADICTION / DATA_MODEL_CONFLICT / IDENTITY_CONFLICT / TENANCY_CONFLICT** que requiere un cambio fundamental en el sistema de gestión de identidad.

## Alternatives
- **Fusionar `Usuario` y `Cliente` en una nueva tabla `User`:** Consolidar datos de ambas tablas existentes en una única entidad `User`, y luego establecer las relaciones de `Membership`. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Mantener `Usuario` y `Cliente` pero introducir una entidad `User` envolvente:** Utilizar las tablas existentes con una nueva capa de abstracción para un `User` unificado. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (DEC-001):** "Migrar hacia el modelo `User → Membership → Business` que pide DEC-001 requiere, como mínimo: 1. Separar la identidad de la pertenencia... 2. Resolver qué pasa con `Usuario.email @unique` global... 3. Decidir qué pasa con la separación actual `Usuario`/`Cliente` (dos tablas con JWT discriminado) frente a un "User" único de la visión de plataforma."
- **DOCUMENTED (CON-010):** "Requiere una revisión completa del modelo de datos de identidad/acceso y la lógica de autenticación/autorización."
- **INFERRED:** Migración de datos compleja, refactorización significativa de la lógica de autenticación y autorización, impacto en todas las funcionalidades de cara al usuario.

## Dependencies
- Blocks: D-003 (INDIRECT), D-005 (DIRECT), D-006 (DIRECT), D-007 (INDIRECT), D-012 (INDIRECT), D-017 (INDIRECT)
- Depends On: D-001 (DIRECT)

## Affected Documents
- `05-ASIS/03-ASIS-DATA.md`
- `05-ASIS/04-ASIS-IDENTITY.md`
- `02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-010)
- `apps/api/prisma/schema.prisma` (y modelos `Usuario`, `Cliente`)
- Módulos de autenticación y autorización en todas las aplicaciones.

## Implementation Impact
- Cambios en el esquema de la base de datos (nuevas tablas `User`, `Membership`, posible eliminación/reutilización de `Usuario`, `Cliente`).
- Refactorización extensa de la autenticación (login, registro, manejo de JWT) y autorización (guards, verificación de permisos).
- Migración de datos para usuarios y clientes existentes.

## Open Questions
- ¿Cuál es la estrategia de migración para los datos de `Usuario` y `Cliente` existentes?
- ¿Cómo se mapearán los roles/permisos existentes (`Permiso`/`UsuarioPermiso`) a la nueva autorización basada en `Membership`?
- ¿Cuáles son las implicaciones de rendimiento de un `User` global con `Membership` N:N?

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
**`DEC-001 DERIVED` (partial).** Source: `04-DECISIONS/02-MULTITENANCY.md:16-19`

> **User = identidad global.** Una persona tiene una unica identidad en Wapsell, independiente de a cuantos negocios este vinculada.
>
> **Membership = User <-> Business.** Relacion N:N; los roles y permisos viven en el contexto de esa membership, no en el usuario global.

**NOT decided.** The concrete data model (`02-MULTITENANCY.md:55-57`), the `Usuario.email @unique` global uniqueness problem, and the `Usuario`/`Cliente` table split. `05-ASIS/04-ASIS-IDENTITY.md:68` states DEC-001 "dejo pendiente para una DEC-002 futura". CON-010 remains OPEN.

### Reconciled status

| Field | Value |
|---|---|
| ID | `D-002` |
| Status | **APPROVED — OWNER-VERBATIM** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---