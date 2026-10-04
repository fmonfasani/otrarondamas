# WAPSELL — R8-ARCH-003 AUTHENTICATION / SESSION / BUSINESS CONTEXT CONTRACT v0.1

**Status:** DRAFT — TASK-LOCAL CONTRACT / OWNER APPROVED DIRECTION  
**Date:** 2026-10-04  
**Task:** R8-ARCH-003  
**Implementation:** NOT AUTHORIZED

## 1. Purpose

Formalize the approved JWT-centric authentication boundary and application-controlled active Business Context without inventing JWT claims, token lifetime, refresh implementation, storage, endpoint shape or MFA technology.

## 2. Authority

Primary: R8-ARCH-003 Owner Decision.
Supporting: R8-ARCH-002, R8-AUTH-001, R8-ID-002, R8-ID-003, Block 1 Architecture, Identity/Tenancy Contracts.

## 3. Canonical security chain

Authenticated User → Active Business Context → ACTIVE Membership → Role → Permission → Authorized Operation → Business-scoped Persistence

JWT authenticates the global User. JWT alone does not authorize Business access.

## 4. Authentication contract

### AUTH-001
A valid authentication credential establishes an authenticated global User identity.

### AUTH-002
Authentication does not by itself establish authorization for a Business.

### AUTH-003
Existing JWT authentication remains the incremental AS-IS foundation and may be adapted rather than replaced by assumption.

### AUTH-004
Google OAuth remains an authentication path and must reconcile to the global User + Membership model rather than legacy Empresa authorization.

### AUTH-005
Authentication/session failure for a protected operation fails closed.

## 5. Active Business Context contract

### CTX-001
Protected Business-scoped operations execute under an application-controlled active Business Context.

### CTX-002
The effective Business must correspond to an ACTIVE Membership of the authenticated User.

### CTX-003
A client-supplied Business identifier is untrusted input and cannot override the authoritative context.

### CTX-004
Missing, invalid or unauthorized Business Context fails closed.

### CTX-005
A User may operate across multiple Businesses through valid Memberships.

### CTX-006
Business Context must be consistent with the Business scope used by persistence and related/nested operations.

## 6. Session contract

Session continuation, revocation and logout must preserve the Business authorization boundary.

A session mechanism may maintain authentication continuity, but it must not bypass Membership → Role → Permission authorization.

Required conceptual properties:
- protected sessions can be invalidated/revoked according to the selected mechanism;
- inactive/revoked access cannot continue to authorize protected operations;
- active Business Context is not trusted merely because it appears in a client-controlled value;
- context changes must still resolve against valid Membership.

Exact mechanism remains OPEN.

## 7. JWT boundary

JWT may carry authentication/session context, but the following are NOT approved as sole authorization truth:

- `empresaId` claim;
- role claims;
- permission claims.

Exact claim set, issuer/audience, signing configuration, lifetime, refresh, revocation and transport remain OPEN.

## 8. MFA

MFA/2FA is mandatory for Owner and Admin.

The technical MFA mechanism, enrollment, recovery, challenge lifecycle and enforcement point remain OPEN.

## 9. Business switching

The product supports a controlled active Business Context for Users with multiple Memberships.

The following are closed:
- context must resolve through Membership;
- inactive Membership cannot be selected as an authorized context;
- switching cannot grant access outside the User's valid Memberships;
- switching cannot override application-level tenant isolation.

The transport/API/session representation of Business Switch remains OPEN.

## 10. Legacy coexistence

During bounded coexistence:

- legacy Usuario/Empresa/session structures may remain;
- legacy `empresaId` is transitional compatibility data;
- legacy authorization cannot become a parallel permanent authority;
- current JWT/Passport mechanisms may be adapted;
- no legacy component is deleted by this contract.

R8-ID-003 defines the detailed coexistence boundary.

## 11. Authorization interaction

Authentication/session resolves the global User and context. Authorization remains:

Membership → Role → Permission.

Therefore:

- valid JWT + no Membership = denied;
- valid JWT + INACTIVE Membership = denied;
- valid JWT + valid Membership + insufficient Permission = denied;
- valid JWT + Business A context cannot access Business B;
- UI visibility cannot substitute for server authorization.

## 12. Tenant-isolation interaction

Business Context is the upstream context for application-level tenant isolation.

Persistence must:
- create Business ownership from authoritative context;
- constrain reads/writes/deletes to context;
- protect unique lookups;
- preserve ownership in related/nested operations;
- preserve isolation across transactions.

The existing `EmpresaScopedPrismaService` / `empresaScopeExtension` remains an AS-IS adaptation candidate, not an automatically replaced component.

## 13. Explicitly OPEN

1. exact JWT claims;
2. access-token lifetime;
3. refresh/session-continuation mechanism;
4. revocation representation;
5. logout semantics;
6. device/session management;
7. Business Switch transport/API;
8. context storage/propagation mechanism;
9. MFA technology and recovery;
10. Google onboarding implementation;
11. exact authorization enforcement mechanism;
12. physical User/Business/Membership schema;
13. API error contract;
14. migration/cutover mechanics.

## 14. Preservation classification

| AS-IS | Disposition |
|---|---|
| JWT authentication | ADAPTED / COEXISTENCE |
| Passport JWT strategy | ADAPTED / COEXISTENCE |
| JwtAuthGuard | ADAPTED / technical reconciliation required |
| PermissionsGuard | ADAPTED / target authorization reconciliation required |
| password authentication | PRESERVED / ADAPTED |
| Google OAuth | PRESERVED / ADAPTED |
| `empresaId` auth claim | TRANSITIONAL / not final authority |
| role/permission claims | TRANSITIONAL / not sole authority |
| legacy session/token behavior | BOUNDED COEXISTENCE |
| target Business Context | NEW CANONICAL BOUNDARY |

## 15. Verification requirements

Applicable evaluations must cover:
- authenticated User without Membership;
- inactive Membership;
- valid Membership in Business A accessing Business B;
- client Business ID attempting context override;
- unique lookup across Businesses;
- nested persistence across Businesses;
- revoked/invalid session;
- Google-authenticated User resolved through target identity model;
- Owner/Admin MFA requirement;
- Business switch to valid Membership;
- Business switch to invalid Membership.

No execution is claimed by this contract.

## 16. Exit criteria

R8-ARCH-003 technical contract is closed for downstream implementation planning when the open technical choices required by the selected implementation slice are separately specified and approved, without inventing values.

This contract itself does not authorize implementation.

## 17. Gate

**R8-ARCH-003: CONTRACT-LEVEL RECONCILIATION COMPLETE.**

**Owner architectural direction: CLOSED.**

**Technical session/context details: OPEN.**

**Implementation: NOT AUTHORIZED.**