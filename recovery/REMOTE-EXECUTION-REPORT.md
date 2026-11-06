# Remote Execution Report — PR #100 Recovery

**Status:** IN PROGRESS — NOT MERGE-READY  
**Branch:** `chatgpt/remote-audit-pr100`  
**Base branch:** `recovery/pr100-assets`  
**Base SHA:** `1342a7c53ffcc07159019f1c9250061587b3ed64`  

## Scope completed remotely

### 1. Tenant isolation hardening

- Expanded `MODELS_WITH_COMPANY_ID` to include all 46 tenant-scoped Prisma models with a direct `empresaId` field; the globally shared `RoleTemplate` is deliberately excluded per D-005.
- Added `MODELS_WITH_BUSINESS_ID` for all 8 models with a direct `businessId` field, including Cart and the messaging entities. This applies automatically when those models are accessed through `CompanyScopedPrismaService`; MessagingService's raw Prisma access still relies on its explicit `businessId` predicates.
- Added a schema-driven regression test that fails when any of the 54 tenant-scoped models with a direct tenant field is missing from the corresponding registry.
- Changed `findUnique` / `findUniqueOrThrow` ownership verification to query the owner independently of the caller's projection. This closes the leak where a `select` omitting `empresaId` bypassed the previous post-query check.
- Forced the authenticated tenant ID into the model's tenant field (`empresaId` or `businessId`) on `update` and `updateMany` payloads, preventing a scoped record from being reassigned to another tenant.
- Added unit coverage for unique-read ownership, direct tenant registry completeness, and update payload enforcement.
- Rebuilt the relation-ownership registry using exact Prisma schema field names. The previous lowercase names did not match the schema's case-sensitive relation fields; the registry test would fail and relation checks could reject writes. The corrected registry now covers all 104 simple-FK relations to tenant-owned models across 54 models, including CartItem's Cart and Producto references.
- Added a schema-driven regression test requiring every simple FK relation to a model with direct `empresaId` or `businessId` to appear in the ownership registry.
- Corrected stale lower-case Prisma relation names in API test fixtures and cleanup queries (`Pedido`, `Cart`, `Producto`, `Venta`, `Cliente`, `Usuario`); Prisma relation field names are case-sensitive and must match the schema.

### 2. Metrics tenant leak

- `MetricsService.getProductMetrics()` queried `VentaItem`, a relation-owned model without a direct `empresaId`, and filtered by date/status but not by the parent sale's company.
- Added `Venta.empresaId = companyId` to the relation predicate.
- Added a regression test asserting the tenant filter is included.

### 3. Business context and authorization resolution

- Replaced the invalid attempt to resolve `BusinessContextService` through `request.app.get()`. In this context, `request.app` is the Express application, not Nest's dependency-injection container.
- Added injectable `BusinessContextGuard`, which resolves the authenticated user/customer context and attaches it to the request. It honors `@Public()` metadata so public endpoints such as email unsubscribe are not accidentally blocked.
- Changed `@ExtractBusinessContext()` to read the already-resolved request context and fail explicitly if the guard did not run.
- Wired the guard into `EmailController` and imported `BusinessContextModule` into `EmailModule`.
- Added guard unit tests.
- Corrected `AuthorizationGuard`: JWT `user.id` identifies the legacy `Usuario`, while `Membership.userId` references the canonical `User`. The old guard incorrectly queried membership using the legacy ID and `user.empresaId`. It now resolves canonical `userId`, `businessId`, and `membershipId` through `BusinessContextService`, then loads that exact membership before evaluating capabilities. Registered/exported the guard from `AuthModule` and added regression assertions.
- Found that `AuditController` declared `@Authorize` metadata but only applied JWT authentication, so capability checks were not executed. Added `AuthorizationGuard` and imported `AuthModule` into `AuditModule` and `AdminModule`.
- Added `@CurrentCapabilities()`; audit visibility rules now use the new role/capability grants rather than legacy `UsuarioPermiso` data, so legacy permissions cannot override a capability DENY.
- Updated dashboard, admin-audit, metrics, colleague listing, invitation management, and staff dossier operations to derive tenant IDs from `BusinessContext`. Public invitation activation and self-service dossier completion remain outside the staff context guard by design.

### 4. Cart integrity and privacy

- Bound item update/delete operations to both the route `cartId` and `cartItemId`, plus the business boundary. Previously the route's `:id` was ignored for those mutations.
- Added `Cart` to the automatic `businessId` tenant registry so scoped Prisma operations also enforce its business boundary.
- Updated the messaging order-completion path to pass the owning cart ID when removing purchased items.
- Added an integration regression test for mismatched cart/item IDs.
- Removed the customer email/profile relation from the public cart retrieval projection and added a privacy assertion.
- Made CartItem increments/updates/deletes atomic and re-applied `cartId` plus tenant predicates at mutation time.
- Returned HTTP 400 for a missing `customerId` instead of a generic 500.
- Removed an unused `PrismaService` injection from `CartService`.

### 5. CI behavior

- Removed `--fix` from the API lint script so CI lint validates without mutating source files.
- Added `.github/workflows/backend-validation.yml` to validate the NestJS API independently (Prisma generation, build, lint, unit tests).
- Hardened the relation-test generator: generated cleanup is tenant-scoped, and generated suites remain skipped until valid fixtures are implemented.
- Disabled the two incomplete relation integration suites and replaced their global `deleteMany({})` cleanup with tenant-scoped cleanup. Their current fixture setup was incomplete and could otherwise delete all VentaItem/PedidoItem and Producto records from the connected database.

## Validation status

| Check | Status | Evidence |
|---|---|---|
| Remote diff review | PASS | Changes isolated to 59 code/config/test files plus this report (60 total) relative to the recovery base |
| Prisma schema/tenant registry consistency | PASS (static inspection) | 54 models are tenant-scoped (46 `empresaId`, 8 `businessId`); all 54 are registered. `RoleTemplate` remains global per D-005. Static schema comparison finds 104/104 simple tenant-owned FK relations registered. |
| API build | NOT RUN | No execution environment for repository checkout/build in this remote workflow |
| API lint | NOT RUN | Workflow added; result not yet available |
| Unit tests | NOT RUN | Regression tests authored; execution pending |
| Integration tests | NOT RUN | PostgreSQL-backed cart integration suite requires CI/database execution |
| Remix typecheck/build/E2E | BLOCKED | Root workspace and lockfile do not currently install Remix as a workspace |

**Important:** A test file being added is not evidence that the test passed. No PASS is claimed for build, lint, unit tests, or integration tests.

## Remaining blockers and risks

### P0/P1 — Remix CI/workspace mismatch

The root `package.json` and `package-lock.json` declare `apps/api` and `packages/*`, but not `apps/wapsell-remix`. Root build/lint/test scripts target the API. The existing CI workflow calls a root `typecheck` script that is not defined and labels the root API build as a Remix build. The Remix package dependencies are not installed by root `npm ci`.

**Required next action:** reconcile the Remix workspace and lockfile locally, then validate the exact root and Remix commands. Do not paper over this by adding a non-reproducible install to CI.

### P1 — Public cart authorization model

Cart routes remain marked `@Public()`. Cart creation accepts `customerId` from the request body and the controller selects the business from `TIENDA_EMPRESA_ID`. The route/item mismatch and customer PII exposure were corrected, but there is still no explicit authenticated-customer ownership check or signed guest-cart capability token for public cart reads and writes.

**Required decision:** choose authenticated-customer-only carts or an explicit guest-cart capability/session model. Do not claim the public cart authorization problem is fully closed.

### P1 — Relation-owned models

Models without a direct `empresaId` (for example `VentaItem`, `CompraItem`, and cash-register children) are not automatically scoped by the Prisma extension. Their isolation depends on explicit parent-relation predicates or a previously validated parent ID. The product metrics query was one confirmed omission and has been fixed; the remaining call sites still require systematic review.

### Tenant-context migration boundary

The touched staff surfaces now resolve the active membership through `BusinessContextService`. The wider repository still has legacy `user.empresaId` consumers and token claims for compatibility. In particular, `TenantsController` still reports the legacy current-company claim while the multi-business selection flow is unresolved; do not interpret this branch as a completed migration of every module to selectable business contexts.

### PR #100 reconciliation

PR #100 remains a separate, open PR from `refactor/opcion-6`. This branch does not modify that PR, `main`, or the recovery branch. No merge or production deployment was performed. Reconcile this branch with Claude's local report before opening a PR or merging anything.

## Handoff to local execution

1. Fetch `chatgpt/remote-audit-pr100` and compare it with the local recovery work; do not overwrite local changes.
2. Run Prisma generation, API build, non-mutating lint, and the new unit tests.
3. Run PostgreSQL-backed cart integration tests.
4. Fix the Remix workspace/lockfile/CI mismatch and run Remix typecheck, lint, unit tests, build, and E2E.
5. Return test logs and resulting HEAD SHA for remote reconciliation.
