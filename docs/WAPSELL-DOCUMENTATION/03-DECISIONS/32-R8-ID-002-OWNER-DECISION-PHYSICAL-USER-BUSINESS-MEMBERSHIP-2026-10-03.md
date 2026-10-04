# WAPSELL — R8-ID-002 OWNER DECISION — PHYSICAL USER / BUSINESS / MEMBERSHIP MODEL

**Fecha:** 2026-10-03  
**Task:** R8-ID-002  
**Decision:** CLOSED — OWNER APPROVED  
**Implementation:** NOT AUTHORIZED

## 1. Owner ruling

The Owner accepts the recommended **Option A — Adapt existing Empresa + introduce Membership incrementally**.

The current `Empresa` physical record is retained as the compatibility-preserved physical representation of Business during the transition.

The target conceptual relationship is:

`User → Membership → Empresa/Business`

## 2. Approved properties

- User is global.
- Business remains the tenant/business boundary.
- Membership is the N:N User↔Business relationship.
- Role belongs to Membership, not global User.
- Membership has conceptual ACTIVE / INACTIVE lifecycle.
- One User may have multiple Memberships.
- Business Context is resolved through an authorized Membership.
- Existing Empresa identifiers should be preserved where practical during transition.
- Direct Usuario→Empresa ownership is transitional and must progressively cease to be the canonical authorization relationship.
- Application-level tenant isolation remains the approved isolation mechanism.
- No physical tenant separation is required.

## 3. Physical transition direction

During transformation:

`Usuario → Empresa`

progresses toward:

`User → Membership → Business`

with `Empresa` serving as the compatibility-preserved Business representation during the transition.

This does **not** make `Empresa` the permanent canonical terminology.

A later controlled decision may determine whether/when the physical representation is renamed or migrated to a physical `Business` entity.

## 4. Role and authorization boundary

The physical direction moves Business-specific role information from User toward Membership.

The exact Permission physical catalogue/matrix remains the responsibility of R8-AUTH-001.

The exact physical schema, indexes, constraints, migration scripts and cutover mechanics remain implementation/specification work.

## 5. Invitation boundary

The existing Business-scoped invitation is conceptually treated as intent to create or activate a Membership.

The exact invitation lifecycle remains downstream work.

## 6. Explicit non-approval

This decision does not authorize:

- Prisma schema modification;
- database migration;
- renaming Empresa;
- deletion of Usuario.empresaId;
- code refactoring;
- data backfill;
- production cutover;
- rollback execution.

## 7. Evidence

- DOCUMENTADO: R8-ID-002 physical-model assessment.
- DOCUMENTADO: Owner acceptance of the Master Recommendation Package.
- VERIFICADO POR CÓDIGO: current Usuario→Empresa physical relationship and absence of Membership.
- NOT IMPLEMENTED: selected target physical model.

**R8-ID-002: CLOSED — OWNER APPROVED.**
