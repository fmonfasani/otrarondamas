---
name: framework_summary
description: Overview of the Otra Ronda Más / Wapsell engineering framework v1.0
version: 1.0
created: 2026-10-25
---

# Engineering Framework v1.0 — Summary

This document provides a **bird's-eye view** of the complete engineering framework for Otra Ronda Más operational ERP and Wapsell platform.

---

## What Is This Framework?

A **system of global instructions, rules, agents, and skills** that ensures:
- ✅ Every change is authorized and scoped clearly
- ✅ Code preserves multi-tenant isolation and security
- ✅ Tests verify behavior (never weakened to pass)
- ✅ Git history is clean and reversible
- ✅ Decisions are documented and unresolved conflicts are surfaced
- ✅ Preexisting work is never lost or overwritten
- ✅ Automation is guided by humans, not left unsupervised

---

## Framework Structure

```
.claude/
├── MASTER-INSTRUCTIONS.md         ← START HERE for any task
├── ENGINEERING-INSTRUCTIONS.md    ← Global binding rules (14 sections)
├── ENGINEERING-STANDARDS.md       ← Quality principles & practices (12 sections)
├── FRAMEWORK-SUMMARY.md           ← This file
├── INDEX.md                       ← Detailed component index
│
├── agents/
│   ├── architect.md               ← Design analysis & planning (no code changes)
│   ├── ci-recovery.md             ← CI/build failure diagnosis
│   └── independent-reviewer.md    ← Code & security review (no commits)
│
├── rules/
│   ├── documentation.md           ← Keep AS-IS, TO-BE, decisions separate
│   ├── git-safety.md              ← Prevent data loss, protect history
│   ├── security.md                ← Multi-tenant, auth, authorization
│   └── testing.md                 ← Test selection, coverage, evidence
│
└── skills/
    ├── ci-failure-triage/         ← Diagnose failing tests/builds
    ├── sdd-workflow/              ← Spec-driven development procedure
    ├── tenant-isolation-audit/    ← Verify multi-tenant safety
    └── api-contract-audit/        ← Check API boundaries
```

---

## Three Golden Rules (Always Applied)

### 1. INSPECT BEFORE ACTING
```bash
git status --short --branch
git rev-parse HEAD
git log --oneline -3
```
Every task begins here. Know your state before changing anything.

### 2. CHECK AUTHORIZATION
Who approved this? Which files? What approvals are needed? If unclear, STOP.

### 3. PRESERVE EXISTING WORK
Preexisting changes are backed up, restored at task end. Never deleted or lost.

---

## Task Lifecycle

| Phase | Owner | Key Actions | Evidence |
|-------|-------|---|---|
| **1. Verify** | You | Git state check, auth confirmation, scope definition | Git log output, task context |
| **2. Plan** | Architect (if complex) | Code inspection, contract analysis, risk assessment | Written plan, no code changes |
| **3. Implement** | You | Edit files, run tests, ensure isolation | Test output, lint/build pass |
| **4. Review** | Independent Reviewer | Security check, multi-tenant verification | Review findings + test coverage |
| **5. Deliver** | You | Evidence checklist, final status | Commands, outputs, decisions |

---

## Key Principles

### Source of Truth Hierarchy
1. **Executable tests** ← highest authority (proves behavior)
2. **CI workflows** ← shows integrated status
3. **Code + test coverage** ← documents intent
4. **Database schema** ← data contract
5. **Specifications** ← design intent
6. **Code comments** ← documentation only
7. **Verbal claims** ← lowest authority

### Blocking Conditions (Never Proceed If Any Are True)

```
❌ Git state is unclear (conflicts, unknown changes)
❌ Authorization is missing (scope undefined, approvals missing)
❌ Preexisting work would be lost (uncommitted changes from others)
❌ Tests would be weakened (assertions removed, skipped tests)
❌ Secrets would be exposed (API keys, passwords, tokens)
❌ Multi-tenant isolation is violated (company data leakage risk)
❌ Destructive operation without explicit authorization (force-push, reset, etc.)
```

### Evidence Over Speculation

✅ "I ran `npm test -- pattern` and got Exit 0 with [output]"  
❌ "Tests should pass because the code looks right"

✅ "Tenant isolation verified: Company A cannot read Company B's orders (test confirms)"  
❌ "Isolation looks secure"

---

## Rules by Category

### Git Safety (Never Auto-Execute)
- No `git reset --hard` without explicit authorization
- No `git push --force` except with security review
- No `git clean -fd` without backing up first
- No `git branch -D` unless code owner approves
- Preexisting changes always backed up and restored

### Authorization & Approval
| Change | Approver |
|--------|----------|
| Feature | Product owner + Architect |
| Bug fix | Code reviewer |
| Security | Security lead + Reviewer |
| Schema | DBA + Architect |
| Deployment | Release manager |

### Testing Minimums
- Single function → Unit + lint/build
- Service method → Unit + integration
- **API endpoint → Unit + integration + tenant isolation**
- **Permission change → Positive + negative tests required**
- Database change → Integration + tenant tests
- Auth flow → All tests + E2E + tenant isolation

### Multi-Tenant Isolation (Every API Change)
1. ✅ Derive context from authentication (not body request)
2. ✅ Filter queries by `empresa_id`
3. ✅ Verify nested resources belong to same company
4. ✅ Test with 2+ companies (positive + negative isolation)
5. ✅ No data leakage on missing resources (return 404 regardless)

### Code Quality
- SOLID principles applied (not over-engineered)
- No unnecessary complexity or premature abstraction
- No silent error handling (errors logged or re-thrown)
- No scope creep (stay within authorized changes)
- Refactoring only if it's in scope and needed for this task

### Documentation
- **AS-IS** = current working behavior (verified by tests)
- **TO-BE** = target behavior (not yet built)
- **Unresolved** = decisions awaiting approval
- **Decision records** = why we chose this over alternatives
- No WHAT (code documents that) — explain WHY

---

## Agent Responsibilities

### Architect Agent
**Can do**:
- Analyze code, tests, database schema
- Propose minimal implementation plans
- Identify unresolved decisions
- Recommend scope / contract changes
- Surface risks and blockers

**Cannot do without explicit authorization**:
- Edit production code
- Run Git destructive operations
- Commit, push, merge
- Delete files or branches
- Weaken tests

### CI Recovery Agent
**Can do**:
- Diagnose failing tests, builds, workflows
- Trace root causality
- Propose remediation plans
- Classify failure types
- Recommend test fixes

**Cannot do without authorization**:
- Modify code outside diagnosis scope
- Commit or push changes
- Approve CI rerun
- Weaken assertions

### Independent Reviewer Agent
**Can do**:
- Review code diffs
- Check multi-tenant isolation
- Verify test coverage
- Flag security violations
- Recommend improvements

**Cannot do without authorization**:
- Approve or merge PRs
- Edit code
- Commit or push
- Declare work complete

---

## Automation vs. Human Authority

| Task | Automated | Human Authority |
|------|-----------|---|
| Git state verification | ✅ (checked, reported) | Must authorize any destructive fix |
| Test diagnosis | ✅ (classified, reproduced) | Must approve code changes |
| Security scan | ✅ (finding reported) | Must approve architectural changes |
| Code review | ✅ (findings reported) | Must approve PR merge |
| Commit/push | ❌ Human only | Only with authorization + green CI |
| Deployment | ❌ Human only | Release manager approval required |

---

## Evidence Requirements

### Test Passing
```bash
$ npm test -- s-v1-06-orders  
PASS  apps/api/test/integration/s-v1-06-orders-http.integration-spec.ts
  ✓ concurrent requests serialize at DB level (250ms)
Tests: 1 passed, 0 failed
Exit status: 0
```

### Build Success
```bash
$ npm run build
Successfully compiled 42 modules
Exit status: 0
```

### Lint Clean
```bash
$ npm run lint
No lint violations found
Exit status: 0
```

### Security Check
✅ Integration test with 2 companies verifies:
- Company A cannot read Company B's data
- Company A cannot write to Company B's resources
- Authorization failures return same response as "not found"

---

## Checklist: Before Declaring Task Complete

```
Objective & Scope:
☐ What was requested
☐ What was delivered
☐ What was out of scope

Tests:
☐ Exact npm command run
☐ Exit status (0 = success)
☐ Number of tests (passing, failing)
☐ Tenant isolation verified (if applicable)
☐ Security checks passed (if applicable)

Code Quality:
☐ Lint passed
☐ Build succeeded
☐ Type-check passed
☐ No secrets or sensitive data
☐ Preexisting work preserved or restored

Decisions:
☐ What trade-offs were made?
☐ Why was this approach chosen?
☐ Any unresolved decisions?

Risks:
☐ What could go wrong?
☐ How are we monitoring for problems?
☐ Rollback plan (if applicable)?

Next Steps:
☐ What's the recommended next action?
☐ Who should review this?
☐ When should it be merged/deployed?
```

---

## Document Relationships

```
CLAUDE.md (source-of-truth, top-level governance)
    ↓
MASTER-INSTRUCTIONS.md (entry point for all tasks)
    ↓
┌─ ENGINEERING-INSTRUCTIONS.md (binding global rules, 14 sections)
│   ├─ References: .claude/rules/* (specific policies)
│   └─ References: .claude/agents/* (agent constraints)
│
└─ ENGINEERING-STANDARDS.md (quality principles, 12 sections)
    ├─ References: Testing rules, Security rules, Documentation rules
    └─ Cross-references: ENGINEERING-INSTRUCTIONS.md sections
```

---

## Change History

| Date | Version | Changes |
|------|---------|---------|
| 2026-10-25 | 1.0 | Framework complete: MASTER-INSTRUCTIONS, ENGINEERING-INSTRUCTIONS, ENGINEERING-STANDARDS, all agents/rules/skills |
| 2026-10-22 | 0.9 | Initial agents (architect, ci-recovery, independent-reviewer), base rules |
| 2026-10-20 | — | Audit work, lessons learned documented |

---

## How to Use This Framework

### For Developers Starting a Task
1. **Read** [MASTER-INSTRUCTIONS.md](./MASTER-INSTRUCTIONS.md) (10 min)
2. **Execute** Section 1 (Git verify) and Section 3 (task context)
3. **Implement** following Sections 4–5 (code changes + testing)
4. **Deliver** with checklist from Section 12

### For Architects Designing Changes
1. **Read** [.claude/agents/architect.md](./agents/architect.md)
2. **Follow** workflow: inspect → trace → identify → plan → deliver
3. **Never commit code** — your job is analysis and recommendation
4. **Surface decisions** — flag what needs human approval

### For CI Recovery Investigations
1. **Read** [.claude/skills/ci-failure-triage/SKILL.md](./skills/ci-failure-triage/SKILL.md)
2. **Follow** procedure: protect → locate → classify → trace → reproduce → recommend
3. **Diagnose only** — do not fix without authorization
4. **Classify clearly** — application vs. test vs. environment vs. external

### For Code Reviews
1. **Read** [.claude/agents/independent-reviewer.md](./agents/independent-reviewer.md)
2. **Check** security (3.1, 3.2), testing (5.1–5.2), quality (8.1–8.3)
3. **Verify** multi-tenant isolation, secrets, test weakening
4. **Flag violations** with evidence; do not approve without addressing

### For Escalations
1. **Refer to** [ENGINEERING-INSTRUCTIONS.md Section 11](./ENGINEERING-INSTRUCTIONS.md#11-escalation-matrix)
2. **Identify** the right approver (product, architect, security, DevOps)
3. **Provide evidence** — git log, failing tests, code paths
4. **Block and wait** — never guess approval

---

## FAQ

**Q: Can I skip the Git verification if the task is small?**  
A: No. Every task starts with `git status --short --branch`. No exceptions.

**Q: What if I find preexisting changes I didn't make?**  
A: Back them up (`git diff > patch`), stash them (`git stash -u`), complete your task, restore them (`git stash pop`).

**Q: Can I weaken tests to make them pass?**  
A: No. Tests prove behavior. If a test fails, fix the code or fix the test's *expectations* (with approval), but never weaken assertions to pass.

**Q: When can I force-push?**  
A: Only with explicit authorization and proof it won't lose work. Otherwise never.

**Q: Can agents approve their own work?**  
A: No. Architect plans are reviewed by product/security. Code reviewers don't approve their own changes.

**Q: What if multi-tenant isolation is unclear in the code?**  
A: Escalate to security lead. Do not proceed. Do not guess.

**Q: How do I know if a test is "good enough"?**  
A: See [ENGINEERING-INSTRUCTIONS.md Section 5](./ENGINEERING-INSTRUCTIONS.md#5-testing-requirements-by-change-type) — minimum coverage by change type. For API endpoints: Unit + Integration + Tenant isolation.

---

## Contacts & Escalation

| Situation | Escalate To | How |
|-----------|---|---|
| Scope unclear | Product owner | Describe ambiguity, show two interpretations |
| Design decision needed | Architect | Present options + trade-offs, ask for decision |
| Security concern | Security lead | Describe exposure + impact, provide reproduction |
| Test failure with no root cause | CI Recovery agent | Provide exact command, logs, failure output |
| Performance regression | Performance lead | Provide before/after metrics, load test |

---

## Continuous Improvement

This framework is version 1.0. It will evolve:

- **Monthly**: Identify blocking patterns, rework, escalations
- **Quarterly**: Review rules, add or retire guidance
- **After incidents**: Document what was missing, update accordingly

Changes are versioned and tracked in Git.

---

## License & Attribution

These instructions synthesize lessons from:
- Race condition fixes (transaction isolation, concurrent confirmations)
- Multi-tenant security audits (4-phase review, isolation verification)
- Code review practice on 1000+ commits
- CI/CD diagnostics and recovery protocols
- Testing strategies for determinism and reliability

Maintained by: Federico Monfasani (fmonfasani@gmail.com)  
Last updated: 2026-10-25

---

## Next Steps

1. **For developers**: Start with [MASTER-INSTRUCTIONS.md](./MASTER-INSTRUCTIONS.md)
2. **For architects**: Read [.claude/agents/architect.md](./agents/architect.md)
3. **For reviewers**: Check [.claude/agents/independent-reviewer.md](./agents/independent-reviewer.md)
4. **For CI recovery**: Use [.claude/skills/ci-failure-triage/](./skills/ci-failure-triage/)

Questions? Refer to the framework. It's designed to be complete and self-contained.
