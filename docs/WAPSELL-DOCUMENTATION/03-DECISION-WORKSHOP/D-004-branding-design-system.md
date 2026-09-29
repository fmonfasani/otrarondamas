# D-004 — ¿Cuál es el design system canónico para Wapsell, y cómo se implementará el branding configurable por `Business` (tenant)?

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Branding, UI/UX

Related conflicts: CON-012 (Branding Hardcodeado e Inconsistente (AS-IS) vs. Branding Configurable por Tenant (DEC-001/SPEC))

## Decision Question
Establecer un design system canónico para Wapsell, incluyendo una paleta de colores unificada, tipografía, logotipos y tokens de diseño. Adicionalmente, definir la estrategia de implementación para el branding configurable por `Business` (tenant), abordando cómo se gestionarán y aplicarán dinámicamente los temas personalizados, logotipos y elementos de marca específicos para cada tenant.

## AS-IS Evidence
- `05-ASIS/10-ASIS-BRANDING.md`: "Branding real, hardcodeado, sin sistema configurable... Tres amarillos distintos, sin reconciliar...`Empresa.configuracion` (campo `Json` en el schema) existe pero no se lee en ningún lugar del código." (DOCUMENTED + VERIFIED BY CODE)
- `05-ASIS/10-ASIS-BRANDING.md`: "Ningún módulo reconcilia estos tres valores — cada superficie usa el suyo... `packages/ui-kit`... **vacío** — scaffolding puro, sin ningún componente ni token implementado." (DOCUMENTED + VERIFIED BY CODE)
- `05-ASIS/10-ASIS-BRANDING.md`: "`spec-modulos_ventas.md` referencia un "Design System — Otra Ronda Más" externo... un **cuarto** conjunto de tokens..." (DOCUMENTED)

## Why This Decision Exists
El AS-IS tiene un branding hardcodeado e inconsistente en todas las aplicaciones, con múltiples tokens de marca conflictivos y un campo `Empresa.configuracion` no funcional para el branding. La visión TO-BE (DEC-001) para una plataforma multi-tenant requiere un `Brand` configurable por `Business` (CON-012). Esto es un **GAP + MISSING_DECISION (BRANDING_CONFLICT)** que bloquea una UI/UX consistente y el onboarding de nuevos tenants.

## Alternatives
- **Adoptar un design system existente (e.g., Tailwind UI, Material UI) y personalizar:** Aprovechar un design system de terceros como base. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Desarrollar un design system de Wapsell personalizado desde cero:** Construir componentes y tokens internamente. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Enfoque incremental:** Comenzar con elementos configurables mínimos y expandir con el tiempo. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-012):** "Impacta la coherencia de la marca, la experiencia de usuario y es un bloqueante para la adaptación a múltiples inquilinos."
- **DOCUMENTED (`05-ASIS/10-ASIS-BRANDING.md` - Relevancia para DEC-001):** "Un "Business Theme" configurable por negocio... requiere resolver primero cuál de estos cuatro conjuntos de tokens es el canónico — hoy no hay ninguno, hay cuatro conviviendo sin jerarquía declarada."
- **INFERRED:** Desarrollo frontend significativo para la implementación del design system, potencial refactorización de componentes UI existentes, actualización de CSS/estilos en todas las aplicaciones.

## Dependencies
- Blocks: NONE
- Depends On: D-001 (DIRECT)

## Affected Documents
- `05-ASIS/10-ASIS-BRANDING.md`
- `02-CANONICAL-SPEC/06-BRANDING-AND-EXPERIENCE-SPEC.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-012)
- Todas las aplicaciones frontend (`pos-admin`, `tienda-online`).
- `apps/api/prisma/schema.prisma` (para el uso del campo `Empresa.configuracion`).
- `packages/ui-kit` (posible ubicación de implementación).

## Implementation Impact
- Creación/implementación de una biblioteca de componentes/UI de Wapsell (e.g., dentro de `packages/ui-kit`).
- Refactorización de componentes frontend existentes para utilizar el nuevo design system y el branding configurable.
- Lógica backend para almacenar y servir configuraciones de branding específicas del tenant.
- Actualizaciones del sistema CSS/estilos (e.g., configuración dinámica de TailwindCSS, variables CSS).

## Open Questions
- ¿Qué nivel de personalización de branding se espera para cada `Business` (e.g., colores, fuentes, logotipos, variaciones de componentes específicos)?
- ¿Cómo se gestionarán y alojarán los activos de branding (logotipos, favicons)?
- ¿Cuáles son las limitaciones técnicas para implementar un theming dinámico?

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
**`DEC-001 DERIVED` (partial).** Source: `04-DECISIONS/02-MULTITENANCY.md:15`

> **Brand** = identidad comercial visible del Business ante sus clientes.

**NOT decided.** The canonical design system, and which of the four conflicting AS-IS token sets wins. AS-IS states there is currently "ninguno canonico". CON-012 remains OPEN.

### Reconciled status

| Field | Value |
|---|---|
| ID | `D-004` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---