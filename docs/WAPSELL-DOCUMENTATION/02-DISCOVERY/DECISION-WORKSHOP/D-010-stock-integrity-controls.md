# D-010 — Verificar el estado actual de los controles de integridad de stock (`UPDATE` condicional, `CHECK` en lotes, FK compuesta de cliente) requeridos por la SPEC de Ventas (Inc-1) y, si están ausentes, priorizar su implementación.

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: HIGH

Domain: Sales, Inventory, Data, Quality

Related conflicts: CON-019 (Brecha de Integridad: Controles de Stock Requeridos por SPEC de Ventas Ausentes en Código (CON-007))

## Decision Question
Iniciar una auditoría inmediata para verificar el estado actual de implementación de los controles críticos de integridad de stock (`UPDATE` condicional para stock, verificaciones de lotes, clave foránea compuesta para cliente) tal como se exige explícitamente en `spec-modulos_ventas.md` (Inc-1). Si estos controles se encuentran ausentes o insuficientes, priorizar su implementación y verificación urgentes para resolver el **EVIDENCE_CONFLICT / BUSINESS_RULE_CONFLICT** (CON-019).

## AS-IS Evidence
- `05-ASIS/11-ASIS-QUALITY.md`: "Esa misma SPEC (Inc-1) pide explícitamente \"UPDATE condicional de stock, CHECK en lotes, FK compuesta de cliente\" como parte de la integridad mínima — SRC-011 documenta que, a su fecha, la migración `inc1` y el código de `descontarStock()` no implementaban eso. **No se re-verificó en esta sesión** si esto sigue así o fue corregido después." (DOCUMENTED - CON-007 de SRC-011, NOT DETERMINABLE - estado actual).

## Why This Decision Exists
La `spec-modulos_ventas.md` (Inc-1) exige explícitamente controles críticos de integridad de stock. Sin embargo, el AS-IS (basado en SRC-011) indica que estos no estaban implementados en el momento de la auditoría, y su estado actual es `NOT DETERMINABLE` (CON-019). Este **EVIDENCE_CONFLICT / BUSINESS_RULE_CONFLICT** plantea un alto riesgo para la integridad de los datos. Se necesita una decisión para verificar y, si es necesario, priorizar la implementación de estos controles.

## Alternatives
- **Auditoría de código y corrección inmediata:** Dedicar recursos para verificar e implementar los controles faltantes. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Aceptación del riesgo con mitigación:** Si el impacto se considera bajo, aceptar el riesgo e implementar controles compensatorios o una solución de menor prioridad. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-019):** "Riesgo crítico de inconsistencias de stock y problemas de integridad de datos si estos controles no han sido implementados o verificados."
- **INFERRED:** Previene discrepancias de stock, mejora la precisión financiera, garantiza una gestión de inventario confiable.

## Dependencies
- Blocks: NONE
- Depends On: D-008 (INDIRECT)

## Affected Documents
- `05-ASIS/11-ASIS-QUALITY.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-019)
- `SRC-007` (spec-modulos_ventas.md)
- `apps/api/prisma/schema.prisma` (para la clave foránea compuesta).
- Módulos backend de Inventario y Ventas (e.g., lógica `descontarStock()`).

## Implementation Impact
- Cambios de código en los módulos de inventario y ventas para implementar las verificaciones de integridad requeridas.
- Actualizaciones del esquema de la base de datos si la clave foránea compuesta falta.
- Pruebas exhaustivas para verificar los nuevos controles.

## Open Questions
- ¿Cuáles son los valores exactos actuales para la lógica condicional de `UPDATE` y las verificaciones de lotes?
- ¿La clave foránea compuesta para el cliente ya está implementada, o requiere una migración?
- ¿Quién es el responsable de esta verificación e implementación?

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
| ID | `D-010` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---