# WAPSELL — OR-B4 OWNER RULING — APPROVAL OF THE GENERAL SPEC (v0.5)

**Status:** APPROVED — OWNER RULING
**Date:** 2026-11-10
**Owner:** fmonfasani
**Session:** `OR-B4-SESSION-2026-11-10`
**Scope:** approval of `06-SPECIFICATIONS/CANONICAL/00-WAPSELL-SPEC-GENERAL.md` v0.5 and of decisions OR-B4-001…OR-B4-020.

---

## 1. Owner ruling (verbatim)

The Owner was presented with 20 questions (P1–P20), each with three options and a recommendation, written against the long-term direction of DEC-001 (Wapsell as a multi-tenant SaaS for conversational commerce; Otra Ronda Más as its first Business). The Owner answered:

> "Acepto todas las recomendaciones , quiero que tomes ese spec para seguir con el proyecto"

Two recommendations conflicted with earlier Owner Rulings. They were presented separately and the Owner answered:

> P13 (estados de pedido) → **"R8-ORD-002 (Recomendado)"** — keep the existing Order state vocabulary as the starting lifecycle.
>
> P8 (estados de Membership) → **"Sí, tres estados (Recomendado)"** — ACTIVE, SUSPENDED, INACTIVE.

Per ISS-08 (`OR-B2-023`), this ruling is later than OR-B2, OR-B3, R8 and AUTH-01…12 and prevails where it differs from them. Where it does not say otherwise, those rulings remain in force.

---

## 2. Approved decisions

| ID | Question | Approved option |
|---|---|---|
| **OR-B4-001** | Meaning of "approved" | The General SPEC is approved **and** the existing implementation is recognised as the accepted AS-IS. Gaps against the SPEC become tracked backlog. Implementation is **authorised incrementally** against the approved SPEC, through reviewed and tested pull requests (§3). |
| **OR-B4-002** | Open areas (§15) | Only items that define the MVP core block approval; none does. D-011 (payment detail), D-013 (cash detail), D-016 (fulfillment detail), AI scope and nomenclature remain `OPEN` for their specialized specs. |
| **OR-B4-003** | Formal IDs for the v0.4 review decisions | Each decision gets a citable ID in the Decision Register. The v0.4 items already formalised by R8 keep their R8 ID (§4); the rest are formalised here. |
| **OR-B4-004** | Canonical file | `00-WAPSELL-SPEC-GENERAL.md` is the only canonical file. `00-WAPSELL-SPEC-GENERAL-v0.4.md` is `HISTORICAL`. |
| **OR-B4-005** | Out-of-date specialized specs | The General SPEC is approved. Identity, Commerce and the other specialized specs are subordinate and pending reconciliation. Where they contradict the General SPEC, the General SPEC prevails. |
| **OR-B4-006** | MVP roles | The SPEC roles apply (`OWNER`, `ADMIN`, `VENDEDOR`, `GESTOR_DE_STOCK`; AUTH-01). Transitional mapping with a deadline: `ASISTENTE_LOCAL → VENDEDOR`. `PROVEEDOR` and `REPARTIDOR` stop being Membership Roles. |
| **OR-B4-007** | Permission catalogue and Role→Permission matrix | Defined in a separate Authorization specialized spec; does not block this approval. The General SPEC names the key permissions (`ORDER_CONFIRM`, `CASH_OPEN`, `CASH_CLOSE`, `CASH_ADJUST`, `CASH_WITHDRAW`). Consistent with AUTH-03/AUTH-04 and R8-AUTH-001. |
| **OR-B4-008** | Membership states | Three conceptual states: `ACTIVE`; `SUSPENDED` (temporary, set by an authorised administrator, reversible); `INACTIVE` (permanent removal). Extends R8-ID-002 without changing what `INACTIVE` means. Only `ACTIVE` can operate. Technical detail `OPEN`. |
| **OR-B4-009** | MFA timing | MFA/2FA is mandatory for Owner and Admin (OR-B3-014) **before onboarding a second Business**; it is enabled now for the Otra Ronda Más Owner account. |
| **OR-B4-010** | End of the Empresa→Business / Usuario→User coexistence | Cut-over criteria are defined now; not a date. Minimum criteria: no route authorises through `Usuario`/`Usuario.empresaId`; proven parity of the `Usuario.id → User.id` mapping (AUTH-07); legacy permissions mapped (AUTH-11). Consistent with R8-ID-003. |
| **OR-B4-011** | Product / BusinessProduct | Kept as approved (R8-COM-003), in stages: the current `Producto` acts as `BusinessProduct`; the global `Product` is introduced when a second Business or a shared catalogue needs it. |
| **OR-B4-012** | Stock reservation | Implement the SPEC in the MVP: a confirmed Order **reserves** stock; physical decrement happens only through a stock-out movement (R8-INV-002). |
| **OR-B4-013** | Order states | **R8-ORD-002 prevails** (Owner answer above): the AS-IS Order vocabulary (`RECIBIDO`, `CONFIRMADO`, `EN_PREPARACION`, `LISTO`, `ASIGNADO`, `EN_CAMINO`, `ENTREGADO`, `PARCIALMENTE_ENTREGADO`, `ENTREGA_FALLIDA`, `CANCELADO`) is the starting lifecycle, with semantic reconciliation. The SPEC's `DRAFT → PENDING_CONFIRMATION → CONFIRMED / CANCELLED` is a conceptual grouping of that vocabulary, not a replacement. |
| **OR-B4-014** | Cart without Customer and "Consumidor Final" | Both in the MVP, in this order: first the generic Customer **Consumidor Final** (counter sales without nominal identification), then the anonymous Cart (R8-COM-004). |
| **OR-B4-015** | Locations | One `MAIN` Location per Business from now, with lots associated to it; further Locations allowed (R8-INV-003). |
| **OR-B4-016** | Online payments in the MVP | Real Mercado Pago integration (D-011 detail stays `OPEN` for the Payment spec). Stripe only when there are Businesses outside LatAm. |
| **OR-B4-017** | Purchases / Suppliers | The existing code is kept, outside the MVP scope: no support or evolution commitment (D-015). |
| **OR-B4-018** | Messaging vs G001–G105 | Approved as it stands (1:1, one Business per Conversation, Customer without User). G001–G105 is reconciled later. |
| **OR-B4-019** | Architecture | REST for the MVP (AS-IS). GraphQL and Kubernetes stay `OPEN`. Modular Monolith confirmed (OR-B2-024). |
| **OR-B4-020** | Platform admin (SaaS Admin) | `PlatformAdminModule` is kept for internal Owner use only, not exposed as a product; its permissions are defined in the Authorization spec (OR-B3-003). |

---

## 3. Implementation authorisation (OR-B4-001)

This ruling changes the implementation boundary that earlier rulings stated as `IMPLEMENTATION = NOT AUTHORIZED` (including the boundary in AUTH-01…12):

- **Authorised:** incremental implementation of the approved SPEC through pull requests that pass the required CI gates (Lint and Type Check, B3, B4, Jest), keep tenant isolation, and include tests for the behaviour they change.
- **Still requires an explicit Owner decision:** destructive migrations or data deletion; production cut-overs that retire legacy identity or permissions (OR-B4-010); changes that contradict an Owner Ruling; scope outside the MVP (§1.3 of the SPEC).
- Production deploys keep the manual approval of the `production` environment.

---

## 4. v0.4 review decisions and their IDs (OR-B4-003)

| v0.4 review decision | Citable ID |
|---|---|
| Accounts Receivable / Cuentas Corrientes in the MVP | **OR-B4-021** (formalised here) |
| Purchases / AP outside the initial MVP | D-015 + OR-B4-017 |
| Order confirmation reserves stock; physical decrement on stock-out | R8-INV-002 |
| Cart may exist without Customer; Customer required before Order | R8-COM-004 |
| Generic Customer "Consumidor Final" | **OR-B4-022** (formalised here) + OR-B4-014 |
| Product global + BusinessProduct governance | R8-COM-003 |
| Cash operations through specific Permissions | **OR-B4-023** (formalised here) + OR-B4-007 |
| Messaging: Customer may participate without User | OR-B3 (Messaging) + OR-B4-018 |
| MFA mandatory for Owner/Admin, optional for Vendedor/Gestor de Stock | OR-B3-014 + OR-B4-009 |
| Order confirmation governed by `ORDER_CONFIRM` | R8-COM-004 §2.8 |
| Locations: MAIN + multiple | R8-INV-003 |

---

## 5. Approval act

The Owner approves `00-WAPSELL-SPEC-GENERAL.md` **v0.5** with status `APPROVED`, under the scope of OR-B4-001. The SPEC is the reference for continuing the project ("tomes ese spec para seguir con el proyecto"). Backlog items derived from the gaps between the AS-IS and the approved SPEC are tracked as GitHub issues and linked from §21 of the SPEC.
