# TO-BE — Índice por dominio

**Estado:** TO-BE v2 — DRAFT FOR OWNER APPROVAL (OR-B4-043) | **Fecha:** 2026-11-16 | **Autoridad:** subordinado a los Owner Rulings, al Decision Register y a la SPEC General (ISS-08). Cada regla vale por el ruling que cita; lo no decidido figura `OPEN`.

El TO-BE describe **cómo debe ser Wapsell** dominio por dominio, con cada regla atada a su Owner Ruling y el estado real del código al lado. Reemplaza los 21 documentos de la primera versión (conservados en `15-HISTORY/08-TOBE-v1/`), que tenían duplicados y numeración repetida.

| # | Dominio | SPEC General | Estado AS-IS |
|---|---|---|---|
| [01](01-IDENTITY-TENANCY-MEMBERSHIP.md) | Identity, Tenancy y Membership | SPEC §5, §7, §8 | Roles canónicos y transición hechos (#160) |
| [02](02-AUTHORIZATION.md) | Authorization | SPEC §6; Authorization SPEC (APPROVED) | Matriz canónica en `enforce` (hecho, #161) |
| [03](03-CATALOG-PRICING.md) | Catálogo, precios, promociones y mayoristas | SPEC §10.1, §10.6 | Catálogo y categorías hechos |
| [04](04-STORE-CART.md) | Tienda online y carrito | SPEC §10.2, §10.11 | Tienda, cuenta, carrito, pedidos, compras, devoluciones y chat: hechos |
| [05](05-ORDERS-FULFILLMENT.md) | Pedidos y entrega | SPEC §10.3, §11 | Brecha P1: solo existen CONFIRMADO y CANCELADO (#168); el stock se descuenta al confirmar, sin reserva (#165) |
| [06](06-INVENTORY.md) | Inventario | SPEC §11 | Lotes, FEFO/FIFO y no-negativo: hechos |
| [07](07-SALES-PAYMENTS-AR.md) | Ventas, cobros y cuenta corriente | SPEC §10.4, §10.5, §10.7 | Ventas del mostrador y cobros: hechos |
| [08](08-CASH.md) | Caja | SPEC §10.9 | Hecho, auditado |
| [09](09-RETURNS-REFUNDS.md) | Devoluciones y reembolsos | SPEC §10.10 | Hecho (reglas 1–7, 10–12 de OR-B4-035) |
| [10](10-MESSAGING.md) | Mensajería y venta en la conversación | SPEC §12 | Hecho |
| [11](11-REPORTS-AUDIT.md) | Reportes y auditoría del negocio | SPEC §14.2, §14.3 | Hecho |
| [12](12-PLATFORM.md) | Plataforma Wapsell | SPEC §1.3, §7.1 | Hecho, en uso interno. |
| [13](13-FISCAL.md) | Fiscal (AFIP/ARCA) | SPEC §1.3 | No existe. |
| [14](14-LOYALTY.md) | Fidelización | — | Código parcial sin uso. |
| [15](15-OPERATIONS-NFR.md) | Operación y requisitos no funcionales | SPEC §13, §14 | Backups funcionando desde 2026-11-16, solo en el servidor |

## Equivalencias con la primera versión

| Documento anterior (`15-HISTORY/08-TOBE-v1/`) | Ahora |
|---|---|
| 00-TOBE-OVERVIEW | 00-TOBE-INDEX (este documento) |
| 01-IDENTITY-AND-TENANCY, 01-IDENTITY-AND-TENANCY-RECONCILED, 04-IDENTITY | 01-IDENTITY-TENANCY-MEMBERSHIP |
| 05-ROLES-PERMISSIONS | 02-AUTHORIZATION |
| 02-COMMERCE | 03-CATALOG-PRICING, 04-STORE-CART, 05-ORDERS-FULFILLMENT, 07-SALES-PAYMENTS-AR |
| 03-INVENTORY | 06-INVENTORY |
| 04-CASH | 08-CASH |
| 05-MESSAGING | 10-MESSAGING |
| 07-PLATFORM-AND-GOVERNANCE | 12-PLATFORM |
| 02-ARCHITECTURE, 03-DATA, 10-INTEGRATIONS, 11-NFR | 15-OPERATIONS-NFR |
| 01-PRODUCT, 06-MODULES, 07-FLOWS | Repartidos en los documentos por dominio |
| 06-BRANDING-AND-EXPERIENCE, 08-UI-UX, 09-BRANDING | Siguen en `06-SPECIFICATIONS/CANONICAL/06-…` y `07-EXPERIENCE…` (sin decisión del Owner) |
| 08-TOBE-COVERAGE-AUDIT | Reemplazado por `13-AUDIT/38-AUDITORIA-GENERAL-DOCS-SPEC-GAP-2026-11-16.md` |

## Formato de cada documento

Propósito · Reglas (con su ruling) · Permisos · Estado actual (AS-IS) · Abierto. Un cambio de regla entra primero como Owner Ruling en el Decision Register y después se refleja aquí y en la SPEC General.
