# Migration Readiness — Identity & Tenancy
## Fecha: 2026-09-28

**Estado:** ANALYSIS / PROPOSAL — NOT APPROVED  
**Scope:** Prisma migrations currently present on `main`, identity/tenancy transformation only.  
**No schema, runtime, data or migration was modified.**

## 1. Evidence inspected

Repository: `fmonfasani/otrarondamas`  
Reference: `main`  
Migration directory: `apps/api/prisma/migrations/`

The migration history contains **17 numbered migrations** plus `migration_lock.toml`.

The numbered migrations are:

1. `20260919224959_init`
2. `20260920220000_arqueo_usuario_entrante`
3. `20260921185437_usuario_google_oauth`
4. `20260921215053_producto_stock_minimo`
5. `20260921230941_inventario_fase5_lote_vencido_al_momento`
6. `20260922002130_tienda_online_fase1_pedido_item_y_usuario_opcional`
7. `20260922080442_tienda_online_fase6_descuento_producto`
8. `20260922085033_fidelizacion_fase4_regla_fidelizacion`
9. `20260922090000_catalogo_jerarquia_familia_subfamilia_tipo_subtipo`
10. `20260922090002_catalogo_jerarquia_fk_not_null_y_drop_categoria`
11. `20260922100000_fidelizacion_fase5_descuento_ventaitem`
12. `20260922110000_fidelizacion_fase5_descuento_pedidoitem`
13. `20260923000000_rf17_login_roles_legajo`
14. `20260923202939_rf12_pagos_devoluciones_proveedor`
15. `20260924000000_inc1_venta_estado_idempotency_pago_campos`
16. `20260924010000_inc2_decimal_precision_venta`
17. `20260924020000_inc3_venta_numero_correlativo`

## 2. Baseline physical identity model

The initial migration establishes the current physical identity chain:

`Usuario.empresaId -> Empresa.id`

with:

- `Usuario.email` globally UNIQUE.
- `UsuarioPermiso(usuarioId, permisoId)` UNIQUE.
- `UsuarioPermiso` references `Usuario` and `Permiso`.
- Business resources carry their own `empresaId` and reference `Empresa`.
- `Cliente` is business-scoped through `Cliente.empresaId`.
- `Proveedor` is business-scoped through `Proveedor.empresaId`.
- Operational actor references such as `Venta.usuarioId`, `Compra.usuarioId`, `Entrega.preparadorId`, `Entrega.repartidorId`, cash-operation user references, and audit references point directly to `Usuario`.

This confirms that the identity transformation cannot be reduced to renaming `Empresa` to `Business` or `empresaId` to `businessId`. The current foreign-key topology encodes the one-user/one-business relationship.

## 3. Migration observations relevant to Identity & Tenancy

### 3.1 Initial migration is the principal dependency surface

`20260919224959_init` creates the core identity and commercial graph.

Identity-critical objects:

- `Empresa`
- `Usuario`
- `Permiso`
- `UsuarioPermiso`
- `Cliente`
- `Proveedor`

Operational references to `Usuario` are distributed across sales, orders, cash, purchases, inventory, fulfillment, notifications, authorization and audit.

Therefore the migration must preserve **User identity IDs** wherever historical actor attribution matters.

### 3.2 Global email uniqueness is an explicit current invariant

The initial migration creates:

`Usuario_email_key` on `Usuario(email)`.

The target model requires a global User identity, so this constraint is directionally compatible with the target.

However, it creates an important migration prerequisite:

- duplicate emails cannot be represented as separate User records during backfill;
- if the source database contains duplicate logical identities under different businesses, they require reconciliation before creating a single global User;
- the migration must not silently merge records solely because emails match unless the business identity rule authorizes that merge.

This is a **data-reconciliation gate**, not a schema-only operation.

### 3.3 Customer email uniqueness is already business-scoped

The initial migration creates:

`Cliente_empresaId_email_key` on `(empresaId, email)`.

This is compatible with the target concept that Customer is a business-scoped commercial identity.

It must **not** be replaced by a global email uniqueness constraint on Customer merely because User is global.

The target distinction remains:

- User = global identity.
- Customer = business-scoped commercial entity.
- Customer may optionally reference User.

### 3.4 Supplier uniqueness is business-scoped

`Proveedor_empresaId_nombre_key` is scoped by Business.

The transformation therefore has no evidence-based reason to make Supplier globally unique.

Supplier remains a commercial entity owned by a Business. A Supplier record must not automatically become a User or Membership.

### 3.5 Permission model is currently global and user-direct

Current schema:

`Usuario -> UsuarioPermiso -> Permiso`

with globally unique permission names.

The target direction documented elsewhere is:

`Membership -> Role -> RolePermission -> Permission`

The migration must therefore introduce the new authorization graph **before removing the old graph**.

The old graph should remain available during coexistence until authorization parity is demonstrated.

### 3.6 Role enum is introduced late and is not structurally tenant-scoped

Migration `20260923000000_rf17_login_roles_legajo` introduces:

- `RolUsuario`
- `EstadoLegajo`
- `TipoDocumentoLegajo`

and adds `Usuario.rol`.

The role is therefore currently a property of User, not Membership.

This is one of the strongest physical reasons that the role migration cannot be implemented as a simple field rename.

The target requires role to be contextual to the User↔Business Membership.

### 3.7 Legajo is physically attached to User or Customer

The same migration creates:

- `Legajo.usuarioId` UNIQUE nullable
- `Legajo.clienteId` UNIQUE nullable
- `DocumentoLegajo.legajoId`

with foreign keys to User/Customer.

The database does not enforce the documented XOR between `usuarioId` and `clienteId`; that rule is service-level.

This confirms the previously identified blocker: Legajo cannot safely be moved into Membership without first defining the operational-profile ownership model.

### 3.8 Invitation is Business-scoped and User-linked

`Invitacion` contains:

- `empresaId`
- `rol`
- `invitadoPorId`
- unique `token`

with FKs to Business and User.

The target invitation model should therefore preserve:

- Business context,
- inviter attribution,
- invitation token identity,

while changing the role target from a User-global role to a Membership-scoped role.

The current migration provides no basis for automatically determining the final target role for every legacy invitation beyond its existing enum value.

## 4. Operational FK topology that must survive the identity migration

The migration must preserve actor attribution in at least these areas:

| Domain | Current actor reference | Migration implication |
|---|---|---|
| Sales | `Venta.usuarioId` | Preserve historical User identity |
| Orders | `Pedido.usuarioId` | Preserve actor, nullable only where already nullable |
| Cash | Apertura/Movimiento/Arqueo/Cierre → User | Preserve historical operator |
| Purchases | `Compra.usuarioId`, RecepcionCompra.usuarioId | Preserve operator |
| Inventory | `MovimientoStock.usuarioId` | Preserve attribution |
| Fulfillment | preparador/repartidor → User | Preserve actor; role becomes contextual |
| Payments | `Pago.usuarioId` | Preserve actor |
| Supplier payments/returns | `usuarioId` | Preserve actor |
| Audit | `AuditLog.usuarioId` | Preserve historical attribution |
| Authorization | `Autorizacion.autorizadorId` | Preserve authorization actor |
| Invitations | `Invitacion.invitadoPorId` | Preserve inviter identity |

This topology means that deleting/recreating Users is not an acceptable migration technique.

## 5. Important migration-history hazards

### H-01 — Destructive historical precedent

Migration `20260922090002_catalogo_jerarquia_fk_not_null_y_drop_categoria` explicitly drops the legacy `Categoria` table and columns.

This does not directly block Identity & Tenancy, but it demonstrates that the migration history contains destructive schema operations. The Identity migration must not repeat this pattern for `Empresa`, `Usuario`, `UsuarioPermiso`, `Permiso`, or `Legajo` until preservation and reconciliation are verified.

### H-02 — NOT NULL transitions

Migration `20260922002130_tienda_online_fase1_pedido_item_y_usuario_opcional` changes `Pedido.clienteId` to NOT NULL and explicitly notes failure if existing NULL rows remain.

Identity migration should use the same discipline:

1. introduce nullable compatibility columns/relations;
2. backfill;
3. validate zero unresolved rows;
4. only then enforce NOT NULL/UNIQUE constraints.

### H-03 — Global uniqueness changes

The migration history contains an explicit correction from global `Producto.codigoInterno` uniqueness to Business-scoped uniqueness.

This is relevant precedent: tenancy changes can require changing uniqueness scope, and such changes must be treated as data constraints, not merely ORM renames.

For Identity & Tenancy, the main uniqueness constraints requiring review are:

- User email: global target.
- Membership: UNIQUE(userId, businessId).
- Customer email: Business-scoped.
- Supplier identity: Business-scoped.
- Role/Permission names: target scope must be explicitly defined before migration.

### H-04 — Existing direct User foreign keys

Many tables reference User directly. Introducing Membership does not mean replacing every historical actor FK with Membership.

The target distinction should be maintained:

- **authorization context** → Membership;
- **historical actor identity** → User;
- **business ownership** → Business.

A sale, audit event or stock movement should continue to identify the global User actor, while authorization is evaluated through the active Membership.

## 6. Recommended migration sequence — proposal only

No implementation is authorized by this document.

### Phase M0 — Freeze the target contracts

Before schema migration:

- approve physical target model;
- resolve role mapping;
- resolve Legajo/Operational Profile;
- define Permission/Role canonical catalog;
- define Customer↔User linkage rule;
- define Business context/session contract.

### Phase M1 — Add target identity tables

Add, without deleting legacy structures:

- Business
- User compatibility/target representation as defined by approved model
- Membership
- Role
- Permission/RolePermission target structures

The exact table naming and whether `Empresa` is temporarily retained as compatibility infrastructure must be approved.

### Phase M2 — Establish Business mapping

For each legacy `Empresa`:

`Empresa.id -> Business.id`

Prefer preserving the identifier when physically possible to minimize FK churn; this is a design option, not an approved requirement.

### Phase M3 — Reconcile and establish global Users

For every legacy `Usuario`:

- identify target global User;
- preserve historical User ID where possible;
- reconcile global email uniqueness;
- preserve authentication identifiers;
- record legacy `empresaId` as the source of the initial Membership.

No automatic merge should occur without a deterministic rule.

### Phase M4 — Backfill Membership

For each valid legacy User/Empresa relationship:

`Usuario + Empresa -> Membership`

Backfill:

- userId
- businessId
- active status
- target role mapping

Role mapping remains blocked until R-01 is resolved.

### Phase M5 — Backfill target authorization

Translate:

`UsuarioPermiso -> Membership/Role/Permission`

without deleting the legacy authorization graph.

Validate authorization parity before cutover.

### Phase M6 — Customer linkage

Preserve Customer as Business-scoped.

Where a Customer has an authenticated account:

- link Customer to the appropriate global User;
- do not turn every Customer into a Membership;
- do not globally merge Customers by email.

### Phase M7 — Operational profile / Legajo

Do not migrate Legajo blindly.

First implement the approved decomposition into the target operational concepts, then backfill each source field according to the approved mapping.

### Phase M8 — Authorization cutover

Change authentication/session generation so that:

`Authenticated User -> Business Context -> Membership -> Role/Permission`

becomes authoritative.

JWT claims should not by themselves authorize Business access.

### Phase M9 — Compatibility validation

Run:

- identity parity checks;
- membership cardinality checks;
- authorization parity checks;
- Business isolation checks;
- actor-attribution checks;
- Customer linkage checks;
- invitation checks;
- Legajo/document preservation checks.

### Phase M10 — Legacy retirement

Only after validation:

- remove obsolete authorization paths;
- remove legacy role storage;
- remove legacy User→Empresa dependency;
- remove compatibility structures;
- update migration/documentation baselines.

This phase is intentionally last.

## 7. Backfill validation queries — conceptual

The following are validation concepts, not executable migration SQL.

### User uniqueness

- Count legacy Users by normalized email.
- Identify email collisions.
- Require zero unresolved collisions before global User enforcement.

### Membership cardinality

Expected initial invariant:

`COUNT(Membership) >= COUNT(distinct valid legacy User↔Empresa relationships)`

The exact equality rule must account for intentionally excluded/inactive records once defined.

### Actor preservation

For every actor-bearing historical record:

`old.usuarioId -> target User.id`

must remain resolvable.

### Business ownership

For every Business-scoped resource:

`resource.businessId`

must resolve to exactly one target Business.

### Customer linkage

For every Customer with an authenticated legacy account:

- at most one deterministic target User;
- Customer remains scoped to its Business.

### Authorization parity

For each legacy User/Empresa pair, compare effective permissions before and after target authorization.

No unexplained permission expansion should be accepted during cutover.

## 8. Rollback constraints

The migration is not safely reversible merely by dropping newly created tables.

Rollback must account for:

- new Membership rows;
- target authorization rows;
- User identity merges, if any;
- Customer↔User links;
- session/token changes;
- compatibility columns;
- historical actor references;
- invitation state.

Therefore the preferred rollback strategy is **compatibility-preserving forward recovery**, not destructive down-migrations.

No User merge should be performed without a recoverable mapping record.

## 9. Current readiness assessment

### Verified by migration source

- 17 numbered Prisma migrations exist.
- Core identity starts with `Empresa`, `Usuario`, `Permiso`, `UsuarioPermiso`.
- User is physically bound to one Empresa through `Usuario.empresaId`.
- User email is globally unique.
- Customer and Supplier uniqueness is Business-scoped.
- Role is stored on User.
- Legajo can attach to User or Customer.
- Multiple operational tables directly reference User.
- Invitations are Business-scoped and role-bearing.
- The migration history contains both destructive changes and carefully staged NOT NULL/uniqueness changes.

### Not yet verified by database execution

- actual production/staging row counts;
- duplicate legacy User emails;
- orphan records;
- invalid cross-business FK combinations;
- actual Legajo XOR violations;
- actual permission parity data;
- current invitation population;
- actual Google ID collisions;
- real database lock duration for the target migration.

These require a database snapshot or executable validation environment and must not be inferred from migration files.

## 10. Blocking decisions before implementation

The migration is **not implementation-ready** until at least these are resolved:

1. **R-01 Roles:** authoritative mapping from legacy `RolUsuario` to Membership-scoped roles.
2. **R-03 Legajo:** approved target ownership/decomposition.
3. Canonical Role/Permission catalog.
4. Exact Business/User/Membership physical naming and coexistence strategy.
5. Global User reconciliation rule for duplicate legacy emails.
6. Session/token cutover contract.
7. Validation environment/data snapshot.

## 11. Explicit non-actions

This review does **not**:

- modify `schema.prisma`;
- create Prisma migrations;
- rename `Empresa`;
- rename `Usuario`;
- alter production data;
- change authentication;
- change authorization;
- remove legacy tables;
- merge Users;
- change canonical SPEC documents.

The next implementation artifact should be a **Migration Design / Backfill Specification** only after the blocking decisions above are closed.
