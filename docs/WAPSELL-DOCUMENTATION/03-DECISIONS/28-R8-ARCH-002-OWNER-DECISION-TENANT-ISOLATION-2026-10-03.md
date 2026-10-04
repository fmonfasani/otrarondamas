# WAPSELL — R8-ARCH-002 OWNER DECISION — TENANT ISOLATION

**Date:** 2026-10-03  
**Task:** R8-ARCH-002 — Close technical tenant-isolation boundary  
**Decision:** APPROVED — APPLICATION-LEVEL TENANT ISOLATION  
**Scope:** Architectural mechanism and behavioral boundary  
**Implementation:** NOT AUTHORIZED

## 1. Owner ruling

The Owner selects **application-level tenant isolation** as the primary technical isolation mechanism for Wapsell.

The application is responsible for establishing and enforcing the active Business context for Business-scoped operations.

## 2. Architectural meaning

The target boundary is:

`Authenticated User → active Business Context → Membership → authorized operation → Business-scoped persistence`

Business-scoped persistence must not rely on a Business identifier supplied by an untrusted client.

The authoritative Business context must originate from the authenticated/session context and the validated User↔Business Membership relationship, according to the authentication/session architecture that remains to be closed.

## 3. Required properties

The application-level isolation mechanism must provide, at minimum:

1. Business context is established before Business-scoped operations.
2. The active Business must be associated with the authenticated User through a valid Membership.
3. Inactive Membership cannot operate.
4. Business identifiers supplied by client payloads cannot override the authoritative Business context.
5. Create operations assign Business ownership from the authoritative context.
6. Read operations are constrained to the authoritative Business context.
7. Update and delete operations cannot cross Business boundaries.
8. Unique lookups must not expose records belonging to another Business.
9. Nested/related persistence operations must preserve Business ownership.
10. Transactions must preserve Business isolation across all affected operations.
11. Missing or invalid Business context must fail closed rather than fall back to unrestricted access.
12. Cross-Business access must be covered by negative verification.

## 4. Scope and non-scope

### In scope

- Business-context propagation;
- centralized application-level persistence isolation;
- ownership propagation for Business-scoped entities;
- direct and related entity isolation;
- fail-closed behavior;
- cross-Business verification;
- incremental migration from current Empresa-scoped behavior.

### Explicitly out of scope

- PostgreSQL RLS;
- database-per-tenant;
- schema-per-tenant;
- physical database separation;
- a specific ORM;
- a specific API protocol;
- JWT/session implementation;
- concrete authentication provider;
- production migration/cutover;
- infrastructure changes.

## 5. AS-IS disposition

The current `EmpresaScopedPrismaService` and `empresaScopeExtension` are **ADAPTED**, not automatically replaced.

The existing mechanism is preserved as evidence and as a candidate migration foundation.

Its known limitations must be addressed before the TO-BE isolation mechanism is considered implementation-ready, including:

- direct versus inherited Business ownership;
- related/child entity access;
- unique lookups;
- nested writes;
- unsupported operations;
- transaction boundaries;
- migration from Empresa to Business context.

No current component is deleted or replaced by this decision.

## 6. Required technical closure before implementation

The following remain open and must be specified:

- authoritative Business Context contract;
- relationship between Business Context and Membership;
- exact persistence-scoping mechanism;
- direct/indirect ownership propagation;
- transaction behavior;
- unique lookup behavior;
- nested operation behavior;
- handling of missing context;
- authorization interaction;
- test/evaluation matrix;
- migration/coexistence from Empresa to Business.

These are downstream specification/architecture tasks.

## 7. Security invariant

The architectural requirement is:

> A Business-scoped operation executed in the context of Business A must not read, create, modify or delete Business-scoped data belonging to Business B.

This must hold regardless of values supplied by the client.

## 8. Decision effect

R8-ARCH-002 is now:

**CLOSED — OWNER APPROVED**

This closes the architectural choice of the primary isolation strategy.

It does **not** close the detailed implementation contract.

## 9. Next controlled dependency

The next required architecture task is:

**R8-ARCH-003 — Close authentication/session boundary.**

The Business Context mechanism depends on the authentication/session boundary because the active Business must be derived from an authenticated identity and validated Membership.

After R8-ARCH-003, the project can close the detailed Identity/Tenancy specification required to transform the current Empresa-scoped model incrementally.

## 10. Evidence

Decision basis:

`07-DESIGN/ARCHITECTURE/04-R8-ARCH-002-TENANT-ISOLATION-ASSESSMENT-2026-10-03.md`

AS-IS code evidence:

`apps/api/src/prisma/empresa-scoped-prisma.service.ts`

`apps/api/src/prisma/empresa-scope.extension.ts`

Canonical target:

- Business is the tenancy boundary.
- User is global.
- Membership contextualizes User↔Business.
- Business isolation is mandatory.

## 11. Status

**R8-ARCH-002: CLOSED — OWNER APPROVED.**

**Implementation remains NOT AUTHORIZED.**
