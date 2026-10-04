# WAPSELL — R5 CONTRACTS CANONICAL AUDIT
**Fecha:** 2026-10-03
**Estado:** AUDIT COMPLETE — RECONCILIATION REQUIRED
**Fase:** R5 — Contracts

> Auditoría del baseline contractual posterior a OR-B2, OR-B3 y R4. No crea decisiones, requisitos, invariantes, tests, schema, APIs, permisos técnicos ni implementación.

## 1. Fuentes
- Decision Register.
- OR-B2 Owner Decisions + Closure.
- OR-B3 Owner Decisions + Canonical Propagation.
- R4 Identity/Tenancy and Commerce reconciliation reports.
- R4 Inventory/Cash/Messaging TO-BE audit and reconciliations.
- Reconciled Identity/Tenancy and Commerce Specifications.
- TO-BE Inventory, Cash and Messaging.
- Existing files under `07-DESIGN/CONTRACTS/`.

## 2. Baseline
| Artifact | State |
|---|---|
| `BASELINE/00-R4-CONTRACTS-BASELINE-001-490.md` | DRAFT / NOT APPROVED |
| `DOMAIN/00-CONTRACTS-AUDIT-RECONCILIATION.md` | Previous audit; historical findings retained |
| Identity, Commerce, Inventory, Payments/Cash, Messaging contracts | Existing candidates requiring R5 reconciliation |

## 3. Findings

### R5-CON-001 — Authorization model stale
**Severity:** HIGH. The existing Identity contract correctly rejects token-only authorization, but does not reflect the now-closed conceptual model: authenticated User + target Business + valid Membership + Role/Permission authorization. Membership is conceptually ACTIVE/INACTIVE and INACTIVE cannot operate. Authorization is strictly Membership → Role → Permission. This does not freeze technical enforcement.

### R5-CON-002 — MVP Membership Roles stale
**Severity:** HIGH. OR-B2 closes Owner, Admin, Vendedor and Gestor de Stock as MVP Membership Roles. Customer and Supplier are not Membership Roles. Repartidor is FUTURE/OPEN and outside the MVP Membership Role catalog.

### R5-CON-003 — Global User uniqueness stale
**Severity:** MEDIUM. Normalized email is conceptually globally unique for User. Normalization rules and physical uniqueness mechanism remain open.

### R5-CON-004 — Customer/User association incomplete
**Severity:** MEDIUM. OR-B3 closes a controlled hybrid association: the system may detect/propose a match, but association requires controlled confirmation and email equality alone does not auto-link.

### R5-CON-005 — Order confirmation authority stale
**Severity:** HIGH. Commercial confirmation is a Business-authorized action governed by `ORDER_CONFIRM`. Customer intent/confirmation does not itself authorize the Business operation.

### R5-CON-006 — Sale creation boundary stale
**Severity:** HIGH. Sale is created at commercial confirmation, not delivery. Confirmed Sale is immutable; correction uses cancellation/reversal/refund with traceability. Detailed states and effects remain open.

### R5-CON-007 — Inventory reservation/decrement stale
**Severity:** HIGH. Confirmed Order reserves stock. Physical decrement is represented by a registered stock-out movement representing actual physical stock exit. Negative stock is prohibited. FEFO applies with expiry and FIFO without expiry. Reservation mechanism and transaction boundaries remain open.

### R5-CON-008 — Location model stale
**Severity:** MEDIUM. OR-B3 closes generic Location, MAIN minimum, multiple Locations allowed, with no separate Branch/Warehouse conceptual model.

### R5-CON-009 — Sensitive Cash authorization stale
**Severity:** HIGH. OR-B3 closes the conceptual requirement that sensitive Cash operations require specific Permissions. Permission names, role mapping, thresholds and approval workflow remain open.

### R5-CON-010 — Fulfillment/Repartidor wording stale
**Severity:** HIGH. Fulfillment remains under Orders in MVP and does not require a Repartidor Membership Role. Existing driver-oriented wording must not become a normative MVP role or workflow.

### R5-CON-011 — Messaging Customer-without-User stale
**Severity:** HIGH. OR-B3 closes that Customer can participate in Messaging without User. Physical participant model and anonymous-session mechanics remain open.

### R5-CON-012 — Messaging Business boundary consistent
**Severity:** PASS. Conversation belongs exactly one Business and remains Business-contextualized.

### R5-CON-013 — WhatsApp finding historically reconciled
**Severity:** PASS WITH HISTORICAL NOTE. The previous audit identified a pending-ruling conflict. The Owner subsequently ruled that Wapsell Messaging MVP does not depend on WhatsApp. Future integrations remain open.

### R5-CON-014 — Product ownership stale/incomplete
**Severity:** MEDIUM. OR-B2 closes Product global identity plus BusinessProduct Business-specific commercial configuration. Physical field allocation remains open.

### R5-CON-015 — Cart ownership wording requires reconciliation
**Severity:** MEDIUM. Cart may exist without Customer; Customer is required before Order. Historical User-only ownership wording must not remain normative.

### R5-CON-016 — Inventory Business ownership consistent
**Severity:** PASS. Existing contract correctly preserves Business-exclusive inventory and no global shared stock.

### R5-CON-017 — Payments/Cash boundary intentionally open
**Severity:** PASS / OPEN BY DESIGN. Payment↔Cash, AR collection↔Cash, reconciliation relationships and financial effects of cancellation remain open.

### R5-CON-018 — Workshop-derived details require non-normative treatment
**Severity:** MEDIUM. Existing contracts contain broader workshop-derived functionality. It may remain historical/candidate material but must not be promoted into invariants or implementation requirements without approved specifications.

## 4. Reconciliation disposition
| Area | Result |
|---|---|
| Identity / Tenancy | RECONCILE |
| Authorization | RECONCILE |
| Commerce | RECONCILE |
| Inventory | RECONCILE |
| Cash | RECONCILE |
| Messaging | RECONCILE |
| Payments ↔ Cash | KEEP OPEN |
| Fulfillment | RECONCILE BOUNDARY |
| Historical workshop-derived details | KEEP NON-NORMATIVE / OPEN |

## 5. Safe conceptual reconciliation
The following are already closed and may be reflected in Contracts without a new Owner decision: global User identity and normalized-email uniqueness; Business as canonical entity; Membership N:N and ACTIVE/INACTIVE lifecycle; Membership→Role→Permission; MVP roles; Customer/User separation and controlled association; Product→BusinessProduct; anonymous Cart with Customer required before Order; ORDER_CONFIRM; Order≠Sale; Sale creation at commercial confirmation and immutability; confirmed Order stock reservation; stock-out movement for actual physical exit; negative stock prohibition; FEFO/FIFO; generic Location with MAIN minimum; specific Permissions for sensitive Cash operations; Fulfillment under Orders; Customer participation in Messaging without User; Business-scoped Conversation; no WhatsApp dependency for MVP.

## 6. Details that remain OPEN
Token/claims/session mechanics; guards/middleware; permission catalog and role-permission matrix; MFA mechanism; Business Switch mechanism; physical schema; transaction boundaries; exact Order/Sale states; cancellation/reversal/refund workflows; payment states/methods/provider API/idempotency; AR rules; Payments↔Cash effects; Cash state machine and adjustment mechanics; exact Cash permission names/thresholds; inventory reservation mechanism and locking; Location physical model; Messaging physical model/realtime/retention/attachments/notifications; AI activation/scope; external channel integrations.

## 7. Evidence
- Decision-derived closed concepts: DOCUMENTED / OWNER-RULED.
- Existing contract text: DOCUMENTED.
- AS-IS implementation claims remain subject to their referenced code audits.
- Technical details listed as OPEN: NO DETERMINABLE APPROVED CONTRACT DETAIL.

## 8. R5 disposition
**Audit result:** CONTRACT LAYER IS USABLE BUT STALE IN MULTIPLE CLOSED CONCEPTUAL AREAS.

**Next action:** apply additive R5 reconciliation blocks to existing Contracts, preserving historical text and IDs, without creating new decisions or technical implementation contracts.

**No code/schema/migration/test/infrastructure/deploy change is created by this audit.**