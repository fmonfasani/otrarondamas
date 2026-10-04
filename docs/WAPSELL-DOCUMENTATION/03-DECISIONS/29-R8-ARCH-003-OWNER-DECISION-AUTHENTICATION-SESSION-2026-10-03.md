# R8-ARCH-003 — OWNER DECISION — AUTHENTICATION / SESSION

**Fecha:** 2026-10-03  
**Task:** R8-ARCH-003  
**Status:** CLOSED — OWNER APPROVED

## Owner Decision

The Owner selected:

> **A — JWT-centric authentication with application-controlled active Business context.**

The current JWT-based authentication mechanism remains the incremental architectural direction.

However, JWT authentication does **not** constitute the Business authorization boundary.

The target conceptual chain is:

```
Authenticated User
        ↓
Active Business Context
        ↓
Valid ACTIVE Membership
        ↓
Role
        ↓
Permission
        ↓
Authorized Operation
        ↓
Business-scoped Persistence
```

## Approved Principles

1. JWT may authenticate the global User.
2. A valid JWT alone does not authorize access to a Business.
3. Business context must be established and controlled by the application.
4. The effective Business context must correspond to a valid ACTIVE Membership.
5. An INACTIVE Membership cannot operate.
6. A client-supplied Business identifier cannot override the server-established Business context.
7. Role and Permission authorization is evaluated through the User↔Business Membership.
8. JWT claims must not be treated as the sole source of authorization truth.
9. A User may authenticate once and operate across multiple Businesses through valid Memberships.
10. The authentication/session boundary must preserve the previously approved application-level tenant isolation boundary.
11. Owner/Admin MFA remains mandatory; the technical mechanism is still open.
12. Authentication/session failures must fail closed for protected operations.

## AS-IS Disposition

The following existing components remain candidates for incremental adaptation rather than automatic replacement:

- JWT authentication;
- Passport JWT strategy;
- global JwtAuthGuard;
- global PermissionsGuard;
- password authentication;
- Google OAuth.

The following remain open or require reconciliation during implementation planning:

- exact JWT claim set;
- token lifetime;
- refresh mechanism;
- revocation;
- logout;
- active Business switch mechanism;
- MFA mechanism;
- Google onboarding under User + Membership;
- token delivery in Google OAuth callback;
- session/device management.

The current `empresaId` claim is **not approved as the final authorization authority**.

The current role/permission claims are **not approved as the sole authorization authority**.

## Explicit Non-Decisions

This decision does NOT approve:

- database schema changes;
- ORM changes;
- REST vs GraphQL;
- JWT library replacement;
- refresh-token implementation;
- server-side session storage;
- token lifetime;
- token revocation implementation;
- logout implementation;
- MFA implementation;
- Business Switch endpoint/protocol;
- infrastructure changes;
- migration/cutover;
- production deployment.

## Relationship to Previous Decisions

This decision is subordinate to and consistent with:

- R8-ARCH-001 — Modular Monolith / first-slice architectural boundary;
- R8-ARCH-002 — application-level tenant isolation;
- OR-B2 authorization model: Membership → Role → Permission;
- OR-B2 token-is-not-authorization ruling;
- OR-B2 User global / multiple Memberships;
- OR-B3 controlled Customer↔User association;
- OR-B3 MFA mandatory for Owner/Admin.

## Gate

**R8-ARCH-003: CLOSED — OWNER APPROVED.**

Implementation remains **NOT AUTHORIZED**.

Next controlled work may reconcile downstream architecture/invariants/contracts and continue the R8 readiness sequence without treating this decision as approval for structural implementation.
