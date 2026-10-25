# WAPSELL TO-BE IMPLEMENTATION ROADMAP
## Phase 2: Identity/Tenancy Foundation + Commerce Core

**Status**: 🚀 ACTIVE  
**Start Date**: 2026-10-25  
**Owner**: Federico Monfasani  
**Coordination**: Software Factory (4 agents, parallel execution)

---

## EXECUTIVE SUMMARY

**Approved Decisions**: 20/20 (5 architecture + 9 returns + 6 audit)  
**Specifications Ready**: 4/4 (Workshop reconciliation, Returns, Audit, Tenancy audit)  
**Execution Model**: 4 agents (architect, ci-recovery, code-reviewer, independent-reviewer) + coordinator  
**Timeline**: 3–4 weeks (P0–P4: Hardening + Identity + Commerce + Returns + Audit)  
**Success Criterion**: All P0–P4 phases complete with CI green and security audit pass

---

## PHASE BREAKDOWN

### PHASE 0: OTRA RONDA MÁS HARDENING (P0)
**Duration**: 5–7 days  
**Blocker Status**: None (parallel with P1)  
**Risk Level**: LOW (no schema changes to production data)

#### P0-1: Empresa → Business Schema Preparation
- **Lead**: architect
- **Tasks**:
  - Create migration: Add `Business` table (copy from `Empresa`)
  - Map fields: `empresaId` → `businessId` (FK)
  - Preserve: All existing Empresa data + relationships
  - Backward compat: Keep `Empresa` table (reads only) during transition
- **Tests**: Migration rollback tests, data integrity tests
- **Decision**: D-001 (approved: rename Empresa → Business)
- **Duration**: 2–3 days
- **Evidence**: Migration file, test results, schema diagram

#### P0-2: GitHub Actions CI/CD Gates
- **Lead**: ci-recovery
- **Tasks**:
  - Create `.github/workflows/lint.yml` (ESLint + Prettier)
  - Create `.github/workflows/test.yml` (Jest unit + integration)
  - Create `.github/workflows/build.yml` (NestJS + Prisma)
  - Add branch protection: main requires all checks green
  - Configure status checks: Required before PR merge
- **Tests**: Verify gate blocks failed PR, allows passing PR
- **Decision**: D-018 (approved: implement now)
- **Duration**: 2–3 days
- **Evidence**: Workflow files, test runs, branch protection config

#### P0-3: Test Suite Stabilization
- **Lead**: code-reviewer
- **Tasks**:
  - Diagnose pre-existing test failures (UnidadBase enum, worktree collisions)
  - Fix fixable failures (fixtures, test data)
  - Document unfixable blockers (separate from this phase)
  - Target: 95%+ test pass rate
- **Tests**: Full suite execution (`npm test`)
- **Duration**: 1–2 days
- **Evidence**: Test output, pass rate, failure classification

---

### PHASE 1: IDENTITY/TENANCY FOUNDATION (P1)
**Duration**: 5–7 days  
**Blocker Status**: Unblocked by P0 (parallel OK)  
**Dependency**: D-001 (Business terminology), D-005 (Profile model)  
**Risk Level**: MEDIUM (schema changes to auth layer)

#### P1-1: User/Business/Membership Schema
- **Lead**: architect
- **Tasks**:
  - Create `User` model (global identity: email, password hash, 2FA, status)
  - Create `Business` model (tenant entity: name, config, logo, features)
  - Create `Membership` model (N:N User ↔ Business with role + permissions)
  - Create `Profile` model (User profile: name, avatar, preferences)
  - Create `RoleTemplate` model (predefined roles: OWNER, MANAGER, VENDEDOR, ASISTENTE_LOCAL)
  - Create `CapabilityDefinition` model (fine-grained permissions)
  - Migrate existing `Usuario` data → `User` + `Membership` (map `empresaId` → `businessId`)
- **Tests**: Data migration tests, FK integrity, M2M cardinality
- **Decision**: D-002 (approved: N:N Membership model), D-001 (Business terminology)
- **Duration**: 2–3 days
- **Evidence**: Schema diagram, migration file, test results

#### P1-2: Authorization Refactor (Profile → Role → Capability)
- **Lead**: code-reviewer
- **Tasks**:
  - Refactor `RolUsuario` + `Permiso` (flat) → Profile → Role → Capability (hierarchical)
  - Create `RoleGrant` model (assigns RoleTemplate to Membership)
  - Create `CapabilityGrant` model (overrides for specific capabilities)
  - Update `@CurrentUser()` decorator to extract role + capabilities from Membership
  - Update `@Authorize(capability)` decorator to check capability hierarchy
  - Migrate existing role assignments (RolUsuario → RoleGrant)
- **Tests**: Authorization gate tests, capability inheritance tests, backward compat tests
- **Decision**: D-005 (approved: adopt Profile hierarchy), D-006 (token type validation)
- **Duration**: 2–3 days
- **Evidence**: Refactored guards, test results, authorization matrix

#### P1-3: Multi-Tenant Services Migration
- **Lead**: architect + ci-recovery
- **Tasks**:
  - Update `CompanyScopedPrismaService` to use `businessId` instead of `empresaId`
  - Migrate all services (Messaging, Sales, Purchases, Inventory) to use Business scoping
  - Update all controllers to extract `businessId` from `@CurrentUser().membership.businessId`
  - Add tenant isolation tests (cross-Business rejection)
  - Verify: Cart already uses `businessId` (no change needed)
- **Tests**: Cross-business rejection tests, isolation matrix tests
- **Duration**: 2 days
- **Evidence**: Service signatures updated, test results, isolation audit

---

### PHASE 2: COMMERCE CORE (P2)
**Duration**: 4–5 days  
**Blocker Status**: Unblocked by P1  
**Dependency**: D-007 (Order→Sale), D-008 (Stock lifecycle)  
**Risk Level**: MEDIUM (sales transaction logic)

#### P2-1: Order → Sale Auto-Conversion Lifecycle
- **Lead**: architect
- **Tasks**:
  - Implement Order model if missing (map from Pedido or new entity)
  - Define state machine: CREADA → CONFIRMADA → ENTREGADA → REALIZADA (auto-convert to Venta)
  - On Order.REALIZADA: auto-create Venta with same items + totals
  - Idempotency: Multiple REALIZADA transitions produce same Venta
  - Reversibility: Order cancellation before REALIZADA does NOT create Venta
- **Tests**: State transition tests, idempotency tests, Venta creation tests
- **Decision**: D-007 (approved: auto-convert on delivery), D-008 (approved: stock at creation)
- **Duration**: 2 days
- **Evidence**: State machine diagram, test results, transaction logs

#### P2-2: Stock Descent at Order Creation
- **Lead**: code-reviewer
- **Tasks**:
  - On Order.CREADA: Create MovimientoStock EGRESO for each item
  - On Order cancellation before REALIZADA: Reverse MovimientoStock ENTRADA
  - On Order.REALIZADA → Venta: Reuse existing stock entries (no double descent)
  - Verify: Stock never goes negative (reservation checks at creation)
- **Tests**: Stock descent tests, cancellation reversal tests, double-descent prevention
- **Duration**: 1 day
- **Evidence**: Stock ledger tests, failure scenarios

#### P2-3: Cancellation State Machine
- **Lead**: code-reviewer
- **Tasks**:
  - Implement Order cancellation from states: CREADA, CONFIRMADA (not REALIZADA)
  - On cancellation: Reverse stock movements, mark as CANCELADA
  - Audit: Log cancellation with actor + reason
  - Refunds: If payment made, initiate refund flow (links to P3)
- **Tests**: Cancellation tests per state, stock reversal, audit trail
- **Decision**: D-008 (approved: cancellation matrix), CON-017 (stock timing resolved)
- **Duration**: 1 day
- **Evidence**: Test results, audit logs

---

### PHASE 3: RETURNS/REFUNDS (P3)
**Duration**: 5–7 days  
**Blocker Status**: Unblocked by P2 (parallel OK after P2-1)  
**Dependency**: D-021 to D-029 (returns decisions, all approved)  
**Risk Level**: MEDIUM (new refund flow)

#### P3-1: DevolucionCliente Schema + Service
- **Lead**: architect
- **Tasks**:
  - Create `DevolucionCliente` model (SOLICITADA → AUTORIZADA → RECIBIDA → PROCESADA)
  - Create `DevolucionClienteItem` model (line items with frozen prices)
  - Create `Reembolso` model (refund state: PENDIENTE → EJECUTADO → REVERSADO)
  - Create `DevolucionClienteService` with state transitions
  - Implement return window validation (30 days from Venta.fecha)
  - Implement price capture (freeze at request time, not sale time)
- **Tests**: State transition tests, return window tests, price capture tests
- **Decision**: D-021 to D-029 (approved: all returns decisions)
- **Duration**: 2–3 days
- **Evidence**: Schema diagram, service tests, state machine tests

#### P3-2: API Endpoints + Validation
- **Lead**: code-reviewer
- **Tasks**:
  - Create `DevolucionClienteController` with 6 endpoints (create, list, detail, authorize, reject, receipt, process)
  - Add DTOs with validation (field constraints, enum guards)
  - Implement permission checks: Customer creates own returns, Admin/OWNER authorizes
  - Add multi-tenant scoping: Customer sees only own business returns
  - Document error codes (400/403/404/409 with reasons)
- **Tests**: API contract tests, permission tests, validation tests
- **Duration**: 1 day
- **Evidence**: API spec, test results, Postman collection (optional)

#### P3-3: Refund Execution (Async Queue)
- **Lead**: ci-recovery
- **Tasks**:
  - Create `RefundQueueService` (async job processor)
  - On DevolucionCliente.PROCESADA: Enqueue refund job
  - Refund job: Calculate amount, execute via payment provider (Mercado Pago), update Reembolso.status
  - Retry logic: 3 attempts with exponential backoff
  - Audit: Log refund execution with timestamp + provider response
- **Tests**: Queue tests, retry tests, refund execution tests
- **Decision**: D-029 (approved: async refund execution)
- **Duration**: 1–2 days
- **Evidence**: Queue job tests, refund logs, provider integration tests

---

### PHASE 4: AUDIT/REPORTING (P4)
**Duration**: 5–7 days  
**Blocker Status**: Unblocked by P1 (parallel OK)  
**Dependency**: D-AUD-01 to D-AUD-06 (audit decisions, all approved)  
**Risk Level**: LOW (read-only, no transaction logic)

#### P4-1: AuditLog Schema Migration + Service
- **Lead**: architect
- **Tasks**:
  - Migrate `AuditLog`: Remove `fechaHora`, remove `updatedAt`, remove `ventaId`
  - Add `AccionAudit` enum (20 event types)
  - Add indexes: `[businessId, createdAt]`, `[usuarioId, accion]`, `[entidadAfectada, entidadId]`
  - Add retention trigger: Delete logs older than 1 year
  - Create `AuditService` base class for transactional logging
- **Tests**: Schema migration tests, retention tests, index performance tests
- **Decision**: D-AUD-01 to D-AUD-04 (approved: schema changes + retention)
- **Duration**: 1–2 days
- **Evidence**: Migration file, test results, schema changes

#### P4-2: Event Logging Across All Subsystems
- **Lead**: code-reviewer
- **Tasks**:
  - Add logging to Sales subsystem (CREATE_VENTA, PAGO, CANCELAR_VENTA, REVERT_PAGO)
  - Add logging to Inventory subsystem (AJUSTE_STOCK, INGRESO, EGRESO, VENCIMIENTO)
  - Add logging to Purchases subsystem (CREAR_COMPRA, RECIBIR, PAGO_PROVEEDOR, CANCELAR)
  - Add logging to Cash subsystem (APERTURA_CAJA, CIERRE_CAJA, MOVIMIENTO, ARQUEO)
  - Add logging to Auth subsystem (LOGIN, PERMISO_ASIGNADO, PERMISO_REVOCADO)
  - Add logging to Returns subsystem (SOLICITAR_DEVOLUCION, AUTORIZAR, PROCESAR_REEMBOLSO)
  - Verify: All logs include actor (usuarioId), timestamp (createdAt), businessId, action (accion), entity (entidadAfectada, entidadId)
- **Tests**: Event logging tests per subsystem, log content validation
- **Duration**: 2–3 days
- **Evidence**: Service instrumentation, test results, audit log samples

#### P4-3: API + Reporting Endpoints
- **Lead**: code-reviewer
- **Tasks**:
  - Create `AuditController` with endpoints:
    - `GET /api/audits` (list with filters: empresa, usuario, entidad, acción, fecha range, pagination)
    - `GET /api/audits/:id` (specific audit event)
  - Create `ReportingController` with endpoints:
    - `POST /api/reports/audit-summary` (aggregated summaries by period)
    - `GET /api/reports/activity/:usuarioId` (user-specific activity report)
  - Add permission checks: `audit.leer` (own logs) + `audit.leer_otros` (all logs)
  - Add multi-tenant scoping: User sees only own business logs
- **Tests**: API contract tests, permission tests, aggregation tests
- **Decision**: D-AUD-05 to D-AUD-06 (approved: access control + IP tracking)
- **Duration**: 1–2 days
- **Evidence**: API spec, test results, sample reports

---

## PHASE 5–13: FEATURES (BACKLOG)

Once P0–P4 complete, proceed with:

- **P5**: Fulfillment (driver assignment, delivery confirmation)
- **P6**: Messaging (Business↔Business communication, event fusion)
- **P7**: Accounts Receivable (credit line management, payment scheduling)
- **P8**: Inventory (multi-location, FIFO, expiry management)
- **P9**: Purchases/AP (PO modification, payment scheduling)
- **P10**: Cash Management (multi-tenant caja operations)
- **P11**: Design System (tenant branding, theme configuration)
- **P12**: Payment Integration (Mercado Pago status polling, webhook handling)
- **P13**: Admin Dashboard (tenant analytics, audit reports, system health)

---

## RISK REGISTER

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Schema migration fails** | Low | High | Test rollback scenarios; keep Empresa table as fallback |
| **Test suite instability** | Medium | Medium | Fix UnidadBase enum blocker early (P0-3); stabilize fixtures |
| **Authorization refactor breaks existing APIs** | Low | High | Comprehensive permission matrix tests; gradual migration if needed |
| **Stock descent race condition** | Low | High | SERIALIZABLE isolation + atomic transactions (verified in prior audit) |
| **Refund provider integration fails** | Low | Medium | Implement manual refund approval flow as fallback; comprehensive provider tests |
| **Audit logging overhead impacts performance** | Low | Medium | Async logging queue; index optimization; monitor latency |

---

## SUCCESS CRITERIA

### P0 Success
- ✅ CI/CD gates block failed PRs
- ✅ Test suite passes at 95%+
- ✅ Empresa → Business schema ready (no data loss)

### P1 Success
- ✅ User/Business/Membership schema migrated
- ✅ Authorization refactor complete (all tests green)
- ✅ Multi-tenant isolation verified (cross-Business rejection tests pass)

### P2 Success
- ✅ Order → Sale auto-conversion works
- ✅ Stock descends at Order creation
- ✅ Cancellation reverses stock

### P3 Success
- ✅ Returns API accepts requests
- ✅ Refunds execute via async queue
- ✅ All 15 test scenarios pass

### P4 Success
- ✅ Audit logs created for all events
- ✅ Reporting API returns correct aggregations
- ✅ Cross-business log leakage prevented

---

## EXECUTION CHECKLIST

### Pre-Launch (Now)
- [ ] 4 agents assigned (architect, ci-recovery, code-reviewer, independent-reviewer)
- [ ] Coordinator ready to orchestrate dependencies
- [ ] GitHub branch protection configured for feedback loop
- [ ] Slack notifications enabled for task completion

### P0 (Days 1–7)
- [ ] P0-1: Schema migration ready for testing
- [ ] P0-2: GitHub Actions workflows green
- [ ] P0-3: Test suite passes 95%+

### P1 (Days 1–7, parallel with P0)
- [ ] P1-1: User/Membership/Business schema migrated
- [ ] P1-2: Authorization refactor complete
- [ ] P1-3: Services use Business scoping

### P2 (Days 8–12, depends on P1)
- [ ] P2-1: Order → Sale lifecycle working
- [ ] P2-2: Stock descent at Order.CREADA
- [ ] P2-3: Cancellation reverses stock

### P3 (Days 8–14, parallel with P2)
- [ ] P3-1: DevolucionCliente schema ready
- [ ] P3-2: API endpoints tested
- [ ] P3-3: Refund queue executing

### P4 (Days 1–14, parallel with P1–P3)
- [ ] P4-1: AuditLog migration complete
- [ ] P4-2: All subsystems logging events
- [ ] P4-3: Reporting API returning data

### Post-Launch (Days 15+)
- [ ] All P0–P4 tests green
- [ ] Independent security audit of identity/tenancy
- [ ] Performance baseline (latency, throughput)
- [ ] Staging deployment + smoke tests
- [ ] Owner approval for P5+ roadmap

---

## CONTACTS & ESCALATION

- **Owner**: Federico Monfasani (fmonfasani@gmail.com)
- **Architect**: Software Factory Agent (architecture decisions)
- **CI/CD**: ci-recovery Agent (infrastructure)
- **Code Quality**: code-reviewer Agent (authorization, API contracts)
- **Coordinator**: Orchestration of parallel tasks

---

## APPENDIX: APPROVED DECISIONS SUMMARY

### Architecture (D-001, D-005, D-007, D-008, D-016, D-018)
✅ Rename Empresa → Business  
✅ Adopt Profile hierarchy (role delegation)  
✅ Auto-convert Order → Sale on delivery  
✅ Stock descends at Order creation  
✅ Fulfillment Phase 1 (driver assignment only)  
✅ Implement CI/CD gates now  

### Returns/Refunds (D-21 to D-29)
✅ 30-day return window  
✅ Refunds include tax, exclude shipping  
✅ No restocking fee (Phase 1)  
✅ Original method refund; fallback to store credit  
✅ Admin can approve partial refunds  
✅ Same business returns only  
✅ Refund + reorder as separate transactions  
✅ Email + in-app notifications  
✅ Async refund execution  

### Audit/Reporting (D-AUD-01 to D-AUD-06)
✅ Use `createdAt` only (remove `fechaHora`)  
✅ Remove `ventaId` field for genericity  
✅ Use `AccionAudit` enum (type-safe)  
✅ 1-year retention policy  
✅ All users with `audit.leer` permission can access  
✅ Store IP/User-Agent for security trail  

---

**Last Updated**: 2026-10-25 (Approved)  
**Next Review**: P0 completion (2026-11-01)

