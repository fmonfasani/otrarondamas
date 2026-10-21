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
| ADM-TEAM-001 | B17 — Equipo y permisos \| Admin Desktop | `2055:1160` | [Open B17](https://www.figma.com/design/NkBWFLCeQjPGfsk0cTNZ9D?node-id=2055-1160) | Membership / Roles / Capabilities | Candidate mapping only; detailed behavior NOT SPECIFIED |
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

These IDs identify candidate work only. They must be reconciled with the current Customer domain contract, existing Prisma schema, NestJS routes/services, role/capability decisions, conflicts, and tests before being approved. Do not create API endpoints or schema fields merely to match the mockup.

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
| Authorization | GET list/detail have no local `@RequirePermission` decorator; create/update require `clientes.gestionar`. Global auth and dossier guards also apply. | This is observed AS-IS, not approval of the final role/capability matrix. Reconcile list/detail visibility with the approved authorization design. |
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
| B17 — Equipo y permisos | User/role table contains customer-like contacts and purchase-like quantities/amounts under modules, permissions and last access; summary/banner copy is reused from other modules. | Define User vs Membership identity, tenant membership lifecycle, invitation/expiry/revocation, role/capability assignment, suspension/reactivation, last-access provenance, self-lockout prevention and authorization/audit requirements. UI visibility must never replace backend authorization. |

#### Shared visual acceptance requirements

- Every KPI, banner, table column, status and activity panel must describe the screen's own domain and have a defined source/meaning; otherwise remove it or mark it as explicit placeholder content.
- Use internally coherent fixture data for each screen. Do not reuse customer/order rows to represent cash movements, financial transactions, settings, reports or memberships.
- Labels, units and values must agree (e.g. amount columns contain monetary values; item-count columns contain counts).
- Define loading, empty, error, forbidden, stale/conflict and success states for the relevant actions.
- Export, create, schedule, invite and save controls are proposed affordances only until their action contracts and authorization are approved.
- Do not derive real balances, financial outcomes, user permissions or business status from decorative mock data.

### 6.5 B18 — Profile and account review status

B18 was not visually reviewed in this audit because the Figma MCP tool call quota was reached. Its screen content, fields, actions, session behavior and relationship between global User and active Business remain **NOT VERIFIED**. Do not treat it as reviewed or implementation-ready. Revisit the frame when Figma tool access is available and then reconcile it against authentication/account contracts.



### 6.6 Repository AS-IS cross-check — B12–B17 (2026-10-21)

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
