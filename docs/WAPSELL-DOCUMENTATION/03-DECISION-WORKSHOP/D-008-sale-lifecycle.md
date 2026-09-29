# D-008 — Definir el ciclo de vida completo de `Sale`, incluyendo condiciones exactas de confirmación, afectación de stock/caja/cuentas por cobrar, y el proceso de anulación.

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Sales, Inventory, Cash, Payments, Accounting

Related conflicts: CON-017 (Ciclo de Vida de `Sale` (Venta) Incompleto y con Decisiones Faltantes)

## Decision Question
Define el ciclo de vida completo TO-BE para una `Sale` dentro de la plataforma Wapsell. Esto incluye condiciones precisas para su creación y confirmación, el momento y los disparadores exactos para su impacto en los niveles de stock, movimientos de caja y cuentas por cobrar, y un proceso completamente definido para la anulación de `Sale`, abarcando reversiones de inventario y financieras, y autorizaciones requeridas.

## AS-IS Evidence
- `05-ASIS/01-ASIS-PRODUCT.md`: "Venta presencial: cotización previa, descuento de stock FIFO por lote con control de atomicidad, pagos mixtos... comprobante imprimible, idempotencia... Anulación de venta — `EstadoVenta.ANULADA` existe como valor del enum, sin ningún endpoint ni lógica que lo produzca." (VERIFIED BY CODE). "Cuenta corriente / cobro de deudas (RF-10) — los modelos (`CuentaCorriente`, `Deuda`, `AplicacionPago`) existen en el schema, sin ningún service que los use." (VERIFIED BY CODE)
- `05-ASIS/03-ASIS-DATA.md`: "`EstadoVenta` (CONFIRMADA/ANULADA — ANULADA existe en el enum sin ningún flujo que la produzca)." (VERIFIED BY CODE). `CuentaCorriente`/`Deuda`/`AplicacionPago` — "modelos completos, sin ningún service que los use (RF-10 sin implementar)." (VERIFIED BY CODE)
- `05-ASIS/07-ASIS-FLOWS.md`: Describe el flujo "Venta presencial completa", pero "Anulación de venta" y "Cobro de deuda / cuenta corriente" están "explícitamente NO soportados hoy." (VERIFIED BY EXECUTION)

## Why This Decision Exists
El AS-IS tiene un ciclo de vida de `Sale` incompleto; específicamente, el estado `ANULADA` existe en el enum pero no tiene lógica correspondiente, y las cuentas por cobrar no están implementadas (CON-017). El TO-BE requiere una definición completa y consistente para el ciclo de vida de `Sale`, lo que impacta la integridad financiera, la gestión de stock y la experiencia del cliente. Esto es un **GAP + MISSING_DECISION (STATE_MACHINE_CONFLICT / BUSINESS_RULE_CONFLICT)**, bloqueando la definición de invariantes y reglas de negocio críticas.

## Alternatives
- **Modelo de reversión completa:** Ante la anulación, todos los efectos (stock, caja, cuentas) se revierten, lo que podría requerir asientos contables complejos. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Cambio de estado con pista de auditoría:** La anulación cambia el estado pero los detalles de la transacción original permanecen, y las nuevas transacciones (e.g., reembolsos) manejan los ajustes financieros. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-017):** "Ambigüedad en contabilidad, gestión de stock y atención al cliente. Es un bloqueante para definir invariantes y reglas de negocio críticas."
- **INFERRED:** Cambios en el esquema de la base de datos para `EstadoVenta` y potencialmente nuevas pistas de auditoría. Refactorización de los módulos de ventas, inventario y caja. Nuevos endpoints API y UI para la anulación.

## Dependencies
- Blocks: NONE
- Depends On: D-007 (DIRECT), D-012 (DIRECT), D-013 (DIRECT)

## Affected Documents
- `05-ASIS/01-ASIS-PRODUCT.md`
- `05-ASIS/03-ASIS-DATA.md`
- `05-ASIS/07-ASIS-FLOWS.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-017)
- `03-CONFLICTS/04-STATE-CONFLICTS.md`
- `03-CONFLICTS/05-BUSINESS-RULE-CONFLICTS.md`
- `apps/api/prisma/schema.prisma` (modelos `Venta`, `EstadoVenta`, `MovimientoStock`, `MovimientoCaja`, `CuentaCorriente`, `Deuda`).
- Módulos backend de Ventas, Inventario, Caja y Contabilidad.

## Implementation Impact
- Implementación de nueva lógica para la anulación de `Sale`, incluyendo efectos en cascada sobre el stock y los registros financieros.
- Desarrollo de APIs y UI para la gestión del estado y las anulaciones de `Sale`.
- Integración con los módulos de Cuentas por Cobrar y Caja.

## Open Questions
- ¿Cuáles son las reglas de negocio para autorizar la anulación de una `Sale` (e.g., límites de tiempo, roles requeridos)?
- ¿Cómo impacta la anulación de una `Sale` en los puntos de fidelidad del cliente o las promociones asociadas?
- ¿Qué pistas de auditoría se requieren para las anulaciones de `Sale`?

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
| ID | `D-008` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---