# Auth & Tenancy — AS-IS Gap Audit Against T-01–T-10

**Date:** 2026-10-24. **Source:** GitHub `main` after PR #76/#77. **Method:** source inspection only; no local checkout or test execution. CODE-INSPECTED does not mean runtime-verified.

## Result

The target T-01–T-10 policy is only partially aligned with the current runtime. Existing tenant-isolation coverage is meaningful but targets the legacy `Empresa` / `Usuario` model; it does not prove the complete target `User → Membership → Business` lifecycle.

| Decision | Source finding | Disposition |
|---|---|---|
| T-01 Email normalization | **Gap visible:** password login queries `where: { email }`; Google flow looks up/creates using raw profile email. No canonicalization is visible in inspected paths. | Implement canonicalization only after auditing normalized collisions; do not alter uniqueness constraints yet. |
| T-02 Verified Google email | **Gap visible:** `GoogleStrategy.validate` checks email presence only and discards provider verification metadata; `AuthGoogleService` links existing accounts by email equality. | Preserve verification metadata and reject unverified linking/auto-provisioning. |
| T-03 JWT ≠ authorization | **Gap visible:** JWT includes `empresaId`, `permisos`, `rol`, `estadoLegajo`; `PermissionsGuard` trusts token permissions. | Move target authorization to current server-side state behind a reviewed legacy compatibility boundary. |
| T-04 Current Membership/revocation | **Gap visible:** `/auth/me` re-reads profile/role/status but returns permissions from JWT. Auth types explicitly note permission revocation is not immediate. Membership API is read-only. | Add current Membership/Permission checks and revocation tests. SLA remains open. |
| T-05 Business Switch | **Incomplete:** current session is anchored to one `empresaId`; `/auth/memberships` lists memberships but does not establish active trusted context. | Specify switch API/session semantics and validate ACTIVE Membership server-side. |
| T-06 Tenant isolation | **Partial positive:** `CompanyScopedPrismaService` applies a Prisma extension; unsupported operations fail closed and relational ownership checks exist. Direct `PrismaService` use remains a separate bypass-audit requirement. | Preserve B3 tests; inventory all raw SQL/direct Prisma call sites and verify each path. |
| T-07 Safe response DTOs | **Partial positive:** login and `/auth/me` construct explicit response objects excluding password hash. Exhaustive DTO inventory not established. | Add schema assertions for all auth/profile/OAuth/error responses. |
| T-08 MFA Owner/Admin | **Not established in inspected auth files:** no MFA assurance state or enforcement path was found. | Decide provider/protocol/enrollment/recovery before implementing. |
| T-09 Explicit route classification | **Partial:** global JWT guard defaults to authenticated unless `@Public()`; `PermissionsGuard` allows any authenticated user where no permission decorator exists. This is not a complete explicit route inventory. | Inventory every route, classify public/pre-context vs Business-protected, and assert fail-closed behavior. |
| T-10 Auditability | **Not established in inspected auth/membership files:** membership service is read-only; no complete event trail was evidenced for membership/role/permission/context changes. | Define event contract, storage, retention and access policy before claiming compliance. |

## Existing test coverage found by source inspection (not executed)

- `apps/api/test/integration/tenant-isolation.integration-spec.ts`: two-company fixtures, scoped reads, fail-closed unique lookup.
- `apps/api/test/integration/b3-tenant-isolation.integration-spec.ts`: `TE-ID-006` client `empresaId` override, `TE-ID-008` cross-company read, `TE-ID-009` cross-company update, `TE-B3-001` nested relation ownership, `TE-B3-006` transaction behavior, `TE-B3-007` unsupported persistence operations fail closed, plus nested relation coverage for Venta/Pedido/Compra.
- These tests exercise legacy `Empresa` and `CompanyScopedPrismaService`; they do not prove current Membership authorization, Business Switch, MFA, or token revocation.

## Regression matrix disposition

| Family | Audit status | Required next tests |
|---|---|---|
| SEC-T01 normalization/collision | GAP | Canonicalization unit tests; collision audit dry-run before constraints |
| SEC-T02 verified Google email | GAP | Reject unverified profile; verified linking and signup tests |
| SEC-T03 current Membership/Permission | GAP | Valid JWT with absent Membership or missing Permission must be denied |
| SEC-T04 revocation before token expiry | GAP | Revoke between requests; next protected request must deny |
| SEC-T05 Business Switch | GAP | No/INACTIVE Membership; forged body/query/header tenant ID |
| SEC-T06 tenant isolation | PARTIAL | Preserve B3 tests; audit direct Prisma/raw SQL and missing operation paths |
| SEC-T07 secret exclusion | PARTIAL | DTO schema assertions for login, profile, OAuth and errors |
| SEC-T08 MFA | GAP | MFA assurance and privileged route tests after mechanism decision |
| SEC-T09 route classification | PARTIAL | Route inventory check plus unauthenticated/underprivileged probes |
| SEC-T10 audit events | GAP | Assert event evidence for Membership/Role/Permission/context/security actions |

## Source-level risks to track

1. `auth.types.ts` explicitly documents stale JWT permissions/dossier state until login; this conflicts with target T-03/T-04.
2. Google strategy retains only email string, not verified status; linking uses email equality.
3. Raw email lookup is visible in password and Google flows.
4. Runtime still centers on `Usuario` + `Empresa`; `MembershipService` is a read-only migration bridge, not the full target lifecycle.
5. Scoped Prisma extension is not proof that every direct Prisma/raw SQL call site is scoped.
6. `AuthController.googleCallback` places the access token in a URL query parameter; track as a separate session-transport risk and do not silently change client contract in this audit.
7. MFA and a complete audit trail were not established in the inspected files. “Not established” is not a proof of global absence.

## Recommended execution order

1. Baseline main SHA, auth route inventory, direct Prisma/raw SQL inventory, and existing test commands/workflows.
2. Close email normalization after collision audit; enforce verified Google email linking.
3. Design current server-side authorization/revocation and trusted Business Context without breaking legacy sessions.
4. Extend tenant-isolation and HTTP-level authorization regression tests.
5. Close DTO, MFA, route-classification and audit-event contracts.
6. Implement in separate PRs with executable tests, CI evidence, migration rehearsal and rollback plan.

## Limits

Source inspection only through GitHub. No local checkout, build, lint, test execution, database inspection or production verification. No application code, schema, migration or deployment changed by this audit.