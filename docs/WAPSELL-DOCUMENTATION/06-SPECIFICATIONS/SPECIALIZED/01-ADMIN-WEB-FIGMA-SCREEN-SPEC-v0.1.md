# Wapsell — Admin Web Screen Specification (Figma-backed)

**Document ID:** SPEC-ADMIN-UI-001  
**Version:** 0.1.0  
**Status:** DRAFT — PROPOSED / OWNER REVIEW REQUIRED  
**Date:** 2026-10-21  
**Scope:** Tenant Admin Web screens B10–B18 in the Wapsell Figma file  
**Figma file:** https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D  
**Authority:** Derived design artifact; does not approve requirements, resolve conflicts, authorize implementation, or prove code behavior.

> This document establishes a controlled bridge between editable Figma frames and Spec-Driven Development. The frames are visual references, not a substitute for business rules, authorization, API contracts, data-model evidence, or acceptance criteria. Any requirement below marked PROPOSED must be reconciled against Owner rulings, the Decision Register, canonical specs, AS-IS evidence, and open conflicts before approval.

## 1. Purpose

Make the Admin Web designs traceable, reviewable inputs to Wapsell's specification process. A design frame may be used to derive candidate UI requirements, but no functional behavior may be inferred solely from labels, table columns, sample values, or visual controls.

Canonical chain:

`Owner ruling / decision → requirement → specialized spec → Figma frame → API/domain contract → implementation → automated test → evidence`

The order represents traceability, not a claim that every link currently exists. Missing links must remain marked **NOT DOCUMENTED** or **NOT VERIFIED**, not silently filled.

## 2. Authority and constraints

1. Follow the documentary precedence recorded in the Decision Register and source-of-truth documentation. Figma is supporting design evidence; it does not outrank Owner rulings or approved decisions.
2. Keep AS-IS and TO-BE separate. A frame shows a proposed target experience unless explicitly identified as an AS-IS capture.
3. Do not infer a permission, role, lifecycle transition, calculation, API endpoint, persistence field, or tenant boundary from visual appearance.
4. The backend remains authoritative for authentication, active Business context, authorization, tenant isolation, prices, stock, order state, financial values, and mutation results.
5. The Admin UI is not a security boundary. Hiding a navigation item or disabling a button does not replace server-side authorization.
6. These screens remain a design baseline only. Technical specification approval and implementation authorization are separate governance decisions; this document grants neither.
7. All screen content and data shown in Figma must be treated as illustrative unless its source and meaning are explicitly specified.

## 3. Screen inventory and traceability status

| Screen ID | Figma frame | Stable node ID | Frame link | Domain candidates | Current spec status |
|---|---|---:|---|---|---|
| ADM-CUS-001 | B10 — Clientes | Admin Desktop | `2054:2` | [Open B10](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2054-2) | Customer | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-SUP-001 | B11 — Proveedores | Admin Desktop | `2055:2` | [Open B11](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-2) | Supplier / Purchases | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-DEL-001 | B12 — Entregas | Admin Desktop | `2055:195` | [Open B12](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-195) | Orders / Fulfillment | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-CASH-001 | B13 — Caja | Admin Desktop | `2055:388` | [Open B13](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-388) | Cash / Payments | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-FIN-001 | B14 — Finanzas | Admin Desktop | `2055:581` | [Open B14](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-581) | Payments / Accounts Receivable | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-REP-001 | B15 — Reportes | Admin Desktop | `2055:774` | [Open B15](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-774) | Reporting / Analytics | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-SET-001 | B16 — Configuración del negocio | Admin Desktop | `2055:967` | [Open B16](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-967) | Business configuration / Brand | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-TEAM-001 | B17 — Equipo y permisos | Admin Desktop | `2055:1160` | [Open B17](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-1160) | Membership / Roles / Capabilities | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-ACC-001 | B18 — Perfil y cuenta | Admin Desktop | `2055:1353` | [Open B18](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-1353) | Global User / Account / Session | Candidate mapping only; detailed behavior NOT SPECIFIED |

Frame dimensions and editable-layer structure were previously inspected, but that structural inspection is not a visual fidelity review, behavior validation, or implementation check. Re-verify frames when design changes.

## 4. Shared Admin shell — proposed visual contract

The frames appear to share a desktop Admin shell and a common Wapsell/Business context. Treat the following as **visual observations to confirm during design review**, not approved brand tokens or functional requirements:

- persistent left navigation;
- visible Wapsell identity and current Business context;
- light workspace surfaces with neutral background;
- yellow brand accent and dark tenant-context surface;
- consistent typography, spacing, borders and card/table patterns.

Do not derive canonical token values from screenshots or frame appearance. Token ownership and the relationship between Wapsell Design System Core and Business Brand remain governed by the branding and experience specs; CON-012 remains open until formally reconciled.

## 5. Required contract for every screen

Before implementation planning, each screen spec must resolve the following or explicitly mark it open:

1. **Intent and actor:** user goal, supported actor, required active Business context and permission.
2. **Data contract:** domain entities, field definitions, source of truth, sorting, filtering, pagination and derived values.
3. **Actions:** action ID, preconditions, authoritative command/API, success result, failure behavior and idempotency where applicable.
4. **UI states:** initial, loading, populated, empty, validation error, server error, forbidden, stale/conflict and partial data where applicable.
5. **Tenant isolation:** all reads and writes scoped by server-validated Business context; no cross-tenant disclosure through IDs, counts, search, exports or errors.
6. **Accessibility/responsiveness:** keyboard order, focus, semantic labels, contrast, narrow viewport behavior and non-color status cues.
7. **Observability:** meaningful failure and mutation events without leaking secrets or cross-tenant data.
8. **Acceptance criteria:** observable Given/When/Then statements and automated test references.
9. **Traceability:** requirement IDs → spec sections → Figma node ID → code paths → tests → evidence.

A screen is not implementation-ready while critical business behavior, permission policy, or contract dependencies remain unresolved.

## 6. Pilot: Customers (B10)

B10 is the proposed first pilot because it provides a bounded Admin screen to test the design-to-spec workflow. Candidate requirements below are intentionally **PROPOSED**, not approved product behavior:

- **ADM-CUS-RQ-001 — Customer list:** define the canonical Customer scope and which records the active Business may access.
- **ADM-CUS-RQ-002 — Search:** define supported searchable fields, normalization, matching semantics and whether search is server-side.
- **ADM-CUS-RQ-003 — Filters and ordering:** define allowed filters, composition, default sort and pagination behavior.
- **ADM-CUS-RQ-004 — Customer detail:** define permitted fields and whether purchase history is in scope; do not infer this from a visual affordance.
- **ADM-CUS-RQ-005 — Summary metrics:** specify the source records, time window, aggregation rules and empty-data behavior for every displayed metric.
- **ADM-CUS-RQ-006 — UI state coverage:** define loading, empty, error and forbidden states, including recovery actions.
- **ADM-CUS-RQ-007 — Tenant isolation:** verify both UI-facing queries and server authorization prevent access to another Business's Customer data.

These IDs identify candidate work only. They must be reconciled with the current Customer domain contract, existing Prisma schema, NestJS routes/services, role/capability decisions, conflicts, and tests before being approved. Do not create API endpoints or schema fields merely to match the mockup.

## 7. Acceptance criteria for the design-to-spec workflow

The workflow itself is acceptable when:

- every frame has a stable Figma node ID and a canonical link;
- every visible action/data region maps to a requirement or is explicitly marked decorative/illustrative/TBD;
- every requirement is labeled with its authority and status;
- business rules and permission behavior are sourced from approved decisions/specs, not guessed from pixels;
- all unresolved conflicts and dependencies remain visible;
- each approved requirement has at least one acceptance criterion;
- implementation work is not marked ready until code/API/data-model discovery and relevant tests are linked;
- visual verification compares the implemented screen with the current frame at the same viewport and records deviations;
- changes to a frame trigger review of linked requirements, specs, implementation and tests.

## 8. Change protocol

When a frame changes:
1. Record the changed node, date, author/context and reason.
2. Identify linked requirements and classify the change as visual-only, interaction, data contract, business behavior, authorization or unresolved.
3. Update the relevant specialized spec and traceability matrix before implementation.
4. If the change conflicts with a ruling, canonical spec, contract or invariant, record a conflict; do not silently choose a winner.
5. Add/update automated tests for behavior changes; add visual regression evidence where supported.
6. Keep the prior version/evidence available through Git history.

## 9. Current gaps and non-claims

- Detailed screen behavior: **NOT SPECIFIED**.
- Screen-specific API contracts: **NOT VERIFIED / NOT DOCUMENTED here**.
- Authorization matrix for each action: **NOT VERIFIED**.
- Error/empty/loading/forbidden designs for every frame: **NOT VERIFIED**.
- Code-to-frame visual fidelity: **NOT VERIFIED**.
- Automated UI/E2E coverage for these frames: **NOT VERIFIED**.
- Owner approval of this document and candidate requirements: **PENDING**.

This document records a proposed process and a first screen inventory. It does not claim that any of these screens are implemented or that the underlying modules are complete.
