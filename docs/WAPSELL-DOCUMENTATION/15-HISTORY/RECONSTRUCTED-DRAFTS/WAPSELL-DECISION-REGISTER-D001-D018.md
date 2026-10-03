# WAPSELL — DECISION REGISTER — D-001…D-018

**Estado:** propuesta de actualización del registro canónico  
**Fecha:** 2026-09-28  
**Evidencia de aprobación:** workshop del Owner, 2026-09-28  
**Implementación:** OPEN para todas las decisiones

| ID | Decisión resumida | Estado |
|---|---|---|
| D-001 | Business = Tenant; Empresa se transforma conceptualmente en Business y unidad de aislamiento. | APPROVED |
| D-002 | User global; User ↔ Business mediante Membership; roles/permisos contextuales. | APPROVED |
| D-003 | Messaging propio de Wapsell activo en MVP; AI preparado pero inactivo. | APPROVED |
| D-004 | Design System canónico Wapsell + Brand configurable por Business. | APPROVED |
| D-005 | Roles/permisos pertenecen al Membership. | APPROVED |
| D-006 | Todo endpoint valida User + Membership + autorización; token válido por sí solo no autoriza. | APPROVED |
| D-007 | Order y Sale son entidades distintas; Order puede originar Sale; POS puede generar Sale directamente. | APPROVED |
| D-008 | Sale tiene lifecycle explícito; confirmación aplica efectos; anulación explícita y transaccional. | APPROVED |
| D-009 | SPEC es fuente de verdad; implementación trazable a requisito/decisión/SPEC. | APPROVED |
| D-010 | Integridad transaccional de stock obligatoria. | APPROVED |
| D-011 | Pasarelas externas soportadas; Mercado Pago prioritario; proveedor desacoplado. | APPROVED |
| D-012 | Accounts Receivable por Business; saldos, cobros posteriores y aplicación de cobros. | APPROVED |
| D-013 | Caja por Business; apertura, movimientos, arqueo y cierre; trazabilidad y permisos. | APPROVED |
| D-014 | Stock exclusivo por Business; no existe stock global compartido. | APPROVED |
| D-015 | Compras por Business + Accounts Payable + pagos/aplicación y conciliación. | APPROVED |
| D-016 | Fulfillment dentro de Orders; preparación, asignación, entrega, zonas, tarifas, tracking y evidencia. | APPROVED |
| D-017 | Arquitectura inicial = Modular Monolith; evolución incremental. | APPROVED |
| D-018 | CI/CD automatizado e incremental con quality gates y despliegues controlados. | APPROVED |

### Regla de implementación

`APPROVED` no significa que la implementación técnica esté definida.

Los detalles pendientes deben aparecer como `OPEN DETAIL` en las SPEC especializadas, Architecture, Contracts, Invariants o Tests según corresponda.
