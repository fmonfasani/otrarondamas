# Physical Target Model — Identity & Tenancy
**Fecha:** 2026-09-28  
**Base:** main @ b6646e70b0fa43862f5a0d1db0c3cd22aed3537  
**Estado:** PROPOSAL — NOT APPROVED  
**Tipo:** Transformation Design / Physical Target Model

> Este documento no modifica Prisma ni runtime. Define una propuesta técnica para convertir el modelo AS-IS en el modelo Wapsell. Ningún nombre físico, FK, constraint o estrategia aquí descrita debe tratarse como decisión aprobada hasta su revisión.

## 1. Objetivo

Diseñar el modelo físico mínimo necesario para materializar la dirección ya documentada:

User → Membership → Business → Role / Permissions

manteniendo Customer como entidad comercial separada y preservando el aislamiento por Business.

## 2. AS-IS confirmado

Empresa
  └── Usuario
      ├── empresaId
      ├── rol
      └── UsuarioPermiso ── Permiso

Cliente
  └── empresaId

Evidencia: 05-ASIS/04-ASIS-IDENTITY.md y 05-ASIS/03-ASIS-DATA.md.

## 3. TO-BE físico propuesto

### 3.1 Business

Business
- id
- nombre
- configuracion
- createdAt
- updatedAt

Origen AS-IS: Empresa.

### 3.2 User

User
- id
- nombre
- email
- passwordHash?
- googleId?
- fotoUrl?
- activo
- createdAt
- updatedAt

Origen AS-IS: Usuario.

Se elimina del concepto de identidad global empresaId y rol, porque ambos pasan a Membership.

El tratamiento de estadoLegajo y Legajo requiere una decisión de dominio adicional antes de moverlo físicamente.

### 3.3 Membership

Membership
- id
- userId
- businessId
- roleId
- estado
- createdAt
- updatedAt

Relaciones:

User 1 ─── N Membership N ─── 1 Business
                         │
                         └── Role

Constraint propuesto: unique(userId, businessId).

Esto es una propuesta técnica, no una decisión aprobada.

### 3.4 Role

Role
- id
- code
- name
- description?

El Role deja de ser una propiedad global del User y pasa a ser una propiedad contextual de Membership.

El catálogo funcional documentado contempla:
- Owner/Admin
- Vendedor
- Gestor de Stock
- Cliente/Comprador
- Proveedor

El mapping exacto desde RolUsuario AS-IS queda abierto.

### 3.5 Permission

La entidad existente Permiso puede conceptualmente reutilizarse.

Permission
- id
- code
- description
- createdAt
- updatedAt

No es necesario crear otra entidad paralela si el catálogo actual puede evolucionar sin perder sus identificadores.

### 3.6 RolePermission

RolePermission
- roleId
- permissionId

Role N ─── N Permission

Constraint propuesto: unique(roleId, permissionId).

### 3.7 Customer

Customer
- id
- businessId
- userId? (opcional)
- datos comerciales existentes

La dirección documentada exige que Customer continúe siendo una entidad comercial separada de User.

Un comprador puede existir sin cuenta Wapsell.

## 4. Resultado conceptual

WAPSELL PLATFORM
        │
       User
        │
   ┌────┴────┐
   │         │
Membership Membership
   │         │
   ▼         ▼
Business A Business B
   │
  Role
   │
Permissions
   │
   ├── Customer
   ├── Sales
   └── Inventory

Esto permite que la misma identidad global participe en varios Business sin duplicar el User.

## 5. Mapping AS-IS → TO-BE

| AS-IS | TO-BE propuesto | Tratamiento |
|---|---|---|
| Empresa | Business | transformación de entidad |
| Usuario | User | transformación de identidad |
| Usuario.empresaId | Membership.businessId | mover pertenencia |
| Usuario.rol | Membership.roleId | contextualizar rol |
| UsuarioPermiso | RolePermission + Role | requiere definir si permisos son exclusivamente derivados del Role |
| Permiso | Permission | candidato a reutilización |
| Cliente | Customer | mantener separado; agregar vínculo opcional a User |
| Invitacion.empresaId | Invitacion.businessId | adaptar al nuevo Business context |
| referencias comerciales empresaId | businessId | transformación progresiva |
| referencias a Usuario | userId | transformación de identidad |

## 6. Punto que NO debe resolverse por inferencia

### Permisos directos vs permisos exclusivamente por Role

El código actual permite:

Usuario → UsuarioPermiso → Permiso

La documentación TO-BE describe:

Membership → Role → Permissions

Pero no hay evidencia suficiente para afirmar que los permisos directos a una Membership estén prohibidos.

Por lo tanto, no se decide aquí si el modelo final será exclusivamente Membership → Role → Permission o si permitirá también permisos adicionales por Membership.

Esto debe quedar como decisión de diseño antes de implementar.

## 7. Role AS-IS → Role TO-BE

El enum actual:
- OWNER
- ASISTENTE_LOCAL
- PROVEEDOR
- REPARTIDOR

no coincide uno-a-uno con el catálogo Wapsell objetivo.

No se debe hacer un mapping automático sin preservar la semántica actual.

En particular:
- ASISTENTE_LOCAL no debe asumirse automáticamente como VENDEDOR.
- REPARTIDOR no aparece como rol actual del modelo Wapsell definido en la especificación resumida.
- PROVEEDOR requiere definir si representa una Membership interna, una identidad comercial externa o ambas cosas.
- OWNER tiene una semántica clara como pertenencia al Business, pero sus permisos actuales deben conservarse durante la migración.

Estado: OPEN DESIGN.

## 8. Legajo

El AS-IS tiene:

Legajo
 ├── usuarioId?
 └── clienteId?

con exclusividad lógica validada por service.

No se propone cambiar esto todavía.

Motivo: Legajo mezcla una preocupación operativa de empleados/usuarios con una de clientes mayoristas. Antes de moverlo debe hacerse un análisis específico de User / Membership, Customer, roles que requieren legajo, estado de aprobación y documentos.

Estado: OPEN DESIGN.

## 9. Tenant isolation

La propuesta física cambia empresaId por businessId en los recursos comerciales, pero el mecanismo no debe cambiar hasta definir el nuevo Business Context.

Objetivo:

Authenticated User
       ↓
Business Context
       ↓
Membership
       ↓
businessId
       ↓
scoped data access

No se propone todavía RLS ni otro mecanismo de base de datos.

## 10. Invariantes objetivo

I-UT-01 — Membership válida
Toda operación comercial autenticada debe resolverse mediante una Membership válida.

I-UT-02 — Business isolation
Una Membership de Business A no autoriza acceso a datos de Business B.

I-UT-03 — Role contextual
El Role utilizado para autorización pertenece a la Membership activa.

I-UT-04 — User global
Un User puede tener cero, una o múltiples Memberships.

I-UT-05 — Customer independiente
Un Customer puede existir sin User.

I-UT-06 — Customer link
Si un Customer se vincula a User, ese vínculo no convierte al Customer en Membership.

I-UT-07 — Business ownership
Los recursos comerciales continúan perteneciendo a exactamente un Business.

## 11. Lo que sigue

Antes de tocar el schema:
1. resolver mapping de roles;
2. resolver permisos directos vs Role;
3. resolver tratamiento de Legajo;
4. diseñar coexistencia;
5. definir backfill;
6. definir cutover;
7. definir rollback;
8. definir contratos JWT / Business Context;
9. diseñar pruebas de migración y aislamiento.

No se debe generar todavía una migration Prisma a partir de este documento.

## 12. Evidencia

- AS-IS Identity: VERIFICADO POR CÓDIGO.
- AS-IS Data: VERIFICADO POR CÓDIGO.
- Current JWT: VERIFICADO POR CÓDIGO.
- Current tenant scope: VERIFICADO POR CÓDIGO.
- TO-BE physical model: PROPUESTO / NO APROBADO.
