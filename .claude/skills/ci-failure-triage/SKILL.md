---
name: ci-failure-triage
description: Diagnose failing local checks and GitHub Actions runs using reproducible evidence. Use when builds, lint, unit/integration/E2E tests, database setup, or CI workflows fail or behave inconsistently.
---

# CI Failure Triage

## Goal
Identify the smallest proven cause of a failing check and produce a safe, testable remediation plan. This skill is diagnostic first; it does not authorize implementation, workflow reruns, or changes to CI policy.

## Inputs to establish
- Repository, branch, current HEAD SHA, working-tree status, and pre-existing changes.
- Exact command or workflow name/path, run ID, commit SHA, job, and failed step.
- Expected behavior and authoritative source for that expectation.
- Runtime prerequisites: Node/npm versions, environment variable *names* (never values), database/service availability, and generated artifacts.

## Procedure
1. **Protect the baseline**
   - Inspect Git state and existing diffs before any operation.
   - Never use reset, clean, checkout-overwrite, stash, or other destructive actions to simplify diagnosis.
   - Do not reveal credentials or copy secrets into logs/reports.

2. **Locate the actual failure**
   - Read the workflow file from the repository; do not guess workflow names.
   - Inspect the exact failed job/step logs and associate them with the commit SHA.
   - For local failures, record the exact command, exit code, first meaningful error, and relevant stack/assertion.
   - If evidence is unavailable, report the task as BLOCKED rather than inferring the failure.

3. **Classify**
   Choose one primary category and note secondary factors:
   - application implementation defect
   - incorrect or stale test/fixture
   - ambiguous or violated business/API contract
   - database integrity, transaction, migration, or cleanup issue
   - dependency, toolchain, generated-client, or lockfile issue
   - missing service, environment, or configuration
   - flaky/order-dependent test
   - external CI/provider failure

4. **Trace causality**
   - Follow the failing path through test setup, request/DTO validation, controller, service, persistence, and teardown as applicable.
   - For HTTP failures, capture expected versus actual status and response/error details.
   - For database errors, identify the exact constraint, relation, transaction boundary, and cleanup ordering before recommending changes.
   - For multi-tenant paths, verify tenant context and authorization at every boundary.
   - Compare expected behavior with an authoritative decision/spec or verified existing behavior. A comment or mock alone is not a contract.

5. **Reproduce safely**
   - Prefer the narrowest relevant test, then the relevant suite.
   - Use only disposable/local test infrastructure. Never target production or a shared database.
   - Do not blindly rerun remote workflows. First determine whether a rerun can add evidence.
   - Do not edit assertions or fixtures merely to turn a check green.

6. **Recommend remediation**
   - State root cause only when the evidence links the observed failure to a specific code path or environment condition.
   - Label unproven explanations as hypotheses.
   - Propose the smallest change, affected files, regression test, and exact validation commands.
   - Separate code fixes from environment fixes and business decisions requiring owner authorization.

## Required report
- Branch and failing SHA.
- Workflow/run/job/step or exact local command and exit code.
- Failure observation and source evidence.
- Classification and proven root cause, or explicit hypotheses/blocker.
- Minimal remediation plan and regression coverage.
- Checks passed, failed, skipped, and not run.
- Status: **PASS**, **FAIL**, or **BLOCKED**, scoped to the specific check.

## Completion rule
A successful focused test does not establish that the whole workflow or release gate is closed. Report only the checks supported by actual evidence.