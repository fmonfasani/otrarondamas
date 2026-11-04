# Wapsell Approved Decisions (Current)
## Authoritative Decision Record

**Last Updated:** 2026-11-03  
**Status:** Active  
**Next Review:** 2026-11-15 (post-reconciliation)

---

## APPROVED DECISIONS ✅

### 1. Frontend Architecture: Remix-Only
**Decision Date:** 2026-11-03 (confirmed via existing execution plans)  
**Status:** APPROVED & ACTIVE  
**Authority:** Product + Engineering (deduced from WAPSELL-REMIX-FULL-EXECUTION-PLAN.md dated 2026-10-29)

**What it means:**
- Single unified Remix 2.15 frontend (`apps/wapsell-remix`)
- Delete `apps/wapsell-frontend` (Next.js), `apps/pos-admin` (React), `apps/tienda-online` (React)
- Three experience boundaries (_customer, _business, _platform) within Remix
- Archive deleted code for historical reference

**Why:**
- ARCH-FE-001 frozen baseline specifies Remix-only
- Eliminates 3 critical architectural conflicts (duplicate routes, session incompatibility, dual maintenance)
- Existing execution plans (Oct 29) already committed to this direction
- Single deployment, unified CI/CD, shared types with NestJS backend

**Evidence:**
- `docs/WAPSELL-DOCUMENTATION/07-DESIGN/ARCHITECTURE/07-UNIFIED-REMIX-FRONTEND-ARCHITECTURE-SPEC-v0.1.md` (frozen)
- `docs/implementation/WAPSELL-REMIX-FULL-EXECUTION-PLAN.md` (24 agents, Phases 1-6)
- `docs/implementation/WAPSELL-REMIX-FRONTEND-REFACTOR-PLAN.md` (consolidation path)
- Forensic audit (2026-11-03) resolved 3 CRITICAL architectural blockers

**Implementation Timeline:**
- Nov 3-9: Reconciliation foundation (merge P1 security fixes)
- Nov 10-12: Delete legacy apps, archive code
- Nov 13-15: Verify, document, prepare Phase 1-6
- Nov 15+: Execute Phase 1-6 (Foundation through Deployment)

**Scope (Protected):**
- NestJS backend unchanged
- PostgreSQL schema unchanged
- Authentication model unchanged
- Tenant isolation contracts unchanged

---

### 2. Backend Authority: NestJS Only
**Decision Date:** Prior (part of ARCH-FE-001, frozen)  
**Status:** APPROVED & ACTIVE

**What it means:**
- NestJS is the only application server
- Authentication, authorization, business context, tenant isolation all in NestJS
- Remix acts as UX/API adapter only
- PostgreSQL accessed through NestJS Prisma ORM (no direct frontend queries)

**Why:**
- Multi-tenant isolation requires centralized business logic enforcement
- Backend remains source of truth for security-critical decisions
- No duplicate ORM, no direct database access, no secondary application server

**Scope (Protected):**
- No new backend frameworks (FastAPI, Deno, etc.)
- No direct frontend-to-database access
- No Remix server actions that bypass NestJS API

---

### 3. Multi-Tenant Boundaries: Strict Separation
**Decision Date:** Prior (ARCH-FE-001, frozen)  
**Status:** APPROVED & ACTIVE

**What it means:**
- Customer Experience (public, unauthenticated)
- Business Operations (authenticated, business-scoped, owned by authenticated user)
- Platform Admin (privileged, internal only)
- Hard isolation: no cross-boundary navigation without re-authentication

**Why:**
- Security-critical: prevents data leakage between tenants and user types
- User experience clarity: different users see different interfaces
- Compliance: audit trail of which experience was accessed

**Protected (Do Not Change Without Review):**
- Remix layout boundaries (_customer, _business, _platform)
- Session/JWT validation in loaders
- Role-based middleware
- API endpoint scoping

---

## SCHEDULED DECISIONS (Approved, Awaiting Execution)

### Reconciliation Timeline (Nov 3-15, 2026)
**Status:** APPROVED, EXECUTION IN PROGRESS  
**Action:** Execute WAPSELL-FORENSIC-AUDIT-ACTION-PLAN.md

**Phase 1A (Nov 3-9): Git Reconciliation**
- Merge PR #107 (feat/phase1-remix-foundation) to origin/main
- Preserve feature work (e2e-tests, p6, p5 worktrees)
- Discard stash@{0} (Prisma downgrade not validated)

**Phase 1B (Nov 10-12): Legacy App Deletion**
- Delete wapsell-frontend (Next.js)
- Delete pos-admin (React+Vite)
- Delete tienda-online (React+Vite)
- Create archive branches for reference

**Phase 1C (Nov 13-15): Verification**
- Full build validation
- Route boundary tests pass
- Update ARCHITECTURE.md
- Handoff to Phase 1-6 execution

---

## CONDITIONAL/PENDING DECISIONS (Awaiting User Authority)

**None currently.** All critical decisions are:
- ✅ Already approved (frontend: Remix-only)
- ✅ Already documented (ARCH-FE-001, existing plans)
- ✅ Already scheduled (reconciliation timeline Nov 3-15)

---

## UNRESOLVED CONFLICTS (Noted, Not Blocking)

**None critical.**

Historical conflicts (already resolved):
- Dual frontend architectures (Next.js vs Remix) → Remix chosen
- Session strategy incompatibility → Remix sessions + server-side validation chosen
- Duplicate route implementations → All in Remix, others archived
- Stashed dependency upgrade → Deferred to Phase 6 (post-stabilization)

---

## DECISION PROCESS & GOVERNANCE

**How decisions are made:**
1. Architecture decisions frozen in ARCH-FE-001 (authority: Product + Engineering)
2. Implementation decisions from execution plans (WAPSELL-REMIX-FULL-EXECUTION-PLAN.md, etc.)
3. Task-level decisions made by Claude Code with audit trail in code commits
4. User authority decisions only when genuinely unresolved (none currently)

**How to update decisions:**
1. New decision required? Create issue or comment in existing PR
2. Decision made? Document in DECISIONS-CURRENT.md with date, authority, evidence
3. Existing decision changing? Update DECISIONS-CURRENT.md, add superseded section
4. Superseded decision? Move to HISTORICAL-DECISIONS.md for traceability

**Current Review Cycle:**
- Reconciliation milestone: Nov 15, 2026 (Phase 1 completion, Phase 1-6 launch)
- Next review: 2026-11-15 (full decision audit post-consolidation)

---

## HISTORICAL/SUPERSEDED DECISIONS

**None yet.** All current decisions remain active.

Candidates for archive (not yet superseded):
- Release versioning (v0.1.0-production at 5e9f1be) — pending clarification post-consolidation
- Prisma 5.22.0 upgrade (stashed) — deferred to Phase 6

---

**Authority:** Federico Monfasani (Project Owner)  
**Last Reviewed:** 2026-11-03 (consolidation mission)  
**Next Review:** 2026-11-15 (reconciliation completion)

For detailed background, see:
- `PROJECT_CONTEXT.md` (current state summary)
- `CLAUDE.md` (engineering principles)
- `docs/ARCHITECTURE.md` (platform design)
- `docs/03-DECISIONS/` (extended decision history)

🤖 Generated with Claude Code
