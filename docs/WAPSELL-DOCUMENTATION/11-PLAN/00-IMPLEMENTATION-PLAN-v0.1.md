# Wapsell — Implementation Plan v0.1

**Status:** DRAFT — NOT APPROVED  
**Date:** 2026-09-29  
**Layer:** Plan  
**Authority:** Decision Register + current AS-IS + reconciled Contracts + Invariants + Tests/Evals derivation  
**Purpose:** establish a controlled implementation sequence without authorizing implementation, inventing requirements, or treating documentation as evidence of working software.

> This plan is a planning artifact. It does not authorize code changes, schema changes, migrations, tests, commits, deployments, or product decisions.

---

## 1. Planning principles

The implementation plan follows the project chain:

`Requirements → SPEC → Architecture → Contracts → Invariants → Tests/Evals → Plan → Tasks → Implementation → Validation → Review → Delivery`

The plan must preserve:

- AS-IS as the verified starting point;
- TO-BE as the target state;
- pending decisions as blockers;
- Open Details as specification work, not implementation work;
- implementation evidence separately from documentation;
- incremental and reversible changes;
- traceability from every implementation task to its source.

---

## 2. Current planning status

**PLAN STATUS: DRAFT — NOT READY FOR EXECUTION.**

The documentation chain has enough material to define planning work, but several domain decisions/specifications remain incomplete.

The plan therefore has two parallel tracks:

### Track A — Specification closure

Resolve or formalize the remaining product/technical definitions required before implementation.

### Track B — Verified AS-IS preparation

Inspect the existing repository and establish which current behaviors can be reused, adapted, or require replacement.

No implementation task should begin merely because a requirement appears in this plan.

---

## 3. Workstream classification

| Workstream | Type | Current state | Planning status |
|---|---|---|---|
| Governance / source of truth | Documentation | Existing | Maintain |
| Decision reconciliation | Governance | Partial | Required where pending rulings exist |
| AS-IS verification | Evidence | Existing audit + repository | Required continuously |
| Identity / Tenancy | Domain transformation | AS-IS Empresa/User model | Specification + implementation planning |
| Customer/User separation | Domain transformation | AS-IS separate concepts, TO-BE clarified | Specification + migration planning |
| Authorization / Membership | Domain transformation | Existing permissions; Membership TO-BE | Blocked on exact authorization detail |
| Commerce | Domain transformation | Existing ERP/POS behavior | Incremental planning |
| Inventory | Domain transformation | Existing inventory + D-010/D-014 obligations | Verification + hardening planning |
| Cash | Domain transformation | Existing Cash implementation | Specification closure required |
| Payments | Domain capability | Partial/manual AS-IS | External provider specification required |
| AR/AP | Commerce/Finance | Existing/current-account-related behavior | Lifecycle specification required |
| Fulfillment | Commerce | Not sufficiently formalized AS-IS | Detailed specification required |
| Messaging | New product capability | No functional Conversation/Message domain AS-IS | Specification required before implementation |
| Branding / Design System | Product/experience | Existing business branding | Canonical branding specification required |
| Architecture | Cross-cutting | Modular monolith direction | Architecture specification required |
| CI/CD | Engineering governance | Progressive requirement | CI/CD architecture/task planning later |
| Tests/Evals | Verification | Derived candidates | Executable tests after task planning |
| AI | Future capability | Inactive MVP | Do not implement autonomous AI in current MVP |

---

## 4. Implementation gates

### G0 — Documentation baseline

Must be true before implementation planning is converted into tasks:

- Decision Register is the current decision authority.
- AS-IS evidence is identifiable.
- Contracts are reconciled sufficiently for the target work.
- Invariants used by a task are stable.
- Candidate verification exists for the behavior.

**Current:** PARTIAL.

---

### G1 — Architecture readiness

Required before structural implementation changes:

- approved modular-monolith architecture;
- domain boundaries;
- application/module responsibilities;
- persistence ownership;
- cross-domain interaction rules;
- authorization boundary;
- deployment/infrastructure constraints.

**Current:** NOT READY.

---

### G2 — Domain specification readiness

A domain can enter implementation only when its required behavior is sufficiently specified.

Minimum condition:

`Decision → Contract → Invariant → Test/Eval → Task`

with no unresolved blocker affecting the task.

---

### G3 — Task readiness

A task must contain:

- source requirement/decision;
- affected domain;
- AS-IS reference;
- intended change;
- explicit non-scope;
- dependencies;
- verification method;
- evidence expected;
- rollback/reversibility considerations where relevant.

---

### G4 — Implementation

Only after G3 is satisfied.

Implementation must not expand scope beyond the task.

---

### G5 — Validation

Validation must distinguish:

- code inspection;
- automated tests;
- execution;
- integration/E2E;
- documentation conformance.

No “success” claim without corresponding evidence.

---

## 5. Specification-closure backlog

These are planning items, not executable implementation tasks.

| ID | Item | Source | Blocking scope |
|---|---|---|---|
| PLAN-SPEC-001 | Resolve D-003 WhatsApp clause authority | Decision Register §4.3.2 | Messaging/channel architecture |
| PLAN-SPEC-002 | Resolve exact D-006 authorization mechanics | D-006 | Identity/Authorization implementation |
| PLAN-SPEC-003 | Resolve D-008 cancellation/reversal matrix | D-008 | Sale/Inventory/Cash/Payments/AR |
| PLAN-SPEC-004 | Resolve D-011 reconciliation semantics | D-011 | Payments |
| PLAN-SPEC-005 | Resolve D-013 sensitive Cash authorization | D-013 | Cash authorization |
| PLAN-SPEC-006 | Formalize D-015 AP lifecycle | D-015 | Purchases/AP |
| PLAN-SPEC-007 | Formalize D-016 fulfillment lifecycle | D-016 | Fulfillment |
| PLAN-SPEC-008 | Formalize Messaging physical/behavioral model | Messaging TO-BE | Messaging implementation |
| PLAN-SPEC-009 | Formalize AI future scope without activating MVP AI | DEC-001/D-003 | AI future work |
| PLAN-SPEC-010 | Establish approved Architecture | D-017 | Structural implementation |
| PLAN-SPEC-011 | Establish canonical Branding/Design System specification | D-004 | Branding implementation |
| PLAN-SPEC-012 | Establish required NFR/security constraints | Existing governance + architecture | Cross-cutting implementation |

These items must not be silently resolved by implementation.

---

## 6. AS-IS verification backlog

Before modifying an existing area, inspect the actual repository and classify the behavior.

| ID | Verification | Evidence target |
|---|---|---|
| PLAN-ASIS-001 | Identity/User authentication | VERIFIED BY CODE / TEST where available |
| PLAN-ASIS-002 | Empresa isolation and current `empresaId` propagation | VERIFIED BY CODE |
| PLAN-ASIS-003 | Existing permissions and authorization | VERIFIED BY CODE |
| PLAN-ASIS-004 | Current Customer model and commercial relationship | VERIFIED BY CODE |
| PLAN-ASIS-005 | Catalog hierarchy and Business ownership | VERIFIED BY CODE |
| PLAN-ASIS-006 | Inventory movement controls | VERIFIED BY CODE + later TEST |
| PLAN-ASIS-007 | Current Cash lifecycle and permissions | VERIFIED BY CODE |
| PLAN-ASIS-008 | Current Sales lifecycle/cancellation | VERIFIED BY CODE |
| PLAN-ASIS-009 | Current Orders/Fulfillment behavior | VERIFIED BY CODE |
| PLAN-ASIS-010 | Current purchase/Supplier/AP behavior | VERIFIED BY CODE |
| PLAN-ASIS-011 | Existing reporting behavior | VERIFIED BY CODE |
| PLAN-ASIS-012 | Existing branding/system-design implementation | VERIFIED BY CODE |
| PLAN-ASIS-013 | Existing CI/test infrastructure | VERIFIED BY CODE / EXECUTION |
| PLAN-ASIS-014 | Confirm absence/current state of Messaging domain | VERIFIED BY CODE |
| PLAN-ASIS-015 | Confirm current external payment integrations | VERIFIED BY CODE |

No item should be marked verified from documentation alone when repository evidence is required.

---

## 7. Candidate implementation waves

These are sequencing proposals, not approved scope.

### Wave 0 — Documentation and evidence stabilization

**Goal:** establish a reliable implementation baseline.

Includes:
- reconcile current documentation;
- close critical pending authority issues;
- complete architecture readiness;
- complete AS-IS evidence needed by first implementation wave.

**No product code changes.**

---

### Wave 1 — Identity / Tenancy foundation

Potential scope:
- Business/Tenant conceptual transformation;
- Membership foundation;
- User ↔ Business contextual access;
- Customer/User boundary preservation.

**Blocked until:** G1 + PLAN-SPEC-002 where it affects authorization mechanics.

---

### Wave 2 — Commerce foundations

Potential scope:
- Business-scoped Customers;
- Catalog;
- Orders/Sales boundaries;
- existing sales behavior reconciliation;
- transactional boundaries.

**Blocked where:** D-008 effects remain necessary for the specific task.

---

### Wave 3 — Inventory integrity

Potential scope:
- preserve/strengthen D-010 controls;
- Business isolation;
- cross-Business transfer prohibition;
- movement consistency;
- tests derived from INV-INV-001…005 once test definitions are executable.

**Special requirement:** existing D-010 controls must be verified and maintained.

---

### Wave 4 — Cash / Payments / AR / AP

These should not be implemented as one undifferentiated task.

Separate domains and boundaries:

`Cash ↔ Payments ↔ AR ↔ Purchases/AP`

Exact cross-domain effects must remain blocked until their specifications are closed.

---

### Wave 5 — Fulfillment

Only after D-016 detailed lifecycle is specified sufficiently for the intended implementation slice.

---

### Wave 6 — Messaging

Messaging is a first-class MVP capability, but implementation requires closure of:

- Conversation;
- Message;
- participant identity;
- lifecycle;
- realtime;
- notifications;
- authorization;
- Customer/User linkage;
- Order interaction;
- Sale boundary;
- Fulfillment interaction.

No physical model should be invented from the current conceptual contracts.

---

### Wave 7 — Branding / Experience

Implement Business Brand configuration over the canonical Wapsell Design System once the canonical design-system specification is approved.

---

### Wave 8 — CI/CD and quality gates

Implement progressive automated validation according to D-018 after the required test suites and architecture are defined.

---

## 8. Task decomposition rule

When a wave becomes executable, every Task must follow:

`Task → Requirement/Decision → Contract → Invariant → Test/Eval → Evidence`

Example:

`TASK-INV-001`

- Requirement: D-014
- Contract: C-INV-001
- Invariant: INV-INV-001
- Test candidate: TEST-INV-001
- AS-IS evidence: existing inventory isolation audit
- Implementation: only after repository inspection
- Evidence expected: code + test, if executed

The example is a traceability pattern, not an authorization to implement it now.

---

## 9. Explicit non-scope for current plan

The following are not authorized by this plan:

- schema migration;
- User/Membership database migration;
- API redesign;
- Conversation/Message schema;
- payment gateway implementation;
- AI activation;
- WhatsApp integration;
- Kubernetes or other infrastructure adoption;
- microservices migration;
- CI/CD deployment changes;
- production deployment;
- deletion/replacement of existing modules.

Each requires its own approved task/specification.

---

## 10. Risk register

| Risk | Impact | Current control |
|---|---|---|
| Reconstructed decision treated as Owner-verbatim | Governance drift | Provenance labels |
| Open Detail silently implemented | Scope drift | Planning gates |
| AS-IS confused with TO-BE | Incorrect migration | Separate evidence layers |
| Existing functionality replaced unnecessarily | Regression | Repository-first inspection |
| D-010 implementation gap mistaken for compliance | Inventory integrity risk | Explicit verification backlog |
| D-014 transfer prohibition weakened | Tenant isolation risk | Owner-ruled invariant |
| Sale effects implemented before reversal matrix | Cross-domain inconsistency | PLAN-SPEC-003 |
| Messaging physical model invented prematurely | Architecture/data rework | PLAN-SPEC-008 |
| Tests encode implementation details | Brittle/unauthorized requirements | Tests/Evals audit |
| Architecture decisions made inside tasks | Structural drift | G1 gate |

---

## 11. Planning evidence

Current evidence state:

- Decisions: DOCUMENTED, with two-tier provenance.
- Contracts: DRAFT / audited.
- Invariants: DRAFT / audited / refined.
- Tests/Evals: DRAFT / audited / refined.
- Current implementation: AS-IS evidence available for several domains.
- Executable tests from this chain: NOT CREATED.
- Implementation from this plan: NOT AUTHORIZED.

---

## 12. Advancement gate

The Plan layer is ready to produce executable Tasks only when:

- [ ] required architecture decisions are closed for the task;
- [ ] task-relevant Open Details are resolved;
- [ ] AS-IS repository inspection is complete for affected components;
- [ ] invariant source is stable;
- [ ] candidate verification is defined;
- [ ] task scope and non-scope are explicit;
- [ ] no task depends on an unresolved Owner ruling;
- [ ] no task invents schema/API/event identifiers;
- [ ] rollback/reversibility is understood where relevant.

**Current status: DRAFT — PLAN BASELINE CREATED / NOT APPROVED FOR EXECUTION.**

---

## 13. Next controlled step

The next layer is **TASKS**.

Before creating implementation tasks, perform a Plan audit that checks:

1. sequencing dependencies;
2. hidden implementation assumptions;
3. tasks that are actually specification work;
4. tasks blocked by unresolved decisions;
5. unnecessary coupling between domains;
6. preservation of AS-IS functionality;
7. test/evidence feasibility;
8. whether any proposed task would implicitly authorize a schema/API/architecture decision.

Only after that audit should executable Tasks be created.
