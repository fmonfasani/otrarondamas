# Wapsell — Architecture Baseline Audit v0.1

**Status:** DRAFT — AUDIT / NON-NORMATIVE  
**Date:** 2026-09-29  
**Scope:** `10-ARCHITECTURE/00-ARCHITECTURE-BASELINE-v0.1.md`  
**Result:** CONDITIONAL PASS — REFINEMENT REQUIRED BEFORE ARCHITECTURE APPROVAL

## 1. Purpose

This audit reviews the Architecture Baseline against the current Decision Register, Contracts, Invariants, AS-IS / TO-BE material and the implementation plan.

The audit does not approve the Architecture Baseline and does not authorize implementation.

## 2. Executive result

The Architecture Baseline is suitable as a controlled architectural working baseline.

It correctly preserves the current distinction between:

- documented direction;
- reconstructed decision provenance;
- AS-IS evidence;
- TO-BE intent;
- Contracts;
- Invariants;
- implementation authorization.

No physical schema, endpoint, event, migration, infrastructure topology or microservices implementation is silently authorized.

However, the baseline requires refinement before it can be considered ready for architectural approval.

## 3. Findings

### ARCH-AUD-001 — D-017 provenance discipline

**Disposition:** PASS

The document explicitly identifies D-017 as DERIVED / RECONSTRUCTED and states that it must not be presented as OWNER-VERBATIM.

No new Owner decision is created by the Architecture Baseline.

### ARCH-AUD-002 — Modular-monolith direction

**Disposition:** PASS WITH REFINEMENT

The modular-monolith direction is consistent with D-017 and the current Plan.

The document appropriately avoids authorizing a microservices migration.

Refinement required: future architectural approval should define what constitutes an architectural module/domain boundary sufficiently to prevent implementation teams from interpreting the phrase only as folder organization.

No physical structure should be invented during this refinement.

### ARCH-AUD-003 — Architecture versus Contracts

**Disposition:** PASS

The baseline generally respects Contracts as the boundary for domain behavior.

It explicitly avoids implementing Order/Sale, Sale/Inventory, Sale/Cash, Payment, AR/AP, Fulfillment or Messaging behavior from conceptual relationships alone.

This is consistent with the current Contracts layer.

### ARCH-AUD-004 — D-006 authorization

**Disposition:** PASS

The baseline correctly leaves the exact authorization algorithm, guard sequence, token contents, error model and enforcement mechanism OPEN.

It does not convert the conceptual User → Business → Membership → authorization relation into a physical implementation.

### ARCH-AUD-005 — D-003 WhatsApp authority conflict

**Disposition:** PASS WITH REQUIRED TRACEABILITY NOTE

The baseline correctly states that the exact D-003 WhatsApp non-dependency clause remains pending in the canonical Decision Register.

The Messaging contract and Messaging TO-BE must continue to use the Decision Register as the authority for this unresolved detail.

No permanent WhatsApp prohibition is created by the Architecture Baseline.

> **R3 note (2026-09-30) — additive; the disposition above is preserved as historical audit evidence.** The pending authority it refers to is now `RESOLVED — OWNER-RULED` (2026-09-30, R2; Decision Register §8.1). The ruling does not create a permanent prohibition on future integrations.

### ARCH-AUD-006 — Transactional integrity

**Disposition:** PASS

The baseline correctly identifies transactional consistency as an architectural requirement while leaving transaction technique, locking, outbox, queues, saga/process-manager and retry strategy OPEN.

This preserves the distinction between invariant/requirement and implementation mechanism.

### ARCH-AUD-007 — Cross-domain effects

**Disposition:** PASS WITH REFINEMENT

The conceptual interaction map is useful, but phrases such as “Sale may produce applicable inventory effects” and “Purchase can affect inventory” must remain explicitly subordinate to the approved domain specifications.

No implementation task should be derived directly from those statements without the applicable Contract, Invariant and verification definition.

### ARCH-AUD-008 — Messaging as experience versus domain authority

**Disposition:** PASS

The baseline correctly establishes Messaging as a first-class MVP capability while preventing it from becoming an alternative implementation of Commerce rules.

This is aligned with the project principle that conversation is the primary experience and ERP is the operational engine.

Physical Messaging design remains OPEN.

### ARCH-AUD-009 — Payments / Mercado Pago

**Disposition:** PASS

The baseline correctly records provider abstraction and Mercado Pago priority without authorizing provider-specific implementation, credentials, webhooks, reconciliation or production integration.

This remains blocked until the D-011 specification/task readiness chain is complete.

### ARCH-AUD-010 — Cash / AR / AP boundary

**Disposition:** PASS WITH REFINEMENT

The separation of Cash, AR and AP is architecturally appropriate and consistent with current Contracts.

The document correctly keeps D-013 sensitive-operation authorization and financial cross-domain effects OPEN.

Future refinement must avoid turning “separate responsibilities” into a physical service/database/module mandate.

### ARCH-AUD-011 — Fulfillment

**Disposition:** PASS

The baseline correctly treats Fulfillment as belonging to Orders, consistent with D-016.

It does not define lifecycle, assignment, zones, tariffs, tracking or evidence.

### ARCH-AUD-012 — Branding

**Disposition:** PASS WITH DEPENDENCY

The Wapsell Design System → Business Brand → Business-facing experience relationship is consistent with D-004 and TASK-SPEC-001.

The baseline correctly avoids token, CSS, asset and frontend implementation commitments.

Architecture approval should remain dependent on the specialized Branding/Design System specification for details that materially affect application boundaries.

### ARCH-AUD-013 — AI

**Disposition:** PASS

The baseline correctly keeps AI inactive in the initial MVP and avoids creating runtime/persistence implementation for future AI functionality.

### ARCH-AUD-014 — Deployment / infrastructure

**Disposition:** PASS

The baseline does not invent Kubernetes, brokers, caches, service meshes, cloud services or other infrastructure.

D-018 is correctly treated as a later engineering/CI-CD concern.

### ARCH-AUD-015 — NFRs

**Disposition:** PASS WITH REQUIRED FOLLOW-UP

The document identifies NFR categories without inventing numerical targets.

Before structural implementation, concrete security, tenant isolation, transactional integrity, auditability, observability, reliability, performance and deployability requirements should be derived where supported by the Requirements/SPEC/AS-IS evidence.

### ARCH-AUD-016 — AS-IS preservation

**Disposition:** PASS WITH REQUIRED FOLLOW-UP

The document explicitly states that current implementation evidence must determine what is preserved, adapted, replaced or missing.

However, it does not yet provide a concrete architecture-level preservation trace.

Before implementation tasks, affected existing capabilities should be traceable to AS-IS evidence and a TO-BE disposition.

### ARCH-AUD-017 — Architecture approval gate

**Disposition:** PASS

The document correctly ends with verification requirements and an explicit NOT APPROVED status.

This matches Plan G1: Architecture is a hard gate for structural implementation.

## 4. Required refinements before approval

1. Preserve D-017 reconstructed provenance.
2. Add an explicit rule that conceptual architecture relationships cannot directly authorize implementation.
3. Clarify module/domain boundary criteria at a conceptual level without freezing physical folders/packages/services.
4. Add an architecture-level AS-IS preservation trace requirement.
5. Keep D-003, D-006, D-008, D-011, D-013, D-015 and D-016 unresolved where their authoritative details remain open.
6. Keep Messaging physical/behavioral design outside this baseline.
7. Keep Branding implementation details outside this baseline while linking approval to the specialized Branding specification where necessary.
8. Keep NFR categories non-normative until supported by authoritative requirements/evidence.
9. Ensure downstream Tasks cannot bypass G1 by interpreting the baseline as implementation authorization.

## 5. Gate assessment

| Gate | Result | Reason |
|---|---|---|
| Provenance discipline | PASS | D-017 reconstruction is explicitly identified |
| Decision consistency | PASS WITH REFINEMENT | D-003 and other open rulings are preserved |
| Contract consistency | PASS | No domain behavior is silently redefined |
| Invariant consistency | PASS | Current invariants are referenced, not recreated |
| AS-IS preservation | PARTIAL | Principle present; concrete trace still required |
| TO-BE alignment | PARTIAL | Some specialized specs remain open/stale |
| Implementation neutrality | PASS | No physical schema/API/event/infrastructure commitments |
| Downstream readiness | PARTIAL | Architecture approval still requires refinement |

## 6. Conclusion

**CONDITIONAL PASS — REFINEMENT REQUIRED BEFORE ARCHITECTURE APPROVAL.**

The Architecture Baseline is valid as a controlled working document and is appropriate for the current specification phase.

It is not an approved Architecture Specification and does not authorize structural implementation.

The next controlled step is to refine the Architecture Baseline only where the audit identified a concrete gap, then re-read it against the Decision Register, Contracts, Invariants, AS-IS/TO-BE and Plan G1.

No implementation task should be created from this baseline until the Architecture gate is explicitly satisfied.
