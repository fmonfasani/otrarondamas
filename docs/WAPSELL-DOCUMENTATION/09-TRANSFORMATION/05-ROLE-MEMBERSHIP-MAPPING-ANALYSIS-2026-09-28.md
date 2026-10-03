# Identity & Tenancy — Role & Membership Mapping Analysis

**Fecha:** 2026-09-28  
**Estado:** PROPOSAL — NOT APPROVED  
**Tipo:** Transformation / Decision Preparation

> Este documento analiza el mapping entre los roles AS-IS y el modelo Wapsell. No aprueba equivalencias ni modifica Prisma/runtime.

## 1. Base normativa

DEC-001 establece:
- User es identidad global.
- User ↔ Business se resuelve mediante Membership.
- Roles y permisos viven en el contexto de Membership.

D-005 establece como dirección que Roles y Permissions pertenecen al Membership.

La especificación canónica de Identity describe Role como un conjunto de Permissions asignado a una Membership.

Esto resuelve el lugar conceptual del Role, pero no autoriza todavía el catálogo físico definitivo ni el mapping de los roles legacy.

## 2. AS-IS verificado

Enum actual:
- OWNER
- ASISTENTE_LOCAL
- PROVEEDOR
- REPARTIDOR

Además, el modelo actual de Legajo contiene semántica explícita por rol:

| AS-IS | Evidencia de dominio |
|---|---|
| OWNER | datos fiscales; cuenta interna existente |
| ASISTENTE_LOCAL | datos personales + documentos sensibles |
| PROVEEDOR | datos fiscales + información vinculada a compras/proveedores |
| REPARTIDOR | datos personales + vehículo/licencia + documentos sensibles |

El AS-IS también contiene un Cliente separado, por lo que Cliente no debe derivarse del enum de Usuario.

## 3. Wapsell target

El catálogo funcional de la transformación contempla:
- Owner/Admin
- Vendedor
- Gestor de Stock
- Cliente/Comprador
- Proveedor

Pero la Identity SPEC también utiliza ASISTENTE como ejemplo de Role.

Por lo tanto existe una diferencia entre:
1. roles operativos actuales;
2. catálogo funcional resumido de Wapsell;
3. ejemplos de roles presentes en la SPEC.

No debe resolverse por renombrado mecánico.

## 4. Candidate mapping — no aprobado

| AS-IS | Candidate target | Confidence | Tratamiento |
|---|---|---|---|
| OWNER | Owner/Admin | ALTA | La semántica de ownership es compatible |
| ASISTENTE_LOCAL | Vendedor / Assistant | BAJA | Requiere definición; no asumir Vendedor |
| PROVEEDOR | Proveedor | MEDIA | Debe distinguirse entidad comercial Proveedor de Membership |
| REPARTIDOR | Repartidor / Fulfillment role | MEDIA | No aparece en el catálogo resumido, pero existe en dominio actual |
| Cliente | Customer | ALTA | No es mapping de Role; es entidad comercial separada |

La columna Candidate target no representa una decisión aprobada.

## 5. Punto crítico: ASISTENTE_LOCAL

El AS-IS no demuestra que ASISTENTE_LOCAL sea simplemente un vendedor.

El Legajo exige para este rol datos y documentación específica, y el rol aparece ligado a operaciones de empleado del comercio.

Por lo tanto hay dos posibilidades que deben ser decididas:

### Opción A — Vendedor es el rol target

ASISTENTE_LOCAL → Vendedor.

La semántica operacional del asistente se conserva como parte del rol Vendedor.

### Opción B — Assistant/Asistente permanece como Role

Se mantiene un Role específico para personal de local y Vendedor se define como otro rol.

Esto puede ser más fiel al AS-IS, pero amplía el catálogo Wapsell.

No se elige entre A/B en este documento.

## 6. Gestor de Stock

No existe un equivalente directo en el enum AS-IS.

Por lo tanto no debe fabricarse un mapping:
ASISTENTE_LOCAL → Gestor de Stock
ni:
PROVEEDOR → Gestor de Stock.

El Gestor de Stock debe aparecer como Role target nuevo, con permisos explícitos, si se mantiene en el catálogo Wapsell aprobado.

## 7. REPARTIDOR

REPARTIDOR existe físicamente y además participa en Entrega.

No debe eliminarse sólo porque el catálogo resumido de roles Wapsell no lo enumere.

D-016 establece que Fulfillment pertenece al dominio de Pedidos y contempla gestión de repartidores.

Por lo tanto la migración necesita preservar la capacidad operacional del Repartidor.

Queda abierta la decisión de si:
- Repartidor es un Role Membership;
- es un perfil operativo asociado a otro Role;
- o ambas cosas.

## 8. PROVEEDOR

Debe distinguirse:
Proveedor entidad comercial

de:
User con Role Proveedor.

El AS-IS actual tiene una entidad Proveedor con empresaId y relaciones con Compras, productos, pagos y devoluciones.

No existe evidencia suficiente para convertir automáticamente cada Proveedor en User/Membership.

Por tanto:
- Proveedor comercial → permanece como entidad Commerce;
- Supplier login → capacidad futura/opcional;
- Membership Proveedor → sólo si una decisión posterior lo autoriza.

## 9. Permissions

La dirección target es:
Membership → Role → Permission.

El mapping de permisos debe hacerse después de fijar los Roles.

No debe hacerse una conversión ciega de UsuarioPermiso → RolePermission.

Primero hay que determinar el conjunto efectivo de permisos de cada rol actual y preservar cualquier excepción real.

Además, el modelo target debe resolver permisos dinámicamente en backend, no confiar en una lista completa de permisos congelada dentro del JWT.

## 10. Legajo y Membership

El Legajo actual no debe convertirse en una propiedad directa del User target.

Su contenido mezcla:
- identidad/empleado;
- requisitos de aprobación;
- información fiscal;
- información de proveedor;
- información de Customer mayorista;
- requisitos específicos de Repartidor.

La propuesta de transformación debe separar al menos conceptualmente:

### User
Identidad global.

### Membership
Relación User ↔ Business + Role + estado de pertenencia.

### Employee/Operational profile
Datos específicos necesarios para operar como personal del Business, si el dominio los requiere.

### Supplier
Información comercial de proveedor.

### Customer
Información comercial del comprador.

No se propone todavía crear las cuatro entidades físicamente.

## 11. Estado de R-01

**OPEN — requiere definición del Owner.**

La información disponible permite cerrar:
- OWNER → Owner/Admin como mapping altamente compatible;
- Customer separado de Role;
- Proveedor comercial separado de Membership;
- preservación de Repartidor como capacidad operativa.

Pero no permite decidir legítimamente:
- ASISTENTE_LOCAL → Vendedor;
- existencia definitiva de Assistant;
- relación exacta entre Repartidor y Role;
- catálogo final de Roles Wapsell.

## 12. Estado de R-03

**OPEN — requiere diseño de dominio.**

No debe migrarse Legajo directamente a User o Membership.

Antes debe producirse un Legajo / Operational Profile Transformation Analysis que identifique ownership de cada atributo y documento.

## 13. Consecuencia para la migration

No hace falta bloquear toda la migración por Proveedor o Customer.

Sí debe bloquearse la creación definitiva de Role/Membership.roleId hasta cerrar el mapping de roles.

Mientras tanto puede diseñarse de forma segura:
- Business;
- User;
- Membership sin catálogo final congelado;
- mapping legacy IDs;
- Customer independiente;
- Business ownership.

## 14. Próximo artefacto

El siguiente documento debe ser:

**Legajo / Operational Profile Transformation Analysis**

Objetivo: separar cada atributo actual de Legajo por ownership target, detectar duplicaciones y definir qué debe permanecer asociado a User, Membership, Customer, Supplier o perfil operativo.

No generar migration Prisma todavía.
