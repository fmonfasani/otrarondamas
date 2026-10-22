# Wapsell Engineering Kit

## Objective
A repository-versioned operating layer for Claude Code that makes engineering work repeatable, evidence-based, and safer. The kit is initially focused on repository understanding, CI recovery, API contract verification, tenant isolation, and release readiness.

## Repository boundary
- **Otra Ronda Más AS-IS:** the existing operational ERP/POS and online-store code.
- **Wapsell TO-BE:** the future conversational-commerce, multi-business platform described by product documentation.
- A target design is not evidence that its feature is implemented. Preserve this distinction in analysis, code, tests, and reports.

## Components
- `CLAUDE.md`: repository-wide context and execution contract.
- `.claude/rules/`: persistent topic-specific constraints.
- `.claude/agents/`: specialist agents for architecture, CI recovery, and independent review are present in v1; additional domain agents remain planned.
- `.claude/skills/`: reusable `ci-failure-triage` and `sdd-workflow` procedures are present in v1; further skills remain planned.
- `tools/engineering/`: deterministic local checks; their smoke tests run in B4 Verification CI.
- `docs/engineering/`: this kit's design, catalog, and quality criteria.

## Operating principles
1. Inspect before changing.
2. Preserve the existing working tree.
3. Make the smallest in-scope change.
4. Prefer deterministic checks and explicit evidence.
5. Keep diagnosis, implementation, and independent review separate.
6. Never report a gate as closed without the required evidence.

## Current phase
**Phase 3 — Deterministic engineering tools (implementation complete; CI verification pending).** The three CLI tools provide read-only Git-state and CI-evidence collection plus a workspace validation runner. These tools produce evidence; they do not independently close quality or release gates. Phase 2 agent completion remains unverified and is intentionally deferred.

## Delivery criteria for Phase 3
- Tools use only built-in Node.js modules and existing Git/npm/GitHub CLI capabilities.
- Git and CI collection are read-only; workspace validation invokes only scripts already declared by the selected workspace.
- Invalid arguments and unavailable prerequisites return explicit errors.
- Smoke tests cover CLI help and representative invalid input.
- Smoke tests execute in B4 Verification CI.
- Verify PR CI on the final SHA, inspect the final diff, and confirm the smoke-test job passes before declaring the phase complete.
