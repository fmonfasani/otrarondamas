# Traceability - API / UI

**Reconciled:** 2026-09-28

> ## Status: **NO TO-BE API OR UI SPEC EXISTS**
>
> There is no TO-BE API contract, no endpoint list, no screen list and no navigation spec in the
> repository. The only navigation content is 00-WAPSELL-SPEC-GENERAL.md §25 *"Proposed
> Navigation MVP"*, which is a proposal and is **not** covered by any decision.

## AS-IS endpoints that exist (verified, from 05-ASIS/07-ASIS-FLOWS.md)
| AS-IS endpoint | Behaviour |
|---|---|
| POST /tienda/pedidos | creates/reuses Cliente, freezes prices — **reachable by anonymous buyers** |
| GET /pedidos | seller-side order queue |
| PATCH /pedidos/:id/estado | confirm/cancel; **decrements stock only on confirm** |
| POST /ventas | in-person sale (optional quote) |
| POST /ventas/:id/pagos | records payment against a sale |

## AS-IS UI
05-ASIS/06-ASIS-UX-BRANDING.md records the AS-IS front end plus **four conflicting token sets
with no hierarchy** (CON-012 **OPEN**).

## Open
- No TO-BE API surface. No OpenAPI/contract artifact. **OPEN.**
- No TO-BE UI/navigation spec beyond the General spec's proposal. **OPEN.**
- Role-based navigation depends on the undecided role/permission catalogue. **OPEN.**
- The anonymous-buyer AS-IS path is a hard constraint on any TO-BE identity design, and it
  directly contradicts the old Customer = User claim. CON-010 **OPEN**.