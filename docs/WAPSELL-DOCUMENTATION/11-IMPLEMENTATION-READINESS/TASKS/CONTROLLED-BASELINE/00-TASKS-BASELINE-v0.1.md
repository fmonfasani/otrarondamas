# Wapsell — Tasks Baseline v0.1

**Status:** DRAFT — TASK BASELINE / NOT APPROVED FOR EXECUTION  
**Date:** 2026-09-29  
**Layer:** Tasks  
**Authority:** Plan v0.2 + Plan Audit + Decision Register + current Contracts / Invariants / Tests-Evals + AS-IS / TO-BE  
**Purpose:** establish only controlled specification, architecture and evidence tasks whose scope is supported by the current documentation chain.

> This baseline does not authorize implementation. A task is not executable merely because it is listed here.

> **R3 documentary-dependency note (2026-09-30) — additive; no task was created, changed or unblocked.** Owner rulings recorded in `04-DECISIONS/00-DECISION-REGISTER.md` §8 (authority `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md`) do not authorize any task. The D-003 WhatsApp authority is `RESOLVED — OWNER-RULED` (2026-09-30), so references below to "the D-003 authority issue remaining unresolved" are historical for that clause; WhatsApp/channel integration is still not authorized. Tasks that depend on an approved technical specification (Identity/Tenancy migration, User/Membership persistence, `Empresa` → `Business` persistent transformation) stay **blocked**: Technical Specification `NOT APPROVED`, implementation `NOT AUTHORIZED`, gates G5/G7/G8/G9 `OPEN`.

---

## 1. Task governance

Every Task must preserve:

`Requirement / SPEC → Decision → Contract → Invariant → Test/Eval → AS-IS / TO-BE → Task → Evidence`

where applicable.

Each task must explicitly identify:

- task class;
- source;
- affected domain;
- AS-IS;
- TO-BE;
- dependencies;
- blockers;
- scope;
- non-scope;
- verification;
- expected evidence;
- reversibility where applicable.

No task may invent:

- schema;
- migration;
- API route;
- event name;
- identifier;
- permission identifier;
- infrastructure topology;
- physical model.

---

## 2. Task classes

| Class | Meaning |
|---|---|
| SPEC-CLOSURE | Close/document an Open Detail without silently deciding beyond authority |
| ASIS-EVIDENCE | Verify existing repository behavior |
| ARCHITECTURE | Define the architectural specification required by the project chain |
| TEST-DERIVATION | Refine verification definitions without executing implementation |
| IMPLEMENTATION | Modify software after all local gates pass |
| VALIDATION | Execute approved verification procedures |
| REVIEW-DELIVERY | Review and deliver a validated increment |

Only the first four classes are considered in this baseline.

---

# 3. Baseline tasks

## TASK-DOC-001 — Correct Plan artifact metadata

**Class:** SPEC-CLOSURE / DOCUMENTATION  
**Domain:** Governance  
**Source:** Plan Audit §10  
**Priority:** Documentation consistency

### Objective

Align the internal title/version metadata of the Plan artifact with its actual repository path and intended v0.2 identity.

### AS-IS

The file path is:

`11-PLAN/00-IMPLEMENTATION-PLAN-v0.2.md`

while the internal title identifies the document as v0.1.

### TO-BE

The Plan artifact has internally consistent version/title metadata.

### Scope

- documentation metadata only.

### Non-scope

- no change to Plan substance;
- no change to decisions;
- no change to gates;
- no change to sequencing;
- no implementation authorization.

### Dependencies

None.

### Verification

Re-read the complete Plan after the metadata correction.

### Expected evidence

**VERIFIED BY CODE / DOCUMENT INSPECTION** for the repository artifact.

### Gate

**READY IN PRINCIPLE.**

---

## TASK-ARCH-001 — Establish Wapsell Architecture Specification Baseline

**Class:** ARCHITECTURE  
**Domain:** Cross-cutting Architecture  
**Source:** D-017 + Plan-SPEC-010 + Plan Audit G1  
**Status:** BLOCKING FOUNDATION

### Objective

Produce the Architecture specification required to move from conceptual/domain documentation toward structural implementation without silently deciding implementation details inside later Tasks.

### AS-IS

The current documentation establishes a modular-monolith direction, but the approved Architecture layer is not yet established.

Existing AS-IS evidence exists for the current NestJS/React/Prisma/PostgreSQL implementation, but that evidence does not itself define the Wapsell TO-BE architecture.

### TO-BE

A reviewed Architecture specification establishes, at minimum, the architectural responsibilities needed by the implementation chain.

The exact content must be derived from existing requirements and decisions rather than invented in this task.

### Required areas to evaluate

- modular-monolith boundary;
- domain/application responsibility separation;
- authorization boundary;
- persistence ownership;
- cross-domain interaction rules;
- integration boundaries;
- deployment/infrastructure constraints;
- evolution constraints.

### Scope

Architecture specification and traceability.

### Non-scope

- no code changes;
- no schema/migration;
- no API implementation;
- no event implementation;
- no infrastructure deployment;
- no microservices migration;
- no technology adoption unless already required by an approved specification.

### Dependencies

- Decision Register;
- current Contracts;
- current Invariants;
- AS-IS evidence relevant to structural boundaries.

### Blockers

Any architectural requirement that would require an unresolved Owner ruling must remain explicitly open rather than being decided by this task.

### Verification

Architecture document audit against:
- D-017;
- current Plan;
- Contracts boundaries;
- existing AS-IS evidence;
- absence of unauthorized implementation commitments.

### Expected evidence

**DOCUMENTED** first; approval status must be recorded separately.

### Gate

**READY FOR SPECIFICATION WORK.**

---

## TASK-ASIS-001 — Verify Identity / Tenancy AS-IS Slice

**Class:** ASIS-EVIDENCE  
**Domain:** Identity / Tenancy / Authorization  
**Source:** PLAN-ASIS-001, 002, 003 + D-001/D-002/D-006 + Contracts Identity  
**Status:** EVIDENCE TASK

### Objective

Inspect the actual repository implementation for:
- authentication;
- current Empresa isolation;
- current `empresaId` propagation;
- existing permissions/authorization.

### AS-IS target

Establish verified repository behavior and identify gaps against the documented transformation baseline.

### TO-BE impact

Map each verified behavior to:
- preserve;
- adapt;
- deprecate;
- replace;
- not yet determined.

No target implementation should be invented during the evidence task.

### Scope

Repository inspection and evidence documentation.

### Non-scope

- no Membership migration;
- no User schema changes;
- no authorization redesign;
- no API changes;
- no implementation fixes.

### Dependencies

None for repository inspection.

### Blockers

D-006 exact authorization mechanics remain open. The task therefore must not evaluate the current code against an invented authorization sequence.

### Verification

Code inspection; tests/execution only if already available and actually run.

### Expected evidence

**VERIFIED BY CODE** where directly established.

### Gate

**READY FOR EXECUTION AS EVIDENCE WORK.**

---

## TASK-ASIS-002 — Verify Inventory Integrity AS-IS Slice

**Class:** ASIS-EVIDENCE  
**Domain:** Inventory  
**Source:** PLAN-ASIS-006 + D-010 + D-014 + Inventory Contracts  
**Status:** EVIDENCE TASK

### Objective

Verify the current repository behavior relevant to:
- Business inventory isolation;
- stock movement controls;
- invalid quantity handling;
- atomic/non-partial behavior;
- cross-Business transfer behavior.

### AS-IS

Existing audit evidence already establishes D-014 Business isolation behavior in specific code paths and identifies D-010 implementation gaps.

This task must extend/organize that evidence without treating the prior evidence as TO-BE compliance.

### TO-BE impact

Map observed behavior to the current D-010/D-014 requirements.

### Scope

Repository evidence and gap classification.

### Non-scope

- no stock implementation changes;
- no schema changes;
- no transaction/locking redesign;
- no transfer feature;
- no new inventory behavior.

### Dependencies

Existing D-010/D-014 code audit.

### Blockers

The exact definition of invalid stock quantity remains open.

### Verification

Code inspection; existing audit cross-check; execution only where an executable scenario is already defined and actually run.

### Expected evidence

**VERIFIED BY CODE** and/or **NOT DETERMINABLE WITH AVAILABLE INFORMATION**, as applicable.

### Gate

**READY FOR EXECUTION AS EVIDENCE WORK.**

---

## TASK-SPEC-001 — Establish Canonical Branding / Design System Specification Baseline

**Class:** SPEC-CLOSURE  
**Domain:** Branding / Experience  
**Source:** D-004 + PLAN-SPEC-011  
**Status:** SPECIFICATION TASK

### Objective

Establish the canonical specification boundary for Wapsell Design System and Business Brand configuration before branding implementation is planned.

### AS-IS

Current implementation contains existing Otra Ronda Más branding and historical System Design material.

### TO-BE

A canonical specification distinguishes:
- Wapsell Design System;
- Business Brand configuration;
- customer-facing Business identity;
- Wapsell platform identity.

### Scope

Specification and traceability.

### Non-scope

- no UI implementation;
- no CSS/token migration;
- no asset replacement;
- no frontend refactor;
- no assumption that historical visual artifacts are canonical.

### Dependencies

D-004 and existing branding/system-design documentation.

### Verification

Specification audit for:
- traceability to D-004;
- AS-IS/TO-BE separation;
- absence of unauthorized implementation details.

### Expected evidence

**DOCUMENTED.**

### Gate

**READY FOR SPECIFICATION WORK.**

---

## TASK-TEST-001 — Reconcile Test/Evals Derivation for Task Planning

**Class:** TEST-DERIVATION  
**Domain:** Verification  
**Source:** Tests/Evals audit + current Invariants  
**Status:** PRE-IMPLEMENTATION

### Objective

Prepare a stable verification input for future implementation Tasks without creating executable tests.

### Scope

Review candidate tests for:
- invariant traceability;
- blocked specification dependencies;
- expected-result discipline;
- appropriate verification level;
- evidence classification.

### Non-scope

- no test implementation;
- no test execution;
- no API/error/status invention;
- no schema assumptions;
- no resolution of pending Owner rulings.

### Dependencies

Current Invariants and Tests/Evals audit.

### Verification

Document-level reconciliation and re-read.

### Expected evidence

**DOCUMENTED.**

### Gate

**READY FOR DOCUMENTATION WORK.**

---

# 4. Explicitly blocked task families

The following must not be created as implementation Tasks in this baseline:

- User/Membership persistence migration;
- Membership database implementation;
- API redesign;
- Conversation/Message physical schema;
- Messaging realtime implementation;
- payment gateway implementation before D-011/task readiness;
- Sale cancellation/reversal implementation across Inventory/Cash/Payments/AR before the applicable matrix is specified;
- sensitive Cash authorization implementation while its ruling remains pending;
- AP lifecycle implementation before D-015 closure;
- detailed Fulfillment workflow implementation before D-016 closure;
- AI activation;
- WhatsApp/channel integration while the specific D-003 authority issue remains unresolved; *(R3, 2026-09-30, additive: authority resolved — Messaging MVP does not depend on WhatsApp — but no integration is authorized; blocked tasks stay blocked)*
- microservices migration;
- infrastructure migration;
- production deployment.

---

# 5. Task dependency map

```
TASK-DOC-001
    │
    └── documentation consistency

TASK-ASIS-001 ─────┐
                   ├──> TASK-ARCH-001
TASK-ASIS-002 ─────┘

TASK-SPEC-001 ───────────────> future Branding implementation readiness

TASK-TEST-001 ───────────────> future implementation validation readiness

TASK-ARCH-001
    │
    └──> structural implementation Tasks (future, gated)

SPEC-CLOSURE tasks
    │
    └──> domain-specific implementation Tasks only after local gates pass
```

The diagram expresses sequencing dependency, not authorization.

---

# 6. Task-local advancement gate

A Task may move toward execution only when:

- [ ] source requirement/SPEC is identified;
- [ ] applicable Decision is identified;
- [ ] provenance is preserved;
- [ ] affected Contract is stable enough for the task;
- [ ] affected Invariant is stable or explicitly not applicable;
- [ ] verification method is defined;
- [ ] AS-IS impact is understood where existing behavior is affected;
- [ ] TO-BE behavior is sufficiently specified;
- [ ] dependencies/blockers are explicit;
- [ ] scope and non-scope are explicit;
- [ ] no unresolved Owner ruling affects the task;
- [ ] no schema/API/event/identifier is invented;
- [ ] implementation is not hidden inside a specification/evidence task.

---

# 7. Current baseline status

**TASKS BASELINE: DRAFT — NOT APPROVED FOR EXECUTION.**

The baseline deliberately contains:
- specification work;
- architecture work;
- AS-IS evidence work;
- test/evaluation documentation work.

It does **not** contain executable product implementation Tasks.

**Next controlled step:** review the six baseline Tasks individually against their task-local gates. Only Tasks that pass their local gate should proceed to execution, and implementation Tasks should remain blocked until Architecture and the affected domain specifications are ready.
