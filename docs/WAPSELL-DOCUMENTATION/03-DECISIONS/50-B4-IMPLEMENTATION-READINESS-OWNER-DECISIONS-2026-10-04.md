# B4 — IMPLEMENTATION READINESS — OWNER DECISION CLOSURE — 2026-10-04

**Status:** OWNER-APPROVED — RECORDED FOR PROPAGATION
**Scope:** B4 as the transversal Implementation Readiness stage over B1/B2/B3.
**Implementation:** PARTIALLY AUTHORIZED FOR VERIFICATION INFRASTRUCTURE ONLY, subject to task-local authorization.
**Product code / schema / migration / data changes:** NOT AUTHORIZED.

## 1. B4 scope decision

**OD-B4-01 — Option A approved.**

B4 is the transversal **Implementation Readiness** stage over B1, B2 and B3. It is not a new domain block.

Its purpose is to determine whether bounded work has sufficient documentary, technical and verification readiness to become an implementation task.

## 2. Verification infrastructure decision

**OD-B4-02 — Option B approved.**

Verification infrastructure may be implemented before B3 is fully VERIFIED, provided that the work:

- does not modify product behavior;
- does not modify the Prisma schema or migrations;
- does not change domain contracts;
- does not silently close an open normative decision;
- remains explicitly scoped as verification infrastructure.

This includes, when derived into an authorized task:

- Jest test harness;
- fixtures;
- integration-test support;
- test configuration/scaffolding repair;
- smoke tests;
- CI verification infrastructure.

B3 tests that depend on unresolved B3 technical conditions remain conditional and must not be presented as executed evidence.

## 3. Permitted parallel work

The following may be prepared/implemented when task-local gates are satisfied:

- verification infrastructure;
- tests whose normative source is already closed in B1/B2;
- regression/smoke coverage that does not alter product behavior.

B3 product implementation remains outside this authorization.

## 4. Explicit exclusions

This decision does not authorize:

- tenant-isolation implementation changes;
- User/Business/Membership schema changes;
- migrations;
- product API changes;
- domain behavior changes;
- closing B3 readiness;
- declaring invariants VERIFIED;
- [T] or [E] evidence without execution.

## 5. Evidence

- [T]: 0.
- [E]: 0.
- This document records Owner decisions only.

**Propagation required:** Decision Register, B4 preparatory/readiness artifacts, Transformation Plan and Task Execution Set.
