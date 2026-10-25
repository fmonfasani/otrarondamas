---
name: master_instructions  
description: Entry point for Claude Code and all agents — start here before any task
version: 1.0
audience: Claude Code, developers, autonomous agents, software factory tools
last_updated: 2026-10-25
---

# 🎯 Master Instructions — Start Here

You are about to work on **Otra Ronda Más** (operational ERP) or **Wapsell** (platform documentation). This document is your **single entry point**. Read it every time you start a task.

---

## Quick Reference: Where to Go

| You want to... | Start here | Then see |
|---|---|---|
| **Understand project governance** | [CLAUDE.md](../CLAUDE.md) | [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md) |
| **Start a new task** | [ENGINEERING-INSTRUCTIONS.md](./ENGINEERING-INSTRUCTIONS.md) Section 3 | Sect. 1 (Git verify), Sect. 4 (code changes) |
| **Fix a failing test** | [.claude/skills/ci-failure-triage/](./skills/ci-failure-triage/) | [ENGINEERING-INSTRUCTIONS.md](./ENGINEERING-INSTRUCTIONS.md) Section 5 |
| **Review code** | [.claude/agents/independent-reviewer.md](./agents/independent-reviewer.md) | [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md) Sections 3, 6, 8 |
| **Design a change** | [.claude/agents/architect.md](./agents/architect.md) | [ENGINEERING-INSTRUCTIONS.md](./ENGINEERING-INSTRUCTIONS.md) Section 3 |
| **Understand security rules** | [.claude/rules/security.md](./rules/security.md) | [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md) Section 3 |
| **Verify Git safety** | [.claude/rules/git-safety.md](./rules/git-safety.md) | [ENGINEERING-INSTRUCTIONS.md](./ENGINEERING-INSTRUCTIONS.md) Section 7 |
| **Ensure tests pass** | [.claude/rules/testing.md](./rules/testing.md) | [ENGINEERING-INSTRUCTIONS.md](./ENGINEERING-INSTRUCTIONS.md) Section 5 |
| **Understand documentation standards** | [.claude/rules/documentation.md](./rules/documentation.md) | [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md) Section 9 |

---

## The Three Core Rules (Never Skip These)

### Rule 1: Inspect Before Acting

Every single task starts with this:

```bash
git status --short --branch
git rev-parse HEAD
git log --oneline -3
```

✅ Know your current branch, commit, and any uncommitted changes  
❌ Do NOT skip this — even for "quick" tasks

See: [ENGINEERING-INSTRUCTIONS.md Section 1.1](./ENGINEERING-INSTRUCTIONS.md#11-git-state-inspection)

### Rule 2: Check Authorization

Before you edit, commit, push, merge, or delete anything, verify:

| Question | How to verify |
|----------|---|
| Am I authorized to work on this? | Task description, issue, or explicit request |
| Which files can I modify? | Scope statement (explicit list only) |
| What approvals are needed? | [ENGINEERING-INSTRUCTIONS.md Section 2.1](./ENGINEERING-INSTRUCTIONS.md#21-who-approves-what) |
| Is this a destructive operation? | See Section 7.1 for blocked operations |

❌ If authorization is unclear, **STOP and ask**. Do not guess.

See: [ENGINEERING-INSTRUCTIONS.md Section 1.2](./ENGINEERING-INSTRUCTIONS.md#12-authorization-verification)

### Rule 3: Preserve Existing Work

If you find uncommitted changes or untracked files:

```bash
git diff HEAD > /tmp/preexisting-backup.patch
git stash -u
# Do your task
git stash pop  # Restore at the end
```

❌ Never delete, overwrite, or discard work you didn't create  
✅ Always preserve and restore preexisting changes

See: [ENGINEERING-INSTRUCTIONS.md Section 1.3](./ENGINEERING-INSTRUCTIONS.md#13-existing-work-preservation)

---

## Task Workflow

### Step 1: Verify State (5 min)

```bash
# Terminal commands from ENGINEERING-INSTRUCTIONS.md Section 1
git status --short --branch
git rev-parse HEAD
git rev-parse --abbrev-ref HEAD
git log --oneline -3

# Document: Branch? HEAD? Preexisting changes?
```

**Output**: You know your Git state. Preexisting work is backed up if found.

### Step 2: Establish Authorization (2 min)

Create a task context using the template from [ENGINEERING-INSTRUCTIONS.md Section 3](./ENGINEERING-INSTRUCTIONS.md#3-task-initialization-template):

```markdown
## Task: [Title from issue/PR]

**Branch**: [feat/...]  
**Authorized by**: [Who approved this?]  

### Scope
- Must do: [explicit list]
- Out of scope: [explicit list]
- Acceptance criteria: [testable conditions]

### Verification Plan
- Tests: [jest patterns]
- Security: [multi-tenant check?]

### Blockers
- [ ] Any decisions needed before starting?
```

**Output**: You have explicit scope, acceptance criteria, and blockers.

### Step 3: Plan the Change (10 min)

Read the affected code:

1. **For API changes**: Controller → DTO → Service → Database  
2. **For business logic**: Service → existing tests → persistence  
3. **For database**: Schema → migrations → constraints → rollback  

Use [architect agent](./agents/architect.md) to validate plan if complex.

**Output**: You know what files change, which tests verify, and which approvals are needed.

### Step 4: Execute and Test (time varies)

1. Edit files (narrowest scope only)
2. Run tests: `npm test -- <pattern>`
3. Lint and build: `npm run lint && npm run build`
4. Verify: Section 5 of [ENGINEERING-INSTRUCTIONS.md](./ENGINEERING-INSTRUCTIONS.md)

**Output**: All tests pass, no lint errors, build succeeds.

### Step 5: Commit and Request Review (5 min)

```bash
git diff --cached  # Review what you're committing
git commit -m "type(scope): explanation

Clear message explaining WHY this change was needed.

See: ENGINEERING-INSTRUCTIONS.md Section 7.2"
```

**Output**: Clear commit, passing tests, ready for PR/review.

### Step 6: Deliver Evidence

Provide the final checklist from [ENGINEERING-INSTRUCTIONS.md Section 12](./ENGINEERING-INSTRUCTIONS.md#12-final-delivery-checklist):

```
✅ Objective & Scope
✅ Test Results (commands + output)  
✅ Files Changed
✅ Security/Multi-tenant Verification
✅ Known Risks & Decisions
✅ Next Steps
```

---

## Key Documents by Role

### For All Developers and Agents

**Must read**:
1. [CLAUDE.md](../CLAUDE.md) — Project governance
2. [ENGINEERING-INSTRUCTIONS.md](./ENGINEERING-INSTRUCTIONS.md) — Universal rules
3. [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md) — Quality principles

**Reference as needed**:
- [.claude/rules/git-safety.md](./rules/git-safety.md) — Git operations
- [.claude/rules/security.md](./rules/security.md) — Multi-tenant isolation
- [.claude/rules/testing.md](./rules/testing.md) — Test requirements

### For Architect Agent

Use to design changes:
- [.claude/agents/architect.md](./agents/architect.md) — Your mission and constraints
- [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md) Sections 2–4 — Source of truth, scope, contracts

### For CI Recovery Agent

Use to diagnose failures:
- [.claude/skills/ci-failure-triage/SKILL.md](./skills/ci-failure-triage/SKILL.md) — Diagnostic procedure
- [.claude/agents/ci-recovery.md](./agents/ci-recovery.md) — Your workflow

### For Independent Reviewer Agent

Use to review code:
- [.claude/agents/independent-reviewer.md](./agents/independent-reviewer.md) — Review scope and output
- [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md) Sections 6–8 — Security, quality, testing

### For Product & Security Teams

Escalation:
- [ENGINEERING-INSTRUCTIONS.md Section 11](./ENGINEERING-INSTRUCTIONS.md#11-escalation-matrix) — When to stop and ask

---

## Absolute Blocking Conditions

**STOP immediately and report if ANY of these are true**:

1. **Git state is unclear**
   - Unresolved conflicts
   - Unknown preexisting changes
   - Uncommitted work from another agent
   → See Section 1 of ENGINEERING-INSTRUCTIONS

2. **Authorization is missing**
   - No explicit approval for file modifications
   - Unclear scope or acceptance criteria
   - Destructive operation without explicit authorization
   → See Section 2 of ENGINEERING-INSTRUCTIONS

3. **Multi-tenant isolation is questionable**
   - Client-supplied company IDs used for authorization
   - Queries without company filters
   - Data leakage risk
   → See Section 6 of ENGINEERING-INSTRUCTIONS

4. **Tests would be weakened**
   - Assertions removed or loosened to pass
   - Tests skipped or marked xdescribe
   - Test data compromised
   → Section 5.2 of ENGINEERING-INSTRUCTIONS

5. **Secrets would be exposed**
   - API keys, passwords, tokens in code
   - Database credentials in logs
   - Encryption keys in output
   → See Section 7.2 of ENGINEERING-INSTRUCTIONS

**Action**: Report the condition with evidence. Do not proceed until resolved.

---

## Common Scenarios

### Scenario 1: "I need to fix a test failure"

1. ✅ Git verify: Are you on a feature branch?
2. ✅ Authorization: Who approved this test fix?
3. ✅ Root cause: Use [ci-failure-triage skill](./skills/ci-failure-triage/SKILL.md)
4. ✅ Fix only the test (not surrounding code)
5. ✅ Verify fix: `npm test -- pattern` passes
6. ✅ Document: Why was the test failing? Why is this fix correct?

### Scenario 2: "I need to add a new API endpoint"

1. ✅ Git verify: Feature branch? Correct HEAD?
2. ✅ Authorization: Product owner approved scope?
3. ✅ Architect plan: Use [architect agent](./agents/architect.md) to plan
4. ✅ Check security: Multi-tenant isolation? Authentication required?
5. ✅ Tests: Add integration test with 2 companies (positive + negative)
6. ✅ Code review: Have [independent-reviewer](./agents/independent-reviewer.md) check
7. ✅ Deliver: Evidence checklist from Section 12

### Scenario 3: "I need to fix a security issue"

1. ✅ Git verify: On correct branch?
2. ✅ Escalate: Report to security lead immediately
3. ✅ Architect plan: Define minimal fix with security lead
4. ✅ Tests: Add both positive (authorized) and negative (unauthorized) tests
5. ✅ Security audit: Independent-reviewer verifies isolation
6. ✅ Deliver: No remaining exposure, all tests passing

### Scenario 4: "Tests are flaky"

1. ✅ Isolate: Reproduce locally with exact command
2. ✅ Classify: Is it ordering, cleanup, environment, or timing?
3. ✅ Root cause: Use [ci-failure-triage](./skills/ci-failure-triage/SKILL.md)
4. ✅ Fix: Make test deterministic (don't skip or randomize)
5. ✅ Verify: Run 5 times in a row — all pass? Then fixed.

---

## Glossary

| Term | Meaning | See |
|------|---------|-----|
| **AS-IS** | Current working behavior verified by tests | ENGINEERING-STANDARDS 2.2 |
| **TO-BE** | Target behavior not yet implemented | ENGINEERING-STANDARDS 2.2 |
| **Blocking condition** | Something that prevents proceeding; requires resolution | ENGINEERING-INSTRUCTIONS 2.2 |
| **Scope creep** | Adding work beyond the original authorization | ENGINEERING-INSTRUCTIONS 4.1 |
| **Multi-tenant isolation** | Ensuring one company's data cannot leak to another | ENGINEERING-STANDARDS 3 |
| **Preexisting changes** | Work in the repo that you did not create | ENGINEERING-INSTRUCTIONS 1.3 |
| **Acceptance criteria** | Testable conditions that prove the task is complete | ENGINEERING-INSTRUCTIONS 3 |

---

## Quick Checklist for Every Task

```
Before starting:
☐ Git state verified (branch, HEAD, preexisting work backed up)
☐ Authorization confirmed (scope, files, approvals documented)
☐ Acceptance criteria clear and testable
☐ Any blocking decisions identified

While working:
☐ Only edit files in authorized scope
☐ Run tests for each change
☐ Lint and build pass
☐ No secrets or sensitive data in code
☐ Multi-tenant isolation verified (if applicable)

Before delivering:
☐ All tests passing with evidence (commands + output)
☐ Code reviewed or self-review checklist completed
☐ Commit message explains WHY not just WHAT
☐ Preexisting changes restored (if any were backed up)
☐ Final evidence checklist completed
```

---

## Getting Help

| Question | See |
|----------|-----|
| "How do I start a task?" | Section "Task Workflow" above |
| "Is this change authorized?" | [ENGINEERING-INSTRUCTIONS.md Section 2](./ENGINEERING-INSTRUCTIONS.md#2-authorization-and-approval-gates) |
| "What tests do I need?" | [ENGINEERING-INSTRUCTIONS.md Section 5](./ENGINEERING-INSTRUCTIONS.md#5-testing-requirements-by-change-type) |
| "Is my code secure?" | [.claude/rules/security.md](./rules/security.md) |
| "When do I escalate?" | [ENGINEERING-INSTRUCTIONS.md Section 11](./ENGINEERING-INSTRUCTIONS.md#11-escalation-matrix) |
| "What's a good commit message?" | [ENGINEERING-INSTRUCTIONS.md Section 7.2](./ENGINEERING-INSTRUCTIONS.md#72-commit-message-format) |
| "How do I handle a failing test?" | [.claude/skills/ci-failure-triage/](./skills/ci-failure-triage/) |

---

## Version & Updates

**Version**: 1.0  
**Last updated**: 2026-10-25  
**Maintained by**: Technical lead, reviewed quarterly

Changes to this document require:
1. Evidence that current guidance is blocking work
2. Consensus from architect + security lead
3. Update to version number and timestamp
4. Communication to all agents and developers

---

## Acknowledgments

This document synthesizes lessons from successful delivery of:
- Race condition fixes with transaction isolation
- Multi-tenant security audits (4-phase review)
- CI/CD diagnostic protocols
- Code review standards applied to 1000+ commits

It enforces what works and prevents what breaks.

---

**Next step**: Pick your task, start with Section 1.1 of [ENGINEERING-INSTRUCTIONS.md](./ENGINEERING-INSTRUCTIONS.md), and deliver with evidence.

Good luck. 🚀
