# Wapsell — Decision Workshop Master

> **RECONCILED 2026-09-28.** The statement *"NO DECISION HAS BEEN MADE IN PHASE 3.5"* at
> sections 1 and 11 below is the **Phase 3.5 state, preserved as history**. It is no longer
> current. The Owner confirms D-001…D-018 **were approved** during the workshop.
> However, the repository holds **no decision text** for them: all 18 fichas remain
> `## Decision: PENDING` / `## Approval: PENDING`, and the only artifact that claimed
> `APPROVED` (`03-CONFLICTS/07-DECISION-REGISTER.md`) listed the **question** in its "Decision"
> column. Per the Owner's mandate the decisions are now recorded as
> **`APPROVED — OWNER-VERBATIM / APPROVED — DERIVED / RECONSTRUCTED`**, with no invented formulation.
> Canonical register: `04-DECISIONS/00-DECISION-REGISTER.md`.
> See `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md`.

## 1. Purpose
This document formally prepares the pending decisions for a Decision Workshop, transforming conflicts, gaps, AS-IS evidence, and existing decisions into a clear structure to enable informed decision-making by the Owner. NO DECISION HAS BEEN MADE IN PHASE 3.5.

> **Historical note (§1, preserved).** Accurate for Phase 3.5. Superseded by the reconciliation
> banner above. See §11 for the original explicit statement.

## 2. Phase 3 Status
- Total Conflicts: 27
- Resolved: 1 (CON-001)
- Open: 26
- Blocking: 11
- High: 8
- Medium: 4
- Low: 3
- Gaps: 9
- Proposals: 3
- Missing Decisions: 18 (D-001 to D-018)
- Evidence limitations: 5 (refer to Section 8 of Final Report for details)
- Phase 3 consistency: PASS
- Phase 4: BLOCKED until critical decisions are resolved.

## 3. Decision Inventory
- D-001: ¿Cuál es el nombre canónico para la unidad de negocio multi-tenant (`Empresa`, `Business`, `Tenant`) y cómo se transforma el modelo actual de `Empresa`?
- D-002: ¿Cómo se reconcilian las tablas `Usuario` y `Cliente` con una única identidad `User` global, y cómo se modela la relación N:N `User ↔ Business` (Membership)?
- D-003: ¿Cuál es el alcance funcional detallado de Messaging y Asistentes de IA para una primera iteración (canales, capacidades específicas, límites de automatización)?
- D-004: ¿Cuál es el design system canónico para Wapsell, y cómo se implementará el branding configurable por `Business` (tenant)?
- D-005: ¿Cómo se definen y gestionan los roles y permisos dentro del contexto de `Membership` en la plataforma multi-tenant Wapsell?
- D-006: ¿Cómo se enforcing la validación de tipo de token en todos los endpoints para prevenir el acceso entre identidades (`Cliente` vs `Usuario`), especialmente con la nueva identidad `User` global?
- D-007: ¿Cuál es la definición canónica, el ciclo de vida y la relación entre "Sale" (Venta) y "Order" (Pedido) en la plataforma Wapsell?
- D-008: Definir el ciclo de vida completo de `Sale`, incluyendo condiciones exactas de confirmación, afectación de stock/caja/cuentas por cobrar, y el proceso de anulación.
- D-009: ¿Cómo se garantizará la adherencia al proceso de aprobación de características para evitar la implementación de funcionalidades no aprobadas (como se observó en CON-018)?
- D-010: Verificar el estado actual de los controles de integridad de stock (`UPDATE` condicional, `CHECK` en lotes, FK compuesta de cliente) requeridos por la SPEC de Ventas (Inc-1) y, si están ausentes, priorizar su implementación.
- D-011: ¿Cuál es la estrategia para la integración de Mercado Pago y otras pasarelas de pago críticas en la plataforma Wapsell (alcance, enfoque, cronograma)?
- D-012: ¿Cuál es el alcance y los requisitos funcionales para la gestión de Cuentas por Cobrar / Cobro de Deudas (RF-10) en la plataforma Wapsell?
- D-013: Definir el ciclo de vida completo de la gestión de caja para el TO-BE, incluyendo aperturas, movimientos, arqueo, cierres y reglas de autorización, y adaptaciones para un contexto multi-tenant.
- D-014: ¿Cuál es el modelo de propiedad del inventario y el ciclo de vida para la gestión multi-tenant en Wapsell, incluyendo movimientos y transferencias entre negocios?
- D-015: Definir el ciclo de vida completo de Compras y la gestión de Cuentas por Pagar para el TO-BE, incluyendo procesamiento de facturas, condiciones de pago y conciliación.
- D-016: Definir el ciclo de vida completo de Fulfillment y Entregas para la plataforma Wapsell, incluyendo la gestión de drivers, zonas, tarifas, tracking y evidencia de entrega.
- D-017: ¿Cuál es la arquitectura TO-BE para Wapsell (por ejemplo, el uso de Kubernetes, GraphQL, colas de mensajes, y características de seguridad como 2FA/PCI DSS)?
- D-018: Definir la estrategia y el roadmap para implementar CI/CD para la plataforma Wapsell, incluyendo automatización de pruebas, construcción, despliegue y procesos de liberación.

## 4. Decision Domains
- **Identity, Tenancy, Data:** D-001, D-002
- **Messaging, Product, UI/UX, Integrations:** D-003
- **Branding, UI/UX:** D-004
- **Identity, Authorization, Roles:** D-005, D-006
- **Commerce, Sales, Orders, Data:** D-007, D-008
- **Governance, Sales, Quality:** D-009, D-010
- **Payments, Integrations:** D-011
- **Payments, Commerce, Data, Accounting:** D-012
- **Cash, Payments, Accounting:** D-013
- **Inventory, Commerce, Data:** D-014
- **Purchases, Accounting, Payments:** D-015
- **Fulfillment, Operations, Commerce:** D-016
- **Architecture, Platform, Security:** D-017
- **DevOps/Deployment, Quality, Platform:** D-018

## 5. Dependency Overview
Refer to `03-DECISION-WORKSHOP/02-DECISION-DEPENDENCIES.md` for a detailed dependency matrix and explanation.

## 6. Recommended Workshop Order
Refer to `03-DECISION-WORKSHOP/02-DECISION-DEPENDENCIES.md` for the suggested resolution order.

## 7. Decision Readiness
All 18 pending decisions (D-001 to D-018) are currently classified as `READY_FOR_WORKSHOP`. For each decision, a clear question has been formulated, supported by AS-IS evidence, identified alternatives (if documented), and known consequences. None are currently blocked by a lack of evidence required to formulate the question for the Owner.

## 8. Evidence Limitations
- Sources with content not directly accessible: `SRC-009 (.docx)`, `SRC-012 (.docx)`, `SRC-013 (.docx)`, `SRC-017 (.xlsx)`, `SRC-018 (.docx)`. Their content was assumed from metadata, summaries, or specific references within readable documents.
- `05-ASIS/11-ASIS-QUALITY.md` (CON-007) and `05-ASIS/05-ASIS-AUTHORIZATION.md` (R01 from SRC-011): Some risks/integrity checks from SRC-011 were not re-verified in the AS-IS reconstruction, so their current status is `NOT DETERMINABLE`.
- `05-ASIS/12-ASIS-EVIDENCE.md`: The AS-IS reconstruction involved static code analysis and HTTP request simulation, not real UI interaction or full production environment verification. Real-world execution evidence is limited to historical SRC-004.

## 9. Questions Requiring Owner Input
All 18 pending decisions (D-001 to D-018) require Owner input. These are detailed in `03-CONFLICTS/08-DECISIONS-REQUIRED.md` and in their individual Fichas in `03-DECISION-WORKSHOP/`.

## 10. Rules for Approval
- Decisions must be made by the designated Owner.
- Decisions must be formally documented with a status of `APPROVED`, `PROPOSED`, `PENDING`, `DEFERRED`, `REJECTED`, or `UNKNOWN`.
- Once a `D-XXX` decision is approved, its status will be updated in `07-DECISION-REGISTER.md`, and the `00-CONFLICT-REGISTER.md` will be updated to reflect the resolution of related `CON-XXX`.

> **Reconciliation note (§10, 2026-09-28).** The rule above routed approvals to
> `03-CONFLICTS/07-DECISION-REGISTER.md`. That file is now **historical** and is **not** the
> canonical register. Per `00-GOVERNANCE/01-SOURCE-OF-TRUTH.md` ("Approved decisions → Decision
> Register"), the canonical register is **`04-DECISIONS/00-DECISION-REGISTER.md`**. This is the
> origin of the registry confusion recorded as **GRF-03**.

## 11. Explicit Statement
"NO DECISION HAS BEEN MADE IN PHASE 3.5."

> **Superseded 2026-09-28.** True for Phase 3.5; retained above as history. The Owner confirms
> D-001…D-018 were approved in the workshop. Their decision text is not recoverable from the
> repository, so they are registered as `APPROVED — OWNER-VERBATIM / APPROVED — DERIVED / RECONSTRUCTED` rather than
> `APPROVED` with a fabricated formulation. See **GRF-01** (AI scope) and **GRF-02** (namespace
> equivalence).
