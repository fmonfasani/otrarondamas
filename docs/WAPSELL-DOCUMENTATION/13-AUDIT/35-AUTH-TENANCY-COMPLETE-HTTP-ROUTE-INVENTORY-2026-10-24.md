# Auth/Tenancy — Complete HTTP Route Inventory (Source Scan)

**Date:** 2026-10-24  
**Base SHA:** `a8b54285d5e1017ad4d6f5a905e3ff3aa4d7eef6` (main after PR #79)  
**Scope:** `apps/api/src/**/*.controller.ts` on the default branch.  
**Method:** recursive Git tree enumerated 24 controller files; each file's HTTP method decorators were scanned. Route counts below count decorator occurrences, not distinct normalized URL patterns. No local checkout, DB inspection, or test execution was performed.

## 1. Result

- **24 controller files scanned**
- **117 HTTP handler decorators enumerated**
- Public-vs-protected baseline comes from the global `JwtAuthGuard`: JWT required unless handler/class has `@Public()`.
- `PermissionsGuard` is global, but routes without `@RequirePermission(...)` metadata pass this guard as authenticated-only. This is an inventory finding, not a claim that every such route is vulnerable: service-level guards and ownership checks still require per-operation review.
- The inventory does not include WebSocket gateway events; those need a separate event/handshake matrix.
- This is a source scan. It does not prove runtime route registration, complete policy correctness, or that the tests exercise every listed route.

## 2. Route inventory by controller

Legend: `[PUBLIC]` explicitly marked `@Public()` in source; otherwise route is JWT-protected by the global default unless another class/handler policy overrides it. Paths below combine `@Controller(...)` and method decorator paths where a controller prefix is declared.

| Controller | HTTP routes |
|---|---|
| `app.controller.ts` (2) | `GET /` [PUBLIC]; `GET /protegido/caja-gastos` |
| `auth/auth.controller.ts` (5) | `POST /auth/login` [PUBLIC]; `GET /auth/me`; `GET /auth/memberships`; `GET /auth/google` [PUBLIC]; `GET /auth/google/callback` [PUBLIC] |
| `auth/auth.customer.controller.ts` (5) | `POST /auth/cliente/registro` [PUBLIC]; `POST /auth/cliente/login` [PUBLIC]; `GET /auth/cliente/me`; `GET /auth/cliente/google` [PUBLIC]; `GET /auth/cliente/google/callback` [PUBLIC] |
| `authorizations/authorizations.controller.ts` (1) | `POST /autorizaciones` |
| `cart/cart.controller.ts` (6) | `POST /cart` [PUBLIC]; `GET /cart/:id` [PUBLIC]; `POST /cart/:id/items` [PUBLIC]; `PATCH /cart/:id/items/:itemId` [PUBLIC]; `DELETE /cart/:id/items/:itemId` [PUBLIC]; `DELETE /cart/:id` [PUBLIC] |
| `cash-register/cash-register.controller.ts` (7) | `GET /caja/estado`; `POST /caja/apertura`; `POST /caja/movimientos`; `GET /caja/movimientos`; `POST /caja/arqueo`; `PATCH /caja/arqueo/:id/autorizar`; `POST /caja/cierre` |
| `catalog/catalog-hierarchy.controller.ts` (1) | `GET /catalogo/jerarquia` |
| `catalog/catalog.controller.ts` (4) | `GET /catalogo/productos`; `GET /catalogo/productos/:id`; `POST /catalogo/productos`; `PATCH /catalogo/productos/:id` |
| `customers/customers.controller.ts` (4) | `GET /clientes`; `GET /clientes/:id`; `POST /clientes`; `PATCH /clientes/:id` |
| `dossier/dossier.controller.ts` (7) | `GET /legajo/mi-legajo`; `PATCH /legajo/mi-legajo`; `POST /legajo/mi-legajo/documentos`; `GET /legajo/mi-legajo/estado`; `GET /legajo/pendientes`; `PATCH /legajo/:usuarioId/aprobar`; `GET /legajo/documentos/:documentoId/descargar` |
| `dossier/dossier.customer.controller.ts` (6) | `GET /legajo/cliente/mi-legajo`; `PATCH /legajo/cliente/mi-legajo`; `POST /legajo/cliente/mi-legajo/documentos`; `GET /legajo/cliente/mi-legajo/estado`; `GET /legajo/cliente/pendientes`; `PATCH /legajo/cliente/:clienteId/aprobar` |
| `health/health.controller.ts` (1) | `GET /health` [PUBLIC] |
| `inventory/inventory.controller.ts` (5) | `GET /inventario/stock`; `GET /inventario/productos/:id/lotes`; `GET /inventario/productos/:id/movimientos`; `POST /inventario/ajustes`; `GET /inventario/alertas` |
| `invitations/invitations.controller.ts` (5) | `POST /invitaciones`; `GET /invitaciones`; `POST /invitaciones/activar` [PUBLIC]; `POST /invitaciones/mayorista`; `POST /invitaciones/mayorista/activar` [PUBLIC] |
| `loyalty/loyalty.controller.ts` (4) | `GET /reglas-fidelizacion`; `GET /reglas-fidelizacion/:id`; `POST /reglas-fidelizacion`; `PATCH /reglas-fidelizacion/:id` |
| `membership/membership.controller.ts` (2) | `PATCH /memberships/:membershipId/suspend`; `PATCH /memberships/:membershipId/reactivate` |
| `messaging/messaging.controller.ts` (20) | `GET /messaging/conversations`; `POST /messaging/conversations`; `GET /messaging/conversations/:id`; `GET /messaging/conversations/:id/associations`; `GET /messaging/conversations/:id/associations/history`; `POST /messaging/conversations/:id/associations`; `POST /messaging/conversations/:id/orders`; `DELETE /messaging/conversations/:id/associations/:associationId`; `POST /messaging/conversations/:id/messages`; `GET /messaging/conversations/:id/messages`; `POST /messaging/conversations/:id/messages/:messageId/read`; `GET /messaging/conversations/:id/messages/:messageId/read-receipts`; `GET /messaging/conversations/read-receipts/preferences`; `PATCH /messaging/conversations/read-receipts/preferences`; `PATCH /messaging/conversations/:id/messages/:messageId`; `DELETE /messaging/conversations/:id/messages/:messageId`; `DELETE /messaging/conversations/:id`; `POST /messaging/conversations/:id/participants`; `DELETE /messaging/conversations/:id/participants/:participantId`; `POST /messaging/conversations/:id/admin/:participantId` |
| `orders/orders.controller.ts` (3) | `GET /pedidos`; `GET /pedidos/:id`; `PATCH /pedidos/:id/estado` |
| `payments/payments.controller.ts` (2) | `POST /ventas/:ventaId/pagos`; `GET /ventas/:ventaId/pagos` |
| `purchases/purchases.controller.ts` (12) | `GET /proveedores`; `POST /proveedores`; `PATCH /proveedores/:id`; `GET /compras`; `GET /compras/:id`; `POST /compras`; `POST /compras/:id/emitir`; `POST /compras/:id/recepciones`; `GET /compras/:id/pagos`; `POST /compras/:id/pagos`; `GET /compras/:id/devoluciones`; `POST /compras/:id/devoluciones` |
| `sales/sales.controller.ts` (6) | `GET /ventas/productos`; `POST /ventas/cotizacion`; `POST /ventas`; `GET /ventas`; `GET /ventas/:id`; `GET /ventas/:id/comprobante` |
| `store/public-store.controller.ts` (4) | `GET /:businessSlug/tienda/productos` [PUBLIC]; `GET /:businessSlug/tienda/jerarquia` [PUBLIC]; `POST /:businessSlug/tienda/pedidos` [PUBLIC]; `GET /:businessSlug/tienda/pedidos/:id` [PUBLIC] |
| `store/store.controller.ts` (4) | `GET /tienda/productos` [PUBLIC]; `GET /tienda/jerarquia` [PUBLIC]; `POST /tienda/pedidos` [PUBLIC]; `GET /tienda/pedidos/:id` [PUBLIC] |
| `users/users.controller.ts` (1) | `GET /usuarios` |

**Total:** 117 handler decorators across 24 controller files.

## 3. Explicit public routes

The source scan found these public groups:

- App root: `GET /`.
- Staff auth: `POST /auth/login`, Google OAuth start/callback.
- Customer auth: registration/login and Google OAuth start/callback.
- Cart endpoints: all six routes are public. Cart IDs therefore act as an access boundary and require ownership/unguessability/tenant-boundary review.
- Invitation activation: `POST /invitaciones/activar` and `POST /invitaciones/mayorista/activar`. Activation tokens must be purpose-bound, expiring, replay-safe, and linked to the tenant in persisted invitation data.
- Health: `GET /health`.
- Storefront endpoints: both `/tienda/*` and `/:businessSlug/tienda/*` public route families. The slug-based family should be preferred only after checking the legacy no-slug family and verifying every read/write is bound to the resolved business.
- No other handler was classified as public based solely on the scan. Class-level decorators and dynamically registered routes still require manual confirmation.

## 4. Direct base Prisma inventory — current source search

GitHub code search for `private readonly prisma: PrismaService` returned 18 matching paths, of which 17 are current `apps/api/src` production files and one is a historical backup. Grouped current source paths:

| Area | Files using the base client |
|---|---|
| Auth and identity | `auth/auth.service.ts`, `auth/auth.controller.ts`, `auth/auth.google.service.ts`, `auth/auth.customer.service.ts`, `auth/auth.customer.controller.ts` |
| Membership/context | `membership/membership.service.ts`, `membership/membership-revocation.service.ts`, `business-context/business-context.service.ts` |
| Invitation | `invitations/invitations.service.ts`, `invitations/invitations.controller.ts` |
| Dossier | `dossier/dossier.service.ts`, `dossier/dossier.controller.ts`, `dossier/dossier.customer.controller.ts` |
| Other | `cart/cart.service.ts`, `health/health.controller.ts`, `messaging/messaging.service.ts` |
| Infrastructure wrapper | `prisma/company-scoped-prisma.service.ts` wraps the base client to produce scoped access; it is not itself a business endpoint |

The source search for `PrismaService` also returned `users.controller.ts`, `catalog.controller.ts`, `orders.service.ts`, `authorizations.service.ts`, `customers.service.ts`, `store.service.ts`, `loyalty.service.ts`, `inventory.service.ts`, `purchases.service.ts`, and `sales.service.ts`; these require individual inspection to distinguish import/type references from actual direct-client use. This document does not classify them as unscoped business access without that inspection.

### Required boundaries by use

- **Expected base-client uses:** health connectivity probe, identity pre-context lookup, persisted Membership/BusinessContext resolution, and operations whose purpose requires crossing the scoped-client boundary.
- **High-risk candidates for operation-level tracing:** invitation activation and batch writes; dossier document upload/download/approval; cart lookups by client-supplied ID; messaging operations over conversation/message/participant IDs; Membership suspend/reactivate; BusinessContext fallback/adapters.
- **Raw SQL:** existing audit `13-AUDIT/28-TRANSACTIONAL-AND-RAW-SQL-SURFACE-INVENTORY-2026-10-04.md` identifies the production `$executeRaw` in `inventory/inventory.service.ts` as explicitly parameterized with an `empresaId` predicate, and a health `$queryRaw` for `SELECT 1`. Because that inventory predates this scan, treat its counts as historical until re-run against current source.

## 5. Authorization findings and gaps

1. Global guards are registered in order: `JwtAuthGuard`, `PermissionsGuard`, `StaffIdentityGuard`.
2. The default is authenticated unless `@Public()` is present. Public endpoints are not automatically safe: every object-ID lookup and mutation still needs an explicit ownership/tenant proof.
3. A handler without `@RequirePermission(...)` passes the permission guard as authenticated-only. Review such routes against the target fail-closed policy, particularly purchases reads, messaging, customer lists, dossier paths, and membership transitions.
4. `BusinessContextService` resolves current context and Membership state for some operations, but the existence of the service does not prove every controller/service path calls it.
5. Membership suspension/reactivation are sensitive privilege transitions and must have verified Owner authorization, tenant binding, self-revocation protection, and auditable outcomes.
6. The `/auth/google/callback` access-token-in-query finding remains a separate session transport remediation; do not change the client contract implicitly inside this inventory.
7. No schema, migration, runtime, or data changes were made. No tests were executed as part of this source scan.

## 6. Closure criteria for the next implementation stage

- [ ] Inspect class-level decorators and local guards for all 117 routes; generate a verified per-route classification of public/authenticated/permission/ownership/BusinessContext.
- [ ] Trace every direct Prisma use listed above to model operations and tenant/ownership predicates.
- [ ] Reconcile all source search hits for `PrismaService` and `$queryRaw`/`$executeRaw` with current files, excluding test fixtures, backups, and migration tooling explicitly.
- [ ] Add missing negative tests for public cart ID guessing, cross-business slug/order tracking, messaging conversation/message IDs, Membership revocation, and every protected route lacking explicit permission metadata where the target contract requires permission.
- [ ] Only then propose narrowly scoped runtime changes. Keep schema/migrations and data backfill gated behind identity collision audit and an approved legacy-to-target migration plan.
