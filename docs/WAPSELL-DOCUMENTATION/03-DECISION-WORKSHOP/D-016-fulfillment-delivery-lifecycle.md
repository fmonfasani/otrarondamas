# D-016 — Definir el ciclo de vida completo de Fulfillment y Entregas para la plataforma Wapsell, incluyendo la gestión de drivers, zonas, tarifas, tracking y evidencia de entrega.

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Fulfillment, Operations, Commerce

Related conflicts: CON-025 (Ausencia de Funcionalidad de Fulfillment y Entregas (RF-13))

## Decision Question
Define el ciclo de vida completo TO-BE para Fulfillment y Entregas dentro de la plataforma Wapsell. Esto incluye procesos detallados para la gestión de drivers de entrega, la definición de zonas de entrega y tarifas asociadas, la implementación de seguimiento en tiempo real para pedidos, y la captura de evidencia verificable de entrega, todo adaptado para un entorno multi-tenant. Esto aborda la ausencia de esta funcionalidad (RF-13) en el AS-IS.

## AS-IS Evidence
- `05-ASIS/01-ASIS-PRODUCT.md`: "**Entregas** (RF-13) — el modelo `Entrega` existe (1:1 con Pedido, campos `preparadorId`/`repartidorId`), pero no existe carpeta `entregas/` en `apps/api/src`: es solo modelo de datos, sin controller ni service." (VERIFIED BY CODE)
- `05-ASIS/03-ASIS-DATA.md`: "`Entrega` (1:1 con `Pedido`, campos `preparadorId`/`repartidorId` — modelo existe, sin módulo funcional: no hay carpeta `entregas/` en `apps/api/src`)." (VERIFIED BY CODE)
- `05-ASIS/06-ASIS-MODULES.md`: "No existen como carpeta/módulo en `apps/api/src`, pese a tener modelo de datos en el schema: **`entregas`** (RF-13, modelo `Entrega` existe)..." (VERIFIED BY CODE)
- `05-ASIS/07-ASIS-FLOWS.md`: "Flujos explícitamente NO soportados hoy... Entrega de pedido con repartidor — modelo `Entrega` existe, sin módulo funcional (RF-13)." (VERIFIED BY EXECUTION)

## Why This Decision Exists
El AS-IS tiene un modelo de datos (`Entrega`) para fulfillment/entrega pero no servicios o flujos implementados correspondientes (RF-13 no está implementada, CON-025). El TO-BE requiere esta funcionalidad para las operaciones de e-commerce. Esto es un **GAP + MISSING_DECISION (SCOPE_CONFLICT)** que es bloqueante para las operaciones comerciales y la satisfacción del cliente.

## Alternatives
- **Gestión interna básica de entregas:** Centrarse en la gestión de una flota interna de drivers, con seguimiento simple. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Integración con proveedores de logística de terceros (3PL):** Utilizar servicios de entrega externos. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Solo recogida por el cliente (sin entrega):** Limitar las opciones de cumplimiento inicialmente. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-025):** "Incapacidad para gestionar la logística de entrega de productos, el seguimiento de envíos y la provisión de servicios de cumplimiento. Bloqueante para operaciones de comercio electrónico."
- **INFERRED:** Mayor satisfacción del cliente, aumento de las ventas por las opciones de entrega, potencial para nuevas fuentes de ingresos (tarifas de entrega), mayor complejidad operativa.

## Dependencies
- Blocks: NONE
- Depends On: D-001 (INDIRECT), D-007 (DIRECT)

## Affected Documents
- `05-ASIS/01-ASIS-PRODUCT.md`
- `05-ASIS/03-ASIS-DATA.md`
- `05-ASIS/06-ASIS-MODULES.md`
- `05-ASIS/07-ASIS-FLOWS.md`
- `02-CANONICAL-SPEC/03-OPERATIONS-SPEC.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-025)
- `apps/api/prisma/schema.prisma` (modelo `Entrega`).
- Módulos backend de Pedidos y Fulfillment.
- UI frontend para seguimiento de pedidos y gestión de entregas.

## Implementation Impact
- Desarrollo de un nuevo módulo backend `entregas/` con servicios y APIs.
- Modificaciones de esquema para `Entrega` (e.g., estado, información de seguimiento, asignación de drivers).
- Integración con servicios de mapas/geolocalización para la gestión de zonas y drivers.
- UI frontend para la aplicación del driver, seguimiento del cliente y gestión de entregas del administrador.

## Open Questions
- ¿Qué tipo de modelo de entrega se desea (e.g., flota propia, 3PL, híbrido)?
- ¿Cuáles son las reglas para definir zonas de entrega y calcular tarifas?
- ¿Cómo se actualizará y comunicará el estado de la entrega a los clientes?

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
| ID | `D-016` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---