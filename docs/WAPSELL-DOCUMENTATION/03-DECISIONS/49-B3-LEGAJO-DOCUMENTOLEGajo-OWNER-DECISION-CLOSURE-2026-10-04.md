# B3 — LEGAJO / DOCUMENTOLEGajo OWNERSHIP — OWNER DECISION CLOSURE — 2026-10-04

**Status:** OWNER-APPROVED — RECORDED FOR PROPAGATION
**Scope:** Block 3 Tenant Isolation — ownership ambiguity closure
**Decision:** Close ISO-OPEN-001 by adopting explicit Business ownership for Legajo and DocumentoLegajo.
**Implementation:** NOT AUTHORIZED
**Code / schema / migration / data changes:** NONE
**Tests executed:** NONE

## 1. Owner decision

The Owner approved option A:

> Legajo and DocumentoLegajo are Business-scoped entities and must have deterministic Business ownership.

The ownership relationship must be explicit and verifiable in the target model. An optional foreign key or client-supplied identifier may not select, change, or bypass Business ownership without validation against the authorized Business context.

## 2. Closed ambiguity

This decision closes the documentary ambiguity previously recorded as:

- ISO-OPEN-001
- ISO-AMBIG-001
- historical ISO-AMBIG

The canonical downstream identifier is ISO-009.

## 3. Normative boundary

For any Business-scoped operation involving Legajo or DocumentoLegajo:

1. a single Business owner must be determinable;
2. the owner must correspond to the authorized Business context;
3. client-provided relationship IDs cannot override that ownership;
4. if ownership cannot be determined unambiguously, the operation fails closed.

This decision does not prescribe whether ownership is represented by a direct empresaId, a derived relation, or another physical mechanism. That is downstream technical specification.

## 4. Propagation target

This decision must be reflected in:

- B3 Contract Reconciliation Addendum;
- B3 Canonical Invariants;
- B3 Tests/Evals Reconciliation;
- B3 Readiness Assessment;
- Transformation Plan / Tasks only where the change affects readiness or task dependencies.

## 5. Evidence state

This is an Owner decision, not implementation evidence.

- [C]: no new implementation claim.
- [T]: 0.
- [E]: 0.
- Verification of ISO-009 remains pending.

**Implementation remains NOT AUTHORIZED.**
