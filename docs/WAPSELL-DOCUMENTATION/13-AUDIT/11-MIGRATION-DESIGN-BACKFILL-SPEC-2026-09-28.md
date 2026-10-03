# Identity & Tenancy — Migration Design / Backfill Specification

**Fecha:** 2026-09-28  
**Estado:** DESIGN APPROVED FOR NEXT-STAGE EXECUTION PLANNING

**Approval scope (2026-09-28):** The Owner approved the decisions listed in §20.1. This approves the design decisions for planning; it does **not** authorize runtime/schema/data changes, migration execution, merge, deploy, or destructive operations.  
**Base:** Migration Readiness Review 2026-09-28  
**Regla:** este documento define diseño; no autoriza ejecución.

## 1. Objetivo

Transformar progresivamente el modelo físico actual Empresa → Usuario hacia Business ← Membership → User sin perder identidad histórica, atribución de operaciones, datos comerciales, aislamiento, permisos, autenticación, Customer, Supplier ni documentos de Legajo.

## 2. Principio central

No reemplazar directamente Usuario.empresaId por businessId. La relación actual representa una sola pertenencia; Membership(userId,businessId) permite múltiples pertenencias.

Secuencia: aditivo → backfill → validación → cutover → retiro legacy.

## 3. Modelo target propuesto

### Business
- id
- name
- configuration
- timestamps

Fuente: Empresa. La preservación del ID es una opción técnica recomendada para reducir churn de FKs, pero requiere aprobación.

### User
- id
- name
- email
- passwordHash
- googleId
- photoUrl
- active
- timestamps

Fuente: Usuario. Preservar IDs siempre que sea posible.

### Membership
- id
- userId
- businessId
- roleId
- active
- timestamps
- UNIQUE(userId,businessId)

Fuente inicial: Usuario.id + Usuario.empresaId + Usuario.rol. El roleId queda bloqueado por R-01.

### Role / Permission / RolePermission

Dirección target:

Membership → Role → RolePermission → Permission

**Catálogo aprobado para planificación:** Owner/Admin, Vendedor, Gestor de Stock, Cliente/Comprador, Proveedor. `Repartidor` queda además como rol operativo independiente por aprobación del Owner. Los roles aplican contextualmente a Membership; Customer/Buyer representa además la entidad comercial Customer y no obliga a convertir Customer en User/Membership.

## 4. Autorización en coexistencia

Durante la transición coexistirán:

Legacy: Usuario → UsuarioPermiso → Permiso

Target: User → Membership → Role → RolePermission → Permission

No eliminar UsuarioPermiso hasta demostrar paridad.

## 5. Roles

Mapping aprobado para planificación:

| Legacy | Target candidato | Confianza |
|---|---|---|
| OWNER | Owner/Admin | Alta |
| ASISTENTE_LOCAL | Vendedor | Aprobado |
| PROVEEDOR | Proveedor | Aprobado como rol de acceso cuando corresponda; la entidad Supplier sigue separada |
| REPARTIDOR | Repartidor | Aprobado como rol independiente |
| Customer | Customer | Alta, pero no como mapping de Usuario |

No usar OWNER como default silencioso ante valores sin mapping.

## 6. Customer

Customer permanece separado de User.

Cliente.id → Customer.id  
Cliente.empresaId → Customer.businessId

Customer.userId es opcional. No convertir Customer = User ni fusionar globalmente por email sin una regla de identidad aprobada.

Customer uniqueness continúa siendo Business-scoped.

## 7. Supplier

Proveedor continúa como entidad comercial Business-scoped.

No crear Membership automáticamente para cada Supplier. Un Supplier que posteriormente necesite acceso deberá tener una relación explícita Supplier + User → Membership.

## 8. Invitation

Preservar Business, email, token, inviter, expiración, usedAt y timestamps.

El rol debe traducirse únicamente mediante el mapping aprobado.

## 9. Legajo

No realizar Legajo → Membership directamente.

El modelo actual mezcla información fiscal, personal, operacional, delivery y documentación sensible. Mientras R-03 permanezca OPEN:

- conservar Legajo;
- conservar DocumentoLegajo;
- no eliminar columnas;
- no cambiar ownership;
- no mover documentos.

El backfill definitivo del perfil operativo queda condicionado a cerrar R-03, pero la separación conceptual queda **aprobada**: `User → Membership → OperationalProfile`, con `DeliveryProfile` como especialización cuando corresponda.

## 10. Historical actors

Los registros históricos deben continuar identificando al User:

- Venta.usuarioId
- Compra.usuarioId
- Pago.usuarioId
- MovimientoStock.usuarioId
- AuditLog.usuarioId
- Autorizacion.autorizadorId
- Entrega.preparadorId
- Entrega.repartidorId

Autorización contextual y actor histórico son conceptos distintos:

User → Membership → Role/Permission

No reemplazar automáticamente FKs históricas de User por FKs de Membership.

## 11. Business ownership

Para recursos que hoy tienen empresaId, el concepto target es businessId.

Se deben evaluar dos estrategias:

**A — Preservar IDs:** Empresa.id == Business.id. Reduce churn de FKs.

**B — Nuevos IDs:** Empresa.id → nuevo Business.id. Requiere mapping LegacyEmpresaId → BusinessId.

**Decisión aprobada:** estrategia A — preservar IDs; `Empresa.id == Business.id` durante la transformación. Esto reduce churn de FKs y mantiene trazabilidad directa.

## 12. Orden de backfill

```text
B0 Snapshot / backup
B1 Business
B2 User
B3 Role + Permission catalog
B4 Membership
B5 RolePermission
B6 Customer
B7 Customer → User
B8 Supplier
B9 Invitation
B10 Operational Profile / Legajo
B11 Authorization cutover
B12 Validation
```

## 13. Pre-backfill validation

Validar antes de insertar target data:

- duplicados de email global de Usuario;
- FKs Usuario.empresaId;
- FKs Cliente.empresaId;
- FKs Proveedor.empresaId;
- Legajo con ambos/null usuarioId y clienteId;
- integridad UsuarioPermiso;
- integridad de Invitation.

El resultado esperado es cero inconsistencias no resueltas.

## 14. Backfill invariants

1. Cada Business target corresponde a una Empresa source.
2. Cada User target tiene una fuente identificable.
3. Cada Membership referencia User y Business existentes.
4. UNIQUE(userId,businessId).
5. Ningún User pierde su identidad histórica.
6. Ningún recurso histórico pierde su actor.
7. Customer continúa perteneciendo a un Business.
8. Supplier continúa perteneciendo a un Business.
9. No se crea Membership automáticamente por Customer.
10. No se crea Membership automáticamente por Supplier.
11. No se fusionan Users por email sin regla aprobada.
12. No se elimina legacy antes de validar.

## 15. Authentication cutover

Actual conceptualmente:

JWT → userId + empresaId + rol + permisos

Target conceptualmente:

JWT → User identity + contexto/sesión

y autorización:

User → Business Context → Membership → Role → Permission

El JWT por sí solo no debe constituir autorización de Business.

El formato final del JWT queda sujeto al Authentication Contract.

## 16. Compatibility period

Durante coexistencia deben poder coexistir Legacy Empresa/User y Target Business/User/Membership.

No permitir divergencia entre modelos sin una estrategia explícita de dual-write o adaptación.

## 17. Validation matrix

| Área | Validación |
|---|---|
| Business | cardinalidad y ownership |
| User | identidad y email |
| Membership | cardinalidad User↔Business |
| Role | mapping completo |
| Permission | parity |
| Customer | Business ownership |
| Supplier | Business ownership |
| Invitation | Business + inviter |
| Legajo | preservación |
| Sales | actor preservation |
| Purchases | actor preservation |
| Inventory | actor + Business |
| Cash | actor + Business |
| Orders | actor + Business |
| Fulfillment | actor + Business |
| Audit | actor preservation |
| Isolation | cross-Business denial |

## 18. Rollback

No se propone down migration destructivo.

Debe conservarse mapping:

LegacyEmpresaId → TargetBusinessId  
LegacyUsuarioId → TargetUserId  
TargetMembershipId

Si hubiera merges de identidad, debe existir trazabilidad sourceUserId → targetUserId, motivo y timestamp.

## 19. Implementation gates

Antes de schema implementation deben cerrarse:

- G1 Role mapping — R-01.
- G2 Legajo / Operational Profile — R-03.
- G3 catálogo canónico de Roles.
- G4 catálogo canónico de Permissions.
- G5 regla de reconciliación de Users duplicados.
- G6 estrategia de IDs de Business.
- G7 Authentication/session contract.
- G8 entorno/snapshot para validación.

## 20.1 Decisiones del Owner — 2026-09-28

1. **Roles MVP:** Owner/Admin, Vendedor, Gestor de Stock, Cliente/Comprador, Proveedor.
2. **Repartidor:** rol operativo independiente; se preserva la capacidad legacy.
3. **Legajo:** aprobado separar conceptualmente identidad, Membership, perfil operativo, delivery y datos comerciales/fiscales; no se ejecuta aún la migración física mientras R-03 esté abierto.
4. **Autorización:** `Membership → Role → RolePermission → Permission`; no User-global permissions as the target authorization model.
5. **Business IDs:** preservar IDs existentes (`Empresa.id == Business.id`).
6. **Alcance de esta aprobación:** habilita cerrar G1/G2/G3/G6 y avanzar al diseño del Migration Execution Plan. No habilita todavía cambios de schema/runtime/datos ni ejecución de migraciones.

## 20. Conclusion

El backfill confirma que la transformación debe ser incremental:

Empresa → Business

Usuario → User

Usuario + Empresa → Membership

Membership → Role → Permission

mientras Customer, Supplier, Operational Profile y actores históricos permanecen como conceptos independientes.

**No se autoriza todavía ninguna migración Prisma ni modificación del runtime.** La aprobación actual es de diseño/decisión, no de implementación.

El siguiente artefacto, una vez cerrados G1/G2/G3/G4, será el Migration Execution Plan con DDL Prisma, compatibilidad, backfill ejecutable, validaciones y criterio de cutover.