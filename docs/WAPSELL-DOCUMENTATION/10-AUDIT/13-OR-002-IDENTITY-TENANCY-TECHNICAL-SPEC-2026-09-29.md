# OR-002 — Identity & Tenancy Technical Specification

**Fecha:** 2026-09-29  
**Estado:** TECHNICAL SPECIFICATION — preparada para revisión  
**Branch:** `audit/identity-tenancy-2026-09-28`  
**Base:** OR-002-A Owner Ruling + Migration Design / Backfill Specification + Migration Execution Plan + decisiones B–F del Owner

> Este documento convierte las decisiones de OR-002 en contratos técnicos implementables. No ejecuta cambios de schema, runtime ni datos por sí mismo.

## 1. Objetivo

Formalizar la transformación de identidad y tenancy desde el modelo AS-IS:

`Empresa → Usuario`

hacia:

`User ↔ Membership ↔ Business`

preservando identidad, atribución histórica, aislamiento por Business, Customer, Supplier, autenticación y autorización.

## 2. Decisiones OR-002

Las siguientes decisiones fueron indicadas por el Owner para este cierre:

| ID | Decisión | Resultado |
|---|---|---|
| OR-002-B | Mecanismo de transición | **B2 — migración incremental sin coexistencia prolongada** |
| OR-002-C | Unicidad de User | **C1 — email globalmente único** |
| OR-002-D | Vinculación User/Customer | **D1 — Usuario → User + Membership; Cliente → Customer; mismo email normalizado = misma persona** |
| OR-002-E | Sesiones | **E2 — compatibilidad temporal durante transición; luego invalidación y nuevo login** |
| OR-002-F | Autorización de implementación | **F1 — OR-002 → especificación técnica → implementación autorizada** |

Estas decisiones deben distinguirse de los detalles físicos todavía no definidos en el schema contract.

## 3. Modelo conceptual obligatorio

### 3.1 Business

Business representa el tenant.

Fuente AS-IS: `Empresa`.

Regla aprobada: preservar el identificador existente durante la transformación:

`Empresa.id == Business.id`

No se debe generar un nuevo Business ID salvo una decisión posterior explícita.

### 3.2 User

User representa la identidad global.

Fuente AS-IS: `Usuario`.

Reglas:

- preservar `Usuario.id`;
- User no pertenece físicamente a un único Business;
- el email de User es globalmente único;
- la pertenencia a un Business se determina por Membership;
- no se debe inferir autorización de Business únicamente desde User o JWT.

### 3.3 Membership

Membership representa la relación User ↔ Business.

Restricción conceptual:

`UNIQUE(userId, businessId)`

Un User puede tener múltiples Memberships.

Cada Membership contiene el contexto de autorización correspondiente al Business.

### 3.4 Customer

Customer continúa siendo una entidad comercial independiente y Business-scoped.

Fuente AS-IS: `Cliente`.

Customer puede tener una relación opcional con User.

No se debe convertir automáticamente Customer en Membership.

## 4. Regla de identidad por email

La regla elegida es:

> **Mismo email normalizado = misma persona.**

Esta regla aplica a la reconciliación entre User y Customer durante la transformación.

### 4.1 Normalización

La normalización exacta debe implementarse como una función determinística y compartida por:

- validación previa;
- backfill;
- creación/actualización de User;
- creación/actualización de Customer→User;
- validación post-backfill.

Como mínimo debe resolver las diferencias de mayúsculas/minúsculas y espacios externos observadas en el análisis G5.

No se debe introducir ninguna transformación adicional de email que no esté especificada y validada.

### 4.2 User uniqueness

La unicidad target es global:

`UNIQUE(normalized email)`

La forma física exacta —por ejemplo, columna normalizada, índice funcional o estrategia equivalente— queda para el Canonical Physical Schema Contract.

### 4.3 Conflictos

Antes del backfill debe ejecutarse una consulta de colisiones de email normalizado.

Si aparecen dos Users distintos con el mismo email normalizado:

1. no fusionarlos silenciosamente;
2. clasificarlos;
3. conservar sus IDs hasta resolver el conflicto;
4. aplicar una regla explícita de reconciliación;
5. registrar cualquier merge aprobado mediante mapping sourceUserId → targetUserId.

Con C1, una colisión no resuelta bloquea la imposición de unicidad global.

## 5. Customer → User

La vinculación será determinística:

`Customer.email.normalized == User.email.normalized`

Cuando la condición se cumple, se establece:

`Customer.userId = User.id`

Si no existe User correspondiente, Customer permanece independiente.

Si existen múltiples Users candidatos, la operación se bloquea y requiere reconciliación explícita.

No se debe elegir arbitrariamente por antigüedad, rol, nombre u otro atributo.

## 6. Supplier

Supplier continúa como entidad comercial Business-scoped.

No se crea User ni Membership automáticamente por existir Supplier.

Si un proveedor necesita acceso al sistema:

`Supplier + User → Membership`

La creación y vinculación concreta queda fuera del backfill automático de Supplier.

## 7. Roles y autorización

El modelo target es:

`Membership → Role → RolePermission → Permission`

Roles de MVP:

- Owner/Admin
- Vendedor
- Gestor de Stock
- Cliente/Comprador
- Proveedor
- Repartidor como rol operativo independiente

Mapping legacy aprobado para planificación:

| Legacy | Target |
|---|---|
| OWNER | Owner/Admin |
| ASISTENTE_LOCAL | Vendedor |
| PROVEEDOR | Proveedor, cuando corresponda como rol de acceso |
| REPARTIDOR | Repartidor |
| Cliente | Customer, no mapping de Usuario |

No usar OWNER como fallback para valores desconocidos.

### 7.1 Legacy permissions

Durante la transición debe preservarse `UsuarioPermiso`.

No se elimina hasta demostrar paridad entre autorización legacy y target.

La matriz exacta Role → Permission debe existir antes de retirar la autorización legacy.

## 8. Transición B2

La transformación será incremental, pero **sin una coexistencia prolongada**.

Secuencia:

`additive schema → backfill → compatibility → validation → cutover → legacy retirement`

La compatibilidad debe existir únicamente durante la ventana necesaria para:

- poblar target;
- adaptar consumidores;
- validar paridad;
- realizar cutover.

No se autoriza mantener indefinidamente dos modelos como fuentes de verdad.

### 8.1 Source of truth

Durante la transición, cada dato dualmente representado debe tener una fuente de verdad explícita.

No se permiten dual-writes sin:

- origen de verdad;
- regla de consistencia;
- comportamiento ante fallo;
- retry/reconciliation;
- consulta de detección de divergencias.

## 9. Autenticación y sesiones E2

Durante la transición:

1. los tokens/sesiones legacy podrán funcionar durante la ventana de compatibilidad definida;
2. el runtime deberá resolver el Business Context mediante Membership cuando utilice el modelo target;
3. después del cutover se invalidarán/rechazarán las sesiones legacy;
4. el usuario deberá iniciar sesión nuevamente;
5. los nuevos tokens deberán representar identidad global y contexto de sesión, no autorización autónoma de Business.

El JWT por sí solo nunca debe autorizar una operación sobre un Business arbitrario.

Flujo target:

`User identity → Business Context → Membership → Role → Permission → Business Rule → Resource`

### 9.1 Authentication contract pendiente

Antes de implementar el cambio definitivo deben especificarse:

- `sub`;
- claims mínimos;
- resolución del Business Context;
- selección de Membership;
- comportamiento de `/auth/me`;
- refresh/session behavior;
- Google OAuth;
- invalidación de tokens legacy;
- comportamiento ante Membership inexistente/inactiva.

## 10. Autorización contextual

Cada operación protegida debe resolver:

1. User autenticado;
2. Business solicitado;
3. Membership válida para User + Business;
4. Role(s) de Membership;
5. Permission requerida;
6. regla de negocio;
7. recurso Business-scoped.

Un JWT válido sin Membership válida no autoriza acceso al Business.

La pertenencia histórica de un registro a User y su autorización actual por Membership son conceptos diferentes.

## 11. Actores históricos

Las FK históricas continúan apuntando a User:

- Venta.usuarioId
- Compra.usuarioId
- Pago.usuarioId
- MovimientoStock.usuarioId
- AuditLog.usuarioId
- Autorizacion.autorizadorId
- Entrega.preparadorId
- Entrega.repartidorId

No reemplazar estas referencias por Membership sin una decisión específica.

## 12. Legajo

No realizar `Legajo → Membership`.

Mientras R-03 permanezca abierto:

- conservar Legajo;
- conservar DocumentoLegajo;
- conservar ownership actual;
- no eliminar columnas;
- no mover documentos.

La descomposición conceptual target es:

`User → Membership → OperationalProfile`

con `DeliveryProfile` cuando corresponda y conceptos fiscales/comerciales separados.

La migración física de Legajo queda condicionada a cerrar R-03.

## 13. Orden técnico

El orden mínimo será:

1. Snapshot/backup.
2. Validación G5.
3. Validación Authentication/Session Contract.
4. Validación del entorno G8.
5. Schema target aditivo.
6. Business backfill.
7. User backfill.
8. Role/Permission catalog.
9. Membership backfill.
10. RolePermission backfill.
11. Customer backfill.
12. Customer→User linkage.
13. Supplier preservation.
14. Invitation preservation/mapping.
15. Operational Profile/Legajo únicamente si R-03 está cerrado.
16. Runtime compatibility.
17. Authentication cutover.
18. Validation integral.
19. Retiro legacy.

## 14. Invariantes

### Identity

- cada User target tiene una fuente AS-IS identificable;
- User IDs existentes se preservan;
- no se fusionan Users silenciosamente;
- email normalizado es globalmente único.

### Tenancy

- cada Membership referencia un User existente;
- cada Membership referencia un Business existente;
- `UNIQUE(userId,businessId)`;
- un User puede pertenecer a múltiples Businesses;
- una operación Business-scoped requiere Membership válida.

### Customer

- Customer permanece Business-scoped;
- Customer puede vincularse opcionalmente a User;
- misma identidad por email normalizado produce una única vinculación;
- Customer no genera Membership automáticamente.

### Supplier

- Supplier permanece Business-scoped;
- Supplier no genera Membership automáticamente.

### Authorization

- autorización target = Membership → Role → Permission;
- no se usa User-global role como autorización target;
- JWT no sustituye Membership validation.

### Historical data

- no se pierde actor histórico;
- no se modifica la semántica de ownership;
- no se elimina legacy antes de validation gate.

## 15. Validación requerida

Antes del cutover:

- User count source/target;
- Business count source/target;
- Membership count esperado;
- duplicate normalized emails;
- Customer linkage;
- Supplier ownership;
- Invitation ownership;
- role mapping;
- permission parity;
- actor preservation;
- cross-Business isolation;
- authorization denial;
- authentication/session behavior;
- Google OAuth behavior;
- `/auth/me`.

Criterio general:

> Cero inconsistencias no resueltas en los invariantes obligatorios.

## 16. Rollback / recovery

No se define down migration destructiva.

Deben preservarse:

`LegacyEmpresaId → BusinessId`

`LegacyUsuarioId → UserId`

`UserId + BusinessId → MembershipId`

`LegacyRole → TargetRole`

`LegacyPermission → TargetPermission`

Si se autoriza cualquier merge de identidad:

`SourceUserId → TargetUserId`

con motivo y timestamp.

Toda recuperación debe ser forward-compatible y trazable.

## 17. Gates

### Cerrados por esta especificación

- OR-002-B — B2
- OR-002-C — C1
- OR-002-D — D1
- OR-002-E — E2
- OR-002-F — F1

### Permanecen abiertos

- G5 — ejecución/reconciliación de datos reales;
- G7 — Authentication/Session Contract;
- G8 — entorno/snapshot de validación;
- G9 — Canonical Physical Schema Contract;
- R-03 — implementación física de Legajo.

La elección de F1 habilita pasar de decisión a especificación técnica e implementación, pero **no convierte en verificadas las condiciones de G5/G7/G8/G9**.

## 18. Criterio de implementación

La implementación deberá producir, como cambios separados y revisables:

1. Canonical Physical Schema Contract;
2. Prisma schema/migration;
3. backfill/reconciliation;
4. authorization migration;
5. authentication/session migration;
6. runtime tenant-context adaptation;
7. validation tests/queries;
8. cutover checklist;
9. evidence report.

No realizar deploy ni cambios destructivos como parte de este documento.

## 19. Evidencia actual

| Elemento | Estado |
|---|---|
| AS-IS identity model | VERIFICADO POR CÓDIGO |
| Migration history | VERIFICADO POR CÓDIGO |
| Target conceptual model | DOCUMENTADO |
| Role mapping | DOCUMENTADO / OWNER-APPROVED |
| Business ID preservation | DOCUMENTADO / OWNER-APPROVED |
| OR-002-B/C/D/E/F | DECIDIDO POR OWNER |
| Production DB contents | NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE |
| Runtime migration | NO INICIADA |
| Schema migration | NO INICIADA |
| Data backfill | NO INICIADO |
| Cutover | NO INICIADO |

## 20. Explicit non-goals

Este documento no autoriza:

- borrar Empresa/Usuario legacy;
- eliminar UsuarioPermiso;
- fusionar Users automáticamente;
- modificar datos de producción;
- ejecutar Prisma migrations;
- desplegar runtime;
- invalidar sesiones inmediatamente;
- modificar el modelo de Legajo sin cerrar R-03;
- retirar el aislamiento actual;
- convertir Customer o Supplier automáticamente en Membership.

---

**Siguiente artefacto:** Canonical Physical Schema Contract de Identity & Tenancy, seguido por la implementación Prisma únicamente después de cerrar los gates técnicos restantes.
