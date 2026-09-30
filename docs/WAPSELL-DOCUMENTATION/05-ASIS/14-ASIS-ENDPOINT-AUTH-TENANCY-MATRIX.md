# AS-IS Endpoint Authentication & Tenancy Matrix

**Status:** DOCUMENTED — CODE REVIEW EVIDENCE  
**Classification:** AS-IS / non-normative evidence artifact  
**Task:** TASK-ASIS-001 — Verify Identity / Tenancy AS-IS Slice  
**Repository:** fmonfasani/otrarondamas  
**Scope:** API controllers inspected on the current default branch  
**Important:** This matrix is code evidence only. It does not establish Wapsell TO-BE authorization, Membership, or physical tenancy contracts.

## 1. Evidence model

- **Auth:** global 'JwtAuthGuard' applies unless the endpoint is explicitly '@Public()'.
- **Permission:** '@RequierePermiso(...)' means 'PermissionsGuard' evaluates the permission from 'request.user.permisos'.
- **Legajo:** 'LegajoAprobadoGuard' is an additional AS-IS business-operation guard on several controllers.
- **Tenant context:** primarily 'user.empresaId', passed to services or used to obtain an 'EmpresaScopedPrismaService'.
- **Scoped Prisma:** 'EmpresaScopedPrismaService.forEmpresa(empresaId)' applies the current 'empresaId' to supported CRUD operations and verifies 'findUnique' results.
- **Manual tenant check:** some authentication, invitation and legajo paths use the base 'PrismaService' and explicitly constrain 'empresaId' where applicable.
- **Public:** an explicit '@Public()' endpoint intentionally bypasses the global JWT requirement.
- Absence of a permission decorator is recorded as **authenticated-only at the controller layer**, not as a TO-BE authorization recommendation.

## 2. Endpoint matrix

| Endpoint | Auth | Permission | Additional guard | Tenant/context mechanism | Evidence |
|---|---|---|---|---|---|
| POST /auth/login | Public | — | — | Login service | VERIFIED BY CODE |
| GET /auth/me | JWT | — | — | Base Prisma by global user id; includes Empresa | VERIFIED BY CODE |
| GET /auth/google | Public | — | Passport Google | Google OAuth flow | VERIFIED BY CODE |
| GET /auth/google/callback | Public | — | Passport Google | Google profile/login service | VERIFIED BY CODE |
| POST /autorizaciones | JWT | — | LegajoAprobado | user.empresaId → service | VERIFIED BY CODE |
| GET /caja/estado | JWT | — | LegajoAprobado | user.empresaId → CajaService | VERIFIED BY CODE |
| POST /caja/apertura | JWT | — | LegajoAprobado | user.empresaId → CajaService | VERIFIED BY CODE |
| POST /caja/movimientos | JWT | caja.gastos | LegajoAprobado | user.empresaId → CajaService | VERIFIED BY CODE |
| GET /caja/movimientos | JWT | — | LegajoAprobado | user.empresaId → CajaService | VERIFIED BY CODE |
| POST /caja/arqueo | JWT | — | LegajoAprobado | user.empresaId → CajaService | VERIFIED BY CODE |
| PATCH /caja/arqueo/:id/autorizar | JWT | — | LegajoAprobado | user.empresaId → CajaService | VERIFIED BY CODE |
| POST /caja/cierre | JWT | caja.gastos | LegajoAprobado | user.empresaId → CajaService | VERIFIED BY CODE |
| GET /catalogo/productos | JWT | — | LegajoAprobado | Scoped Prisma via forEmpresa(user.empresaId) | VERIFIED BY CODE |
| GET /catalogo/productos/:id | JWT | — | LegajoAprobado | Scoped Prisma | VERIFIED BY CODE |
| POST /catalogo/productos | JWT | productos.gestionar | LegajoAprobado | Scoped Prisma; create forces empresaId | VERIFIED BY CODE |
| PATCH /catalogo/productos/:id | JWT | productos.gestionar | LegajoAprobado | Scoped Prisma | VERIFIED BY CODE |
| GET /catalogo/jerarquia | JWT | — | — | Scoped Prisma | VERIFIED BY CODE |
| GET /clientes | JWT | — | LegajoAprobado | user.empresaId → ClientesService | VERIFIED BY CODE |
| GET /clientes/:id | JWT | — | LegajoAprobado | user.empresaId → ClientesService | VERIFIED BY CODE |
| POST /clientes | JWT | clientes.gestionar | LegajoAprobado | user.empresaId → ClientesService | VERIFIED BY CODE |
| PATCH /clientes/:id | JWT | clientes.gestionar | LegajoAprobado | user.empresaId → ClientesService | VERIFIED BY CODE |
| GET /proveedores | JWT | — | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| POST /proveedores | JWT | compras.gestionar | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| PATCH /proveedores/:id | JWT | compras.gestionar | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| GET /compras | JWT | — | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| GET /compras/:id | JWT | — | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| POST /compras | JWT | compras.gestionar | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| POST /compras/:id/emitir | JWT | compras.gestionar | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| POST /compras/:id/recepciones | JWT | compras.gestionar | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| GET /compras/:id/pagos | JWT | — | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| POST /compras/:id/pagos | JWT | compras.gestionar | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| GET /compras/:id/devoluciones | JWT | — | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| POST /compras/:id/devoluciones | JWT | compras.gestionar | LegajoAprobado | user.empresaId → ComprasService | VERIFIED BY CODE |
| GET /reglas-fidelizacion | JWT | fidelizacion.gestionar | LegajoAprobado | user.empresaId → FidelizacionService | VERIFIED BY CODE |
| GET /reglas-fidelizacion/:id | JWT | fidelizacion.gestionar | LegajoAprobado | user.empresaId → FidelizacionService | VERIFIED BY CODE |
| POST /reglas-fidelizacion | JWT | fidelizacion.gestionar | LegajoAprobado | user.empresaId → FidelizacionService | VERIFIED BY CODE |
| PATCH /reglas-fidelizacion/:id | JWT | fidelizacion.gestionar | LegajoAprobado | user.empresaId → FidelizacionService | VERIFIED BY CODE |
| GET /inventario/stock | JWT | — | LegajoAprobado | user.empresaId → InventarioService | VERIFIED BY CODE |
| GET /inventario/productos/:id/lotes | JWT | — | LegajoAprobado | Scoped Prisma | VERIFIED BY CODE |
| GET /inventario/productos/:id/movimientos | JWT | — | LegajoAprobado | Scoped Prisma | VERIFIED BY CODE |
| POST /inventario/ajustes | JWT | inventario.ajustes | LegajoAprobado | user.empresaId → InventarioService | VERIFIED BY CODE |
| GET /inventario/alertas | JWT | — | LegajoAprobado | user.empresaId → InventarioService | VERIFIED BY CODE |
| POST /invitaciones | JWT | usuarios.gestionar | — | user.empresaId → InvitacionesService | VERIFIED BY CODE |
| GET /invitaciones | JWT | usuarios.gestionar | — | Base Prisma + explicit empresaId filter | VERIFIED BY CODE |
| POST /invitaciones/activar | Public | — | — | Invitation token is credential | VERIFIED BY CODE |
| POST /invitaciones/mayorista | JWT | usuarios.gestionar | — | user.empresaId → InvitacionesService | VERIFIED BY CODE |
| POST /invitaciones/mayorista/activar | Public | — | — | Invitation token is credential | VERIFIED BY CODE |
| GET /legajo/mi-legajo | JWT | — | — | User identity → LegajoService | VERIFIED BY CODE |
| PATCH /legajo/mi-legajo | JWT | — | — | User identity → LegajoService | VERIFIED BY CODE |
| POST /legajo/mi-legajo/documentos | JWT | — | — | User identity → LegajoService | VERIFIED BY CODE |
| GET /legajo/mi-legajo/estado | JWT | — | — | User identity → LegajoService | VERIFIED BY CODE |
| GET /legajo/pendientes | JWT | usuarios.gestionar | — | Base Prisma + explicit empresaId filter | VERIFIED BY CODE |
| PATCH /legajo/:usuarioId/aprobar | JWT | usuarios.gestionar | — | findFirst constrained by id + empresaId | VERIFIED BY CODE |
| GET /legajo/documentos/:documentoId/descargar | JWT | usuarios.gestionar | — | Document → Legajo → Usuario; explicit empresaId check | VERIFIED BY CODE |
| GET /legajo/cliente/mi-legajo | JWT | — | — | user.type/esMayorista + client identity | VERIFIED BY CODE |
| PATCH /legajo/cliente/mi-legajo | JWT | — | — | user.type/esMayorista + client identity | VERIFIED BY CODE |
| POST /legajo/cliente/mi-legajo/documentos | JWT | — | — | user.type/esMayorista + client identity | VERIFIED BY CODE |
| GET /legajo/cliente/mi-legajo/estado | JWT | — | — | user.type/esMayorista + client identity | VERIFIED BY CODE |
| GET /legajo/cliente/pendientes | JWT | — | — | user.type check + empresaId filter | VERIFIED BY CODE |
| PATCH /legajo/cliente/:clienteId/aprobar | JWT | — | — | user.type + id + empresaId + esMayorista | VERIFIED BY CODE |
| POST /ventas/:ventaId/pagos | JWT | ventas.crear | LegajoAprobado | user.empresaId → PagosService | VERIFIED BY CODE |
| GET /ventas/:ventaId/pagos | JWT | — | LegajoAprobado | user.empresaId → PagosService | VERIFIED BY CODE |
| GET /pedidos | JWT | pedidos.gestionar | LegajoAprobado | user.empresaId → PedidosService | VERIFIED BY CODE |
| GET /pedidos/:id | JWT | pedidos.gestionar | LegajoAprobado | user.empresaId → PedidosService | VERIFIED BY CODE |
| PATCH /pedidos/:id/estado | JWT | pedidos.gestionar | LegajoAprobado | user.empresaId → PedidosService | VERIFIED BY CODE |
| GET /tienda/productos | Public | — | — | Public store business context | VERIFIED BY CODE |
| GET /tienda/jerarquia | Public | — | — | Public store business context | VERIFIED BY CODE |
| POST /tienda/pedidos | Public | — | — | Public order flow | VERIFIED BY CODE |
| GET /tienda/pedidos/:id | Public | — | — | Public order tracking flow | VERIFIED BY CODE |
| GET /usuarios | JWT | — | LegajoAprobado | Scoped Prisma via forEmpresa(user.empresaId) | VERIFIED BY CODE |
| GET /ventas/productos | JWT | — | LegajoAprobado | user.empresaId → VentasService | VERIFIED BY CODE |
| POST /ventas/cotizacion | JWT | ventas.crear | LegajoAprobado | user.empresaId → VentasService | VERIFIED BY CODE |
| POST /ventas | JWT | ventas.crear | LegajoAprobado | user.empresaId → VentasService | VERIFIED BY CODE |
| GET /ventas | JWT | ventas.ver | LegajoAprobado | user.empresaId → VentasService | VERIFIED BY CODE |
| GET /ventas/:id | JWT | ventas.ver | LegajoAprobado | user.empresaId → VentasService | VERIFIED BY CODE |
| GET /ventas/:id/comprobante | JWT | ventas.ver | LegajoAprobado | user.empresaId → VentasService | VERIFIED BY CODE |
| POST /ventas/:id/pagos | JWT | ventas.crear | LegajoAprobado | user.empresaId → VentasService | VERIFIED BY CODE |

## 3. Cross-cutting observations

### Authentication
The API uses a global 'JwtAuthGuard'. The current AS-IS model is authenticated-by-default, with explicit public exceptions. Google OAuth login/callback and invitation activation are intentionally public entry points.

### Permission enforcement
'PermissionsGuard' is global and only evaluates a granular permission when '@RequierePermiso(...)' metadata exists. Endpoints without that decorator remain behind JWT and, on several business controllers, 'LegajoAprobadoGuard'.

### Tenant propagation
For the reviewed business controllers, 'empresaId' is consistently obtained from the authenticated context and passed into services or 'EmpresaScopedPrismaService'.

The principal AS-IS exception is the use of base 'PrismaService' in authentication, invitation and legajo flows. Where the operation is business-administrative, the inspected code applies explicit 'empresaId' filters/checks. This is evidence of a mixed enforcement pattern, not by itself a defect finding.

### Public store
'/tienda/*' is explicitly public. Its tenant context is not supplied by a JWT because there is no authenticated business user in this flow. The public store uses its configured business context in the service layer. This path should remain a separate AS-IS flow when comparing against Wapsell customer-facing channels.

### Wapsell Membership gap
No Wapsell 'Membership' authorization context was found in these controller surfaces. The current implementation is centered on 'Usuario', 'Empresa', 'empresaId', role/permission data, and customer-specific identity paths. This is an AS-IS fact and must not be interpreted as a TO-BE authorization design.

## 4. Findings and limits

### Verified by code

1. Global JWT authentication exists with explicit public exceptions.
2. Granular permissions are implemented through '@RequierePermiso' + global 'PermissionsGuard'.
3. 'LegajoAprobadoGuard' is an additional AS-IS gate on multiple business controllers.
4. Business operations predominantly propagate 'user.empresaId'.
5. 'EmpresaScopedPrismaService' provides application-level tenant scoping for the reviewed direct models.
6. Several base-Prisma administrative/authentication paths perform explicit tenant checks rather than using the scoped client.
7. Public store and invitation activation are intentionally unauthenticated flows.

### Not established by this matrix

1. Runtime proof that every endpoint rejects cross-Business access.
2. Exhaustive proof that every possible service/repository path is tenant-safe.
3. Database-level row-security or equivalent enforcement.
4. Wapsell Membership implementation.
5. The final D-006 authorization sequence/mechanism.
6. Whether the current role/permission model is the final Wapsell role model.
7. Any TO-BE API, schema, migration, endpoint, event, or physical authorization mechanism.

### Specific follow-up candidates

- 'GET /auth/me' uses base Prisma and resolves the user by global 'id'; the inspected code does not add an explicit 'empresaId' predicate. This is not classified here as a defect because the endpoint is keyed by the authenticated global user identity and returns that user's associated Empresa. It should nevertheless remain visible in the D-006 authorization review.
- 'GET/PATCH /legajo/cliente/*' approval endpoints rely on explicit 'user.type' checks rather than granular '@RequierePermiso' metadata. This is current AS-IS behavior and should not be silently converted during evidence collection.
- Public '/tienda/*' endpoints require a separate tenant-context analysis because JWT is intentionally absent.
- 'AutorizacionesController' intentionally has no '@RequierePermiso'; its service-level authorization semantics use credentials in the request body. This is documented AS-IS and is relevant to the still-open D-013/D-006 boundary.

## 5. Evidence conclusion

**TASK-ASIS-001 — CODE EVIDENCE: SUBSTANTIALLY COVERED.**

The endpoint-level authentication, permission, additional-guard and tenant-context surface has now been documented from the current controller implementation.

**Execution verification remains open.** No runtime cross-tenant test was created or executed as part of this evidence task.

This artifact does not authorize implementation changes.
