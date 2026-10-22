---
name: sdd-workflow
description: Run a traceable spec-driven development workflow for Wapsell and Otra Ronda Más. Use when planning or implementing features, bug fixes, API changes, architecture work, or changes that require explicit acceptance criteria and verification.
---

# Spec-Driven Development Workflow

## Goal
Translate a request into a bounded, evidence-based change with traceable acceptance criteria, minimal implementation, and independently verifiable results.

## Phase 0 — Establish the baseline
1. Inspect branch, HEAD, upstream, working-tree status, staged/unstaged diffs, and relevant untracked files.
2. Identify pre-existing changes and protected areas. Never overwrite, discard, reset, or clean user work.
3. Read repository instructions, relevant package scripts, tests, workflows, source files, and available canonical documentation.
4. Confirm the working environment and dependencies before claiming a check can run.

## Phase 1 — Specify
Write a concise change brief containing:
- Problem and intended outcome.
- Product boundary: operational Otra Ronda Más AS-IS or Wapsell TO-BE.
- Evidence of current behavior, with file/symbol/test references.
- Authoritative requirement or decision; list unresolved conflicts rather than resolving them by inference.
- In scope and out of scope.
- Observable acceptance criteria, including negative/security cases where relevant.
- Compatibility, data, migration, rollout, and regression risks.
- Validation commands and required evidence.

Do not treat mockups, roadmap items, proposed schemas, or target-state specs as proof that a capability is implemented. Do not invent business rules or mark an unresolved decision as approved.

## Phase 2 — Decide whether implementation is authorized
Proceed with bounded implementation only when scope and acceptance criteria are clear and the request authorizes implementation.
Stop and report evidence if the next step would change an approved business contract, public API contract, schema, migration strategy, security boundary, architecture, protected data, or restricted Git/deployment operation without authorization.

## Phase 3 — Implement minimally
1. Re-read the relevant source and tests before editing.
2. Change only the files necessary for the agreed scope.
3. Preserve established patterns and API compatibility unless a change is explicitly approved.
4. Do not bundle unrelated refactors, dependency upgrades, formatting churn, or opportunistic cleanup.
5. Add or update tests that prove the acceptance criteria. Do not weaken assertions to match incorrect behavior.
6. For tenant-sensitive behavior, test both authorized access and cross-tenant denial.
7. For database changes, inspect schema and migration history, relational constraints, compatibility, and rollback implications before proposing the change.

## Phase 4 — Verify
Run checks in this order where applicable:
1. Focused test for the changed behavior.
2. Relevant unit/integration/E2E suite.
3. Build and lint.
4. Broader required checks or workflow.
5. Final diff review and working-tree inspection.

For each check, record command, exit status, result, and any environment limitation. Distinguish local tests from remote CI. Do not claim a test was run based only on a script definition or an agent summary.

## Phase 5 — Independent review
Provide the reviewer with:
- Base and head SHA.
- Exact diff and stated scope.
- Acceptance criteria.
- Commands and raw verification evidence.
- Known limitations and decisions still open.

The reviewer should be read-only and should not review uncommitted changes as though they were part of a commit.

## Phase 6 — Delivery and closure
Report:
- Result and current state.
- Branch/commit/PR where applicable.
- Tests and CI evidence.
- Remaining blockers or decisions.
- One next action only if needed.

Do not commit, push, merge, deploy, or close a release gate unless explicitly authorized and all applicable criteria are evidenced.

## Definition of done
A change is done only when acceptance criteria are traceable, the final diff is within scope, relevant verification evidence is available, independent review findings are addressed or explicitly accepted, and remaining blockers are honestly reported.