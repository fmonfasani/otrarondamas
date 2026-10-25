# Engineering Kit for Otra Ronda Más / Wapsell

## 📍 Quick Start

**New to this project?** Start here → [MASTER-INSTRUCTIONS.md](./MASTER-INSTRUCTIONS.md) (5 min read)

**Need specific guidance?** Use the table below to find your topic.

---

## What Is This?

A **complete system of engineering instructions** for Otra Ronda Más (operational ERP) and Wapsell (platform documentation) that:

✅ Ensures every change is authorized and scoped  
✅ Preserves multi-tenant security and data isolation  
✅ Verifies code with actual tests (not assumptions)  
✅ Prevents accidental work loss  
✅ Documents decisions and surfaces unresolved conflicts  
✅ Guides autonomous agents (architect, ci-recovery, code-reviewer)  

---

## Navigation Guide

### 🎯 I Want To...

| Goal | Go To | Time |
|------|-------|------|
| **Start a new task** | [MASTER-INSTRUCTIONS.md](./MASTER-INSTRUCTIONS.md) § Task Workflow | 10 min |
| **Understand the framework** | [FRAMEWORK-SUMMARY.md](./FRAMEWORK-SUMMARY.md) | 10 min |
| **Learn deep principles** | [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md) | 20 min |
| **Know the binding rules** | [ENGINEERING-INSTRUCTIONS.md](./ENGINEERING-INSTRUCTIONS.md) | 30 min |
| **Design a complex change** | [agents/architect.md](./agents/architect.md) | 5 min |
| **Diagnose test failures** | [skills/ci-failure-triage/](./skills/ci-failure-triage/) | 15 min |
| **Review code for security** | [agents/independent-reviewer.md](./agents/independent-reviewer.md) | 5 min |
| **Understand Git safety** | [rules/git-safety.md](./rules/git-safety.md) | 10 min |
| **Check multi-tenant isolation** | [rules/security.md](./rules/security.md) + [skills/tenant-isolation-audit/](./skills/tenant-isolation-audit/) | 10 min |

---

## The Three Golden Rules

### 1️⃣ INSPECT BEFORE ACTING

```bash
git status --short --branch
git rev-parse HEAD
git log --oneline -3
```

Every task begins here. Know your state.

### 2️⃣ CHECK AUTHORIZATION

Who approved this? Which files can I modify? What approvals are needed?

If unclear → **STOP and ask**. Never guess.

### 3️⃣ PRESERVE EXISTING WORK

If you find uncommitted changes:
```bash
git diff HEAD > /tmp/backup.patch
git stash -u
# Do your task
git stash pop  # Restore at the end
```

Never delete or overwrite work you didn't create.

---

## Documentation Structure

```
.claude/
├── README.md                      ← You are here
├── MASTER-INSTRUCTIONS.md         ← START HERE for any task
├── ENGINEERING-INSTRUCTIONS.md    ← 14 global binding rules
├── ENGINEERING-STANDARDS.md       ← 12 quality principles
├── FRAMEWORK-SUMMARY.md           ← Overview & quick reference
├── INDEX.md                       ← Detailed component list
├── VALIDATION-COMPLETE.md         ← Framework validation report
│
├── agents/                        ← Autonomous agents
│   ├── architect.md              ← Design planning (no code changes)
│   ├── ci-recovery.md            ← CI failure diagnosis
│   └── independent-reviewer.md   ← Code review (no approval)
│
├── rules/                         ← Specific safety policies
│   ├── git-safety.md             ← Destructive ops, commit protocol
│   ├── security.md               ← Multi-tenant, auth, secrets
│   ├── testing.md                ← Test selection, evidence
│   └── documentation.md          ← Decision records
│
└── skills/                        ← Procedures for agents
    ├── ci-failure-triage/        ← Diagnose test failures
    ├── sdd-workflow/             ← Spec-driven dev procedure
    ├── tenant-isolation-audit/   ← Verify multi-tenant safety
    └── api-contract-audit/       ← Check API boundaries
```

---

## For Different Roles

### 👨‍💻 Developers

1. **Start task**: Read [MASTER-INSTRUCTIONS.md § Task Workflow](./MASTER-INSTRUCTIONS.md#task-workflow)
2. **Verify state**: `git status`, then Section 1 of ENGINEERING-INSTRUCTIONS
3. **Code**: Follow Section 4 (Code Change Protocol)
4. **Test**: Follow Section 5 (Testing Requirements)
5. **Deliver**: Use checklist from Section 12

### 🏗️ Architects

1. Read [agents/architect.md](./agents/architect.md) for your mission
2. Follow the required workflow: inspect → trace → plan → deliver
3. **Never commit code** — your job is analysis and recommendation
4. Surface decisions requiring human approval

### 🔍 Security & Code Reviewers

1. Use [agents/independent-reviewer.md](./agents/independent-reviewer.md)
2. Check sections 6 (multi-tenant), 8 (code quality), 5 (testing)
3. Verify: multi-tenant isolation, secrets, test weakening, SOLID
4. Flag violations with evidence; request fixes before approval

### 🚨 CI Recovery / Diagnostics

1. Use [skills/ci-failure-triage/SKILL.md](./skills/ci-failure-triage/SKILL.md)
2. Follow 6-step procedure: protect → locate → classify → trace → reproduce → recommend
3. Diagnose only; do not fix without authorization
4. Classify clearly: application vs. test vs. environment vs. external

---

## Common Questions

### "Can I skip the Git verification if the task is small?"
No. Every task starts with `git status`. No exceptions.

### "What if I find preexisting changes I didn't make?"
Back them up, stash them, complete your task, restore them. See [ENGINEERING-INSTRUCTIONS.md § 1.3](./ENGINEERING-INSTRUCTIONS.md#13-existing-work-preservation).

### "Can I weaken tests to make them pass?"
No. Tests prove behavior. If a test fails, fix the code, not the test. See [ENGINEERING-STANDARDS.md § 5.2](./ENGINEERING-STANDARDS.md#52-test-execution-evidence).

### "When can I force-push?"
Only with explicit authorization and proof no work would be lost. Otherwise never. See [ENGINEERING-INSTRUCTIONS.md § 7.1](./ENGINEERING-INSTRUCTIONS.md#71-forbidden-operations-block-unless-explicitly-authorized).

### "Is this change authorized?"
See [ENGINEERING-INSTRUCTIONS.md § 1.2](./ENGINEERING-INSTRUCTIONS.md#12-authorization-verification). If unclear, STOP and ask.

### "What's a good commit message?"
See [ENGINEERING-INSTRUCTIONS.md § 7.2](./ENGINEERING-INSTRUCTIONS.md#72-commit-message-format). Explain WHY, not WHAT.

### "How do I know if multi-tenant isolation is safe?"
See [ENGINEERING-INSTRUCTIONS.md § 6.1](./ENGINEERING-INSTRUCTIONS.md#61-isolation-verification-checklist). Test with 2+ companies, verify both positive and negative cases.

---

## Key Principles

| Principle | Why | How |
|-----------|-----|-----|
| **Inspect before acting** | Prevents accidental work loss | `git status` → understand state → proceed |
| **Evidence over speculation** | Proves behavior actually works | Run tests, capture output, show exit codes |
| **Multi-tenant first** | Prevents data leaks | Check company isolation at every boundary |
| **Preserve preexisting work** | Respects other people's effort | Stash, backup, restore patterns |
| **Clear authorization** | Prevents scope creep | Define scope, files, approvals upfront |
| **Never weaken tests** | Keeps quality gate meaningful | Fix code, not assertions |
| **Blocking conditions matter** | Prevents shipping broken code | Stop and escalate when found |

---

## Blocking Conditions (Stop Immediately)

❌ **Git state is unclear** (conflicts, unknown changes)  
❌ **Authorization is missing** (scope undefined, approvals missing)  
❌ **Preexisting work would be lost** (uncommitted changes)  
❌ **Tests would be weakened** (assertions removed)  
❌ **Secrets would be exposed** (API keys, passwords)  
❌ **Multi-tenant isolation is violated** (company data leakage)  
❌ **Destructive operation without authorization** (force-push, reset, etc.)  

**Action**: Report the condition with evidence. Do not proceed until resolved.

---

## Task Checklist

```
Before starting:
☐ Git state verified (branch, HEAD, work backed up)
☐ Authorization confirmed (scope, files, approvals)
☐ Acceptance criteria clear and testable
☐ Blocking decisions identified

While working:
☐ Only edit authorized files
☐ Run tests for each change
☐ Lint and build pass
☐ No secrets in code
☐ Multi-tenant isolation verified (if applicable)

Before delivering:
☐ All tests passing (commands + output)
☐ Code reviewed (or self-review checklist)
☐ Commit message explains WHY
☐ Preexisting changes restored
☐ Evidence checklist completed
```

See [MASTER-INSTRUCTIONS.md](./MASTER-INSTRUCTIONS.md#quick-checklist-for-every-task) for full version.

---

## Getting Help

| Question | See |
|----------|-----|
| How do I start a task? | [MASTER-INSTRUCTIONS.md](./MASTER-INSTRUCTIONS.md) |
| How do I verify git state? | [ENGINEERING-INSTRUCTIONS.md § 1.1](./ENGINEERING-INSTRUCTIONS.md#11-git-state-inspection) |
| Is this change authorized? | [ENGINEERING-INSTRUCTIONS.md § 1.2](./ENGINEERING-INSTRUCTIONS.md#12-authorization-verification) + [§ 2.1](./ENGINEERING-INSTRUCTIONS.md#21-who-approves-what) |
| What tests do I need? | [ENGINEERING-INSTRUCTIONS.md § 5.1](./ENGINEERING-INSTRUCTIONS.md#51-minimum-test-coverage) |
| Is my code secure? | [rules/security.md](./rules/security.md) |
| How do I diagnose a test failure? | [skills/ci-failure-triage/](./skills/ci-failure-triage/) |
| When do I escalate? | [ENGINEERING-INSTRUCTIONS.md § 11](./ENGINEERING-INSTRUCTIONS.md#11-escalation-matrix) |
| What's a good PR? | [ENGINEERING-INSTRUCTIONS.md § 8](./ENGINEERING-INSTRUCTIONS.md#8-pull-request-and-merge-protocol) |

---

## Framework Info

| Attribute | Value |
|-----------|-------|
| **Version** | 1.0 |
| **Status** | Production Ready |
| **Last Updated** | 2026-10-25 |
| **Total Documentation** | 2,515 lines |
| **Components** | 12 files (3 master + 4 rules + 3 agents + 4 skills) |
| **Validation** | ✅ Complete |
| **Conflicts** | None |
| **Git Safe** | Yes |

---

## Next Steps

1. ✅ **For developers**: Start with [MASTER-INSTRUCTIONS.md](./MASTER-INSTRUCTIONS.md)
2. ✅ **For architects**: Read [agents/architect.md](./agents/architect.md)
3. ✅ **For reviewers**: Check [agents/independent-reviewer.md](./agents/independent-reviewer.md)
4. ✅ **For CI recovery**: Use [skills/ci-failure-triage/](./skills/ci-failure-triage/)
5. ✅ **For deep dive**: Read [ENGINEERING-STANDARDS.md](./ENGINEERING-STANDARDS.md)

---

## Questions or Feedback?

This framework is version 1.0 and improves quarterly based on:
- Patterns observed in actual work
- Blockers that prevent progress
- Rules that aren't clear
- Lessons from incidents

If you find a gap or conflict, report it. Framework updates require evidence.

---

**Remember**: Governance is not bureaucracy. These rules exist because violating them broke things before. Follow them, and your work ships faster and safer.

Good luck. 🚀
