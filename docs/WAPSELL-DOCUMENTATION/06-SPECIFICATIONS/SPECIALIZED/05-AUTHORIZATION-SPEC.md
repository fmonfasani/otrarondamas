# Wapsell — Authorization Specification

**Version:** 0.2 | **Status:** APPROVED — Owner Ruling OR-B4-024 (2026-11-10) | **Date:** 2026-11-10

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

## 4. Role → Permission matrix — `APPROVED` (OR-B4-024)

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

`ADMIN` and `GESTOR_DE_STOCK` have no AS-IS equivalent; they are new.

### 5.3 Stages (each one a gated, tested PR; none destructive)

1. Canonical catalogue and the approved matrix as data (seeded), without changing behaviour.
2. One engine resolving `Membership.role → matrix`; legacy decorators become adapters that translate to canonical
   permissions (§5.1). Parity tests per endpoint: same allow/deny as today for current users, except the defects in §1.
3. Endpoints declare canonical permissions; unknown policy fails closed (`AUTH-10`).
4. Roles migrate (§5.2) with reversible mapping.
5. Retire `CapabilityGrant` overrides from MVP authorisation and the legacy source of truth — **requires an explicit
   Owner decision** (`OR-B4-001`, legacy cut-over).

---

## 6. Open

| Item | Owner |
|---|---|
| Who holds platform permissions and how support access is audited (§3) | Security spec |
| Physical representation of roles, catalogue and matrix | Technical design (stage 1 PR) |
| Session/token effect of a role change or suspension | Technical design (ties to #162) |

## 7. Change history

| Version | Date | Summary |
|---|---|---|
| 0.1 | 2026-11-10 | First draft: AS-IS inventory and defects, canonical catalogue, platform scope, proposed matrix, legacy mapping, stages. |
| **0.2** | **2026-11-10** | **APPROVED (OR-B4-024):** the Owner accepted the four matrix decisions as proposed. |
