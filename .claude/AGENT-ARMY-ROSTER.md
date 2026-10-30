# WAPSELL MIGRATION: AGENT ARMY ROSTER & TASK ASSIGNMENTS

**Total Agents:** 47 specialized agents  
**Organization:** 8 phases, max 12 agents in parallel (Phase 5)  
**Status:** Ready for dispatch

---

## PHASE 1: PREPARATION & BACKUP (Days 1-3, 3 Agents)

### Agent P1A: Database Backup Engineer
**Duration:** 6 hours  
**Dependencies:** None (first agent)  
**Parallel with:** P1B, P1C

**Responsibilities:**
1. Create 3-layer backups (pg_dump, CSV, checksums)
2. Validate backup integrity
3. Upload to GCS
4. Document checksums for later validation

**Success Criteria:**
- All 88 Prisma models exported
- Checksums verified (sha256sum)
- GCS accessible
- Pre-migration row counts documented

**Deliverables:**
- `/secure/backups/otrarondamas-pre-migration-${TIMESTAMP}.sql`
- `/data/exports/${TIMESTAMP}/*.csv` (88 files)
- `/validation/checksums-${TIMESTAMP}.json`

---

### Agent P1B: DevOps & Environment Engineer
**Duration:** 4 hours  
**Dependencies:** None (parallel)  
**Parallel with:** P1A, P1C

**Responsibilities:**
1. Set up staging database (isolated from production)
2. Enable CI/CD pipeline (add build + test gates)
3. Configure monitoring dashboards
4. Prepare backup restore scripts

**Success Criteria:**
- Staging DB fully operational
- CI pipeline accepts `npm run build`
- Monitoring dashboards live
- pg_restore script tested (dry-run)

**Deliverables:**
- Staging DB connection string (documented)
- CI workflow updates (.github/workflows/*)
- Monitoring dashboard URLs
- `/scripts/migration/restore.sh` script

---

### Agent P1C: Data Architect
**Duration:** 6 hours  
**Dependencies:** None (parallel)  
**Parallel with:** P1A, P1B

**Responsibilities:**
1. Audit all 88 Prisma models
2. Create dependency graph (migration order)
3. Identify data transformation rules
4. Document breaking changes

**Success Criteria:**
- All 88 models categorized
- Dependency graph (migration-ready order)
- Breaking changes listed
- Test data plan created

**Deliverables:**
- `/docs/migration/model-audit.md` (all 88 models)
- `/docs/migration/dependency-graph.json`
- `/docs/migration/breaking-changes.md`
- `/docs/migration/transformation-rules.sql`

---

## PHASE 2: CODE REFACTORING (Days 4-10, 8 Agents)

### Agent P2A: Prisma Schema Refactoring
**Duration:** 8 hours  
**Dependencies:** P1C (audit complete)  
**Parallel with:** P2B through P2H

**Responsibilities:**
1. Rename `empresaId` → `businessId` in schema.prisma
2. Create reversible Prisma migration
3. Update CompanyScopedPrismaService

**Success Criteria:**
- 37 models updated
- Migration SQL valid
- `npx prisma validate` passes
- `npx prisma generate` succeeds

**Deliverables:**
- Updated `apps/api/prisma/schema.prisma`
- New migration file in `apps/api/prisma/migrations/`
- Updated `company-scope.extension.ts`

---

### Agent P2B: TypeScript Model & DTO Refactoring
**Duration:** 10 hours  
**Dependencies:** P2A (schema done)  
**Parallel with:** P2C through P2H

**Responsibilities:**
1. Update all TypeScript interfaces (empresaId → businessId)
2. Update all DTOs (request/response types)
3. Verify npm run typecheck passes
4. Ensure npm run build succeeds

**Success Criteria:**
- All interfaces updated
- `npm run typecheck` passes (0 errors)
- `npm run build` succeeds
- No hardcoded "empresaId" strings remain

**Deliverables:**
- Updated `packages/shared-types/**/*.ts`
- Updated `apps/api/src/*/dtos/**/*.ts`
- Build logs (success)

---

### Agent P2C: Controller & Route Refactoring
**Duration:** 8 hours  
**Dependencies:** P2A + P2B (schema + types)  
**Parallel with:** P2D through P2H

**Responsibilities:**
1. Update all @Controller methods
2. Rename @Param('empresaId') → @Param('businessId')
3. Update request/response handling
4. Verify no breaking API changes

**Success Criteria:**
- All controllers refactored
- API change manifest created
- `npm run build` succeeds
- All guards/middleware compile

**Deliverables:**
- Updated controller files in `apps/api/src/*/controllers/`
- `/docs/migration/api-changes.md` (before/after comparison)

---

### Agent P2D: Service Layer Refactoring (Signatures)
**Duration:** 10 hours  
**Dependencies:** P2A + P2B + P2C (schema + types + controllers)  
**Parallel with:** P2E through P2H

**Responsibilities:**
1. Update all service method signatures (empresaId → businessId)
2. Update JSDoc comments
3. Verify compilation
4. Prepare for logic updates (P2E)

**Success Criteria:**
- All service public methods updated
- All private methods updated
- `npm run typecheck` passes
- `npm run build` succeeds
- No logic changed (only signatures)

**Deliverables:**
- Updated service files in `apps/api/src/*/services/`
- Service audit table (all methods listed)

---

### Agent P2E: Service Layer Refactoring (Logic)
**Duration:** 10 hours  
**Dependencies:** P2D (signatures done), P2A (schema)  
**Parallel with:** P2F through P2H

**Responsibilities:**
1. Update CompanyScopedPrismaService usages
2. Update multi-tenant scoping logic
3. Update Membership-related logic
4. Verify no unscoped queries

**Success Criteria:**
- All service methods use scoped db
- No unscoped queries found (grep == 0)
- All Membership references use businessId
- `npm run build` succeeds

**Deliverables:**
- Updated service logic in `apps/api/src/*/services/`
- Grep output: unscoped queries (0 found)

---

### Agent P2F: Authorization & Guards Refactoring
**Duration:** 8 hours  
**Dependencies:** P2A + P2B + P2C (schema + types + controllers)  
**Parallel with:** P2G, P2H

**Responsibilities:**
1. Update JwtAuthGuard
2. Create BusinessContextGuard
3. Update @RequierePermiso decorator
4. Update @CurrentUser + @CurrentBusiness decorators

**Success Criteria:**
- All guards updated + type-safe
- BusinessContext DTO created
- All controllers use @CurrentBusiness()
- Cross-business access test fails (as expected)

**Deliverables:**
- Updated guard files in `apps/api/src/common/guards/`
- New BusinessContext DTO

---

### Agent P2G: Database Connection & Migration Setup
**Duration:** 6 hours  
**Dependencies:** P1C (audit) + P2A (schema)  
**Parallel with:** P2H

**Responsibilities:**
1. Create migration execution scripts
2. Plan data transformation SQL
3. Create rollback procedures
4. Prepare staging environment

**Success Criteria:**
- Migration scripts ready
- Rollback scripts ready
- Data transformation SQL verified
- Staging DB ready for test
- All scripts tested on staging (dry-run)

**Deliverables:**
- `/scripts/migrations/` folder with all scripts
- `/scripts/migrations/rollback.sh`
- Migration checklist document

---

### Agent P2H: Dependency & Imports Audit
**Duration:** 4 hours  
**Dependencies:** P2B (types done)  
**Parallel with:** None (cleanup phase)

**Responsibilities:**
1. Search for deprecated imports
2. Update barrel exports
3. Verify no circular dependencies
4. Update test imports

**Success Criteria:**
- All imports updated (0 deprecated)
- Circular dependencies documented (if any)
- `npm run build` succeeds
- Import migration guide created

**Deliverables:**
- Updated import paths across codebase
- `/docs/migration/import-migration-guide.md`

---

## PHASE 3: DATABASE MIGRATION (Days 11-15, 6 Agents)

### Agent P3A: Pre-Migration Validation
**Duration:** 4 hours  
**Dependencies:** P2H (code refactoring complete)  
**Parallel with:** P3B through P3F

**Responsibilities:**
1. Run final validation gates
2. Generate immutable baseline checksums
3. Export critical tables to CSV
4. Create baseline snapshot

**Success Criteria:**
- All validation gates passed
- Baseline checksums in JSON
- Critical tables exported
- baseline.md documented

**Deliverables:**
- `/validation/baseline-checksums.json`
- `/data/exports/pre-migration/*.csv`
- `/validation/baseline.md`

---

### Agent P3B: Schema Migration Execution
**Duration:** 8 hours  
**Dependencies:** P3A (validation complete)  
**Parallel with:** P3C through P3F

**Responsibilities:**
1. Execute migration on staging (test run)
2. Inspect generated SQL
3. Test rollback
4. Plan downtime window

**Success Criteria:**
- Staging migration test succeeded
- Rollback test succeeded
- Estimated duration documented
- Migration checklist created

**Deliverables:**
- Migration SQL (inspected + approved)
- Migration execution checklist
- Estimated downtime (< 30 min)

---

### Agent P3C: Data Transformation & Membership Population
**Duration:** 10 hours  
**Dependencies:** P2A (schema) + P3B (migration structure)  
**Parallel with:** P3D through P3F

**Responsibilities:**
1. Create SQL data transformation scripts
2. Create Membership population script
3. Validate transformation (no duplicates)
4. Test on staging database

**Success Criteria:**
- Membership population script created
- Staging test passed (count matches)
- Data integrity verified
- Transformation documented

**Deliverables:**
- Membership population SQL script
- `/docs/migration/transformation-log.md`
- Staging test results

---

### Agent P3D: Post-Migration Validation
**Duration:** 6 hours  
**Dependencies:** P3C (transformation complete)  
**Parallel with:** P3E, P3F

**Responsibilities:**
1. Create post-migration validation script
2. Compare checksums (baseline vs. post)
3. Validate schema + critical queries
4. Test referential integrity

**Success Criteria:**
- Row counts match baseline (100%)
- Data checksums match (100%)
- Membership records populated correctly
- All critical queries work

**Deliverables:**
- `/validation/validation-report.md` (comprehensive)
- Checksum comparison (baseline vs. post)
- Critical query test results

---

### Agent P3E: Database Index & Performance Tuning
**Duration:** 4 hours  
**Dependencies:** P3B (schema migrated)  
**Parallel with:** P3F

**Responsibilities:**
1. Analyze post-migration index strategy
2. Create index creation script
3. Test on staging DB
4. Measure performance impact

**Success Criteria:**
- Index creation script ready
- Performance tested on staging
- No regressions (query times stable)
- Vacuum/Analyze plan documented

**Deliverables:**
- Index creation SQL script
- Performance test results (before/after)
- Query time comparison table

---

### Agent P3F: Monitoring & Alerting Setup
**Duration:** 4 hours  
**Dependencies:** P1B (DevOps infrastructure)  
**Parallel with:** None (dependent on P3E)

**Responsibilities:**
1. Configure monitoring dashboards
2. Set up alerts
3. Create incident response runbook
4. Plan cutover monitoring

**Success Criteria:**
- All dashboards created + accessible
- All alerts configured + tested
- Runbook documented
- Health check scripts ready

**Deliverables:**
- Monitoring dashboard URLs
- Alert definitions
- Incident response runbook
- Health check scripts

---

## PHASE 4: AUTH SYSTEM (Days 16-20, 5 Agents)

### Agent P4A: JWT Payload & Token Structure
**Duration:** 6 hours  
**Dependencies:** P2B (types done) + P3D (data migration)  
**Parallel with:** P4B through P4D

**Responsibilities:**
1. Redesign JWT payload (new Membership structure)
2. Update generateToken method
3. Create @CurrentUser + @CurrentBusiness decorators
4. Update JwtStrategy

**Success Criteria:**
- New JWT structure implemented
- generateToken creates new format
- Decorators are type-safe
- Token validation tests pass
- `npm run build` succeeds

**Deliverables:**
- Updated `auth.service.ts`
- New decorators in `common/decorators/`
- Unit tests for token generation

---

### Agent P4B: JwtAuthGuard & BusinessContextGuard
**Duration:** 6 hours  
**Dependencies:** P4A (JWT structure), P2F (guards baseline)  
**Parallel with:** P4C, P4D, P4E

**Responsibilities:**
1. Update JwtAuthGuard
2. Create BusinessContextGuard
3. Create Membership validator
4. Add logging + error responses

**Success Criteria:**
- JwtAuthGuard updated + tested
- BusinessContextGuard created + tested
- All test cases pass (25+ assertions)
- Error messages clear
- `npm run build` succeeds

**Deliverables:**
- Updated guard implementations in `common/guards/`
- Unit test results (all PASS)
- Error message examples

---

### Agent P4C: Permission & RBAC System Update
**Duration:** 8 hours  
**Dependencies:** P4A (JWT) + P4B (guards)  
**Parallel with:** P4D, P4E

**Responsibilities:**
1. Update permission checking logic
2. Create BusinessAwarePermissionGuard
3. Update all @RequierePermiso usages
4. Test permission boundaries

**Success Criteria:**
- @RequierePermiso decorator updated
- BusinessAwarePermissionGuard created
- All usage sites updated
- Permission boundary tests pass
- Permissions matrix documented

**Deliverables:**
- Updated permission guard in `common/guards/`
- `/docs/migration/permissions-matrix.md`
- Permission boundary test code + results

---

### Agent P4D: Session & Token Refresh Strategy
**Duration:** 6 hours  
**Dependencies:** P4A (JWT structure)  
**Parallel with:** P4E

**Responsibilities:**
1. Implement token refresh mechanism
2. Create RefreshToken table (Prisma model)
3. Implement refresh + logout endpoints
4. Implement token rotation

**Success Criteria:**
- RefreshToken model created
- /auth/refresh endpoint working
- /auth/logout endpoint working
- Token rotation working
- All tests pass

**Deliverables:**
- Updated Prisma schema (RefreshToken model)
- Refresh endpoint code
- Logout endpoint code
- Token lifecycle test code + results

---

### Agent P4E: Multi-Tenancy Auth Integration Tests
**Duration:** 8 hours  
**Dependencies:** P4A + P4B + P4C + P4D (all auth complete)  
**Parallel with:** None (comprehensive test phase)

**Responsibilities:**
1. Create comprehensive E2E test suite
2. Test tenant isolation scenarios
3. Test session management edge cases
4. Create test fixtures

**Success Criteria:**
- Test file: `test/auth/multi-tenancy.e2e-spec.ts`
- All test scenarios passing (25+ assertions)
- `npm run test:e2e` passes
- Coverage: auth + tenancy + permissions

**Deliverables:**
- Comprehensive test suite code
- Test run results (all PASS)
- Test coverage report

---

## PHASE 5: SERVICE LAYER (Days 21-35, 12 Agents in Parallel)

### Agent P5A: Catalog Service
**Duration:** 8 hours  
**Dependencies:** P4E (auth complete), P3D (data migration)  
**Parallel with:** P5B through P5L

**Responsibilities:**
1. Update CatalogService + ProductService
2. Scope all queries by businessId
3. Test tenant isolation
4. Update hierarchy integrity tests

**Success Criteria:**
- All catalog services updated
- Scoping verified
- Hierarchy integrity maintained
- `npm run test -- --testPathPattern=catalog` passes

**Deliverables:**
- Updated service files in `apps/api/src/catalog/`
- Test results (all PASS)
- Sample cross-tenant test

---

### Agent P5B: Inventory & Stock Service
**Duration:** 8 hours  
**Dependencies:** P4E + P3D  
**Parallel with:** P5C through P5L

**Responsibilities:**
1. Update InventoryService + MovimientoStock
2. Scope all stock operations by businessId
3. Verify race condition handling (SERIALIZABLE)
4. Test FIFO + expiry logic

**Success Criteria:**
- All inventory services updated
- Stock scoping verified
- Race condition tests pass
- Cross-business isolation verified

**Deliverables:**
- Updated service files in `apps/api/src/inventory/`
- Race condition test code + results
- FIFO test code + results

---

### Agent P5C: Sales Service
**Duration:** 10 hours  
**Dependencies:** P4E + P3D  
**Parallel with:** P5D through P5L

**Responsibilities:**
1. Update SalesService + payment handling
2. Scope all sales by businessId
3. Fix sale numbering (per-business sequence)
4. Test transactional payment confirmation

**Success Criteria:**
- SalesService updated + multi-tenant aware
- Sale numbering tested (no duplicates)
- Payment confirmation transactional
- Cross-business isolation verified

**Deliverables:**
- Updated service files in `apps/api/src/sales/`
- Sale numbering test code + results
- Payment confirmation test code

---

### Agent P5D: Purchases Service
**Duration:** 8 hours  
**Dependencies:** P4E + P3D  
**Parallel with:** P5E through P5L

**Responsibilities:**
1. Update PurchasesService + supplier management
2. Scope all purchase orders by businessId
3. Test received goods handling
4. Test payment to supplier tracking

**Success Criteria:**
- All purchase services updated
- Scoping verified
- `npm run test -- --testPathPattern=purchases` passes
- Cross-business isolation verified

**Deliverables:**
- Updated service files in `apps/api/src/purchases/`
- Test results (all PASS)

---

### Agent P5E: Payments Service
**Duration:** 8 hours  
**Dependencies:** P4E + P3D  
**Parallel with:** P5F through P5L

**Responsibilities:**
1. Update PaymentService + PagoProveedorService
2. Scope all payments by businessId
3. Test mixed payment handling
4. Test payment reconciliation

**Success Criteria:**
- All payment services updated
- Scoping verified
- Mixed payment tests pass
- Reconciliation logic updated

**Deliverables:**
- Updated service files in `apps/api/src/payments/`
- Payment reconciliation test code

---

### Agent P5F: Customers Service
**Duration:** 8 hours  
**Dependencies:** P4E + P3D  
**Parallel with:** P5G through P5L

**Responsibilities:**
1. Update CustomerService + loyalty rules
2. Scope all customers by businessId
3. Update ReglaFidelizacion scoping
4. Test loyalty calculation

**Success Criteria:**
- All customer services updated
- Scoping verified
- Loyalty calculation tests pass
- Cross-business isolation verified

**Deliverables:**
- Updated service files in `apps/api/src/customers/`
- Loyalty test code + results

---

### Agent P5G: Cash Register Service
**Duration:** 8 hours  
**Dependencies:** P4E + P3D  
**Parallel with:** P5H through P5L

**Responsibilities:**
1. Update CajasService + apertura/cierre logic
2. Scope all cash operations by businessId
3. Test cash reconciliation
4. Test authorization workflows

**Success Criteria:**
- All cash register services updated
- Scoping verified
- Cash reconciliation tested
- Authorization flows updated

**Deliverables:**
- Updated service files in `apps/api/src/cash-register/`
- Cash reconciliation test code

---

### Agent P5H: Devoluciones (Returns) Service
**Duration:** 8 hours  
**Dependencies:** P4E + P3D  
**Parallel with:** P5I through P5L

**Responsibilities:**
1. Update DevolucionesService (customer + supplier returns)
2. Scope all returns by businessId
3. Test stock reversal logic
4. Test payment refund handling

**Success Criteria:**
- All return services updated
- Scoping verified
- Stock reversal tested
- Refund handling tested

**Deliverables:**
- Updated service files in `apps/api/src/devoluciones/`
- Return flow test code + results

---

### Agent P5I: Messaging Service
**Duration:** 10 hours  
**Dependencies:** P4E + P3D  
**Parallel with:** P5J through P5L

**Responsibilities:**
1. Update MessagingService (conversations + messages)
2. Verify businessId scoping (should already exist)
3. Update WhatsApp integration scoping
4. Test conversation isolation

**Success Criteria:**
- All messaging services updated
- Conversation isolation verified
- WhatsApp integration scoped correctly
- `npm run test -- --testPathPattern=messaging` passes

**Deliverables:**
- Updated service files in `apps/api/src/messaging/`
- Conversation isolation test code

---

### Agent P5J: Users & Authorization Service
**Duration:** 8 hours  
**Dependencies:** P4E + P3D + P4C (permissions)  
**Parallel with:** P5K, P5L

**Responsibilities:**
1. Update UsersService (global User)
2. Update MembershipService (new N:N table)
3. Update permission resolution per-business
4. Test user creation + membership binding

**Success Criteria:**
- All user services updated
- Membership service working
- Permission resolution tested
- User creation tested

**Deliverables:**
- Updated service files in `apps/api/src/users/`
- MembershipService implementation
- User creation test code

---

### Agent P5K: Audit & Compliance Service
**Duration:** 8 hours  
**Dependencies:** P4E + P3D  
**Parallel with:** P5L

**Responsibilities:**
1. Update AuditService (logging all changes)
2. Scope all audit logs by businessId
3. Update authorization tracking
4. Test audit trail completeness

**Success Criteria:**
- All audit services updated
- Scoping verified
- Authorization tracking updated
- `npm run test -- --testPathPattern=audit` passes

**Deliverables:**
- Updated service files in `apps/api/src/audit/`
- Audit trail test code + results

---

### Agent P5L: Analytics Service
**Duration:** 8 hours  
**Dependencies:** P4E + P3D  
**Parallel with:** None (last service phase agent)

**Responsibilities:**
1. Update AnalyticsService (event tracking + dashboards)
2. Scope all analytics by businessId
3. Update event aggregation logic
4. Test dashboard isolation

**Success Criteria:**
- All analytics services updated
- Scoping verified
- Event aggregation tested
- Dashboard isolation verified

**Deliverables:**
- Updated service files in `apps/api/src/analytics/`
- Analytics isolation test code

---

## PHASE 6: TESTING & CI (Days 36-42, 8 Agents in Parallel)

### Agent P6A: Unit Test Expansion
**Duration:** 12 hours  
**Dependencies:** P5L (all services complete)  
**Parallel with:** P6B through P6H

**Responsibilities:**
1. Expand unit tests for all services
2. Add mocking for database calls
3. Test error handling
4. Achieve 85%+ coverage

**Success Criteria:**
- 300+ unit tests passing
- Coverage > 85%
- `npm run test -- --coverage` passes
- All error paths tested

**Deliverables:**
- New test files in `test/unit/`
- Coverage report (85%+ per module)

---

### Agent P6B: Integration Test Expansion
**Duration:** 12 hours  
**Dependencies:** P5L + P6A (unit tests done)  
**Parallel with:** P6C through P6H

**Responsibilities:**
1. Create integration tests for API contracts
2. Test service interactions
3. Test database transaction handling
4. Test error recovery

**Success Criteria:**
- 150+ integration tests passing
- All endpoints tested
- `npm run test:integration` passes
- Transaction handling verified

**Deliverables:**
- New test files in `test/integration/`
- Integration test results

---

### Agent P6C: E2E Test Suite
**Duration:** 12 hours  
**Dependencies:** P5L + P6A + P6B  
**Parallel with:** P6D through P6H

**Responsibilities:**
1. Create E2E test suite for real user workflows
2. Test login → order → payment → delivery flow
3. Test cross-business isolation (E2E)
4. Test multi-user concurrent scenarios

**Success Criteria:**
- 50+ E2E tests passing
- Real workflow coverage
- `npm run test:e2e` passes
- Concurrent scenarios tested

**Deliverables:**
- New test files in `test/e2e/`
- E2E test results

---

### Agent P6D: CI/CD Pipeline Repair
**Duration:** 10 hours  
**Dependencies:** P6A + P6B + P6C (all tests done)  
**Parallel with:** P6E through P6H

**Responsibilities:**
1. Add build validation to CI (.github/workflows/)
2. Add test execution gates
3. Add coverage thresholds
4. Add automatic rollback on failure

**Success Criteria:**
- `npm run build` gate passes
- `npm run test` gate passes
- Coverage gate (85%+) enforced
- Workflows all green

**Deliverables:**
- Updated `.github/workflows/*.yml` files
- CI pipeline documentation
- Build logs (success)

---

### Agent P6E: Performance & Load Testing
**Duration:** 8 hours  
**Dependencies:** P5L + P6A  
**Parallel with:** P6F through P6H

**Responsibilities:**
1. Run load tests (100 concurrent users)
2. Benchmark query performance
3. Identify slow operations
4. Create performance baselines

**Success Criteria:**
- Load test: 100 users, 0 errors
- Query latency (p95 < 1s)
- Throughput: > 100 req/sec
- Baselines documented

**Deliverables:**
- Load test results (JMeter/k6 report)
- Performance benchmark document
- Query optimization recommendations

---

### Agent P6F: Security & Penetration Testing
**Duration:** 10 hours  
**Dependencies:** P5L + P4E (all services + auth)  
**Parallel with:** P6G, P6H

**Responsibilities:**
1. Run OWASP top 10 security checks
2. Test authorization boundaries
3. Test input validation
4. Check for secret leakage

**Success Criteria:**
- 0 critical vulnerabilities
- 0 high-risk findings
- Authorization tests pass
- Input validation verified
- No secrets in codebase

**Deliverables:**
- Security test report
- Vulnerability assessment
- Remediation plan (if any issues found)

---

### Agent P6G: Documentation & Migration Guide
**Duration:** 8 hours  
**Dependencies:** All phases (P1-P6)  
**Parallel with:** P6H

**Responsibilities:**
1. Create migration runbook
2. Document known issues + workarounds
3. Create troubleshooting guide
4. Create post-launch operations guide

**Success Criteria:**
- Runbook complete + reviewed
- Known issues documented
- Troubleshooting guide created
- All team members trained

**Deliverables:**
- `/docs/MIGRATION-RUNBOOK.md`
- `/docs/MIGRATION-KNOWN-ISSUES.md`
- `/docs/OPERATIONS-GUIDE.md`

---

### Agent P6H: Rollback & Disaster Recovery Testing
**Duration:** 8 hours  
**Dependencies:** P3D (validation scripts) + P6A  
**Parallel with:** None (final test phase agent)

**Responsibilities:**
1. Test rollback procedures for each phase
2. Test disaster recovery (restore from backup)
3. Verify recovery time objectives (< 30 min)
4. Create incident response playbooks

**Success Criteria:**
- All rollback procedures tested successfully
- Backup restore tested (< 30 min)
- Incident response playbooks documented
- Team trained on rollback

**Deliverables:**
- Rollback test results (all successful)
- Disaster recovery test report
- Incident response playbooks

---

## PHASE 7: DEPLOYMENT & CUTOVER (Days 43-45, 5 Agents SEQUENTIAL)

### Agent P7A: Pre-Production Staging
**Duration:** 4 hours  
**Dependencies:** P6H (all tests pass)  
**Sequence:** First

**Responsibilities:**
1. Deploy code to staging environment
2. Run smoke tests on staging
3. Verify data migration on staging
4. Get final sign-off before production cutover

**Success Criteria:**
- Staging deployment successful
- All smoke tests pass
- Data migration verified
- Sign-off obtained

**Deliverables:**
- Staging deployment logs
- Smoke test results
- Sign-off document

---

### Agent P7B: Database Cutover Execution
**Duration:** 2 hours  
**Dependencies:** P7A (staging green)  
**Sequence:** Second (time-sensitive)

**Responsibilities:**
1. Execute database migration on production
2. Monitor migration progress
3. Execute Membership population
4. Validate post-migration data integrity

**Success Criteria:**
- Production migration completed
- Row counts match baseline
- Checksums verified
- Data integrity confirmed

**Deliverables:**
- Migration execution log
- Post-migration validation report
- Checksum comparison (baseline vs. post)

---

### Agent P7C: Application Deployment
**Duration:** 2 hours  
**Dependencies:** P7B (database ready)  
**Sequence:** Third

**Responsibilities:**
1. Deploy new API code to production (rolling update)
2. Monitor deployment progress
3. Verify no errors during rollout
4. Monitor error rates (expect brief spike, recover < 5 min)

**Success Criteria:**
- Code deployment successful
- Rolling update completed without errors
- Error rate returns to normal
- All instances healthy

**Deliverables:**
- Deployment logs
- Monitoring dashboard screenshots
- Health check results

---

### Agent P7D: Health Check & Monitoring
**Duration:** 4 hours  
**Dependencies:** P7C (app deployed)  
**Sequence:** Fourth (continuous during + 24h after)

**Responsibilities:**
1. Monitor API health (endpoints responding)
2. Monitor database performance (CPU, memory, connections)
3. Monitor error rates + user reports
4. Verify business data integrity (spot checks)

**Success Criteria:**
- 99.9%+ API availability
- Query latency normal (p95 < 1s)
- Error rate < 0.5%
- 0 data loss reports
- All business processes working

**Deliverables:**
- Health check logs
- Monitoring dashboard screenshots
- Incident report (if any issues)

---

### Agent P7E: Stakeholder Communication & Documentation
**Duration:** 2 hours  
**Dependencies:** P7D (health checks done)  
**Sequence:** Fifth

**Responsibilities:**
1. Notify stakeholders: "Migration successful"
2. Provide post-launch status report
3. Document lessons learned
4. Archive all migration artifacts

**Success Criteria:**
- All stakeholders notified
- Status report complete
- Lessons learned documented
- Archives secure

**Deliverables:**
- Stakeholder notification email
- Post-launch status report
- Lessons learned document
- Archive manifest

---

## PHASE 8: POST-MIGRATION (Days 46-60, Ongoing)

### Agent P8A: Performance Optimization
**Role:** Performance Specialist  
**Duration:** Ongoing

**Responsibilities:**
- Monitor performance metrics
- Optimize slow queries
- Tune database parameters
- Optimize caching strategies

---

### Agent P8B: Data Cleanup & Optimization
**Role:** Data Engineer  
**Duration:** Ongoing

**Responsibilities:**
- Archive old audit logs
- Cleanup temporary files
- Optimize storage usage
- Prepare for next business features

---

### Agent P8C: Feature Development (Wapsell-Specific)
**Role:** Feature Developer  
**Duration:** Ongoing

**Responsibilities:**
- Implement WhatsApp integration
- Implement AI chat agent
- Implement multi-business onboarding
- Implement business branding

---

---

## EXECUTION CHECKLIST: AGENT DISPATCH

### Pre-Dispatch (Before Any Agent Starts)

**Stakeholder Approvals:**
- [ ] Product Owner: scope approved
- [ ] CTO: architecture approved
- [ ] Operations: infrastructure ready
- [ ] Business Owner: downtime approved
- [ ] Security: risks accepted
- [ ] Legal: data protection verified

**Infrastructure Ready:**
- [ ] Staging database isolated + tested
- [ ] Backups configured + tested
- [ ] Monitoring dashboards live
- [ ] CI/CD pipeline ready
- [ ] Communication channels open
- [ ] Incident response team assigned

**Team Ready:**
- [ ] 47 agents assigned to team members
- [ ] Each agent has access to repos
- [ ] GitHub access configured
- [ ] Slack/email notifications set up
- [ ] On-call schedule established

---

### Phase 1 Dispatch (Day 1, 09:00 UTC)

```bash
# Launch 3 agents in parallel
Agent P1A: "Create database backups in 3 layers"
Agent P1B: "Set up staging environment + CI pipeline"
Agent P1C: "Audit 88 Prisma models for migration"

# Monitor: All agents should complete within 12 hours
# Gate: All validation gates must pass before Phase 2 starts
```

---

### Phase 2 Dispatch (Day 4, 08:00 UTC)

```bash
# Launch 8 agents in parallel
Agent P2A: "Refactor Prisma schema (empresaId → businessId)"
Agent P2B: "Update TypeScript models + DTOs"
Agent P2C: "Update controllers + routes"
Agent P2D: "Update service signatures"
Agent P2E: "Update service logic + scoping"
Agent P2F: "Update authorization + guards"
Agent P2G: "Prepare database migrations"
Agent P2H: "Audit imports + dependencies"

# Monitor: All agents should complete within 7 days
# Gate: npm run build + test must pass before Phase 3 starts
```

---

### Phase 3 Dispatch (Day 11, 08:00 UTC)

```bash
# Launch 6 agents in parallel
Agent P3A: "Generate baseline checksums"
Agent P3B: "Execute staging schema migration (test)"
Agent P3C: "Create + test Membership population script"
Agent P3D: "Validate post-migration data integrity"
Agent P3E: "Create indexes + optimize performance"
Agent P3F: "Set up monitoring + alerting"

# Monitor: All agents should complete within 5 days
# Gate: Data integrity verified (checksums match) before Phase 4 starts
```

---

### Phase 4 Dispatch (Day 16, 08:00 UTC)

```bash
# Launch 5 agents in parallel
Agent P4A: "Redesign JWT payload + tokens"
Agent P4B: "Update JwtAuthGuard + BusinessContextGuard"
Agent P4C: "Update permission + RBAC system"
Agent P4D: "Implement token refresh + sessions"
Agent P4E: "Create multi-tenancy auth integration tests"

# Monitor: All agents should complete within 5 days
# Gate: All auth tests pass (25+ scenarios) before Phase 5 starts
```

---

### Phase 5 Dispatch (Day 21, 08:00 UTC)

```bash
# Launch 12 agents in parallel (MAXIMUM PARALLELIZATION)
Agent P5A: "Update Catalog service"
Agent P5B: "Update Inventory service"
Agent P5C: "Update Sales service"
Agent P5D: "Update Purchases service"
Agent P5E: "Update Payments service"
Agent P5F: "Update Customers service"
Agent P5G: "Update Cash Register service"
Agent P5H: "Update Returns service"
Agent P5I: "Update Messaging service"
Agent P5J: "Update Users + Authorization service"
Agent P5K: "Update Audit + Compliance service"
Agent P5L: "Update Analytics service"

# Monitor: All agents should complete within 8 days
# Gate: All services tested (500+ tests) before Phase 6 starts
```

---

### Phase 6 Dispatch (Day 36, 08:00 UTC)

```bash
# Launch 8 agents in parallel
Agent P6A: "Expand unit tests (300+ tests)"
Agent P6B: "Expand integration tests (150+ tests)"
Agent P6C: "Create E2E test suite (50+ tests)"
Agent P6D: "Repair CI/CD pipeline (add gates)"
Agent P6E: "Run performance + load tests"
Agent P6F: "Run security + penetration tests"
Agent P6G: "Create migration guides + documentation"
Agent P6H: "Test rollback + disaster recovery"

# Monitor: All agents should complete within 7 days
# Gate: 500+ tests pass (85%+ coverage) + CI green before Phase 7 starts
```

---

### Phase 7 Dispatch (Day 43, 20:00 UTC - Maintenance Window)

```bash
# Launch agents SEQUENTIALLY (time-sensitive)
Agent P7A (20:00): "Pre-production staging deployment" [4 hours]
Agent P7B (00:30): "Database cutover execution" [2 hours]
Agent P7C (02:30): "Application deployment" [2 hours]
Agent P7D (04:30): "Health checks + monitoring" [4 hours continuous]
Agent P7E (08:30): "Stakeholder communication" [2 hours]

# LIVE: Expected go-live at ~06:00 UTC (Day 44)
# Monitor: Continuous monitoring for 24 hours post-launch
```

---

### Phase 8 (Day 46 onwards)

```bash
# Ongoing optimization + feature development
Agent P8A: "Performance optimization"
Agent P8B: "Data cleanup + optimization"
Agent P8C: "Wapsell-specific feature development"

# Monitor: Weekly reviews + monthly performance reports
# Plan: Feature roadmap for Wapsell platform
```

---

## CRITICAL CONTACTS & ESCALATION

**On-Call Team (during Phase 7 cutover):**
- **Lead:** [CTO Name] (primary decision-maker)
- **Database:** [DBA Name] (schema migrations)
- **Backend:** [Architect Name] (API issues)
- **DevOps:** [DevOps Lead] (infrastructure)
- **Security:** [Security Officer] (auth issues)
- **Product:** [Product Owner] (business decisions)

**Escalation Path:**
1. **0-15 min:** Investigate + attempt fix (on-call team)
2. **15-30 min:** Escalate to CTO
3. **30+ min:** Consider Phase 7 rollback

---

## DOCUMENTS REQUIRED BY EACH AGENT

**Every Agent Receives:**
1. This roster (AGENT-ARMY-ROSTER.md)
2. MASTER-MIGRATION-PLAN.md (full plan)
3. Their specific task prompt (ready-to-use)
4. Access to repos (both ORM + Wapsell)
5. Slack channel for updates
6. Monitoring dashboard links
7. Rollback procedures

**Additional Resources:**
- Git commit guidelines (from CLAUDE.md)
- Security rules (from .claude/rules/)
- Testing conventions (from TESTING.md)
- API documentation (from ARCHITECTURE.md)

---

## SUCCESS METRICS (PHASE-BY-PHASE)

| Phase | Success Metric | Target |
|-------|---------------|--------|
| P1 | Backups created + verified | 3 layers intact |
| P2 | Code compiles + types pass | `npm run build` ✓ |
| P3 | Data integrity verified | Checksums match 100% |
| P4 | Auth system working | 25+ test scenarios pass |
| P5 | Services updated | 12/12 domains complete |
| P6 | Test coverage + CI | 500+ tests, 85%+ coverage |
| P7 | Live deployment | 0 errors, 99.9% availability |
| P8 | Optimization | Performance baseline met |

---

**READY FOR AGENT DISPATCH** ✅

Generate invitations for all 47 agents using this roster. Each agent knows:
- What to do (specific task)
- How to succeed (success criteria)
- Where to report (deliverables)
- When to finish (duration)
- Who depends on them (dependencies)

---

**Generated:** 2026-10-30  
**Version:** 1.0  
**Status:** READY FOR EXECUTION
