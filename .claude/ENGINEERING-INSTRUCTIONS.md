---
name: engineering_instructions
description: Master engineering instructions for Claude Code, autonomous agents, and software factory automation
version: 1.1
audience: Claude Code, architect agent, ci-recovery agent, independent-reviewer, future automation
last_updated: 2026-10-25
---

# Engineering Instructions: Global Governance & Automation

## Overview

These instructions establish **binding behavior** for Claude Code, all autonomous agents, and future software factory automation working on Otra Ronda Más / Wapsell.

They complement and enforce:
- [CLAUDE.md](../CLAUDE.md) — Project governance and source-of-truth rules
- [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md) — Quality principles and verification practices
- [.claude/rules/](./rules/) — Specific safety, security, testing, and documentation rules
- [.claude/agents/](./agents/) — Agent-specific workflows and constraints
- [.claude/skills/](./skills/) — Repeatable procedures for common tasks

**Key principle**: This is governance that enforces correctness and safety, not convenience. Rules are not suggestions; they block unsafe actions.

---

## 1. UNIVERSAL PRE-ACTION CHECKLIST

**EVERY task, commit, push, test run, merge, or deployment must begin with this verification:**

### 1.1 Git State Inspection

```bash
# Execute in working tree before ANY other action
git status --short --branch
git rev-parse HEAD
git rev-parse --abbrev-ref HEAD
git log --oneline -3
```

**Verify**:
- ✅ You are on the correct branch for this task
- ✅ HEAD SHA matches authorized checkpoint (if specified)
- ✅ No unresolved conflicts or rebase state
- ✅ Preexisting changes are documented (if any)

**Blocker**: If any item fails, STOP and report. Do not proceed until state is known and authorized.

### 1.2 Authorization Verification

Before editing, committing, pushing, merging, or running infrastructure commands, establish:

| Question | Evidence | Action if Unknown |
|----------|----------|-------------------|
| Is this task explicitly authorized? | Task description, PR, issue | Report scope; ask for clarification |
| Which files/modules can I modify? | Scope statement in task | Restrict to explicit list only |
| What are the acceptance criteria? | Test names, behavior requirements | Define with architect before starting |
| Do I have permission to commit/push? | CLAUDE.md section "Safety and authorization" | Request authorization before attempting |
| Is this a destructive operation? | git reset, clean, force-push, branch deletion, etc. | BLOCKED unless task explicitly authorizes |

**Blocker**: If authorization is unclear, do not guess. Report and wait.

### 1.3 Existing Work Preservation

```bash
# Before starting a task, check for existing changes
git status --porcelain | grep -E "^ M|^\\?\\?"
git diff HEAD  # Show uncommitted changes

# If preexisting work exists and is not yours:
git diff HEAD > /tmp/preexisting-$(date +%s).patch
git stash -u  # Save it safely
```

**Rule**: Never delete, reset, overwrite, or clean work you did not create.

If you encounter preexisting changes:
1. Inspect what they are
2. Preserve them (stash, move aside, or commit separately)
3. Work on your task in a clean state
4. Restore preexisting changes when done

**Blocker**: If you cannot safely preserve preexisting work, report and request guidance.

---

## 2. AUTHORIZATION AND APPROVAL GATES

### 2.1 Who Approves What

| Change Type | Approver | Evidence Required |
|---|---|---|
| Bug fix in existing feature | Code reviewer | Test passing, regression risk assessed |
| New feature / API | Product owner + Architect | Scope, contract, acceptance criteria signed off |
| Security change / permission | Security lead + Code reviewer | Threat model, test coverage, tenant isolation verified |
| Database schema / migration | Database lead + Architect | Rollback plan, backward compatibility, data safety |
| Dependency upgrade | Architect + Security | No known vulns, compatibility tested, licensing OK |
| CI/CD configuration | DevOps + Architect | Blast radius understood, no secrets exposed |
| Documentation (governance) | Technical lead | Accuracy, consistency with code, no conflicting instructions |

### 2.2 Blocking Conditions

**DO NOT COMMIT, PUSH, MERGE, or DEPLOY if ANY of these are true**:

- [ ] Tests are failing (unit, integration, e2e, tenant isolation, security)
- [ ] Lint or type-check fails
- [ ] Code review is not approved
- [ ] Security audit flags a violation (especially multi-tenant isolation)
- [ ] Required approver has not signed off
- [ ] Secrets or credentials are exposed in diff
- [ ] Preexisting work would be lost or overwritten
- [ ] Database migration lacks rollback plan
- [ ] Schema change breaks backward compatibility
- [ ] Feature is partially implemented (incomplete scope)

**Rule**: If a blocking condition exists, the ONLY action is to:
1. Report the condition with evidence
2. Fix the condition (if authorized)
3. Re-verify before proceeding

Never weaken tests, skip checks, or bypass gates to work around blocking conditions.

---

## 3. TASK INITIALIZATION TEMPLATE

When starting a new task, **use this template to establish context**:

```markdown
## Task: [Title from issue/request]

**Branch**: [feat/fix/hotfix/...] from [base branch]  
**Authorized by**: [Person/PR/issue]  
**Approval gate**: [architect/product/security/none]  

### Scope
- What must be done: [explicit list]
- What is explicitly OUT of scope: [explicit list]
- Acceptance criteria: [testable conditions]

### Verification Plan
- Tests to run: [jest patterns, integration suite names]
- Security checks: [tenant isolation, authorization, secrets]
- Files affected: [list or pattern]

### Blockers or Decisions Required
- [ ] Decision 1: [What needs approval before coding?]
- [ ] Decision 2: [...]

### Pre-action checklist
- [ ] Git state verified (no conflicts, correct branch)
- [ ] Preexisting changes preserved (if any)
- [ ] Authorization confirmed for all files/operations
- [ ] Acceptance criteria understood and measurable
```

**Mandatory**: Do not skip this even for small tasks. It surfaces misunderstandings before work starts.

---

## 4. CODE CHANGE PROTOCOL

### 4.1 Before Editing

1. **Inspect the existing code path**
   - Read the controller → service → persistence layer (or equivalents)
   - Check existing tests for the module
   - Review any related security or multi-tenant boundaries

2. **Identify affected tests**
   - Which tests will fail if I break this code?
   - Which new tests must pass after my change?
   - Are there tenant isolation or authorization tests?

3. **Plan the minimal change**
   - Which files must change?
   - What is the narrowest edit that satisfies acceptance criteria?
   - What existing code can I reuse?

4. **Document the decision**
   - Why this approach (not alternatives)?
   - What trade-offs are being made?
   - If this is a contract change, flag it for architect review

### 4.2 While Editing

**Anti-patterns** (never do these):

```typescript
// ❌ Weaken assertions to pass tests
// OLD: expect(orders).toHaveLength(1);
// NEW: expect(orders.length).toBeGreaterThan(0);  // WRONG

// ❌ Silence errors
try { riskyThing(); } catch(e) { }  // No logging, no rethrow

// ❌ Skip multi-tenant scoping
const data = db.order.findMany();  // Missing WHERE empresa_id = ?

// ❌ Trust client-supplied IDs for authorization
const company = await db.company.findUnique({ 
  where: { id: req.body.companyId }  // VULNERABLE
});

// ❌ Return sensitive data unnecessarily
return { ...order, encryptionKey, apiToken };  // Exposes secrets

// ❌ Modify code outside the scope
// Task: "Fix order confirmation race condition"
// But also: Refactor the entire OrderService (scope creep)
```

**Correct patterns**:

```typescript
// ✅ Derive tenant context from authentication
async getOrder(@CurrentUser() user, @Param('orderId') id) {
  const db = this.prismaFactory.forCompany(user.empresaId);
  return db.pedido.findUnique({ where: { id } });
}

// ✅ Log errors but handle appropriately
try {
  const result = riskyThing();
} catch (e) {
  this.logger.error('Operation failed', e);
  throw new InternalServerErrorException();
}

// ✅ Preserve test data and assertions
expect(result).toEqual({ 
  confirmationCount: 1,
  stockDeduction: 1 
});
```

### 4.3 After Editing

**Verification checklist**:

```bash
# 1. Review your changes
git diff --cached

# 2. Check for secrets
grep -r "password\|api_key\|secret\|token" <edited-files>
grep -r "encryptionKey\|privateKey" <edited-files>

# 3. Run affected tests locally
npm test -- <test-pattern>  # See TESTING rules for patterns

# 4. Run lint and type-check
npm run lint
npm run build

# 5. Verify preexisting changes are still intact
git stash list  # Any stashed work that needs restoring?
```

---

## 5. TESTING REQUIREMENTS BY CHANGE TYPE

### 5.1 Minimum Test Coverage

| Change | Unit | Integration | Tenant | E2E | Build+Lint |
|--------|------|-------------|--------|-----|-----------|
| Single function logic | ✅ REQUIRED | — | — | — | ✅ REQUIRED |
| Service method | ✅ REQUIRED | ✅ REQUIRED | — | — | ✅ REQUIRED |
| API endpoint | ✅ REQUIRED | ✅ REQUIRED | ✅ REQUIRED* | — | ✅ REQUIRED |
| Authentication flow | ✅ REQUIRED | ✅ REQUIRED | ✅ REQUIRED* | ✅ REQUIRED* | ✅ REQUIRED |
| Permission/authorization | ✅ REQUIRED | ✅ REQUIRED | ✅ REQUIRED* | ✅ REQUIRED* | ✅ REQUIRED |
| Database schema | — | ✅ REQUIRED | ✅ REQUIRED* | ⚠️ CASE | ✅ REQUIRED |

*\* = Include both positive test (authorized access works) AND negative test (unauthorized access fails)*

### 5.2 Test Execution Evidence

You must provide **actual command output** showing test results. Examples:

**✅ VALID**:
```
$ npm test -- s-v1-06-orders-http --testNamePattern="concurrent"
 PASS  apps/api/test/integration/s-v1-06-orders-http.integration-spec.ts
  Order confirmation
    ✓ concurrent requests serialize at DB level (250ms)
Tests:       1 passed, 0 failed
Exit status: 0
```

**❌ INVALID**:
```
"I ran the tests and they passed"  // No output, no command
"The code looks correct so tests should pass"  // No execution
"Build should work because I didn't change anything"  // No verification
```

**Rule**: Never claim tests passed without showing the command and exit code.

---

## 6. MULTI-TENANT ISOLATION VERIFICATION

**Every change touching user data, orders, inventory, or financial data must verify tenant isolation.**

### 6.1 Isolation Verification Checklist

| Layer | Verification | Tool/Evidence |
|-------|---|---|
| Authentication | Is `@CurrentUser()` / JWT payload / session used? | Grep: `@CurrentUser`, `getAuthedUser()`, `req.user` |
| Controller → Service | Is company context passed (not body-supplied)? | Code review: method signature has `companyId` or `user` param |
| Service → Database | Is `CompanyScopedPrisma` or equivalent used? | Grep: `prismaFactory.forCompany(companyId)`, `prisma.company(user)` |
| Query result | Are results filtered by company? | Review WHERE/JOIN clauses, aggregation queries |
| Nested resources | Can a child escape parent's company? | Integration test: 2 companies, 2 children, verify isolation |
| Test coverage | Are there positive + negative multi-tenant tests? | Find test: `test('denies access to other company's data')` |

### 6.2 Red Flags (Automatic Rejection)

These patterns automatically trigger security audit:

```typescript
// ❌ Raw SQL without company filter
await db.$queryRaw`SELECT * FROM orders WHERE id = ${id}`;

// ❌ findMany() without company context
await db.pedido.findMany({ where: { ... } });  // Missing empresa_id

// ❌ JOIN across companies
await db.pedido.findUnique({
  include: { items: true, supplier: true }  // What if supplier is from different company?
});

// ❌ Return success/failure that leaks existence
const order = await db.pedido.findUnique({ ... });
if (!order) return 404;  // Attacker learns order doesn't exist in this company
// Correct: Always return 404 whether order doesn't exist or company can't access it

// ❌ Admin bypass without explicit authorization
if (user.role === 'ADMIN') {
  // Query without company filter
}
```

**Blocker**: If any red flag exists, isolate fix commits separately. Do not merge without security review.

---

## 7. GIT SAFETY AND COMMIT PROTOCOL

### 7.1 Forbidden Operations (Block Unless Explicitly Authorized)

**NEVER execute these without explicit task authorization AND evidence that it's safe**:

```bash
git reset --hard          # Discards all changes
git clean -fd             # Deletes untracked files  
git checkout .            # Reverts working tree
git restore .             # Reverts changes
git push --force          # Rewrites remote history
git push --force-with-lease  # Even with lease
git branch -D             # Force-deletes branch
git rebase -i             # Interactive rebase
git merge --no-commit     # Partial merges that obscure history
```

**When needed**: 
1. Document why it's necessary
2. Verify no work would be lost (`git status`, `git diff`, `git stash list`)
3. Get explicit approval from the person whose work is at risk
4. Execute carefully and report what happened

### 7.2 Commit Message Format

Every commit must have a clear message explaining **WHY**, not just **WHAT**:

```
<type>(<scope>): <subject>

<body explaining why this change was needed>

<footer with issue/PR references>

Co-Authored-By: Claude <Model> <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples**:

✅ GOOD:
```
fix(orders): serialize concurrent confirmations at DB level

Order confirmation had a race condition: two concurrent requests 
could both see the order in RECIBIDO state before either transitioned 
to CONFIRMADO, causing duplicate stock deductions.

Changed transaction isolation from READ_COMMITTED to SERIALIZABLE 
to ensure database-level serialization of concurrent transactions.

Fixes: #456
```

❌ BAD:
```
fix order stuff
```

❌ BAD:
```
Fixed bug in orders

[No explanation of what bug or why this fixes it]
```

### 7.3 Pre-Commit Verification

Before executing `git commit`:

```bash
# 1. Review what will be committed
git status
git diff --cached

# 2. Check for secrets BEFORE committing
grep -r "password\|api_key\|secret\|token\|AWS_\|DATABASE_URL" --include="*.ts" --include="*.js" <files-to-commit>

# 3. Verify tests pass
npm test
npm run lint
npm run build

# 4. Ensure preexisting work is preserved
git stash list  # Should be empty, or contain your stashed work
git diff HEAD <preexisting-files>  # If you stashed, verify they're still safe
```

**Blocker**: Do not commit if any check fails.

---

## 8. PULL REQUEST AND MERGE PROTOCOL

### 8.1 PR Creation Requirements

Before creating a PR, ensure:

```
✅ Branch is feature/* or hotfix/* (not main)
✅ All tests pass locally  
✅ Lint and build succeed
✅ Commits have clear messages
✅ No secrets in diff
✅ Preexisting changes preserved
✅ One feature per PR (avoid mixing concerns)
✅ Description explains what + why + acceptance criteria
```

### 8.2 PR Description Template

```markdown
## Summary
[One sentence explaining the change]

## What
- Specific behaviors/features being added or fixed
- Changes to API contracts (if any)
- Database migrations (if any)

## Why
- Problem being solved or requirement being met
- Business impact or risk reduction

## Acceptance Criteria
- [ ] Test: [specific test passes]
- [ ] Test: [specific test passes]
- [ ] No tenant isolation violations
- [ ] No security regressions
- [ ] Build and lint pass

## Testing
```bash
npm test -- <pattern>
npm run build
npm run lint
```

## Related Issues
Fixes: #123
Relates to: #456
```

### 8.3 Merge Requirements

**PR MUST NOT be merged if ANY of these are true**:

- [ ] Tests failing
- [ ] Lint/type errors
- [ ] Code review not approved
- [ ] Security concerns unresolved
- [ ] Tenant isolation test failing
- [ ] Secrets in diff
- [ ] Preexisting work would be lost
- [ ] Required approver has not signed off

**Rule**: Merging is a deliberate, authorized action. Never auto-merge without human verification.

---

## 9. AUTOMATION AND AGENT CONSTRAINTS

### 9.1 What Agents Can Do Freely

✅ **Architect agent can**:
- Analyze code and tests
- Propose implementation plans
- Identify unresolved decisions
- Recommend minimal scope changes
- Surface risks and blockers

✅ **CI Recovery agent can**:
- Diagnose failing tests
- Trace error causality
- Propose root cause analysis
- Suggest remediation steps (without implementing)

✅ **Independent Reviewer agent can**:
- Review code diffs
- Check test coverage
- Verify security patterns
- Flag violations of these standards

### 9.2 What Requires Human Authorization

❌ **Agents CANNOT** (without explicit per-task authorization):
- Edit production code
- Run destructive Git operations (reset, clean, force-push)
- Delete files or branches
- Commit or push
- Merge PRs
- Execute deployments
- Modify CI/CD workflows
- Weaken tests or skip checks
- Approve their own work

### 9.3 Escalation Protocol

When an agent encounters:

| Situation | Escalate To | Evidence Required |
|-----------|---|---|
| Unresolved decision blocking implementation | Product owner / Architect | Decision record or meeting notes |
| Security concern that may be a vulnerability | Security lead | Minimal reproduction, proof of exposure |
| Test failure with unclear root cause | CI Recovery agent, then escalate | Diagnostic logs, failing command, exit code |
| Conflict between existing code and standards | Technical lead | Code paths, tests, decision history |
| Performance regression | Performance lead / DBA | Metrics, comparison, load test |

---

## 10. EVIDENCE AND VERIFICATION

### 10.1 What Counts as Proof

| Claim | Valid Evidence | Invalid |
|-------|---|---|
| "Test passes" | `$ npm test -- pattern` → Exit 0, assertion passed | "I ran it locally and it worked" |
| "Build succeeds" | `$ npm run build` → Exit 0, no TypeScript errors | "Code looks right" |
| "Security is OK" | Integration test with 2 companies, isolation verified | "I reviewed the code" |
| "Migration is safe" | Schema backward-compat checked, rollback tested | "Looks fine to me" |
| "Lint passes" | `$ npm run lint` → Exit 0 | "I didn't break the linter" |
| "Feature works" | E2E or integration test passing | "I tested it manually once" |
| "Performance OK" | Latency metrics before/after | "It feels fast" |

**Rule**: Always provide the actual command, output, and exit code.

### 10.2 Red Flag Claims

These claims automatically require deeper investigation:

- "It should work because..." (speculation, not evidence)
- "This can't break X because..." (assumption, not proof)
- "I didn't change that module" (false reassurance — grep to verify)
- "Tests are passing but..." (contradiction — if tests pass, core behavior is verified)
- "It works in staging but not in tests" (environmental difference — isolate root cause)

---

## 11. ESCALATION MATRIX

### When to Stop and Ask

**Escalate to Product Owner if**:
- Task description conflicts with existing behavior
- Feature request would break backward compatibility
- Scope is ambiguous or growing beyond initial ask

**Escalate to Architect if**:
- Change affects multiple modules or services
- Database schema or API contract is involved
- Security or performance implications exist
- Unresolved design decisions are blocking

**Escalate to Security Lead if**:
- Multi-tenant isolation is involved
- Authentication or authorization changes proposed
- Secrets or sensitive data handling is affected
- Any red flag from Section 6.2 is present

**Escalate to Code Reviewer if**:
- PR has unresolved comments or feedback
- Test coverage is unclear
- Regression risk exists but can't be quantified

---

## 12. FINAL DELIVERY CHECKLIST

When declaring a task complete, provide:

### 12.1 Objective & Scope

```
What was requested:
- [specific requirement]

What was delivered:
- [specific implementation]

What was OUT of scope:
- [explicitly excluded items]
```

### 12.2 Evidence of Correctness

```
Tests executed:
✅ npm test -- pattern → 45 PASS, 0 FAIL
✅ npm run build → No errors
✅ npm run lint → No violations
✅ Tenant isolation test → PASS (2 companies verified)

Code review:
✅ Security check → No violations
✅ Multi-tenant verification → Confirmed
```

### 12.3 Files Changed

```
app/orders/orders.service.ts
  - Changed: confirmOrder() method isolation level
  - Added: Atomic transaction wrapper
  - Tests: SV6-H-10b covers this

test/integration/orders.spec.ts
  - Changed: Race condition test now verifies SERIALIZABLE
  - Added: Negative test for concurrent deduction
```

### 12.4 Known Risks & Decisions

```
Decisions made:
- SERIALIZABLE isolation chosen over SELECT FOR UPDATE
  Reason: Preserves multi-tenant extension, no raw SQL bypass
  
Risks:
- SERIALIZABLE may impact latency under high concurrency
- Mitigation: Monitor production metrics, revert plan documented

Open items:
- None. Task complete.
```

### 12.5 Next Steps

```
Recommended actions:
1. Code review by @reviewer
2. Merge to main when CI passes
3. Deploy to staging for performance monitoring
4. Monitor order confirmation latency (target: <500ms p99)
```

---

## 13. CONTINUOUS IMPROVEMENT

This document is version 1.1. As work progresses:

- **Monthly review**: Identify patterns in blockers, rework, or escalations
- **Quarterly update**: Add emerging patterns, retire obsolete guidance
- **After incidents**: Document what was missing and update accordingly

All updates are versioned and tracked in Git.

---

## 14. REFERENCES AND RELATED DOCUMENTS

- [CLAUDE.md](../CLAUDE.md) — Core project governance (authoritative)
- [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md) — Quality principles (detailed)
- [.claude/rules/git-safety.md](./rules/git-safety.md) — Git protection rules
- [.claude/rules/security.md](./rules/security.md) — Security and tenant isolation
- [.claude/rules/testing.md](./rules/testing.md) — Testing policy and minimums
- [.claude/rules/documentation.md](./rules/documentation.md) — Docs and decision records
- [.claude/agents/architect.md](./agents/architect.md) — Architect agent constraints
- [.claude/agents/ci-recovery.md](./agents/ci-recovery.md) — CI diagnosis procedure
- [.claude/agents/independent-reviewer.md](./agents/independent-reviewer.md) — Code review workflow
- [.claude/skills/ci-failure-triage/](./skills/ci-failure-triage/) — Test failure diagnosis
- [.claude/skills/sdd-workflow/](./skills/sdd-workflow/) — Spec-driven development
- [.claude/skills/tenant-isolation-audit/](./skills/tenant-isolation-audit/) — Multi-tenant verification
- [.claude/skills/api-contract-audit/](./skills/api-contract-audit/) — API boundary checking

---

## Acknowledgments

These instructions are informed by lessons learned from:
- Race condition fixes (SV6-H-10b) and concurrent transaction handling
- Multi-tenant isolation verification (CompanyScopedPrisma, authorization boundaries)
- Security audits (P0, P5, P6, C5) and code review findings
- CI/CD incidents and recovery protocols
- Testing strategies for determinism and reliability

Last updated: 2026-10-25 by federicomonfasani@gmail.com
