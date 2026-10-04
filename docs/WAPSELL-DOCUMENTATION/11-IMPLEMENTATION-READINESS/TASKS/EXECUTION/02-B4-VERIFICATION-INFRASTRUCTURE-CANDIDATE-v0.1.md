# B4 — VERIFICATION INFRASTRUCTURE CANDIDATE TASK v0.1

**Status:** PROPOSED — NOT AUTHORIZED FOR EXECUTION
**Class:** VERIFICATION INFRASTRUCTURE
**Scope:** B4 Implementation Readiness
**Owner authority:** OD-B4-02 — approved
**Product implementation:** NOT AUTHORIZED

## 1. Objective

Establish the minimum reusable verification infrastructure required to execute controlled B1/B2/B3 tests without modifying product behavior, Prisma schema, migrations or domain contracts.

## 2. Scope

- repair or complete the existing Jest test harness where required;
- establish deterministic test fixtures for at least two Business contexts;
- establish PostgreSQL/Prisma integration-test support;
- provide reusable setup/teardown boundaries;
- prepare smoke/regression execution support;
- prepare CI verification support if the repository's existing CI surface is confirmed absent;
- preserve the existing seed and avoid destructive data changes.

## 3. Non-scope

- tenant-isolation product behavior changes;
- User/Business/Membership schema changes;
- migrations;
- API/domain behavior changes;
- implementation of ISO-009 ownership;
- implementation of B3-SLICE-001;
- declaring any invariant VERIFIED;
- claiming [T] or [E] before actual execution.

## 4. Dependencies

- OD-B4-01 — B4 scope approved;
- OD-B4-02 — verification infrastructure permitted;
- existing Jest configuration and health spec;
- existing PostgreSQL/Compose environment;
- existing seed fixture including empresaAislamiento.

## 5. Expected evidence

- [C] exact test infrastructure files and configuration;
- [T] tests executed successfully, only after explicit execution authorization;
- [E] real PostgreSQL integration execution, only after explicit execution authorization;
- [D] reconciliation of any infrastructure gap discovered during implementation.

## 6. Promotion gate

This candidate must remain PROPOSED until the Owner or project authority explicitly authorizes its execution. Approval of OD-B4-02 permits this class of work but does not itself constitute execution authorization for this specific task.

## 7. Success criteria

1. Test harness can execute a deterministic test suite.
2. Two-Business fixtures can be created and isolated without modifying product schema.
3. PostgreSQL integration execution can be invoked reproducibly.
4. Existing health test remains preserved.
5. No product behavior, schema, migration or domain contract is changed.
6. All execution evidence is recorded using [T]/[E] only after real execution.

**Current state: PROPOSED — NOT AUTHORIZED.**