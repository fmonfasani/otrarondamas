# Wapsell Project Workflow
## Canonical Execution Protocol

**Last Updated:** 2026-11-03  
**Version:** 1.0 (Post-Consolidation)  
**Status:** Active

---

## 1. CONTEXT LOADING (Before Starting Work)

**Every new Claude Code session should:**

1. **Load project context** (in order)
   - `PROJECT_CONTEXT.md` — current state, quick decisions
   - `DECISIONS-CURRENT.md` — approved decisions, timeline
   - `CLAUDE.md` — engineering principles
   - `.claude/MASTER-INSTRUCTIONS.md` — task contracts

2. **Verify Git state**
   ```bash
   git branch -vv              # See current branch & tracking
   git log --oneline -3        # Recent commits
   git worktree list           # All worktrees
   git status --short          # Dirty state
   ```

3. **Identify your working tree**
   - **Primary:** `d:/Software Development/Porfolio/OtraRondaMas`
   - **Feature:** Use dedicated worktree for your feature work
   - **Never modify primary checkout** for experimental/feature work

4. **Know the critical branches**
   - `feat/phase1-remix-foundation` (P1, ready to merge)
   - `origin/main` (canonical Remix baseline, 0fae0b9)
   - `main` (local, diverged — do not use for merging)

---

## 2. TASK INTAKE

**When starting a new task:**

### Step 1: Understand the Scope
- [ ] Is this a reconciliation task? (Nov 3-15 timeline)
- [ ] Is this a Phase 1-6 execution task? (post-Nov 15)
- [ ] Is this a bug fix / quick improvement?
- [ ] Does it require architectural decision? (escalate to user)

### Step 2: Read the Task Contract
- What is the desired outcome?
- What is NOT in scope? (protected areas)
- What tests must pass?
- What evidence is required?
- What is the Definition of Done?

### Step 3: Check Architecture Boundaries
- [ ] No changes to NestJS backend contracts
- [ ] No changes to PostgreSQL schema
- [ ] No changes to authentication model
- [ ] No new application servers
- [ ] No direct frontend-to-database access
- [ ] Multi-tenant isolation preserved

### Step 4: Identify Changed Files
- Which files will be modified?
- Are there related tests?
- Are there related decisions or docs?
- Are there cross-cutting concerns?

---

## 3. IMPLEMENTATION

### Step 1: Create a Feature Branch
```bash
# Create from canonical baseline
git checkout -b feat/your-feature origin/main

# Or use a worktree for isolation
git worktree add worktrees/your-feature origin/main
cd worktrees/your-feature
git checkout -b feat/your-feature
```

### Step 2: Implement with Preservation
- **Never** use `git reset --hard`, `git clean -fd`, `git checkout .`
- **Never** force-push or force-merge
- **Always** verify existing uncommitted work before modifying a branch
- **Preserve** any pre-existing changes

### Step 3: Safe Git Operations
Instead of stashing (which is shared between worktrees):
```bash
# Create a WIP commit to preserve work temporarily
git add -A
git commit -m "WIP: description - temporary commit"

# Later, after other work is integrated, you can amend or rebase
git rebase -i origin/main
```

### Step 4: Tests Required (Minimum)
```bash
npm run lint          # Type safety + code style
npm run typecheck     # TypeScript validation
npm run test          # Unit + integration tests
npm run build         # Production build
```

Prefer focused tests first, then broader validation.

---

## 4. CHANGE VERIFICATION

### Before Committing
```bash
git diff --cached     # Review staged changes
git status            # Verify all changes are accounted for
```

### Before Pushing
```bash
npm run build         # Production build succeeds
npm run test          # All tests pass
git log --oneline -5  # Recent commit history clear
```

### Before Creating a PR
```bash
git push origin feat/your-feature
gh pr create --title "..." --body "..."

# PR body must include:
# - What problem does this solve?
# - What changed?
# - How was it tested?
# - Relevant issue links
```

---

## 5. CODE REVIEW & MERGE

### PR Review Checklist
- [ ] Scope is in-bounds (matches task contract)
- [ ] Architecture constraints preserved
- [ ] Tests pass locally and in CI
- [ ] No secrets exposed
- [ ] Final diff reviewed for unexpected changes
- [ ] Commit messages are clear

### Merge Criteria
- [ ] At least one approval (if team review required)
- [ ] All CI checks pass
- [ ] No conflicts with base branch
- [ ] No force-push needed

### After Merge
```bash
# Sync local branches
git fetch origin
git rebase origin/main main
git rebase origin/main feat/phase1-remix-foundation  # etc
```

---

## 6. DECISION UPDATES

**If task involved a decision:**

1. **Was the decision pre-approved?**
   - Yes → No action needed
   - No → Stop and escalate to user

2. **Did implementation change a decision?**
   - Update `docs/DECISIONS-CURRENT.md`
   - Add evidence (commit SHA, test results)
   - Update status (APPROVED, CONDITIONAL, UNRESOLVED)

3. **Any new unresolved conflicts?**
   - Document in `docs/DECISIONS-CURRENT.md`
   - Flag for next milestone review

---

## 7. DOCUMENTATION UPDATES

**If task involved a feature or change:**

1. **Update relevant docs:**
   - `ARCHITECTURE.md` (if architecture changed)
   - `docs/implementation/` (if Phase execution changed)
   - `.claude/MASTER-INSTRUCTIONS.md` (if task contract changed)
   - `PROJECT_CONTEXT.md` (if current state changed)

2. **Keep docs in sync with code:**
   - If you see a doc that contradicts implementation, fix the doc
   - If implementation requires doc, update it before merging
   - Broken links? Fix them

3. **Archive obsolete docs:**
   - Move to `docs/HISTORICAL/` with a note explaining why
   - Update any references pointing to it

---

## 8. WORKTREE LIFECYCLE

### Creating a Worktree
```bash
git worktree add worktrees/my-feature origin/main
cd worktrees/my-feature
git checkout -b feat/my-feature
```

### Working in a Worktree
- Each worktree is independent
- Shared stash across all worktrees (use WIP commits instead)
- Shared branch references (all worktrees see same remote branches)

### Preserving Work
```bash
# Before removing a worktree, preserve any unique work
cd worktrees/my-feature
git add -A && git commit -m "WIP: description"
git push origin feat/my-feature
```

### Removing a Worktree
```bash
# Only after work is preserved and integrated
git worktree remove worktrees/my-feature
```

---

## 9. HANDLING CONFLICTS

### If you hit a Git conflict
1. **Do not force-push or force-reset**
2. **Identify the conflict**
   ```bash
   git status          # See conflicted files
   git diff            # See actual conflicts
   ```
3. **Resolve intentionally**
   - Read both sides
   - Understand why the conflict exists
   - Preserve valid work from both sides if possible
4. **Test after resolving**
   - Run lint, typecheck, tests
5. **Document if complex**
   - Commit message explains resolution reasoning

### If you hit an architectural conflict
1. **Stop. Do not merge.**
2. **Document the conflict with evidence**
3. **Present to user**
4. **Wait for decision**

---

## 10. EVIDENCE & REPORTING

**Every task must end with a report containing:**

1. **What changed**
   - Files modified, added, deleted
   - Lines of code changed
   - Test results

2. **How it was tested**
   - Commands run
   - Exit codes / results
   - Coverage if applicable

3. **Evidence of correctness**
   - Build passes: `npm run build` ✅
   - Tests pass: `npm run test` ✅
   - Lint passes: `npm run lint` ✅
   - No secrets exposed ✅

4. **Remaining blockers**
   - Any unresolved conflicts
   - Any decisions needed
   - Any limitations

5. **Next immediate step**
   - One sentence: what should happen next
   - Or: task complete, ready for next phase

**Never claim success without evidence.**

---

## 11. SPECIAL WORKFLOWS

### Reconciliation Workflow (Nov 3-15)
See: `docs/implementation/WAPSELL-FORENSIC-AUDIT-ACTION-PLAN.md`

Steps:
1. Merge PR #107 (feat/phase1-remix-foundation)
2. Preserve feature work (e2e-tests, p6, p5)
3. Delete legacy apps (Next.js, POS, Tienda)
4. Verify & document

### Phase 1-6 Execution Workflow (Nov 15+)
See: `docs/implementation/WAPSELL-REMIX-FULL-EXECUTION-PLAN.md`

24 specialized agents across 6 phases:
- Each phase has 4 agents (architect, components, integration, validation)
- Each agent has clear output/deliverable
- Agents work in parallel within a phase

### Hotfix Workflow
1. Create branch from origin/main: `git checkout -b hotfix/critical-bug origin/main`
2. Implement fix + tests
3. Merge to main + origin/main
4. Tag as hotfix version if production-blocking

---

## 12. ESCALATION CRITERIA

**Stop work and escalate to user if:**

1. **Architecture conflict**
   - Task requires changing ARCH-FE-001 principles
   - Task requires new backend, database, or app server
   - Task violates tenant isolation

2. **Unresolved decision**
   - Multiple valid approaches, none obviously better
   - Requires business/product judgment
   - Crosses team or component boundaries

3. **Scope creep**
   - Task grew beyond original definition
   - New requirements emerged during implementation
   - Dependency on another unstarted task

4. **Data loss risk**
   - Operation could irreversibly delete or corrupt data
   - No safe way to recover
   - No adequate testing environment

**Escalation format:**
- What is the blocker?
- What are the options?
- What is your recommendation?
- What evidence supports it?

---

## 13. DEFINITION OF DONE

**A task is complete when:**

- [ ] Scope from task contract is fully addressed
- [ ] Architecture constraints are preserved
- [ ] All required tests pass
- [ ] Code is reviewed (if needed) and approved
- [ ] Documentation is updated
- [ ] Changes are committed and pushed
- [ ] Evidence report is provided
- [ ] Next action is clear
- [ ] No work is lost or unexplained

---

## 14. COMMUNICATION & HANDOFF

### Between Claude Code Sessions
- Leave a note in `PROJECT_CONTEXT.md` if major state changed
- Update `DECISIONS-CURRENT.md` if decisions shifted
- Commit work with clear messages
- Do not require user to read git logs to understand what happened

### Between Team Members (if applicable)
- PR description explains "why" not "what" (code shows what)
- Comment on complex logic
- Link related issues and PRs
- Document non-obvious workarounds

### For Future Maintenance
- Keep `PROJECT_CONTEXT.md` current
- Keep `DECISIONS-CURRENT.md` authoritative
- Move old decisions to `HISTORICAL` with explanations
- Archive obsolete docs instead of deleting

---

## 15. EXAMPLE: TYPICAL TASK LIFECYCLE

```
1. Load context (5 min)
   ├─ Read PROJECT_CONTEXT.md
   ├─ Read DECISIONS-CURRENT.md
   ├─ Check git status
   └─ Understand architecture boundaries

2. Create feature branch (2 min)
   ├─ git checkout -b feat/task-name origin/main
   └─ (Or use git worktree add for isolation)

3. Implement (variable)
   ├─ Write code
   ├─ Run lint: npm run lint
   ├─ Run tests: npm run test
   └─ Build: npm run build

4. Verify changes (10 min)
   ├─ Review git diff
   ├─ Check no secrets exposed
   ├─ Verify tests pass
   └─ Run full test suite

5. Commit & push (5 min)
   ├─ git add relevant files
   ├─ Commit with clear message
   ├─ Push to origin
   └─ Create PR

6. Report results (10 min)
   ├─ What changed (files, impact)
   ├─ Test results (pass/fail, coverage)
   ├─ Evidence (commands, exit codes)
   ├─ Blockers (if any)
   └─ Next step

Total: ~30-60 min depending on complexity
```

---

**Questions?** Check `PROJECT_CONTEXT.md` or `.claude/MASTER-INSTRUCTIONS.md`  
**Ready to work?** Start at Section 1 (Context Loading)

🤖 Generated with Claude Code — Workflow v1.0 (2026-11-03)
