# Traceability - Entities

**Reconciled:** 2026-09-28

> ## Status: **AS-IS VERIFIED / TO-BE NOT DECIDED**
>
> DEC-001:55-57 explicitly excludes the data model, so **no TO-BE entity can be marked decided**.
> This file therefore records the verified AS-IS side and refuses to invent the TO-BE side.
> Per DEC-001:55-57 the transformation itself is not decided either.

| AS-IS entity (verified) | Source | TO-BE candidate | TO-BE status |
|---|---|---|---|
| Empresa | 05-ASIS/03-ASIS-DATA.md | Tenant | equivalence APPROVED; **fields NOT decided** |
| Usuario (1:1 Empresa, email global) | 05-ASIS/04-ASIS-IDENTITY.md | User | APPROVED as global identity; **uniqueness NOT decided** |
| Cliente (separate, 1:1 Empresa, anonymous buyers possible) | 05-ASIS/04-ASIS-IDENTITY.md, 05-ASIS/07-ASIS-FLOWS.md:39 | Customer? | **NOT DECIDED** (CON-010) |
| — | — | Membership | N:N APPROVED; **schema NOT decided** |
| — | — | Role, Permission | in-Membership APPROVED; **catalogue NOT decided** |
| Pedido / PedidoItem | 05-ASIS/03-ASIS-DATA.md | Order | **NOT DETERMINABLE** (D-007) |
| Venta / VentaItem | 05-ASIS/03-ASIS-DATA.md | Sale | **NOT DETERMINABLE** (D-007) |
| Pago | 05-ASIS/03-ASIS-DATA.md | Payment | **NOT DETERMINABLE** (D-011) |
| CuentaCorriente / Deuda / AplicacionPago (no service) | 05-ASIS/03-ASIS-DATA.md | AR | **NOT DETERMINABLE** (D-012) |
| Producto ([Empresa, codigoInterno]) | 05-ASIS/03-ASIS-DATA.md | Product | **PROPOSED**; key is AS-IS-verified |
| EstadoPedido — 10 values, **never enumerated** | 05-ASIS/03-ASIS-DATA.md | Order states | **NOT DETERMINABLE** |
| EstadoVenta — CONFIRMADA/ANULADA, no producing flow | 05-ASIS/03-ASIS-DATA.md | Sale states | **NOT DETERMINABLE** (D-008) |
| Entrega (exists, no module) | 05-ASIS/ | Fulfillment | **NOT DETERMINABLE** (D-016) |

## Gaps carried
- CON-010, CON-016, CON-017, CON-021, CON-025 **OPEN**.
- **Note:** AS-IS `Empresa` vs **TO-BE `Tenant`** is a *terminology* mapping only. DEC-001:13
  does not assert field-level equivalence.
