# Deterministic engineering tools

Phase 3 introduces small, read-only or validation-only command-line tools that emit machine-readable evidence for Claude Code and human reviewers. They are aids, not release gates by themselves.

## Prerequisites
- Node.js (built-in modules only for these scripts).
- Git for repository-state inspection.
- npm and installed project dependencies for workspace validation.
- GitHub CLI (gh) installed and authenticated for CI evidence collection.

## Tools

### check-git-state.js
```sh
node tools/engineering/check-git-state.js
```
Reports repository root, branch, HEAD, upstream, tracked/untracked working-tree status, and staged/unstaged diff summaries as JSON. It is read-only. Run before editing or delivery; a clean status is not proof of correctness.

### validate-module.js
```sh
node tools/engineering/validate-module.js <workspace-name> [test|build|lint|all]
```
Resolves a workspace declared under apps/* or packages/*, then invokes only its already-declared npm scripts. all attempts test, build, and lint in that order and stops after the first failure. Missing scripts are reported as skipped; they are not counted as passing. It does not install dependencies, generate clients, mutate schemas, or run migrations.

### collect-ci-evidence.js
```sh
node tools/engineering/collect-ci-evidence.js [commit-sha]
```
Collects GitHub Actions runs for the exact commit SHA using gh run list. Defaults to local HEAD. It is read-only and does not rerun workflows. No returned run means CI is unverified, not passed. Review required checks and run recency before making a gate decision.

## Safety and limitations
- Tools are scoped to local repository metadata, existing workspace scripts, or GitHub Actions metadata.
- No tool merges, pushes, deploys, changes production data, runs migrations, installs dependencies, or edits application files.
- They do not replace focused tests, security review, independent diff review, or owner authorization.
- JSON output may include command output and paths; inspect it before sharing externally. Do not pass secrets through arguments or environment values.
- PASS applies only to the specific check executed, not the full release.
