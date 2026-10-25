# CI/CD Design P0-2 — Executive Summary

**Date**: 2026-10-25  
**Status**: DESIGN COMPLETE (Ready for owner approval)  
**Deliverable**: CICD-DESIGN-P0-2.md (Full 16-section design document)

---

## Quick Overview

I've designed 3 GitHub Actions workflows (lint, test, build) + branch protection rules to gate PRs on the main branch. **This is design only—no files created, no workflows deployed, no settings changed.**

### What Gets Built (After Approval)

1. **.github/workflows/lint.yml** — ESLint + Prettier format check (~40 seconds)
2. **.github/workflows/test.yml** — Jest unit + integration tests (~13-19 minutes)
3. **.github/workflows/build.yml** — NestJS compile + Prisma validation (~3-4 minutes)
4. **.github/branch-protection.json** — Configuration for main branch (1 approval + all 3 workflows PASS required)

**Total time for all 3 parallel**: ~19 minutes (test is slowest)

---

## Key Decisions (Embedded in Design)

### Node.js Version: 20 LTS

Why:
- Already pinned in 5 existing workflows (b4-verification, post-merge-verification, etc.)
- LTS until 2026-04-30
- NestJS ^10.0.0 compatible
- Prisma ^5.22.0 compatible

### Test Timeout: 15 minutes

- Unit tests: ~5-10 minutes
- Integration tests: ~5-8 minutes
- Includes C5B (cart), F1 (inventory), F2 (seller), tenant isolation
- Uses `--runInBand` (no parallel Jest workers) to isolate flaky tests

### Branch Protection: 3-in-1 Gate

```
LINT PASS + TEST PASS + BUILD PASS + 1 code review
     ↓
      Merge enabled
```

No force push, no deletion, strict update-before-merge.

### Workflow Triggers

- **Push to feat/\*** branches: Run all 3 automatically
- **PR to main**: All 3 trigger, all must PASS before merge
- **Merge to main**: Post-merge-verification runs (already exists, unchanged)

### Lint Strategy

- **Local** (`npm run lint`): Uses `--fix` (mutates code)
- **CI** (lint.yml): Does NOT use `--fix` (check-only)
- **Why**: Enforce discipline; developers must review fixes locally before committing

### Build Status

**BLOCKING ISSUE**: Current build fails with TypeScript errors:
```
prisma/migrate-categoria-a-jerarquia.ts — TS2347, TS2345, TS2322
prisma/seed.ts — TS2305 (UnidadBase not exported)
src/cart/dto/cart.response.dto.ts — TS2694 (Prisma.Decimal not exported)
```

**These must be fixed before CI deployment.** The build workflow will fail until resolved.

---

## Performance Baselines

### Timing (With npm Cache Hit)

| Workflow | Time | Bottleneck |
|----------|------|-----------|
| Lint | ~40s | Prettier format check |
| Test | 13-19 min | Integration tests (C5B, F1, F2) |
| Build | 3-4 min | NestJS compilation |
| **Parallel** | **~19 min** | Test (slowest wins) |

### Current Lint Status

- 24 ESLint errors detected (mostly `no-unused-vars`, `no-explicit-any`)
- Exit code: 0 (not blocking, `--fix` corrects them)
- CI lint will be stricter: `--max-warnings 0` (fail on any warning)

This will require cleanup before CI goes live (or relax `--max-warnings 0` to a threshold).

---

## Known Blockers Before Implementation

### 1. TypeScript Build Errors (CRITICAL)

Must fix:
- Prisma client type generation (UnidadBase, Decimal exports)
- Migration file TypeScript errors
- DTO imports

**Blocker**: build.yml will fail until resolved.

### 2. Lint Warnings Cleanup (RECOMMENDED)

Current: 24 warnings (unused imports, any types)

Option A: Fix now (clean CI)
Option B: Set `--max-warnings 24` (allow existing warnings, fail on new ones)

### 3. .nvmrc Not Present (OPTIONAL)

Create `.nvmrc` with `20` to help developers use correct Node version locally.

---

## Acceptance Checklist (For Owner)

Before implementation, owner confirms:

- [ ] Node.js 20 LTS is acceptable
- [ ] 13-19 minute test timeout is acceptable (can increase if needed)
- [ ] All 3 workflows (lint, test, build) required for merge
- [ ] 1 code review + 3 green workflows = sufficient gate
- [ ] TypeScript build errors will be fixed before CI deployment
- [ ] Lint warnings (24 existing) acceptable or will be cleaned up

---

## Implementation Roadmap (After Approval)

### Phase 1: Prepare (Day 1)
- Fix TypeScript build errors
- Clean up lint warnings (or set threshold)
- Create .nvmrc with `20`
- Run local validation: `npm run build`, `npm run lint`, `npm test`

### Phase 2: Deploy Workflows (Day 2)
- Copy 3 workflow YAML files to .github/workflows/
- Test on 1-2 feature branches (verify no false positives)
- Apply branch protection rule to main via GitHub UI

### Phase 3: Validate (Days 3-5)
- Run 5-10 PRs through new workflows
- Measure actual timing (compare to estimates)
- Monitor for flaky tests
- Adjust timeouts if needed
- Document troubleshooting guide for developers

### Phase 4: Declare Ready (Day 5)
- Update D-018 status: IMPLEMENTED
- Publish developer guide (how to fix CI failures)
- Archive design document in wiki

---

## Design Highlights

### Parallelism

All 3 workflows run simultaneously; no serial dependencies. This saves ~15 minutes vs. running them sequentially.

### Cache Strategy

npm dependencies cached by GitHub Actions (automatic). First run: 60s install. Subsequent runs: 15s (cached). Saves ~45s per run.

### Flaky Test Mitigation

- `--runInBand` (no Jest parallelism)
- Fixed race condition in C5B (commit dd91079)
- Fixed fixtures (commits d262821, 644468d)
- 523 total tests PASS locally

### Failure Handling

- Timeouts retryable (manual button in GitHub Actions)
- False positives documented (e.g., Windows CRLF issue)
- Rollback plan: Delete workflows, remove branch protection (~10 min)
- No weakening of CI rules to hide issues

### Security

- CI uses dummy secrets (JWT_SECRET, Google credentials for tests only)
- No production credentials in workflows
- Branch protection prevents force push even for admins

---

## File Locations

### Delivered (in scratchpad for review)
```
CICD-DESIGN-P0-2.md (16 sections, 600+ lines, comprehensive)
CICD-DESIGN-SUMMARY.md (this file)
```

### To Be Created (After Approval)
```
.github/workflows/lint.yml
.github/workflows/test.yml
.github/workflows/build.yml
.github/branch-protection.json (documentation; apply via GitHub UI)
.nvmrc (optional)
```

---

## Next Action: Owner Review

Please review **CICD-DESIGN-P0-2.md** and confirm:

1. **Node.js version**: Approve pinning to 20 LTS?
2. **Test timeout**: Approve 13-19 minutes?
3. **Gate criteria**: Approve lint + test + build + 1 review?
4. **Build errors**: Will be fixed before deployment?
5. **Lint warnings**: Will be cleaned or thresholded?

Once approved, implementation can begin within 1-2 days.

---

## Appendix: Design Sections

Full document contains:

1. Executive Summary
2. Workflow Architecture (triggers, flow, parallelism)
3. Lint Workflow (ESLint, Prettier, caching, failures)
4. Test Workflow (Jest, integration suites, PostgreSQL, flaky tests)
5. Build Workflow (NestJS, TypeScript, Prisma validation)
6. Branch Protection Rules (GitHub settings, process)
7. Cache Strategy (npm deps, artifacts)
8. Failure Handling & Rollback (false positives, emergency bypass)
9. Node.js Version Alignment (why 20 LTS, future upgrades)
10. Performance Targets (timing, optimization path)
11. Workflow YAML Templates (ready to paste)
12. Branch Protection JSON (configuration)
13. Acceptance Criteria (before/after implementation)
14. Known Blockers (TypeScript errors, lint warnings, .nvmrc)
15. Comparison with Existing Workflows (no conflicts)
16. Rollback Plan (if Phase 2 P0-2 proves problematic)
17. Next Steps (owner decision points)
18. Appendix: Timing Data (estimates, cache performance)

---

**Status**: READY FOR OWNER REVIEW

Please confirm the 5 items above, and I'll proceed to implementation.
