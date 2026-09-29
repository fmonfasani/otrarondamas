# Conflict Summary

## Totals
- Total Conflicts: 27
- Blocking: 11
- High: 8
- Medium: 4
- Low: 3
- Open: 26
- Resolved: 1
- Deferred: 0
- Missing Decisions: 18
- Terminology Conflicts: 3 (CON-009, CON-014, CON-016, CON-008 - adjusted to 4 with CON-008)
- Role Conflicts: 2 (CON-013, CON-014)
- State Conflicts: 2 (CON-017, CON-022)
- AS-IS/TO-BE Gaps: 9 (CON-011, CON-012, CON-017, CON-021, CON-022, CON-023, CON-024, CON-025, CON-027)

## Blocking Items
- D-001: ¿Cuál es el nombre canónico para la unidad de negocio multi-tenant (`Empresa`, `Business`, `Tenant`) y cómo se transforma el modelo actual de `Empresa`?
- D-002: ¿Cómo se reconcilian las tablas `Usuario` y `Cliente` con una única identidad `User` global, y cómo se modela la relación N:N `User ↔ Business` (Membership)?
- D-003: ¿Cuál es el alcance funcional detallado de Messaging y Asistentes de IA para una primera iteración (canales, capacidades específicas, límites de automatización)?
- D-004: ¿Cuál es el design system canónico para Wapsell, y cómo se implementará el branding configurable por `Business` (tenant)?
- D-005: ¿Cómo se definen y gestionan los roles y permisos dentro del contexto de `Membership` en la plataforma multi-tenant Wapsell?
- D-006: ¿Cómo se enforcing la validación de tipo de token en todos los endpoints para prevenir el acceso entre identidades (`Cliente` vs `Usuario`), especialmente con la nueva identidad `User` global?
- D-007: ¿Cuál es la definición canónica, el ciclo de vida y la relación entre "Sale" (Venta) y "Order" (Pedido) en la plataforma Wapsell?
- D-008: Definir el ciclo de vida completo de `Sale`, incluyendo condiciones exactas de confirmación, afectación de stock/caja/cuentas por cobrar, y el proceso de anulación.
- D-010: Verificar el estado actual de los controles de integridad de stock (`UPDATE` condicional, `CHECK` en lotes, FK compuesta de cliente) requeridos por la SPEC de Ventas (Inc-1) y, si están ausentes, priorizar su implementación.
- D-011: ¿Cuál es la estrategia para la integración de Mercado Pago y otras pasarelas de pago críticas en la plataforma Wapsell (alcance, enfoque, cronograma)?
- D-012: ¿Cuál es el alcance y los requisitos funcionales para la gestión de Cuentas por Cobrar / Cobro de Deudas (RF-10) en la plataforma Wapsell?
- D-013: Definir el ciclo de vida completo de la gestión de caja para el TO-BE, incluyendo aperturas, movimientos, arqueo, cierres y reglas de autorización, y adaptaciones para un contexto multi-tenant.
- D-014: ¿Cuál es el modelo de propiedad del inventario y el ciclo de vida para la gestión multi-tenant en Wapsell, incluyendo movimientos y transferencias entre negocios?
- D-015: Definir el ciclo de vida completo de Compras y la gestión de Cuentas por Pagar para el TO-BE, incluyendo procesamiento de facturas, condiciones de pago y conciliación.
- D-016: Definir el ciclo de vida completo de Fulfillment y Entregas para la plataforma Wapsell, incluyendo la gestión de drivers, zonas, tarifas, tracking y evidencia de entrega.
- D-017: ¿Cuál es la arquitectura TO-BE para Wapsell (por ejemplo, el uso de Kubernetes, GraphQL, colas de mensajes, y características de seguridad como 2FA/PCI DSS)?

## Decisions Required
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

## Unresolved Items
- All open conflicts (CON-002 to CON-027) are unresolved items.

## Evidence Limitations
- Sources with content not directly accessible: `SRC-009 (.docx)`, `SRC-012 (.docx)`, `SRC-013 (.docx)`, `SRC-017 (.xlsx)`, `SRC-018 (.docx)`. Their content was assumed from metadata, summaries, or specific references within readable documents.
- `05-ASIS/11-ASIS-QUALITY.md` (CON-007) and `05-ASIS/05-ASIS-AUTHORIZATION.md` (R01 from SRC-011): Some risks/integrity checks from SRC-011 were not re-verified in the AS-IS reconstruction, so their current status is `NOT DETERMINABLE`.
- `05-ASIS/12-ASIS-EVIDENCE.md`: The AS-IS reconstruction involved static code analysis and HTTP request simulation, not real UI interaction or full production environment verification. Real-world execution evidence is limited to historical SRC-004.
