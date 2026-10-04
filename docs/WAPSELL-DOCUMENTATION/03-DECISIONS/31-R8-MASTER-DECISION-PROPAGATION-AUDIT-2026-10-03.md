# WAPSELL — MASTER OWNER DECISION PROPAGATION AUDIT — 2026-10-03

**Status:** DONE — CONDITIONAL PASS  
**Scope:** Propagation audit after Owner acceptance of the Master Recommendation Package  
**Source decision:** `03-DECISIONS/30-R8-MASTER-OWNER-DECISION-CLOSURE-2026-10-03.md`

## 1. Purpose

Verify whether the Owner acceptance of the 43-item Master Recommendation Package requires immediate semantic changes to canonical Specifications, Contracts, Invariants, Tests/Evals or TO-BE documents.

This is a documentary propagation audit. It does not authorize implementation and does not invent missing technical details.

## 2. Inputs reviewed

The audit reviewed the current canonical layers:

- General Specification.
- Identity & Tenancy Specification.
- Commerce Specification.
- Domain Contracts for Identity/Tenancy, Commerce, Inventory, Payments/Cash and Messaging.
- Derived Invariants.
- Derived Tests/Evals.
- TO-BE Overview.

The existing R8 architectural closures were also treated as controlling inputs:

- R8-ARCH-001 — Modular Monolith / first-slice boundary.
- R8-ARCH-002 — application-level tenant isolation.
- R8-ARCH-003 — JWT-centric authentication/session direction.

## 3. Result

### 3.1 No new semantic conflict requiring immediate rewrite

The major product/domain decisions accepted in the master package are already represented by the current canonical material, principally through OR-B2 and OR-B3.

Covered areas include:

- User / Business / Membership.
- Membership → Role → Permission.
- Customer ≠ User and controlled association.
- Product + BusinessProduct conceptual model.
- Cart / Customer / Order.
- Order ≠ Sale.
- Order confirmation through ORDER_CONFIRM.
- Stock reservation and physical stock-out.
- FEFO/FIFO.
- Business-owned inventory.
- Location / MAIN.
- Negative stock prohibition.
- Payment separate from Sale.
- Accounts Receivable.
- Business-scoped Cash and sensitive Cash Permissions.
- Fulfillment under Orders.
- Repartidor outside MVP Membership Roles.
- Messaging as first-class Business-scoped domain.
- Customer participation without User.
- WhatsApp independence for MVP.
- AI inactive in MVP.
- Brand over common Design System.
- Modular Monolith.
- Application-level tenant isolation.
- JWT-centric authentication.
- Owner/Admin MFA requirement.

### 3.2 Items that remain deliberately OPEN

The master acceptance did not close the following implementation-level mechanisms:

- exact database schema;
- ORM;
- API protocol;
- exact JWT claims;
- token transport;
- refresh/session mechanism;
- revocation storage;
- Business Switch protocol;
- MFA mechanism;
- transaction boundaries;
- locking/concurrency primitives;
- event broker/outbox;
- realtime transport;
- attachment storage;
- notification provider;
- physical Product/BusinessProduct field allocation;
- physical Location schema;
- exact Order/Sale state machine;
- Payment reconciliation mechanics;
- Cash adjustment mechanics;
- Messaging physical model;
- deployment/infrastructure.

This is consistent with the explicit non-decisions in R8-ARCH-001/002/003 and must not be “closed” by inference.

## 4. Canonical layer assessment

| Layer | Result | Action |
|---|---|---|
| Decision Register | UPDATED | Master acceptance recorded |
| General SPEC | CONSISTENT | No semantic rewrite required solely because of the master closure |
| Identity/Tenancy SPEC | CONSISTENT WITH OPEN DETAILS | Preserve explicit OPEN technical mechanisms |
| Commerce SPEC | CONSISTENT | Preserve specialized-detail boundaries |
| Contracts | CONSISTENT AFTER R5 | Continue using canonical contracts as the executable boundary |
| Invariants | CONSISTENT AFTER R6 | Do not derive new implementation mechanisms from the master closure |
| Tests/Evals | CONSISTENT AFTER R7 | Future tests must verify accepted invariants, not invented mechanics |
| TO-BE | CONSISTENT WITH R4/R7 | No automatic promotion of proposed navigation/domain maps |
| Implementation readiness | NOT READY FOR STRUCTURAL IMPLEMENTATION | R8 local blockers remain |

## 5. Important stale/open wording identified

The audit found several places where downstream documents may still use historical/open wording for mechanisms that now have an approved direction.

These should be reconciled in a controlled downstream pass rather than by broad text replacement:

1. Tenant isolation must no longer be described only as an undecided implementation detail. R8-ARCH-002 closes the direction as application-level isolation.
2. Authentication must no longer be described as completely undecided. R8-ARCH-003 closes the direction as JWT-centric authentication with application-controlled Business Context.
3. The above closures do **not** close exact implementation mechanics.
4. Any document that treats client-supplied Business ID as authoritative is stale and must be corrected.
5. Any document that treats JWT claims as the authorization source is stale and must be corrected.
6. Any document that treats the current legacy role enum as the canonical MVP role model is AS-IS evidence, not TO-BE authority.

## 6. Required controlled propagation

The next documentary increment should be a targeted reconciliation of:

### Architecture
- tenant isolation boundary;
- authentication/session boundary;
- active Business Context;
- distinction between authentication and authorization.

### Contracts
- Business context as trusted application context;
- Membership validation;
- fail-closed behavior;
- no cross-Business reads/writes;
- JWT not sufficient for authorization.

### Invariants
- application-level tenant isolation invariant;
- authenticated User + active Business + ACTIVE Membership;
- client Business identifier cannot override server context;
- authentication failure and missing Business context fail closed.

### Tests/Evals
Add/confirm negative verification for:
- cross-Business read;
- cross-Business create;
- cross-Business update/delete;
- invalid/inactive Membership;
- forged client Business identifier;
- valid JWT with unauthorized Business;
- legacy empresaId treated as transition evidence rather than final authorization authority.

### TO-BE / Transformation
Preserve explicit AS-IS → TO-BE separation and mark legacy Empresa/JWT/role behavior as transformation evidence.

## 7. Gate

**MASTER PROPAGATION AUDIT: CONDITIONAL PASS.**

The master Owner acceptance is sufficiently represented at the product/domain level.

A targeted R8 downstream reconciliation is required for the newly closed architecture boundaries. No broad canonical rewrite is justified.

**Implementation remains NOT AUTHORIZED.**

## 8. Evidence classification

- DOCUMENTADO: Master Owner acceptance.
- DOCUMENTADO: R8-ARCH-001/002/003 closures.
- DOCUMENTADO: OR-B2/OR-B3 canonical propagation.
- VERIFICADO POR REVISIÓN DOCUMENTAL: current canonical layer consistency.
- NOT EXECUTED: implementation.
- NOT AUTHORIZED: schema/migration/deployment.


## 9. Controlled reconciliation executed

Following the audit, the approved R8 architecture boundaries were propagated in a targeted manner to avoid broad textual duplication:

- R8-ARCH-002 closure added to the tenant-isolation assessment.
- R8-ARCH-003 closure added to the authentication/session assessment.
- Identity/Tenancy Contract reconciled with application-controlled Business Context, ACTIVE Membership, fail-closed behavior and JWT-not-authorization semantics.
- Inventory Contract reconciled with Business Context and cross-Business isolation requirements.
- Derived Invariants extended with the approved R8 Business Context / Membership / fail-closed / JWT / isolation properties.
- Derived Tests/Evals extended with corresponding negative verification requirements.

No implementation code, schema, migration or infrastructure was changed.

**Updated result: PASS WITH CONTROLLED RECONCILIATION.**
