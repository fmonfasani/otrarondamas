# Wapsell — Decision Register (HISTORICAL — Phase 3 artifact)

> **HISTORICAL RECORD — NOT THE CANONICAL REGISTER.**
> This file is preserved for traceability. It was produced in Phase 3 as a *requirements*
> artifact, not a decision record.
>
> **Canonical register:** `04-DECISIONS/00-DECISION-REGISTER.md`
> **Reconciled:** 2026-09-28
>
> ### Defects found in this file (2026-09-28)
>
> 1. **The "Decision" column contained the question, not a decision.** Every D-0xx row below
>    is a verbatim copy of the workshop question. A question is not a resolution.
> 2. **`APPROVED` was asserted with no decision text and no approval record.** The 18 workshop
>    fichas (`03-DECISION-WORKSHOP/D-001…D-018.md`) are all `Status: PENDING` /
>    `## Decision: PENDING` / `## Approval: PENDING`. This file was the only artifact claiming
>    otherwise.
> 3. **It mixed two namespaces in one table** under a single "DEC ID" column, merging
>    `DEC-001` (canonical register) with `D-001…D-018` (workshop fichas), which produced the
>    false impression that workshop questions were registered decisions.
> 4. **No dates.** D-001…D-018 carry no date. None was invented during reconciliation.
>
> ### Content preserved below
> The table is preserved as the Phase 3 record. **Do not cite it as decision authority.**
>
> **One deliberate exception to "verbatim" (2026-09-28).** The *Question* and *Impact* columns
> are untouched. The *Phase 3 Status Claim* cells for `D-001…D-018` were annotated in place
> using strikethrough, e.g. `~~APPROVED~~ → **APPROVED — OWNER-VERBATIM**`, so that the original
> Phase 3 claim is still readable next to the reconciled classification:
> D-001/D-002 = `OWNER-VERBATIM`; D-003…D-018 = `DERIVED / RECONSTRUCTED`.
> `DEC-001` was not modified. The reconciled classifications live canonically in
> `04-DECISIONS/00-DECISION-REGISTER.md` §4.

---

| DEC ID | Question (verbatim Phase 3 record — NOT a decision) | Phase 3 Status Claim | Source | Owner | Impact | Related Conflicts |
|---|---|---|---|---|---|---|
| DEC-001 | Alcance de producto: Wapsell como plataforma multi-tenant de comercio conversacional (no Otra Ronda Más standalone) | APPROVED — **VALIDATED**, see `04-DECISIONS/02-MULTITENANCY.md` | `04-DECISIONS/02-MULTITENANCY.md` | fmonfasani | Alto — ver `04-DECISIONS/02-MULTITENANCY.md` para detalle. Resuelve `03-CONFLICTS/00-CONFLICT-REGISTER.md` → CON-001 | CON-001 |
| D-001 | ¿Cuál es el nombre canónico para la unidad de negocio multi-tenant (`Empresa`, `Business`, `Tenant`) y cómo se transforma el modelo actual de `Empresa`? | ~~APPROVED~~ → **APPROVED — OWNER-VERBATIM** | `User Prompt` | fmonfasani | Es fundamental para la definición del modelo de datos de la plataforma multi-tenant y la arquitectura de aislamiento. Afecta directamente la migración del esquema existente. | CON-009 |
| D-002 | ¿Cómo se reconcilian las tablas `Usuario` y `Cliente` con una única identidad `User` global, y cómo se modela la relación N:N `User ↔ Business` (Membership)? | ~~APPROVED~~ → **APPROVED — OWNER-VERBATIM** | `User Prompt` | fmonfasani | Define la base del sistema de identidad y autorización de la plataforma Wapsell, así como el proceso de migración de usuarios existentes. | CON-010 |
| D-003 | ¿Cuál es el alcance funcional detallado de Messaging y Asistentes de IA para una primera iteración (canales, capacidades específicas, límites de automatización)? | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Son características core de la visión de producto, y su definición es necesaria antes de cualquier diseño arquitectónico o de implementación. | CON-011 |
| D-004 | ¿Cuál es el design system canónico para Wapsell, y cómo se implementará el branding configurable por `Business` (tenant)? | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Afecta directamente la coherencia de la marca, la experiencia de usuario y es un requisito clave para el onboarding de nuevos tenants. Es necesario resolver la inconsistencia de tokens de marca actuales. | CON-012 |
| D-005 | ¿Cómo se definen y gestionan los roles y permisos dentro del contexto de `Membership` en la plataforma multi-tenant Wapsell? | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es fundamental para la seguridad y la gestión de acceso en la nueva arquitectura de identidad. Afecta directamente la migración de los sistemas de roles y permisos existentes. | CON-013 |
| D-006 | ¿Cómo se enforcing la validación de tipo de token en todos los endpoints para prevenir el acceso entre identidades (`Cliente` vs `Usuario`), especialmente con la nueva identidad `User` global? | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es una vulnerabilidad de seguridad crítica (R01 de SRC-011) que debe abordarse para proteger la integridad y la confidencialidad de los datos, y es crucial para el diseño de la nueva identidad unificada. | CON-015 |
| D-007 | ¿Cuál es la definición canónica, el ciclo de vida y la relación entre "Sale" (Venta) y "Order" (Pedido) en la plataforma Wapsell? | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es crítico para el modelado de datos, la lógica de negocio y la consistencia transaccional en el dominio de comercio, especialmente en un contexto multi-canal. | CON-016 |
| D-008 | Definir el ciclo de vida completo de `Sale`, incluyendo condiciones exactas de confirmación, afectación de stock/caja/cuentas por cobrar, y el proceso de anulación. | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Fundamental para la integridad financiera, la gestión de inventario y la trazabilidad contable. Es un bloqueante para definir invariantes y reglas de negocio críticas. | CON-017 |
| D-009 | ¿Cómo se garantizará la adherencia al proceso de aprobación de características para evitar la implementación de funcionalidades no aprobadas (como se observó en CON-018)? | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es esencial para mantener el control sobre el desarrollo del producto, la calidad y la alineación con las decisiones de negocio. | CON-018 |
| D-010 | Verificar el estado actual de los controles de integridad de stock (`UPDATE` condicional, `CHECK` en lotes, FK compuesta de cliente) requeridos por la SPEC de Ventas (Inc-1) y, si están ausentes, priorizar su implementación. | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es un requisito crítico para la integridad de datos de inventario y la precisión de las reglas de negocio, afectando directamente las transacciones de ventas y compras. | CON-019 |
| D-011 | ¿Cuál es la estrategia para la integración de Mercado Pago y otras pasarelas de pago críticas en la plataforma Wapsell (alcance, enfoque, cronograma)? | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es una funcionalidad clave para el procesamiento de pagos en muchos mercados y su ausencia actual impacta directamente la capacidad del producto. | CON-020 |
| D-012 | ¿Cuál es el alcance y los requisitos funcionales para la gestión de Cuentas por Cobrar / Cobro de Deudas (RF-10) en la plataforma Wapsell? | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es una funcionalidad financiera crítica para la gestión del crédito de clientes y la salud financiera del negocio, actualmente ausente a pesar de la existencia de modelos de datos. | CON-021 |
| D-013 | Definir el ciclo de vida completo de la gestión de caja para el TO-BE, incluyendo aperturas, movimientos, arqueo, cierres y reglas de autorización, y adaptaciones para un contexto multi-tenant. | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Fundamental para el control financiero, la auditabilidad y los procedimientos operativos de los negocios en la plataforma Wapsell. | CON-022 |
| D-014 | ¿Cuál es el modelo de propiedad del inventario y el ciclo de vida para la gestión multi-tenant en Wapsell, incluyendo movimientos y transferencias entre negocios? | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es fundamental para evitar inconsistencias de stock, garantizar la precisión de inventario y permitir modelos de negocio más complejos en un entorno multi-tenant. | CON-023 |
| D-015 | Definir el ciclo de vida completo de Compras y la gestión de Cuentas por Pagar para el TO-BE, incluyendo procesamiento de facturas, condiciones de pago y conciliación. | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es crucial para la precisión financiera, la gestión de la relación con proveedores y la eficiencia operativa del dominio de compras. | CON-024 |
| D-016 | Definir el ciclo de vida completo de Fulfillment y Entregas para la plataforma Wapsell, incluyendo la gestión de drivers, zonas, tarifas, tracking y evidencia de entrega. | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es fundamental para las operaciones de comercio electrónico y la satisfacción del cliente. La ausencia actual de esta funcionalidad es un bloqueante clave. | CON-025 |
| D-017 | ¿Cuál es la arquitectura TO-BE para Wapsell (por ejemplo, el uso de Kubernetes, GraphQL, colas de mensajes, y características de seguridad como 2FA/PCI DSS)? | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es una decisión arquitectónica fundamental que impacta directamente la escalabilidad, resiliencia, seguridad y complejidad de desarrollo y operación de la plataforma. | CON-002, CON-026 |
| D-018 | Definir la estrategia y el roadmap para implementar CI/CD para la plataforma Wapsell, incluyendo automatización de pruebas, construcción, despliegue y procesos de liberación. | ~~APPROVED~~ → **APPROVED — DERIVED / RECONSTRUCTED** | `User Prompt` | fmonfasani | Es crítico para la velocidad de desarrollo, la calidad del código, la fiabilidad de los despliegues y la reducción de la sobrecarga operacional en una plataforma SaaS. | CON-027 |