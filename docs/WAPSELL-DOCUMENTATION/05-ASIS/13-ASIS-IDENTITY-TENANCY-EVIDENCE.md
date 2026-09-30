# Wapsell — AS-IS Identity / Tenancy Evidence v0.1

**Status:** DRAFT — AS-IS EVIDENCE / NON-NORMATIVE  
**Date:** 2026-09-29  
**Task:** TASK-ASIS-001  
**Classification:** VERIFIED BY CODE / NOT DETERMINABLE WHERE NOT OBSERVED

## 1. Purpose

Document the repository behavior actually observed for authentication, current Empresa tenancy, `empresaId` propagation and authorization-related data.

This document does not define the Wapsell TO-BE architecture and does not authorize Membership migration or authorization redesign.

## 2. Evidence inspected

Repository files directly inspected:

- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/jwt.strategy.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.types.ts`
- `apps/api/prisma/schema.prisma`

## 3. User / Empresa relationship

### VERIFIED BY CODE

The Prisma schema defines:

- `Empresa` as a persisted entity;
- `Usuario.empresaId` as a required field;
- `Usuario.empresa` as a relation to `Empresa`;
- `Empresa.usuarios` as the inverse relation.

Therefore, in the observed AS-IS persistence model, a `Usuario` is associated with one `Empresa` through a required `empresaId`.

The observed model does not contain a Membership entity connecting a global User to multiple Businesses.

### NOT DETERMINABLE FROM THIS SLICE

This evidence alone does not establish whether other repository components implement any alternative contextual tenancy mechanism.

## 4. Authentication

### VERIFIED BY CODE

`AuthService.login()` calls `verificarCredenciales()` and then `emitirSesion()`.

Password authentication:

- queries `Usuario` by unique email;
- includes `usuarioPermisos` and `empresa`;
- rejects missing/inactive users or users without a local password;
- compares passwords with bcrypt;
- emits an UnauthorizedException with the same generic credential message for invalid cases.

The authentication response contains an access token and user/session information.

Google authentication is also wired through the AuthController and AuthGoogleService path, based on the observed controller.

## 5. JWT tenancy context

### VERIFIED BY CODE

The JWT payload contains:

- `sub`;
- `email`;
- `nombre`;
- `empresaId`;
- `permisos`;
- `rol`;
- `estadoLegajo`;
- `type`.

`JwtStrategy.validate()` returns an authenticated request user containing `empresaId` and the authorization-related fields from the token.

Therefore the current authentication context carries one `empresaId` in the JWT.

## 6. Permissions

### VERIFIED BY CODE

The Prisma model contains:

- `Permiso`;
- `UsuarioPermiso`;
- unique `[usuarioId, permisoId]`.

The JWT emitted by `AuthService.emitirSesion()` receives permission names from the user's `usuarioPermisos`.

The code comments explicitly state that permissions are embedded in the JWT so a permission lookup is not required on every request.

The same comments state a known limitation: revoking a permission does not invalidate an already-issued token immediately.

### NOT DETERMINABLE FROM THIS SLICE

The exact runtime guard/decorator implementation that consumes these permissions was not established by the files inspected in this task.

Therefore this slice does not claim complete authorization-path verification.

## 7. Role model

### VERIFIED BY CODE

The current Prisma enum `RolUsuario` contains:

- `OWNER`;
- `ASISTENTE_LOCAL`;
- `PROVEEDOR`;
- `REPARTIDOR`.

The current JWT type definitions mirror these values.

The schema comments state that the role is assigned to the User account and is not, by itself, the granular permission mechanism.

### AS-IS / TO-BE distinction

The current role model is part of the existing implementation. It must not be treated as equivalent to the future Membership-based role model without an approved transformation specification.

## 8. Invitation model

### VERIFIED BY CODE

The Prisma schema contains `Invitacion` with:

- `empresaId`;
- `rol`;
- invitation token;
- inviter User;
- expiration;
- usage timestamp.

The observed schema therefore already contains an invitation mechanism associated with an Empresa.

No Membership relation was observed in the inspected schema.

## 9. Current authorization boundary

### VERIFIED BY CODE

The observed authentication context is centered on:

`Usuario → empresaId → JWT → permisos/rol`.

### NOT DETERMINABLE

This slice does not establish the complete authorization algorithm for every protected operation.

In particular, it does not establish from the inspected files:

- exact guard sequence;
- exact middleware/interceptor chain;
- whether every protected operation revalidates Business context against the database;
- complete fail-closed behavior for every endpoint;
- complete permission enforcement coverage.

These remain evidence gaps and/or specification concerns.

## 10. AS-IS → TO-BE disposition

| Observed capability | AS-IS evidence | Initial disposition | Confidence |
|---|---|---|---|
| User authentication | AuthService/AuthController | PRESERVE / ADAPT subject to TO-BE | VERIFIED BY CODE |
| Empresa association | Prisma Usuario → Empresa | ADAPT | VERIFIED BY CODE |
| empresaId in JWT | AuthService/JwtStrategy | ADAPT | VERIFIED BY CODE |
| Granular permissions | Permiso/UsuarioPermiso + JWT | PRESERVE / ADAPT | VERIFIED BY CODE |
| Fixed User role | RolUsuario | ADAPT | VERIFIED BY CODE |
| Invitation by Empresa | Invitacion | ADAPT | VERIFIED BY CODE |
| Membership | Not observed in inspected schema | MISSING in inspected slice | VERIFIED BY CODE for inspected schema |
| Complete authorization algorithm | Not established | NOT DETERMINABLE | Evidence gap |

These dispositions are preliminary AS-IS/TO-BE traceability, not implementation decisions.

## 11. Relationship with canonical Wapsell decisions

The observed AS-IS must be compared against:

- D-001: Business/Tenant;
- D-002: global User + Membership;
- D-005: Membership-scoped roles/permissions;
- D-006: contextual authorization.

The current code clearly uses an Empresa-associated User model and therefore does not by itself demonstrate the target Membership model.

D-006 exact authorization mechanics remain OPEN and are not resolved by this evidence task.

## 12. Non-scope

This evidence task does not authorize:

- Membership schema creation;
- User migration;
- Business migration;
- role migration;
- authorization redesign;
- JWT redesign;
- API changes;
- permission model changes;
- deletion/replacement of existing authentication code.

## 13. Evidence summary

### VERIFIED BY CODE

1. Usuario has required `empresaId` relation to Empresa.
2. Empresa has Usuario relation.
3. Authentication by email/password exists.
4. Google authentication path exists.
5. JWT carries `empresaId`.
6. JWT carries permissions.
7. Permission records use Usuario ↔ Permiso.
8. User roles exist as a fixed enum.
9. Invitation records are Business/Empresa-scoped.
10. No Membership model was observed in the inspected Prisma schema.

### NOT DETERMINABLE FROM THIS SLICE

1. Complete protected-endpoint authorization coverage.
2. Exact runtime permission guard implementation.
3. Complete Business-context enforcement across all endpoints.
4. Whether additional tenancy mechanisms exist outside the inspected files.

## 14. Status

**TASK-ASIS-001: EVIDENCE SLICE DOCUMENTED — NOT AN IMPLEMENTATION RESULT.**

This document records observed AS-IS behavior only. It does not declare the Wapsell Identity/Tenancy transformation complete.

The next evidence step, if required, is repository-wide verification of the authorization/permission enforcement path and `empresaId` propagation across protected business modules.
