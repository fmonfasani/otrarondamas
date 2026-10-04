# WAPSELL — R8-ARCH-001 FIRST-SLICE CLOSURE ASSESSMENT

**Date:** 2026-10-03  
**Task:** R8-ARCH-001 — Close first-slice architectural boundary  
**Status:** ASSESSMENT COMPLETE — APPROVAL REQUIRED  
**Decision state:** NOT APPROVED  

> This artifact evaluates the minimum architectural boundary required before the first structural implementation slice. It does not approve a technology stack, schema, API, event model, deployment topology, migration, or implementation.

## 1. Purpose

Determine whether the existing Architecture Baseline is sufficiently bounded to support an explicit first-slice architectural approval, while preserving all unresolved details as OPEN.

## 2. Authoritative basis

- Canonical Owner decisions and reconciliations through R4/R5.
- Wapsell General Specification v0.4 — DRAFT / NOT APPROVED.
- Domain Contracts — DRAFT / NOT APPROVED.
- Invariants v0.2 — DRAFT / NOT APPROVED.
- Tests/Evals v0.2 — DRAFT / NOT EXECUTED.
- Architecture Baseline v0.1 — DRAFT / NOT APPROVED.
- Architecture Baseline Re-Audit v0.2 — CONDITIONAL PASS.
- R7 Transformation Plan v0.2 — DRAFT / NOT APPROVED.
- R8 controlled task baseline and readiness review.
- R8 AS-IS evidence pack.
- R8 AS-IS→Canonical Gap Matrix.

## 3. Architectural positions already sufficiently bounded

| Boundary | Assessment |
|---|---|
| Initial architecture direction | Modular Monolith is the current architectural direction. |
| Tenant boundary | Business is the tenancy boundary. |
| Global identity | User is global. |
| Business context | Membership contextualizes User↔Business. |
| Authorization responsibility | Operations require Business context plus Membership→Role→Permission; exact enforcement remains OPEN. |
| Customer | Customer is distinct from User and Business-scoped. |
| Commerce authority | Commerce/domain rules remain authoritative; Messaging does not duplicate them. |
| Inventory | Inventory is Business-owned and isolated. |
| Messaging | First-class MVP domain; Wapsell-owned; no WhatsApp dependency in MVP. |
| Fulfillment | Fulfillment remains under Orders. |
| AI | Inactive in MVP. |
| Microservices | Not an initial requirement. |

These positions are suitable as architectural constraints. They are not, by themselves, implementation authorization.

## 4. First-slice architectural boundary

The minimum first-slice boundary should contain only the responsibilities required to establish the platform foundation and one bounded business capability after its specifications are closed.

### 4.1 Required responsibility boundaries

1. **Identity/Tenancy** — global User, Business context and Membership responsibility.
2. **Authorization** — Membership→Role→Permission responsibility.
3. **Application orchestration** — invokes approved domain capabilities without becoming the owner of their business rules.
4. **One selected domain capability** — selected only after task-local specification readiness.
5. **Persistence boundary** — persistence is an implementation concern behind approved domain/application contracts.
6. **Cross-cutting controls** — authentication/security/audit concerns only to the extent required by the selected slice.

### 4.2 Explicitly outside this architectural closure

- exact database schema;
- ORM model names;
- API protocol or route structure;
- GraphQL/REST selection;
- JWT/session representation;
- RLS/database-per-tenant/schema-per-tenant choice;
- event broker/outbox/queue selection;
- locking strategy;
- cloud/infrastructure topology;
- Kubernetes;
- deployment topology;
- concrete MFA provider/mechanism;
- concrete Permission catalogue;
- production migration/cutover;
- deletion or replacement of AS-IS functionality.

## 5. Architectural dependencies that remain blockers

| Dependency | State | Why it blocks structural implementation |
|---|---|---|
| Architecture approval | OPEN | Current baseline is not approved. |
| Physical User/Business/Membership model | OPEN | Required for identity transformation. |
| Tenant isolation mechanism | OPEN | Required to guarantee Business isolation technically. |
| Authentication/session contract | OPEN | Required for the identity boundary. |
| Permission catalogue / Role matrix | OPEN | Required for executable authorization. |
| MFA mechanism | OPEN | Mandatory for Owner/Admin; technical mechanism unresolved. |
| First domain specification | OPEN/partial | A domain slice cannot be implemented from conceptual architecture alone. |

## 6. First-slice selection rule

R8-ARCH-001 must not select the business capability by convenience alone.

The first implementation slice must satisfy all of the following:

- its applicable Owner decisions are closed;
- its specialized specification is sufficiently defined;
- its Contracts are sufficiently defined;
- relevant Invariants are stable enough;
- relevant Tests/Evals have executable criteria;
- AS-IS evidence is available;
- preservation disposition is explicit;
- architecture dependencies are closed;
- no required schema/API/event/permission is invented during implementation;
- rollback/containment is defined where transformation is involved.

Therefore this assessment does **not** declare a first implementation slice selected.

## 7. AS-IS preservation constraint

The current implementation contains functioning identity, authorization, Commerce, Inventory, Order/Sale, Payment/Cash/AR and other capabilities.

The verified gaps do not authorize deletion or replacement.

Every structural transformation must classify affected behavior as:

- PRESERVED;
- ADAPTED;
- DEPRECATED;
- REPLACED — EXPLICITLY APPROVED.

Where evidence is insufficient, the disposition remains NOT DETERMINABLE rather than being inferred.

## 8. Architectural gate

### Current result

**R8-ARCH-001: CONDITIONAL PASS — READY FOR OWNER/ARCHITECTURE APPROVAL, NOT YET APPROVED.**

Meaning:

- the minimum architectural responsibility boundary is sufficiently defined for an approval decision;
- no technology or physical implementation choice is silently introduced;
- known blockers are explicitly identified;
- the Architecture layer is still not approved;
- no implementation may start from this assessment alone.

## 9. Required approval decision

The next governance action is an explicit Owner/Architecture ruling on whether to approve the architectural boundary described in this assessment, with the listed OPEN details remaining delegated to their appropriate specification tasks.

If approved, the approval should explicitly state that it authorizes **architectural specification and task-local closure**, not automatic implementation of every Wapsell domain.

If not approved, the rejecting/required refinements should be recorded before downstream structural work proceeds.

## 10. Downstream task impact

If approved:

- R8-ARCH-002 may close the technical tenant-isolation boundary.
- R8-ARCH-003 may close the authentication/session boundary.
- Domain-specific specification tasks may proceed where their dependencies are satisfied.
- R8-READY-001 may eventually select a first implementation slice only after its local gates pass.

If not approved:

- structural implementation remains blocked;
- documentary and AS-IS evidence work may continue;
- no architecture-dependent implementation task becomes READY.

## 11. Evidence classification

| Statement | Evidence class |
|---|---|
| Modular Monolith is current architectural direction | DOCUMENTED / RECONCILED |
| Business is tenant boundary | DOCUMENTED / CANONICAL |
| User↔Business uses Membership conceptually | DOCUMENTED / OWNER-RULED |
| Current implementation is Empresa-scoped | VERIFIED BY CODE |
| Current authorization is not yet canonical | VERIFIED BY CODE + GAP ANALYSIS |
| Current Order confirmation directly decrements stock | VERIFIED BY CODE |
| Current Messaging API module was not found in inspected API tree | VERIFIED BY CODE — LIMITED SCOPE |
| Physical target architecture | NOT DETERMINABLE / OPEN |
| Technology stack approval | NOT APPROVED |
| First implementation slice | NOT SELECTED |

## 12. Conclusion

R8-ARCH-001 can now be presented for an explicit architecture approval decision without requiring the project to invent unresolved technical details.

**Gate: CONDITIONAL PASS — APPROVAL REQUIRED.**

**No code, schema, migration, data, infrastructure or deployment change is authorized by this artifact.**