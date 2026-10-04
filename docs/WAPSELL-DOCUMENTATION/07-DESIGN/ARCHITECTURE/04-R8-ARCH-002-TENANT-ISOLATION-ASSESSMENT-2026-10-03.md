# WAPSELL — R8-ARCH-002 TENANT-ISOLATION ASSESSMENT

**Date:** 2026-10-03  
**Task:** R8-ARCH-002 — Close technical tenant-isolation boundary  
**Status:** ASSESSMENT COMPLETE — DECISION REQUIRED  
**Decision state:** OPEN

> This artifact evaluates the technical tenant-isolation boundary using the verified AS-IS implementation and canonical Wapsell rules. It does not approve a mechanism.

## 1. Canonical requirement

Business is the tenancy boundary.

The target architecture must guarantee that Business-scoped operational data cannot be accessed or mutated across Business boundaries.

This is a security and data-integrity requirement, not merely a UI concern.

## 2. AS-IS verified mechanism

The current API contains:

- `EmpresaScopedPrismaService`;
- `empresaScopeExtension(empresaId)`;
- direct `empresaId` scoping for a defined set of Prisma models;
- forced `empresaId` on create/createMany;
- injected `empresaId` on several where-based operations;
- post-query validation for findUnique/findUniqueOrThrow;
- explicit rejection of unsupported operations.

The caller supplies the Empresa context after authentication through the current AS-IS request flow.

**Evidence class:** VERIFIED BY CODE.

## 3. AS-IS limitations relevant to TO-BE

The current extension explicitly documents that:

1. only models with a direct `empresaId` are covered;
2. related models inheriting scope through a parent are not independently covered;
3. those related models currently depend on parent-scoped access discipline;
4. `findUnique` requires separate handling because the current schema does not expose the required compound unique shape;
5. unsupported operations are rejected rather than silently scoped;
6. the current mechanism is Empresa-based, while TO-BE requires Business/Membership context.

These are verified implementation characteristics, not assumptions.

## 4. Candidate architectural strategies

### A. Application-level tenant isolation

The application establishes Business context and every Business-scoped persistence operation is forced through a scoped persistence boundary.

Potential characteristics:

- explicit Business context;
- centralized persistence scoping;
- no trust in client-supplied Business identifiers;
- create/update/delete constrained to current Business;
- related entities require explicit ownership propagation;
- automated tests verify cross-Business denial.

**Advantages:** close to current AS-IS mechanism; incremental migration is comparatively direct; avoids coupling the target architecture to one database-specific isolation feature.

**Risks:** correctness depends on complete coverage of persistence paths; omissions in new models or queries can create isolation defects; related entities require careful ownership design.

### B. Database-enforced row isolation

The database enforces Business isolation at the persistence layer, for example through a database row-level policy mechanism.

**Advantages:** adds a database-level defense against application query mistakes; strong defense-in-depth.

**Risks:** introduces database-specific behavior; requires reliable propagation of Business context into database sessions/transactions; connection-pool/session-state handling must be rigorously designed; migration and operational complexity increase.

### C. Physical tenant separation

Business data is physically separated by database/schema or equivalent deployment boundary.

**Advantages:** strong physical isolation.

**Risks:** substantially increases operational complexity; conflicts with the current incremental transformation direction unless justified by concrete scale/security requirements; migration and cross-tenant administration become more complex.

## 5. Decision criteria

The chosen mechanism should be evaluated against:

- Business isolation strength;
- defense against developer omission;
- compatibility with the modular-monolith direction;
- compatibility with current AS-IS;
- incremental migration complexity;
- transaction correctness;
- relation/child-entity coverage;
- testability;
- auditability;
- operational complexity;
- portability;
- future scale requirements supported by current evidence.

No target numeric scale requirement is currently established by the canonical sources.

## 6. Recommended decision shape

The architecture should select **one primary tenant-isolation mechanism** and may explicitly require a secondary defense-in-depth mechanism where justified.

The decision must also establish:

- authoritative Business context source;
- propagation boundary;
- ownership rule for direct and related entities;
- behavior for create/read/update/delete;
- behavior for unique lookups;
- behavior for nested writes;
- behavior for transactions;
- behavior when Business context is absent;
- cross-Business negative-test requirements.

These are technical contract details and should be closed before implementation of the identity/tenancy transformation.

## 7. Important distinction

The existing `EmpresaScopedPrismaService` is evidence of an AS-IS implementation technique.

It is **not automatically the approved Wapsell TO-BE mechanism**.

Likewise, the fact that PostgreSQL can support database-level isolation does not make such a mechanism automatically appropriate.

The decision must be explicit.

## 8. Gate

**R8-ARCH-002: BLOCKED — OWNER/ARCHITECTURE DECISION REQUIRED.**

The AS-IS mechanism is sufficiently understood to evaluate alternatives, but the TO-BE isolation mechanism has not been approved.

## 9. No implementation authorization

This assessment authorizes no change to the current Prisma extension, database, schema, authentication flow, migrations or infrastructure.

## 10. Evidence

Primary AS-IS evidence:

`apps/api/src/prisma/empresa-scoped-prisma.service.ts`

`apps/api/src/prisma/empresa-scope.extension.ts`

Supporting canonical boundary:

- Business = tenancy boundary.
- User = global identity.
- Membership = User↔Business context.
- Business isolation is mandatory.

**Conclusion:** the next governance action is an explicit tenant-isolation architecture decision.
