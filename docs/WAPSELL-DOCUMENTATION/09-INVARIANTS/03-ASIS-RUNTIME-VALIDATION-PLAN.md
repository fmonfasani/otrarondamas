# Wapsell — AS-IS Runtime Validation Plan v0.1

**Status:** DRAFT — VALIDATION PLAN / NOT APPROVED FOR EXECUTION  
**Date:** 2026-09-29  
**Layer:** Tests / Evals → Validation planning  
**Task:** TASK-TEST-001

> This document defines candidate runtime scenarios. It does not report execution results, create test files, modify code, or resolve pending Wapsell specifications.

## 1. Evidence discipline

A runtime scenario may produce VERIFIED BY EXECUTION only after the scenario actually runs and the observed result is recorded. VERIFIED BY TEST requires an implemented automated test that actually passes. Otherwise the result remains NOT DETERMINABLE.

Code inspection remains VERIFIED BY CODE and must not be upgraded merely because a test plan exists.

## 2. Current AS-IS mechanisms under validation

1. Global JWT authentication.
2. Public exceptions.
3. PermissionsGuard.
4. RequierePermiso metadata.
5. LegajoAprobadoGuard.
6. EmpresaScopedPrismaService.
7. Explicit empresaId propagation.
8. Manually scoped base-Prisma paths.
9. Public /tienda flows.

The plan does not test the future Membership model because Membership is not implemented in the observed AS-IS.

## 3. Preconditions

Execution requires a safe local/test environment with API dependencies, PostgreSQL, a known schema/seed state, controlled Empresa A and Empresa B fixtures, authenticated users/tokens, representative Business-scoped records, and known permission assignments.

If those fixtures do not already exist, creating them is a separate test-fixture task and must not be silently introduced by this document.

## 4. Authentication scenarios

### RT-AUTH-001 — Protected endpoint without JWT

Target a known protected endpoint. Send the request without Authorization. Expected AS-IS behavior: rejection by the global JWT guard. Do not invent a transport status or error body; record what execution actually returns.

### RT-AUTH-002 — Public endpoint without JWT

Target POST /auth/login or another explicit public endpoint. Send the request without JWT. Expected: the request reaches the public handler rather than being rejected solely for missing JWT.

### RT-AUTH-003 — Invalid JWT

Target a protected endpoint with an invalid token. Expected: authentication failure. Exact transport details must come from execution.

## 5. Permission scenarios

### RT-PERM-001 — Required permission present

Target an endpoint with known RequierePermiso metadata, such as POST /ventas. Authenticate a user with the required permission. Expected: PermissionsGuard permits the request to continue; later business validation may still reject it.

### RT-PERM-002 — Required permission absent

Use the same endpoint with an authenticated user lacking the required permission. Expected: PermissionsGuard rejects before the business operation.

### RT-PERM-003 — Endpoint without permission metadata

Target a known authenticated-only endpoint. With a valid JWT, verify that absence of permission metadata does not itself cause PermissionsGuard rejection. This validates AS-IS guard semantics, not future authorization policy.

## 6. Tenant-isolation scenarios

### RT-TEN-001 — Scoped read isolation

Create a Product in Empresa A. Authenticate User B and attempt to resolve that Product through the protected resource path. Expected: User B does not receive the Product belonging to Empresa A.

### RT-TEN-002 — Scoped list isolation

Create representative records in Empresas A and B. Authenticate as each user and request the same scoped list. Expected: each user receives only records belonging to their Empresa.

### RT-TEN-003 — Scoped create cannot choose another Empresa

Authenticate User A and submit create data containing Empresa B's identifier. Expected AS-IS behavior: the scoped extension forces the authenticated Empresa A identifier rather than trusting the supplied value.

### RT-TEN-004 — Scoped update cross-Business denial

With a record belonging to Empresa B, authenticate User A and attempt an update by identifier. Expected: the B record is not modified through the scoped query.

### RT-TEN-005 — Scoped delete cross-Business denial

Same structure as RT-TEN-004, targeting delete behavior. Execute only against controlled test data.

### RT-TEN-006 — findUnique post-query scope check

Attempt to resolve a direct empresaId record belonging to Empresa B while the request context is Empresa A. Expected: the scoped extension does not return a usable cross-Business record.

## 7. Manual tenant-enforcement scenarios

### RT-MANUAL-001 — Legajo administrative list

Target GET /legajo/pendientes with pending users in Empresas A and B. Authenticate User A. Expected: only Empresa A users are selected.

### RT-MANUAL-002 — Legajo approval cross-Business attempt

Target PATCH /legajo/:usuarioId/aprobar for a user belonging to Empresa B while authenticated as User A. Expected: the explicit id + empresaId predicate prevents selection/approval of the B user.

### RT-MANUAL-003 — Sensitive document cross-Business attempt

Target GET /legajo/documentos/:documentoId/descargar for a document owned by a user in Empresa B while authenticated as User A. Expected: the document is not served because the owning user's Empresa must match the requester.

## 8. Public-store scenarios

### RT-PUBLIC-001 — Public catalog

Target GET /tienda/productos without JWT. Expected: the public store flow is reachable under its configured public store context. The exact context-selection behavior must be recorded from the service/runtime.

### RT-PUBLIC-002 — Public order creation

Target POST /tienda/pedidos without JWT. Expected: the request can enter the public order flow subject to normal validation. Do not assume a future Wapsell anonymous identity model.

## 9. Legajo guard scenarios

### RT-LEG-001 — Pending user blocked from protected business operation

Authenticate a User with pending legajo and target a controller protected by LegajoAprobadoGuard. Expected: the operation is rejected by the eligibility guard.

### RT-LEG-002 — Pending user can complete own legajo

Target GET or PATCH /legajo/mi-legajo with a pending authenticated User. Expected: self-service remains available because the controller intentionally does not apply LegajoAprobadoGuard.

## 10. Raw SQL / non-extension scenario

### RT-RAW-001 — Inventory raw SQL tenant predicate

Target the inspected inventory raw SQL operation with records in two Businesses. Expected: only the authenticated/requested Business is considered because the inspected SQL explicitly includes empresaId in its WHERE condition. The exact operation and fixture must be identified before execution.

## 11. Indirectly scoped model scenarios

The current extension does not directly scope VentaItem, AplicacionPago, AperturaCaja, MovimientoCaja, ArqueoCaja, CierreCaja and CompraItem.

### RT-INDIRECT-001 — Parent-scoped access

For each selected indirectly scoped model, identify a real service path and verify that access is reached through the correctly scoped parent. This remains candidate-only until the actual query path and safe fixtures are identified.

## 12. Priority

| Priority | Scenario group | Reason |
|---|---|---|
| P0 | RT-AUTH-001..003 | Basic global authentication |
| P0 | RT-PERM-001..002 | Actual permission enforcement |
| P0 | RT-TEN-001..004 | Core Business isolation |
| P1 | RT-TEN-005..006 | Direct scoped CRUD coverage |
| P1 | RT-MANUAL-001..003 | Manual tenant checks |
| P1 | RT-LEG-001..002 | Eligibility boundary |
| P2 | RT-PUBLIC-001..002 | Public tenant context |
| P2 | RT-RAW-001 | Raw SQL scope |
| P2 | RT-INDIRECT-001 | Indirectly scoped models |

## 13. Evidence rules

A scenario may be marked VERIFIED BY EXECUTION only when the real environment, fixture/context, actual execution and observed result are recorded. An automated test may additionally be marked VERIFIED BY TEST only when the implemented test passes.

A failed runtime scenario is evidence of an observed AS-IS behavior/gap. It is not permission to fix code within this validation task.

## 14. Explicit non-scope

- No Jest/E2E test files.
- No production code changes.
- No Prisma schema changes.
- No production fixtures.
- No database migrations.
- No API redesign.
- No Membership implementation.
- No authorization redesign.
- No CI/CD or deployment changes.

## 15. Current status

**DRAFT — RUNTIME VALIDATION SCENARIOS DEFINED / NOT EXECUTED.**

The plan is concrete enough to serve as input for a future validation task, but execution requires confirmation that a safe local/test database and controlled fixtures are available.

No runtime evidence is claimed by this document.