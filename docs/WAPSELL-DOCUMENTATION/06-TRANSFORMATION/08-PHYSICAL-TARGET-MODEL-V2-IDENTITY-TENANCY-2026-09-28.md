# 08 — Physical Target Model v2 — Identity & Tenancy

**Fecha:** 2026-09-28  
**Estado:** PROPOSAL — NOT APPROVED  
**Tipo:** Physical Target Model / Design Review  
**Base:** Identity/Tenancy Physical Target Model v1 + Authorization/Profile Ownership Contract

> Este documento reemplaza conceptualmente la propuesta anterior como base de diseño para la revisión física. No modifica `schema.prisma`, no crea migraciones y no autoriza cambios runtime.

## 1. Objetivo

Traducir los contratos conceptuales ya analizados a un modelo físico mínimo y trazable, evitando tres errores:

1. conservar `Usuario → Empresa` como pertenencia exclusiva;
2. convertir `Legajo` en un contenedor universal;
3. convertir Customer/Supplier en identidades o Memberships por inferencia.

## 2. Modelo físico propuesto

### 2.1 Business

Modelo:

`Business`

Campos candidatos:

- `id`
- `nombre`
- `configuracion`
- `createdAt`
- `updatedAt`

Origen: `Empresa`.

**Constraint:** identidad única según mecanismo que se defina para Business. No se prescribe una clave adicional aquí.

### 2.2 User

Modelo:

`User`

Campos candidatos:

- `id`
- `nombre`
- `email`
- `passwordHash?`
- `googleId?`
- `fotoUrl?`
- `activo`
- `createdAt`
- `updatedAt`

No contiene:

- `businessId`;
- `roleId`;
- permisos Business-scoped;
- datos de Delivery;
- datos fiscales de Customer/Supplier.

### 2.3 Membership

Modelo:

`Membership`

Campos candidatos:

- `id`
- `userId`
- `businessId`
- `roleId`
- `estado`
- `createdAt`
- `updatedAt`

Relaciones:

`User 1:N Membership N:1 Business`

Constraint candidato:

`UNIQUE(userId, businessId)`

Este constraint expresa una única relación Membership entre una identidad y un Business; múltiples roles simultáneos no se modelan como múltiples Memberships en esta propuesta.

### 2.4 Role

Modelo:

`Role`

Campos candidatos:

- `id`
- `code`
- `name`
- `description?`

El catálogo físico no se fija todavía.

**Blocker:** mapping AS-IS → TO-BE continúa OPEN.

### 2.5 Permission

La entidad AS-IS `Permiso` es candidata a evolucionar hacia:

`Permission`

No se crea una segunda tabla paralela si puede preservarse identidad histórica y referencias existentes.

Campos candidatos:

- `id`
- `code/name`
- `description?`
- timestamps existentes.

### 2.6 RolePermission

Modelo:

`RolePermission`

- `roleId`
- `permissionId`

Constraint:

`UNIQUE(roleId, permissionId)`

Esta propuesta adopta como dirección base:

`Membership → Role → Permission`

Los permisos directos existentes requieren estrategia de transición y no deben eliminarse hasta comprobar equivalencia.

## 3. Customer

Modelo:

`Customer`

Debe continuar siendo Business-scoped.

Campos estructurales mínimos:

- `id`
- `businessId`
- `userId?`
- campos comerciales existentes.

Relaciones:

`Business 1:N Customer`

`User 1:N Customer` opcional.

### Regla

Un vínculo:

`Customer.userId`

NO crea una Membership.

Esto permite:

- Customer sin login;
- Customer con User;
- un User que sea Customer de múltiples Businesses.

El constraint físico de `userId` NO se fija como unique global porque impediría necesariamente el caso de un mismo User como Customer en más de un Business.

## 4. Supplier

`Supplier` continúa siendo una entidad comercial Business-scoped.

No se convierte en Role ni Membership por defecto.

Relación conceptual:

`Business 1:N Supplier`

Si posteriormente un proveedor necesita acceso autenticado, se modelará explícitamente la identidad/membership correspondiente sin fusionar las entidades.

## 5. Operational Profile

### Propuesta

Introducir conceptualmente:

`OperationalProfile`

con relación a una Membership.

Campos candidatos mínimos:

- `id`
- `membershipId`
- datos personales operativos que se definan;
- estado de habilitación;
- timestamps.

**Importante:** no se fija todavía el conjunto final de campos.

Motivo: teléfono, dirección y DNI continúan con ownership OPEN.

### Cardinalidad propuesta

`Membership 1:0..1 OperationalProfile`

No se propone un perfil operativo obligatorio para todas las Memberships.

Esto evita imponer datos laborales a:

- Owners que no los necesitan;
- Customers;
- futuras Memberships con funciones no operativas.

## 6. Delivery Profile

Cuando una Membership posee capacidad de reparto, se propone una extensión especializada:

`DeliveryProfile`

Relación:

`OperationalProfile 1:0..1 DeliveryProfile`

Candidatos:

- `vehicleData`
- `licenseData`
- estado de habilitación;
- referencias a documentación correspondiente.

No se propone almacenar estos datos en User.

El modelo físico definitivo queda OPEN hasta resolver R-01/R-03.

## 7. Fiscal Profile

No se propone un único `FiscalProfile` universal en esta etapa.

Motivo: el AS-IS demuestra ownership distinto según contexto.

Se distinguen conceptualmente:

- Business fiscal data;
- Customer fiscal data;
- Supplier fiscal data.

Los campos actuales:

- CUIT;
- razón social;
- condición IVA;
- tipo de factura;

se migrarán según el propietario real de cada registro.

La normalización en una tabla compartida queda OPEN.

## 8. Sensitive Documents

La propuesta introduce conceptualmente:

`OperationalDocument`

como evolución de `DocumentoLegajo`.

Relación candidata:

`OperationalProfile 1:N OperationalDocument`

Campos mínimos:

- `id`
- `operationalProfileId`
- `tipo`
- `rutaArchivo`
- `nombreArchivo`
- `vencimiento`
- timestamps.

La implementación debe conservar el almacenamiento protegido actual durante la transición.

No se elimina `DocumentoLegajo` hasta completar:

1. inventario;
2. backfill;
3. reconciliación;
4. validación de acceso;
5. cutover;
6. rollback window.

## 9. Legacy coexistence

Durante la transformación, el sistema debe poder representar simultáneamente:

### Legacy

`Usuario → Empresa`

### Target

`User → Membership → Business`

No se debe mantener doble escritura indefinidamente sin una estrategia explícita de reconciliación.

### Mapping base

| Legacy | Target |
|---|---|
| Empresa.id | Business.id |
| Usuario.id | User.id |
| Usuario.empresaId | Membership.businessId |
| Usuario.rol | Membership.roleId |
| UsuarioPermiso | migración de autorización |
| Permiso | Permission |
| Cliente.id | Customer.id |
| Cliente.empresaId | Customer.businessId |
| Cliente ↔ cuenta | Customer.userId? según evidencia/matching |
| Legajo.usuarioId | OperationalProfile/Membership |
| Legajo.clienteId | Customer-side legacy mapping |
| DocumentoLegajo | OperationalDocument / legacy retention |

## 10. Customer ↔ User mapping

No se debe hacer matching por email sin una política explícita.

El proceso de migración deberá clasificar:

- match determinista;
- match ambiguo;
- sin match.

Solo el match determinista podrá proponerse automáticamente.

Los casos ambiguos deben quedar en estado de reconciliación manual o cola de excepción.

## 11. Role mapping

No se implementa hasta cerrar:

| AS-IS | Target | Estado |
|---|---|---|
| OWNER | Owner/Admin | candidato de alta confianza |
| ASISTENTE_LOCAL | Vendedor | NO demostrado |
| ASISTENTE_LOCAL | Gestor de Stock | NO demostrado |
| PROVEEDOR | Proveedor | requiere distinguir entidad comercial vs Membership |
| REPARTIDOR | Delivery capability/role | requiere preservación funcional |
| — | Gestor de Stock | sin equivalente AS-IS directo |

El mapping definitivo es un blocker de migración.

## 12. Authorization physical direction

Dirección propuesta:

`Authenticated User`
→ `Membership`
→ `Role`
→ `RolePermission`
→ `Permission`

y, para acceso a datos:

`Membership.businessId`
→ `resource.businessId`

La implementación actual basada en `empresaId` debe coexistir durante la migración.

No se debe cambiar el guard global hasta que exista:

- resolución de Business Context;
- validación de Membership;
- resolución de Role/Permission;
- pruebas de aislamiento.

## 13. Business-scoped resource rule

Todo recurso comercial debe tener un propietario Business determinable.

Para recursos actualmente Business-scoped directamente:

`empresaId → businessId`

Para recursos hijos sin `empresaId` directo, la pertenencia debe seguir siendo resoluble a través de su padre.

No se debe introducir un segundo Business ownership incompatible con el existente.

## 14. Constraints objetivo

Propuesta mínima:

- `Membership(userId,businessId)` unique.
- `Role.code` unique dentro del catálogo elegido.
- `RolePermission(roleId,permissionId)` unique.
- `Customer(businessId,...)` conserva unicidad comercial actual.
- FK de todos los recursos target a Business cuando corresponda.
- FK User/Membership obligatorias donde el dominio lo requiera.
- Customer.userId nullable.
- No unique global sobre Customer.userId en esta etapa.
- No XOR físico para Operational Profile hasta definir completamente sus subtipos.

## 15. Invariantes físicas objetivo

### I-PHY-01
Una Membership referencia exactamente un User y un Business.

### I-PHY-02
Una Membership no puede autorizar otro Business.

### I-PHY-03
Un recurso Business-scoped referencia exactamente un Business, directa o transitivamente.

### I-PHY-04
Customer puede existir sin User.

### I-PHY-05
Customer.userId no crea Membership.

### I-PHY-06
Supplier no crea Membership.

### I-PHY-07
Role no pertenece globalmente al User.

### I-PHY-08
Datos de Delivery no pertenecen globalmente al User.

### I-PHY-09
Los documentos sensibles no quedan accesibles por mera existencia de un User autenticado.

### I-PHY-10
La migración no elimina el registro legacy hasta validar equivalencia.

## 16. Dependencias antes de Prisma

Antes de convertir esta propuesta en `schema.prisma`, deben cerrarse:

1. Role mapping.
2. Estado/ciclo de vida de Membership.
3. Ownership de teléfono, dirección y DNI.
4. Modelo definitivo de OperationalProfile.
5. Modelo definitivo de DeliveryProfile.
6. Política de documentos e histórico.
7. Permission migration.
8. Customer ↔ User deterministic matching.
9. Business Context/session contract.
10. Compatibility layer design.

## 17. Migración física futura

La migración deberá ser incremental:

`Legacy schema`
→ nuevas estructuras
→ backfill
→ dual-read/compatibility
→ reconciliación
→ validación
→ cutover
→ token/session transition
→ cleanup posterior.

No se autoriza todavía:

- drop de `Empresa`;
- drop de `Usuario.empresaId`;
- drop de `Usuario.rol`;
- drop de `UsuarioPermiso`;
- drop de `Legajo`;
- renombrado masivo de FKs;
- eliminación de datos.

## 18. Evidencia

**VERIFICADO POR CÓDIGO**

- Prisma AS-IS.
- Auth/JWT.
- tenant scope.
- LegajoService.
- DTO de Legajo.
- Customer/Supplier relationships.

**DOCUMENTADO**

- Identity & Tenancy Spec.
- Decision Register.
- Migration Contract.
- Blocker Analysis.
- Role/Membership Mapping.
- Legajo Analysis.
- Authorization/Profile Ownership Contract.

**PROPUESTA — NO APROBADA**

Todo el modelo físico de este documento.

## 19. Estado

El modelo físico ya tiene una dirección suficientemente concreta para preparar una futura migración, pero **todavía no está listo para tocar Prisma**.

El próximo gate técnico es cerrar los cuatro puntos que afectan directamente al esquema:

**Role mapping → Operational Profile → Delivery Profile → Permission migration**

Después corresponde hacer una revisión de impacto sobre las 17 migraciones actuales y todos los módulos que referencian `Empresa`, `Usuario`, `Cliente`, `Proveedor`, `Legajo` y `Permiso`.

No se realizaron cambios de Prisma, migraciones, runtime ni datos.
