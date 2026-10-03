# Identity & Tenancy — Canonical Physical Schema Contract

**Fecha:** 2026-09-29  
**Estado:** DRAFT — FOR REVIEW  
**Branch:** `audit/identity-tenancy-2026-09-28`

## 1. Purpose

Definir el contrato físico target para la transformación Empresa/Usuario hacia Business/User/Membership, sin ejecutar todavía cambios de Prisma, runtime ni datos.

Este documento deriva del OR-002 Identity & Tenancy Technical Specification y de las 17 migraciones existentes inspeccionadas.

> **R3 REVALIDATION NOTE (2026-09-30) — additive; the text below is preserved unchanged as historical evidence. This document is DRAFT, NOT APPROVED and NOT NORMATIVE (ISS-08: Audit is evidence only).**
>
> - The physical schema/contract described here is **not** approved and no physical detail is confirmed by the Owner. P1-A option C (`Empresa` → `Business` as final destination) does not authorize or design this physical migration.
> - The clause "mismo email normalizado = misma persona" (Customer↔User matching) is **not** confirmed: it stays `OPEN`. Technical Specification `NOT APPROVED`; implementation `NOT AUTHORIZED`; G5, G7, G8, G9 `OPEN`.
> - Authority for OR-002-B…F: `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md` and Decision Register §8.1.

## 2. Physical target

### 2.1 Business

La entidad física target representa al actual `Empresa`.

Contrato:

- `Business.id`: UUID, preservando el valor de `Empresa.id`.
- `Business.name`: equivalente de `Empresa.nombre`.
- `Business.configuration`: equivalente de `Empresa.configuracion`.
- timestamps preservados.

Durante coexistencia debe existir una correspondencia determinística:

`Business.id = Empresa.id`

No se permite generar nuevos IDs de Business para los registros migrados.

### 2.2 User

La identidad global deriva de `Usuario`.

Contrato:

- preservar `Usuario.id`;
- `email` representa identidad global;
- email globalmente único bajo la regla de normalización definida por OR-002;
- `empresaId` deja de ser la relación target de pertenencia;
- `rol` deja de ser la autorización target;
- atributos personales/autenticación existentes se preservan.

Los FKs históricos que identifican al actor continúan apuntando a User.

### 2.3 Membership

Nueva entidad física obligatoria.

Campos conceptuales:

| Campo | Contrato |
|---|---|
| id | UUID |
| userId | FK → User |
| businessId | FK → Business |
| roleId | FK → Role |
| active | estado de membership |
| createdAt | timestamp |
| updatedAt | timestamp |

Restricción:

`UNIQUE(userId, businessId)`

Cada relación AS-IS válida `Usuario.empresaId` produce inicialmente una Membership.

### 2.4 Role

Nueva entidad física.

Roles iniciales:

- OWNER_ADMIN
- VENDEDOR
- GESTOR_STOCK
- CLIENTE_COMPRADOR
- PROVEEDOR
- REPARTIDOR

El identificador físico definitivo puede ser UUID o equivalente estable, pero debe ser definido en la migración/schema implementation antes de ejecución.

No se utilizará el enum legacy `RolUsuario` como autorización target.

### 2.5 Permission

La entidad Permission existente puede preservarse como catálogo físico si su semántica resulta compatible.

Debe conservar:

- identidad estable;
- nombre único;
- descripción;
- timestamps.

No se deben crear permisos duplicados para representar el mismo permiso lógico.

### 2.6 RolePermission

Nueva entidad física:

`RolePermission(roleId, permissionId)`

Restricción:

`UNIQUE(roleId, permissionId)`

Esta tabla constituye la relación target entre roles y permisos.

### 2.7 Customer

La entidad actual `Cliente` continúa Business-scoped.

Transformación conceptual:

- `Cliente.id` → Customer.id
- `Cliente.empresaId` → Customer.businessId
- agregar `userId` nullable cuando corresponda.

La unicidad comercial permanece Business-scoped.

No convertir Customer en Membership.

### 2.8 Supplier

`Proveedor` continúa Business-scoped.

No crear User/Membership automáticamente.

## 3. Legacy compatibility structures

Durante la transición deben permanecer:

- `Usuario.empresaId`;
- `Usuario.rol`;
- `UsuarioPermiso`;
- estructuras Empresa/Usuario existentes necesarias para compatibilidad;
- Legajo y DocumentoLegajo.

Estas estructuras no se eliminan hasta completar validación y cutover.

## 4. Historical actor FKs

No modificar automáticamente las siguientes relaciones:

- Venta.usuarioId
- Compra.usuarioId
- Pago.usuarioId
- MovimientoStock.usuarioId
- AuditLog.usuarioId
- Autorizacion.autorizadorId
- Entrega.preparadorId
- Entrega.repartidorId

Su semántica continúa siendo:

**User = actor histórico**

La Membership determina autorización contextual actual.

## 5. Business ownership

Todo recurso Business-scoped debe resolver su Business mediante Business ownership.

Durante coexistencia:

`legacy empresaId = target businessId`

La migración no debe cambiar simultáneamente ownership y actor identity.

## 6. Email identity constraint

La regla funcional es:

**mismo email normalizado = misma persona.**

La implementación física debe garantizar:

- comparación determinística;
- unicidad global de User;
- detección previa de colisiones;
- imposibilidad de crear dos Users con el mismo email normalizado.

La técnica exacta de normalización y enforcement debe quedar explícita en la Prisma migration antes de aplicarse.

## 7. Customer → User linkage

`Customer.userId` es nullable.

Reglas:

1. si existe un User con el mismo email normalizado, se puede establecer el vínculo;
2. si no existe, Customer permanece sin User;
3. si existen múltiples candidatos, bloquear y reconciliar;
4. nunca elegir arbitrariamente;
5. nunca crear Membership solo por Customer.

## 8. Membership authorization

Toda autorización Business-scoped debe resolver:

`User → Membership → Role → RolePermission → Permission`

Una sesión autenticada sin Membership válida para el Business objetivo no obtiene autorización.

## 9. Referential integrity

Todas las nuevas FK deben ser:

- explícitas;
- indexadas cuando corresponda por acceso;
- protegidas contra referencias huérfanas;
- compatibles con el orden de backfill.

No se debe imponer una FK/NOT NULL antes de que los datos hayan sido poblados y validados.

## 10. Migration ordering contract

El cambio físico deberá respetar:

1. additive target structures;
2. Business compatibility/target;
3. User compatibility;
4. Role;
5. Permission;
6. RolePermission;
7. Membership;
8. Customer.userId;
9. backfill;
10. validation;
11. runtime cutover;
12. legacy retirement.

No ejecutar drops o conversiones destructivas durante las fases iniciales.

## 11. Existing migration compatibility

El schema contract debe respetar las 17 migraciones existentes y, en particular:

- Usuario actualmente depende de Empresa;
- Usuario.email es globalmente unique;
- Cliente tiene uniqueness compuesta por Business/email;
- Proveedor tiene uniqueness compuesta por Business/nombre;
- UsuarioPermiso existe;
- Legajo referencia opcionalmente Usuario o Cliente;
- múltiples entidades operativas referencian Usuario;
- el enum legacy RolUsuario existe;
- existen migraciones históricas con cambios destructivos y NOT NULL transitions.

No se debe editar retrospectivamente una migración ya aplicada.

## 12. Constraint transition strategy

Para cualquier constraint que cambie semántica:

**add → populate → validate → enforce → retire legacy**

Nunca:

**drop legacy → hope backfill succeeds**

## 13. Prisma implementation prerequisites

Antes de crear la migration Prisma ejecutable todavía deben fijarse explícitamente:

- nombres físicos finales de tablas/modelos;
- PK/FK exactas;
- tipo de IDs;
- nombre físico del campo de email normalizado, si se materializa;
- estrategia de índice de unicidad normalizada;
- estados de Membership;
- Role catalog persistence;
- Permission catalog compatibility;
- Customer.userId FK behavior;
- delete/update actions;
- índices de acceso;
- tratamiento físico de `Usuario.empresaId`;
- tratamiento físico de `Usuario.rol`;
- tratamiento físico de `UsuarioPermiso`.

## 14. Non-goals

Este contrato no autoriza:

- ejecutar Prisma migrations;
- modificar datos;
- modificar runtime;
- desplegar;
- eliminar Empresa;
- eliminar Usuario.empresaId;
- eliminar Usuario.rol;
- eliminar UsuarioPermiso;
- migrar físicamente Legajo;
- invalidar sesiones.

## 15. Gate status

| Gate | Estado |
|---|---|
| OR-002-B | DECIDED |
| OR-002-C | DECIDED |
| OR-002-D | DECIDED |
| OR-002-E | DECIDED |
| OR-002-F | DECIDED |
| G5 | OPEN — execution/reconciliation |
| G7 | OPEN — authentication/session contract |
| G8 | OPEN — validation environment |
| G9 | OPEN — this contract requires review/finalization |
| Prisma implementation | NOT STARTED |

**Conclusion:** este documento constituye el borrador del contrato físico. Antes de generar la migration Prisma ejecutable deben cerrarse los puntos explícitamente marcados como prerequisites.
