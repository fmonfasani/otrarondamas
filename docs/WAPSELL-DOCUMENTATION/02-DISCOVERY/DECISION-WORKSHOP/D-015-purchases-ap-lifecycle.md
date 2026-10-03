# D-015 — Definir el ciclo de vida completo de Compras y la gestión de Cuentas por Pagar para el TO-BE, incluyendo procesamiento de facturas, condiciones de pago y conciliación.

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Purchases, Accounting, Payments

Related conflicts: CON-024 (Ciclo de Vida de Compras y Cuentas por Pagar sin Definición TO-BE Completa)

## Decision Question
Define el ciclo de vida completo TO-BE para la gestión de Compras y Cuentas por Pagar dentro de la plataforma Wapsell. Esto incluye procesos detallados para la gestión de proveedores, la creación de órdenes de compra (desde la requisición hasta la aprobación), la recepción de bienes, el procesamiento de facturas, las condiciones y programación de pagos, y la conciliación de cuentas de proveedores, adaptado para un contexto multi-tenant.

## AS-IS Evidence
- `05-ASIS/01-ASIS-PRODUCT.md`: "Compras: alta de proveedor, orden (BORRADOR→EMITIDA), recepción parcial o total (genera Lote + movimiento de stock), pagos y devoluciones a proveedor." (VERIFIED BY CODE)
- `05-ASIS/03-ASIS-DATA.md`: "`Proveedor` (`@@unique([empresaId, nombre])`), `Compra` (`totalPagado`/`saldo` recalculados en service), `CompraItem`, `RecepcionCompra`, `PagoProveedor`, `DevolucionProveedor`, `DevolucionProveedorItem`." (VERIFIED BY CODE)

## Why This Decision Exists
El AS-IS implementa una gestión básica de compras pero carece de un ciclo de vida completo de Cuentas por Pagar (CON-024). Este **GAP + MISSING_DECISION (BUSINESS_RULE_CONFLICT / PURCHASE_CONFLICT)** es bloqueante para la precisión financiera y la eficiencia operativa. Una definición completa es crucial para la futura plataforma multi-tenant.

## Alternatives
- **Funcionalidad AS-IS básica más AP manual:** Mantener el flujo de compras actual y depender de procesos externos o manuales para AP avanzada. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **AP integrada con cotejo de facturas:** Implementar procesamiento automatizado de facturas, cotejando con órdenes de compra y recibos. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Portal de proveedores para facturas/estados de cuenta:** Permitir a los proveedores enviar facturas y ver el estado de pago a través de un portal dedicado. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-024):** "Es un bloqueante para la precisión financiera, la relación con proveedores y la eficiencia operativa en el dominio de compras."
- **INFERRED:** Mejora del control financiero, mejor gestión de la relación con los proveedores, procesos de compra optimizados y mayor capacidad de auditoría.

## Dependencies
- Blocks: NONE
- Depends On: D-001 (INDIRECT), D-014 (INDIRECT)

## Affected Documents
- `05-ASIS/01-ASIS-PRODUCT.md`
- `05-ASIS/03-ASIS-DATA.md`
- `05-ASIS/07-ASIS-FLOWS.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-024)
- `03-CONFLICTS/04-STATE-CONFLICTS.md`
- `03-CONFLICTS/05-BUSINESS-RULE-CONFLICTS.md`
- `apps/api/prisma/schema.prisma` (modelos `Compra`, `Proveedor`, `PagoProveedor`).
- Módulos backend de Compras, Inventario y Contabilidad.

## Implementation Impact
- Potenciales cambios en el esquema para facturas y condiciones de pago detalladas.
- Desarrollo de nuevos servicios y APIs para el procesamiento de facturas y la gestión de AP.
- Integración con inventario para la recepción de bienes.
- Componentes UI para paneles de AP y estados de cuenta de proveedores.

## Open Questions
- ¿Cuáles son los flujos de trabajo de aprobación para órdenes de compra y facturas de proveedores?
- ¿Cómo se programarán y conciliarán los pagos a proveedores?
- ¿Existen requisitos de informes específicos para compras y cuentas por pagar?

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
| ID | `D-015` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---