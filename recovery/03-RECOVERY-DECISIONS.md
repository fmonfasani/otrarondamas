# PR #100 RECOVERY DECISIONS — STRATEGIC CHOICES

**Date**: 2026-11-04  
**Status**: PHASE 2 — DECISION MATRIX  
**Goal**: Define what to recover vs. discard based on value and risk

---

## 1. STRATEGIC ARCHITECTURE DECISIONS REQUIRED

### DECISION #1: Frontend Strategy
**Question**: Is Remix the approved strategic frontend, or do we keep Next.js/existing apps?

**Context**:
- PR #100 adds 233 Remix files (31% of total)
- Remix already partially present in codebase (feat/phase1-remix-foundation merged)
- POS system has 73 files (separate app)
- Decision in WAPSELL-FORENSIC-DECISION-2026-11-03.md: **Remix-only confirmed**

**DECISION**: ✅ **KEEP REMIX** (strategy already approved)
- Remedy: Validate all 233 files are production-ready
- Remove: Any legacy Next.js files that conflict
- Plan: Merge best Remix practices from PR #100

---

### DECISION #2: Multi-Tenancy Enforcement
**Question**: Do we enforce complete tenant isolation from start, or gradual?

**Context**:
- PR #100 has company-scope extension + relation-ownership validation
- Current main has partial isolation
- Audit found chat without full isolation

**DECISION**: ✅ **ENFORCE COMPLETE ISOLATION** from start
- Reason: Security-critical, cannot be retrofitted safely
- Action: Validate all services use empresaId correctly (not businessId)
- Action: Audit all database queries for tenant boundaries

---

### DECISION #3: POS System Status
**Question**: Is POS a priority product feature or deprecated?

**Context**:
- PR #100 adds 73 POS files
- Product roadmap unclear in current documentation
- POS is secondary to main platform

**DECISION**: ⏸️ **DEFER POS RECOVERY**
- Reason: Product roadmap not confirmed, low priority
- Action: Create separate branch for POS assets
- Action: Revisit after core Wapsell is stable

---

## 2. RECOVERY MATRIX: FILE CATEGORIES

### CATEGORY A: BACKEND SERVICES (137 files) — SELECTIVE KEEP

| Service | Status | Decision | Rationale |
|---------|--------|----------|-----------|
| auth/* | VALIDATE | CONDITIONAL | Fix /validate endpoint missing |
| sales/* | VERIFY | CONDITIONAL | Check businessId→empresaId migration |
| inventory/* | VERIFY | CONDITIONAL | Validate stock isolation |
| orders/* | VERIFY | CONDITIONAL | Check price/qty trust issues |
| notifications/* | VERIFY | CONDITIONAL | Validate tenant scoping |
| payments/* | VERIFY | CONDITIONAL | Validate provider integration |
| prisma/* | FIX FIRST | CONDITIONAL | Fix commented import, schema |
| messaging/* | VERIFY | DISCARD | Chat isolation incomplete |
| Other | AUDIT | CASE-BY-CASE | Service-specific review |

**ACTION**: Fix critical PrismaService first, then selectively import services

---

### CATEGORY B: FRONTEND-REMIX (233 files) — KEEP AS BASELINE

**Status**: Approved in architecture, needs validation

**Recovery Plan**:
1. ✅ Keep all Remix routes (apps/wapsell-remix/app/routes/)
2. ✅ Keep Remix components (apps/wapsell-remix/app/components/)
3. ✅ Keep Remix services (apps/wapsell-remix/app/services/)
4. ❌ DISCARD: Conflicting with current branch (duplicate logic)
5. ⚠️ VALIDATE: API contract alignment

**Known Issues to Fix**:
- `/auth/validate` call → use `/auth/me` instead (endpoint exists)
- Container API URL: `localhost:8600` → `http://api:8600`
- Environment variable passing in Docker

**ACTION**: Merge Remix assets after fixing backend blockers

---

### CATEGORY C: DATABASE & MIGRATIONS (10+ files) — VALIDATE EACH

**Status**: High-risk changes, need careful review

| Migration | Status | Decision | Risk |
|-----------|--------|----------|------|
| B2: Kafka Event Log | REVIEW | CONDITIONAL | Event sourcing, new feature |
| H3: Properties Module | REVIEW | CONDITIONAL | New feature, schema change |
| Existing migrations | PRESERVE | KEEP | Already deployed |

**VALIDATION CHECKLIST**:
- [ ] PostgreSQL compatibility (no Oracle/MySQL specific syntax)
- [ ] Rollback procedure exists and is safe
- [ ] No data loss (reversibility)
- [ ] Indexes defined correctly
- [ ] Foreign keys align with multi-tenancy
- [ ] Tested on staging database

**ACTION**: Run migrations in staging environment first, never production

---

### CATEGORY D: CI/CD WORKFLOWS (15 files) — RECOVER BEST PRACTICES

**Status**: Current CI disabled (12 workflows renamed to .disabled)

**Current Situation**:
- main branch CI is active and working
- PR #100 disabled workflows and created main-ci.yml
- Unclear why workflows were disabled

**Decision**: ✅ **MERGE BEST PRACTICES ONLY**
1. Compare PR #100 main-ci.yml vs current ci.yml
2. Identify improvements (better timeouts, better error handling)
3. Apply improvements to current CI without disrupting it
4. DO NOT adopt disabled workflows without justification

**ACTION**: Do not enable disabled workflows; understand why they were disabled first

---

### CATEGORY E: DOCUMENTATION & AGENT REPORTS (277 files) — DISCARD

**Status**: Process artifacts, not production code

**Examples**:
- AGENT-B4-DASHBOARD-FORMS-DELIVERY.md
- AGENT-H1-AUTH-ENDPOINTS-DELIVERY.md
- DEPLOYMENT-STATUS.md
- P8E-CONTINUOUS-MONITORING-PLAYBOOK.md

**Decision**: ❌ **DISCARD ALL**
- These are session artifacts from agent work
- Do not belong in production repository
- Create "docs-archive" branch if historical reference needed
- Clean repository = better code quality

**ACTION**: Remove all agent reports and deployment docs

---

### CATEGORY F: CONFIGURATION FILES — VALIDATE

**Files**:
- package.json (MODIFY)
- .env.example (ADD)
- .npmrc (ADD)
- Dockerfiles (ADD)

**Decision**: ✅ **VALIDATE & SELECTIVE IMPORT**
1. Check npm dependencies don't conflict
2. Verify NestJS 11 compatibility (not v12)
3. Validate Docker base images (Alpine, Node version)
4. Test docker-compose build

**ACTION**: Import only what doesn't conflict with current main

---

## 3. RECOVERY ROADMAP

### PHASE 3: Fix Critical Blockers (2 hours)
```
[ ] Fix PrismaService import: Uncomment @prisma/client
[ ] Add /auth/validate endpoint (use /auth/me logic)
[ ] Add /api/health endpoint for Docker healthchecks
[ ] Fix docker-compose API_URL: localhost → api
[ ] Verify build succeeds
```

### PHASE 4: Selective Backend Import (4 hours)
```
[ ] Import auth services (with fixes)
[ ] Import sales services (validate businessId)
[ ] Import inventory services (validate isolation)
[ ] Import orders services (validate price/qty safety)
[ ] Run typecheck + build
```

### PHASE 5: Remix Frontend Validation (2 hours)
```
[ ] Verify Remix routes integrate with fixed API
[ ] Fix API URL in docker-compose
[ ] Test authentication flow
[ ] Run E2E tests
```

### PHASE 6: Database & Migrations (2 hours)
```
[ ] Audit B2 Kafka migration
[ ] Audit H3 Properties migration
[ ] Test on staging database
[ ] Verify rollback procedure
```

### PHASE 7: Testing & CI (3 hours)
```
[ ] Run unit tests
[ ] Run integration tests
[ ] Fix failing tests
[ ] Verify CI pipeline
```

---

## 4. RISK MITIGATION

### High-Risk Items Requiring Extra Validation
```
✓ PrismaService (CRITICAL - fix immediately)
✓ Docker networking (HIGH - affects all environments)
✓ Authentication flow (HIGH - security critical)
✓ Database migrations (HIGH - data safety)
✓ Multi-tenancy boundaries (HIGH - security critical)
```

### Protected Operations
```
✗ No production database touches
✗ No force-push to main
✗ No direct production deployments
✓ All changes tested in staging first
✓ All migrations reviewed for rollback safety
✓ All PRs reviewed before merge
```

---

## 5. SUCCESS CRITERIA

**Recovery is COMPLETE when**:
- [ ] PrismaService builds without errors
- [ ] All critical endpoints exist and work
- [ ] Docker healthchecks pass
- [ ] Remix can reach API from container
- [ ] 288+ tests pass (baseline from current main)
- [ ] No new security vulnerabilities introduced
- [ ] Multi-tenancy boundaries verified
- [ ] CI pipeline runs and validates correctly
- [ ] Production readiness confirmed

---

## NEXT PHASE: IMPLEMENTATION

Ready to proceed to **PHASE 4 — IMPLEMENTATION**

**Proposed Branch**: `recovery/pr100-assets` (based on main)

**Work Items**: Fix 4 critical blockers first (this session), then selective import

**Estimated Time**: 8-12 hours for full recovery

---

**Decision Matrix Status**: ✅ COMPLETE  
**Risk Assessment**: HIGH but MANAGEABLE with fixes  
**Recommendation**: Proceed with Phase 3 (critical blockers)

