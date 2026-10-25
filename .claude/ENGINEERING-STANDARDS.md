---
name: engineering_standards
description: "Global engineering standards and principles for Otra Ronda Más / Wapsell software factory"
version: 1.0
audience: architects, agents, developers, CI/CD systems
last_updated: 2026-10-25
---

# Engineering Standards: Otra Ronda Más / Wapsell Factory

## Purpose

These standards establish the principles, rules, and quality gates that govern code, infrastructure, and tool automation in the Otra Ronda Más operational ERP and Wapsell platform documentation. They apply to:

- Manual development within Claude Code
- Autonomous agents (architect, ci-recovery, independent-reviewer)
- Future automation and CI/CD systems
- All work on both public (GitHub) and local branches

**Non-goals**: These standards do not prescribe specific frameworks, languages, or design patterns beyond the constraints of existing architecture. They enforce decision boundaries, not solutions.

---

## 1. INSPECT BEFORE IMPLEMENTING

### 1.1 Mandatory Pre-Change Verification

Before any edit, commit, push, merge, deployment, or infrastructure change, verify:

```
1. Git state:
   - Current branch (must match authorized task)
   - HEAD SHA (to link evidence)
   - Upstream sync (local vs. origin)
   - Untracked files and uncommitted changes
   - Conflicts or rebase state

2. Authorization:
   - Is the task in scope for this agent/developer?
   - Which files/modules can be modified?
   - What decisions require escalation?

3. Existing work:
   - Are there preexisting changes to preserve?
   - Are there unmerged PRs or branches to consider?
   - Is there ongoing work in a different agent's domain?

4. Test landscape:
   - Which tests are affected by this change?
   - What coverage already exists?
   - What new coverage is required?
```

**Implementation**: See [Git Safety Rules](./.rules/git-safety.md) and [Test Rules](./.rules/testing.md).

### 1.2 No Speculation

- Never claim a test passed, build succeeded, or security check cleared without running the exact command and capturing exit status.
- Never infer behavior from code without running tests to verify.
- Treat documentation, comments, and README as context only—not as proof of implementation.
- If a feature is claimed in a roadmap, spec, or issue, but tests or CI do not verify it, mark it as unverified.

---

## 2. SOURCE-OF-TRUTH HIERARCHY

### 2.1 What Counts as Evidence

| Rank | Source | Example | Weight |
|------|--------|---------|--------|
| 1 | Executable test, passing | `npm test -- s-v1-06-orders-http` returns 0 | Definitive |
| 2 | CI workflow, result visible | GitHub Actions run #123 shows green | Definitive |
| 3 | Code + tests covering behavior | PR #45 with integration test for isolation | Strong |
| 4 | Database schema + constraints | `schema.prisma` with `@@unique`, `@db.Citext` | Strong |
| 5 | Deployed artifact + logs | Production server heap dump, error trace | Strong |
| 6 | Spec document + decision record | CLAUDE.md, RFD #12, Architecture Decision Record | Moderate |
| 7 | Code comment | // This prevents X from happening | Weak |
| 8 | Verbal claim | "It works in staging" | No weight |

**Rule**: Use the highest-ranking evidence available. If tests say one thing and comments say another, trust tests.

### 2.2 Keep AS-IS, TO-BE, and Unresolved Separate

When documenting a change or design:

```markdown
## Current State (AS-IS)
- Order confirmation accepts concurrent requests without serialization
- Tests SV6-H-10b expect concurrent deduplication (1 stock deduction, 2 responses: [200, 400])
- Implementation uses Prisma READ_COMMITTED isolation

## Target State (TO-BE)
- Order confirmation must serialize concurrent requests at DB level
- No two concurrent requests should both see RECIBIDO state before one transitions to CONFIRMADO
- Test SV6-H-10b must pass with single stock deduction

## Unresolved Decision
- [ ] Is SERIALIZABLE the right isolation level, or do we prefer SELECT FOR UPDATE locks?
- [ ] Should we document this choice in the codebase?
```

Never silently assume an unresolved decision has been made.

---

## 3. MULTI-TENANCY AND SECURITY BOUNDARIES

### 3.1 No Trust in Client-Supplied Context

**Rule**: Authentication provides the source-of-truth for authorization context. Never trust a `companyId`, `userId`, or business identifier sent by the client.

#### 3.1.1 Correct Pattern

```typescript
// ✅ CORRECT: derive context from authenticated principal
async getOrder(@CurrentUser() user: AuthenticatedUser, @Param('orderId') id: string) {
  const db = this.prismaFactory.forCompany(user.empresaId);
  // Now all queries are implicitly scoped to user.empresaId
  const order = await db.pedido.findUnique({ where: { id } });
}
```

#### 3.1.2 Anti-Pattern

```typescript
// ❌ WRONG: accept companyId from request body
async getOrder(
  @CurrentUser() user: AuthenticatedUser,
  @Body('companyId') companyId: string,  // VULNERABLE
  @Param('orderId') id: string
) {
  if (companyId !== user.empresaId) {
    // Too late—the request has already been processed
    throw new ForbiddenException();
  }
}
```

### 3.2 Tenancy Checks at Every Boundary

For each code change that touches data:

| Boundary | Check | Tool/Evidence |
|----------|-------|---|
| API Controller | Is `@CurrentUser()` used? | Grep for `@CurrentUser`, no body-supplied IDs |
| Service Method | Is `companyId` passed from controller/guard? | Code review: signature must include companyId param |
| ORM Query | Is `CompanyScopedPrisma` used? | Grep for `prismaFactory.forCompany(companyId)` |
| Nested Relations | Can a child record escape its parent's company? | Test: create child in company A, verify can't read from company B |
| Test Coverage | Are positive + negative multi-tenant cases tested? | Integration test with 2 companies, assert isolation |

### 3.3 Restricted Patterns

**Never do this** in tenant-sensitive code:

- `raw SQL without WHERE empresa_id = ?` — triggers multi-tenant audit failure
- `findMany() without company filter` — data leakage risk
- `SELECT ... JOIN ... LEFT JOIN` across companies — scope violation
- `return result; if (!result) throw` — leaks existence

---

## 4. DATABASE INTEGRITY AND SCHEMA SAFETY

### 4.1 No Unvetted Schema Changes

Before modifying schema or migrations:

1. Verify the change is **in scope** for this task.
2. Check **backward compatibility** — what happens to old code reading the new schema?
3. Plan **rollback strategy** — how do we undo this if deployment fails?
4. Test with **realistic data volume** — does the migration timeout on production data?
5. Verify **constraints and indices** — will unique checks or foreign keys cause issues?

**Decision gate**: Schema changes require architect approval (see [Architect Agent](./.agents/architect.md)).

### 4.2 Migration Deployment Order

Prisma migrations run in order. If you add two migrations:

```
0001_add_column.sql
0002_add_index.sql
```

The system **will not** validate they're compatible. You must:

- Ensure 0001 is backward-compatible with deployed code
- Ensure code can handle the intermediate state (column exists, index doesn't yet)
- Test rollback: what happens if 0001 succeeds but 0002 fails?

---

## 5. TESTING STRATEGY

### 5.1 Test Selection by Risk Level

Choose tests based on the **blast radius** of your change:

| Change Type | Unit | Integration | Tenant | E2E | Build+Lint |
|-------------|------|-------------|--------|-----|-----------|
| Single function logic | ✅ | — | — | — | ✅ |
| Service boundary | ✅ | ✅ | — | — | ✅ |
| API endpoint | ✅ | ✅ | ✅ | — | ✅ |
| Auth/authorization | ✅ | ✅ | ✅ | ✅ | ✅ |
| Database schema | — | ✅ | ✅ | ⚠️ | ✅ |
| Deployment/infra | — | — | ⚠️ | ✅ | ⚠️ |

**Minimum rule**:
- Every API endpoint change must have passing integration + tenant isolation test
- Every permission change must have positive AND negative test
- Every data access change must have tenant isolation test

### 5.2 Test Execution Evidence

Valid evidence that tests pass:

```bash
✅ npm test -- s-v1-06-orders-http.integration-spec.ts --testNamePattern="SV6-H-10b"
   Output: PASS (1 suite, 1 test)
   Exit: 0

✅ gh run view <RUN_ID> --log | grep "Tests: .* passed"
   GitHub Actions run completed with green checkmark

❌ "I ran the tests locally" (no command, no output)
❌ "The build should pass because the code is correct" (no execution)
❌ "I didn't break anything" (no evidence)
```

**Never**:
- Weaken test assertions to make tests pass
- Skip or mark tests as `xdescribe` / `skip` to hide failures
- Remove tests to make CI green
- Claim tests pass without running them

---

## 6. GIT SAFETY PROTOCOL

### 6.1 Forbidden Operations (Blocked Unless Explicitly Authorized)

These operations destroy work, rewrite history, or bypass protections. **Only execute if the task explicitly authorizes them:**

```bash
❌ git reset --hard
❌ git clean -fd
❌ git push --force
❌ git push --force-with-lease
❌ git rebase -i (interactive)
❌ git branch -D (delete with force)
```

**When needed**: Document why, show that alternatives were considered, and get explicit approval from the person whose work is at risk.

### 6.2 Commit Safety Checklist

Before `git commit`:

```bash
# 1. Review what you're about to commit
git status
git diff --cached

# 2. Check for secrets
grep -r "password\|api_key\|secret\|token" <files-to-commit>

# 3. Verify you preserved preexisting changes
git stash list  # Did you stash work from another agent?
git diff HEAD~1  # Does the diff include unintended changes?

# 4. Write a clear message that explains WHY (not WHAT)
```

**Anti-patterns in commit messages**:
- "Fix bug" (which bug? why?)
- "Work in progress" (incomplete work should not be committed)
- "Update tests to pass" (tests should not be weakened)

**Correct format**:
```
fix(orders): use SERIALIZABLE isolation for concurrent confirmation

The order confirmation flow had a race condition where two concurrent
requests could both see the order in RECIBIDO state before either one
updated it to CONFIRMADO, resulting in duplicate stock deductions.

Switched to SERIALIZABLE transaction isolation level. The database now
serializes concurrent transactions at the statement level.
```

### 6.3 Preexisting Changes Must Be Preserved

If you find uncommitted or untracked work:

```bash
# BEFORE you start your task:
git diff HEAD > /tmp/preexisting.patch
git stash -u  # stash uncommitted + untracked

# AFTER you finish your task:
git stash pop
# If conflicts: resolve them manually, don't overwrite either side
```

**Never** delete or reset work you didn't create, even if it seems wrong.

---

## 7. AUTHORIZATION AND APPROVAL GATES

### 7.1 Who Approves What

| Change Type | Approver | Rationale |
|-------------|----------|-----------|
| Feature implementation | Product Owner + Architect | Scope, contract |
| Bug fix | Code Reviewer | Safety, regression risk |
| Security change | Security Lead + Code Reviewer | Threat model, isolation |
| Schema migration | DBA + Architect | Data loss risk, rollback |
| Deployment / release | Release Manager | Blast radius, timing |
| Dependency upgrade | Architect + Security | Compatibility, vulns |
| Documentation change | Technical Lead | Accuracy, coherence |

### 7.2 Blocking Conditions

**Do not merge/deploy if**:

- [ ] Tests are failing
- [ ] Lint/type-check fails
- [ ] Code review is not approved
- [ ] Security audit flags a violation
- [ ] Tenant isolation test fails
- [ ] Schema change lacks rollback plan
- [ ] Secrets are exposed in diff
- [ ] Preexisting work would be lost

---

## 8. CODE QUALITY PRINCIPLES

### 8.1 SOLID Applied Responsibly

| Principle | When It Applies | When It Doesn't |
|-----------|---|---|
| Single Responsibility | Services, controllers, entities | Utility functions, DTOs |
| Open/Closed | Extensible architecture, plugin points | Early-stage experiments |
| Liskov Substitution | Polymorphic class hierarchies | Type-safe enums, ADTs |
| Interface Segregation | API boundaries, service contracts | Internal helper functions |
| Dependency Inversion | Core business logic, persistence | Thin wrappers, adapters |

**Anti-pattern**: Over-engineering a three-line helper to fit SOLID. Favor simplicity over abstraction until the code needs to change.

### 8.2 Avoid Unnecessary Complexity

**Before refactoring**:

1. Is there a test that documents the current behavior?
2. What would break if this refactoring went wrong?
3. Is the refactoring in scope for the current task, or is it scope creep?

**Rule**: Do not refactor code outside the scope of the current task, even if you see an opportunity.

### 8.3 No Silent Error Handling

**Anti-pattern**:
```typescript
try {
  const result = riskyOperation();
  return result;
} catch (e) {
  return null;  // ❌ silence the error
}
```

**Correct**:
- If `null` is a valid return, document it and handle it at the call site.
- If `null` hides an error, log it and re-throw or fail fast.
- If you don't know what to do, let the error propagate.

---

## 9. DOCUMENTATION AND DECISION RECORDS

### 9.1 What to Document

**Document these decisions**:
- Why we chose SERIALIZABLE isolation over SELECT FOR UPDATE locks (trade-off analysis)
- Why a feature is Phase 4 instead of Phase 1 (dependency or priority)
- Why a test was removed (if it was)
- Why a migration needs rollback strategy (risk)

**Document these facts**:
- Current API contract (controller, DTO, auth required?)
- Database schema constraints (unique, foreign key, check)
- Test coverage (what's tested, what's not)
- Known limitations (what doesn't work yet, why)

**Don't document**:
- What the code does (code is the documentation)
- Step-by-step git commands (that's in procedures, not design docs)
- Completed tasks (that's in commit messages and PR descriptions)

### 9.2 Decision Record Format

When a decision matters and may be revisited:

```markdown
## Decision: Order Confirmation Isolation Level

**Context**: Concurrent requests to confirm the same order could both deduct stock.

**Options Considered**:
1. SELECT FOR UPDATE (pessimistic lock) — requires raw SQL, bypasses multi-tenant extension
2. SERIALIZABLE isolation (database-level serialization) — standard SQL, works with Prisma
3. Application-level queue (serialize in code) — adds complexity, tight coupling

**Decision**: Use SERIALIZABLE isolation (option 2).

**Rationale**:
- Preserves multi-tenant extension (no raw SQL bypass)
- Standard SQL feature available in PostgreSQL and SQLite
- Transparent to application code (just a transaction parameter)
- Tested by existing test SV6-H-10b

**Trade-off**: Potential performance cost if many concurrent orders. Monitor latency.

**Reversal Condition**: If latency exceeds threshold, revisit and implement option 1 with care.
```

---

## 10. FINAL DELIVERY CHECKLIST

Before declaring a task complete, provide:

### 10.1 Objective & Scope

```
What was the task?
- Fix race condition in order confirmation under concurrent requests
- Make test SV6-H-10b pass (concurrent confirmations only deduct stock once)

What was NOT in scope?
- UI changes
- Migration of old orders to new isolation level
- Performance optimization (if it turns out to be needed)
```

### 10.2 Files Changed

```
apps/api/src/orders/orders.service.ts
  - Added: import { Prisma } from '@prisma/client'
  - Changed: confirmOrder() to use SERIALIZABLE isolation
  - Removed: SELECT FOR UPDATE attempt (line 93-97, reverted)

Result: 3 commits with clear messages
```

### 10.3 Tests Run

```
✅ npm test -- s-v1-06-orders-http.integration-spec.ts
   280 tests pass, 0 fail
   SV6-H-10b specifically: PASS (concurrent confirmations → [200, 400], 1 stock deduction)

✅ npm run build
   Build succeeds, no TypeScript errors

✅ npm run lint
   No lint violations
```

### 10.4 Decisions Made

```
- SERIALIZABLE isolation chosen over SELECT FOR UPDATE (preserves multi-tenant extension)
- Removed untracked DTO imports (cart.response.dto, order.response.dto)
  → Controllers now return raw service responses instead of DTO transforms
```

### 10.5 Blockers & Risks

```
None currently. The race condition is fixed.

Future risk: If SERIALIZABLE causes measurable latency spike (>50ms p99),
we may need to revisit with SELECT FOR UPDATE + security review of raw SQL.
```

### 10.6 Next Step

```
Merge PR #61 to main when CI fully passes (currently awaiting final build artifacts).
```

---

## 11. RULE HIERARCHY AND PRECEDENCE

If rules conflict, apply in this order:

1. **Safety rules** (preserve work, don't lose data, no secrets)
2. **Security rules** (multi-tenant isolation, authorization)
3. **Testing rules** (no weakened tests, no silent failures)
4. **Quality rules** (SOLID, simplicity, clarity)
5. **Convenience rules** (preferred tools, style)

**Example**: If a security rule and a convenience rule conflict, the security rule wins.

---

## 12. CONTINUOUS IMPROVEMENT

This document is version 1.0. As the factory matures:

- Add more detailed skill procedures (ci-failure-triage, sdd-workflow, etc.)
- Document patterns that emerge from successful delivery
- Update rules based on lessons learned
- Archive or sunset rules that no longer apply

**Review cycle**: Quarterly, or when blocked by a missing rule.

---

## References

- [CLAUDE.md](../CLAUDE.md) — Overarching project governance
- [Git Safety Rules](./.rules/git-safety.md) — Detailed Git protection procedures
- [Security Rules](./.rules/security.md) — Tenancy, authorization, secrets
- [Testing Rules](./.rules/testing.md) — Test strategy and coverage
- [Architect Agent](./.agents/architect.md) — Design evaluation
- [CI Recovery Agent](./.agents/ci-recovery.md) — Build diagnosis
- [Independent Reviewer Agent](./.agents/independent-reviewer.md) — Code review
