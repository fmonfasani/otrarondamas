# D-001 — ¿Cuál es el nombre canónico para la unidad de negocio multi-tenant (`Empresa`, `Business`, `Tenant`) y cómo se transforma el modelo actual de `Empresa`?

Status: APPROVED — OWNER-VERBATIM (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Identity, Tenancy, Data

Related conflicts: CON-009 (Terminología y Entidad Central: "Empresa" (AS-IS) vs. "Business/Tenant" (DEC-001/SPEC))

## Decision Question
Define el nombre canónico para la unidad de negocio multi-tenant (e.g., "Business," "Tenant," "Company," o mantener "Empresa"). Concurrently, detallar la transformación del modelo de datos `Empresa` existente en `schema.prisma` para alinearse con el nombre canónico elegido y la visión de plataforma multi-tenant. Esto incluye si `Empresa` es renombrada, reutilizada, o coexiste con una nueva entidad `Business`.

## AS-IS Evidence
- `05-ASIS/03-ASIS-DATA.md`: "`Empresa` (raíz de aislamiento, `nombre @unique`, relaciona con ~20 entidades)...Prácticamente todo modelo de negocio lleva `empresaId` + relación a `Empresa`." (VERIFIED BY CODE)
- `05-ASIS/04-ASIS-IDENTITY.md`: "`Empresa` (no Business/Tenant) y es el modelo raíz de aislamiento de datos... No hay tabla `Membership`." (VERIFIED BY CODE)
- `04-DECISIONS/02-MULTITENANCY.md` (DEC-001 - Qué NO decide): "1. **Modelo de datos concreto.** Cómo se relacionan exactamente `Business`/`Membership` con las 42 tablas ya existentes en `apps/api/prisma/schema.prisma`, en particular `Empresa` (hoy 1:1 con `Usuario` vía `empresaId`) y si `Empresa` se renombra/fusiona a `Business` o convive con él." (APPROVED)

## Why This Decision Exists
Esta decisión es esencial porque el codebase AS-IS y el modelo de datos están construidos alrededor de la entidad `Empresa` como la raíz del aislamiento de datos, implícitamente para un solo negocio, y `Usuario` es 1:1 con `Empresa`. La visión TO-BE aprobada (DEC-001) para Wapsell es una plataforma multi-tenant donde `Business = Tenant`. Existe una **DIRECT_CONTRADICTION / TERMINOLOGY_CONFLICT / DATA_MODEL_CONFLICT** (CON-009) con respecto a la entidad central para una unidad de negocio y su rol en la multi-tenancy. Resolver esto es fundamental para todo el modelo de datos y la transformación arquitectónica.

## Alternatives
- **Retener "Empresa" y adaptar su semántica:** `Empresa` se convierte en la entidad multi-tenant "Business", requiriendo cambios en sus relaciones y lógica. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Introducir "Business" como una nueva entidad y deprecate/migrate "Empresa":** Crear una nueva entidad `Business` y migrar los datos de `Empresa` existentes a ella, o gestionar ambas durante la transición. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Usar "Tenant" como el nombre canónico:** (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (DEC-001):** "La decisión de arquitectura de SRC-003/SRC-004 (monorepo propio `OtraRondaMas`, Postgres propio, sin integración de código con `wapsell`) queda en tensión directa con esta decisión: si Otra Ronda Más es un Business dentro de Wapsell, el monorepo y la base de datos separados dejan de tener sentido como arquitectura final, aunque puedan seguir sirviendo como AS-IS transitorio."
- **DOCUMENTED (CON-009):** "Afecta el modelo de datos, la arquitectura de multi-tenancy y la consistencia terminológica en todo el sistema."
- **INFERRED:** Migración significativa de la base de datos, potencial para pérdida de datos o inconsistencias si no se maneja con cuidado, impacto en todos los módulos que actualmente dependen de `empresaId`.

## Dependencies
- Blocks: D-002 (DIRECT), D-003 (INDIRECT), D-004 (DIRECT), D-005 (INDIRECT), D-007 (INDIRECT), D-011 (INDIRECT), D-012 (INDIRECT), D-013 (INDIRECT), D-014 (DIRECT), D-015 (INDIRECT), D-016 (INDIRECT), D-017 (INDIRECT)
- Depends On: NONE

## Affected Documents
- `05-ASIS/03-ASIS-DATA.md`
- `05-ASIS/04-ASIS-IDENTITY.md`
- `02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-009)
- `apps/api/prisma/schema.prisma` (y todos los modelos que usan `empresaId`)
- Todos los servicios y controladores de backend que filtran por `empresaId`.
- Aplicaciones frontend (`pos-admin`, `tienda-online`) para cualquier elemento de UI relacionado con el nombre de la empresa/negocio.

## Implementation Impact
- Requiere cambios en el esquema principal de Prisma para `Empresa` y sus relaciones.
- Requiere una refactorización extensa de servicios, controladores y, potencialmente, guards que dependen de `empresaId`.
- Se necesita una estrategia de migración de la base de datos para la transición de los datos de `Empresa` existentes.
- Impacta la lógica de visualización del frontend para el nombre del negocio.

## Open Questions
- ¿Cuáles son los requisitos específicos para la compatibilidad con versiones anteriores durante la transición?
- ¿Cómo se migrarán o transformarán los datos de `Empresa` existentes?
- ¿Existen restricciones específicas (e.g., límites de caracteres, reglas de unicidad) para el nombre canónico del negocio?

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
**`DEC-001 DERIVED` (partial).** Source: `04-DECISIONS/02-MULTITENANCY.md:13-14`

> **Business = Tenant.** Cada negocio (ej. Otra Ronda Mas) es un tenant dentro de la plataforma, con su propia identidad comercial, catalogo, clientes, ventas, etc.

**NOT decided.** DEC-001 explicitly excludes the concrete data model at `02-MULTITENANCY.md:55-57`: which single term becomes canonical, and whether `Empresa` is renamed/merged into `Business` or coexists with it. CON-009 therefore remains OPEN.

### Reconciled status

| Field | Value |
|---|---|
| ID | `D-001` |
| Status | **APPROVED — OWNER-VERBATIM** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---