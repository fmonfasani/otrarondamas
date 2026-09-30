# 09 — Identity/Tenancy Impact Map — AS-IS → TO-BE

**Fecha:** 2026-09-28  
**Estado:** ANALYSIS — PROPOSAL / NOT APPROVED  
**Ámbito:** impacto de la transformación Identity & Tenancy sobre runtime, Prisma y módulos

> Este documento es un mapa de impacto. No autoriza migraciones, cambios de `schema.prisma`, cambios de guards ni cambios de datos.

> **Trazabilidad de rulings (R1, 2026-09-30) — nota aditiva; el texto de este documento no se modificó.**
>
> - **Source / Authority:** `04-DECISIONS/13-OR-001-OWNER-RULING-CLOSURE.md` — OR-001, `CLOSED` 2026-09-28
>   (P1-A rename `Empresa` → `Business`; P2-C convivencia temporal; P3 sin downtime; P4 `"Roonda"` →
>   `"Otra Ronda Más"`; P5-B documentar antes de implementar).
> - **Source / Authority:** `04-DECISIONS/15-OR-002-A-OWNER-RULING.md` — OR-002-A, `CLOSED` 2026-09-28
>   (`User` → `Membership` N:N → `Business`; `Customer` independiente, vínculo opcional).
> - **Alcance de P1-A — ambigüedad preservada, contradicción no demostrada.** §3.1 (*"No conviene renombrar
>   físicamente la tabla en el primer paso"*; *"El rename físico puede ser una fase posterior, no un requisito
>   para conseguir el modelo conceptual"*) y §16 (*"no es un rename de `Empresa` a `Business`"*, que describe
>   cuatro capas) son propuestas de análisis. OR-001 P1-A decide `Empresa` → `Business` como destino final y
>   deja tablas, columnas y FKs fuera de su alcance, sin definir si el renombrado es físico o conceptual.
>   Ninguna de las fuentes afirma que el destino no sea `Business`; lo que difieren es el cuándo y el cómo.
>   Decisión pendiente del Owner. Este documento sigue siendo `ANALYSIS — PROPOSAL / NOT APPROVED`.
> - Ningún ruling autoriza implementación física.

> **Propagación R3 (2026-09-30) — nota aditiva; ninguna línea anterior fue modificada ni borrada.**
> **Source / Authority:** `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md` §1 y `04-DECISIONS/00-DECISION-REGISTER.md` §8.
> - **Alcance de P1-A — resuelto en destino:** P1-A opción C (Owner, 2026-09-30): `Empresa` → `Business` aplica
>   a la terminología documental y conceptual **y** al modelo persistente, como destino final. La ambigüedad de
>   arriba queda limitada al **cuándo y el cómo** (§3.1 y §16 siguen siendo propuestas de análisis sobre orden y
>   fases, no contradicen el destino final `Business`). Tablas, columnas, FK, índices, constraints,
>   compatibilidad, migración, rollback, deploy y cutover siguen `OPEN`; no se autoriza ni diseña la migración física.
> - OR-002-B…E fijan dirección conceptual (transición incremental con coexistencia temporal y acotada; `User`
>   global con email único global; `Usuario` → `User` + `Membership`, `Cliente` → `Customer` independiente;
>   compatibilidad temporal de sesiones/tokens legacy, luego invalidación y nuevo login). Detalles técnicos `OPEN`.
> - OR-002-F/P5-B: `ESPECIFICACIÓN → APROBACIÓN → IMPLEMENTACIÓN`. Especificación técnica = `NOT APPROVED`;
>   implementación = `NOT AUTHORIZED`. Este mapa sigue `ANALYSIS — PROPOSAL / NOT APPROVED`.

## 1. Base verificada

La revisión se realizó sobre la rama de transformación y el código existente.

Hallazgos centrales:

- `Empresa` es actualmente la raíz Business-scoped.
- `Usuario` depende directamente de `Empresa` mediante `empresaId`.
- `Usuario.rol` es un enum AS-IS y no es el mecanismo principal de autorización.
- `UsuarioPermiso` vincula directamente Usuario → Permiso.
- `Cliente` es Business-scoped y separado de Usuario.
- `Proveedor` es Business-scoped y comercial.
- `Legajo` puede depender de Usuario o Cliente.
- JWT actual contiene `empresaId`, `rol`, `permisos` y `estadoLegajo`.
- `EmpresaScopedPrismaService` construye aislamiento mediante extensión Prisma basada en `empresaId`.
- La tienda pública obtiene el Business actual mediante `TIENDA_EMPRESA_ID`, no mediante Membership.

## 2. Matriz de impacto global

| Componente | Dependencia AS-IS | Impacto | Acción futura |
|---|---|---:|---|
| Prisma `Empresa` | raíz de aislamiento | CRÍTICO | Business compatibility/migration |
| Prisma `Usuario` | empresaId + rol | CRÍTICO | User + Membership |
| `UsuarioPermiso` | User → Permission | CRÍTICO | RolePermission / transition |
| `Permiso` | catálogo actual | ALTO | preservar IDs y migrar asociación |
| `Cliente` | empresaId | ALTO | businessId + userId opcional |
| `Proveedor` | empresaId | ALTO | businessId; no Membership automática |
| `Invitacion` | empresaId + rol + invitadoPorId | CRÍTICO | businessId + inviter Membership/User |
| `Legajo` | usuarioId/clienteId | CRÍTICO | Operational Profile + Customer side |
| JWT | empresaId/rol/permisos | CRÍTICO | User + Membership context |
| JwtStrategy | AuthenticatedUser legacy shape | CRÍTICO | resolver Business Context |
| PermissionsGuard | permisos embebidos | CRÍTICO | Membership/Role/Permission |
| Prisma tenant scope | empresaId | CRÍTICO | businessId + context |
| Catalog | empresaId | ALTO | businessId |
| Sales | empresaId + usuarioId + clienteId | CRÍTICO | businessId + userId + customer |
| Orders | empresaId + usuarioId + clienteId | CRÍTICO | businessId + actor User |
| Inventory | empresaId + usuarioId | CRÍTICO | business ownership + actor |
| Purchases | empresaId + usuarioId + proveedor | CRÍTICO | business + User + Supplier |
| Cash | empresaId + usuarioId | CRÍTICO | business + actor Membership |
| Payments | empresaId + usuarioId | CRÍTICO | business + actor |
| Store | fixed empresaId | ALTO | explicit Business public context |
| Users | empresaId | CRÍTICO | Membership-scoped administration |
| Legajo controllers | empresaId + rol | CRÍTICO | Membership/Profile authorization |

## 3. Prisma — impacto detallado

### 3.1 Empresa → Business

Impacto: **CRÍTICO**.

No conviene renombrar físicamente la tabla en el primer paso.

Propuesta de coexistencia:

`Empresa` permanece durante migración mientras el concepto target se materializa.

Motivo:

- 17 migrations existentes;
- numerosos FKs;
- tenant extension;
- servicios con `empresaId`;
- runtime ya operativo.

El rename físico puede ser una fase posterior, no un requisito para conseguir el modelo conceptual.

### 3.2 Usuario → User

Impacto: **CRÍTICO**.

Actualmente:

- `empresaId`;
- `rol`;
- `estadoLegajo`;
- `legajo`;
- `usuarioPermisos`;
- numerosas relaciones operativas.

La transformación debe separar:

`User`
+
`Membership`
+
`OperationalProfile`.

No eliminar campos legacy hasta completar backfill y cutover.

### 3.3 UsuarioPermiso

Impacto: **CRÍTICO**.

AS-IS:

`Usuario → UsuarioPermiso → Permiso`

Target:

`Membership → Role → RolePermission → Permission`

El problema no es solo estructural: hay que conservar autorización efectiva durante coexistencia.

No borrar `UsuarioPermiso` antes de generar y reconciliar el mapping.

### 3.4 Cliente

Impacto: **ALTO**.

Actualmente tiene `empresaId` y autenticación propia.

Target:

`Business → Customer`

y opcionalmente:

`Customer → User`

No se debe fusionar Customer con User.

### 3.5 Proveedor

Impacto: **ALTO**.

Proveedor tiene dependencias comerciales:

- Compra;
- ProductoProveedor;
- PagoProveedor;
- DevolucionProveedor.

Debe continuar como entidad comercial.

No debe transformarse automáticamente en Membership.

### 3.6 Invitacion

Impacto: **CRÍTICO**.

Actualmente:

- `empresaId`;
- `rol`;
- `invitadoPorId`;
- email;
- token.

Target conceptual:

- `businessId`;
- role target;
- inviter User/Membership;
- estado/expiración.

Existe además una inconsistencia AS-IS relevante: las invitaciones de mayorista reutilizan `rol` como placeholder aunque crean un Customer, no un Usuario interno.

Esto debe resolverse antes de una migración de Invitations.

## 4. Auth / JWT

### AS-IS

El JWT actual transporta:

- `sub`;
- `email`;
- `nombre`;
- `empresaId`;
- `permisos`;
- `rol`;
- `estadoLegajo`;
- `type`.

`JwtStrategy.validate()` reproduce ese shape.

### Impacto

**CRÍTICO**.

El target no puede conservar `empresaId` como autoridad de pertenencia.

Debe existir conceptualmente:

`User`
→ `Business Context`
→ `Membership`
→ `Role / Permissions`

Además, el AS-IS tiene permisos en JWT y documenta que revocaciones no son inmediatas.

El target deberá definir si el contexto se resuelve:

- por sesión;
- por claim mínimo;
- por lookup dinámico;
- o combinación.

No se decide aquí.

## 5. PermissionsGuard

Impacto: **CRÍTICO**.

Actual:

`request.user.permisos`

y:

- endpoint sin `@RequierePermiso` = autenticación suficiente;
- endpoint con decorator = busca permiso en JWT.

Target:

`User + Business Context + Membership + Permission`

Esto implica revisar endpoint por endpoint.

No es seguro hacer un reemplazo mecánico de:

`user.empresaId → user.businessId`

porque no resolvería Membership ni contexto.

## 6. Tenant Scope

### AS-IS

`EmpresaScopedPrismaService.forEmpresa(empresaId)`

fuerza:

- create → empresaId;
- queries → empresaId;
- update/delete → empresaId.

### Target

La abstracción debería evolucionar conceptualmente a:

`BusinessScopedPrisma.forBusiness(businessId)`

pero solo después de que el Business Context haya sido validado.

El cambio debe preservar:

- create forcing;
- query filtering;
- findUnique post-check;
- child-model behavior;
- raw SQL filters.

## 7. Módulos de negocio

### Catalog

Impacto: **ALTO**.

Todos los recursos principales están Business-scoped.

Transformación mecánica futura:

`empresaId → businessId`

pero sin modificar ownership.

### Sales

Impacto: **CRÍTICO**.

Una Venta actualmente registra:

- Business;
- Usuario actor;
- Customer opcional.

Target:

- Business;
- User actor;
- Customer opcional.

La diferencia clave es que el actor ya no se interpreta como perteneciente exclusivamente a un Business.

Debe preservarse la Membership usada para ejecutar la operación o, como mínimo, validarse en runtime.

### Orders

Impacto: **CRÍTICO**.

Mismo patrón:

- Business;
- User actor;
- Customer.

Fulfillment/Repartidor agrega dependencia futura de Operational/Delivery Profile.

### Inventory

Impacto: **CRÍTICO**.

El aislamiento por Business es esencial.

Debe preservarse:

- Business ownership;
- actor User;
- transacciones;
- filtros raw SQL;
- invariantes de stock.

No debe introducirse un stock global.

### Purchases

Impacto: **CRÍTICO**.

Dependencias:

`Business + User + Supplier + Product`

Supplier permanece comercial.

### Cash

Impacto: **CRÍTICO**.

Actualmente los movimientos dependen de:

- Caja/Business;
- Usuario actor.

El target debe conservar el actor User y validar su Membership.

Los modelos hijos sin `empresaId` directo requieren especial atención durante el cambio del scope.

### Payments

Impacto: **CRÍTICO**.

Mantener:

- Business;
- Venta;
- User actor;
- Caja.

El scope debe seguir el Business de la operación.

### Store

Impacto: **ALTO**.

Actualmente la tienda pública usa:

`TIENDA_EMPRESA_ID`

porque no existe una sesión interna.

Eso no debe reemplazarse por Membership para clientes anónimos.

Debe existir un mecanismo de Business público explícito, separado del Business Context autenticado de un User interno.

### Users

Impacto: **CRÍTICO**.

Las operaciones administrativas deben pasar de:

`empresaId del User`

a:

`Membership del actor → Business`.

### Legajo

Impacto: **CRÍTICO**.

Los endpoints actuales usan:

- `user.empresaId`;
- `user.rol`;
- `user.estadoLegajo`.

El target requiere:

- Membership;
- Role;
- Operational Profile;
- estado de aprobación apropiadamente ubicado.

No hacer rename mecánico.

## 8. Relaciones que requieren migración de actor

Estas relaciones actualmente guardan `usuarioId`:

- Venta;
- Pedido;
- Compra;
- Pago;
- MovimientoStock;
- Caja/Apertura/Movimientos/Arqueos/Cierres;
- Entrega;
- AuditLog;
- Autorizacion;
- Invitacion;
- otras relaciones operativas.

En el target, `usuarioId` puede evolucionar conceptualmente a `userId`.

Pero **no debe agregarse Membership FK a todas las tablas por defecto**.

Primero debe definirse dónde se necesita conservar el contexto histórico exacto de Membership/Role.

## 9. Relaciones que requieren Business migration

Todo modelo con `empresaId` directo entra en la primera ola de impacto.

La lista actual incluye:

- Usuario;
- Producto;
- Familia;
- Subfamilia;
- Tipo;
- Subtipo;
- ProductoProveedor;
- Presentacion;
- Lote;
- Cliente;
- CuentaCorriente;
- Deuda;
- Venta;
- Pedido;
- Pago;
- Caja;
- Proveedor;
- Compra;
- RecepcionCompra;
- MovimientoStock;
- Entrega;
- Notificacion;
- AuditLog;
- Autorizacion;
- ReglaFidelizacion;
- Invitacion.

La extensión actual cubre estos modelos mediante `empresaId`.

## 10. Relaciones transitivas

La extensión actual reconoce explícitamente que algunos modelos no tienen `empresaId`:

- VentaItem → Venta;
- AplicacionPago → Pago;
- AperturaCaja → Caja;
- MovimientoCaja → Caja;
- ArqueoCaja → Caja;
- CierreCaja → Caja;
- CompraItem → Compra.

Estas relaciones son un riesgo específico de la migración.

El cambio de `empresaId` a `businessId` debe conservar aislamiento transitivo.

No basta con cambiar columnas directas.

## 11. Google / autenticación externa

`auth.google.service.ts` crea o busca Usuarios y depende de:

- email;
- googleId;
- empresa configurada por `GOOGLE_SIGNUP_EMPRESA_ID` para determinados flujos.

Esto entra en la migración de identidad.

Debe evitarse que el onboarding Google vuelva a crear la antigua relación exclusiva User → Business.

## 12. Riesgos principales

| Riesgo | Severidad |
|---|---:|
| crear Membership incorrecta durante backfill | CRÍTICA |
| pérdida de permisos efectivos | CRÍTICA |
| cross-Business access durante cutover | CRÍTICA |
| Customer/User matching incorrecto | CRÍTICA |
| romper JWT existentes | ALTA |
| romper invitaciones | ALTA |
| romper Legajo/documentos | CRÍTICA |
| romper raw SQL de inventory | ALTA |
| perder ownership Business en recursos hijos | CRÍTICA |
| cambiar Store pública por lógica Membership | ALTA |

## 13. Orden de implementación recomendado

No como autorización todavía, sino como secuencia técnica propuesta:

1. nuevas estructuras Identity/Tenancy;
2. seed/mapping de Role y Permission;
3. backfill Business/User/Membership;
4. backfill Customer ↔ User solo en matches deterministas;
5. compatibility layer;
6. Business Context;
7. authorization adapter;
8. dual-read;
9. validación de aislamiento;
10. migración progresiva de módulos;
11. JWT/session cutover;
12. dual-write solo donde sea necesario;
13. reconciliación;
14. cutover definitivo;
15. rollback window;
16. cleanup legacy.

## 14. Gate antes de implementar

No iniciar `schema.prisma` migration hasta resolver:

- Role mapping;
- Membership state;
- Operational Profile;
- Delivery Profile;
- permission migration;
- Customer/User matching;
- Invitation model;
- JWT/session contract;
- Business Context contract.

## 15. Estado

**VERIFICADO POR CÓDIGO**

- Prisma schema;
- Auth;
- JWT;
- PermissionsGuard;
- tenant scope;
- Invitations;
- Customer;
- Supplier;
- Sales;
- Orders;
- Inventory;
- Purchases;
- Cash;
- Payments;
- Store;
- Legajo.

**ANALIZADO**

Impacto conceptual AS-IS → TO-BE.

**NO IMPLEMENTADO**

- nuevas tablas;
- nuevas FKs;
- migraciones;
- dual-write;
- compatibility runtime;
- nuevo JWT;
- nuevo Business Context.

## 16. Conclusión

La transformación Identity/Tenancy no es un rename de `Empresa` a `Business`.

Afecta cuatro capas simultáneamente:

1. **Persistencia:** Empresa/User/Membership/Role/Permission.
2. **Autenticación:** JWT y sesión.
3. **Autorización:** Membership + Role + Permission.
4. **Aislamiento:** Business Context + Prisma scope.

Los módulos comerciales ya están razonablemente preparados para una transición porque gran parte de ellos recibe explícitamente `empresaId` y utiliza `EmpresaScopedPrismaService`. El principal trabajo de transformación está en identidad, autorización y contexto, no en reescribir la lógica comercial.

**No se realizaron cambios de Prisma, runtime ni datos.**
