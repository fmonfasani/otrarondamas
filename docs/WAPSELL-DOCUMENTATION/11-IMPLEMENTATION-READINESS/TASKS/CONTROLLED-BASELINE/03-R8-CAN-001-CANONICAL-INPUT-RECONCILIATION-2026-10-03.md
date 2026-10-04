# WAPSELL — R8-CAN-001 CANONICAL INPUT RECONCILIATION — 2026-10-03

**Task:** R8-CAN-001  
**Class:** REVIEW/DELIVERY  
**Status:** DONE — DOCUMENTARY CONTROL

## 1. Authority chain

`Requirements → Decisions → Specialized Specs → Architecture → Contracts → Invariants → Tests/Evals → Plan → Tasks`

Current precedence:

`OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > AUDIT > WORKSHOP/PREPARATION > HISTORICAL`

## 2. Source inventory

| Layer | Source | State |
|---|---|---|
| Requirements | `05-REQUIREMENTS/00-WAPSELL-REQUIREMENTS-RECONCILED-001-490.md` | DRAFT / RECONCILED |
| Decisions | `03-DECISIONS/00-DECISION-REGISTER.md` + current OR-B2/OR-B3 artifacts | RECONCILED |
| General Spec | `06-SPECIFICATIONS/CANONICAL/00-WAPSELL-SPEC-GENERAL.md` | v0.4 DRAFT / NOT APPROVED |
| Architecture | `07-DESIGN/ARCHITECTURE/00-ARCHITECTURE-BASELINE-v0.1.md` + re-audit v0.2 | DRAFT / AUDITED / NOT APPROVED |
| Identity Contract | `07-DESIGN/CONTRACTS/DOMAIN/01-IDENTITY-AND-TENANCY-CONTRACTS.md` | DRAFT / RECONCILED |
| Commerce Contract | `07-DESIGN/CONTRACTS/DOMAIN/02-COMMERCE-CONTRACTS.md` | DRAFT / RECONCILED |
| Inventory Contract | `07-DESIGN/CONTRACTS/DOMAIN/03-INVENTORY-CONTRACTS.md` | DRAFT / RECONCILED |
| Payments/Cash Contract | `07-DESIGN/CONTRACTS/DOMAIN/04-PAYMENTS-CASH-CONTRACTS.md` | DRAFT / RECONCILED |
| Messaging Contract | `07-DESIGN/CONTRACTS/DOMAIN/05-MESSAGING-CONTRACTS.md` | DRAFT / RECONCILED |
| Invariants | `07-DESIGN/INVARIANTS/DERIVED/00-INVARIANTS-v0.2.md` + R6 reconciliation | DRAFT / RECONCILED |
| Tests/Evals | `07-DESIGN/TESTS-EVALS/DERIVED/00-TESTS-EVALS-v0.2.md` + R7 audit | DRAFT / REVIEWED / NOT EXECUTED |
| R7 Plan | `11-IMPLEMENTATION-READINESS/PLAN/TRANSFORMATION/01-R7-TRANSFORMATION-PLAN-v0.2.md` | DRAFT / AUDITED |
| R8 Tasks | `11-IMPLEMENTATION-READINESS/TASKS/CONTROLLED-BASELINE/00-R8-CONTROLLED-TASKS-BASELINE-v0.1.md` | DRAFT |

## 3. Reconciliation

The Requirements artifact records OR-B2 as higher authority than Workshop 001–490. R8 therefore derives tasks from current Owner rulings and reconciled canonical artifacts, not superseded workshop wording.

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

Open technical details remain open and are not resolved by R8, including physical identity model, tenant isolation, authentication/session, permission catalogue, MFA mechanism, transaction boundaries, physical Location, Order/Sale state details, Payment/Cash/AR effects, Messaging physical/API/event model and architecture approval.

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

## 5. Result

**R8-CAN-001: DONE**

The current canonical input set is sufficiently reconciled for controlled R8 task derivation.

This result does not approve DRAFT artifacts and does not authorize implementation, schema, data or deployment changes.

## 6. Evidence

- **DOCUMENTADO:** source inventory and authority precedence.
- **VERIFICADO POR REVISIÓN DOCUMENTAL:** R8 source selection against the current planning chain.
- **NOT EXECUTED:** application transformation.
- **NOT AUTHORIZED:** implementation or infrastructure changes.
