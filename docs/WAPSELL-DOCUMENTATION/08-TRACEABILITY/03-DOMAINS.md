# Traceability - Domains

**Reconciled:** 2026-09-28

> ## Status: **PROPOSED ONLY — not traced to decisions**
>
> The domain map in 00-WAPSELL-SPEC-GENERAL.md §24 is explicitly labelled *"PROPOSED DOMAIN
> MAP"*. It is **not** covered by any decision: DEC-001:55-57 excludes the impact on the
> standalone specs, and no other decision text survives. It is recorded here as a proposal so it
> is not mistaken for architecture that was chosen.

| Proposed domain | Entities (from the General spec) | Decision backing |
|---|---|---|
| Identity & Access | User, Membership, Role, Permission | Direction only (DEC-001:16-19) |
| Tenancy | Tenant, Brand | Direction only (DEC-001:13, :15) |
| Commerce | Customer, Order, Sale, Product | **NONE** — D-007 undeterminable |
| Payments | Payment | **NONE** — D-011 undeterminable |
| Cash | Cash | **NONE** — D-013 undeterminable |
| Inventory | Inventory | **NONE** — D-010/D-014 undeterminable |
| Purchases | Purchases, Suppliers, AP | **NONE** — D-015 undeterminable |
| Accounts Receivable | AR concepts | **NONE** — D-012 undeterminable |
| Fulfillment | Fulfillment, Deliveries | **NONE** — D-016 undeterminable |
| Messaging | Conversation, Message | Direction only (DEC-001:23) |
| Brand | Brand | Direction only (DEC-001:15) |

## Notes
- "Identity & Access" and "Tenancy" and "Brand" have *direction*; the other nine domains have
  **no** approved content. That asymmetry is invisible in the General spec's flat domain list.
- AS-IS domain coverage is in 05-ASIS/; the AS-IS/TO-BE domain gap is **OPEN**.