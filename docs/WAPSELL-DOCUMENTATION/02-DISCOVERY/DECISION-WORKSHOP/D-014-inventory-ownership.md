# D-014 — ¿Cuál es el modelo de propiedad del inventario y el ciclo de vida para la gestión multi-tenant en Wapsell, incluyendo movimientos y transferencias entre negocios?

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Inventory, Commerce, Data

Related conflicts: CON-023 (Ciclo de Vida y Propiedad del Inventario sin Definición TO-BE Explícita)

## Decision Question
Define el modelo integral de propiedad y el ciclo de vida del inventario TO-BE para la gestión multi-tenant en Wapsell. Esto incluye clarificar cómo se posee el stock (e.g., por negocio, compartido), cómo se manejan los movimientos y transferencias entre las diferentes unidades de `Business`, y las implicaciones para la disponibilidad de stock, las reservas y los informes en un contexto multi-tenant.

## AS-IS Evidence
- `05-ASIS/01-ASIS-PRODUCT.md`: "Inventario: ajustes manuales atómicos, alertas de bajo stock y de vencimiento configurables." (VERIFIED BY CODE). "inventario por lotes FIFO con ajustes y alertas." (VERIFIED BY CODE)
- `05-ASIS/03-ASIS-DATA.md`: "`Lote` (`@@unique([productoId, numeroLote, empresaId])`)", `MovimientoStock` (mecanismo único de trazabilidad de stock, reusado por Ventas/Compras/Ajustes/Pedidos confirmados). Prácticamente todo modelo de negocio lleva `empresaId`. (VERIFIED BY CODE)

## Why This Decision Exists
El AS-IS tiene un sistema de inventario robusto (FIFO, lotes) para un solo negocio, con `Lote` y `MovimientoStock` vinculados a `empresaId`. Sin embargo, la visión de plataforma multi-tenant TO-BE carece de una definición explícita de la propiedad del inventario y el ciclo de vida en múltiples unidades de `Business` (CON-023). Esto es un **GAP + MISSING_DECISION (BUSINESS_RULE_CONFLICT / INVENTORY_CONFLICT)** que crea ambigüedad y es bloqueante para implementar logística avanzada y mantener la consistencia del stock.

## Alternatives
- **Aislamiento estricto de inventario por negocio:** Cada `Business` gestiona su propio inventario de forma completamente separada. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Inventario compartido con flags de propiedad:** Pool de inventario centralizado, pero los ítems se etiquetan con el `Business` propietario para fines contables. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Capacidades de transferencia entre negocios:** Permitir transferencias explícitas de stock entre negocios dentro de la plataforma. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-023):** "Ambigüedad en la gestión de inventario multi-tenant, lo que podría llevar a inconsistencias de stock y desafíos logísticos."
- **INFERRED:** Impacta la precisión del stock, la eficiencia del cumplimiento, los informes entre negocios y el potencial de contabilidad inter-empresarial.

## Dependencies
- Blocks: D-015 (INDIRECT)
- Depends On: D-001 (DIRECT)

## Affected Documents
- `05-ASIS/01-ASIS-PRODUCT.md`
- `05-ASIS/03-ASIS-DATA.md`
- `05-ASIS/07-ASIS-FLOWS.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-023)
- `03-CONFLICTS/04-STATE-CONFLICTS.md`
- `03-CONFLICTS/05-BUSINESS-RULE-CONFLICTS.md`
- `apps/api/prisma/schema.prisma` (modelos `Lote`, `MovimientoStock`, `Producto`).
- Módulos backend de Inventario, Ventas y Compras.

## Implementation Impact
- Modificaciones del esquema para los modelos de inventario para soportar la propiedad o el uso compartido multi-tenant.
- Refactorización de la lógica de movimiento, ajuste y reserva de stock.
- Desarrollo de nuevas APIs y UI para gestionar transferencias entre negocios o inventario compartido.

## Open Questions
- ¿Existen escenarios para almacenes físicos compartidos o compras centralizadas entre negocios?
- ¿Cómo funcionarán las reservas de stock en un entorno multi-tenant (e.g., para pedidos online)?
- ¿Cuáles son los requisitos de informes para el inventario en múltiples negocios?

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
| ID | `D-014` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---