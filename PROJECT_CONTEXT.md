# Wapsell Project Context
## Current State & Engineering Workflow

**Last Updated:** 2026-11-03  
**Status:** Consolidation in progress (Phases 1-6 reconciliation)  
**Owner:** Federico Monfasani  
**Repository:** `fmonfasani/otrarondamas`

---

## 🎯 QUICK SUMMARY

**What is this?**
- Wapsell: SaaS platform (messaging, commerce, multi-tenant)
- Otra Ronda Más: First tenant/business (internal dogfood)
- Current focus: Frontend consolidation to Remix-only architecture
- Backend: NestJS (source of truth for auth, business logic, tenant isolation)

**Current Architecture Decision (Nov 3, 2026):**
- ✅ **Frontend:** Remix 2.15 unified (NOT separate Next.js, POS, Tienda apps)
- ✅ **Backend:** NestJS (unchanged, authoritative)
- ✅ **Database:** PostgreSQL via Prisma (NestJS only, no direct frontend access)
- ✅ **Deployment:** Single Remix frontend, unified CI/CD pipeline

**Timeline:**
- **Nov 3-9:** Reconciliation foundation (merge P1 security fixes)
- **Nov 10-12:** Delete 3 legacy frontend apps, archive code
- **Nov 13-15:** Verify, document, prepare Phase 1-6 execution
- **Nov 15+:** Execute Phase 1-6 (Foundation → POS → Tienda → Admin → Deploy)

---

## 📍 REPOSITORIES & WORKTREES

### Primary Repository
```
Path: d:/Software Development/Porfolio/OtraRondaMas
Remote: origin → https://github.com/fmonfasani/otrarondamas.git
Current Branch: feat/phase1-remix-foundation (HEAD a22526c)
Status: Tracking origin/feat/phase1-remix-foundation ✅
```

### Active Worktrees
```
PRIMARY:
  d:/Software Development/Porfolio/OtraRondaMas 
    → feat/phase1-remix-foundation (P1 route boundaries + security)

FEATURE DEVELOPMENT (Preserve & integrate):
  worktrees/e2e-tests (test/sprint-messaging-commerce-e2e)
    → 5 new integration tests for cart/messaging/isolation
  worktrees/p5-conversation-ux (feat/sprint-p5-conversation-ux)
    → Conversation UX verification scripts
  worktrees/p6-persistent-cart (feat/sprint-p6-persistent-cart)
    → Cart contract specification & implementation report
  worktrees/commerce-cart-order (feat/sprint-commerce-cart-order)
    → Cart service idempotency tests (CLEAN)

REFERENCE ONLY (8 audit branches, can be removed):
  wapsell-authz, wapsell-ci, wapsell-contracts, wapsell-customer,
  wapsell-migration, wapsell-operations, wapsell-platform, wapsell-prisma
  → All at 0fae0b9 (origin/main), read-only audit worktrees
```

### Branches to Understand

| Branch | HEAD | Status | Purpose |
|--------|------|--------|---------|
| **feat/phase1-remix-foundation** | a22526c | Current | Route boundaries + security fixes (ready to merge) |
| **origin/main** | 0fae0b9 | Remote canonical | Remix-only baseline (ARCH-FE-001) |
| **main** | 77e1682 | Local (diverged) | Phase 2 experiment (Next.js), should not merge |
| **archive/next.js-phase2-experiment** | 77e1682 | Historical | Preserved for reference, do not use |
| **refactor/opcion-6** | c64ed48 | Ready to merge | CI/CD improvement (--workspaces flag) |
| **release/v0.1.0-production** | 5e9f1be | Stale | Legacy frontend release (6 commits behind) |

---

## 📚 CANONICAL DOCUMENTATION

**Entry Points (Read in this order):**

1. **CLAUDE.md** (this repo root)
   - Purpose, source-of-truth rules, execution protocol, quality expectations
   - Location: `d:/Software Development/Porfolio/OtraRondaMas/CLAUDE.md`

2. **PROJECT_CONTEXT.md** (you are here)
   - Current state, quick decisions, where to find things

3. **ARCHITECTURE.md**
   - Wapsell platform design (multi-tenant, three experience boundaries)
   - Location: `docs/ARCHITECTURE.md`

4. **DECISIONS.md** (consolidated)
   - Approved decisions, proposals, unresolved conflicts
   - Location: `docs/03-DECISIONS/` (read index first)

5. **ROADMAP.md**
   - Verified progress, Phase timeline, blockers
   - Location: Project execution plan (Phase 1-6)

**Specialized References:**
- **Architecture Spec:** `docs/WAPSELL-DOCUMENTATION/07-DESIGN/ARCHITECTURE/07-UNIFIED-REMIX-FRONTEND-ARCHITECTURE-SPEC-v0.1.md` (frozen baseline)
- **P1 Contract:** `docs/implementation/P1-UNIFIED-REMIX-FOUNDATION.md` (route boundaries + security)
- **Execution Plans:** 
  - `docs/implementation/WAPSELL-REMIX-FULL-EXECUTION-PLAN.md` (24 agents, Phases 1-6)
  - `docs/implementation/WAPSELL-REMIX-FRONTEND-REFACTOR-PLAN.md` (consolidation phases)

**Claude Code Instructions:**
- `.claude/MASTER-INSTRUCTIONS.md` — Agent coordination framework
- `.claude/ENGINEERING-INSTRUCTIONS.md` — Task contracts & validation
- `.claude/rules/` — git-safety, security, testing, documentation rules

---

## 🔐 ARCHITECTURE PRINCIPLES (DO NOT VIOLATE)

1. **NestJS is the only backend**
   - Authentication, authorization, business context, tenant isolation remain here
   - Remix acts as UX/API adapter only

2. **PostgreSQL via Prisma (NestJS only)**
   - No direct frontend database access
   - No duplicate ORM or backend logic

3. **Three security boundaries (hard isolation)**
   - Customer (public, unauthenticated)
   - Business Operations (authenticated, business-scoped)
   - Platform Admin (privileged, internal only)

4. **Server-side validation is mandatory**
   - Zod validators in Remix actions (not client-only)
   - JWT/session security: httpOnly cookies, fail-close production secrets

5. **No client-controlled tenant context**
   - Always verify tenant from authenticated session/JWT
   - Never trust client-supplied tenantId or businessId

---

## 📋 CURRENT TASKS & STATUS

### Critical Path (Reconciliation Phase, Nov 3-15)

**Phase 1A: Git Reconciliation (Nov 3-9)**
- [ ] Merge PR #107 (feat/phase1-remix-foundation) to origin/main
  - Contains: route boundaries, SESSION_SECRET fix, mock data removal, 30+ tests
  - Status: Ready for review
- [ ] Preserve feature work from dirty worktrees
  - ✅ e2e-tests: 5 integration tests → WIP commit created (71d673c)
  - ✅ p6-persistent-cart: cart report → WIP commit created (186f581)
  - ✅ p5-conversation-ux: verification scripts → WIP commit created (2d737c6)
- [ ] Discard stash@{0} (Prisma 5.22.0 downgrade not validated)
- [ ] Rebase local main onto origin/main after merge

**Phase 1B: Foundation Prep (Nov 10-12)**
- [ ] Delete `apps/wapsell-frontend` (Next.js legacy)
- [ ] Delete `apps/pos-admin` (React+Vite legacy)
- [ ] Delete `apps/tienda-online` (React+Vite legacy)
- [ ] Create archive branches for historical reference
- [ ] Update root package.json (remove from workspaces)

**Phase 1C: Verification (Nov 13-15)**
- [ ] Full build validation: `npm run build && npm run test`
- [ ] Route boundary tests pass: 30+ test suite from P1
- [ ] Cleanup audit worktrees (optional, can remain read-only)
- [ ] Update ARCHITECTURE.md with completion status

### Phase 1-6 Execution (After Nov 15)

**24 specialized agents across 6 phases:**
- Phase 1: Foundation (Remix core, auth patterns, types, validators) — 4 agents
- Phase 2: Dashboard consolidation — 4 agents
- Phase 3: POS terminal integration — 4 agents
- Phase 4: Tienda Online migration — 4 agents
- Phase 5: Admin panel setup — 4 agents
- Phase 6: Cleanup & deployment — 4 agents

See: `docs/implementation/WAPSELL-REMIX-FULL-EXECUTION-PLAN.md` for details

---

## 🚀 HOW TO CONTINUE ENGINEERING WORK

### Starting a New Claude Code Session

1. **Load this context file first**
   - `PROJECT_CONTEXT.md` (you're reading it)

2. **Know your branch state**
   ```bash
   git branch -vv
   git log --oneline -5
   git worktree list --porcelain
   ```

3. **Choose your working tree**
   - Primary: `d:/Software Development/Porfolio/OtraRondaMas` (canonical)
   - Feature: Use dedicated worktree for your feature (do not modify main checkout unless consolidation work)

4. **Follow the execution protocol**
   - Read: CLAUDE.md, .claude/rules/, relevant decision records
   - Inspect: Current branch state, existing diffs, dirty worktrees
   - Plan: Narrow scope, identify files affected, check for conflicts
   - Execute: Run tests, validate build, preserve changes
   - Report: Evidence (commands, results), next action

### Task Approval Checklist

Before starting work, verify:
- [ ] Scope is in-bounds (no schema changes, backend contract changes, or production deployments without auth)
- [ ] Architecture decision is known (Remix-only, no dual frontends, no new backends)
- [ ] Tenant isolation is preserved (if touching auth/scoping)
- [ ] Tests will be run (at minimum: lint, typecheck, unit tests)
- [ ] Previous work is preserved (no force-reset, no destructive operations)
- [ ] Decision records are updated (if architecture changes)

---

## 📞 REMAINING DECISIONS (Require User Authority)

**None blocking current work.**

Approved decisions:
- ✅ Frontend architecture: Remix-only
- ✅ Consolidation timeline: Nov 3-15
- ✅ Phase execution: WAPSELL-REMIX-FULL-EXECUTION-PLAN.md (Phases 1-6)

Conditional decisions (already made, awaiting execution):
- Legacy app deletion approved (scheduled Nov 10-12)
- Route boundary security fixes approved (PR #107 ready to merge)
- Stash discard approved (Prisma downgrade not validated)

---

## 🔗 USEFUL COMMANDS

```bash
# Status checks
git branch -vv                      # See branch tracking
git log --oneline -10               # Recent commits
git worktree list --porcelain       # All worktrees
git status --short --branch         # Quick status

# Preserve work safely
git add -A && git commit -m "WIP: <description>"  # Use instead of stash (shared!)

# Feature branch workflow
git checkout -b feat/your-feature origin/main
git push origin feat/your-feature

# Create PR
gh pr create --title "..." --body "..."

# After merging PR to main, sync local
git fetch origin
git rebase origin/main main
```

---

## 🎓 LEARNING THE PROJECT

**For new contributors:**
1. Start: `CLAUDE.md` (principles + protocol)
2. Then: `PROJECT_CONTEXT.md` (you are here)
3. Then: `docs/ARCHITECTURE.md` (platform design)
4. Then: Pick a Phase from `WAPSELL-REMIX-FULL-EXECUTION-PLAN.md`
5. Work: Follow task contract + evidence requirements

**For urgent context:**
- Wapsell = SaaS, Otra Ronda Más = tenant
- Remix frontend, NestJS backend, PostgreSQL database
- Three security boundaries (customer/business/admin)
- No direct frontend-to-database (always via NestJS)

---

## 📊 PROJECT STATS

- **Repository Size:** ~500 MB (including worktrees)
- **Branches:** 20 (5 critical, 15 feature/audit)
- **Worktrees:** 13 (1 primary, 4 feature, 8 audit)
- **Documentation Files:** 50+ (docs/, .claude/, memory/)
- **Test Coverage:** 300+ tests (unit, integration, E2E)
- **Code:** Remix frontend + NestJS backend (monorepo)
- **Deployment:** Docker Compose on Hetzner VPS (89.167.96.239)

---

## 📝 STATUS SUMMARY

**Consolidation Mission:** 🔄 IN PROGRESS
- ✅ Environment discovered
- ✅ Architecture decision confirmed (Remix-only)
- ✅ Feature work preserved (3 worktrees committed)
- ✅ Documentation entry point created (this file)
- 🔄 Phases 2-6 pending execution

**Next Immediate Step:**
Execute `WAPSELL-FORENSIC-AUDIT-ACTION-PLAN.md` (reconciliation actions Nov 3-15)
OR continue with Phase 1-6 execution after reconciliation complete.

---

**Questions?** Check CLAUDE.md, PROJECT_CONTEXT.md (this file), or relevant decision records.  
**For detailed workflows:** See `.claude/MASTER-INSTRUCTIONS.md`  
**For current execution plan:** See `docs/implementation/WAPSELL-REMIX-FULL-EXECUTION-PLAN.md`

🤖 Generated with Claude Code during consolidation mission (2026-11-03)
