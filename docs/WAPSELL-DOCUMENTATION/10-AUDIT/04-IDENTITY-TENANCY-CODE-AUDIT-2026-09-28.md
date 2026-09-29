# Identity & Tenancy — Code Audit
**Fecha:** 2026-09-28  
**Base auditada:** `main` @ `b6646e70b0fa43862f5a0d1db0c3cd22aed3537`  
**Tipo:** AS-IS / code evidence  
**Estado:** AUDIT — no modifica runtime

## 1. Objetivo

Verificar cuánto del modelo Wapsell `User → Membership → Business → Role/Permission` existe realmente en el código y dónde permanece el acoplamiento AS-IS `Usuario → Empresa`.

Este documento no aprueba decisiones nuevas ni autoriza migraciones. Registra evidencia para la siguiente etapa de transformación.

## 2. Resultado ejecutivo

**Conclusión:** la transformación conceptual está documentada, pero la identidad física todavía es AS-IS.

El backend actual continúa organizado alrededor de:

`Usuario → empresaId → Empresa`

y el aislamiento de datos utiliza `empresaId` como clave técnica.

El TO-BE requiere:

`User → Membership → Business → Role/Permissions`

Por lo tanto, **no corresponde ejecutar un rename mecánico de `Empresa`/ `empresaId` a `Business`/ `businessId`**. Eso conservaría la relación 1:N actual y no implementaría Membership N:N.

## 3. Evidencia verificada

### 3.1 Authentication

`apps/api/src/auth/auth.service.ts`

La sesión actual consulta `Usuario` por email y obtiene:

- `empresaId`
- `rol`
- `empresa`
- `usuarioPermisos`

El JWT actual emite:

- `sub`
- `email`
- `nombre`
- `empresaId`
- `permisos`
- `rol`
- `estadoLegajo`
- `type: 'usuario'`

**Estado:** VERIFICADO POR CÓDIGO.

### 3.2 JWT / request identity

`apps/api/src/auth/auth.types.ts`

`JwtPayload` y `AuthenticatedUser` requieren actualmente:

- `empresaId`
- `rol`
- `permisos`
- `estadoLegajo`
- `type`

Además, el mismo esquema soporta actualmente `usuario | cliente`.

**Impacto:** la futura identidad global no puede implementarse solo agregando Membership al schema; hay que rediseñar el contrato de sesión y la resolución de contexto Business.

**Estado:** VERIFICADO POR CÓDIGO.

### 3.3 Authorization

`apps/api/src/app.module.ts`

Hay dos guards globales, en este orden:

1. `JwtAuthGuard`
2. `PermissionsGuard`

`PermissionsGuard` solo exige un permiso cuando existe `@RequierePermiso`. Un endpoint autenticado sin ese decorador queda autorizado por autenticación.

Esto es una característica del mecanismo actual, no una conclusión sobre si cada endpoint debería o no requerir permiso.

**Estado:** VERIFICADO POR CÓDIGO.

### 3.4 Tenant isolation

`apps/api/src/prisma/empresa-scope.extension.ts`

Existe un Prisma Client Extension que fuerza `empresaId` en:

- create/createMany
- consultas con where
- update/delete/count/aggregate
- findUnique/findUniqueOrThrow mediante verificación posterior

También rechaza operaciones no contempladas explícitamente.

La extensión cubre modelos con `empresaId` directo. El propio código documenta que algunos modelos hijos dependen del scope de su padre, entre ellos:

- `VentaItem → Venta`
- `AplicacionPago → Pago`
- `AperturaCaja/MovimientoCaja/ArqueoCaja/CierreCaja → Caja`
- `CompraItem → Compra`
- `Legajo/DocumentoLegajo → Usuario/Cliente`

**Estado:** VERIFICADO POR CÓDIGO.

### 3.5 Scoped Prisma

`apps/api/src/prisma/empresa-scoped-prisma.service.ts`

El caller obtiene un cliente scoped mediante:

`forEmpresa(empresaId)`

El diseño actual evita depender de un request-scoped provider para resolver el tenant antes de ejecutar guards.

**Estado:** VERIFICADO POR CÓDIGO.

### 3.6 Prisma schema

`apps/api/prisma/schema.prisma`

El modelo físico actual contiene:

- `Empresa`
- `Usuario.empresaId`
- `Usuario.rol`
- `UsuarioPermiso`
- `Permiso`

No se verificó en el schema actual la existencia de un modelo físico TO-BE equivalente a:

- `Business`
- `Membership`
- `Role` contextual
- `MembershipPermission`

**Estado:** VERIFICADO POR CÓDIGO.

## 4. Roles: gap de transformación

El código actual define `RolUsuario` como:

- `OWNER`
- `ASISTENTE_LOCAL`
- `PROVEEDOR`
- `REPARTIDOR`

El modelo Wapsell documentado requiere roles contextuales por Membership:

- Owner/Admin
- Vendedor
- Gestor de Stock
- Cliente/Comprador
- Proveedor

Por lo tanto, el enum actual no puede convertirse directamente en el catálogo final sin una regla de mapeo explícita.

**Estado:** VERIFICADO POR CÓDIGO + DOCUMENTADO.

## 5. Endpoint authorization — snapshot

Auditoría de controllers actuales:

| Área | Observación |
|---|---|
| Catálogo | lecturas públicas para usuario autenticado; mutaciones con `productos.gestionar` |
| Clientes | listado sin permiso; operaciones administrativas con `clientes.gestionar` |
| Compras | lecturas de compras/pagos/devoluciones sin permiso; mutaciones principales con `compras.gestionar` |
| Inventario | lecturas sin permiso; ajustes con `inventario.ajustes` |
| Ventas | operaciones comerciales principales con permisos; búsqueda de productos sin permiso |
| Caja | algunas operaciones sin permiso; gastos/cierre con `caja.gastos` |
| Pedidos | endpoints principales con `pedidos.gestionar` |
| Usuarios | listado sin permiso |
| Fidelización | endpoints mostrados con `fidelizacion.gestionar` |
| Tienda | endpoints sin `@RequierePermiso`, coherente con su carácter de canal de tienda |
| Legajo | mezcla de endpoints personales sin permiso y administración con `usuarios.gestionar` |
| Invitaciones | creación/listado con `usuarios.gestionar`; activación sin ese permiso |

Esto **no demuestra por sí mismo una vulnerabilidad**. Sí demuestra que la migración a Membership deberá definir explícitamente qué permisos son obligatorios por operación y qué endpoints son deliberadamente accesibles a cualquier identidad autenticada.

**Estado:** VERIFICADO POR CÓDIGO.

## 6. Gaps estructurales para Wapsell

### G1 — Global User
**Estado:** GAP CRÍTICO.

`Usuario` está físicamente ligado a una única `Empresa`.

### G2 — Membership N:N
**Estado:** GAP CRÍTICO.

No existe la relación física User ↔ Business mediante Membership.

### G3 — Business como raíz de tenant
**Estado:** GAP DE TRANSFORMACIÓN.

Existe `Empresa`; el TO-BE requiere `Business`. La migración debe preservar datos históricos y aislamiento.

### G4 — Role contextual
**Estado:** GAP CRÍTICO.

`rol` vive actualmente en `Usuario`, no en Membership.

### G5 — Permission contextual
**Estado:** GAP CRÍTICO.

`UsuarioPermiso` vincula permisos directamente al usuario. El TO-BE requiere autorización contextual al Business.

### G6 — Session / JWT
**Estado:** GAP CRÍTICO.

El JWT actual contiene `empresaId`, `rol` y permisos. El TO-BE requiere resolver identidad global + Business Context + Membership.

### G7 — Customer vs User
**Estado:** DIRECCIÓN RESUELTA / IMPLEMENTACIÓN PENDIENTE.

La SPEC vigente distingue `Customer` como entidad comercial separada que puede vincularse a `User`, pero no está obligada a hacerlo.

### G8 — Tenant scope implementation
**Estado:** BASE EXISTENTE / REQUIERE REDISEÑO.

El extension de Prisma es una base reutilizable, pero su entrada actual es `empresaId`. Debe evolucionar a Business Context sin perder la garantía de aislamiento.

## 7. Qué NO se debe hacer

No ejecutar todavía:

- rename masivo `Empresa → Business`;
- rename masivo `empresaId → businessId`;
- eliminación de `Usuario.empresaId`;
- eliminación de `Usuario.rol`;
- reemplazo directo de `UsuarioPermiso`;
- migración de datos;
- cambio del JWT;
- cambio del Prisma scope;

sin tener primero definido el contrato físico y la estrategia de coexistencia.

## 8. Próxima etapa autorizable

La siguiente etapa técnica debe producir, sin ejecutar migraciones:

1. **Physical Target Model**
   - Business
   - User
   - Membership
   - Role
   - Permission
   - Membership ↔ Role/Permission
   - Customer ↔ optional User

2. **Legacy Mapping**
   - `Empresa → Business`
   - `Usuario → User`
   - `Usuario.empresaId → Membership.businessId`
   - `Usuario.rol → Membership.role`
   - `UsuarioPermiso → contextual permission model`

3. **Compatibility / coexistence strategy**
   - lectura
   - escritura
   - backfill
   - dual-read/dual-write si resulta necesario
   - cutover
   - rollback

4. **Authorization contract**
   - Business Context
   - Membership resolution
   - permission resolution
   - endpoint policy

5. **Isolation contract**
   - reemplazo controlado de `empresaScopeExtension`
   - cobertura de modelos directos e hijos
   - pruebas cross-business

6. **Migration validation**
   - invariants
   - data reconciliation
   - authorization tests
   - cross-tenant tests
   - session tests

## 9. Evidencia y límites

Este documento registra evidencia del código en `main`. No constituye aprobación del modelo físico ni de una estrategia de migración.

La SPEC de Identity & Tenancy continúa siendo la fuente de dirección funcional. Los detalles físicos permanecen abiertos hasta que se documenten y validen.

**Resultado:** el siguiente trabajo correcto es diseño físico + estrategia de coexistencia; no un rename mecánico.
