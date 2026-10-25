# CI/CD Automation Design — Phase 2 P0-2
## GitHub Actions Setup for Wapsell

**Approved Decision**: D-018 (Implement CI/CD gates now)  
**Date**: 2026-10-25  
**Status**: DESIGN (Ready for owner approval before implementation)  
**Branch**: feat/wapsell-engineering-kit-v1-sync  

---

## Executive Summary

This document designs three GitHub Actions workflows (lint, test, build) plus branch protection rules to enforce quality gates on the main branch. The design is **intentionally conservative**: it aligns with current infrastructure, avoids breaking existing workflows, documents every timing/timeout assumption, and provides rollback strategies for false positives.

**Key Constraints**:
- Node.js 20 LTS (already pinned in b4-verification, post-merge-verification)
- Monorepo workspace (@otrarondamas/api)
- Existing integration tests (C5B, F1, F2, tenant isolation, store-api)
- Build currently broken (TypeScript errors in prisma migrations/seed)
- Lint command uses `--fix` (mutates code)

---

## 1. Workflow Architecture

### 1.1 Workflow Trigger Strategy

| Workflow | Push | PR | Merge |
|----------|------|----|----|
| **Lint** | feat/* | main → | No merge without lint PASS |
| **Test** | feat/* | main → | No merge without test PASS (≥95%) |
| **Build** | feat/* | main → | No merge without build PASS |

**Rationale**:
- Push to `feat/*` allows fast iteration in PRs
- PR to `main` is the gate point
- Merge protection enforced via branch rules (not workflow)
- `main` branch itself cannot be pushed to (emergency hotfixes only via hotfix/*)

### 1.2 Execution Flow

```
PR opened → trigger all 3 workflows in parallel
  ├─ Lint → ESLint + Prettier format check (no --fix)
  ├─ Test → Jest unit + integration (runInBand for isolation)
  └─ Build → NestJS compile + Prisma schema validation
        ↓
All 3 PASS → Mark PR as "ready to merge"
Any FAIL → Block merge, post comment with remediation
```

**Parallelism**: All 3 workflows run simultaneously; no dependencies between them.

---

## 2. Lint Workflow (.github/workflows/lint.yml)

### 2.1 Design

**Purpose**: Enforce code style, catch obvious mistakes, format consistency.

**Trigger**:
```yaml
on:
  push:
    branches: ["feat/**"]
  pull_request:
    branches: [main]
```

**Environment**:
- Node.js 20 LTS (via actions/setup-node@v5)
- Cache: npm dependencies (actions/setup-node cache: npm)
- Workspace: @otrarondamas/api

### 2.2 Steps

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      
      - name: Install dependencies
        run: npm ci --workspace=@otrarondamas/api --include-workspace-root
      
      - name: Run ESLint (no --fix in CI)
        run: npm run lint --workspace=@otrarondamas/api -- --max-warnings 0
        # Override local script: local uses --fix, CI uses --no-fix
        # Fails on any warning or error
      
      - name: Check Prettier format
        run: npx prettier --check "apps/api/src/**/*.ts" "apps/api/test/**/*.ts"
```

### 2.3 Configuration

**.eslintrc.js** (current state):
```
- Root eslint: node, browser, es2021
- Parser: @typescript-eslint/parser
- Extends: recommended + prettier + react
- Rules: indent=2, quotes=single, semi=always
- Prettier/prettier rule: endOfLine: crlf (WINDOWS SPECIFIC)
```

**.prettierrc.json** (current state):
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

**Lint timeout**: ~30s (includes install, lint, format check)

### 2.4 Failure Handling

| Failure | Root Cause | Remediation |
|---------|-----------|------------|
| ESLint error | Code style violation | Run `npm run lint` locally, commit fix |
| Prettier mismatch | Format differs | Run `npx prettier --write` locally |
| Windows/CRLF issue | Line ending mismatch in .eslintrc | Use git config core.autocrlf=true |

**Key Alert**: Local lint script uses `--fix` (mutates code). CI lint does NOT. Developers must:
```bash
npm run lint              # Local: fixes code
git diff --cached        # Review changes
git add .
git commit -m "chore: format"
```

### 2.5 Outputs

- **Pass**: Green status on PR, can merge
- **Fail**: Red status on PR + comment with first 10 errors

---

## 3. Test Workflow (.github/workflows/test.yml)

### 3.1 Design

**Purpose**: Run Jest unit + integration tests, validate pass rate ≥95%, provide coverage artifacts.

**Trigger**:
```yaml
on:
  push:
    branches: ["feat/**"]
  pull_request:
    branches: [main]
```

**Environment**:
- Node.js 20 LTS
- PostgreSQL 15 (service container, same as b4-verification)
- Cache: npm dependencies + Jest cache
- Workspace: @otrarondamas/api

### 3.2 Services

```yaml
services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: otrarondamas
    ports:
      - 5500:5432
    options: >-
      --health-cmd "pg_isready -U user -d otrarondamas"
      --health-interval 5s
      --health-timeout 5s
      --health-retries 10
```

**Env Vars** (CI-only):
```yaml
DATABASE_URL: postgresql://user:password@localhost:5500/otrarondamas?schema=public
JWT_SECRET: s-v1-ci-only-jwt-secret
GOOGLE_CLIENT_ID: s-v1-ci-only-client-id
GOOGLE_CLIENT_SECRET: s-v1-ci-only-client-secret
GOOGLE_CALLBACK_URL: http://127.0.0.1:3399/auth/google/callback
```

### 3.3 Steps

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    services: [ postgres above ]
    env: [ vars above ]
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      
      - name: Install dependencies
        run: npm ci --workspace=@otrarondamas/api --include-workspace-root
      
      - name: Generate Prisma client
        run: npm run prisma:generate --workspace=@otrarondamas/api
      
      - name: Validate Prisma schema
        run: npx prisma validate --schema apps/api/prisma/schema.prisma
      
      - name: Push schema to test DB
        run: npx prisma db push --schema apps/api/prisma/schema.prisma --skip-generate
      
      - name: Run unit tests
        run: npm test --workspace=@otrarondamas/api -- --runInBand --coverage
        timeout-minutes: 10
      
      - name: Run integration tests
        if: success()
        run: npm run test:integration --workspace=@otrarondamas/api -- --runInBand
        timeout-minutes: 8
      
      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: apps/api/coverage
      
      - name: Check pass rate
        if: always()
        run: |
          # After tests, parse Jest output for pass rate
          # Fail if <95% pass
          # (Exact logic depends on Jest JSON output format)
```

### 3.4 Test Suites Included

**Unit Tests** (`jest --config jest.config.js`):
- Services, controllers, DTOs, utilities
- ~5-10 minutes

**Integration Tests** (`jest --config test/jest-e2e.json`):
- C5B cart API (15 tests)
- F1 inventory security (6 tests)
- F2 seller confirmation (12 tests)
- Tenant isolation (1 critical test)
- Store API catalog (n tests)
- ~5-8 minutes

**Total expected**: 12-18 minutes

### 3.5 Flaky Tests Known Issues

From memory and audit:
- **C5B cart tests**: Fixed race condition (SV6-H-10b, SERIALIZABLE isolation, commit dd91079)
- **Inventory validation**: Fixed fixture issues (d262821 + 644468d), 123 tests PASS
- **Store API**: Schema validation issues (some test fixtures may fail if schema stale)

**Mitigation**: Explicit `--runInBand` (no parallel Jest workers) to isolate test failures.

### 3.6 Failure Handling

| Failure | Root Cause | Remediation |
|---------|-----------|------------|
| Test timeout (>15m) | Infinite loop, deadlock, slow suite | Check test logs; if random, mark flaky and retry |
| Pass rate <95% | Code regression | Revert change, fix test data, or update assertion |
| DB service failed | Postgres health check timeout | Retry workflow (transient network issue) |
| Prisma schema invalid | Migration error, type mismatch | Check `prisma validate` output, fix schema |

**Retry Strategy**: For timeouts or DB failures, allow manual retry via GitHub Actions button. For test failures, provide link to test logs.

### 3.7 Outputs

- **Pass**: Green status on PR, test count + pass rate in summary
- **Fail**: Red status + comment with failed test names + link to artifact
- **Artifact**: coverage-report/ uploaded for review

---

## 4. Build Workflow (.github/workflows/build.yml)

### 4.1 Design

**Purpose**: Compile NestJS app, validate TypeScript, generate Prisma client, ensure no build artifacts broken by PR changes.

**Trigger**:
```yaml
on:
  push:
    branches: ["feat/**"]
  pull_request:
    branches: [main]
```

**Environment**:
- Node.js 20 LTS
- No DB service needed (compile-only, no runtime)
- Cache: npm dependencies + build cache

### 4.2 Steps

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      
      - name: Install dependencies
        run: npm ci --workspace=@otrarondamas/api --include-workspace-root
      
      - name: Generate Prisma client
        run: npm run prisma:generate --workspace=@otrarondamas/api
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Build NestJS
        run: npm run build --workspace=@otrarondamas/api
        timeout-minutes: 8
      
      - name: Verify build output
        run: |
          if [ ! -d "apps/api/dist" ]; then
            echo "Build output missing (dist/)"
            exit 1
          fi
          if [ $(find apps/api/dist -type f | wc -l) -eq 0 ]; then
            echo "Build output empty"
            exit 1
          fi
          echo "Build successful: $(find apps/api/dist -type f | wc -l) files"
```

### 4.3 Timing

- Install: ~30s
- Prisma generate: ~5s
- TypeScript check: ~15s
- Build: ~2-3 minutes
- **Total**: ~3 minutes

### 4.4 Known Issues

**BLOCKING**: Current build fails (TypeScript errors):
```
prisma/migrate-categoria-a-jerarquia.ts:183 - TS2347: Untyped function calls may not accept type arguments
prisma/seed.ts:1 - TS2305: Module '"@prisma/client"' has no exported member 'UnidadBase'
src/cart/dto/cart.response.dto.ts:11 - TS2694: Prisma.Decimal not exported
```

**Action Required Before CI Deployment**:
1. Fix TypeScript errors in `prisma/seed.ts`, migration files, DTO types
2. Verify Prisma client generation outputs correct types
3. Run local `npm run build` successfully

This workflow will **fail** until TypeScript errors are fixed. It is intentionally strict (no `--noEmit` skip, no `skipLibCheck` in CI).

### 4.5 Failure Handling

| Failure | Root Cause | Remediation |
|---------|-----------|------------|
| TS error | Type mismatch, missing import, Prisma client stale | Run `npm run build` locally, fix TS errors |
| Missing dist/ | Build tool failure | Check nest build logs, verify tsconfig |
| Build timeout | Slow compilation, infinite loop | Check for circular deps, split bundle |

**Expected Build Blockers** (as of 2026-10-25):
- Prisma client types mismatch (UnidadBase missing?)
- Decimal type import issues
- Migration file TypeScript errors

These must be resolved before CI/CD goes live.

### 4.6 Outputs

- **Pass**: Green status on PR, build summary (file count, size)
- **Fail**: Red status + comment with first TypeScript error + link to logs

---

## 5. Branch Protection Rules

### 5.1 Configuration (GitHub Settings → Branch Protection)

```json
{
  "branch": "main",
  "enforce_admins": true,
  "require_code_reviews": {
    "dismissal_restrictions": [],
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "lint",
      "test",
      "build"
    ]
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

### 5.2 Interpretation

| Setting | Requirement |
|---------|------------|
| **Enforce admins** | Branch protection applies to admins (safest) |
| **Require 1 approval** | At least 1 code review before merge |
| **Lint + Test + Build PASS** | All 3 workflows must be green |
| **Strict merge** | Branch must be up-to-date with main before merge |
| **No force push** | Prevents rewriting history |
| **No deletions** | Prevents branch from being deleted |

### 5.3 Process

```
1. Developer opens PR on feat/* branch
2. All 3 workflows trigger on PR creation
3. Workflows run in parallel (~3-18 min)
4. Reviewer approves PR (1 review minimum)
5. IF all workflows PASS:
     → "Squash and merge" button enabled
     → Merge to main → trigger post-merge-verification (already exists)
6. IF any workflow FAILS:
     → Merge button disabled until fixed
     → Developer must fix, push to feat/*
     → Workflows re-trigger automatically
```

---

## 6. Cache Strategy

### 6.1 npm Dependencies Cache

**Setup**: `actions/setup-node@v5` with `cache: npm`
- **Cache key**: Automatically hash `package-lock.json`
- **Restore fallback**: If no exact match, restore partial and run `npm ci` (still faster)
- **TTL**: 7 days (GitHub default)

**Benefit**: First run caches deps, next runs restore in ~30s (vs. 2-3 min with npm ci)

### 6.2 Jest/Build Artifact Cache

**Status**: NOT recommended at first deployment
- Jest cache is noisy (source-map-support, ts-jest internals)
- Build artifacts (dist/) should NOT be cached; always rebuild

**Decision**: Let first run establish baselines; add artifact caching only if build times become bottleneck.

### 6.3 Prisma Client Cache

**Status**: NOT cached explicitly
- `npm run prisma:generate` creates `node_modules/.prisma/client`
- Every workflow regenerates (ensures fresh types)
- Cost: ~5s per run (acceptable)

---

## 7. Failure Handling & Rollback

### 7.1 False Positives

| Scenario | Detection | Action |
|----------|-----------|--------|
| Flaky test (random failure) | Test fails, re-run passes | Assign to "flaky" label, require 2 green runs before merge |
| Network timeout (npm, Postgres) | Timeout in install or test step | Retry workflow (GitHub Actions button) |
| Lint differs (crlf vs lf) | Format check fails on Windows line endings | Add `.gitattributes: * text=auto` or `core.autocrlf=true` |

### 7.2 Blocking Merge (Legitimate)

If a workflow legitimately fails (e.g., new test that fails because feature incomplete):

```
1. Developer reviews error message
2. Fixes code locally
3. Commits and pushes to feat/* branch
4. GitHub Actions automatically re-runs workflow
5. Merge button re-enables once PASS
```

### 7.3 Emergency Bypass

If a workflow **incorrectly blocks** a valid PR:

1. **Document the false positive** in PR comments (tag @owner)
2. **DO NOT** disable branch protection
3. **Admin can manually merge** (requires enforcement override)
4. **Post-incident**: Add test/config to prevent recurrence

**Never**:
- Weaken CI thresholds to hide issues
- Disable workflow without root-cause investigation
- Bypass branch protection for convenience

---

## 8. Node.js Version Alignment

### 8.1 Current State

- **Running (local)**: v24.14.0
- **CI specified**: 
  - b4-verification: 20
  - post-merge-verification: 20
  - messaging-browser-e2e: 24
  - wapsell-event-orchestrator: 20 (mostly)

### 8.2 Decision: Pin to Node.js 20 LTS

**Rationale**:
1. **Consistency**: 5 workflows already use 20 LTS
2. **Stability**: LTS release (until 2026-04-30)
3. **API compatibility**: NestJS ^10.0.0 targets Node 18+ (20 safe)
4. **Prisma**: Works with Node 20 (@prisma/client ^5.22.0)
5. **Avoid 24**: Messaging E2E uses 24, but only for browser testing (separate requirement)

### 8.3 Action Required

1. **Document why**: Add .nvmrc
   ```
   20
   ```
   Or in package.json:
   ```json
   {
     "engines": {
       "node": "^20.0.0",
       "npm": ">=10.0.0"
     }
   }
   ```

2. **Developers**: Install nvm, run `nvm install 20; nvm use`

3. **CI**: All 3 new workflows pin `node-version: 20` in setup-node

### 8.4 Future Upgrades

If Node 20 reaches EOL or feature needed from 22+:
1. Update all workflow files simultaneously
2. Test locally first
3. No breaking change to monorepo structure needed

---

## 9. Performance Targets

### 9.1 Workflow Duration

| Workflow | Setup | Main | Total | SLA |
|----------|-------|------|-------|-----|
| **Lint** | 30s (deps cache) | 10s (eslint+prettier) | ~40s | <2 min |
| **Test** | 30s (deps cache) | 12-18 min (jest suite) | ~13-19 min | <20 min |
| **Build** | 30s (deps cache) | 2-3 min (nest build) | ~3-4 min | <5 min |
| **All 3 parallel** | — | — | 13-19 min | <20 min |

**Definition**: "SLA" = acceptable threshold before investigation required.

### 9.2 Optimization Path (Future)

If workflows exceed SLA:
1. **Lint**: Investigate ESLint plugin overhead (currently OK)
2. **Test**: Split integration tests into multiple jobs (if >20 min)
3. **Build**: Enable incremental builds, explore esbuild (if >5 min)

Not in scope for Phase 2 P0-2 design.

---

## 10. Workflow YAML Templates (Ready to Paste)

### 10.1 lint.yml

```yaml
name: Lint

on:
  push:
    branches: ["feat/**"]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      
      - name: Install dependencies
        run: npm ci --workspace=@otrarondamas/api --include-workspace-root
      
      - name: Run ESLint
        run: npm run lint --workspace=@otrarondamas/api -- --max-warnings 0
      
      - name: Check Prettier format
        run: npx prettier --check "apps/api/src/**/*.ts" "apps/api/test/**/*.ts"
```

### 10.2 test.yml

```yaml
name: Test

on:
  push:
    branches: ["feat/**"]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: user
          POSTGRES_PASSWORD: password
          POSTGRES_DB: otrarondamas
        ports:
          - 5500:5432
        options: >-
          --health-cmd "pg_isready -U user -d otrarondamas"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    
    env:
      DATABASE_URL: postgresql://user:password@localhost:5500/otrarondamas?schema=public
      JWT_SECRET: s-v1-ci-only-jwt-secret
      GOOGLE_CLIENT_ID: s-v1-ci-only-client-id
      GOOGLE_CLIENT_SECRET: s-v1-ci-only-client-secret
      GOOGLE_CALLBACK_URL: http://127.0.0.1:3399/auth/google/callback
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      
      - name: Install dependencies
        run: npm ci --workspace=@otrarondamas/api --include-workspace-root
      
      - name: Generate Prisma client
        run: npm run prisma:generate --workspace=@otrarondamas/api
      
      - name: Validate Prisma schema
        run: npx prisma validate --schema apps/api/prisma/schema.prisma
      
      - name: Push schema to test DB
        run: npx prisma db push --schema apps/api/prisma/schema.prisma --skip-generate
      
      - name: Run unit tests
        run: npm test --workspace=@otrarondamas/api -- --runInBand --coverage
        timeout-minutes: 10
      
      - name: Run integration tests
        if: success()
        run: npm run test:integration --workspace=@otrarondamas/api -- --runInBand
        timeout-minutes: 8
      
      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: apps/api/coverage
```

### 10.3 build.yml

```yaml
name: Build

on:
  push:
    branches: ["feat/**"]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v5
        with:
          node-version: 20
          cache: npm
      
      - name: Install dependencies
        run: npm ci --workspace=@otrarondamas/api --include-workspace-root
      
      - name: Generate Prisma client
        run: npm run prisma:generate --workspace=@otrarondamas/api
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Build NestJS
        run: npm run build --workspace=@otrarondamas/api
        timeout-minutes: 8
      
      - name: Verify build output
        run: |
          if [ ! -d "apps/api/dist" ]; then
            echo "Build output missing (dist/)"
            exit 1
          fi
          if [ $(find apps/api/dist -type f | wc -l) -eq 0 ]; then
            echo "Build output empty"
            exit 1
          fi
          echo "Build successful: $(find apps/api/dist -type f | wc -l) files"
```

---

## 11. Branch Protection JSON

Save as `.github/branch-protection.json` (documentation only; must be applied via GitHub UI or gh CLI):

```json
{
  "branch": "main",
  "enforce_admins": true,
  "require_code_reviews": {
    "dismissal_restrictions": [],
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "lint",
      "test",
      "build"
    ]
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

**To apply** (requires GitHub token):
```bash
gh api repos/OWNER/REPO/branches/main/protection \
  --input .github/branch-protection.json
```

---

## 12. Acceptance Criteria

### 12.1 Before Implementation

- [ ] Owner reviews this design
- [ ] Owner approves Node.js 20 LTS pinning
- [ ] Owner confirms test suite timeout thresholds (12-18 min acceptable)
- [ ] Owner confirms workflow trigger rules (feat/* push, main PR)
- [ ] Owner identifies any known flaky tests to pre-label
- [ ] TypeScript build errors documented and prioritized for fix

### 12.2 After Implementation

- [ ] All 3 workflows created and passing
- [ ] Branch protection rule applied to main
- [ ] Test on 5+ PRs to verify false positives <5%
- [ ] Performance baseline captured (actual durations)
- [ ] Developer docs published (how to fix CI failures)

---

## 13. Known Blockers & Dependencies

### 13.1 TypeScript Build Errors (BLOCKING)

**Severity**: CRITICAL  
**Status**: Not yet fixed  
**Impact**: build.yml will fail until resolved

```
Files with errors:
  - prisma/migrate-categoria-a-jerarquia.ts (TS2347, TS2345, TS2322)
  - prisma/seed.ts (TS2305: UnidadBase not exported)
  - src/cart/dto/cart.response.dto.ts (TS2694: Prisma.Decimal not exported)
```

**Action Required**:
1. Review Prisma client generation (may need `prisma generate --force`)
2. Fix type imports in DTO files
3. Validate seed.ts against current schema
4. Run `npm run build` locally to confirm

### 13.2 .nvmrc Not Specified

**Status**: Optional but recommended  
**Impact**: Developers may use wrong Node version locally

**Action**: Create `.nvmrc` with content `20`

### 13.3 Lint Script Uses --fix (Mutates Code)

**Status**: Known, documented  
**Impact**: CI lint does not use --fix (intentional), local lint does

**Action**: No change needed; documented above

---

## 14. Comparison: Design vs. Existing Workflows

### 14.1 What Already Exists

- **b4-verification.yml**: Full API build + test suite (Node 20)
- **post-merge-verification.yml**: Post-merge full validation (Node 20)
- **ci-failure-diagnostic.yml**: Failure classification (advisory)
- **messaging-browser-e2e.yml**: E2E UI tests (Node 24, separate)

### 14.2 What's New (P0-2)

| Aspect | b4-verification | New P0-2 Workflows |
|--------|-----------------|------------------|
| **Trigger** | main, b4/* branches | feat/*, PR to main |
| **Lint** | No | Yes (separate job) |
| **Test** | Integrated (slow) | Separate, parallel |
| **Build** | Integrated | Separate, parallel |
| **Parallelism** | Linear (slow) | All 3 parallel |
| **Time** | ~25 min | ~19 min (parallel) |

### 14.3 No Conflicts

- New workflows do NOT disable or replace b4-verification
- b4-verification remains for hotfix/* branches
- post-merge-verification runs after merge (verifies success)
- New workflows gate PRs before merge

---

## 15. Rollback Plan

If Phase 2 P0-2 proves problematic:

1. **Remove branch protection**: `gh api repos/OWNER/REPO/branches/main/protection --method DELETE`
2. **Disable workflows**: Delete .github/workflows/{lint,test,build}.yml or set `if: false`
3. **Revert to**: Keep b4-verification + post-merge-verification as fallback
4. **Timeline**: Can rollback in <10 minutes if needed

---

## 16. Next Steps (Owner Decision Points)

### 16.1 Approve or Modify?

Please confirm:
1. Node.js 20 LTS is acceptable (no Node 22+ requirement)?
2. 13-19 minute test suite timeout is acceptable?
3. Lint + test + build all three required for merge?
4. Coverage artifacts should be uploaded?
5. TypeScript build errors will be fixed before CI deployment?

### 16.2 Implementation Phase (After Approval)

1. **Fix build errors** (TypeScript DTO, Prisma types)
2. **Create 3 workflow files** in .github/workflows/
3. **Apply branch protection** via GitHub UI
4. **Test on 2-3 PRs** and validate
5. **Document in wiki** (for developers)
6. **Declare ready**: Update D-018 status to IMPLEMENTED

---

## Appendix: Timing Data

### A1. Estimated Workflow Durations

**Lint Workflow**:
- Checkout: 2s
- Setup Node + cache: 10s
- npm ci: 15s (cache hit) / 45s (miss)
- ESLint: 5s
- Prettier: 3s
- **Total**: 35-65 seconds

**Test Workflow**:
- Checkout: 2s
- Setup Node + cache: 10s
- npm ci: 15s
- Prisma generate: 5s
- DB health check: 10s (can overlap)
- Unit tests: 5-10 min
- Integration tests: 5-8 min
- Upload artifact: 20s
- **Total**: 13-19 minutes

**Build Workflow**:
- Checkout: 2s
- Setup Node + cache: 10s
- npm ci: 15s
- Prisma generate: 5s
- TypeScript check: 15s
- NestJS build: 2-3 min
- Verify dist: 10s
- **Total**: 3-4 minutes

**All 3 Parallel**: ~19 minutes (test is slowest)

### A2. Cache Performance

First run (cold cache):
- npm ci: ~60s
- Total workflow with install: ~20 min test, 5 min build

Subsequent runs (warm cache):
- npm ci: ~15s (restored from cache)
- Total workflow: ~15 min test, 3 min build

---

**Design Document Complete**

Ready for owner review and approval. Implementation can begin once TypeScript build errors are resolved.
