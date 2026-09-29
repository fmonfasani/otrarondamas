# Decision Dependencies Matrix

> **RECONCILED 2026-09-28.** Two orthogonal states are now distinguished, as required by the
> Owner's mandate:
>
> - **Decision state** — the Owner confirms D-001…D-018 were approved, but decision text is not
>   reconstructable. All 18: `APPROVED — OWNER-VERBATIM / APPROVED — DERIVED / RECONSTRUCTED`.
> - **Implementation detail state** — `OPEN` for all 18. **A decision being approved does not
>   mean its details are defined.** DEC-001 approves product direction only and explicitly
>   excludes its implementation (`04-DECISIONS/02-MULTITENANCY.md:53-72`).
>
> The `Depends On` / `Blocks` / `Reason` relations below are preserved verbatim from Phase 3.5.
> Canonical register: `04-DECISIONS/00-DECISION-REGISTER.md`.

This document outlines the identified dependencies between the decisions (D-XXX) for Wapsell, aiming to provide a suggested resolution order for the Decision Workshop.

## Reconciliation Status (2026-09-28)

| Decision | Decision state | Dependency satisfied? | Implementation detail | Reason |
|---|---|---|---|---|
| D-001 | APPROVED — OWNER-VERBATIM | PARTIAL — direction from DEC-001 ("Business = Tenant") | OPEN | Foundational. The `Empresa` transformation is explicitly NOT decided (DEC-001:55-57). |
| D-002 | APPROVED — OWNER-VERBATIM | PARTIAL — direction from DEC-001 ("User = identidad global", "Membership N:N") | OPEN | Concrete data model, `Usuario.email @unique` and the `Usuario`/`Cliente` split are NOT decided. |
| D-003 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | Functional scope explicitly excluded by DEC-001:61-65. See GRF-01. |
| D-004 | APPROVED — DERIVED / RECONSTRUCTED | PARTIAL — Brand concept only | OPEN | Canonical design system NOT decided. |
| D-005 | APPROVED — DERIVED / RECONSTRUCTED | PARTIAL — principle only | OPEN | Role/permission catalog NOT decided. |
| D-006 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-007 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | Order/Sale states explicitly an open question in the ficha. |
| D-008 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-009 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-010 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-011 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-012 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-013 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-014 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-015 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-016 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-017 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |
| D-018 | APPROVED — DERIVED / RECONSTRUCTED | NO | OPEN | — |

## Dependency Matrix (Phase 3.5 record — preserved verbatim)

| Decision | Depends On | Blocks | Reason |
|---|---|---|---|
| D-001 | NONE | D-002, D-003, D-004, D-005, D-007, D-011, D-012, D-013, D-014, D-015, D-016, D-017 | Foundational: Defines the core multi-tenant business unit. |
| D-002 | D-001 (DIRECT) | D-003, D-005, D-006, D-007, D-012 | Requires canonical business unit. Core for identity and authorization. |
| D-003 | D-001 (INDIRECT), D-002 (INDIRECT) | D-017 | Messaging involves users and businesses, depends on core identity/tenancy. |
| D-004 | D-001 (DIRECT) | NONE | Branding is applied per Business/Tenant. |
| D-005 | D-002 (DIRECT) | D-006 | Roles and permissions are tied to Membership. |
| D-006 | D-002 (DIRECT), D-005 (INDIRECT) | NONE | Requires unified User identity and Membership. Security implementation for the new model. |
| D-007 | D-001 (INDIRECT) | D-008, D-016 | Clarifies core commerce entities (Sale vs. Order). |
| D-008 | D-007 (DIRECT), D-012 (DIRECT), D-013 (DIRECT) | NONE | Requires clear Sale/Order definition, and integration with Accounts Receivable and Cash Management. |
| D-009 | NONE | NONE | Process improvement for feature approval. |
| D-010 | D-008 (INDIRECT) | NONE | Verification of existing integrity, crucial for inventory stability in sales/inventory flows. |
| D-011 | D-001 (INDIRECT) | NONE | Payment integration for commerce, requires business context. |
| D-012 | D-001 (INDIRECT), D-002 (INDIRECT) | D-008 | Financial functionality, depends on business and customer identity. |
| D-013 | D-001 (INDIRECT) | D-008 | Financial functionality, depends on business context. |
| D-014 | D-001 (DIRECT) | D-015 | Multi-tenant inventory management requires business unit definition. |
| D-015 | D-001 (INDIRECT), D-014 (INDIRECT) | NONE | Purchases involve suppliers and inventory, depends on business and inventory model. |
| D-016 | D-001 (INDIRECT), D-007 (DIRECT) | NONE | Fulfillment is tied to orders and business context. |
| D-017 | D-001 (INDIRECT), D-002 (INDIRECT), D-003 (INDIRECT) | D-018 | High-level platform architecture depends on core product vision. |
| D-018 | D-017 (DIRECT) | NONE | CI/CD implementation depends on the chosen architecture. |

## Suggested Resolution Order

This order prioritizes foundational decisions and those with direct dependencies, aiming to unblock subsequent decisions efficiently.

1.  **D-001** — ¿Cuál es el nombre canónico para la unidad de negocio multi-tenant (`Empresa`, `Business`, `Tenant`) y cómo se transforma el modelo actual de `Empresa`?
2.  **D-002** — ¿Cómo se reconcilian las tablas `Usuario` y `Cliente` con una única identidad `User` global, y cómo se modela la relación N:N `User ↔ Business` (Membership)?
3.  **D-004** — ¿Cuál es el design system canónico para Wapsell, y cómo se implementará el branding configurable por `Business` (tenant)?
4.  **D-005** — ¿Cómo se definen y gestionan los roles y permisos dentro del contexto de `Membership` en la plataforma multi-tenant Wapsell?
5.  **D-006** — ¿Cómo se enforcing la validación de tipo de token en todos los endpoints para prevenir el acceso entre identidades (`Cliente` vs `Usuario`), especialmente con la nueva identidad `User` global?
6.  **D-007** — ¿Cuál es la definición canónica, el ciclo de vida y la relación entre "Sale" (Venta) y "Order" (Pedido) en la plataforma Wapsell?
7.  **D-012** — ¿Cuál es el alcance y los requisitos funcionales para la gestión de Cuentas por Cobrar / Cobro de Deudas (RF-10) en la plataforma Wapsell?
8.  **D-013** — Definir el ciclo de vida completo de la gestión de caja para el TO-BE, incluyendo aperturas, movimientos, arqueo, cierres y reglas de autorización, y adaptaciones para un contexto multi-tenant.
9.  **D-008** — Definir el ciclo de vida completo de `Sale`, incluyendo condiciones exactas de confirmación, afectación de stock/caja/cuentas por cobrar, y el proceso de anulación.
10. **D-014** — ¿Cuál es el modelo de propiedad del inventario y el ciclo de vida para la gestión multi-tenant en Wapsell, incluyendo movimientos y transferencias entre negocios?
11. **D-015** — Definir el ciclo de vida completo de Compras y la gestión de Cuentas por Pagar para el TO-BE, incluyendo procesamiento de facturas, condiciones de pago y conciliación.
12. **D-016** — Definir el ciclo de vida completo de Fulfillment y Entregas para la plataforma Wapsell, incluyendo la gestión de drivers, zonas, tarifas, tracking y evidencia de entrega.
13. **D-003** — ¿Cuál es el alcance funcional detallado de Messaging y Asistentes de IA para una primera iteración (canales, capacidades específicas, límites de automatización)?
14. **D-011** — ¿Cuál es la estrategia para la integración de Mercado Pago y otras pasarelas de pago críticas en la plataforma Wapsell (alcance, enfoque, cronograma)?
15. **D-017** — ¿Cuál es la arquitectura TO-BE para Wapsell (por ejemplo, el uso de Kubernetes, GraphQL, colas de mensajes, y características de seguridad como 2FA/PCI DSS)?
16. **D-018** — Definir la estrategia y el roadmap para implementar CI/CD para la plataforma Wapsell, incluyendo automatización de pruebas, construcción, despliegue y procesos de liberación.
17. **D-009** — ¿Cómo se garantizará la adherencia al proceso de aprobación de características para evitar la implementación de funcionalidades no aprobadas (como se observó en CON-018)?
18. **D-010** — Verificar el estado actual de los controles de integridad de stock (`UPDATE` condicional, `CHECK` en lotes, FK compuesta de cliente) requeridos por la SPEC de Ventas (Inc-1) y, si están ausentes, priorizar su implementación.