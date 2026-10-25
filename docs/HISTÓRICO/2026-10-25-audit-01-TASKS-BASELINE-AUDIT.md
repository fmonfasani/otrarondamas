# Wapsell — Tasks Baseline Audit v0.1

**Status:** DRAFT — AUDIT / NON-NORMATIVE  
**Date:** 2026-09-29  
**Scope:** `12-TASKS/00-TASKS-BASELINE-v0.1.md`  
**Authority:** Source of Truth + Plan v0.2 + Plan Audit + Decision Register + current Contracts / Invariants / Tests-Evals + AS-IS / TO-BE  
**Purpose:** review each baseline Task against its local advancement gate without executing implementation.

> This audit does not approve Tasks, create requirements, resolve Owner rulings, or authorize implementation.

---

## 1. Evidence basis

Reviewed:

- `12-TASKS/00-TASKS-BASELINE-v0.1.md`
- `11-PLAN/00-IMPLEMENTATION-PLAN-v0.2.md`
- `11-PLAN/01-IMPLEMENTATION-PLAN-AUDIT.md`
- `00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`
- `04-DECISIONS/00-DECISION-REGISTER.md`
- current Contracts and Contracts Audit
- current Invariants and Invariants Audit
- current Tests/Evals derivation and audit
- relevant AS-IS / TO-BE documentation

The audit evaluates **task readiness**, not product implementation status.

---

## 2. Executive result

The six baseline Tasks are structurally appropriate for the current documentation stage, but they do not all have the same readiness status.

### Disposition summary

| Task | Disposition | Reason |
|---|---|---|
| TASK-DOC-001 | **READY — DOCUMENTATION ONLY** | Clear metadata inconsistency; no substantive decision required. |
| TASK-ARCH-001 | **READY — SPECIFICATION WORK** | Architecture is a hard prerequisite and the task explicitly avoids implementation commitments. |
| TASK-ASIS-001 | **READY — EVIDENCE WORK** | Repository inspection is possible without deciding D-006 mechanics. |
| TASK-ASIS-002 | **READY — EVIDENCE WORK WITH CONSTRAINT** | Evidence can be extended, but the open normative definition of invalid quantity must not be invented. |
| TASK-SPEC-001 | **READY — SPECIFICATION DISCOVERY / CLOSURE** | D-004 gives the conceptual boundary; implementation details must remain outside the task. |
| TASK-TEST-001 | **READY — DOCUMENTATION RECONCILIATION** | Candidate verification definitions can be refined without implementation or execution. |

**Overall disposition: CONDITIONAL PASS — TASK BASELINE IS SUITABLE FOR CONTROLLED DOCUMENTATION / EVIDENCE WORK.**

No implementation Task should be derived from this audit yet.

---

## 3. Task-local review

### TASK-DOC-001 — Correct Plan artifact metadata

**Disposition: READY — DOCUMENTATION ONLY**

The source defect is concrete: the repository path identifies Plan v0.2 while the internal title identifies v0.1.

The proposed scope is appropriately limited to metadata. It does not alter decisions, gates, sequencing, requirements, or implementation authorization.

**Gate assessment:**

- Source identified: PASS
- Scope/non-scope: PASS
- Dependency: PASS
- Verification: PASS
- Owner ruling dependency: NONE IDENTIFIED
- Unauthorized implementation detail: NONE

**Controlled action:** the task may be executed as a documentation-only correction.

---

### TASK-ARCH-001 — Establish Wapsell Architecture Specification Baseline

**Disposition: READY — SPECIFICATION WORK**

This task correctly treats Architecture as a blocking foundation rather than bypassing it with implementation.

D-017 supports the modular-monolith direction, but the task correctly avoids converting that direction into a specific physical topology, schema, API, event model, infrastructure deployment, or microservices plan.

The task must preserve the distinction between:

- architectural responsibility;
- implementation technology;
- physical persistence;
- deployment topology.

Where current Contracts or Invariants contain conceptual boundaries, the Architecture task may use them as inputs but must not silently convert them into physical structures.

**Gate assessment:**

- D-017 / Plan linkage: PASS
- Architecture hard-gate alignment: PASS
- AS-IS input identified: PASS
- Implementation containment: PASS
- Pending Owner ruling handling: PASS

**Controlled action:** architecture specification work may proceed. Approval remains a separate step.

---

### TASK-ASIS-001 — Verify Identity / Tenancy AS-IS Slice

**Disposition: READY — EVIDENCE WORK**

The task has a sufficiently concrete evidence target in the existing repository:

- authentication;
- current Empresa isolation;
- `empresaId` propagation;
- permissions / authorization.

The task correctly excludes Membership migration and authorization redesign.

The principal constraint is D-006: the evidence task may document what the current code actually does, but it must not classify the implementation against an invented four-step authorization algorithm or other unresolved enforcement mechanics.

The result should distinguish:

1. VERIFIED BY CODE;
2. DOCUMENTED;
3. NOT DETERMINABLE;
4. gaps against current TO-BE requirements.

**Controlled action:** repository inspection/evidence capture may proceed.

---

### TASK-ASIS-002 — Verify Inventory Integrity AS-IS Slice

**Disposition: READY — EVIDENCE WORK WITH NORMATIVE CONSTRAINT**

Existing evidence already establishes Business isolation in relevant code paths and identifies D-010 gaps. Extending and organizing that evidence is therefore within scope.

The critical constraint is the unresolved exact definition of invalid stock quantity. The task may report current code behavior, including accepted/rejected values, but must not transform an observed implementation behavior into a new normative rule.

Likewise, evidence of current behavior must remain separate from D-010 TO-BE compliance.

D-014 current cross-Business transfer prohibition remains an explicit current rule; the evidence task must not create a transfer feature or weaken that prohibition.

**Controlled action:** evidence work may proceed under those constraints.

---

### TASK-SPEC-001 — Establish Canonical Branding / Design System Specification Baseline

**Disposition: READY — SPECIFICATION DISCOVERY / CLOSURE**

D-004 establishes the conceptual distinction between:

- Wapsell Design System;
- Business Brand configuration;
- Business-facing identity;
- Wapsell as underlying platform.

The task is correctly limited to specification and traceability.

It must not treat historical System Design artifacts, existing colors, CSS tokens, assets, or frontend components as canonical merely because they exist.

The specification task should therefore explicitly classify source material as:

- current requirement/decision;
- AS-IS implementation evidence;
- historical reference;
- unresolved proposal.

No visual implementation should be derived until the canonical specification boundary is established.

**Controlled action:** specification work may proceed.

---

### TASK-TEST-001 — Reconcile Test/Evals Derivation for Task Planning

**Disposition: READY — DOCUMENTATION RECONCILIATION**

The task is correctly positioned before executable implementation tests.

The current candidate tests can be reviewed for:

- invariant traceability;
- source/provenance;
- expected-result discipline;
- verification level;
- evidence classification;
- blockers inherited from open specifications.

The task must not turn candidate tests into approved executable procedures where the underlying requirement remains open.

In particular, it must preserve the existing constraints around:

- D-006 authorization mechanics;
- D-008 cancellation/reversal matrix;
- D-011 reconciliation;
- D-013 sensitive Cash permissions;
- D-015 AP;
- D-016 detailed Fulfillment;
- Messaging physical/behavioral model;
- D-003 disputed WhatsApp clause. *(R3, 2026-09-30, additive: resolved — `RESOLVED — OWNER-RULED`, Decision Register §8.1; historical audit text preserved.)*

**Controlled action:** document-level reconciliation may proceed.

---

## 4. Cross-task dependency validation

The baseline dependency structure is coherent:

`AS-IS evidence → Architecture specification`

for the structural inputs identified by TASK-ARCH-001.

However, this does **not** mean AS-IS completion automatically approves Architecture. Architecture remains a separate specification and review step.

Likewise:

`Specification closure → future implementation readiness`

does not authorize implementation merely because a specification document exists.

The following distinction remains mandatory:

> **Documented ≠ approved ≠ implemented ≠ verified.**

---

## 5. Conditions that remain globally blocking for implementation

This audit does not remove any existing blockers.

Implementation remains blocked where the relevant local chain is incomplete, including:

- unresolved Architecture baseline;
- unresolved D-003 authority detail; *(R3, 2026-09-30, additive: the WhatsApp authority issue is now `RESOLVED`; other D-003 details remain open; implementation still `NOT AUTHORIZED`)*
- unresolved D-006 authorization mechanics where implementation depends on them;
- unresolved D-008 cancellation/reversal effects;
- unresolved D-011 reconciliation semantics;
- unresolved D-013 sensitive Cash authorization;
- unresolved D-015 AP lifecycle;
- unresolved D-016 detailed Fulfillment behavior;
- unresolved Messaging physical/behavioral model;
- any schema/API/event/identifier/infrastructure decision not authorized by the specification chain.

D-010 remains a particular case where the normative requirement exists but the current implementation has an identified gap. Evidence of the requirement is not evidence of compliance.

---

## 6. Authorized next-step classification

Based on this audit, the baseline can be divided into three controlled categories:

### A. Can execute immediately as documentation/evidence work

- TASK-DOC-001
- TASK-ASIS-001
- TASK-ASIS-002
- TASK-TEST-001

### B. Can begin specification work, with separate approval afterward

- TASK-ARCH-001
- TASK-SPEC-001

### C. Not authorized by this baseline

- implementation Tasks;
- migrations;
- API redesign;
- Conversation/Message persistence;
- payment gateway implementation;
- Sale reversal implementation;
- sensitive Cash authorization changes;
- AP/Fulfillment behavioral implementation;
- AI activation;
- WhatsApp/channel integration while the D-003 authority issue remains unresolved; *(R3, 2026-09-30, additive: the authority issue is resolved — Wapsell Messaging MVP does not depend on WhatsApp — but no integration is authorized: implementation `NOT AUTHORIZED`)*
- infrastructure/microservices migration;
- production deployment.

---

## 7. Final disposition

**TASK BASELINE: CONDITIONAL PASS — READY FOR CONTROLLED DOCUMENTATION / EVIDENCE / SPECIFICATION WORK.**

The six Tasks do not require expansion into implementation Tasks at this stage.

The next controlled operation should be to execute the documentation/evidence Tasks or establish the Architecture/Branding specification artifacts, while preserving the existing gates and provenance.

No product code change is implied by this audit.
