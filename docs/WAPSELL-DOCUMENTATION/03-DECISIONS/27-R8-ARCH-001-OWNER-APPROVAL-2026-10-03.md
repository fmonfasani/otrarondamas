# WAPSELL — R8-ARCH-001 OWNER APPROVAL

**Date:** 2026-10-03  
**Task:** R8-ARCH-001 — Close first-slice architectural boundary  
**Decision:** APPROVED BY OWNER  
**Scope:** Architectural boundary only

## 1. Owner ruling

The Owner accepts the first-slice architectural boundary described in the R8-ARCH-001 assessment.

This approval establishes the following architectural boundaries for Wapsell:

- Modular Monolith as the current architectural direction.
- Business as the tenancy boundary.
- User as the global identity.
- Membership as the contextual User↔Business relationship.
- Authorization responsibility based conceptually on Membership → Role → Permission.
- Customer distinct from User and Business-scoped.
- Commerce/domain rules remain authoritative and are not duplicated in Messaging.
- Inventory is Business-owned and isolated.
- Messaging is a first-class MVP domain.
- Fulfillment remains under Orders.
- AI remains inactive in MVP.
- Microservices are not an initial requirement.

## 2. Scope limitation

This approval does **not** approve:

- a database schema;
- ORM selection;
- REST or GraphQL;
- JWT/session implementation;
- RLS/database-per-tenant/schema-per-tenant;
- event broker/outbox/queue;
- locking/concurrency implementation;
- MFA mechanism/provider;
- concrete Permission catalogue or Role→Permission matrix;
- deployment topology;
- Kubernetes or other infrastructure;
- production migration/cutover;
- deletion or replacement of existing AS-IS functionality.

Those remain subject to their respective specification and architecture decisions.

## 3. Effect of approval

R8-ARCH-001 is now considered **CLOSED — OWNER APPROVED** for its stated architectural scope.

The approval authorizes downstream architectural/specification closure tasks. It does not authorize implementation.

The next controlled tasks may address:

1. R8-ARCH-002 — technical tenant-isolation boundary;
2. R8-ARCH-003 — authentication/session boundary;
3. dependent Identity/Tenancy and Authorization specification closure;
4. first implementation-slice selection only after its local readiness gates are satisfied.

## 4. Preservation rule

Existing AS-IS functionality remains preserved until a later approved transformation explicitly classifies it as ADAPTED, DEPRECATED or REPLACED.

No deletion, destructive migration or replacement is authorized by this ruling.

## 5. Evidence

Primary assessment:
`07-DESIGN/ARCHITECTURE/03-R8-ARCH-001-FIRST-SLICE-CLOSURE-ASSESSMENT-2026-10-03.md`

Supporting architectural baseline:
`07-DESIGN/ARCHITECTURE/00-ARCHITECTURE-BASELINE-v0.1.md`

Supporting re-audit:
`07-DESIGN/ARCHITECTURE/02-ARCHITECTURE-BASELINE-REAUDIT-v0.2.md`

## 6. Status

**R8-ARCH-001: CLOSED — OWNER APPROVED.**

**Implementation remains NOT AUTHORIZED by this decision.**
