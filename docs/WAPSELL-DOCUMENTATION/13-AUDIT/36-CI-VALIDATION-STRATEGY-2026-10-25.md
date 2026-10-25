# CI Validation Strategy — 2026-10-25

## Objective

Reduce repeated setup and test-run overhead without weakening the checks required before integration or delivery. CI duration improvements must be measured from workflow-run timestamps; a structural optimization is not itself proof of a time reduction.

## Validation levels

### Level 1 — Fast feedback during development

Run the smallest useful checks while editing:
1. Formatting check on changed files (prettier --check; do not rewrite files implicitly).
2. ESLint on changed files using the CLI directly. The API package's lint script currently includes --fix, so do not use it as a read-only validation command.
3. API TypeScript/build check when source or compiler configuration changes: npm run build --workspace=@otrarondamas/api.
4. The unit test(s) related to the change, then the focused unit suite if the dependency path is unclear.
5. For an integration/authorization/tenant change, run the focused integration test against a disposable test database.

Do not run all integration/E2E suites after every local edit. If a focused check fails, classify and diagnose it before expanding the test scope.

### Level 2 — Before integration (pull request)

Required evidence is selected by change scope:
- API source or compiler changes: API build and unit tests.
- Integration, Prisma schema, persistence, authorization, or tenant-isolation changes: the relevant integration/tenant suites as well.
- API contract changes: contract/HTTP tests and compatibility checks.
- Quality/duplication: the repository's configured quality gate, when enabled for the PR.

Current workflow ownership:
- **B4 Verification Infrastructure** owns API build, full unit regression, existing tenant isolation, S-V1, FS-1a, and messaging HTTP integration verification on PRs to main.
- **B3 Tenant Isolation Candidate** owns the additional B3 relation/tenant candidate suites when API-related paths change.
- B3 no longer repeats the build and full unit suite on PR events because B4 already runs them. B3 retains those checks on direct push events, where B4 is not guaranteed to trigger.
- B4 and B3 each group their compatible integration specs into one Jest invocation to avoid repeated Jest/ts-jest startup.
- Keep B3's push.paths and pull_request.paths lists aligned. Do not make required checks disappear through path filters.

### Level 3 — Before declaring delivery complete

Verify the required full regression and delivery state:
1. Relevant post-merge regression workflow completed successfully.
2. API and affected frontend builds pass.
3. End-to-end commercial flows pass when they are affected by the change.
4. Required quality/security checks pass.
5. PR is merged to the intended base, destination branch contains the expected merge commit, and all required workflows are complete.
6. Report passed, failed, skipped, and unrun checks separately. A merged PR alone does not close a delivery gate.

## Failure classification

Every failed check must have exactly one primary classification:
- **Implementation error** — product code violates expected behavior.
- **Test error** — assertion, fixture, mock, selector, or test setup is incorrect/stale.
- **Infrastructure problem** — runner, database service, network, external provider, or CI service failure.
- **Dependency or configuration** — package/lockfile, runtime, generated client, environment, or workflow setup.
- **Regression** — previously passing or supported behavior fails due to a change.

Record a secondary subtype where helpful (API contract, database transaction/cleanup, flaky/order-dependent test, authorization, migration, etc.). If evidence is insufficient, mark the classification provisional instead of guessing.

## Failure-handling policy

- Inspect the exact run, job, step, commit SHA, and first meaningful error before rerunning.
- Fix implementation/test/configuration causes; retry infrastructure failures only when the cause makes a retry meaningful.
- Rerun failed jobs rather than successful jobs when GitHub Actions supports it.
- Do not modify assertions just to obtain a green run.
- Preserve logs/evidence sufficient to avoid re-investigating the same failure.
- Do not report CI as passing until the relevant run has a successful conclusion.

## Optimization evidence

The workflow changes in this revision reduce duplicate work and Jest process startups:
- B3: skips duplicate build and full unit checks on pull-request events (B4 owns those gates), while retaining them for direct pushes.
- B3: runs its 14 explicit candidate integration specs in one Jest process rather than one process per spec.
- B4: runs tenant isolation plus discovered S-V1, FS-1a, and messaging HTTP integration specs in one Jest process.

Measure actual elapsed time from GitHub Actions before/after runs on comparable commits. If the next run shows no improvement, inspect step durations rather than adding speculative caches or weakening test coverage.
