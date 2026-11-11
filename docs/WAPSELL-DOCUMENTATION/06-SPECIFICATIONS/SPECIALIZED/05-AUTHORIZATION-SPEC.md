# Wapsell — Authorization Specification

**Version:** 0.3 | **Status:** APPROVED — Owner Rulings OR-B4-024, OR-B4-025 (2026-11-10) | **Date:** 2026-11-10

> Specialized spec required by the General SPEC v0.5 §6.1 (`OR-B4-007`). It defines the canonical Permission
> catalogue, the Role → Permission matrix and the transition from the two AS-IS mechanisms. Backlog: #161.

---

## 0. Authority

| Source | What it fixes here |
|---|---|
| General SPEC v0.5 §6, §7 | `Membership → Role → Permission`; four controls; MVP roles. |
| `AUTH-01` | Canonical roles `OWNER`, `ADMIN`, `VENDEDOR`, `GESTOR_DE_STOCK`. |
| `AUTH-02` | `Membership` is the only authority of the effective role. |
| `AUTH-03` / `R8-AUTH-001` | One canonical Permission catalogue; the approved permission domains (§2). |
| `AUTH-04` | Fixed `Role → Permission` matrix; no per-Membership grants or denials in the MVP. |
| `AUTH-08` / `AUTH-10` | One engine; `@Authorize` and `@RequirePermission` are transitional adapters; unknown policy fails closed. |
| `AUTH-11` / `AUTH-12` | Reviewed mapping from `UsuarioPermiso`; incremental, reversible, tested migration. |
| `OR-B4-006` | Transitional `ASISTENTE_LOCAL → VENDEDOR`; `PROVEEDOR` and `REPARTIDOR` are not Membership Roles. |
| `OR-B4-020` | Platform admin permissions are defined here, outside Membership Roles. |
| `OR-B4-001` | Incremental implementation authorised through gated, tested PRs. |

**Already decided (not open here):** the domains, the roles, the fixed-matrix strategy, fail-closed and the single
engine. **Approved by the Owner on 2026-11-10 (`OR-B4-024`):** the catalogue (§2), the platform scope (§3), the
matrix (§4) and the transition (§5).

---

## 1. AS-IS (evidence: `VERIFICADO POR CÓDIGO`, `main` 2026-11-10)

Two mechanisms coexist:

| Mechanism | Decorator | Source of truth | Used by |
|---|---|---|---|
| Legacy | `@RequirePermission('<domain>.<action>')` + global `PermissionsGuard` | `UsuarioPermiso → Permiso.nombre` | sales, payments, orders, cash, purchases, customers, catalog, loyalty, users, metrics, returns |
| P1-2 | `@Authorize('<domain>.<action>')` + `AuthorizationGuard` | `Membership → RoleGrant → RoleTemplate → RoleCapability`, plus per-Membership `CapabilityGrant` | users, roles, dashboard, audit, sales |

Defects found while inventorying (they are not decisions):

1. **Permissions required but never seeded.** `seed.ts` creates 11 legacy permissions (`caja.gastos`, `clientes.gestionar`,
   `compras.gestionar`, `fidelizacion.gestionar`, `inventario.ajustes`, `pedidos.gestionar`, `precios.cambiar`,
   `productos.gestionar`, `usuarios.gestionar`, `ventas.anular`, `ventas.crear`). Endpoints also require
   `ventas.ver` (sales), `ventas.editar` / `ventas.reembolsar` / `ventas.eliminar` (payments), `metrics.read` (metrics),
   `payments.process_refunds` / `orders.process_returns` / `orders.authorize_returns` / `customers.request_return`
   (returns). No seed creates them, so — unless created by hand — nobody can call those endpoints.
2. **Two vocabularies for the same thing** (`ventas.crear` and `sales.create`; `usuarios.gestionar` and `users.manage`),
   and Spanish/English mixed in one catalogue.
3. **Per-Membership `CapabilityGrant` overrides** exist in the P1-2 model; `AUTH-04` excludes them from the MVP.

---

## 2. Canonical Permission catalogue

Naming: `DOMAIN_ACTION`, upper snake case, English, matching the identifiers already used by the General SPEC
(`ORDER_CONFIRM`, `CASH_OPEN`…). Domains are the ones approved by `R8-AUTH-001`. ★ = high-sensitivity per `R8-AUTH-001` §5.

| Domain | Permission | Covers |
|---|---|---|
| users | `USERS_VIEW` | See the Business team |
| users | `USERS_MANAGE` ★ | Invite, change role, suspend or deactivate a Membership |
| customers | `CUSTOMERS_VIEW` | See customers |
| customers | `CUSTOMERS_MANAGE` | Create and edit customers |
| catalog | `CATALOG_VIEW` | See products and hierarchy |
| catalog | `CATALOG_MANAGE` | Create and edit products and hierarchy |
| pricing | `PRICING_CHANGE` ★ | Change prices, discounts and loyalty rules |
| orders | `ORDERS_VIEW` | See orders |
| orders | `ORDERS_MANAGE` | Create orders, move fulfillment states |
| orders | `ORDER_CONFIRM` ★ | Commercially confirm an order (generates the Sale) |
| orders | `ORDER_CANCEL` ★ | Cancel an order |
| sales | `SALES_VIEW` | See sales |
| sales | `SALES_CREATE` | Register a counter sale |
| sales | `SALES_CANCEL` ★ | Cancel or revert a sale |
| sales | `REFUNDS_MANAGE` ★ | Authorise, process and refund returns |
| sales | `RETURNS_VIEW` | See returns (`OR-B4-025`) |
| inventory | `INVENTORY_VIEW` | See stock and lots |
| inventory | `INVENTORY_MOVE` | Receive stock and register stock-outs |
| inventory | `INVENTORY_ADJUST` ★ | Manual stock adjustments |
| cash | `CASH_VIEW` | See cash registers and movements |
| cash | `CASH_OPEN` | Open a cash register |
| cash | `CASH_CLOSE` | Count and close a cash register |
| cash | `CASH_EXPENSE` | Register an expense |
| cash | `CASH_ADJUST` ★ | Adjust a cash difference |
| cash | `CASH_WITHDRAW` ★ | Withdraw cash |
| payments | `PAYMENTS_VIEW` | See payments |
| payments | `PAYMENTS_REGISTER` | Register a payment |
| payments | `PAYMENTS_REFUND` ★ | Refund a payment |
| receivables | `RECEIVABLES_VIEW` | See customer accounts |
| receivables | `RECEIVABLES_MANAGE` | Apply payments and manage customer accounts |
| purchases | `PURCHASES_VIEW` | See purchases and suppliers (`OR-B4-025`) |
| purchases | `PURCHASES_MANAGE` | Purchases and suppliers (code kept outside MVP scope, `OR-B4-017`) |
| messaging | `MESSAGING_USE` | Participate in Business conversations |
| messaging | `MESSAGING_MANAGE` | Manage participants and associations |
| brand | `BRAND_MANAGE` ★ | Configure the Business Brand |
| reports | `REPORTS_VIEW` | Dashboards and metrics |
| reports | `AUDIT_VIEW_OWN` | See own audit trail |
| reports | `AUDIT_VIEW_ALL` ★ | See the whole Business audit trail |

Messaging participation rules (Owner read-only, participants write) stay as defined by the Messaging spec; the
permissions above only gate access to the domain.

---

## 3. Platform scope (outside Membership Roles)

`OR-B4-020`: platform administration is for internal Owner use and is not a Membership Role. Its permissions live in
a separate scope that no Business Membership can hold:

| Permission | Covers |
|---|---|
| `PLATFORM_BUSINESSES_VIEW` | See all Businesses (platform overview) |
| `PLATFORM_BUSINESSES_MANAGE` | Create, suspend or configure a Business |
| `PLATFORM_SUPPORT_ACCESS` | Time-boxed, audited support access to a Business |

Who holds them and how they are granted: `OPEN` (Security spec); until then only the platform Owner.

---

## 4. Role → Permission matrix — `APPROVED` (OR-B4-024, OR-B4-025)

`●` granted, `—` not granted. Principles: Owner has everything in the Business; Admin is delegated administration;
Vendedor runs the counter and conversations; Gestor de Stock runs the warehouse.

| Permission | OWNER | ADMIN | VENDEDOR | GESTOR_DE_STOCK |
|---|:-:|:-:|:-:|:-:|
| `USERS_VIEW` | ● | ● | — | — |
| `USERS_MANAGE` | ● | ● ¹ | — | — |
| `CUSTOMERS_VIEW` | ● | ● | ● | — |
| `CUSTOMERS_MANAGE` | ● | ● | ● | — |
| `CATALOG_VIEW` | ● | ● | ● | ● |
| `CATALOG_MANAGE` | ● | ● | — | ● |
| `PRICING_CHANGE` | ● | ● | — | — |
| `ORDERS_VIEW` | ● | ● | ● | ● |
| `ORDERS_MANAGE` | ● | ● | ● | ● ² |
| `ORDER_CONFIRM` | ● | ● | ● | — |
| `ORDER_CANCEL` | ● | ● | — | — |
| `SALES_VIEW` | ● | ● | ● | — |
| `SALES_CREATE` | ● | ● | ● | — |
| `SALES_CANCEL` | ● | ● | — | — |
| `REFUNDS_MANAGE` | ● | ● | — | — |
| `RETURNS_VIEW` | ● | ● | ● | ● |
| `INVENTORY_VIEW` | ● | ● | ● | ● |
| `INVENTORY_MOVE` | ● | ● | — | ● |
| `INVENTORY_ADJUST` | ● | ● | — | ● |
| `CASH_VIEW` | ● | ● | ● | — |
| `CASH_OPEN` | ● | ● | ● | — |
| `CASH_CLOSE` | ● | ● | ● | — |
| `CASH_EXPENSE` | ● | ● | ● | — |
| `CASH_ADJUST` | ● | ● | — | — |
| `CASH_WITHDRAW` | ● | ● | — | — |
| `PAYMENTS_VIEW` | ● | ● | ● | — |
| `PAYMENTS_REGISTER` | ● | ● | ● | — |
| `PAYMENTS_REFUND` | ● | ● | — | — |
| `RECEIVABLES_VIEW` | ● | ● | ● | — |
| `RECEIVABLES_MANAGE` | ● | ● | — | — |
| `PURCHASES_VIEW` | ● | ● | — | ● |
| `PURCHASES_MANAGE` | ● | ● | — | ● |
| `MESSAGING_USE` | ● | ● | ● | ● |
| `MESSAGING_MANAGE` | ● | ● | — | — |
| `BRAND_MANAGE` | ● | — | — | — |
| `REPORTS_VIEW` | ● | ● | — | — |
| `AUDIT_VIEW_OWN` | ● | ● | ● | ● |
| `AUDIT_VIEW_ALL` | ● | ● | — | — |

¹ An Admin cannot change, suspend or deactivate an Owner Membership, nor grant `OWNER` (Owner ≠ Admin, `OR-B2-009`).
² Fulfillment states only (preparation, ready, stock exit); not commercial confirmation or cancellation.

Owner decisions on this matrix (`OR-B4-024`, 2026-11-10; the rest follows the principles above):

1. **Can a Vendedor confirm orders (`ORDER_CONFIRM`)?** **Yes** — in conversational commerce the person in the
   conversation closes the sale. Cancelling stays with Owner/Admin.
2. **Can a Vendedor register expenses (`CASH_EXPENSE`)?** **Yes**, small counter expenses; adjust and withdraw
   stay with Owner/Admin.
3. **Does a Gestor de Stock manage the catalogue (`CATALOG_MANAGE`)?** **Yes, without prices** (`PRICING_CHANGE`
   stays with Owner/Admin).
4. **Does an Admin configure the Brand (`BRAND_MANAGE`)?** **No, Owner only.**

---

## 5. Transition (AUTH-11 / AUTH-12, OR-B4-006)

### 5.1 Legacy permission → canonical

| Legacy (`Permiso.nombre` or `@Authorize` code) | Canonical |
|---|---|
| `usuarios.gestionar`, `users.manage`, `roles.manage` | `USERS_MANAGE` |
| `clientes.gestionar`, `customers.manage` | `CUSTOMERS_MANAGE` |
| `productos.gestionar`, `catalog.manage_products` | `CATALOG_MANAGE` |
| `precios.cambiar`, `catalog.change_prices`, `fidelizacion.gestionar`, `loyalty.manage_rules` | `PRICING_CHANGE` |
| `pedidos.gestionar`, `orders.manage` | `ORDERS_MANAGE` + `ORDER_CONFIRM` + `ORDER_CANCEL` (split per endpoint) |
| `ventas.crear`, `sales.create` | `SALES_CREATE` |
| `ventas.ver`, `sales.view` | `SALES_VIEW` |
| `ventas.anular`, `ventas.eliminar`, `sales.cancel` | `SALES_CANCEL` |
| `ventas.editar` (payment confirmation) | `PAYMENTS_REGISTER` |
| `ventas.reembolsar`, `payments.process_refunds`, `orders.process_returns`, `orders.authorize_returns` | `REFUNDS_MANAGE` / `PAYMENTS_REFUND` (split per endpoint) |
| `customers.request_return` | customer-facing route; classified as customer policy, not a staff permission |
| `inventario.ajustes`, `inventory.adjust_stock` | `INVENTORY_ADJUST` |
| `caja.gastos`, `cash.register_movement` | `CASH_EXPENSE` |
| `compras.gestionar`, `purchases.manage` | `PURCHASES_MANAGE` |
| `payments.manage` | `PAYMENTS_REGISTER` |
| `metrics.read`, `dashboard.view` | `REPORTS_VIEW` |
| `audit.leer`, `audit.view` | `AUDIT_VIEW_OWN` |
| `audit.leer_otros` | `AUDIT_VIEW_ALL` |

### 5.2 Legacy role → canonical role

| AS-IS `RolUsuario` | Canonical Membership Role |
|---|---|
| `OWNER` | `OWNER` |
| `ASISTENTE_LOCAL` | `VENDEDOR` (transitional mapping, with deadline) |
| `PROVEEDOR` | none — becomes a Supplier entity, not a Membership |
| `REPARTIDOR` | none — `FUTURE / OPEN` (Fulfillment) |

`ADMIN` and `GESTOR_DE_STOCK` have no AS-IS equivalent; they are new. Since OR-B4-027 the four canonical roles exist in `RolUsuario`; `ASISTENTE_LOCAL` remains a
VENDEDOR alias until 2026-12-31.

### 5.3 Stages (each one a gated, tested PR; none destructive)

1. Canonical catalogue and the approved matrix as data (seeded), without changing behaviour.
2. One engine resolving `Membership.role → matrix`; legacy decorators become adapters that translate to canonical
   permissions (§5.1). Parity tests per endpoint: same allow/deny as today for current users, except the defects in §1.
3. Endpoints declare canonical permissions; unknown policy fails closed (`AUTH-10`).
4. Roles migrate (§5.2) with reversible mapping.
5. Retire `CapabilityGrant` overrides from MVP authorisation and the legacy source of truth — **requires an explicit
   Owner decision** (`OR-B4-001`, legacy cut-over).

### 5.4 Implementation status

| Stage | Status | Evidence |
|---|---|---|
| 1 | Done — catalogue, matrix and legacy mapping as typed data (no schema change, no seed) | `apps/api/src/authorization/canonical-permissions.ts`, PR #174 |
| 2 | Shadow mode — `authorization-engine.ts` evaluates every `@RequirePermission` / `@Authorize` request and logs `authz.shadow.divergence` when it disagrees with the legacy decision; **the legacy guards still decide** | `authorization-engine.spec.ts`, `permissions.guard.spec.ts` |
| 3 | Shadow mode, **every routed endpoint** — the 65 endpoints with `@RequirePermission` / `@Authorize` (#176) and the other 84 non-public routes declare `@CanonicalPermission` (all listed permissions required). The engine evaluates authenticated-only endpoints too (role from the JWT, no extra query) and an endpoint with no declaration is `DENY / UNDECLARED` (`AUTH-10`) | `endpoint-policy-coverage.spec.ts` walks `AppModule` and fails on any non-`@Public` route without a policy; `canonical-permission.decorator.spec.ts`, `permissions.guard.spec.ts` |
| Cut-over | **Done (2026-11-11, OR-B4-026)**: the engine decides by default (`enforce`); `AUTHZ_ENGINE_MODE=shadow` restores the legacy guards. Plan and evidence: `05a-AUTHORIZATION-CUTOVER-PLAN.md` | B4 runs `api-verification` (shadow) and `api-verification (enforce)` |
| 4 | **Done (OR-B4-027, #160)**: `RolUsuario` gains `ADMIN`, `VENDEDOR`, `GESTOR_DE_STOCK` (additive); `ASISTENTE_LOCAL` is an alias of `VENDEDOR` until 2026-12-31 with a reversible conversion (`role-conversion.ts`, `prisma/convert-asistente-local.ts`); staff invitations offer the three staff roles; Owner-only service checks follow the matrix (`MESSAGING_MANAGE`, `USERS_MANAGE`; wholesale dossier approval Owner + Admin by role) | `canonical-permissions.spec.ts`, `role-conversion.integration-spec.ts`, `create-invitation.dto.spec.ts`, `p0-invitations-activation.integration-spec.ts` |
| 5 | Pending — retiring the legacy tables needs a separate Owner decision | — |

**Stage 3 declarations that differ from the coarse §5.1 translation** (shadow only; they become effective only when
the engine is made authoritative):

| Endpoint | Declared | Effect against the matrix |
|---|---|---|
| `GET /pedidos`, `GET /pedidos/:id` | `ORDERS_VIEW` | — |
| `PATCH /pedidos/:id/estado` | `ORDER_CONFIRM` (→ CONFIRMADO), `ORDER_CANCEL` (→ CANCELADO) | Gestor de Stock cannot confirm; Vendedor cannot cancel (#168) |
| `POST /pedidos/:id/cancel` | `ORDER_CANCEL` | Vendedor and Gestor de Stock denied |
| `POST /caja/movimientos` | `CASH_WITHDRAW` when `tipo = Retiro`, else `CASH_EXPENSE` | Vendedor cannot withdraw |
| `POST /caja/cierre` | `CASH_CLOSE` | same roles as `CASH_EXPENSE` |
| `PATCH /catalogo/productos/:id` | `CATALOG_MANAGE` + `PRICING_CHANGE` when a price field is sent | Gestor de Stock edits products but not prices |
| `GET /admin/audit/logs`, `/logs/export` (`audit.view`) | `AUDIT_VIEW_ALL` | lists every user's logs: Vendedor and Gestor denied |
| `POST /pagos/intents`, `POST /ventas/:id/pagos` (`ventas.crear`) | `PAYMENTS_REGISTER` | same roles as `SALES_CREATE` |
| `PUT /devoluciones/:id/process-refund` | `PAYMENTS_REFUND` | — |
| `POST /catalogo/productos` | `CATALOG_MANAGE` + `PRICING_CHANGE` (`OR-B4-025`) | Gestor de Stock cannot create products |
| `POST /pagos/:id/cancel` (pending payment) | `PAYMENTS_REGISTER` (`OR-B4-025`) | Vendedor allowed |

**Questions raised by stage 3 — resolved by `OR-B4-025`** (2026-11-10):

1. Creating a product requires `PRICING_CHANGE` as well as `CATALOG_MANAGE`: the first price is a price change, so the
   Gestor de Stock does not create products.
2. Cancelling a pending payment (`POST /pagos/:id/cancel`) is `PAYMENTS_REGISTER`, not `SALES_CANCEL`.
3. Manual cash `Ingreso` / `Egreso` movements are `CASH_EXPENSE` (accepted as declared).

**Policies that are not Business permissions** (technical classification, needed so that every endpoint has a policy):
`AUTHENTICATED` (self-service on the caller's own data), `CUSTOMER_POLICY`, `PROVIDER_WEBHOOK` (authenticated by the
provider's signature) and `PLATFORM_*` (§3, enforced by the platform guard).

**Declarations for endpoints that had no legacy permission** (today any authenticated staff user can call them):

| Endpoints | Declared | Effect against the matrix |
|---|---|---|
| `/auth/me`, `/auth/memberships`, `/auth/switch-empresa`, `/auth/validate`, `/tenants/my-empresas`, `/legajo/mi-legajo*`, `/emails/preferences`, `/i18n/*` | `AUTHENTICATED` | — |
| `POST /autorizaciones`, `PATCH /caja/arqueo/:id/autorizar` (D-06: the authorizer's credentials are in the body) | `AUTHENTICATED` | — |
| `GET /caja/estado`, `GET /caja/movimientos` · `POST /caja/apertura` · `POST /caja/arqueo` | `CASH_VIEW` · `CASH_OPEN` · `CASH_CLOSE` | Gestor de Stock denied |
| catalogue reads, `GET /ventas/productos` | `CATALOG_VIEW` | — |
| `GET /clientes*` | `CUSTOMERS_VIEW` | Gestor de Stock denied |
| `GET /devoluciones*` | `RETURNS_VIEW` (`OR-B4-025`) | — |
| `GET /legajo/cliente/pendientes`, `PATCH /legajo/cliente/:id/aprobar` (service: Owner only) | `CUSTOMERS_MANAGE` | — |
| `/legajo/cliente/mi-legajo*`, `GET /auth/cliente/me` | `CUSTOMER_POLICY` | — |
| `/emails/templates*`, `/emails/logs`, `POST /emails/send-test` | `MESSAGING_MANAGE` | Vendedor and Gestor denied |
| `GET /inventario/*` | `INVENTORY_VIEW` | — |
| `PATCH /memberships/:id/suspend` and `/reactivate` (service: Owner only) | `USERS_MANAGE` | — |
| `/messaging/conversations*` | `MESSAGING_USE`; `POST …/:id/orders` adds `ORDERS_MANAGE` | — |
| `GET /pagos*`, `GET /ventas/:id/pagos` · `GET /pagos/analytics/*` | `PAYMENTS_VIEW` · `REPORTS_VIEW` | Gestor denied · Vendedor and Gestor denied |
| `POST /pagos/webhooks/*` | `PROVIDER_WEBHOOK` | — (these routes are not `@Public`; known open item) |
| `GET /proveedores`, `GET /compras*` | `PURCHASES_VIEW` (`OR-B4-025`) | Vendedor denied |
| `GET /usuarios` | `USERS_VIEW` | Vendedor and Gestor denied |
| `GET /platform-admin/overview` | `PLATFORM_BUSINESSES_VIEW` | not a Membership permission |

4. `RETURNS_VIEW` and `PURCHASES_VIEW` are added to the catalogue (38 permissions); see §4 (`OR-B4-025`).
5. `POST /caja/arqueo` (cash count) is `CASH_CLOSE`, part of the closing procedure (accepted as declared).

The legacy source of truth is per-user (`UsuarioPermiso`), the matrix is per role, so for current users the two
decisions differ (for example, an Owner without a `UsuarioPermiso` row is denied today and allowed by the matrix).
Making the engine authoritative therefore changes allow/deny for real users: it is a legacy permission cut-over and
**requires an explicit Owner decision** (`OR-B4-001`, `OR-B4-010`). The divergence log is the parity evidence for that
decision. **`OR-B4-025`:** the Owner authorised the cut-over *subject to a prior plan* — a report of the production
divergences and an activation with immediate rollback — which the Owner approves before activation.

---

## 6. Open

| Item | Owner |
|---|---|
| Who holds platform permissions and how support access is audited (§3) | Security spec |
| Physical representation of roles, catalogue and matrix | Resolved in stage 1: typed constants in code, pinned by tests (#174) |
| Making the canonical engine authoritative (end of shadow mode) | Done: plan approved by `OR-B4-026`, activated 2026-11-11 |
| Dedicated permission for approving wholesale dossiers (today Owner + Admin by role; `CUSTOMERS_MANAGE` also includes the Vendedor) | **Owner** |
| Removing `ASISTENTE_LOCAL` from `RolUsuario` after 2026-12-31 | **Owner** (`OR-B4-001`) |
| Session/token effect of a role change or suspension | Technical design (ties to #162) |

## 7. Change history

| Version | Date | Summary |
|---|---|---|
| 0.1 | 2026-11-10 | First draft: AS-IS inventory and defects, canonical catalogue, platform scope, proposed matrix, legacy mapping, stages. |
| 0.2 | 2026-11-10 | APPROVED (OR-B4-024): the Owner accepted the four matrix decisions as proposed. |
| **0.3** | **2026-11-10** | **OR-B4-025:** `RETURNS_VIEW` and `PURCHASES_VIEW` added (38 permissions); product creation needs `PRICING_CHANGE`; pending-payment cancel is `PAYMENTS_REGISTER`; cash `Ingreso`/`Egreso` and `arqueo` accepted as declared; cut-over authorised subject to a prior plan. Stage status in §5.4. |
