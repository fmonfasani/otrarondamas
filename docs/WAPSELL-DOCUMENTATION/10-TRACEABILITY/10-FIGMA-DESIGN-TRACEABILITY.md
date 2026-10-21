# Wapsell — Figma Design Traceability Register

**Document ID:** TRACE-FIGMA-001  
**Version:** 0.1.0  
**Status:** DRAFT — PARTIAL / OWNER REVIEW REQUIRED  
**Updated:** 2026-10-21  
**Design source:** [Wapsell Figma file](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D)  
**Related spec:** [SPEC-ADMIN-UI-001](../06-SPECIFICATIONS/SPECIALIZED/01-ADMIN-WEB-FIGMA-SCREEN-SPEC-v0.1.md)

## 1. Purpose

Track stable Figma frames as design inputs to Wapsell's existing traceability system. This register supplements, and does not replace, the Master Traceability Matrix, API/UI traceability, canonical specifications, decision register, contracts, invariants or test evidence.

## 2. Status legend

- **FRAME IDENTIFIED** — stable node ID and link recorded.
- **DOMAIN CANDIDATE** — domain association is a navigation aid, not an approved contract.
- **SPEC GAP** — screen behavior is not specified sufficiently for implementation.
- **CODE NOT VERIFIED** — no claim that current code implements the frame.
- **TEST NOT MAPPED** — no test/evidence link has been established for the screen.
- **OWNER REVIEW REQUIRED** — candidate requirements and this workflow have not been approved.

## 3. Frame register

| ID | Frame / node | Link | Candidate domain | Spec artifact | Code mapping | Test/evidence |
|---|---|---|---|---|---|---|
| ADM-CUS-001 | B10 / `2054:2` | [B10 Clientes](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2054-2) | Customer | SPEC-ADMIN-UI-001 §§6–6.2; visual inventory recorded, multiple target data/UI gaps open | [ClientesPage](https://github.com/fmonfasani/otrarondamas/blob/main/apps/pos-admin/src/features/clientes/ClientesPage.tsx), [controller](https://github.com/fmonfasani/otrarondamas/blob/main/apps/api/src/customers/customers.controller.ts), [service](https://github.com/fmonfasani/otrarondamas/blob/main/apps/api/src/customers/customers.service.ts) — AS-IS only; visual match NOT VERIFIED | [BusinessContext test](https://github.com/fmonfasani/otrarondamas/blob/main/apps/api/test/integration/s-v1-03-clientes-business-context.integration-spec.ts), [HTTP test](https://github.com/fmonfasani/otrarondamas/blob/main/apps/api/test/integration/s-v1-03-clientes-http.integration-spec.ts) exist; execution NOT RUN here |
| ADM-SUP-001 | B11 / `2055:2` | [B11 Proveedores](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-2) | Supplier / Purchases | SPEC-ADMIN-UI-001 §§3, 6.3; visual content defects recorded, detailed contract open | NOT VERIFIED | NOT MAPPED |
| ADM-DEL-001 | B12 / `2055:195` | [B12 Entregas](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-195) | Orders / Fulfillment | SPEC-ADMIN-UI-001 §§3, 6.4, 6.6; model exists, service/controller absent per AS-IS inventory | NOT IMPLEMENTED / NOT VERIFIED | NOT MAPPED |
| ADM-CASH-001 | B13 / `2055:388` | [B13 Caja](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-388) | Cash / Payments | SPEC-ADMIN-UI-001 §§3, 6.4, 6.6; existing CajaPage/API contract needs reconciliation with mockup | CODE EXISTS; VISUAL MATCH NOT VERIFIED | NOT MAPPED |
| ADM-FIN-001 | B14 / `2055:581` | [B14 Finanzas](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-581) | Payments / AR | SPEC-ADMIN-UI-001 §§3, 6.4, 6.6; AR/debt collection explicitly not implemented | NOT IMPLEMENTED / CONTRACT NOT VERIFIED | NOT MAPPED |
| ADM-REP-001 | B15 / `2055:774` | [B15 Reportes](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-774) | Reporting / Analytics | SPEC-ADMIN-UI-001 §§3, 6.4, 6.6; `/reports` is a placeholder per AS-IS inventory | NOT IMPLEMENTED | NOT MAPPED |
| ADM-SET-001 | B16 / `2055:967` | [B16 Configuración](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-967) | Business configuration / Brand | SPEC-ADMIN-UI-001 §§3, 6.4, 6.6; `/settings` is a placeholder; CON-012 open | NOT IMPLEMENTED / DECISION OPEN | NOT MAPPED |
| ADM-TEAM-001 | B17 / `2055:1160` | [B17 Equipo y permisos](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-1160) | Membership / Roles / Capabilities | SPEC-ADMIN-UI-001 §§3, 6.4, 6.6; membership resolution exists, admin mutations NOT VERIFIED | PARTIAL INFRASTRUCTURE / ADMIN FEATURE NOT VERIFIED | NOT MAPPED |
| ADM-ACC-001 | B18 / `2055:1353` | [B18 Perfil y cuenta](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-1353) | Global User / Account / Session | SPEC-ADMIN-UI-001 §§3, 6.7; visual defects recorded; current `/profile` is read-only | CODE PARTIALLY VERIFIED; FIGMA TARGET NOT IMPLEMENTED/VERIFIED | NOT MAPPED |

## 4. Requirement-to-evidence row template

Create one row per requirement. Do not reuse one generic row for an entire screen when its actions have different contracts.

| Requirement ID | Authority / decision | Spec section | Figma node | API/domain contract | Code path | Automated test | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| `ADM-CUS-RQ-001` | PENDING RECONCILIATION | SPEC-ADMIN-UI-001 §6 | `2054:2` | NOT VERIFIED | NOT VERIFIED | NOT MAPPED | NOT RECORDED | PROPOSED |

## 5. Required closure per screen

A screen can move from design inventory to implementation-ready only when:
1. its candidate requirements are reconciled with authoritative decisions and conflict records;
2. the relevant domain spec and API/data contract exist and are reviewed;
3. actors, permissions and active Business context are explicit;
4. loading, empty, error, forbidden and success states are defined where applicable;
5. every requirement has acceptance criteria;
6. code paths and automated tests are mapped;
7. visual verification against the referenced frame is recorded;
8. open decisions and implementation authorization are resolved through the project's governance process.

## 6. Relationship to existing traceability

- [Master Traceability](00-MASTER-TRACEABILITY.md) remains the cross-domain authority map.
- [API/UI Traceability](06-API-UI.md) records the current API/UI baseline and its historical open gaps; this register adds stable Figma references but does not retroactively prove API or UI contracts.
- The [Experience Platform & Interface System Spec](../06-SPECIFICATIONS/CANONICAL/07-EXPERIENCE-PLATFORM-AND-INTERFACE-SYSTEM-SPEC.md) governs the proposed cross-interface topology and shared design-system boundary.
- The [Branding & Customer Experience Spec](../06-SPECIFICATIONS/CANONICAL/06-BRANDING-AND-EXPERIENCE-SPEC.md) governs the proposed Brand behavior and customer-facing expression. CON-012 remains open unless closed by the required decision/reconciliation process.

## 7. Evidence boundary

The Figma links and node IDs identify the frames. They do not establish that a screen's content is approved, that its behaviors are specified, that its UI is implemented, that APIs exist, or that tests pass. Those claims require separate evidence recorded in the appropriate columns.


## 5. Next reconciliation work package (2026-10-21)

Order is based on the gap between the proposed Figma experience and verified AS-IS capability; it does not imply implementation priority approval.

| Priority | Frame | Current evidence | Contract gap / gate | Implementation status |
|---|---|---|---|---|
| 1 | B13 Caja | AS-IS cash UI/API exists; opening, movements, reconciliation/handover and closing documented. TO-BE Cash remains DRAFT and leaves physical state machine, adjustment/reversal mechanics and Payment↔Cash effects open. | Map each Figma metric/action to existing API/DTO/schema and cash invariants. Preserve the distinction between AS-IS behavior, Owner rulings, derived requirements and OPEN implementation detail. | Reconciliation only; no new state, endpoint or permission authorized. |
| 2 | B12 Entregas | `Entrega` Prisma model exists; AS-IS inventory says no delivery module/controller/service or executable delivery flow. CON-025 is the known lifecycle gap. | Resolve fulfillment lifecycle, assignment, failure/return, proof/audit and tenant authorization against canonical decisions before specifying contracts. These are open topics, not approved fields/states. | TO-BE proposal; not implemented. |
| 3 | B14 Finanzas | Current-account/debt collection not implemented; schema models alone are not executable capability. | Separate Cash, Payment, recognized income/expense and AR; define source/formula/time/currency/refund semantics and authorization. | Contract not verified; do not display mock figures as real. |
| 4 | B15 Reportes | `/reports` is a placeholder. | Define metric formulas, source, grain, timezone/window, filters, incomplete-data and export/auth behavior. | Not implemented. |
| 5 | B16 Configuración | `/settings` is a placeholder; CON-012/design-token hierarchy remains open. | Identify Business-owned settings/branding from approved authority; no fields inferred from Figma. | Not implemented. |
| 6 | B17 Equipo y permisos | Membership/context resolution exists; full team/role administration not established. | Specify invite, membership mutation, roles/permissions, suspension, audit and self-lockout controls only after rulings/contracts. | Partial infrastructure only; admin actions not verified. |
| 7 | B18 Perfil y cuenta | Current `/profile` is read-only; MFA/session inventory/revocation/edit/export/security activity not verified. | Keep User, Membership and Customer distinct; approve any new account/security capability and its contract before UI implementation. | Existing profile only; Figma target not implemented/verified. |

### Completion rule

For each frame, close the documentation pass only when the spec names the source of truth for every displayed metric/field/action, links the applicable requirement/decision/contract, maps acceptance criteria to tests, and preserves all unresolved Owner decisions as OPEN. Test existence and test execution must be reported separately. This register records a work plan, not approval or implementation authorization.
