# Wapsell — Implementation Plan Audit & Final Gate

**Status:** DRAFT — AUDIT / NON-NORMATIVE  
**Date:** 2026-09-29  
**Scope:** `11-PLAN/00-IMPLEMENTATION-PLAN-v0.2.md` against the current Decision Register, Contracts, Invariants, Tests/Evals and documented AS-IS/TO-BE chain.

## 1. Purpose

This audit evaluates whether the current Plan is sufficiently controlled to derive the next TASKS layer without silently converting specification gaps into implementation work.

This document does not authorize implementation, schema changes, migrations, APIs, events, deployments, or product decisions.

## 2. Executive result

**RESULT: CONDITIONAL PASS — PLANNING BASELINE VALID, EXECUTABLE TASK DERIVATION NOT YET OPEN.**

The Plan is structurally aligned with the project SDD chain and correctly distinguishes planning waves from implementation authorization. It also preserves the distinction between AS-IS evidence and TO-BE requirements.

However, the Plan cannot currently open a general executable TASKS layer because:

- Architecture remains **NOT READY** and is a hard gate for structural implementation.
- Several domain-specific Open Details remain unresolved.
- The Contracts audit remains **CONDITIONAL PASS**, with reconciliation still required.
- The Invariants and Tests/Evals layers are refined but remain **DRAFT / NOT APPROVED**.
- D-003 contains a specific WhatsApp authority conflict that remains pending canonical Owner ruling.
- Some candidate waves contain specification work that must remain separate from implementation tasks.
- The Plan file itself contains a metadata inconsistency: its path is v0.2 while the document title still says **Implementation Plan v0.1**. This is a documentation defect, not a product decision.

The correct next step is therefore to create **only controlled specification/evidence tasks whose own task-local gates are satisfied**, not implementation tasks that alter the product architecture or data model.

## 3. Gate-by-gate audit

### G0 — Documentation baseline

**Result: CONDITIONAL / DOMAIN-LOCAL ONLY**

The Plan's principle is correct: readiness must be evaluated for the affected slice rather than assuming that every documentation layer is globally closed.

Current evidence:
- Decision Register: reconciled, with two-tier provenance.
- Contracts: audited but still conditional.
- Invariants: audited/refined, not approved.
- Tests/Evals: audited/refined, not approved for implementation.
- AS-IS evidence: available for several domains.

**Finding:** G0 cannot be interpreted as a global declaration that all Contracts are reconciled. Task-local evidence must identify the exact Contract and any unresolved audit finding affecting the task.

### G1 — Architecture readiness

**Result: NOT READY — HARD BLOCK FOR STRUCTURAL IMPLEMENTATION**

D-017 establishes modular-monolith direction, but the Architecture layer has not yet been approved.

Therefore no executable task may silently decide:
- domain/module decomposition beyond approved documentation;
- persistence ownership;
- API structure;
- event contracts;
- infrastructure topology;
- deployment architecture;
- migration architecture.

Architecture closure is therefore a prerequisite for structural implementation.

### G2 — Domain specification readiness

**Result: PARTIAL**

The Plan correctly requires the chain:

`Requirement / SPEC → Decision → Contract → Invariant → Test/Eval → AS-IS / TO-BE → Task → Evidence`

where applicable.

Current blockers include:
- D-003 specific WhatsApp clause;
- D-006 exact authorization mechanics;
- D-008 cancellation/reversal effects;
- D-011 reconciliation semantics;
- D-013 sensitive Cash authorization;
- D-015 AP lifecycle;
- D-016 detailed fulfillment lifecycle;
- Messaging physical/behavioral model;
- Architecture;
- canonical Branding/Design System;
- required NFR/security constraints.

A task may proceed only when its affected behavior does not depend on one of these unresolved areas.

### G3 — Task readiness

**Result: READY AS A TASK DEFINITION STANDARD, NOT AS A GLOBAL EXECUTION GATE**

The required task fields are appropriate:
- source requirement/decision;
- affected domain;
- AS-IS;
- TO-BE;
- Contract;
- Invariant where applicable;
- verification;
- evidence;
- dependencies/blockers;
- scope/non-scope;
- rollback/reversibility.

This should be enforced per task.

### G4 — Implementation

**Result: CLOSED**

No implementation task is currently globally authorized.

A task becomes implementation-ready only after its local G0/G1/G2/G3 conditions are satisfied and no unresolved Owner ruling affects it.

### G5 — Validation

**Result: PARTIAL**

The Plan correctly distinguishes code inspection, tests, execution, integration/E2E and documentation conformance.

Executable validation cannot yet be planned for behaviors whose normative definition remains open.

## 4. Sequencing audit

### Wave 0 — Documentation / evidence

**VALID as planning work.**

It should remain non-product-changing.

### Wave 1 — Identity / Tenancy

**PARTIALLY BLOCKED.**

Specification/evidence work can proceed.

Structural implementation remains blocked by Architecture and by D-006 where exact authorization mechanics are involved.

### Wave 2 — Commerce

**PARTIALLY BLOCKED.**

Customer/Business boundaries and existing behavior can be specified/audited.

Sale cancellation implementation must remain blocked where D-008 effect scope is required.

### Wave 3 — Inventory

**PARTIALLY READY FOR EVIDENCE / HARDENING SPECIFICATION.**

D-014 ownership/isolation and current transfer prohibition are sufficiently bounded.

D-010 still requires explicit separation between normative requirement and current implementation gap.

No implementation mechanism should be invented before Architecture/task-local readiness.

### Wave 4 — Cash / Payments / AR / AP

**CORRECTLY SPLIT, BUT DOMAIN-LOCAL BLOCKERS APPLY.**

Cash, external Payments, AR and AP must remain separate task families.

Cross-domain effects must not be implemented before their respective specifications are closed.

### Wave 5 — Fulfillment

**BLOCKED FOR BEHAVIORAL IMPLEMENTATION.**

D-016 detailed lifecycle remains open.

Domain ownership may be documented/evaluated without inventing states, tracking, zones, tariffs or evidence models.

### Wave 6 — Messaging

**SPECIFICATION-FIRST.**

No Conversation/Message physical model or realtime implementation should be created from conceptual contracts alone.

D-003's pending WhatsApp clause must remain visibly unresolved.

### Wave 7 — Branding

**SPECIFICATION-FIRST.**

The canonical Branding/Design System specification is still required before implementation.

### Wave 8 — CI/CD

**CROSS-CUTTING / LATER.**

D-018 should not be treated as a business-domain implementation wave. Its executable work depends on Architecture, test strategy and engineering governance.

## 5. Task-classification audit

The Plan should distinguish at least these task classes:

1. **SPEC-CLOSURE** — resolve/document an Open Detail or produce a controlled specification artifact.
2. **ASIS-EVIDENCE** — inspect and document current implementation behavior.
3. **ARCHITECTURE** — define/approve structural architecture before structural implementation.
4. **TEST-DERIVATION** — refine verification definitions without executing implementation.
5. **IMPLEMENTATION** — modify software only after all local gates pass.
6. **VALIDATION** — execute approved tests/evidence procedures.
7. **REVIEW/DELIVERY** — review and deliver a validated increment.

This classification prevents specification work from being disguised as implementation.

## 6. Tasks that are currently eligible in principle

Only task-local work that does not depend on unresolved Owner rulings or unapproved architecture may be considered.

Examples of eligible classes:
- AS-IS repository verification for a clearly bounded existing behavior;
- documentation reconciliation where no new decision is created;
- Architecture specification work itself, provided it does not silently implement the architecture;
- canonical Design System/Branding specification work;
- refinement of existing test/eval documentation without execution;
- evidence collection for existing modules.

These are candidate task classes, not authorized concrete tasks.

## 7. Tasks currently blocked

The following implementation classes must remain blocked:

- User/Membership schema migration;
- new Membership persistence implementation;
- API redesign;
- Conversation/Message schema;
- Messaging realtime implementation;
- payment gateway implementation before D-011/task readiness;
- Sale cancellation effects across Inventory/Cash/Payments/AR before D-008 matrix;
- sensitive Cash authorization implementation while its ruling remains pending;
- AP lifecycle implementation before D-015 specification;
- detailed Fulfillment workflow implementation before D-016 specification;
- AI activation;
- WhatsApp/channel integration while the exact D-003 authority issue remains unresolved;
- infrastructure/microservices migration;
- production deployment.

## 8. Preservation audit

The Plan correctly identifies preservation of AS-IS functionality as a task obligation.

Every implementation task affecting existing behavior must explicitly state whether the behavior is:
- preserved;
- adapted;
- deprecated;
- replaced.

No replacement should be inferred from architectural transformation alone.

## 9. Evidence audit

The Plan correctly separates:

**AS-IS VERIFIED BY CODE**

from:

**TO-BE DOCUMENTED**

and from:

**VERIFIED BY TEST / EXECUTION**

No current document in the chain establishes implementation compliance merely by defining a Contract, Invariant or Test candidate.

## 10. Documentation defect

The current file path is:

`docs/WAPSELL-DOCUMENTATION/11-PLAN/00-IMPLEMENTATION-PLAN-v0.2.md`

but its title currently states:

`Wapsell — Implementation Plan v0.1`

This should be corrected in a documentation-only follow-up so the artifact identity is internally consistent. It does not affect the substantive gate result.

## 11. Final advancement gate

| Gate | Status |
|---|---|
| Plan structure coherent | PASS |
| Wave sequencing controlled | PASS WITH DOMAIN-LOCAL BLOCKERS |
| AS-IS preservation rule | PASS |
| Specification vs implementation separation | PASS |
| Contracts globally reconciled | NOT YET |
| Invariants approved | NOT YET |
| Tests/Evals approved for implementation | NOT YET |
| Architecture approved | NOT READY |
| General implementation Tasks authorized | NO |
| Specification/evidence Tasks potentially derivable | YES, task-local review required |

### Final status

**PLAN BASELINE: CONDITIONALLY VALIDATED FOR CONTROLLED TASK DERIVATION.**

**EXECUTABLE IMPLEMENTATION TASKS: NOT YET OPEN.**

**NEXT CONTROLLED STEP: derive a small TASKS baseline containing only specification/evidence/architecture work whose local prerequisites are satisfied; do not create implementation tasks until their task-local gates pass.**

## 12. Non-actions

This audit does not:
- create business decisions;
- approve reconstructed decision wording;
- resolve D-003/D-006/D-008/D-011/D-013/D-015/D-016;
- approve Architecture;
- define schemas, APIs, events or identifiers;
- modify application code;
- execute tests;
- deploy anything.
