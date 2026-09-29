# D-007 — ¿Cuál es la definición canónica, el ciclo de vida y la relación entre "Sale" (Venta) y "Order" (Pedido) en la plataforma Wapsell?

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Commerce, Sales, Orders, Data

Related conflicts: CON-016 (Ambigüedad: Terminología y Relación entre "Sale" (Venta) y "Order" (Pedido) en el TO-BE)

## Decision Question
Establecer la definición canónica, el ciclo de vida completo (estados y transiciones) y la relación explícita entre "Sale" (Venta) y "Order" (Pedido) dentro de la plataforma Wapsell. Clarificar si son entidades distintas, si una subsume a la otra, o cómo interactúan en diferentes canales comerciales (e.g., POS, tienda online).

## AS-IS Evidence
- `05-ASIS/03-ASIS-DATA.md`: "`Venta` (`estado` tipado enum...`idempotencyKey @unique`; `numero Int?` correlativo por empresa...`total`/`descuento` `@db.Decimal(14,2)`)... `VentaItem`... `Pedido`/`PedidoItem` (`clienteId` obligatorio, `usuarioId` opcional)..." (VERIFIED BY CODE)
- `05-ASIS/07-ASIS-FLOWS.md`: Describe flujos separados para "Venta presencial completa" y "Pedido de tienda online → gestión en panel." (VERIFIED BY EXECUTION)

## Why This Decision Exists
El AS-IS diferencia claramente `Venta` (ventas presenciales) y `Pedido` (pedidos online) con modelos de datos y ciclos de vida separados. Sin embargo, las especificaciones TO-BE (e.g., `02-CANONICAL-SPEC/02-COMMERCE-SPEC.md`) simplemente listan "pedidos, ventas" sin clarificar su relación precisa o distinción en el nuevo contexto multi-canal y multi-tenant (CON-016). Esta **AMBIGUITY / TERMINOLOGY_CONFLICT / DATA_MODEL_CONFLICT** es bloqueante para el modelado de datos y la lógica de negocio consistente.

## Alternatives
- **Mantener entidades distintas:** `Sale` y `Order` permanecen separadas, cada una con su propio ciclo de vida, pero con puntos de integración claros. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Unificar bajo una única entidad "Transacción" o "Evento Comercial":** Abstraer `Sale` y `Order` en una entidad común con diferentes tipos o estados. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **`Order` como precursor de `Sale`:** Todos los `Orders` eventualmente se convierten en `Sales` tras el cumplimiento/pago. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-016):** "Riesgo de modelado inconsistente, lógica duplicada y malentendidos en los procesos de negocio si no se define claramente la relación entre `Sale` y `Order`."
- **INFERRED:** Afecta el esquema de la base de datos, el diseño de la API para transacciones comerciales, la implementación de reglas de negocio (e.g., descuento de stock, precios) y los informes.

## Dependencies
- Blocks: D-008 (DIRECT), D-016 (DIRECT)
- Depends On: D-001 (INDIRECT)

## Affected Documents
- `05-ASIS/03-ASIS-DATA.md`
- `05-ASIS/07-ASIS-FLOWS.md`
- `02-CANONICAL-SPEC/02-COMMERCE-SPEC.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-016)
- `apps/api/prisma/schema.prisma` (modelos `Venta`, `Pedido`).
- Todos los módulos backend relacionados con el comercio (Ventas, Pedidos, Inventario).
- Aplicaciones frontend (POS, tienda online) para la visualización de transacciones.

## Implementation Impact
- Potenciales cambios en los modelos `Venta` y `Pedido`, o introducción de un nuevo modelo de transacción base.
- Refactorización de la lógica de procesamiento de ventas y pedidos.
- Actualizaciones en los informes y análisis basados en el modelo de transacción elegido.

## Open Questions
- ¿Cuáles son los estados y transiciones específicos tanto para `Sale` como para `Order`?
- ¿Cómo se aplicarán las reglas de precios de manera consistente en ambos tipos de transacciones?
- ¿Cómo se reservará y descontará el stock para cada tipo de transacción?

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
| ID | `D-007` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---