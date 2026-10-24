# Auth/Tenancy — Route & Direct Prisma Inventory Delta

**Date:** 2026-10-24  
**Status:** PRELIMINARY SOURCE INVENTORY — NOT A CLOSURE GATE  
**Base:** `main` after PR #78 merge, `0b384204da5b445e4eedfda6c5fa6183a6bcc8c1`  
**Method:** GitHub source search + inspection of current guard, BusinessContextService, MembershipService and existing AS-IS matrix. No local checkout, DB inspection, or test execution in this audit.

## 1. Result

The existing `04-ASIS/14-ASIS-ENDPOINT-AUTH-TENANCY-MATRIX.md` is useful historical evidence but does not cover the complete current API surface. Current source search shows additional/expanded surfaces for Membership, Business Context, Messaging, public-store slug context and S-V1 HTTP regressions. This delta is intentionally not labeled exhaustive: search snippets do not prove that every route or every Prisma access site has been enumerated.

### Current global authorization chain

`AppModule` registers global guards in this order:

1. `JwtAuthGuard`: requires a valid JWT unless the handler/class is marked `@Public()`.
2. `PermissionsGuard`: evaluates `@RequirePermission(...)` against `request.user.permisos`; endpoints without that decorator remain authenticated-only at this guard.
3. `StaffIdentityGuard`: additional staff identity enforcement.

The permission guard still reads the permission list from the authenticated request/JWT identity rather than loading the current permission set itself. Some controller paths additionally resolve BusinessContext; this does not make every endpoint's permission check current-state based.

## 2. Route surface delta

| Surface | Current evidence | Classification / follow-up |
|---|---|---|
| Password and Google auth | `AuthController`, `AuthCustomerController`; login and OAuth entry/callback are explicitly public | Public/pre-context by design. Verify provider-verified email and token transport separately. |
| Public store | `StoreController`, `PublicStoreController`; public product/hierarchy and order flows; public-store resolves a business slug | Public/pre-context, but slug must resolve to an existing Business/Empresa and tenant-scoped data must remain bounded. |
| Invitations | `POST /invitaciones/activar` and majorista activation are public; creation/listing uses authenticated identity and permission decorators | Activation token is a credential. Test token purpose separation, expiry, replay and tenant binding. |
| Membership | `MembershipController` and `MembershipService`; membership service is read-only and resolves the canonical User from the session's legacy `Usuario.id` link | Protected identity surface; inventory exact controller routes and verify current membership status semantics. |
| Business Context | `BusinessContextService.resolveForAuthenticatedUser` checks identity type, linked User and exactly one ACTIVE Membership; no active membership denies, multiple active memberships conflict. Customer and anonymous context have separate resolvers. | Current context resolution is partially implemented. There is no explicit multi-business selection/switch flow when multiple active memberships exist; the resolver fails closed instead. |
| Messaging | `MessagingController` exists in current source | Add all HTTP and gateway events to the route/event classification matrix; do not infer protection from the controller's existence alone. |
| Core business modules | Sales, payments, cash register, inventory, purchases, customers, catalog, orders, loyalty, authorizations and dossier controllers are present | Existing matrix covers many legacy endpoints but must be reconciled against current decorators, context resolvers and newer routes. |

## 3. Direct Prisma access — initial classification

The base `PrismaService` is exported alongside `CompanyScopedPrismaService`. Its use is not automatically a tenant leak: identity lookup, membership resolution, health probes and explicit ownership checks may legitimately use the base client. However, every business-data path must have a documented authorization/tenant boundary because the base client does not receive the company-scope extension.

| Source area found by code search | Why base Prisma appears | Required verification |
|---|---|---|
| `auth.service.ts`, `auth.google.service.ts`, `auth.customer.service.ts` | Credential lookup, identity provisioning and profile/session flows | Confirm canonical email handling, account-linking policy, safe projections, and tenant selection rules. |
| `membership.service.ts` | Resolve legacy `Usuario` → canonical `User`; read Memberships for that User | Confirm caller always supplies session-derived legacy identity; enforce status and prevent arbitrary user ID input at controller/service boundary. |
| `business-context.service.ts` | Resolve customer, public slug and Business→Empresa adapter; read legacy permissions | Confirm every protected business operation invokes current context resolution before data access and no JWT `empresaId` fallback becomes authority. |
| `invitations.service.ts` | Invitation token lifecycle and activation; includes batch transactions on the base client in the existing transaction inventory | Verify token purpose, tenant derived from persisted invitation, and authorization on every mutation. Batch transactions are not protected by the Prisma extension mechanism. |
| `dossier.service.ts` and dossier controllers | Self-service and approval/document workflows | Verify object ownership and `empresaId` constraints on each ID-based read/write/download. |
| `cart.service.ts` | Customer cart flows; search shows both base Prisma and scoped factory injection | Trace each operation: public cart lookup must be bound to the correct customer/business and cannot accept a forged customer/business identifier. |
| `health.controller.ts` | Health probe uses base Prisma for connectivity | `SELECT 1` is infrastructure-only; keep response free of sensitive database detail. |

This is a prioritized list of code-search hits, not a claim that these are the only base-client consumers. A complete count requires enumerating all production TypeScript files and tracing each injected dependency to each operation.

## 4. Raw SQL / transaction cross-reference

Existing inventories `13-AUDIT/27-B3-PRISMA-PERSISTENCE-OPERATION-AUDIT-2026-10-04.md` and `13-AUDIT/28-TRANSACTIONAL-AND-RAW-SQL-SURFACE-INVENTORY-2026-10-04.md` already identify:

- A parameterized inventory `$executeRaw` whose SQL includes an explicit tenant predicate; the Prisma extension does not intercept raw SQL.
- A health `$queryRaw` used for `SELECT 1`.
- Offline migration scripts with `$queryRawUnsafe`, outside the request path.
- Two invitation batch transactions using the unscoped base client.

These are historical inventories from 2026-10-04 and should be reconciled with current `main` before treating their counts as current. No new raw-SQL count is asserted here.

## 5. Security gaps and test coverage boundaries

1. `PermissionsGuard` returns true for endpoints without `@RequirePermission`; that may be intentional for some read/self-service routes, but it is not a fail-closed target authorization policy by itself.
2. JWT-carried permissions remain the guard's source of truth; immediate permission revocation is not guaranteed by this guard.
3. BusinessContext now checks ACTIVE Membership and rejects zero/multiple active memberships; this is a positive control, but not a Business Switch implementation.
4. Public endpoints must be explicitly classified by purpose and tenant boundary; `@Public()` alone does not prove safe data scoping.
5. Existing S-V1 integration files cover BusinessContext and several HTTP business flows. Their existence is source evidence only; this audit did not execute them.
6. OAuth callback places the access token in a URL query parameter according to the previous source audit; track as a separate transport risk and preserve client contract until a reviewed migration is approved.

## 6. Next safe sequence

1. Generate a reproducible full route inventory from all API controllers, including HTTP method, path, `@Public`, permission decorator, extra guards, BusinessContext resolver and test reference.
2. Generate a complete production `PrismaService` injection/use inventory, separating identity/pre-context reads from business-data operations and tracing ownership predicates.
3. Reconcile these inventories against current `main`, existing S-V1/B3 tests and historical audit docs; add missing regression cases before implementation.
4. Keep schema, migration, data backfill and cutover changes out of this audit package. Email normalization must follow a collision audit; do not infer production data safety from source code or CI fixtures.

## Evidence boundary

This document is source-inspection evidence only. No tests were executed in this audit, no database contents were inspected, and no runtime, schema, migration, data or deployment changes were made.
