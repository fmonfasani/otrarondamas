# D-013 — Definir el ciclo de vida completo de la gestión de caja para el TO-BE, incluyendo aperturas, movimientos, arqueo, cierres y reglas de autorización, y adaptaciones para un contexto multi-tenant.

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Cash, Payments, Accounting

Related conflicts: CON-022 (Ciclo de Vida de Gestión de Caja sin Definición TO-BE Explícita)

## Decision Question
Define el ciclo de vida completo TO-BE para la gestión de caja dentro de la plataforma Wapsell. Esto debe incluir reglas y procesos detallados para la apertura de la caja (fondo inicial), todos los tipos de movimientos de caja (ingresos, gastos, retiros), conciliación (arqueo), procedimientos de cierre y las reglas de autorización necesarias, con adaptaciones específicas para un contexto multi-tenant.

## AS-IS Evidence
- `05-ASIS/01-ASIS-PRODUCT.md`: "Caja: apertura, movimientos, arqueo con **doble confirmación** (usuario saliente + entrante), autorización por excepción si la diferencia supera el umbral, cierre." (VERIFIED BY CODE)
- `05-ASIS/03-ASIS-DATA.md`: "`Caja` (`@@unique([empresaId])`), `AperturaCaja`, `MovimientoCaja`, `ArqueoCaja` (`usuarioId` saliente + `usuarioEntranteId` obligatorio y distinto — doble confirmación real), `CierreCaja`." (VERIFIED BY CODE)
- `05-ASIS/07-ASIS-FLOWS.md`: Describe el flujo "Apertura → venta → arqueo → cierre de caja." (VERIFIED BY EXECUTION)

## Why This Decision Exists
El AS-IS tiene un sistema de gestión de caja robusto. Sin embargo, no existe una definición TO-BE explícita para su ciclo de vida, especialmente considerando posibles modificaciones o adaptaciones requeridas para una plataforma Wapsell multi-tenant (CON-022). Esto es un **GAP + MISSING_DECISION (STATE_MACHINE_CONFLICT / BUSINESS_RULE_CONFLICT)** que crea ambigüedad en el control financiero y los procedimientos operativos.

## Alternatives
- **Adoptar el modelo AS-IS tal cual:** Replicar la lógica y el modelo de datos de gestión de caja existentes directamente en la plataforma multi-tenant. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Mejorar para necesidades específicas multi-tenant:** Introducir nuevas características como informes de caja a nivel de plataforma, transferencias de efectivo entre negocios o diferentes flujos de autorización para los tenants. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Simplificar para una gestión de caja mínima viable:** Reducir la complejidad para el despliegue multi-tenant inicial, centrándose en las operaciones centrales de apertura/cierre/movimientos. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-022):** "Ambigüedad en el control financiero, la auditabilidad y los procedimientos operativos para la gestión de caja en la plataforma Wapsell."
- **INFERRED:** Garantiza la precisión financiera, previene el fraude, facilita los procesos de auditoría, proporciona pautas operativas claras para los cajeros.

## Dependencies
- Blocks: D-008
- Depends On: D-001 (INDIRECT)

## Affected Documents
- `05-ASIS/01-ASIS-PRODUCT.md`
- `05-ASIS/03-ASIS-DATA.md`
- `05-ASIS/07-ASIS-FLOWS.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-022)
- `03-CONFLICTS/04-STATE-CONFLICTS.md`
- `03-CONFLICTS/05-BUSINESS-RULE-CONFLICTS.md`
- `apps/api/prisma/schema.prisma` (modelos `Caja`, `AperturaCaja`, `MovimientoCaja`, `ArqueoCaja`, `CierreCaja`).
- Módulos backend de Caja (`caja/`).
- UI frontend para operaciones de caja.

## Implementation Impact
- Posibles modificaciones a los módulos de gestión de caja existentes o creación de nuevos servicios conscientes del multi-tenancy.
- Actualizaciones en los endpoints API y la UI relacionados con la caja.
- Asegurar el correcto alcance de `empresaId` (o el nuevo ID de Business) para todas las operaciones de caja.

## Open Questions
- ¿Se requieren informes o conciliaciones de caja a nivel de plataforma?
- ¿Cómo se manejarán los movimientos de caja entre diferentes unidades de `Business` (si aplica)?
- ¿Existen reglas de autorización diferentes para las operaciones de caja dependiendo del rol de `Membership`?

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
**NOT DETERMINABLE.** RECONSTRUCTED TEXT NOW EXISTS - see 04-DECISIONS/00-DECISION-REGISTER.md section 4 (provenance: DERIVED / RECONSTRUCTED, not Owner-verified). DEC-001 does not address it. The question, AS-IS evidence, alternatives and Open Questions above are preserved verbatim as the historical workshop record and remain unresolved.

### Reconciled status

| Field | Value |
|---|---|
| ID | `D-013` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---