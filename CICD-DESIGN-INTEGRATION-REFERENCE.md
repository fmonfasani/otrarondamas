# CI/CD Design P0-2 — Integration Reference

**Purpose**: Map P0-2 workflows to existing infrastructure, identify conflicts, dependencies, and integration points.

---

## Current Workflow Inventory

### 1. b3-tenant-isolation-candidate.yml
**Trigger**: Push to b3/*, PR to main  
**Purpose**: Verify multi-tenant isolation (security gate)  
**Status**: Active (candidate for main merge)  
**Duration**: ~15-20 minutes  
**Node**: 20  

**Integration with P0-2**: None (different branch prefix). P0-2 lint/test/build are orthogonal.

### 2. b4-verification.yml
**Trigger**: Push to main, b4/*, PR to main  
**Purpose**: Full API verification (build + unit + integration tests)  
**Status**: Active (main gate)  
**Duration**: ~25-30 minutes  
**Node**: 20  

**Integration with P0-2**: 
- **Overlap**: Both run Jest unit + integration tests, build
- **Difference**: b4 runs on main/b4/* (post-merge or hotfix), P0-2 runs on feat/* (pre-merge)
- **No conflict**: Different branches, different timing
- **Coordination**: b4 will be slower (25-30 min) than P0-2 parallel (19 min) but both serve same QA purpose

### 3. post-merge-verification.yml
**Trigger**: After PR merged (pull_request closed event)  
**Purpose**: Verify code still works after merge  
**Status**: Active (post-merge gate)  
**Duration**: ~15-20 minutes  
**Node**: 20  

**Integration with P0-2**:
- **Timing**: Runs AFTER merge (P0-2 prevents bad merges BEFORE)
- **Redundancy**: Post-merge-verification is a safety net; P0-2 is prevention
- **Keep both**: post-merge verifies b4-verification + lint + test changes don't regress on main
- **No change**: Keep as-is

### 4. messaging-browser-e2e.yml
**Trigger**: Push to main, messaging/*, PR to main  
**Purpose**: Messaging UI E2E tests (Playwright)  
**Status**: Active (separate concern)  
**Duration**: ~10-15 minutes  
**Node**: 24 (different from API 20)  

**Integration with P0-2**: None (UI tests, different Node version). No conflict.

### 5. ci-failure-diagnostic.yml
**Trigger**: Workflow failure in b3/b4/post-merge (observer pattern)  
**Purpose**: Automatic failure classification and remediation hints  
**Status**: Active (advisory, not gate)  
**Duration**: ~5 minutes  
**Node**: n/a (bash script, no Node dependency)  

**Integration with P0-2**:
- **Opportunity**: When P0-2 workflows fail, ci-failure-diagnostic can analyze
- **Enhancement**: Consider adding lint/test/build to workflow_run trigger list (future)
- **No conflict**: Purely advisory

### 6. wapsell-event-orchestrator.yml
**Trigger**: Manual dispatch, scheduled  
**Purpose**: Wapsell infrastructure orchestration  
**Status**: Active (maintenance/setup tool)  
**Duration**: Variable  
**Node**: 20 (mostly)  

**Integration with P0-2**: None (different purpose). No conflict.

### 7. wapsell-issue-autodev.yml
**Trigger**: GitHub Issues (issue_comment, issues)  
**Purpose**: Auto-open PRs/branches from issue templates  
**Status**: Active (developer experience tool)  
**Duration**: Variable  
**Node**: 20  

**Integration with P0-2**: None (orthogonal). No conflict.

---

## Proposed Workflow Execution Timeline

### Scenario 1: Developer Opens PR on feat/cart-fix

```
[Developer pushes feat/cart-fix]
         ↓
   GitHub detects push to feat/**
         ↓
[P0-2 workflows trigger]
   ├─ lint.yml starts
   ├─ test.yml starts  
   └─ build.yml starts
         ↓
   [All 3 run in parallel, ~19 minutes]
         ↓
[PR opened, targeting main]
         ↓
[GitHub requires branch protection status]
   Lint: PASS ✓
   Test: PASS ✓
   Build: PASS ✓
   Reviews: 0 of 1
         ↓
[Developer requests review]
         ↓
[Reviewer approves]
         ↓
[Merge button enabled (all 4 criteria met)]
         ↓
[Contributor squashes and merges to main]
         ↓
[post-merge-verification.yml auto-triggers]
   - Runs full E2E regression (15-20 min)
   - Re-validates build, unit, integration on main
         ↓
[If post-merge passes: main is green]
[If post-merge fails: issue created, bisect needed]
```

### Scenario 2: Hotfix on main (Emergency)

```
[Emergency bug discovered]
         ↓
[Create hotfix/critical-bug branch]
         ↓
[Push to hotfix/**]
         ↓
[P0-2 workflows trigger (feat/** also matches hotfix/*)]
   - Lint, Test, Build all run
         ↓
[OR: Apply branch protection exception for hotfix]
   - Merge directly if approved (admin override)
   - post-merge-verification validates immediately
```

**Note**: Hotfix workflow not fully specified yet; worth documenting.

### Scenario 3: TypeScript Error in feat/* (Legitimate Failure)

```
[Developer pushes feat/new-feature with DTO bug]
         ↓
[P0-2 workflows trigger]
         ↓
[build.yml fails: TS2345 type error]
         ↓
[PR shows: "Build — FAILING" + error log]
         ↓
[Developer reviews error, fixes locally]
         ↓
[Developer commits and pushes to feat/new-feature]
         ↓
[build.yml re-triggers automatically]
         ↓
[Retry passes ✓]
         ↓
[Merge enabled once 1 review + all 3 workflows PASS]
```

### Scenario 4: Flaky Test False Positive

```
[Developer has clean code, no intentional changes to tests]
         ↓
[test.yml runs, C5B cart test flakes randomly]
         ↓
[PR shows: "Test — FAILING" + 1 failed test]
         ↓
[Developer runs test locally, reproduces intermittently]
         ↓
[Developer labels test as "flaky" (future: skip with @skip.flaky)]
         ↓
[Developer retries workflow via GitHub Actions button]
         ↓
[test.yml re-runs, test passes this time ✓]
         ↓
[Merge enabled]
         ↓
[Note: Flaky test should be reported for root cause analysis]
```

---

## No-Conflict Matrix

| Existing | P0-2 Lint | P0-2 Test | P0-2 Build | Conflict? |
|----------|-----------|-----------|------------|-----------|
| b3-isolation | No | No | No | ❌ No |
| b4-verification | No | No | No | ❌ No |
| post-merge | No | No | No | ❌ No |
| messaging-e2e | No | No | No | ❌ No |
| failure-diagnostic | No | No (but can enhance) | No | ❌ No |
| event-orchestrator | No | No | No | ❌ No |
| issue-autodev | No | No | No | ❌ No |

**Conclusion**: No conflicts detected. P0-2 workflows can coexist safely.

---

## GitHub Actions Trigger Precision

### Existing Setup

- **b4-verification**: `on: {push: [main, b4/**], pull_request: [main]}`
- **post-merge**: `on: {pull_request: {types: [closed]}}`

### New P0-2 Setup

- **lint.yml**: `on: {push: [feat/**], pull_request: [main]}`
- **test.yml**: `on: {push: [feat/**], pull_request: [main]}`
- **build.yml**: `on: {push: [feat/**], pull_request: [main]}`

### Why No Conflict?

1. **Push triggers**:
   - Pushes to `feat/**` → Only P0-2 workflows trigger (lint/test/build)
   - Pushes to `main` → Only b4 triggers (post-merge also triggers on merge)
   - Pushes to `b3/**`, `b4/**` → Only b3/b4 workflows trigger

2. **PR triggers**:
   - PR opened/updated (targeting main) → P0-2 workflows trigger
   - PR closed (merged) → post-merge triggers
   - `pull_request_target` not used in P0-2 (safe)

3. **Timing**:
   - P0-2 runs BEFORE merge (gate)
   - b4 runs AFTER merge to main (verification)
   - post-merge runs AFTER merge (regression check)
   - No resource contention (different stages)

---

## Node.js Version Consistency

### Current Ecosystem

```
Node 20 (LTS):
  - b4-verification ✓
  - post-merge-verification ✓
  - wapsell-event-orchestrator ✓
  - wapsell-issue-autodev ✓
  - P0-2 lint/test/build ✓

Node 24:
  - messaging-browser-e2e (E2E only, separate concern)
```

### P0-2 Decision: Pin to 20 LTS

**Benefit**: Consistency across API CI/CD gates (lint, test, build).  
**No impact**: Messaging E2E remains on 24 (orthogonal).  
**Future**: If Node 22 needed, upgrade all 5 workflows together.

---

## Secrets & Environment Variables

### Current CI Secrets (b4, post-merge)

```
DATABASE_URL: postgresql://user:password@localhost:5500/otrarondamas
JWT_SECRET: s-v1-ci-only-jwt-secret
GOOGLE_CLIENT_ID: s-v1-ci-only-client-id
GOOGLE_CLIENT_SECRET: s-v1-ci-only-client-secret
GOOGLE_CALLBACK_URL: http://127.0.0.1:3399/auth/google/callback
```

### P0-2 Design

Same secrets (already in b4/post-merge). No new secrets needed.

**Safety**: All secrets are CI-only dummies (not production). ✓

---

## Caching Alignment

### Current Strategy (Inferred)

```yaml
actions/setup-node@v5:
  cache: npm
```

Both b4 and post-merge use this. Cache restored from `package-lock.json` hash.

### P0-2 Alignment

Same strategy. Reuses GitHub Actions npm cache.

**Benefit**: Warm cache on first run saves ~45-60s per workflow.

---

## Error Handling Collaboration

### ci-failure-diagnostic.yml (Current)

Triggers on failure of: b3, b4, post-merge  
Classifies failures: build_error, test_failure, db_service, timeout, lint_error

### P0-2 Opportunity (Future Enhancement)

Consider adding P0-2 workflows to ci-failure-diagnostic trigger list:

```yaml
on:
  workflow_run:
    workflows:
      - Lint
      - Test
      - Build
      - B3 Tenant Isolation Candidate
      - B4 Verification Infrastructure
      - Post-Merge Verification
    types: [completed]
```

This would auto-analyze P0-2 failures with remediation hints (not in scope for Phase 2 P0-2, but noted for future).

---

## Branch Protection Interplay

### Current State (From audit)

- **main**: No branch protection (D-018 issue: gates are advisory)
- **b4/**, **b3/**: No protection (developer branches)

### P0-2 Deployment

Branch protection applied to main:
```
Required status checks:
  - lint
  - test
  - build

Require 1 approval
Dismiss stale reviews (optional)
Require branches to be up-to-date (strict)
No force push (even admins)
```

### Impact

- ✅ PR flow unchanged (1 review + 3 green gates)
- ✅ Post-merge still works (b4 + post-merge run after merge)
- ✅ Hotfixes require temporary exception (document process)

---

## Communication Plan (Implementation Phase)

### 1. Workflow Deployment (Day 1-2)
- Copy 3 YAML files to .github/workflows/
- Test on 2 dummy PRs (lint/test/build only, no merge)

### 2. Branch Protection Activation (Day 2)
- Apply via GitHub UI (Settings → Branches → Add Rule)
- Announce in team Slack

### 3. Documentation (Day 3)
- Add troubleshooting guide to wiki:
  - "How to fix ESLint error"
  - "How to debug test failure"
  - "Why is build failing?"
  - "How to retry a workflow"

### 4. First Merge (Day 3)
- Walk through end-to-end: PR → lint/test/build PASS → review → merge
- Post-merge verification completes successfully

### 5. Lessons Learned (Day 5)
- Collect timing data (actual vs. estimates)
- Adjust timeouts if needed
- Document any false positives encountered

---

## Appendix: Workflow File Cross-Reference

### Files Inspected for This Design

```
.github/workflows/
  ├─ b3-tenant-isolation-candidate.yml (cross-reference)
  ├─ b4-verification.yml (cross-reference)
  ├─ ci-failure-diagnostic.yml (cross-reference)
  ├─ messaging-browser-e2e.yml (cross-reference)
  ├─ post-merge-verification.yml (cross-reference)
  ├─ wapsell-event-orchestrator.yml (cross-reference)
  └─ wapsell-issue-autodev.yml (cross-reference)

New files (to be created after approval):
  ├─ lint.yml (P0-2)
  ├─ test.yml (P0-2)
  └─ build.yml (P0-2)

Config files inspected:
  ├─ .eslintrc.js
  ├─ .prettierrc.json
  ├─ package.json (root)
  ├─ apps/api/package.json
  ├─ apps/api/tsconfig.json
  └─ .github/branch-protection.json (to be created)
```

---

## Decision Summary

### P0-2 Design Integrity

1. **No conflicting triggers**: P0-2 uses feat/** (new), existing workflows use main/b*/msg/* (existing)
2. **No duplicate work**: P0-2 runs pre-merge (gate), b4/post-merge run post-merge (verification)
3. **Complementary gating**: P0-2 prevents bad merges, post-merge catches regressions
4. **Shared resources**: npm cache, Node 20 LTS, same CI creds (harmless)
5. **Enhancement opportunity**: ci-failure-diagnostic can expand to include P0-2 workflows (future)

**Verdict**: ✅ Safe to deploy after TypeScript build errors fixed.

---

**Document Complete**

Integration analysis shows P0-2 workflows fit cleanly into existing CI/CD ecosystem with no conflicts or duplications. Ready for implementation once owner approval obtained.
