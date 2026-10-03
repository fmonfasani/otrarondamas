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

> **R1 TRACEABILITY NOTE (2026-09-30) — additive; the line above was not modified.** `CON-010 OPEN` is the
> historical state. Later authority: OR-002-A (`04-DECISIONS/15-OR-002-A-OWNER-RULING.md`, `CLOSED` 2026-09-28):
> `CON-010` `RESOLVED` in conceptual direction; `Customer` independent of `User`, optional link. No API/UI
> implementation is authorized. See `04-DECISIONS/17-R1-DOCUMENTAL-RECONCILIATION-RECORD.md`.
>
> **R3 TRACEABILITY NOTE (2026-09-30) — additive.** OR-002-B…F confirmed by the Owner on 2026-09-30 (R2;
> `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md`, Decision Register §8.1); OR-002-E covers temporary
> compatibility of legacy sessions/tokens (conceptual only). No API, endpoint, token or UI change is defined or
> authorized; implementation `NOT AUTHORIZED`.