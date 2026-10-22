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
- `.claude/skills/`: reusable `ci-failure-triage`, `sdd-workflow`, `tenant-isolation-audit`, and `api-contract-audit` procedures are present in v1; further skills remain planned.
- `tools/engineering/`: planned deterministic local checks; scripts must be tested before being treated as gates.
- `docs/engineering/`: this kit's design, catalog, and quality criteria.

## Operating principles
1. Inspect before changing.
2. Preserve the existing working tree.
3. Make the smallest in-scope change.
4. Prefer deterministic checks and explicit evidence.
5. Keep diagnosis, implementation, and independent review separate.
6. Never report a gate as closed without the required evidence.

## Current phase
**Phase 1 — Foundation.** Repository guidance and baseline rules only. No application code, database schema, production configuration, or business contracts are changed by this phase.

## Delivery criteria for Phase 1
- Guidance accurately describes the repository boundary and evidence rules.
- Rules are concise, non-contradictory, and safe by default.
- No application runtime behavior is changed.
- Changes are reviewed in a dedicated branch and validated before merge.