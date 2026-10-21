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
| ADM-CUS-001 | B10 — Clientes \| Admin Desktop | `2054:2` | [Open B10](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2054-2) | Customer | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-SUP-001 | B11 — Proveedores \| Admin Desktop | `2055:2` | [Open B11](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-2) | Supplier / Purchases | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-DEL-001 | B12 — Entregas \| Admin Desktop | `2055:195` | [Open B12](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-195) | Orders / Fulfillment | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-CASH-001 | B13 — Caja \| Admin Desktop | `2055:388` | [Open B13](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-388) | Cash / Payments | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-FIN-001 | B14 — Finanzas \| Admin Desktop | `2055:581` | [Open B14](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-581) | Payments / Accounts Receivable | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-REP-001 | B15 — Reportes \| Admin Desktop | `2055:774` | [Open B15](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-774) | Reporting / Analytics | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-SET-001 | B16 — Configuración del negocio \| Admin Desktop | `2055:967` | [Open B16](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-967) | Business configuration / Brand | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-TEAM-001 | B17 — Equipo y permisos \| Admin Desktop | `2055:1160` | [Open B17](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-1160) | Membership / Roles / Permissions | Candidate mapping only; detailed behavior NOT SPECIFIED |
| ADM-ACC-001 | B18 — Perfil y cuenta \| Admin Desktop | `2055:1353` | [Open B18](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-1353) | Global User / Account / Session | Candidate mapping only; detailed behavior NOT SPECIFIED |

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

These IDs identify candidate work only. They must be reconciled with the current Customer domain contract, existing Prisma schema, NestJS routes/services, role/permission decisions, conflicts, and tests before being approved. Do not create API endpoints or schema fields merely to match the mockup.

### 6.1 B10 — AS-IS reconciliation from repository evidence (2026-10-21)

The following describes the current implementation found in `main`; it is not a statement that B10's target design is implemented or approved.

**Evidence inspected**
- [Admin Customers page](https://github.com/fmonfasani/otrarondamas/blob/main/apps/pos-admin/src/features/clientes/ClientesPage.tsx)
- [Admin route registration](https://github.com/fmonfasani/otrarondamas/blob/main/apps/pos-admin/src/App.tsx)
- [Customers controller](https://github.com/fmonfasani/otrarondamas/blob/main/apps/api/src/customers/customers.controller.ts)
- [Customers service](https://github.com/fmonfasani/otrarondamas/blob/main/apps/api/src/customers/customers.service.ts)
- [Customer create DTO](https://github.com/fmonfasani/otrarondamas/blob/main/apps/api/src/customers/dto/create-customer.dto.ts)
- [Prisma schema](https://github.com/fmonfasani/otrarondamas/blob/main/apps/api/prisma/schema.prisma)
- [BusinessContext integration test](https://github.com/fmonfasani/otrarondamas/blob/main/apps/api/test/integration/s-v1-03-clientes-business-context.integration-spec.ts)
- [Real HTTP integration test](https://github.com/fmonfasani/otrarondamas/blob/main/apps/api/test/integration/s-v1-03-clientes-http.integration-spec.ts)

#### Verified by code inspection

| Concern | Current AS-IS behavior | Implication for B10 target spec |
|---|---|---|
| Route | Admin route `/customers` renders `ClientesPage` inside the protected Admin shell. | Figma node B10 is not yet proven visually equivalent to this page. |
| List/search | `GET /clientes?search=...`; case-insensitive substring search on `nombre` or `email`; results ordered by `nombre` ascending. | Search by phone, advanced filters, sort controls and pagination must not be assumed. |
| Search limit | API applies `take: 50` only when a search term is supplied; no pagination contract is present in this service. | Define explicit behavior for large result sets before adopting a table/pagination design. |
| Detail | `GET /clientes/:id` exists and returns the customer plus computed loyalty level. | Endpoint existence does not mean a detail screen or purchase history is implemented in the Admin UI. |
| Mutations | `POST /clientes` and `PATCH /clientes/:id`; fields accepted by the DTO are name, optional email, phone and address. | Do not infer support for credit limits, active status, fiscal data, purchase history or arbitrary fields from a visual form. |
| Loyalty level | List/detail calculate `NUEVO`, `FRECUENTE` or `VIP` from confirmed sales + confirmed orders, with thresholds configurable by environment variables. | This is a derived loyalty value, not a generic metric. Any B10 metric must have its own definition and source. |
| UI states | Page implements loading, request error, empty list, form validation/error, save-in-progress and cancel. | Explicit forbidden, stale/conflict and richer table states are not evidenced in this component. |
| Tenant authority | Controller resolves authenticated actor → active Membership/BusinessContext → legacy company ID; service uses `CompanyScopedPrismaService.forCompany()`. | Preserve server-derived Business context. The client/JWT `empresaId` must not become the tenant authority. |
| Authorization | GET list/detail have no local `@RequirePermission` decorator; create/update require `clientes.gestionar`. Global auth and dossier guards also apply. | This is observed AS-IS, not approval of the final role/permission matrix. Reconcile list/detail visibility with the approved authorization design. |
| Data model | `Cliente` is Business-scoped and has contact fields plus other fields/relations beyond this page's DTO. | The screen contract must state which fields are intentionally exposed and under which permission. |

#### Test artifacts found — execution not claimed

The repository contains integration specs that assert:
- no token → 401;
- no active Membership or suspended Membership → 403;
- cross-Business list isolation and direct foreign-customer lookup → 404;
- Membership-derived Business context wins over a caller-supplied legacy JWT `empresaId`;
- injected `empresaId` in a create body does not select the tenant;
- create without the required permission → 403.

These are **test cases present in the repository**, not evidence that they passed in this work session. The tests were not executed as part of this documentation change.

#### B10 gap classification

| Candidate requirement | AS-IS evidence | Target gap |
|---|---|---|
| ADM-CUS-RQ-001 Customer list | Basic list exists | Confirm fields, columns, row actions and supported volume against B10. |
| ADM-CUS-RQ-002 Search | Name/email substring search exists | Define normalization, debounce expectations, phone search decision and empty/no-match copy. |
| ADM-CUS-RQ-003 Filters and ordering | Name ascending default; no pagination/filter contract found | Filters, user-selected sorting and pagination are not implemented/evidenced here. |
| ADM-CUS-RQ-004 Customer detail | API endpoint exists; no detail UI in `ClientesPage` | Define whether a detail view and purchase history are actually in scope. |
| ADM-CUS-RQ-005 Summary metrics | Loyalty level is computed per customer | No general summary-metrics contract evidenced; each proposed metric needs a definition. |
| ADM-CUS-RQ-006 UI state coverage | Loading, empty, request error and form error exist | Design and implement additional states only after their behavior is specified. |
| ADM-CUS-RQ-007 Tenant isolation | Controller/service boundary and integration-test cases exist | Re-run relevant tests and map their actual CI/run evidence before declaring the requirement verified. |

**Evidence boundary:** source inspection is **VERIFIED BY CODE** for the statements above. Test execution, visual fidelity to B10, API documentation completeness, accessibility and target-state approval remain **NOT VERIFIED**. The current UI is a minimal AS-IS screen; do not label it a B10 implementation without a visual comparison and acceptance review.

### 6.2 B10 — Visual inventory and target/AS-IS gap

**Visual source inspected:** B10 frame screenshot at 1440×1100 (rendered preview 1024×783), node `2054:2`. This is a visual inspection of the design only; the running Admin application was not captured at the same viewport, so pixel/visual fidelity remains **NOT VERIFIED**.

The frame visibly proposes these regions/actions:
- shared Admin navigation and current Business card;
- page heading, explanatory text, `Exportar` and `+ Nuevo cliente` actions;
- four summary cards: registered customers, recurring customers, new this month, and customers without recent purchases;
- a customer-activity callout with `Ver clientes`;
- directory toolbar with search across name/email/phone, a status filter, activity-based sort, record count and pagination;
- columns for customer, contact, purchases, total purchased, last purchase, status and row actions;
- a selected-customer summary panel and a recent-purchases panel.

**Critical data boundary:** displayed figures (e.g. 1,284 customers, 342 recurring, 86 new, 73 without recent purchases), names, purchase counts, currency values, timestamps and statuses are mock content in the frame. They are not verified database values or approved business definitions. Do not ship these as constants or seed production data. Every card/column must either be backed by an approved query/contract or removed/marked as illustrative.

| Visible B10 feature | Current AS-IS evidence | Classification / next spec decision |
|---|---|---|
| Customer list and contact fields | Existing `ClientesPage` renders name, loyalty level, email, phone and Edit action. | Partial overlap; define approved columns and row action. |
| Name/email search | Existing debounced search uses `GET /clientes?search=...`. | Existing behavior; UI copy can mention only fields the backend actually searches. |
| Phone search | Not supported by the inspected service's search predicate. | **Contract gap**; either extend spec/backend deliberately or remove phone from search placeholder. |
| Active/inactive filter | No filter contract evidenced in the inspected endpoint/page. | **Contract gap**; define status semantics before implementing. |
| Purchases / total purchased / last purchase | The customer domain has sales/orders relations and loyalty computation, but the inspected list page does not display these metrics. | **Contract gap**; define status inclusion, currency, time zone, returns/cancellations and aggregation rules before calculating. |
| Four summary cards and activity callout | No corresponding summary contract evidenced in the inspected page/service. | **Contract gap**; define formulas, period boundaries, empty states and query performance, or remove. |
| Customer detail + recent purchases | API `GET /clientes/:id` exists; inspected Admin component only exposes an edit form and does not render a detail/history panel. | **UI and data-contract gap**; decide scope and permission before implementing. |
| Export | No export action is present in the inspected component. | **Contract gap**; define columns, permission, row limits and tenant scope if retained. |
| Pagination and activity sort | No pagination/sort contract evidenced; search query has a limit of 50 when a term is supplied. | **Contract gap**; define stable ordering, cursor/page semantics and total count before implementing. |
| Customer status / loyalty | Prisma `Cliente.activo` exists, while the service independently derives loyalty `NUEVO` / `FRECUENTE` / `VIP`; the current list UI displays the loyalty level, not `activo`. | The mockup's status column mixes labels that may represent two different axes (e.g. Activo/Inactivo vs. Nuevo). Define separate status and loyalty semantics; never map `NUEVO` to an inactive/active state. |

**B10 recommendation:** do not implement all visible elements as one batch. First reconcile the list/search contract and visible row fields with the current Customer domain. Treat metrics, export, activity feed, purchase-history panel, status filter and pagination as separate candidate capabilities with independent acceptance criteria. A visual element that lacks an approved data contract is an open decision, not permission to invent one.

### 6.3 B11 — Proveedores visual consistency findings

**Visual source inspected:** B11 frame screenshot at 1440×1100 (rendered preview 1024×783), node `2055:2`. This is a content/design review, not an implementation review.

The frame reuses the B10 Admin shell and proposes a supplier directory, summary cards, supplier follow-up callout, status filter, sorting, supplier profile and recent orders. However, several content elements appear copied from the customer screen and are inconsistent with the supplier domain:

- the callout still says **73 customers** without purchases and uses customer-oriented wording;
- rows include person/customer-style entries (e.g. customer names and loyalty-like states) mixed into the supplier directory;
- repeated purchase amounts, counts and activity timestamps appear to be reused from the customer mockup;
- the supplier screen shows financial/account metrics (e.g. pending debt / purchases) without a defined Supplier/Purchase/Accounts Payable calculation contract.

These are **design defects / mock-data inconsistencies**, not approved business rules. Before B11 can become an implementation spec:
1. replace customer-oriented copy with supplier-specific language;
2. use coherent supplier examples and distinguish supplier contact status from customer loyalty status;
3. define what “saldo”, “compras”, “facturas pendientes” and “altas este mes” mean, their currency/time window and authoritative sources;
4. confirm which supplier actions are supported by existing endpoints and permissions;
5. record unsupported controls as out-of-scope or a separately approved capability.

The screen's visual shell can be reused; its content and metrics must not be accepted by template inheritance alone.


### 6.4 Visual audit — B12–B17 (2026-10-21)

**Review status:** visual defects recorded; target behavior and business contracts remain open. The screenshots are design evidence only. No claim is made about production behavior or underlying API correctness.

#### Cross-screen template contamination

B12–B17 repeat the same banner copy about “73 clientes sin compras en los últimos 60 días”, despite representing deliveries, cash, finance, reports, business configuration, and team/permissions. Several screens also reuse the same six person/customer rows, initials, contact details, status badges, and purchase-like amounts in semantically unrelated tables. This is a design-system/content defect, not evidence of real business data.

#### Per-screen findings

| Frame | Observed design defect | Contract required before implementation |
|---|---|---|
| B12 — Entregas | Delivery planner rows mix order/customer labels, addresses, item counts and monetary amounts under ambiguous columns; generic customer-repurchase banner is unrelated to fulfillment. | Define delivery aggregate and order relation, delivery lifecycle/status transitions, address source, assigned courier, time window, incident semantics, item count vs order value, filters, export and scheduling command. |
| B13 — Caja | “Movimientos recientes” rows resemble customer/order rows rather than cash movements; columns and values do not align (e.g. address-like text under concept, counts under amount); customer banner is unrelated. | Define cash session/open-close lifecycle, movement types, payment method, signed amount/currency, opening balance, reconciliation and cash difference, permissions, idempotency, and audit trail. |
| B14 — Finanzas | Financial KPIs and accounts-receivable amount are shown without formulas/source definitions; transaction rows reuse order/customer data and do not align with financial columns. | Define recognized income/expense, period boundaries, net result, accounts receivable, currency, refunds/voids, settlement status, source-of-truth entities and export semantics. Do not treat order totals as cash or recognized revenue by default. |
| B15 — Reportes | KPI cards lack explicit formula/source/window contracts; indicator table reuses order/customer-like rows; export action is not scoped to a report or selected filters. | Define each metric's identifier, formula, grain, period/timezone, filters, comparison baseline, empty/partial-data behavior, authorization and export format/scope. |
| B16 — Configuración del negocio | “Información general” contains customer-like records, purchase counts and spending; summary cards mix business identity/preferences with unrelated operational metrics. | Define editable business profile fields, validation, business-brand vs platform design-system boundary, operational preferences, permissions, save/cancel/error behavior and audit history. Do not infer fiscal or legal fields from the mockup. |
| B17 — Equipo y permisos | User/role table contains customer-like contacts and purchase-like quantities/amounts under modules, permissions and last access; summary/banner copy is reused from other modules. | Define User vs Membership identity, tenant membership lifecycle, invitation/expiry/revocation, role/permission assignment, suspension/reactivation, last-access provenance, self-lockout prevention and authorization/audit requirements. UI visibility must never replace backend authorization. |

#### Shared visual acceptance requirements

- Every KPI, banner, table column, status and activity panel must describe the screen's own domain and have a defined source/meaning; otherwise remove it or mark it as explicit placeholder content.
- Use internally coherent fixture data for each screen. Do not reuse customer/order rows to represent cash movements, financial transactions, settings, reports or memberships.
- Labels, units and values must agree (e.g. amount columns contain monetary values; item-count columns contain counts).
- Define loading, empty, error, forbidden, stale/conflict and success states for the relevant actions.
- Export, create, schedule, invite and save controls are proposed affordances only until their action contracts and authorization are approved.
- Do not derive real balances, financial outcomes, user permissions or business status from decorative mock data.

### 6.5 B18 — Profile and account review status

**Superseded status note:** the initial inventory pass could not visually inspect B18 because the Figma tool quota was reached. The later visual audit in §6.6 reviewed the frame and recorded its defects. Visual inspection does not verify implementation or approve its behavior; B18 remains not implementation-ready pending reconciliation against authentication/account contracts.




### 6.6 Visual audit — B18 Profile and account (2026-10-21)

**Review status:** screenshot visually inspected; design defects recorded. Repository AS-IS comparison is source inspection only. No runtime visual equivalence or test pass is claimed.

#### Visual findings

- The banner says “Tenés 73 clientes sin compras en los últimos 60 días” and links to clients, unrelated to account security.
- The account table repeats customer names/contact data, purchase counts, monetary amounts and customer lifecycle statuses under columns for section, detail, method, configuration, update and status.
- The summary cards mix initials/profile data, “2FA”, “3” active sessions and “OK” verification, but no source/contract is shown for MFA enrollment, session enumeration or verification state.
- The bottom “Mi perfil” and “Actividad de la cuenta” panels show customer purchase/spending and order history, not account identity or security events.
- “Exportar” and “Editar perfil” are visual affordances only; the screenshot does not define their data scope, permissions, endpoint, or success/failure behavior.

#### AS-IS comparison

Repository sources inspected: `apps/pos-admin/src/App.tsx`, `apps/pos-admin/src/features/profile/ProfilePage.tsx`, `apps/pos-admin/src/features/auth/AuthContext.tsx`, and `docs/WAPSELL-DOCUMENTATION/04-ASIS/09-ASIS-UI.md`.

- Current Admin route is `/profile` and renders `ProfilePage`; the documented route is functional.
- `ProfilePage` is explicitly read-only by decision; its own comment states there is no `PATCH /usuarios/me` endpoint. It renders the authenticated profile fields available in `PerfilUsuario`, including name, email, business name, login method, photo when available, and account creation date.
- `AuthContext` supports password login and Google callback session completion, stores tokens/user in local or session storage according to the remember-me choice, and refreshes the cached profile via `GET /auth/me` on mount when a token exists.
- This pass did **not** verify multi-factor authentication, active-session listing/revocation, account verification status, editable profile fields, or account-activity audit feed as implemented capabilities. Do not infer these from the Figma cards.
- The Figma design is not equivalent to the current profile page: it proposes additional account/security capabilities and contains copied customer-domain content.

#### Required contract before implementation

1. Distinguish global User identity from active Business membership/context; do not expose business-scoped or customer-scoped data as personal account data.
2. Define editable fields and whether profile remains read-only; any mutation requires explicit owner decision, endpoint, validation, authorization, and audit behavior.
3. Define MFA enrollment/state and recovery semantics only if approved and supported; otherwise remove the “2FA” metric.
4. Define session inventory/revocation semantics only if approved and supported; otherwise remove active-session counts.
5. Define account verification source/state and account-activity event taxonomy; do not fabricate status or events.
6. Remove the customer-repurchase banner, customer rows, purchase/spending panels and customer statuses; replace them with profile/security data backed by defined contracts or omit them.
7. Define export scope and authorization, or remove the action.
8. Preserve current authentication/session security invariants and explicitly define loading, error, unauthorized and stale-session states.


### 6.7 Repository AS-IS cross-check — B12–B17 (2026-10-21)

**Source checked:** `docs/WAPSELL-DOCUMENTATION/04-ASIS/01-ASIS-PRODUCT.md` (evidence classification in that artifact: VERIFIED BY CODE + VERIFIED BY EXECUTION for the listed implemented flows), `apps/pos-admin/src/App.tsx`, `apps/pos-admin/src/features/caja/CajaPage.tsx`, `apps/pos-admin/src/lib/api.ts`, `packages/shared-types/src/index.ts`, and `apps/api/prisma/schema.prisma`. This was a repository/code inspection, not a new local test run.

| Frame | AS-IS evidence found | SDD consequence |
|---|---|---|
| B12 — Entregas | The `Entrega` Prisma model exists and relates 1:1 to `Pedido`, with preparer/courier identifiers; the AS-IS product inventory explicitly says there is no `apps/api/src/entregas/` module/controller/service. | Treat the delivery screen as a TO-BE proposal. Define the lifecycle, commands, authorization and delivery/pedido contract before implementation; do not equate a schema model with a working feature. |
| B13 — Caja | The repository documents an implemented cash flow: opening, movements, count/reconciliation, dual confirmation for handover, exception authorization above a threshold, and closing. Admin code includes `CajaPage`; shared API types and client include `EstadoCajaResponse` and calls such as `GET /caja/estado` and `POST /caja/apertura`. | The Figma table is not a reliable description of the current cash contract. Reconcile each KPI, column, movement type and action against the existing cash API and state machine; preserve the documented double-confirmation and exception-authorization invariants. |
| B14 — Finanzas | The AS-IS inventory explicitly states current-account/debt collection is not implemented: `CuentaCorriente`, `Deuda` and `AplicacionPago` exist in Prisma but have no service using them. No financial-reporting contract was verified in this pass. | Do not present accounts receivable, net result or a generic financial ledger as existing capability. Separate operational cash movements from recognized income/expenses and receivables; mark unresolved accounting semantics as decisions/contracts required. |
| B15 — Reportes | The AS-IS inventory identifies `/reports` as the literal placeholder `Reportes - En desarrollo`. | All cards, indicators, trends, filters and exports in B15 are proposed functionality, not current implementation. |
| B16 — Configuración del negocio | The AS-IS inventory identifies `/settings` as a placeholder. The Figma frame's mixed customer/purchase rows do not define business settings. | Treat fields, save operations, brand configuration and preferences as proposed. Reconcile the business-profile boundary and CON-012 before implementation. |
| B17 — Equipo y permisos | Canonical `Membership` and `BusinessContext` infrastructure exists; `MembershipService` is documented as read-only and resolves canonical memberships. This does not establish a complete Admin user/role/permission management feature. | Keep membership resolution distinct from membership administration. Invitation, role mutation, suspension, permission editing, audit and self-lockout behavior require explicit contracts; no implementation claim is made for those actions. |

#### Code-review limitations

- This pass did not execute the application's test suites, run the app, query the live database, or validate the Figma-to-code visual match.
- The AS-IS inventory is used as an indexed source of evidence; individual implementation details should be re-opened and tested before converting them into acceptance criteria.
- No API, schema or runtime code was changed by this audit.

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


## 10. Cross-domain contract reconciliation — prioritized work (2026-10-21)

This section records the next SDD work package accepted for execution. It reconciles the Figma proposals with existing evidence and canonical governance; it does not approve new requirements or authorize implementation.

### 10.1 B13 — Cash (first priority)

**Sources of authority:** `docs/WAPSELL-DOCUMENTATION/08-TOBE/04-CASH.md` (DRAFT — NOT APPROVED), canonical decision register `03-DECISIONS/00-DECISION-REGISTER.md`, Owner rulings OR-B2, and the AS-IS cash flow evidence.

- Preserve AS-IS evidence for opening, movements, count/reconciliation, dual confirmation on handover, exception authorization above the configured threshold, and closing.
- Do not derive a new TO-BE Cash state machine from the Figma table. The TO-BE Cash artifact explicitly leaves physical state-machine details, adjustment/reversal/compensation mechanics, Payment↔Cash effects, and sensitive-operation authorization details open.
- Treat Figma KPIs, movement rows, filters, and actions as untrusted mock content until mapped to existing API contracts and their source-of-truth definitions.
- Reconciliation output must distinguish: (a) current executable AS-IS behavior, (b) approved Owner rulings, (c) derived/candidate requirements, and (d) open implementation detail. Do not silently promote between categories.
- Required evidence before implementation: route/component and endpoint mapping, DTO/schema mapping, applicable invariant and authorization references, tests that exercise existing behavior, and a list of unresolved decisions. This is a documentation gate, not a demand to invent new contracts.

### 10.2 B12 — Deliveries / fulfillment (second priority)

**Authority:** Owner ruling and canonical decision register first; the current AS-IS product inventory is evidence that only the `Entrega` data model exists, with no delivery API module/controller/service or executable delivery flow.

- Treat the Figma screen as a TO-BE proposal, not as an existing feature.
- Record the already identified open conflict CON-025: lifecycle and fulfillment rules are not defined by the existing model.
- Before implementation, reconcile order ownership, fulfillment responsibility, assignment and reassignment, delivery status/transitions, failure/return handling, timestamps, proof of delivery, tenant authorization, and audit requirements against canonical decisions. These are topics to resolve, **not states or fields approved by this document**.
- Do not add fields, enums, endpoints, transitions, or Prisma migrations based on the mockup alone.

### 10.3 B14 — Finance (third priority)

- Keep operational cash movements, payment records, recognized income/expense, and accounts receivable as distinct concepts unless an approved contract defines their relationship.
- AS-IS inventory states that current-account/debt collection is not implemented even though `CuentaCorriente`, `Deuda`, and `AplicacionPago` models exist.
- The design's totals, net-result indicators, balances, trends, and row values have no verified formula/source contract in this pass. Do not implement or present them as real financial data.
- Identify the needed accounting/business rulings, source entities, time-period semantics, currency handling, refunds/returns treatment, and authorization before defining API/UI behavior.

### 10.4 B15–B16 — Reports and business settings

- `/reports` and `/settings` are explicit AS-IS placeholders; Figma does not change this status.
- For reports, specify each metric's formula, source, grain, timezone/window, filters, treatment of incomplete data, export semantics, and authorization before implementation.
- For settings, identify the canonical Business-owned fields and branding authority from approved decisions. CON-012/design-token hierarchy remains a governance dependency; do not add business/legal fields or settings based only on the frame.
- Until these contracts are approved, retain the UI status as proposed/unimplemented.

### 10.5 B17–B18 — Team, permissions, profile and account

- Separate global User identity, Business Membership/context, and Customer identity; never infer their equivalence from a Figma row.
- Membership/context resolution in the current code does not prove that membership invitations, role mutation, permission editing, suspension, session revocation, MFA, account verification, or security-event history are implemented.
- Keep B18's current `/profile` read-only behavior as AS-IS evidence. Editing, export, MFA, active-session count/revocation and verification indicators require explicit product decisions and backed contracts before implementation.
- Server-side tenant isolation and authorization remain mandatory; navigation visibility is not an authorization control.

### 10.6 Cross-screen acceptance gate

A screen is not implementation-ready until all applicable conditions are satisfied:

1. Every KPI, banner, column, status, activity item, and action has a defined domain meaning and authoritative source.
2. UI fields/actions map to an approved requirement and a documented API/domain contract, or are explicitly removed from scope.
3. Business context, tenant isolation, identity type, and authorization are explicit and enforced server-side.
4. Loading, empty, error, stale-session, unauthorized, and mutation-result states are specified where applicable.
5. Tests are mapped to acceptance criteria; execution evidence is reported separately from test existence.
6. Open Owner decisions and implementation details remain marked OPEN; no guessed states, permissions, accounting formulas, schema changes, or endpoints are introduced.

**Current outcome:** the prioritized reconciliation is documented. It is not an approval of the target screens, a closure of CON-012/CON-025, or an authorization to implement. The PR remains documentation-only.


### 10.7 B13 — Cash contract reconciliation detail (source inspection, 2026-10-21)

**Code evidence inspected:** `apps/pos-admin/src/features/caja/CajaPage.tsx` (blob `ead925e2c632fd7a8d0ea312fd8aeafefe4ac018`), `apps/pos-admin/src/lib/api.ts`, `packages/shared-types/src/index.ts`, `docs/WAPSELL-DOCUMENTATION/08-TOBE/04-CASH.md`, and canonical Owner decision artifacts. This was read-only source inspection; no app execution, DB query, or test run occurred.

#### Existing AS-IS flow evidenced in the UI

The current `CajaPage` explicitly describes and implements the operational sequence:
1. Open cash with an opening amount.
2. Register manual movements using the existing types `Ingreso`, `Egreso`, `Gasto`, `Retiro`.
3. Count/reconcile cash.
4. For handover, require confirmation by the outgoing and incoming users.
5. If the count requires exception authorization, request the authorizer's email and password (not the active session credentials) before enabling close.
6. Close cash only through the permitted flow; the page comment explicitly states there is no force-close path that bypasses authorization.

The page loads current cash state and user summaries, and loads movements only when a current opening exists. The API client/shared types expose the existing cash contract (including `EstadoCajaResponse`, `MovimientoCaja`, `RegistrarArqueoRequest`, `ArquearCajaResponse`, `ArqueoCaja`, and `CierreCaja`). This list describes code-level evidence, not a fresh runtime verification.

#### B13-to-AS-IS reconciliation

| Figma element | Evidence / mismatch | Required disposition |
|---|---|---|
| Summary cards and totals | The mockup's displayed metrics have no verified mapping to the existing cash response or a documented calculation source. | Do not implement or label them as real until each formula and source field is mapped. |
| Recent movements/table | Current API/UI movement types are the established manual types above; Figma rows/columns are not evidence of extra movement categories or accounting effects. | Map every column to the existing movement response and keep unsupported categories/actions out of scope. |
| Close / count actions | Existing flow includes count and gated close, including dual confirmation and exception authorization. | Preserve those controls; never infer a bypass or single-user shortcut from the mockup. |
| Authorization | The current UI asks for authorizer credentials when the backend reports authorization is required. The canonical role/permission catalogue and some sensitive-operation details remain open. | Preserve the existing server decision and credential check. Do not invent role names, permission codes, thresholds, or client-only authorization. |
| State labels / filters | AS-IS UI and the draft TO-BE artifact are not authority to add physical cash states. The TO-BE Cash document explicitly leaves a formal state machine open. | Use only states already returned by the current API for the current screen; any new TO-BE state requires a canonical decision and contract. |
| Exports / analytics / audit affordances | No verified contract for Figma-only export, analytics, or expanded audit actions was established in this pass. | Treat as unimplemented proposals until scope, authorization, endpoint and acceptance criteria are approved. |

#### Invariants to preserve in any future implementation

- A UI affordance must not bypass backend authorization or state checks.
- Cash handover retains dual confirmation (outgoing + incoming user).
- A cash count requiring authorization cannot be converted into a force-close path.
- Authorization must not be simulated by hiding/disabling a button; the server remains authoritative.
- A Cash screen must not conflate a cash movement with a recognized accounting result or an accounts-receivable balance without an approved relationship contract.
- Business/tenant context and server-side isolation must remain enforced.

#### Open decisions and evidence boundary

The TO-BE Cash artifact remains **DRAFT — NOT APPROVED**. The following remain open and must not be filled from Figma: formal TO-BE state machine; adjustment, reversal and compensation mechanics; Payment↔Cash effects; permission catalogue and disputed sensitive-operation rule; and any new metrics or exports. Existing AS-IS behavior is not itself approval of a future multi-tenant contract.

**Outcome:** the B13 reconciliation is more specific and traceable, but the frame remains **NOT IMPLEMENTATION-READY**. No application code, schema, endpoint, migration, or test was changed or executed.


### 10.8 B12 — Delivery / fulfillment contract reconciliation detail (source inspection, 2026-10-21)

**Sources inspected:** `apps/api/prisma/schema.prisma` (blob `491afab53626870334979d23d89ec40884145e80`), `docs/WAPSELL-DOCUMENTATION/04-ASIS/01-ASIS-PRODUCT.md`, `docs/WAPSELL-DOCUMENTATION/04-ASIS/06-ASIS-MODULES.md`, `docs/WAPSELL-DOCUMENTATION/02-DISCOVERY/CONFLICTS/04-STATE-CONFLICTS.md`, and `docs/WAPSELL-DOCUMENTATION/03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`. Read-only inspection only; no app execution, database query, or test run.

#### Verified model surface — not proof of an executable feature

The current Prisma `Entrega` model contains:
- `id`, `empresaId` and a relation to `Empresa`;
- `pedidoId` marked unique, so the current schema expresses one `Entrega` per `Pedido`;
- optional `preparadorId` and `repartidorId` relations to `Usuario`;
- nullable free-text `resultado` with a comment listing “Entregado, Fallida, Cancelada”;
- nullable `medioCobro` and `fechaEntrega`, plus timestamps.

These are schema facts only. They do **not** establish valid transitions, who may assign or update a delivery, what constitutes proof of delivery, how a failure is retried, whether cancellation is permitted, whether multiple attempts are represented, or how cash collection at delivery affects Payment/Cash. The free-text comment is not an approved state machine.

The AS-IS product and module inventories state that no `apps/api/src/entregas/` module/controller/service or executable delivery flow exists. Therefore B12 is a proposed target screen, not an existing operational capability.

#### Canonical decision boundary

The state-conflict inventory identifies **CON-025** as unresolved: define the complete lifecycle of Fulfillment and Deliveries. The Owner decision closure further states:
- Repartidor is excluded as an MVP Membership Role (`FUTURE / OPEN`); this does **not** resolve D-016.
- D-016 (Business management of fulfillment/repartidores) and REQ-FUL-003 remain **OPEN OWNER DECISION** and are not promoted.
- D-016's open state means the design cannot assume that a courier is a Business Membership, an external identity, an employee, or a separately managed actor.
- The canonical precedence is Owner ruling → Decision Register → canonical spec → TO-BE → audit/workshop/historical evidence. The Figma mockup and the schema comment cannot overrule that authority.

#### B12 field/action disposition

| Candidate element | Current evidence | Required disposition |
|---|---|---|
| Delivery/order association | Schema has a unique `pedidoId` (one-to-one at present). | Do not design multi-delivery-per-order behavior without a decision/schema change approval. |
| Delivery status | Nullable free-text `resultado`; three example strings appear only in a comment. | Do not treat those strings as approved states or define transitions from them. Resolve CON-025 first. |
| Preparer/courier assignment | Optional IDs reference `Usuario`. D-016 and the Repartidor Membership Role remain open/future. | Do not infer role, identity type, invitation flow, assignment authority, reassignment or eligibility rules. |
| Address / delivery window | No such fields were established from the inspected `Entrega` model. | Identify the authoritative address and scheduling source before specifying UI fields; do not add fields from Figma alone. |
| Item count / order amount | The design mixes counts and monetary values in ambiguous columns. | Source each value from an approved Order/line-item contract and label units explicitly; never treat item count as currency or infer delivery totals. |
| Failure / cancellation / retry | The schema comment mentions “Fallida” and “Cancelada” but defines no recovery flow. | Resolve retry, cancellation, rescheduling, return-to-stock/order consequences and audit requirements before state or endpoint design. |
| Proof / timestamp | `fechaEntrega` exists; no proof-of-delivery contract was verified. | Do not infer signature, photo, geolocation, recipient identity or completion evidence from a timestamp. |
| Cash collected at delivery | `medioCobro` comment says “Si se cobra al entregar”; Payment↔Cash effects remain open in the Cash TO-BE artifact. | Do not infer payment capture, cash movement, settlement, or order completion effects. Reconcile with approved Payment/Cash contracts. |
| Export / bulk actions | No delivery controller/service or contract was verified. | Treat as unimplemented proposals; require explicit scope, authorization, endpoint and acceptance criteria. |

#### Required decision/specification sequence

1. Resolve or explicitly retain as open the Owner decisions for D-016 / REQ-FUL-003 and CON-025.
2. Establish the delivery actor model and its tenant/identity boundary without assuming Repartidor is an MVP Membership role.
3. Specify lifecycle and permitted transitions, including failure/cancellation/retry, only after the relevant decisions.
4. Define the source of order address, item count, order value, assignment, schedule and completion evidence.
5. Reconcile collection-on-delivery with Payment and Cash semantics; do not use `medioCobro` as proof of a completed payment.
6. Map each approved command to authorization, tenant isolation, audit requirements, idempotency/concurrency behavior and testable acceptance criteria.
7. Only then decide whether schema migrations, API modules, UI actions or tests are needed.

**Outcome:** B12 is **NOT IMPLEMENTATION-READY**. No new states, endpoints, fields, migrations, roles or permissions are approved by this audit. No application code or tests were changed or executed.

### 10.9 B14 — Finance / accounts receivable reconciliation detail (source inspection, 2026-10-21)

**Sources inspected:** `apps/api/prisma/schema.prisma` (blob `491afab53626870334979d23d89ec40884145e80`), `docs/WAPSELL-DOCUMENTATION/04-ASIS/01-ASIS-PRODUCT.md`, `docs/WAPSELL-DOCUMENTATION/03-DECISIONS/00-DECISION-REGISTER.md`, and `docs/WAPSELL-DOCUMENTATION/08-TOBE/04-CASH.md`. The candidate finance TO-BE path was not present at the inspected location. This was source inspection only; no database query, runtime execution, or test run.

#### Verified schema surface — not an implemented finance capability

- `CuentaCorriente` is associated with `Empresa` and `Cliente`, has a decimal `saldo`, and a uniqueness constraint on `[empresaId, clienteId]`.
- `Deuda` is associated with `Empresa` and `Cliente`, optionally references `Venta` and `CuentaCorriente`, and stores `montoTotal`, `montoPendiente`, and optional `fechaVencimiento`.
- `AplicacionPago` relates a `Pago` to a concrete `Deuda`, records `montoAplicado`, and has a uniqueness constraint on `[pagoId, deudaId]`.
- `Pago` has `empresaId`, optional `ventaId`, optional `deudaId` referencing `CuentaCorriente`, `monto`, `medio`, `estado`, `comision`, and optional cash/transfer-specific fields.
- `MovimientoCaja` records `tipo`, `monto`, optional `referenciaId` and timestamps. The schema comment lists operational categories such as `Venta`, `DeudaCobro`, `Gasto` and `Retiro`.

The AS-IS product inventory explicitly states that current-account/debt collection is **not implemented**: the `CuentaCorriente`, `Deuda`, and `AplicacionPago` models exist, but no service uses them. Schema relationships and comments are not evidence of working posting, aging, balance calculation, allocation, or reporting behavior.

#### Canonical decision boundary

- **D-012** conceptually approves Business-scoped Accounts Receivable: an unpaid or partially paid sale may create a receivable associated with the Customer; the system should support pending balances, later collections, allocation to debts, traceability, and customer balance inquiry. The detailed debt model, allocation rules, statuses and credit rules remain open.
- **D-011** conceptually approves external payment gateways, with Mercado Pago prioritized behind a provider abstraction. API, checkout, webhooks, credentials, idempotency and reconciliation remain open details.
- The Cash TO-BE document explicitly leaves unresolved whether external gateway payments create cash movements and whether payment reconciliation and cash reconciliation are the same process. Do not collapse these into one ledger or infer automatic cash postings.
- Canonical precedence remains Owner ruling → Decision Register → canonical spec → TO-BE → audit/workshop/historical. Figma values and schema comments cannot resolve open decisions.

#### B14 metric and operation disposition

| Candidate element | Evidence / unresolved contract | Required disposition |
|---|---|---|
| Accounts receivable total / customer balance | `CuentaCorriente.saldo` exists; no service or authoritative balance-update contract was verified. | Do not display schema values as operationally correct balances. Define ledger/source of truth, balance invariants and reconciliation. |
| Debt rows / outstanding amount | `Deuda.montoTotal` and `montoPendiente` exist; lifecycle, due/overdue semantics and update rules remain open. | Specify creation, partial collection, settlement, cancellation/credit adjustment and overdue rules before UI/API contracts. |
| Payment allocation | `AplicacionPago` links payment and debt with `montoAplicado`; no execution flow was verified. | Define allocation constraints, partial/multiple-debt handling, overpayment, reversals and transaction atomicity. |
| Financial income / expense / net result | No approved formula, recognition basis, period boundary or source aggregation was verified. | Do not derive financial KPIs from order totals or cash movements. Define accounting semantics, timezone, currency, refunds/voids and inclusion rules. |
| Payment status / settlement | `Pago.estado` exists; D-011 implementation details remain open. | Define provider lifecycle, idempotency, webhook trust and reconciliation before reporting payment as approved/settled. |
| Cash movement | `MovimientoCaja` is an operational cash record, not by itself recognized revenue, payment settlement or a receivable ledger. | Preserve separation among Payment, Cash, recognized income/expense and AR. Define any cross-domain effects explicitly. |
| Export / period filters | No finance reporting endpoint/contract was verified. | Treat export and filters as proposed; define permissions, row scope, pagination, currency/rounding and acceptance tests. |
| Tenant and customer scope | Schema associates records to a Business and Customer; no AR service authorization was verified. | Require server-side BusinessContext/tenant isolation for every read/write; Customer and User remain distinct entities. |

#### Required decision/specification sequence

1. Preserve D-012's conceptual scope while explicitly resolving open implementation details for debt lifecycle, balance calculation, collection and allocation.
2. Define the authoritative source for outstanding balances and invariants connecting `CuentaCorriente.saldo`, `Deuda.montoPendiente`, `Pago` and `AplicacionPago`.
3. Define payment state transitions, external provider callbacks, idempotency, reversals and reconciliation under D-011.
4. Decide if/when a payment, debt collection, refund or expense creates a `MovimientoCaja`; do not infer a one-to-one relation from similar labels.
5. Define finance KPI formulas, period/timezone/currency semantics, and export behavior.
6. Specify tenant authorization, audit trail, atomicity and concurrency guarantees, then map approved criteria to tests.
7. Only after approval, determine the API/service, schema migrations, UI and tests required.

**Outcome:** B14 is **NOT IMPLEMENTATION-READY**. The conceptual AR/payment scope is recorded separately from the still-open execution contract. No financial formulas, posting rules, states, endpoints, permissions or migrations are approved by this audit. No application code or tests were changed or executed.

### 10.10 B15 — Reports / analytics reconciliation detail (source inspection, 2026-10-21)

**Sources inspected:** `docs/WAPSELL-DOCUMENTATION/04-ASIS/09-ASIS-UI.md`, `docs/WAPSELL-DOCUMENTATION/04-ASIS/01-ASIS-PRODUCT.md`, `docs/WAPSELL-DOCUMENTATION/03-DECISIONS/00-DECISION-REGISTER.md`, and the current Prisma schema `apps/api/prisma/schema.prisma` (blob `491afab53626870334979d23d89ec40884145e80`). Read-only source inspection; no application was started, no database query was run, and no tests were executed.

#### Verified AS-IS

- The AS-IS UI inventory explicitly identifies `/reports` as the literal placeholder `Reportes - En desarrollo`; no operational reports page was verified.
- The repository contains domain data models such as `Venta`, `Pago`, `MovimientoCaja`, and inventory/order entities, but their existence does not establish a report query, a reconciled metric, or a financial aggregation contract.
- The finance review above records that accounts-receivable collection is not implemented and that payment/cash/accounting semantics remain partly open. Report widgets must not paper over those gaps by aggregating similarly named fields.

#### B15 candidate element disposition

| Candidate element | Required evidence/contract before implementation |
|---|---|
| KPI card (sales, orders, customers, cash, net result, debt) | Stable metric ID, authoritative source, formula, inclusion/exclusion rules, currency and rounding, aggregation grain, business timezone, period boundaries, comparison baseline and empty/partial-data behavior. |
| Time-series chart | Approved time bucket and timezone, late-arriving/corrected data behavior, null periods, comparison rules and query-performance expectations. |
| Breakdown/ranking table | Defined dimension and grouping semantics, stable sorting, tie behavior, pagination and tenant-safe row scope. |
| Filters | Explicit allowed dimensions, defaults, date-window limits, combination semantics, timezone interpretation and server-side validation. |
| Export | Approved format, selected-filter scope, row/column policy, large-result behavior, authorization, auditability and sensitive-data treatment. |
| Refresh / activity indicator | Defined freshness SLA, source update cadence, loading/error states and indication when results are incomplete or stale. |
| Access control | Server-side BusinessContext/tenant isolation for every query and export; hiding a widget in the client is not authorization. |

#### Domain separation invariants

- Order volume is not necessarily confirmed Sale volume: D-007 distinguishes Order from Sale.
- D-008 requires explicit, consistent Sale confirmation/void effects; reports must not count a voided Sale as ordinary confirmed revenue without an approved metric rule.
- Cash movements are not automatically recognized income or expense; payment state, settlement, Cash and Accounts Receivable must remain distinct unless a canonical contract defines their relationship.
- Customer and User are distinct entities under canonical decisions; customer counts must state whether they count commercial Customer records, linked Users, or active-period buyers.
- No KPI should be inferred from the Figma sample values or the repeated “73 clientes sin compras” banner. Those are mockup content, not source evidence.

#### Required sequence

1. Inventory actual query/service capabilities and approved domain sources for each requested metric; classify unsupported metrics as unavailable rather than fabricate values.
2. Establish a metric catalogue with formula, source, grain, timezone, currency, filters, permissions and acceptance examples for every card, chart and table.
3. Resolve dependencies on Sale lifecycle, Payment, Cash and Accounts Receivable decisions before publishing financial metrics.
4. Define pagination, filtering, export, freshness and partial/error behavior; enforce BusinessContext server-side.
5. Map every approved metric and interaction to tests and performance/security criteria before implementation.

**Outcome:** B15 is **NOT IMPLEMENTATION-READY**. `/reports` remains a placeholder. No metric formula, report endpoint, export, permission or financial interpretation is approved by this audit. No application code or tests were changed or executed.

### 10.11 B16 — Business settings / brand boundary reconciliation (source inspection, 2026-10-21)

**Sources inspected:** `docs/WAPSELL-DOCUMENTATION/04-ASIS/09-ASIS-UI.md`, `docs/WAPSELL-DOCUMENTATION/04-ASIS/01-ASIS-PRODUCT.md`, `docs/WAPSELL-DOCUMENTATION/06-SPECIFICATIONS/CANONICAL/06-BRANDING-AND-EXPERIENCE-SPEC.md` (blob `d0fc776615d4ec9b7e19f8852e5a03ad08a479fb`), `docs/WAPSELL-DOCUMENTATION/03-DECISIONS/00-DECISION-REGISTER.md`, and `docs/WAPSELL-DOCUMENTATION/03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`. Read-only source inspection; no runtime, database or tests.

#### Verified AS-IS

- The Admin `/settings` route is explicitly a placeholder: `Configuración - En desarrollo`. No settings CRUD flow was verified.
- The Branding & Customer Experience Spec (`SPEC-BRAND-001`) is itself `DRAFT — INTEGRATION BASELINE / OWNER REVIEW REQUIRED`. It says `Business` is the tenant boundary and `Brand` is the customer-visible commercial identity; it does not claim implementation conformance and does not close CON-012.
- D-004 establishes the conceptual direction of a canonical shared Design System with per-Business Brand configuration, but implementation details—configuration model, tokens, assets and customization limits—remain open.
- The canonical branding spec says the server resolves tenant context, permissions and published configuration; client theme state is presentation-only; missing/invalid brand data should fall back deterministically; visual branding must not alter prices, stock, order/payment state, permissions or tenant isolation. These are documented target constraints in a draft, not evidence that the current application implements them.

#### B16 proposed field/action disposition

| Candidate element | Required boundary / evidence before implementation |
|---|---|
| Business identity (public name, description, logo) | Define which canonical Business-owned fields already exist and where they are stored; do not add legal/tax fields from the mockup without an Owner decision. |
| Brand palette / tokens | Reconcile shared Design System Core versus Business Brand ownership under CON-012. Do not copy screenshot colors into canonical tokens or create a second competing token store. |
| Logo/banner/avatar assets | Define upload/storage, content validation, size/type limits, replacement/removal, failure handling and asset ownership. Do not assume the existing schema or storage supports these actions without code/schema evidence. |
| Preview / publish / revert | These are target behaviors described in a draft branding spec, not verified routes or services. Define draft/published version semantics, validation, rollback, concurrency and audit before authorizing implementation. |
| Storefront rendering | Server must resolve the active Business and its published Brand; client-supplied tenant IDs or theme values cannot authorize cross-tenant reads or writes. |
| Conversation greeting / tone | Brand expression cannot activate AI agents or automated replies by implication. Messaging/AI scope and operational behavior require their own approved contract. |
| Operational preferences | Define each preference and its owning domain, default, validation, effective time and impact. Do not mix cash, payment, fulfillment or inventory behavior into generic settings without domain decisions. |
| Save / cancel / reset actions | No mutation endpoint or settings API contract was verified. Specify request/response, validation, authorization, audit, optimistic-concurrency and error states before mapping UI actions. |
| Tenant access / role policy | D-006 requires identity + target Business + valid Membership + required authorization. Permission catalogue details remain open; no client-only gate or invented permission code is acceptable. |

#### Required reconciliation sequence

1. Keep CON-012 open until the shared design-system/token hierarchy, Business Brand ownership, canonical sources and derived contracts are reconciled and reviewed.
2. Inventory existing Business fields, brand-related persistence, asset storage, API routes and UI before proposing schema or endpoint changes; the `/settings` placeholder is not evidence of available CRUD.
3. Separate Business profile, published Brand, operational preferences and platform-level settings as distinct concerns with explicit ownership.
4. Define draft/publish/revert and safe fallback semantics, server-side tenant authorization, asset lifecycle and audit requirements.
5. Map approved requirements to acceptance tests covering tenant isolation, invalid/missing brand fallback, save failures, publication/version behavior and non-interference with commerce rules.
6. Only after approval determine whether schema, API, UI, migration and deployment work is authorized.

**Outcome:** B16 is **NOT IMPLEMENTATION-READY**. `/settings` remains a placeholder and CON-012 remains open. This audit does not approve fields, token values, asset workflows, endpoints, permissions, migrations or branding implementation. No application code or tests were changed or executed.

### 10.12 B17 — Team / Membership and permissions reconciliation (source inspection, 2026-10-21)

**Sources inspected:** `docs/WAPSELL-DOCUMENTATION/04-ASIS/09-ASIS-UI.md`, `docs/WAPSELL-DOCUMENTATION/04-ASIS/01-ASIS-PRODUCT.md`, `docs/WAPSELL-DOCUMENTATION/03-DECISIONS/00-DECISION-REGISTER.md`, `docs/WAPSELL-DOCUMENTATION/03-DECISIONS/21-OR-B2-OWNER-DECISION-CLOSURE-2026-10-03.md`, and `apps/api/prisma/schema.prisma` (blob `491afab53626870334979d23d89ec40884145e80`). Read-only source inspection; no runtime, database query or tests.

#### Verified architecture and AS-IS boundary

- Canonical decisions define `User` as global identity and `Membership` as the User↔Business relationship; a User may belong to multiple Businesses. `Customer` remains a separate commercial entity.
- D-005 and OR-B2-001 place roles and permissions on Membership, using the conceptual chain Membership → Role → Permission; the alternative Profile → Role → Capability → Overrides model is not adopted.
- OR-B2-002 requires conceptual checks for authenticated User, target Business, valid Membership and authorization by Role/Permission. A valid token alone is insufficient. OR-B2-003 defines ACTIVE/INACTIVE Membership conceptually; inactive membership cannot operate on that Business.
- OR-B2-008 names MVP Membership Roles: Owner, Admin, Vendedor and Gestor de Stock. Customer and Supplier are not Membership Roles; Repartidor is outside the MVP (`FUTURE / OPEN`). OR-B2-009 keeps Owner and Admin distinct. Permissions per role remain OPEN IMPLEMENTATION DETAIL.
- AS-IS inventory identifies a gap: Admin is not present in the AS-IS role model, and Supplier belongs to the legacy User model. This is not evidence of a complete team-administration UI.
- Prisma has `Membership`, `Permiso` and `UsuarioPermiso` models, but schema presence alone does not prove invite, role mutation, membership deactivation, permission administration, audit, or complete UI behavior. Full B17 actions were not verified in this pass.

#### B17 action disposition

| Candidate element | Required contract/evidence before implementation |
|---|---|
| Team member list | Define membership status, Business scope, role display, search and inactive/pending handling. Do not populate with Customer records or purchase metrics. |
| Invite member | Define identity lookup/creation, email uniqueness, invitation lifecycle/expiry, resend, acceptance, duplicate membership behavior and notifications. A Figma button does not prove an endpoint exists. |
| Assign/change role | Use only approved MVP role names; define actor authorization, role-assignment matrix and ownership-transfer rules. Permission details remain open. |
| Activate/deactivate | Respect conceptual ACTIVE/INACTIVE status; define transitions, authorization and effects on sessions and in-flight operations. |
| Fine-grained permissions | Canonical model is Role → Permission. The permission catalogue and per-role grants remain open; do not use Figma labels as permission codes or rely on client-side hiding. |
| Last access / activity | No source contract was verified. Define event source, timestamp meaning/timezone, retention and privacy before display. |
| Remove member / ownership | Define whether removal means deactivation, unlinking or deletion; preserve audit and data ownership. Specify last-Owner protection and self-lockout recovery before enabling destructive actions. |
| Audit trail | Define actor, target membership, Business, action, timestamp, outcome and retention; events must be server-produced and tenant-scoped. |
| Tenant authorization | Every read/write must derive target Business from authenticated active context and validate Membership plus permission server-side. Caller-supplied tenant IDs and UI visibility are not authority. |

#### Required reconciliation sequence

1. Reconcile legacy `Usuario.rol` / `UsuarioPermiso` behavior with canonical Membership → Role → Permission before changing role-management flows; do not assume the target model is fully migrated.
2. Inspect actual API controllers/services and tests for member listing, invitation, role mutation, activation/deactivation and audit; distinguish existing auth/context infrastructure from unverified administration capabilities.
3. Define the permission catalogue, role-grant matrix, invitation lifecycle, membership transitions, session effects and ownership safeguards.
4. Define tenant-scoped authorization and audit invariants for every command and query.
5. Map accepted criteria to tests for cross-Business isolation, inactive Membership denial, privilege escalation, invitation expiry/duplication, role boundaries and self-lockout/last-Owner protection.
6. Only after canonical reconciliation and approval determine whether API, UI, schema migration or deployment work is authorized.

**Outcome:** B17 is **NOT IMPLEMENTATION-READY**. Identity/Membership and authorization concepts exist, but complete team administration is not established. No invite flow, permission matrix, role mutation, endpoint, migration or test is approved by this audit. No application code or tests were changed or executed.

### 10.13 B18 — Profile and account reconciliation (2026-10-21)

Read-only source inspection of `ProfilePage.tsx`, `AuthContext.tsx`, `auth.controller.ts`, `auth.service.ts`, and Owner decision R8-ARCH-003. No runtime or tests executed.

- `/profile` renders a read-only profile page. Its source states that `PATCH /usuarios/me` does not exist.
- Existing fields: name, email, Business/company name, login method, photo when available, account creation date and permissions. No editable fields are implemented on this page.
- `GET /auth/me` queries the legacy `usuario` record. Password login and Google login return an access token and profile.
- `AuthContext` supports password login and Google callback completion; password login selects local or session storage according to “remember me”; mount-time refresh calls `api.me()` when a token exists; client logout clears browser storage. Google callback stores the token in local storage.
- Owner decision R8-ARCH-003 requires MFA for Owner/Admin but leaves its mechanism open and implementation unauthorized. Session/device management and related lifecycle details remain open.
- Current profile code uses legacy `Usuario`/`empresaId`. The canonical target is global User identity plus active Business context and valid ACTIVE Membership; the current profile response does not prove that migration is complete.

| B18 element | Disposition |
|---|---|
| Edit profile | Not supported; no `PATCH /usuarios/me` verified. Any mutation needs explicit decision, contract, validation, authorization, audit and tests. |
| MFA status | Required for Owner/Admin by decision, but current enrollment/state/enforcement were not established by inspected code. |
| Sessions/devices | Not verified; define data and behavior before displaying counts or controls. |
| Verification status | No authoritative source verified. |
| Account activity | No security audit feed verified. Do not substitute customer order history. |
| Export | Scope and authorization undefined; proposed only. |
| Logout | Client storage is cleared; server-side invalidation is not established. |
| Failure states | Define loading, stale profile, expired token, unauthorized response and failed refresh. |

Remove customer-repurchase banners, customer rows, purchase/spending figures and order history from B18. Use only account data backed by an approved contract. Map accepted criteria to tests before implementation.

**Outcome:** B18 is **PARTIALLY VERIFIED / NOT IMPLEMENTATION-READY**. Current profile/auth mechanics are evidenced; Figma edit/export, MFA status, session inventory, verification and account activity are not established capabilities. No code changes or tests were executed.
