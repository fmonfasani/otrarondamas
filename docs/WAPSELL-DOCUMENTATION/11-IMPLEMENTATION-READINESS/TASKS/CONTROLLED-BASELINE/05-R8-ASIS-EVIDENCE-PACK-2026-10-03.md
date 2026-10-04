# WAPSELL — R8 AS-IS EVIDENCE PACK — 2026-10-03

**Tasks covered:** R8-ID-001, R8-AUTH-003, R8-COM-001, R8-INV-001, R8-ORD-001, R8-PAY-001, R8-MSG-001  
**Class:** ASIS-EVIDENCE  
**Status:** DONE — CODE EVIDENCE PACK  
**Scope:** Record the current repository implementation without converting it into TO-BE compliance.  
**Non-scope:** No code/schema/data/infrastructure modification and no normative decision.

## 1. Evidence method

Evidence was taken from the current `main` repository implementation, primarily Prisma schema and NestJS services/controllers.

Classification:

- **VERIFICADO POR CÓDIGO:** directly evidenced in source.
- **NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE:** not established by inspected source.
- This pack does not claim runtime/test execution.

## 2. R8-ID-001 — Identity/Tenancy AS-IS

### Verified

The physical model is currently centered on `Empresa` and `Usuario`.

- `Usuario` contains `empresaId` and a direct `Empresa` relation.
- `Usuario.email` is globally unique through `@unique`.
- `Usuario` has one physical `empresaId`; the inspected schema does not contain a Membership model.
- `EmpresaScopedPrismaService.forEmpresa(empresaId)` creates a Prisma extension scoped by the explicit Business/Empresa identifier.
- JWT payload contains `empresaId`, `rol`, `permisos`, `estadoLegajo` and `type`.
- Password authentication and Google OAuth are both implemented.
- Google login can associate by existing email or create a new Usuario when `GOOGLE_SIGNUP_EMPRESA_ID` exists.

### AS-IS evidence

Current physical identity is therefore:

`Usuario → Empresa`

not:

`User → Membership → Business`

This is an AS-IS observation, not a declaration of non-compliance by itself.

### Not determined

The inspected source does not establish the future technical Business Switch mechanism, physical migration strategy or final Membership persistence model.

## 3. R8-AUTH-003 — Authorization AS-IS

### Verified

The current implementation combines:

- enum `RolUsuario` with values `OWNER`, `ASISTENTE_LOCAL`, `PROVEEDOR`, `REPARTIDOR`;
- `Permiso` entity;
- `UsuarioPermiso` relation with unique `usuarioId + permisoId`;
- permissions embedded in JWT;
- `RequierePermiso(...)` metadata;
- `PermissionsGuard` referenced by the authorization design;
- `LegajoAprobadoGuard` on sensitive business controllers.

The inspected JWT model is therefore a hybrid of role + explicit user permissions, not the canonical MVP `Membership → Role → Permission` model.

A concrete current example is `@RequierePermiso('caja.gastos')` on cash movements and cash closure.

### Security evidence

The source itself records a known limitation: permissions embedded in an already-issued token do not reflect later revocation until a new login.

The Google authentication service also contains a documented security gap around newly auto-created Google users and cash operations.

### Not determined

The final Wapsell Permission catalogue, Role→Permission matrix and technical enforcement contract are not established by the current AS-IS source.

## 4. R8-COM-001 — Customer/Product/Cart AS-IS

### Verified

Customer:

- `Cliente` is Business-scoped through `empresaId`.
- Customer email is unique within Business via `@@unique([empresaId, email])`.
- Customer can exist independently of User.
- Customer can have optional password/Google fields in the current schema.

Product:

- `Producto` is physically Business-scoped through `empresaId`.
- Product has price, cost, stock minimum, SKU and catalogue hierarchy directly on the Product record.
- Current schema does not contain the canonical `BusinessProduct` relation.

Cart:

- The inspected backend schema excerpt does not provide evidence of a canonical persistent Cart model.
- Do not infer its physical ownership from current requirements documentation.

### AS-IS conclusion

Current Product ownership is Business-local in the physical schema, while the canonical Wapsell direction is global Product + BusinessProduct.

## 5. R8-INV-001 — Inventory AS-IS

### Verified

Inventory is Business-scoped:

- `Lote.empresaId`
- `MovimientoStock.empresaId`
- `Producto.empresaId`

Stock is physically represented primarily by `Lote.cantidad`.

The implementation:

- rejects insufficient stock;
- prevents negative quantity on manual adjustments using an atomic SQL condition;
- creates a `MovimientoStock` in the same transaction as manual adjustment;
- decrements lots inside the caller transaction;
- creates a stock-out movement for each affected lot;
- orders lots by `vencimiento ASC`;
- marks movements taken from expired lots with `loteVencidoAlMomento`.

The code comments describe this as FIFO by expiration ordering, while the current canonical Wapsell rule distinguishes FEFO for products with expiry and FIFO without expiry.

### Important AS-IS observation

The current physical model has no inspected generic `Location` entity. Stock is attached to Product/Lote and Business, not to a canonical Location.

### Not determined

Reservation semantics as a separate persisted stock state were not evidenced in the inspected implementation. The current order confirmation path directly calls `descontarStock`.

## 6. R8-ORD-001 — Order/Sale AS-IS

### Verified

The current schema has distinct `Pedido` and `Venta` models.

Pedido:

- Business-scoped;
- Customer required;
- explicit `EstadoPedido` enum;
- current service implements only `RECIBIDO → CONFIRMADO` and `RECIBIDO → CANCELADO`;
- confirmation directly decrements physical stock;
- confirmation occurs inside a transaction.

Venta:

- Business-scoped;
- Customer optional;
- `EstadoVenta` currently `CONFIRMADA | ANULADA`;
- creation sets `CONFIRMADA`;
- stock is decremented during Sale creation;
- payments are separate records;
- Sale creation is audited.

### Critical AS-IS distinction

The current Order confirmation path does **not** create a separate Sale entity. It confirms the Pedido and decrements stock.

The current Venta creation path independently creates a Sale already in `CONFIRMADA` state and decrements stock.

Therefore the inspected code does not evidence the canonical Wapsell rule:

`Order commercial confirmation → Sale creation`

as a single implemented boundary.

## 7. R8-PAY-001 — Payment/Cash/AR AS-IS

### Verified

Payment exists as a separate model from Sale.

Current payment implementation supports manual:

- efectivo;
- transferencia;
- QR.

Payments are created as `APROBADO`.

The Sale payment path calculates pending balance and rejects payments above the outstanding amount.

Cash:

- has `CERRADA`, `ABIERTA`, `EN_ARQUEO`;
- has opening, movements, counts and closure;
- cash manual movements and closure require `caja.gastos`;
- effective cash payments can create a `MovimientoCaja` when an opening is active.

AR:

- `CuentaCorriente`;
- `Deuda`;
- `AplicacionPago` are present in the Prisma schema.

### Important limitation

The inspected payment service explicitly excludes reembolsos and conciliación from its current increment, and payment over debt/account-current is outside that service's scope.

### Not determined

A final Wapsell Payment lifecycle, reconciliation model, Payment↔Cash economic effect matrix and AR allocation rules are not established by AS-IS alone.

## 8. R8-MSG-001 — Messaging AS-IS

### Repository evidence

The inspected `apps` structure contains:

- `apps/api`
- `apps/pos-admin`
- `apps/tienda-online`

The inspected API source directories include commerce/auth/inventory/cash modules, but no `messaging` or `mensajeria` backend directory was found at `apps/api/src`.

The Pedido service comments contain a future reference to WhatsApp, but this is not evidence of an implemented Wapsell Messaging domain.

### Result

**Messaging backend domain: NO DETERMINABLE AS IMPLEMENTED / no corresponding API module found in inspected source.**

This is deliberately not phrased as “Messaging does not exist anywhere in the repository”; frontend or other historical artifacts require a broader repository search before making that stronger claim.

## 9. Cross-domain AS-IS findings

| Area | AS-IS evidence | Canonical gap to investigate |
|---|---|---|
| Identity | Usuario→Empresa | User→Membership→Business |
| Authorization | Role + UsuarioPermiso + JWT permissions | Membership→Role→Permission |
| Customer | Business-scoped Cliente | Controlled User association mechanics |
| Product | Business-scoped Producto | Global Product + BusinessProduct |
| Cart | No backend canonical model evidenced in inspected excerpt | Physical Cart boundary |
| Inventory | Business/Lote stock, no Location | Location + reservation semantics |
| Order/Sale | Separate models, separate flows | Commercial confirmation→Sale boundary |
| Payment | Separate Pago | Final lifecycle/reconciliation |
| Cash | Caja + permissions | Final sensitive-operation model |
| AR | CuentaCorriente/Deuda/AplicacionPago | Final allocation/economic effects |
| Messaging | No inspected API module | Physical Messaging domain/API |

## 10. Evidence status

| Task | Result |
|---|---|
| R8-ID-001 | DONE — VERIFICADO POR CÓDIGO |
| R8-AUTH-003 | DONE — VERIFICADO POR CÓDIGO |
| R8-COM-001 | DONE — VERIFICADO POR CÓDIGO / PARTIAL |
| R8-INV-001 | DONE — VERIFICADO POR CÓDIGO |
| R8-ORD-001 | DONE — VERIFICADO POR CÓDIGO |
| R8-PAY-001 | DONE — VERIFICADO POR CÓDIGO |
| R8-MSG-001 | DONE — VERIFICADO POR CÓDIGO / ABSENCE LIMITED TO INSPECTED API TREE |

No runtime/test execution is claimed by this pack.
