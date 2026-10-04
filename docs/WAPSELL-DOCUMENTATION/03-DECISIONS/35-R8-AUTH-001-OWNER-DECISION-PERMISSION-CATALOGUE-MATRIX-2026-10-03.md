# WAPSELL — R8-AUTH-001 OWNER DECISION — PERMISSION CATALOGUE / ROLE MATRIX

**Fecha:** 2026-10-03  
**Task:** R8-AUTH-001  
**Decision:** CLOSED — OWNER APPROVED DIRECTION  
**Implementation:** NOT AUTHORIZED

## 1. Purpose

Close the MVP authorization catalogue at the conceptual contract level using verified AS-IS permissions and the canonical Wapsell role model.

This decision does not authorize permission database migration or code changes.

## 2. Canonical Membership Roles

The MVP Membership Role catalogue is:

1. Owner
2. Admin
3. Vendedor
4. Gestor de Stock

Customer, Supplier and Repartidor are not MVP Membership Roles.

## 3. Verified AS-IS permission catalogue

The current seed explicitly contains:

- `caja.gastos`
- `inventario.ajustes`
- `precios.cambiar`
- `ventas.crear`
- `ventas.anular`
- `usuarios.gestionar`
- `clientes.gestionar`
- `productos.gestionar`
- `compras.gestionar`
- `pedidos.gestionar`
- `fidelizacion.gestionar`

These names are AS-IS evidence. They are not automatically declared the complete Wapsell TO-BE permission catalogue.

## 4. Approved TO-BE permission domains

The Owner approves the following permission domains as the minimum conceptual authorization surface for the MVP:

| Permission domain | Purpose |
|---|---|
| `users` | Business team/user administration |
| `customers` | Customer management |
| `catalog` | Product/catalog management |
| `pricing` | Commercial price management |
| `orders` | Order management and confirmation |
| `sales` | Sale creation and correction operations |
| `inventory` | Stock operations and adjustments |
| `cash` | Cash operations |
| `payments` | Payment operations |
| `receivables` | Accounts receivable operations |
| `purchases` | Purchase operations, outside initial MVP execution scope |
| `messaging` | Protected Business messaging operations |
| `brand` | Business Brand configuration |
| `reports` | Business reporting |

This is a conceptual permission-domain catalogue. Exact atomic Permission names remain a specialized authorization-design task where needed.

## 5. Approved high-sensitivity authorization

At minimum, the following operations require explicit Permission authorization rather than role-name inference:

- Order commercial confirmation: `ORDER_CONFIRM`.
- Sensitive Cash operations.
- Sale cancellation/reversal/refund operations.
- Inventory adjustments.
- Business user/team administration.
- Pricing changes.

The exact atomic Permission names for these operations may be normalized during implementation specification, but the authorization requirement itself is closed.

## 6. Role matrix direction

The following conceptual matrix is approved as the MVP direction:

| Capability domain | Owner | Admin | Vendedor | Gestor de Stock |
|---|---:|---:|---:|---:|
| Users / Team | Full | Delegated | No | No |
| Customers | Full | Yes | Operational | No |
| Catalog | Full | Yes | Operational | No |
| Pricing | Full | Yes | No | No |
| Orders | Full | Yes | Operational | No |
| Order confirmation | Yes | Yes | Permission-controlled | No |
| Sales | Full | Yes | Operational | No |
| Inventory | Full | Yes | Read/operational as authorized | Full |
| Cash | Full | Yes, subject to sensitive permissions | As explicitly authorized | No |
| Payments | Full | Yes | Operational as authorized | No |
| Receivables | Full | Yes | Operational as authorized | No |
| Messaging | Full | Yes | Operational | No |
| Brand | Full | Yes | No | No |
| Reports | Full | Yes | Limited/operational | Inventory scope |

### Matrix interpretation

This matrix is **capability-level direction**, not a database permission assignment.

A role does not authorize an operation merely because its row says “Yes”. The executable authorization rule remains:

`Authenticated User → Active Business Context → ACTIVE Membership → Role → Permission → Authorized Operation`

## 7. Explicitly open

The following remain OPEN implementation/specification details:

- exact atomic Permission identifiers;
- exact Role→Permission rows;
- permission inheritance rules, if any;
- permission revocation timing;
- permission persistence model;
- migration of `UsuarioPermiso`;
- exact authorization checks per endpoint/use case;
- technical enforcement mechanism.

No permission is inferred solely from the current AS-IS `UsuarioPermiso` assignments.

## 8. Migration boundary

The existing AS-IS:

`Usuario → UsuarioPermiso → Permiso`

must be treated as transition evidence.

The approved TO-BE direction is:

`Membership → Role → Permission`

The transformation must preserve existing business capability until the corresponding target permission is explicitly mapped and verified.

## 9. Non-approval

This decision does not authorize:

- creation of Permission/Role database rows;
- schema migration;
- deletion of `UsuarioPermiso`;
- replacement of current guards;
- code changes;
- deployment.

## 10. Evidence

- VERIFICADO POR CÓDIGO: current `RolUsuario` enum.
- VERIFICADO POR CÓDIGO: current `Permiso` / `UsuarioPermiso` models.
- VERIFICADO POR CÓDIGO: current seed permission names.
- DOCUMENTADO: OR-B2 canonical Membership Role model.
- DOCUMENTADO: R8-ARCH-001/002/003 architecture boundaries.

**R8-AUTH-001: CLOSED — OWNER APPROVED DIRECTION.**
