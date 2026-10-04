# R8-ARCH-003 — AUTHENTICATION / SESSION BOUNDARY ASSESSMENT

**Fecha:** 2026-10-03  
**Estado:** CONDITIONAL PASS — READY FOR OWNER DECISION, NOT APPROVED  
**Task:** R8-ARCH-003  
**Scope:** authentication/session boundary for the Wapsell target architecture

---

## 1. Purpose

This assessment closes the architectural boundary for authentication and session handling required by the approved R8 first-slice architecture.

It distinguishes:

- verified AS-IS implementation;
- already-approved canonical authorization/tenancy decisions;
- architectural implications;
- options that require Owner decision.

This document does **not** approve implementation, schema changes, migration, token redesign, or a specific authentication mechanism.

---

## 2. Evidence Classification

### VERIFICADO POR CÓDIGO

The current repository contains:

- JWT authentication through Passport/JWT.
- A global `JwtAuthGuard`.
- A global `PermissionsGuard`.
- JWT expiration configured to 8 hours.
- No refresh-token mechanism evidenced in the inspected authentication module.
- Password authentication using bcrypt.
- Google OAuth authentication.
- JWT payload containing:
  - `sub`
  - `email`
  - `nombre`
  - `empresaId`
  - `permisos`
  - `rol`
  - `estadoLegajo`
  - `type`
- `type` distinguishes `usuario` and `cliente`.
- The current internal user token contains a single `empresaId`.
- Permissions are embedded in the JWT.
- Permission changes are therefore not reflected until a new token is issued.
- `GET /auth/me` performs a fresh database lookup.
- Google login can create a User automatically when configured with `GOOGLE_SIGNUP_EMPRESA_ID`.
- Google callback currently redirects with the access token as a URL query parameter.
- Client authentication is separately implemented but uses the same JWT strategy/secret and a `type: 'cliente'` discriminator.
- Current authentication is therefore materially coupled to the legacy Empresa model.

### DOCUMENTADO

Already approved canonical decisions establish:

- User is a global identity.
- Business is the tenant/business context.
- Membership belongs to the User↔Business relationship.
- A User may have multiple Memberships.
- Active Business switching is conceptually supported.
- Membership authorization follows Membership → Role → Permission.
- A token alone does not authorize an operation.
- Authorization requires:
  1. authenticated User;
  2. target/active Business;
  3. valid Membership;
  4. Role/Permission authorization.
- INACTIVE Membership cannot operate.
- MFA is mandatory for Owner/Admin, while the technical mechanism remains open.
- Application-level tenant isolation was approved as the primary technical isolation strategy.
- Client-supplied Business identifiers are not authoritative for Business-scoped operations.
- Implementation remains NOT AUTHORIZED.

### NO DETERMINABLE CON LA INFORMACIÓN DISPONIBLE

The inspected evidence does not establish:

- whether JWT should remain the final session mechanism;
- whether sessions should be server-side, stateless, or hybrid;
- exact access-token lifetime for TO-BE;
- refresh-token mechanism;
- token rotation/revocation strategy;
- logout/revocation semantics;
- session/device management;
- exact active-Business switch mechanism;
- whether active Business is represented in a token, server-side session, request context, or another mechanism;
- exact MFA mechanism;
- exact authentication provider architecture;
- production cutover strategy.

---

## 3. AS-IS Authentication Boundary

Current effective boundary:

```
Credential / Google OAuth
        ↓
Legacy Usuario / Cliente
        ↓
JWT
        ↓
JwtAuthGuard
        ↓
request.user
        ↓
PermissionsGuard
        ↓
Business-scoped operation using empresaId
```

For internal Users, the JWT carries one `empresaId`.

Therefore the current session model implicitly combines:

- authentication identity;
- tenant selection;
- authorization snapshot.

This is acceptable as an AS-IS description but is not sufficient as the canonical Wapsell target boundary because User and Business are no longer the same security context.

---

## 4. Canonical TO-BE Boundary

The approved target security boundary is:

```
Authentication
    ↓
Global User identity
    ↓
Active Business Context
    ↓
Valid Membership(User, Business)
    ↓
Role
    ↓
Permission
    ↓
Authorized operation
    ↓
Business-scoped persistence
```

The key distinction is:

> Authentication establishes who the User is. It does not by itself establish which Business the User is authorized to operate on.

Business context must therefore be resolved and validated separately from the mere existence of a valid authentication credential.

---

## 5. Architectural Consequences

### 5.1 User identity must be global

The session/authentication model must not make one Business an intrinsic property of the User.

The current `empresaId` field in the JWT is therefore an AS-IS coupling point requiring reconciliation during transformation.

### 5.2 Business context must be explicit

A request operating on Business-scoped data must execute under an established Business context.

That context must be validated against an active Membership.

### 5.3 Token contents cannot be treated as authorization truth

The canonical model already establishes that a token alone does not authorize.

Therefore:

- `empresaId` in a token cannot be trusted as the sole authorization boundary;
- role/permission claims cannot be treated as permanently authoritative if Membership or permissions can change;
- persistence authorization must validate the effective Business context and Membership.

This does not by itself prohibit claims in a token. It establishes that claims are not the final authorization authority.

### 5.4 Active Business switching is required conceptually

Because a User can have multiple Memberships, the session/request model must eventually support:

```
User U
 ├── Membership → Business A
 ├── Membership → Business B
 └── Membership → Business C
```

and a request must operate against one effective Business context.

The mechanism remains OPEN.

### 5.5 MFA is an authentication concern

The approved MFA requirement for Owner/Admin must be incorporated into the authentication boundary, but the mechanism is not selected by this assessment.

---

## 6. Options for Session Architecture

### Option A — JWT-centric session with validated active Business context

Concept:

- Continue using access JWTs.
- JWT authenticates the User.
- Active Business context is resolved/validated per request or through a controlled context mechanism.
- Membership and Permission remain authoritative at application level.
- Token claims are treated as optimization/context hints, not sole authorization truth.

Advantages:

- closest to AS-IS;
- incremental migration path;
- compatible with current NestJS/Passport implementation;
- low conceptual migration cost.

Risks:

- requires careful distinction between authentication claims and authorization state;
- revocation/permission changes remain an explicit concern;
- active Business switching must not become an insecure client-controlled `empresaId` override.

### Option B — Short-lived access JWT + refresh/session mechanism

Concept:

- short-lived access token authenticates the User;
- refresh/session mechanism maintains longer-lived authentication;
- Business context remains application-controlled;
- Membership/Permission remain authoritative.

Advantages:

- better control over credential lifetime;
- easier future session revocation/rotation design;
- separates authentication continuity from authorization state.

Risks:

- additional persistence and lifecycle complexity;
- refresh-token rotation/revocation must be designed;
- more migration work than Option A.

### Option C — Server-side session

Concept:

- browser/client holds a session identifier;
- server-side session contains authenticated identity/session state;
- active Business context can be managed server-side;
- authorization still validates Membership → Role → Permission.

Advantages:

- strong session revocation/control;
- active Business context can be represented without trusting client-provided tenant identifiers;
- authorization state can be refreshed centrally.

Risks:

- introduces server-side session state;
- requires session storage and lifecycle;
- materially changes current JWT-centric implementation.

---

## 7. Recommended Decision Frame

The evidence supports **Option A as the lowest-risk incremental transformation path**, but this is a recommendation, not an approval.

If Option A is selected, the architectural rule should be:

> JWT authenticates the global User; the application establishes the active Business context and validates the corresponding Membership before Business-scoped authorization and persistence.

The following must remain outside the architectural decision unless explicitly closed later:

- exact JWT claim set;
- token lifetime;
- refresh tokens;
- revocation;
- logout;
- active Business switch endpoint/protocol;
- MFA implementation;
- schema;
- API protocol;
- infrastructure.

---

## 8. Security Invariants for the Authentication Boundary

The following invariants are proposed for downstream reconciliation:

1. A valid authentication credential identifies a User but does not by itself authorize access to a Business.
2. A Business-scoped operation requires an established Business context.
3. The effective Business context must correspond to an ACTIVE Membership of the authenticated User.
4. An INACTIVE Membership cannot authorize operations.
5. A Business identifier supplied by an untrusted client cannot override the server-established Business context.
6. Role and Permission authorization are evaluated within the authenticated User's Membership for the effective Business.
7. Authentication claims must not bypass Business isolation.
8. A User may authenticate once and operate across multiple Businesses only through valid Memberships.
9. A Customer token must not be interpreted as an internal User Membership.
10. Authentication/session mechanics must not weaken the approved application-level tenant isolation boundary.
11. Owner/Admin MFA requirement must be enforced by the final authentication design.
12. Session/authentication failure must fail closed for protected operations.

These are candidate invariants pending Owner/architecture approval.

---

## 9. AS-IS Disposition

| AS-IS component | Disposition |
|---|---|
| JWT authentication | ADAPTED / mechanism remains under decision |
| Passport JWT strategy | ADAPTED / implementation detail |
| Global JwtAuthGuard | ADAPTED |
| Global PermissionsGuard | ADAPTED |
| 8h access token | OPEN — not canonical |
| `empresaId` inside JWT | RECONCILE — cannot remain the authorization authority |
| Role/permissions inside JWT | RECONCILE — claims cannot be sole authorization authority |
| Password authentication | ADAPTED |
| Google OAuth | ADAPTED |
| Client JWT `type` discriminator | OPEN / domain-specific reconciliation |
| Google auto-provisioning | OPEN — must be reconciled with Membership onboarding |
| Token-in-URL Google callback | SECURITY REVIEW REQUIRED during implementation planning |
| No refresh mechanism | OPEN |
| No explicit session revocation mechanism evidenced | OPEN |

---

## 10. R8-ARCH-003 Gate

**Assessment result: CONDITIONAL PASS — READY FOR OWNER DECISION.**

The architectural boundary is sufficiently understood to make the next decision.

No implementation should begin from this assessment alone.

### Owner decision required

Choose one:

- **A — JWT-centric, with application-controlled active Business context**
- **B — Short-lived JWT + refresh/session mechanism**
- **C — Server-side session**
- **D — Do not decide yet; keep authentication/session mechanism OPEN**

A selection of A/B/C closes the high-level authentication/session architecture only. It does not approve implementation details.

---

## 11. Next Step After Decision

After Owner decision:

1. record the decision in the Decision Register;
2. close R8-ARCH-003;
3. reconcile affected architecture/invariants/contracts only as authorized;
4. continue with the next controlled R8 task;
5. keep implementation NOT AUTHORIZED until the implementation-readiness gate explicitly permits it.


## 12. OWNER DECISION CLOSURE — 2026-10-03

Decision state is superseded by `03-DECISIONS/29-R8-ARCH-003-OWNER-DECISION-AUTHENTICATION-SESSION-2026-10-03.md`.

**CLOSED — OWNER APPROVED.** The Owner selected **Option A — JWT-centric authentication with application-controlled active Business context**.

Approved conceptual boundary: `Authenticated User → Active Business Context → Valid ACTIVE Membership → Role → Permission → Authorized Operation → Business-scoped Persistence`.

JWT may authenticate the global User, but a valid JWT alone does not authorize Business access. The current `empresaId` claim and role/permission claims are not the final authorization authority. Active Business selection must be validated against an ACTIVE Membership, and authentication/session failures must fail closed.

Owner/Admin MFA remains mandatory; its technical mechanism remains open. Exact JWT claims, token lifetime, refresh mechanism, revocation, logout, Business Switch protocol, Google onboarding mechanics, session/device management and other physical implementation details remain downstream technical work unless separately closed.

**Implementation remains NOT AUTHORIZED.**
