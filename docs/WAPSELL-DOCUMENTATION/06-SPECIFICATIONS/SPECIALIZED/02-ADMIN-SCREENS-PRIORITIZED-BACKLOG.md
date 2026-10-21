# Wapsell — Admin Screens Prioritized Implementation Backlog

**Status:** PROPOSED — OWNER / PRODUCT REVIEW REQUIRED  
**Date:** 2026-10-21  
**Scope:** Figma Admin screens B10–B18, reconciled against current source inspection  
**Baseline:** `main` at `0388abd95f498f3e3505c9b2f1c3716b5620a62a`  
**Authority:** Planning artifact only. This backlog does not approve open business decisions, schema changes, endpoints, permissions, migrations, deployment, or implementation.

## 1. Purpose and planning rules

This backlog turns the B10–B18 audit into dependency-ordered work items. Priority reflects risk and prerequisite value, not a promise that requirements are approved.

- **P0 — integrity/security prerequisite:** resolve before implementing affected mutations or presenting the data as authoritative.
- **P1 — core capability contract:** needed for a usable and trustworthy domain workflow.
- **P2 — screen capability:** implement only after the relevant domain contract is approved.
- **P3 — presentation/polish:** after functional correctness and source-of-truth contracts.
- **BLOCKED** means a decision, specification, or verified dependency is missing; it is not permission to invent the missing behavior.
- Existing code, schema presence, Figma controls, and a green unrelated CI run do not establish that a capability is complete.
- No production code or tests were changed as part of the audit that produced this backlog.

## 2. Recommended execution order

1. **P0 — Establish cross-screen authority:** reconcile legacy `Usuario/empresaId/UsuarioPermiso` with canonical `User/Membership/Business`, and publish the approved permission matrix and tenant invariants.
2. **P0 — Prevent misleading financial data:** remove or clearly label hard-coded dashboard metrics; define and test source/formulas before financial KPIs or reports are presented as real.
3. **P1 — Specify payment, cash, AR, and Sale lifecycle boundaries:** define posting/reversal/reconciliation rules and balance invariants before expanding finance.
4. **P1 — Specify Order/Fulfillment lifecycle:** settle operational states, actors, permissions, evidence/retry semantics, and domain side effects before building delivery actions.
5. **P1 — Close identity/team security decisions:** MFA for Owner/Admin, membership transitions/session effects, owner safeguards, and audit.
6. **P2 — Implement B17 team administration and B18 account security** on approved contracts, reusing verified invitation and membership endpoints.
7. **P2 — Implement B16 business settings/branding** after ownership, asset lifecycle, publish/revert, and tenant fallback rules are approved.
8. **P2 — Implement B14 Finance and B15 Reports** after finance ledger and metric contracts are stable.
9. **P2 — Implement B12 Deliveries and finish B13 Cash** after domain contracts are approved.
10. **P2 — Complete B10 Customers and B11 Suppliers** after focused controller/service/contract/test inspection and explicit lifecycle/permission decisions.
11. **P3 — Figma fidelity, empty/loading/error states, responsive behavior, and visual polish** after functional acceptance criteria pass.

## 3. Prioritized backlog

| ID | Priority | Screen / domain | Work item | Dependencies / gate | Acceptance evidence |
|---|---|---|---|---|---|
| ADM-001 | P0 | Cross-screen authorization | Reconcile legacy identity/permission path with canonical User → Membership → Business model. Identify which endpoints use each path and document migration boundaries. | Existing owner decisions and canonical decision register; no new auth model invented. | Endpoint inventory; documented authority per endpoint; tests for missing/inactive membership and cross-business access. |
| ADM-002 | P0 | B17 Team / permissions | Approve Role → Permission catalogue, role grants, actor matrix, owner/admin distinction, self-lockout and last-owner safeguards. | ADM-001; Owner approval required for open permission details. | Approved permission matrix; deny-by-default behavior; tests for privilege escalation, cross-tenant actions, self-suspension and last-owner cases. |
| ADM-003 | P0 | B14/B15 Finance and Reports | Mark hard-coded dashboard metrics as demo/static or remove them from any production-truth presentation. Define how demo data is distinguished from live data. | No business decision needed to avoid representing literals as live metrics; UI change requires implementation task. | Dashboard has no unlabelled hard-coded business KPIs; test or static check demonstrates metrics come from an API or carry explicit demo labeling. |
| ADM-004 | P0 | B14 Finance | Define authoritative balance invariants across CuentaCorriente.saldo, Deuda.montoPendiente, Pago and AplicacionPago. | D-012 conceptual scope; Owner/Finance approval of open lifecycle/allocation rules. | Approved invariants for partial collection, settlement, overpayment, reversal, concurrency and reconciliation; invariant tests specified. |
| ADM-005 | P0 | B12/B13/B14 | Define cross-domain effects among Sale, Payment, Cash, debt collection, cancellation, refund and expenses. | Sale/payment/cash decision reconciliation; do not assume one-to-one ledger entries. | Approved event/effect matrix specifying when records are created/reversed and which domain is authoritative; transaction/idempotency tests. |
| ADM-006 | P0 | B17/B18 security | Reconcile R8-ARCH-003 MFA requirement for Owner/Admin with actual enrollment, challenge, recovery, enforcement and session behavior. | Owner decision exists; mechanism and implementation authorization remain open. | Approved MFA specification; tests for bypass resistance, recovery, role enforcement and session invalidation. |
| ADM-007 | P1 | B12 Deliveries | Specify fulfillment state machine and actor model, including transition permissions, partial delivery, failed attempts/retries, evidence, timestamps and cancellation interaction. | Apply OR-B3-011 and R8-ORD-002; resolve open CON-025 and remaining implementation details. | Approved state-transition table and actor/permission matrix; each transition has preconditions, side effects, idempotency and tests. |
| ADM-008 | P1 | B13 Cash | Close open cash-count threshold/authorization decisions and define permission coverage for opening, movement, count, authorization and close. | D-05/D-06 and cash contract reconciliation. | Approved permission/effect matrix; tests for threshold boundary, authorization separation, concurrent close and cash count invariants. |
| ADM-009 | P1 | B14 Payments | Specify payment lifecycle, external provider boundary, idempotency, webhook trust, settlement and reconciliation; define manual payment limitations. | D-011 and Payments/Cash contract; external gateway remains out of scope until explicitly approved. | State diagram, provider callback trust model, duplicate/replay tests, reversals and reconciliation acceptance criteria. |
| ADM-010 | P1 | B15 Reports | Define stable metric catalogue: ID, formula, source, inclusion/exclusion, period/timezone, currency/rounding, aggregation grain, freshness and empty/error behavior. | ADM-004/005/009 for financial metrics; non-financial metrics may be specified independently. | Each KPI/chart/table maps to an approved metric definition and tenant-scoped query contract; aggregation tests. |
| ADM-011 | P1 | B16 Settings / Brand | Resolve CON-012: shared design tokens vs Business-owned Brand configuration, canonical fields, defaults/fallback, and published configuration authority. | Owner review of draft branding spec and decision register. | Approved ownership/token hierarchy and tenant-safe read contract; fallback and cross-tenant tests. |
| ADM-012 | P1 | B10 Customers | Inspect Customer controller/service/UI/API/tests and define customer lifecycle, Customer↔User optional link, tenant scope, list/search/pagination and permissions. | Canonical distinction Customer vs User; existing decisions; no conflation with Membership. | Evidence-backed AS-IS map; approved CRUD/read contract; tests for tenant isolation and Customer without User. |
| ADM-013 | P1 | B11 Suppliers | Inspect supplier/purchases implementation and distinguish legacy Supplier/Usuario identity from commercial supplier records. Define lifecycle, purchase relations, tenant scope and permissions. | Canonical Customer/User separation and purchasing domain contract. | Evidence-backed entity/source map; approved supplier operations; tests for tenant isolation and purchase linkage. |
| ADM-014 | P1 | B17 Team | Reconcile existing invitation endpoints and Membership suspend/reactivate endpoints with the target team workflow. Specify invite expiry/resend/duplicate/acceptance, role assignment, audit and session effects. | ADM-001/002; do not assume existing invitation flow is canonical Membership invitation. | Endpoint-to-screen traceability; approved invitation lifecycle; tests for expired/duplicate tokens, unauthorized role assignment and inactive membership. |
| ADM-015 | P1 | B18 Account | Define account/profile source of truth, editable fields, session/device inventory, logout invalidation, security activity and data export scope. | ADM-001 and ADM-006; existing profile remains read-only until approved. | API contract and privacy/authorization rules; tests for stale profile, expired token, logout/session revocation and unauthorized access. |
| ADM-016 | P1 | B16 Settings | Define asset upload/removal/validation and Brand draft → publish → revert/version lifecycle; separate Business profile, Brand, operational preferences and platform settings. | ADM-011; no schema or storage assumption without inspection. | API/schema design reviewed; limits and failure behavior specified; tests for invalid assets, failed saves, concurrency, rollback and tenant isolation. |
| ADM-017 | P1 | B14 Finance | Specify debt creation and lifecycle, due/overdue semantics, partial/multiple-debt allocation, overpayment, cancellation/credit adjustment and customer balance inquiry. | ADM-004 and D-012. | State/transition table; atomic allocation rules; tests for partial payments, overpayment, reversal, concurrency and balance reconciliation. |
| ADM-018 | P1 | B13/B14 | Decide whether cash payment without an open cash register should be rejected, recorded as exception, or handled another approved way. Current PaymentsService may register cash payment without a MovementCaja if no opening exists. | Owner decision spanning Payment and Cash. | Explicit behavior and operator-facing error/exception contract; tests proving no silent financial divergence. |
| ADM-019 | P2 | B17 Team UI | Build member list, invite, role change and suspend/reactivate UI only against approved endpoints and permission matrix. | ADM-001/002/014; API gaps closed first. | UI state and API integration tests; loading/error/empty states; forbidden actions remain denied server-side. |
| ADM-020 | P2 | B18 Account UI | Build account/security controls only for supported contracts; keep unsupported fields/actions absent or explicitly unavailable. | ADM-006/015; MFA/session API exists and is tested. | End-to-end tests for profile refresh, MFA status/actions, session revocation and failure states. |
| ADM-021 | P2 | B16 Settings UI | Implement Business profile and Brand editing/preview/publish/revert based on approved model and APIs. | ADM-011/016. | CRUD/publish E2E tests; tenant isolation; deterministic fallback; no effect on commerce calculations. |
| ADM-022 | P2 | B14 Finance UI | Implement receivables and payments views with authoritative balances and explicit statuses. | ADM-004/005/009/017/018. | Contract tests plus E2E for pending/partial/settled/reversed flows and totals reconciled against source records. |
| ADM-023 | P2 | B15 Reports UI | Implement reports, filters, charts and exports from approved metric catalogue. | ADM-010 and domain data contracts. | API aggregation tests; tenant-safe export tests; filter/timezone/currency cases; freshness and partial-data states. |
| ADM-024 | P2 | B12 Delivery UI | Implement fulfillment actions and timeline after state machine/API are approved. | ADM-007. | Transition E2E tests, role/tenant denials, retry/idempotency and no unintended Sale/Payment/Cash changes. |
| ADM-025 | P2 | B13 Cash UI | Align Caja UI with approved permissions, count threshold, authorization and cash/payment effect contracts. | ADM-005/008/018. | API + E2E tests for open/movement/count/authorize/close and reconciled expected cash. |
| ADM-026 | P2 | B10/B11 UI | Complete Customers and Suppliers screens against the approved domain contracts, preserving separate entity semantics. | ADM-012/013. | API/UI E2E, pagination/search, validation, permission denials and tenant-isolation tests. |
| ADM-027 | P3 | B10–B18 shared shell | Final Figma visual reconciliation: navigation, responsive layouts, accessible labels, loading/empty/error states and design tokens. | Relevant screen functional acceptance passes; approved Brand/Design System. | Frame-to-screen review checklist, accessibility checks, screenshot review and regression suite. |
| ADM-028 | P3 | B10–B18 observability | Define structured audit/operational events for sensitive financial, membership and brand mutations; avoid logging secrets/tokens. | Domain-specific audit contracts and privacy review. | Event schema, retention/PII rules, tests that sensitive secrets are excluded and actor/tenant attribution is present. |

## 4. Suggested first implementation slice

**Recommended first slice: ADM-003 — remove the false-live dashboard metric presentation.**

Why:
- The current `apps/pos-admin/src/features/dashboard/DashboardPage.tsx` hard-codes sales, ticket, customer and growth values.
- This can mislead operators even before finance/reporting is built.
- It is narrower than implementing a financial API and does not require inventing finance formulas.
- Safe options are to label the cards explicitly as demo data or replace them with a truthful empty/not-yet-connected state. Do not invent a live metric endpoint as part of this slice.

**Preconditions:** inspect current branch and working tree in the execution environment before editing; identify existing tests and route/API contracts. Implement the smallest safe change and add/update tests for the selected behavior. This backlog itself does not execute that code change.

## 5. Cross-cutting Definition of Ready

A screen/domain item is ready for implementation only when:

1. The source-of-truth decision and authority are identified.
2. AS-IS behavior and reusable code are verified.
3. Requirements, out-of-scope behavior and open decisions are explicit.
4. API contracts define request/response, errors, authorization and tenant scope.
5. Data invariants, transactionality, idempotency and concurrency are specified where relevant.
6. UI states include loading, empty, success, error and forbidden behavior.
7. Acceptance criteria map to automated tests.
8. Migration, compatibility and rollback needs are identified if schema changes are required.
9. No implementation is inferred solely from Figma or schema field names.

## 6. Validation and delivery policy

- Treat the priority ranking as proposed until Owner/product review.
- No business decision is closed by this document.
- No endpoint, permission code, state, field, schema migration or external integration is approved here.
- For each implementation PR, report local test evidence separately from CI evidence.
- Do not call a screen complete merely because it renders or its PR merges; verify its Definition of Done and cross-tenant/security tests.
- Revisit the backlog after focused B10/B11 source inspection and after any new Owner ruling.

## 7. Source references

- [Admin Web Figma Screen Specification](../06-SPECIFICATIONS/SPECIALIZED/01-ADMIN-WEB-FIGMA-SCREEN-SPEC-v0.1.md) — sections 10.8–10.13 cover B12–B18 reconciliation.
- [Commerce TO-BE](../08-TOBE/02-COMMERCE.md) — draft conceptual boundary; not an implementation contract.
- [PaymentsService](../../../../apps/api/src/payments/payments.service.ts) — current manual sale-payment scope and cash-register limitation.
- [SalesService](../../../../apps/api/src/sales/sales.service.ts) — current sales implementation.
- [Cash register service](../../../../apps/api/src/cash-register/cash-register.service.ts) — cash operations.
- [MembershipRevocationService](../../../../apps/api/src/membership/membership-revocation.service.ts) — membership suspension/reactivation.
- [InvitationsController](../../../../apps/api/src/invitations/invitations.controller.ts) — legacy invitation endpoints.
- [ProfilePage](../../../../apps/pos-admin/src/features/profile/ProfilePage.tsx) — current read-only profile.
- [DashboardPage](../../../../apps/pos-admin/src/features/dashboard/DashboardPage.tsx) — hard-coded dashboard cards.
