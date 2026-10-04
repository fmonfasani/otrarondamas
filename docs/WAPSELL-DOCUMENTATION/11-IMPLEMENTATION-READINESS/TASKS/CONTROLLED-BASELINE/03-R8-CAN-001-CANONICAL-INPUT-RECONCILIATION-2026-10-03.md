# WAPSELL — R8-CAN-001 CANONICAL INPUT RECONCILIATION — 2026-10-03

**Task:** R8-CAN-001  
**Class:** REVIEW/DELIVERY  
**Status:** DONE — DOCUMENTARY CONTROL / UPDATED AFTER R8-ARCH CLOSURE

## 1. Authority chain

Requirements → Decisions → Specialized Specs → Architecture → Contracts → Invariants → Tests/Evals → Plan → Tasks

Current precedence:

OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > AUDIT > WORKSHOP/PREPARATION > HISTORICAL

## 2. Source inventory

| Layer | Source | State |
|---|---|---|
| Requirements | 05-REQUIREMENTS/00-WAPSELL-REQUIREMENTS-RECONCILED-001-490.md | DRAFT / RECONCILED |
| Decisions | 03-DECISIONS/00-DECISION-REGISTER.md + current OR-B2/OR-B3 + R8 Owner decisions | RECONCILED / latest R8 decisions recorded separately |
| General Spec | 06-SPECIFICATIONS/CANONICAL/00-WAPSELL-SPEC-GENERAL.md | v0.4 DRAFT / NOT APPROVED |
| Architecture baseline | 07-DESIGN/ARCHITECTURE/00-ARCHITECTURE-BASELINE-v0.1.md + re-audit v0.2 | DRAFT / AUDITED |
| R8-ARCH-001 | 07-DESIGN/ARCHITECTURE/03-R8-ARCH-001-FIRST-SLICE-CLOSURE-ASSESSMENT-2026-10-03.md + Owner approval | CLOSED — OWNER APPROVED |
| R8-ARCH-002 | 07-DESIGN/ARCHITECTURE/04-R8-ARCH-002-TENANT-ISOLATION-ASSESSMENT-2026-10-03.md + Owner decision | CLOSED — OWNER APPROVED |
| R8-ARCH-003 | 07-DESIGN/ARCHITECTURE/05-R8-ARCH-003-AUTHENTICATION-SESSION-ASSESSMENT-2026-10-03.md + Owner decision | CLOSED — OWNER APPROVED |
| Identity Contract | 07-DESIGN/CONTRACTS/DOMAIN/01-IDENTITY-AND-TENANCY-CONTRACTS.md | DRAFT / RECONCILED |
| Commerce Contract | 07-DESIGN/CONTRACTS/DOMAIN/02-COMMERCE-CONTRACTS.md | DRAFT / RECONCILED |
| Inventory Contract | 07-DESIGN/CONTRACTS/DOMAIN/03-INVENTORY-CONTRACTS.md | DRAFT / RECONCILED |
| Payments/Cash Contract | 07-DESIGN/CONTRACTS/DOMAIN/04-PAYMENTS-CASH-CONTRACTS.md | DRAFT / RECONCILED |
| Messaging Contract | 07-DESIGN/CONTRACTS/DOMAIN/05-MESSAGING-CONTRACTS.md | DRAFT / RECONCILED |
| Invariants | 07-DESIGN/INVARIANTS/DERIVED/00-INVARIANTS-v0.2.md + R6 reconciliation | DRAFT / RECONCILED |
| Tests/Evals | 07-DESIGN/TESTS-EVALS/DERIVED/00-TESTS-EVALS-v0.2.md + R7 audit | DRAFT / REVIEWED / NOT EXECUTED |
| R7 Plan | 11-IMPLEMENTATION-READINESS/PLAN/TRANSFORMATION/01-R7-TRANSFORMATION-PLAN-v0.2.md | DRAFT / AUDITED |
| R8 Tasks | 11-IMPLEMENTATION-READINESS/TASKS/CONTROLLED-BASELINE/00-R8-CONTROLLED-TASKS-BASELINE-v0.1.md | DRAFT |

## 3. Reconciliation

The Requirements artifact records current Owner rulings as higher authority than Workshop 001–490. R8 therefore derives tasks from current Owner rulings and reconciled canonical artifacts, not superseded workshop wording.

Current canonical planning model includes:

- global User;
- Business as tenancy boundary;
- Membership as User↔Business context;
- Membership → Role → Permission;
- MVP roles Owner, Admin, Vendedor and Gestor de Stock;
- Product global + BusinessProduct;
- Customer distinct from User;
- Order distinct from Sale;
- commercial confirmation before Sale creation;
- Business-owned inventory;
- Order reservation and physical stock-out movement;
- generic Location with MAIN minimum;
- first-class Business-scoped Messaging;
- no WhatsApp dependency in MVP;
- AI inactive in MVP.

### R8 architectural closure now included in the input set

**R8-ARCH-001 — CLOSED — OWNER APPROVED**

- Modular Monolith is the architectural direction.
- Business is the tenant.
- User is global.
- Membership is contextual.
- Authorization conceptually follows Membership → Role → Permission.
- Customer is distinct from User.
- Commerce is authoritative.
- Inventory is Business-owned.
- Messaging is first-class.
- Fulfillment remains under Orders.
- AI is inactive in MVP.
- Microservices are not an initial requirement.

No approval was given for schema, ORM, API protocol, RLS, event broker, locking, MFA mechanism, permission matrix, deployment or migration.

**R8-ARCH-002 — CLOSED — OWNER APPROVED**

Primary technical tenant isolation is application-level.

The target boundary is:

Authenticated User → active Business Context → Membership → authorized operation → Business-scoped persistence

Client-supplied Business identifiers are not authoritative. Missing/invalid context fails closed. Business ownership must be preserved across direct, related, nested and transactional persistence.

RLS, database/schema-per-tenant and physical tenant separation remain out of scope.

**R8-ARCH-003 — CLOSED — OWNER APPROVED**

Authentication remains JWT-centric as the incremental direction.

JWT authenticates the global User, but JWT alone does not authorize Business operations. The application establishes the active Business Context and validates the corresponding ACTIVE Membership before authorization and Business-scoped persistence.

Token claims are not the sole authorization authority.

Still OPEN:

- exact JWT claims;
- token lifetime;
- refresh;
- revocation;
- logout;
- Business Switch mechanism;
- MFA mechanism;
- Google onboarding under User/Membership;
- session/device management.

## 4. Superseded material excluded from current derivation

- Profile/Capability/Override as the MVP authorization hierarchy;
- email-only Customer/User auto-linking;
- Product-as-Business-owned identity;
- Cart-as-User-only ownership;
- Order→Sale at delivery;
- Repartidor as MVP Membership Role;
- Purchases/AP as initial-MVP implementation work;
- unapproved technical choices inferred from conceptual architecture.

Historical material remains preserved.

## 5. Documentary propagation gaps

The following are identified but are not silently corrected by this task:

1. Decision Register propagation of the three R8 Owner decision records.
2. Downstream Contracts reconciliation for the approved application-level tenant isolation and authentication/session boundaries.
3. Downstream Invariants reconciliation for Business Context, Membership validation and fail-closed isolation.
4. Downstream Tests/Evals reconciliation for negative Business Context and authentication cases.
5. General SPEC wording where earlier text still describes these technical boundaries as OPEN.

These require their respective controlled downstream reconciliation activities.

## 6. Result

**R8-CAN-001: DONE**

The current canonical input set is sufficiently reconciled for controlled R8 task derivation.

R8-ARCH-001, R8-ARCH-002 and R8-ARCH-003 are now closed Owner decisions and must be treated as authoritative inputs for downstream reconciliation.

This result does not approve DRAFT artifacts and does not authorize implementation, schema, data or deployment changes.

## 7. Evidence

- DOCUMENTADO: source inventory and authority precedence.
- VERIFICADO POR REVISIÓN DOCUMENTAL: R8 source selection and architectural closure.
- DOCUMENTADO: R8-ARCH-001/002/003 Owner decisions.
- NOT EXECUTED: application transformation/tests.
- NOT AUTHORIZED: implementation or infrastructure changes.

## 8. Next controlled task

R8-CAN-002 — Audit task traceability model.

After CAN-002, the executable AS-IS evidence tasks remain available. Downstream canonical propagation should occur through explicit reconciliation tasks rather than silent edits.
