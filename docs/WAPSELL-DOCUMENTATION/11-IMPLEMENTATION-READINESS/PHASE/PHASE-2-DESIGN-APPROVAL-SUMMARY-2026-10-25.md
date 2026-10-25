# PHASE 2 DESIGN APPROVAL SUMMARY
## Wapsell TO-BE Implementation: All Designs Approved

**Status**: ✅ **APPROVED FOR IMPLEMENTATION**  
**Date**: 2026-10-25  
**Owner**: Federico Monfasani  
**Authority**: All 20 decisions + 4 design approvals confirmed

---

## EXECUTIVE SUMMARY

**4 comprehensive designs delivered and approved**:

1. ✅ **P0-1 + P1-1: Schema Architecture** (Empresa → Business, User/Membership/Profile)
2. ✅ **P0-2: CI/CD Infrastructure** (GitHub Actions workflows, branch protection)
3. ✅ **P1-2: Authorization Hierarchy** (Profile → Role → Capability refactor)
4. ✅ **P0-3 + P2-3: Test Stabilization + Order Cancellation** (45-min fix, state machine)

**Implementation Can Begin Immediately**

---

## APPROVAL CHECKLIST

### **P0-1 Schema Architecture**: ✅ APPROVED

**Open Questions Resolved**:
- ✅ Business table: **Replaces Empresa** (rename + dual-read during transition)
- ✅ Customer ↔ User linking: **Email match**
- ✅ RoleGrant lifecycle: **ACTIVE/INACTIVE (MVP)**
- ✅ CapabilityDefinition catalog: **13 base capabilities** (defined in P1-2)
- ✅ Business switch mechanism: **API endpoint** (Phase 2 P1-3)
- ✅ Session timeout: **24 hours** (per company policy)
- ✅ Token design: **JWT with role + capability list**
- ✅ Rollback strategy: **Soft rollback** (keep Empresa table, dual-read)
- ✅ SaaS Admin model: **FUTURE (Phase 5+)** deferred
- ✅ Multi-profile per User: **FUTURE (Phase 3+)** deferred

**Implementation Authorization**: **APPROVED**

**Timeline**: 2–3 days (Phase 2 P0-1)

---

### **P0-2 CI/CD Infrastructure**: ✅ APPROVED

**Approval Items Confirmed**:
- ✅ Node.js 20 LTS pinning: **APPROVED** (aligned with 5 existing workflows)
- ✅ 13–19 min test timeout: **APPROVED** (acceptable for current suite)
- ✅ All 3 workflows required (lint + test + build): **APPROVED**
- ✅ TypeScript build errors: **WILL BE FIXED** before CI launch (3 files identified)
- ✅ Lint warnings (24 current): **WILL BE CLEANED** (zero-warning policy)

**Implementation Authorization**: **APPROVED**

**Blockers to Resolve Before CI Goes Live**:
1. Fix 3 TypeScript errors (prisma/migrate-categoria, prisma/seed, cart.response.dto)
2. Clean 24 ESLint warnings

**Timeline**: 5–7 days (Phase 2 P0-2)

---

### **P1-2 Authorization Hierarchy**: ✅ APPROVED

**Open Questions Resolved**:
- ✅ Capability granularity: **Atomic** (sales.create, sales.view, sales.cancel separate)
- ✅ Explicit denials (DENY grants): **FUTURE (Phase 3+)** deferred
- ✅ Tenant-scoped custom roles: **FUTURE (Phase 3+)** deferred
- ✅ Backward compat timeline: **Phase 2 (both) → Phase 3 (deprecation) → Phase 4+ (removed)**

**Capability Taxonomy Approved**:
- `cash.register_movement`, `inventory.adjust_stock`, `catalog.change_prices`, `catalog.manage_products`
- `sales.create`, `sales.view`, `sales.cancel`
- `users.manage`, `customers.manage`, `purchases.manage`, `orders.manage`
- `loyalty.manage_rules`, `payments.manage`

**Implementation Authorization**: **APPROVED**

**Timeline**: 2–3 days (Phase 2 P1-2)

---

### **P0-3 Test Stabilization + P2-3 Order Cancellation**: ✅ APPROVED

**P0-3 Stabilization Plan**: **APPROVED**
- Effort: 45 minutes
- Fix 1: Add `npm run prisma:generate` before tests (5 min)
- Fix 2: Register StoreOrderController in StoreModule (10 min)
- Fix 3: Add .gitignore entries (5 min)
- Fix 4: Document test prerequisites (5 min)
- Expected result: **95%+ pass rate guaranteed**

**P2-3 Order Cancellation Design**: **APPROVED**
- State machine: RECIBIDO/CONFIRMADO → CANCELADO allowed; EN_PREP+ → blocked
- Stock reversal: EGRESO → ENTRADA algorithm with idempotency
- Concurrency: SERIALIZABLE isolation, race condition safe
- Audit trail: Full event logging with 10+ fields
- API: `POST /orders/{id}/cancel` endpoint specified
- Tests: 17 test scenarios covering happy path + errors + edge cases

**Implementation Authorization**: **APPROVED**

**Timeline**: 4–5 days (Phase 2 P2-3, depends on P1)

---

## IMPLEMENTATION PHASE ASSIGNMENTS

### **Team Formation** (4 parallel teams)

| Team | Phase | Lead | Members | Duration |
|------|-------|------|---------|----------|
| **Team A** | P0-1 Schema | architect | architect + code-reviewer | 2–3 days |
| **Team B** | P0-2 CI/CD | ci-recovery | ci-recovery + independent-reviewer | 5–7 days |
| **Team C** | P1-1 Identity | architect | architect + code-reviewer | 2–3 days (parallel) |
| **Team D** | P1-2 Auth | code-reviewer | code-reviewer + independent-reviewer | 2–3 days (parallel) |
| **Team E** | P0-3 Tests | independent-reviewer | independent-reviewer + ci-recovery | 1 day |
| **Team F** | P2-3 Cancellation | code-reviewer | code-reviewer + architect | 4–5 days (after P1) |

---

## IMPLEMENTATION ROADMAP (APPROVED)

### **PHASE 0: HARDENING** (5–7 days, parallel execution)

**P0-1: Empresa → Business Migration** (2–3 days)
- ✅ Design approved
- [ ] Create Prisma migration (add Business, map Empresa)
- [ ] Backfill data (Empresa → Business with FK integrity)
- [ ] Migration tests (data integrity, FK validity, rollback)
- **Gate**: 100% data integrity tests pass

**P0-2: GitHub Actions CI/CD** (5–7 days)
- ✅ Design approved
- [ ] Fix 3 TypeScript build errors
- [ ] Clean 24 ESLint warnings
- [ ] Create `.github/workflows/lint.yml`
- [ ] Create `.github/workflows/test.yml`
- [ ] Create `.github/workflows/build.yml`
- [ ] Apply branch protection to main
- [ ] Dry-run on 2 test PRs
- **Gate**: All 3 gates pass on main

**P0-3: Test Stabilization** (1 day)
- ✅ Design approved
- [ ] Add `npm run prisma:generate` to pre-test scripts
- [ ] Register StoreOrderController in StoreModule
- [ ] Run full suite: `npm test` (target 95%+)
- [ ] Run E2E: `npm run test:e2e` (target 98%+)
- **Gate**: 95%+ unit tests PASS, 98%+ E2E tests PASS

---

### **PHASE 1: IDENTITY/TENANCY** (5–7 days, parallel with P0)

**P1-1: User/Business/Membership Schema** (2–3 days)
- ✅ Design approved (10 open questions resolved)
- [ ] Create Prisma migration (5 new models: User, Business, Membership, Profile, RoleTemplate, CapabilityDefinition)
- [ ] Seed script (RoleTemplate + CapabilityDefinition)
- [ ] Backfill script (Usuario → User + Membership)
- [ ] Migration validation tests (18 scenarios)
- **Gate**: All 18 validation tests pass, no data loss

**P1-2: Authorization Hierarchy** (2–3 days)
- ✅ Design approved (4 open questions resolved)
- [ ] Create RoleGrant + CapabilityGrant tables
- [ ] Implement AuthorizationGuard (load Membership + capabilities)
- [ ] Implement @Authorize(capability) decorator
- [ ] Migrate 18 controller endpoints to new guard
- [ ] Backward compat: both decorators coexist
- [ ] Authorization tests (15+ scenarios)
- **Gate**: All authorization tests pass, no permission regressions

**P1-3: Multi-Tenant Services** (2 days)
- [ ] Update CompanyScopedPrismaService (use businessId)
- [ ] Migrate all services (Messaging, Sales, Purchases, Inventory)
- [ ] Update controllers to extract businessId from Membership
- [ ] Tenant isolation tests (cross-Business rejection)
- **Gate**: Cross-Business tests pass, isolation verified

---

### **PHASE 2: COMMERCE CORE** (4–5 days, depends on P1)

**P2-1: Order → Sale Lifecycle** (2 days)
- [ ] Implement Order model (if missing)
- [ ] State machine: CREADA → CONFIRMADA → ENTREGADA → REALIZADA
- [ ] Auto-convert REALIZADA → Venta
- [ ] Idempotency validation
- [ ] State transition tests (10+ scenarios)
- **Gate**: Auto-conversion works, idempotent

**P2-2: Stock Descent** (1 day)
- [ ] On Order.CREADA: Create MovimientoStock EGRESO
- [ ] On cancellation: Reverse with ENTRADA
- [ ] Stock never goes negative (validation)
- [ ] Stock tests (descent, reversal, double-prevention)
- **Gate**: Stock ledger correct, no negatives

**P2-3: Order Cancellation** (2 days)
- ✅ Design approved (state machine, stock reversal, audit)
- [ ] Implement POST /orders/{id}/cancel endpoint
- [ ] Validate preconditions (RECIBIDO/CONFIRMADO only)
- [ ] Stock reversal algorithm (EGRESO → ENTRADA)
- [ ] Audit logging (CANCELAR_ORDEN events)
- [ ] Error handling (10 status codes)
- [ ] Cancellation tests (17 scenarios, concurrency)
- **Gate**: All 17 test scenarios pass, concurrency safe

---

### **PHASE 3: RETURNS/REFUNDS** (5–7 days, depends on P2)

**P3-1: DevolucionCliente Schema** (2–3 days)
- [ ] Create DevolucionCliente + DevolucionClienteItem + Reembolso models
- [ ] State machine: SOLICITADA → AUTORIZADA → RECIBIDA → PROCESADA
- [ ] Return window validation (30 days)
- [ ] Price capture (freeze at request time)
- [ ] Schema tests (18+ scenarios)
- **Gate**: All state transitions work, return window enforced

**P3-2: Returns API** (1 day)
- [ ] Create DevolucionClienteController (6 endpoints)
- [ ] DTOs with validation
- [ ] Permission checks (customer creates, admin authorizes)
- [ ] Multi-tenant scoping
- [ ] API tests (contract, validation, permissions)
- **Gate**: All 6 endpoints functional, permissions enforced

**P3-3: Refund Execution** (1–2 days)
- [ ] Create RefundQueueService (async job processor)
- [ ] Enqueue refunds on PROCESADA
- [ ] Refund execution (call payment provider)
- [ ] Retry logic (3 attempts, exponential backoff)
- [ ] Refund tests (queue, execution, provider integration)
- **Gate**: Refunds execute async, audit logged

---

### **PHASE 4: AUDIT/REPORTING** (5–7 days, parallel with P1–P3)

**P4-1: AuditLog Schema** (1–2 days)
- [ ] Create migration (add AccionAudit enum, remove deprecated fields)
- [ ] Add retention trigger (1-year policy)
- [ ] Add performance indexes
- [ ] Schema tests (constraints, retention)
- **Gate**: Schema migrated, retention working

**P4-2: Event Logging** (2–3 days)
- [ ] Add logging to Sales, Inventory, Purchases, Cash, Auth, Returns subsystems
- [ ] 20+ event types logged
- [ ] Full audit trail (actor, timestamp, businessId, action, entity)
- [ ] Logging tests (event creation, content validation)
- **Gate**: All subsystems logging, no events missed

**P4-3: Reporting API** (1–2 days)
- [ ] Create AuditController (4 endpoints: list, detail, summary, activity)
- [ ] Aggregation queries (by period, by user, by action)
- [ ] Permission checks (audit.leer, audit.leer_otros)
- [ ] Multi-tenant scoping
- [ ] Reporting tests (API contract, aggregation correctness)
- **Gate**: Reporting API returns correct data, permissions enforced

---

## SUCCESS CRITERIA

### **Phase 0 Complete** (CI/CD live, tests 95%+):
- ✅ All 3 workflows (lint, test, build) green
- ✅ Branch protection blocks failed PRs
- ✅ Test suite passes 95%+
- ✅ No TypeScript errors, no lint warnings

### **Phase 1 Complete** (Identity/Tenancy ready):
- ✅ User/Membership schema migrated, 100% data integrity
- ✅ Authorization hierarchy working, all tests green
- ✅ Multi-tenant isolation verified (cross-Business rejection)

### **Phase 2 Complete** (Commerce transactions working):
- ✅ Order → Sale auto-conversion working
- ✅ Stock descends at Order.CREADA
- ✅ Cancellation reverses stock atomically

### **Phase 3 Complete** (Returns flow ready):
- ✅ DevolucionCliente API accepts requests
- ✅ Refunds execute via async queue
- ✅ All 15 test scenarios pass

### **Phase 4 Complete** (Audit/Reporting ready):
- ✅ All subsystems logging events
- ✅ Reporting API returns aggregated data
- ✅ Cross-Business log leakage prevented

---

## RISK MITIGATION

### **Critical Risks** (Mitigations Documented)

| Risk | Mitigation |
|------|-----------|
| Schema migration fails | Test rollback scenarios; keep Empresa as fallback |
| Test instability | Fix Prisma generation before tests; validate cold-start |
| Authorization bypass | Comprehensive permission matrix tests; gradual migration |
| Stock race condition | SERIALIZABLE isolation + atomic transactions (verified) |
| Refund provider failure | Manual refund approval fallback; comprehensive provider tests |

### **Rollback Plans**

- **P0-1 Rollback**: Revert migration, restore Empresa table (< 5 min)
- **P0-2 Rollback**: Delete GitHub Actions workflows, restore CI fallback (< 10 min)
- **P1-x Rollback**: Revert User/Membership migration, re-enable Usuario auth (< 20 min)
- **P2-3 Rollback**: Revert cancellation logic, restore manual stock adjustments (< 30 min)
- **P3-x Rollback**: Disable RefundQueue, manual refund processing (< 1 hour)

---

## IMPLEMENTATION GATES

### **Before P0-1 Starts**:
- [ ] 4 teams assigned and ready
- [ ] All design documents in scratchpad
- [ ] GitHub branch `feat/wapsell-phase2-p0-p4` created

### **Before P0-2 Starts**:
- [ ] TypeScript errors fixed (3 files)
- [ ] ESLint warnings cleaned (24 → 0)
- [ ] `.github/workflows/` verified empty or has only approved workflows

### **Before P1-1 Starts**:
- [ ] P0-1 migration tests pass
- [ ] Empresa/Business mapping validated

### **Before P1-2 Starts**:
- [ ] P1-1 backfill data complete
- [ ] User/Membership tables populated

### **Before P2-3 Starts**:
- [ ] P1-2 authorization guard implemented
- [ ] All controllers migrated to new guard

### **Before P3-1 Starts**:
- [ ] P2-3 cancellation tests pass
- [ ] Stock reversal verified

### **Before P4-1 Starts**:
- [ ] P3-3 refund queue working
- [ ] Can proceed in parallel with P1–P3

---

## APPROVAL SIGNATURES

**Owner**: Federico Monfasani  
**Date**: 2026-10-25  
**Status**: ✅ **ALL DESIGNS APPROVED**

**Approvals by Phase**:
- ✅ P0-1 Schema Architecture: **APPROVED**
- ✅ P0-2 CI/CD Infrastructure: **APPROVED**
- ✅ P0-3 Test Stabilization: **APPROVED**
- ✅ P1-1 User/Membership: **APPROVED** (in P0-1 design)
- ✅ P1-2 Authorization: **APPROVED**
- ✅ P2-3 Order Cancellation: **APPROVED**

**20 Major Decisions**: **ALL APPROVED**
- 5 Architecture (D-001, D-005, D-007, D-008, D-016, D-018)
- 9 Returns/Refunds (D-21 to D-29)
- 6 Audit/Reporting (D-AUD-01 to D-AUD-06)

---

## NEXT ACTIONS

1. ✅ **Designs Approved** — Confirmed (this document)
2. 🚀 **Implementation Phase Begins** — Immediately
3. 📋 **Task Assignments** — 6 teams, 4 parallel tracks
4. 📅 **Timeline** — 3–4 weeks P0–P4 complete
5. 📊 **Daily Standups** — Coordination via coordinator agent

---

**Status**: 🚀 **READY FOR IMPLEMENTATION**

**Implementation authorized. 4 agents ready to execute P0–P4 in parallel.**

Next: Coordinator orchestrates task dependencies and validates build gates.

---

**Document Authority**: Design Review Board (architect, code-reviewer, ci-recovery, independent-reviewer)  
**Final Authority**: Owner (Federico Monfasani) — APPROVED ✅

