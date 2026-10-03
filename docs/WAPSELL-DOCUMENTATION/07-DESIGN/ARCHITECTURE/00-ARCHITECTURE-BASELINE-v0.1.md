# Wapsell — Architecture Specification Baseline v0.1

**Status:** DRAFT — ARCHITECTURE BASELINE / NOT APPROVED  
**Date:** 2026-09-29  
**Layer:** Architecture  
**Source task:** TASK-ARCH-001  
**Primary decision:** D-017 (DERIVED / RECONSTRUCTED provenance)  
**Supporting authority:** Source of Truth + current Contracts + Invariants + AS-IS / TO-BE documentation  
**Purpose:** establish the architectural specification boundary required before structural implementation, without inventing physical schemas, APIs, events, identifiers, infrastructure topology, or technology commitments.

> This document is a specification baseline. It does not authorize implementation.

> **R3 authority note (2026-09-30) — additive; no line of this baseline was deleted.** Owner rulings issued after
> this baseline (`04-DECISIONS/00-DECISION-REGISTER.md` §8; authority `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md`,
> `13-OR-001-…`, `15-OR-002-A-…`) set the following **conceptual limits** for the architecture layer only:
> `User` is a global identity (globally unique email); `Membership` is contextual (User ↔ Business); `Customer`
> is independent of `User` with an optional link; `Business` is the tenancy unit and the final persistent
> destination of the `Empresa` transformation (P1-A option C); the Messaging MVP does not depend on WhatsApp
> (D-003 clause `RESOLVED`); the identity transition is incremental with temporary, bounded coexistence
> (OR-002-B) and temporary legacy session/token compatibility followed by invalidation and new login (OR-002-E).
> The architecture layer does **not** design the migration, tables, technical coexistence, token migration,
> deployment or cutover; those stay `OPEN` under `specification → Owner approval → implementation`
> (OR-002-F / P5-B). Technical Specification = `NOT APPROVED`; Implementation = `NOT AUTHORIZED`.
> D-006, D-008, D-011, D-013, D-015, D-016, D-017 remain `NOT CONSULTED` / open as stated below.

---

## 1. Architectural authority and provenance

The architecture layer must respect the project chain:

`Requirements → SPEC → Architecture → Contracts → Invariants → Tests/Evals → Plan → Tasks → Implementation → Validation → Review → Delivery`

Current authoritative distinctions:

- Decision Register = decision authority.
- Canonical SPEC = intended product definition.
- AS-IS = verified current state.
- TO-BE = target state.
- Contracts = domain boundaries.
- Invariants = normative properties already stable enough to formalize.
- Tasks = controlled execution units.

D-017 establishes the initial **modular-monolith direction** and incremental evolution. D-017 is recorded as DERIVED / RECONSTRUCTED in the Decision Register and must not be presented as OWNER-VERBATIM.

No architectural statement in this document should silently upgrade reconstructed wording into a new decision.

---

## 2. Current AS-IS architectural baseline

The current implementation evidence identifies a system with:

- NestJS backend;
- React/Vite frontend;
- Prisma persistence layer;
- PostgreSQL database;
- existing ERP/POS capabilities;
- authentication and authorization capabilities;
- Business/Empresa-scoped behavior in existing areas;
- existing modules covering multiple commercial/operational domains.

The AS-IS implementation is not itself the Wapsell target architecture.

### 2.1 AS-IS preservation trace

Before structural implementation, each affected existing capability must have an explicit disposition:

- **PRESERVE** — existing behavior remains valid for the TO-BE state;
- **ADAPT** — existing behavior remains useful but requires a defined change;
- **REPLACE** — existing behavior is superseded by an approved TO-BE capability;
- **MISSING** — required TO-BE capability is not present in AS-IS;
- **NOT DETERMINABLE** — evidence is insufficient for a disposition.

The disposition must be traceable to AS-IS evidence and the relevant TO-BE requirement/specification. A conceptual Architecture statement does not itself authorize replacement, deletion or migration.

Existing code evidence must therefore be used to determine:

- what can be preserved;
- what requires adaptation;
- what requires replacement;
- what is missing;
- what remains not determinable.

This document does not authorize deletion or replacement of existing modules.

---

## 3. Architectural target

### 3.1 Initial architectural direction

Wapsell should be structured as a **modular monolith initially**, with explicit domain and responsibility boundaries.

The purpose of the modular boundary is to allow:

- independent evolution of domains;
- controlled cross-domain interaction;
- preservation of Business isolation;
- explicit authorization boundaries;
- incremental extraction/refactoring if future requirements justify it.

The architecture does not currently authorize a microservices migration.

### 3.3 Conceptual module/domain boundary criteria

A conceptual module/domain boundary is valid when it has:

- a coherent business responsibility;
- identifiable authoritative rules within that responsibility;
- explicit dependencies on other responsibilities;
- a defined Business/authorization context where applicable;
- independently traceable requirements, Contracts, Invariants and verification obligations.

These criteria describe architectural responsibility only. They do not prescribe folders, packages, NestJS modules, frontend modules, database schemas, services, processes or deployable units.

### 3.2 Architectural principle

The preferred dependency direction is:

`Experience / Interface → Application orchestration → Domain capabilities → Persistence / external infrastructure`

This is an architectural organizing principle, not a commitment to a specific framework, folder structure, class hierarchy, or package layout.

---

## 4. Domain responsibility model

The architecture recognizes the following conceptual areas as distinct responsibilities:

### Platform / Cross-cutting

- global User identity;
- Business/Tenancy;
- Membership;
- authorization;
- platform-level configuration;
- audit/security concerns.

### Customer / Commercial identity

- Customer as a commercial identity distinct from User;
- Business-scoped customer relationship;
- optional relationship between Customer and User.

### Commerce

- Catalog;
- Orders;
- Sales;
- Payments boundary;
- Accounts Receivable;
- Purchases;
- Accounts Payable;
- Fulfillment relationship.

### Inventory

- Business-owned inventory;
- stock operations;
- stock movement integrity;
- inventory isolation.

### Cash

- Business Cash lifecycle;
- cash movements;
- cash reconciliation/archeo/cierre responsibilities.

### Messaging

- Conversation as the central commercial interface;
- Message as a conceptual messaging capability;
- contextual interaction with Customer, Order, Sale and Fulfillment.

The physical persistence and API decomposition of Messaging remain open.

### Branding / Experience

- Wapsell Design System;
- Business Brand configuration;
- Business-facing identity.

### Engineering / Verification

- automated validation;
- CI/CD;
- tests/evaluations;
- observability and operational controls where concretely required.

These areas are architectural responsibilities, not authorization for physical database tables, routes, events, queues, or services.

A responsibility listed here becomes implementation-relevant only through the normal specification chain and task-local readiness gate.

---

## 5. Business / tenancy boundary

Business is the tenant isolation boundary.

Architecturally:

- User is global;
- Business is contextual;
- Membership connects User and Business;
- Customer is a commercial identity associated with a Business;
- operational data must respect Business ownership/isolation where the relevant domain requires it.

Inventory has an explicit current rule of exclusive Business ownership and no currently authorized cross-Business transfer.

The architecture must prevent cross-domain designs from weakening Business isolation.

Exact enforcement mechanisms remain subject to the relevant Contracts and implementation specification.

---

## 6. Identity and authorization boundary

The architecture recognizes:

`Global User → target Business context → Membership → operation authorization`

as the conceptual authorization boundary.

The exact authorization algorithm, guard sequence, middleware/interceptor design, token contents, error model, and physical enforcement mechanism remain **OPEN** under D-006.

Therefore this Architecture baseline must not prescribe any of them.

Architecture must nevertheless ensure that domain/application components do not bypass the Business/Membership authorization boundary.

---

## 7. Cross-domain interaction

Cross-domain interaction must be explicit rather than relying on undocumented coupling.

The following conceptual boundaries are currently established:

- Order ↔ Sale: distinct concepts.
- Sale ↔ Inventory: Sale may produce applicable inventory effects according to approved Commerce/Inventory specifications.
- Sale ↔ Cash: boundary exists; exact effects remain open.
- Sale ↔ Payments: provider/payment boundary exists; exact lifecycle remains open.
- Sale ↔ AR: outstanding commercial balance may be represented; exact lifecycle remains open.
- Purchase ↔ Inventory: acquisition can affect inventory according to approved specifications.
- Purchase ↔ AP: pending supplier obligation may exist; lifecycle remains open.
- Order ↔ Fulfillment: Fulfillment belongs to Orders.
- Messaging ↔ Commerce: Messaging is an interaction/interface layer and must not become an alternative implementation of Commerce rules.

No cross-domain interaction should be implemented solely from this conceptual list.

Conceptual relationships in this section are architectural boundaries, not implementation tasks. Any implementation derived from them requires the applicable Requirement/SPEC, Contract, Invariant where applicable, verification definition, AS-IS/TO-BE impact and task-local readiness gate.

---

## 8. Transactional integrity

Where a business operation spans multiple effects, the architecture must support consistent application of the applicable operation.

D-008 requires that applicable Sale effects are not left partially applied.

D-010 requires transactional stock integrity and atomic movement behavior.

The architecture therefore needs a mechanism for transactional consistency appropriate to each affected operation.

However, this baseline deliberately does not select:

- transaction implementation technique;
- database transaction boundary;
- locking strategy;
- event/outbox mechanism;
- queue;
- saga/process manager;
- retry model.

Those are implementation details requiring domain/task-specific specification.

---

## 9. Persistence responsibility

Persistence must remain aligned with domain ownership.

The architecture must preserve:

- Business-scoped ownership where required;
- explicit Customer/User separation;
- Inventory Business ownership;
- Cash Business ownership;
- traceability required by Payments, AR/AP and audit capabilities.

The architecture does **not** currently define:

- Prisma model names;
- table names;
- primary/foreign key structures;
- identifiers;
- migration strategy;
- indexing strategy;
- partitioning;
- database-per-tenant versus shared database;
- schema-per-tenant.

Those decisions require explicit specification.

---

## 10. Experience and application boundary

The product principle is that **conversation is the primary commercial experience while ERP capabilities provide the operational engine**.

Architecturally this implies a separation between:

1. user-facing interaction;
2. application orchestration;
3. business/domain rules;
4. persistence and integrations.

The messaging experience may initiate or contextualize commercial operations, but it must not duplicate the authoritative rules of Orders, Sales, Payments, Inventory, Cash or Fulfillment.

This preserves a single operational source for commercial effects while allowing multiple entry points such as:

- conversational interaction;
- in-person/POS workflows;
- other future interfaces.

---

## 11. Messaging architectural boundary

Messaging is an MVP capability.

The architecture therefore reserves a first-class Messaging responsibility without defining its physical implementation.

Open areas include:

- Conversation lifecycle;
- Message model;
- participants;
- read states;
- attachments;
- realtime;
- notifications;
- channel model;
- Customer/User linkage;
- assignment;
- permissions;
- Order creation;
- Order/Sale boundary;
- Fulfillment interaction;
- retention and audit;
- AI integration boundary.

The exact D-003 WhatsApp non-dependency clause remains pending in the canonical Decision Register and must not be silently resolved here.

> **R3 note (2026-09-30):** superseded — the clause is now `RESOLVED — OWNER-RULED` (*"Wapsell Messaging MVP no depende de WhatsApp."*, Decision Register §8.1). It does not prohibit future integrations; the architecture layer creates no integration and no removal.

AI assistants remain inactive in the initial MVP.

---

## 12. Payments and external integrations

The architecture must permit external payment providers through an explicit integration boundary.

D-011 establishes provider abstraction and payment traceability requirements, with Mercado Pago identified as a priority provider.

The architecture does not yet authorize:

- provider-specific API implementation;
- credentials model;
- webhook contract;
- reconciliation workflow;
- settlement model;
- provider-specific persistence;
- production integration.

Those require the applicable specification and task readiness.

---

## 13. Cash / AR / AP boundaries

Cash, Accounts Receivable and Accounts Payable are separate responsibilities even when operations interact.

The architecture must prevent:

- direct undocumented mutation across domain boundaries;
- implicit financial effects;
- loss of traceability;
- bypass of Business context.

Exact behavior remains open for:

- external payment → Cash;
- AR collection → Cash;
- Sale cancellation → Cash/Payments/AR;
- Purchase → AP;
- supplier payment → Cash/AP;
- reconciliation.

D-013's exact sensitive-operation authorization remains pending and must not be formalized here.

---

## 14. Fulfillment boundary

Fulfillment belongs to the Orders domain.

The architecture therefore treats fulfillment as an Orders responsibility/capability rather than requiring an independent top-level architectural domain.

D-016 still requires detailed specification of:

- lifecycle;
- assignment;
- zones;
- tariffs;
- tracking;
- evidence.

Those details are not defined here.

---

## 15. Branding / Design System boundary

Branding is divided into:

`Wapsell Design System → Business Brand configuration → Business-facing experience`

The Wapsell platform remains the underlying platform identity while the Business Brand is the customer-facing commercial identity.

This architecture baseline does not define:

- token names;
- component library;
- CSS architecture;
- asset pipeline;
- theme storage;
- frontend implementation.

Those belong to the Branding/Design System specification.

---

## 16. AI boundary

AI is a future capability.

For the initial MVP:

- AI assistants are inactive;
- no autonomous AI behavior is authorized;
- no AI execution permissions are defined;
- no AI-specific persistence or runtime architecture is authorized.

The architecture may preserve a future extension boundary, but must not introduce implementation solely for anticipated AI functionality.

---

## 17. Evolution strategy

The initial system should evolve incrementally.

The architecture should favor:

- clear module/domain responsibility;
- explicit dependencies;
- limited coupling;
- testable boundaries;
- reversible changes;
- preservation of existing functionality where still valid;
- incremental extraction only when justified by concrete requirements.

Microservices are not an initial requirement and no migration plan is authorized by this baseline.

---

## 18. Deployment and infrastructure

The current Architecture baseline deliberately does not freeze a deployment topology.

Infrastructure choices must be derived from concrete requirements involving:

- availability;
- security;
- performance;
- observability;
- integrations;
- CI/CD;
- operational constraints.

D-017 does not by itself authorize Kubernetes, service meshes, brokers, caches, cloud-specific services, or other infrastructure additions.

D-018 establishes progressive CI/CD validation as an engineering requirement; its concrete implementation remains a later architecture/engineering task.

---

## 19. Non-functional requirements

The Architecture layer must eventually incorporate NFRs derived from actual requirements and evidence.

At this baseline, the following categories are identified without inventing target values:

- security;
- tenant isolation;
- transactional integrity;
- authorization;
- auditability;
- observability;
- reliability;
- performance;
- maintainability;
- testability;
- deployability.

Specific numerical targets, SLOs, retention periods, encryption mechanisms, scaling thresholds, and infrastructure requirements remain OPEN unless supported by an approved source.

---

## 20. Architectural invariants currently relevant

The Architecture baseline must preserve at least the following already-derived invariants:

- User remains global.
- Business remains the tenancy boundary.
- Membership contextualizes User ↔ Business.
- Customer remains distinct from User.
- Customer remains Business-scoped.
- Inventory belongs exclusively to a Business.
- Cross-Business stock transfer is currently prohibited.
- Inventory operations remain Business-scoped.
- Confirmed Sales are not deleted; cancellation is explicit.
- Applicable Sale effects cannot be left partially applied.
- Closed Cash is not directly modified.
- Fulfillment belongs to Orders.

These are references to the current Invariants layer, not new invariants.

---

## 21. Open architectural details

The following remain explicitly OPEN and must be resolved by the relevant specification chain:

1. D-006 exact authorization mechanics.
2. D-008 exact Sale cancellation/reversal matrix.
3. D-011 payment reconciliation semantics.
4. D-013 sensitive Cash authorization.
5. D-015 AP lifecycle.
6. D-016 detailed Fulfillment lifecycle.
7. Messaging physical and behavioral model.
8. D-003 exact WhatsApp authority issue. *(R3, 2026-09-30: authority issue `RESOLVED — OWNER-RULED`, Decision Register §8.1; other D-003 details remain OPEN.)*
9. NFR/security concrete requirements.
10. Persistence strategy.
11. API boundary specification.
12. Cross-domain interaction mechanism.
13. Transaction/consistency implementation strategy.
14. Integration architecture details.
15. Deployment topology.
16. Observability implementation details.
17. CI/CD implementation details.

Open does not mean absent; it means this Architecture baseline must not decide the item without the applicable authority.

---

## 22. Architectural decision boundary

This document establishes the following **baseline architectural positions** without claiming Owner approval beyond the cited sources:

| Area | Baseline |
|---|---|
| Initial architecture | Modular monolith |
| Tenant boundary | Business |
| Global identity | User |
| User ↔ Business context | Membership |
| Customer identity | Separate from User |
| Messaging | First-class MVP capability |
| Commerce authority | Domain/application rules, not duplicated in Messaging |
| Inventory | Business-owned and isolated |
| Fulfillment | Within Orders responsibility |
| AI | Inactive in initial MVP |
| Microservices | Not initial architecture requirement |
| Physical schema | OPEN |
| API design | OPEN |
| Event model | OPEN |
| Deployment topology | OPEN |
| Infrastructure stack | OPEN |

---

## 23. Verification requirements

Before this Architecture baseline can be considered ready for structural implementation, it requires review against:

- D-017;
- Decision Register provenance;
- current Contracts;
- current Invariants;
- AS-IS evidence;
- TO-BE specifications;
- Plan G1;
- absence of unauthorized implementation commitments.

Verification must distinguish:

- DOCUMENTED architectural position;
- APPROVED architectural decision;
- IMPLEMENTED architectural behavior;
- VERIFIED BY CODE;
- VERIFIED BY TEST;
- VERIFIED BY EXECUTION.

No implementation claim should be inferred from this document.

A downstream task must not bypass Plan G1 by treating this baseline as implementation authorization. Structural implementation requires an Architecture state explicitly ready for the applicable task and all task-local gates to be satisfied.

---

## 24. Status

**ARCHITECTURE BASELINE: DRAFT — AUDITED / REFINED — NOT APPROVED.**

This document satisfies the controlled specification purpose of TASK-ARCH-001 at baseline level, but it does not close all architectural Open Details and does not authorize structural implementation.

### Next controlled review

The current audit result is CONDITIONAL PASS — REFINEMENT REQUIRED BEFORE ARCHITECTURE APPROVAL. The refinements incorporated in this revision address conceptual boundary criteria, AS-IS preservation traceability, and the prohibition against deriving implementation directly from conceptual architecture relationships.

Audit this Architecture baseline for:

1. accidental implementation commitments;
2. contradictions with the canonical Decision Register;
3. contradictions with Contracts;
4. overreach beyond D-017;
5. missing architectural boundaries required by the Plan;
6. unresolved Owner rulings incorrectly treated as settled;
7. preservation of AS-IS functionality;
8. readiness for downstream Contracts/Invariants/Tasks.

Only after that review should the Architecture layer be considered for approval or further refinement.
