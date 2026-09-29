# Wapsell — Tests / Evals Derivation v0.1

**Status:** DRAFT — NOT APPROVED  
**Date:** 2026-09-29  
**Layer:** Tests / Evals  
**Authority:** Invariants + Decision Register + reconciled Contracts  
**Purpose:** derive a verification strategy from the current invariant set without claiming implementation compliance or inventing undefined behavior.

> This document defines what should be verified if/when the corresponding invariants are approved and implemented. It does not create tests, alter code, define APIs, choose database mechanisms, or close Open Details.

---

## 1. Verification rule

A Test/Eval is a verification instrument, not a source of requirements.

Therefore:

1. an invariant must exist before a test is derived from it;
2. the test must verify the invariant, not silently expand it;
3. undefined behavior must remain undefined;
4. implementation evidence and test evidence remain separate;
5. a passing test can establish evidence about the tested behavior, but cannot approve a business decision;
6. tests must not encode pending Owner rulings.

---

## 2. Evidence model

The project evidence taxonomy remains:

- **VERIFIED BY CODE**
- **VERIFIED BY TEST**
- **VERIFIED BY EXECUTION**
- **DOCUMENTED**
- **NOT DETERMINABLE WITH AVAILABLE INFORMATION**

For this layer, a test result may later produce **VERIFIED BY TEST** evidence.

The current document contains **no test execution evidence**.

---

## 3. Test/Eval matrix

| Invariant | Verification target | Candidate verification | Current status |
|---|---|---|---|
| INV-IDENT-001 | User remains global across Business contexts | Integration/domain test with one User associated to multiple Business contexts; verify identity is not duplicated/redefined by membership | DERIVATION ONLY |
| INV-TEN-001 | Business-scoped resources remain within Business context | Multi-tenant isolation integration tests using two Business contexts and representative scoped resources | DERIVATION ONLY |
| INV-MEM-001 | Business access is contextualized through Membership | Authorization integration tests with same User across multiple Business contexts and distinct Membership states | DERIVATION ONLY; exact auth algorithm OPEN |
| INV-CUST-001 | Customer/User remain distinct concepts | Domain/integration tests for Customer without User and Customer with optional User linkage | DERIVATION ONLY |
| INV-CUST-002 | Customer data remains Business-scoped | Cross-Business isolation tests for Customer read/write operations | DERIVATION ONLY |
| INV-INV-001 | Inventory is Business-exclusive | Multi-tenant inventory isolation tests | DERIVATION ONLY |
| INV-INV-002 | Cross-Business stock transfer is rejected | Negative integration test attempting a cross-Business transfer | DERIVATION ONLY |
| INV-INV-003 | Inventory operations execute only in affected Business context | Authorization + integration isolation tests | DERIVATION ONLY |
| INV-INV-004 | Stock movement is atomic/non-partial | Transactional integration test; concurrency test where implementation supports concurrent operations | DERIVATION ONLY |
| INV-INV-005 | Invalid quantities are rejected | Boundary/negative tests after the exact invalid-quantity definition is approved | BLOCKED BY OPEN DEFINITION |
| INV-SALE-001 | Confirmed Sale is not deleted and cancellation is explicit | Domain/integration tests covering deletion attempt and explicit cancellation path | DERIVATION ONLY; cancellation semantics OPEN |
| INV-SALE-002 | Applicable Sale effects are not partially applied | Transactional consistency tests over only those effects defined by approved domain specifications | BLOCKED FOR FULL EVAL UNTIL EFFECT MATRIX EXISTS |
| INV-CASH-001 | Closed Cash cannot be directly modified | Integration tests for direct mutation attempts and approved correction mechanism | BLOCKED FOR FULL EVAL UNTIL ADJUSTMENT WORKFLOW EXISTS |
| INV-FUL-001 | Fulfillment belongs to Orders domain | Architecture/domain-contract validation rather than a runtime business test | DERIVATION ONLY |

---

## 4. Detailed verification strategy

### TEST-IDENT-001 — Global User identity

**Source:** INV-IDENT-001.

Verify that the same global User can participate in multiple Business contexts without creating a second global identity solely because of Membership.

**Must not assume:**
- physical User identifier;
- schema;
- membership table shape;
- authentication token format.

**Candidate type:** integration/domain.

**Evidence if executed:** VERIFIED BY TEST.

---

### TEST-TEN-001 — Business isolation

**Source:** INV-TEN-001.

Use at least two Business contexts and verify that a representative Business-scoped operation cannot silently read or mutate the other Business's resource.

The exact resource set must be taken from the approved specialized Contracts/specifications.

**Must not assume:** complete resource catalogue or one universal implementation mechanism.

**Candidate type:** integration/security.

---

### TEST-MEM-001 — Membership contextual access

**Source:** INV-MEM-001.

Verify:
- a User can have more than one Business context;
- access to a Business is contextualized through the corresponding Membership;
- changing Business context does not silently inherit another Business's membership.

This test must not freeze the exact D-006 authorization sequence.

**Candidate type:** integration/security.

---

### TEST-CUST-001 — Customer/User separation

**Source:** INV-CUST-001.

Verify two valid conceptual cases:
1. Customer without User;
2. Customer optionally linked to User.

Do not test a physical model that has not been approved.

**Candidate type:** domain/integration.

---

### TEST-CUST-002 — Customer Business isolation

**Source:** INV-CUST-002.

Verify that Customer commercial information from Business A cannot be silently accessed or modified through Business B context.

**Candidate type:** integration/security.

---

### TEST-INV-001 — Business-owned inventory

**Source:** INV-INV-001.

Verify that inventory operations remain associated with their Business and that no shared global stock behavior exists.

**Candidate type:** integration/database where appropriate.

---

### TEST-INV-002 — Cross-Business transfer prohibition

**Source:** INV-INV-002.

Attempt a stock transfer from Business A to Business B.

Expected normative result: the transfer is not permitted under the current specification.

The test must not define a future transfer mechanism.

**Candidate type:** integration/negative.

---

### TEST-INV-003 — Inventory operation isolation

**Source:** INV-INV-003.

Verify that an inventory operation issued under Business A cannot affect inventory belonging to Business B.

**Candidate type:** integration/security.

---

### TEST-INV-004 — Atomic stock movement

**Source:** INV-INV-004.

Verify that a stock movement cannot leave the inventory state and recorded movement partially applied.

Where concurrency is part of the implementation under test, include concurrency scenarios.

The test must verify the invariant, not prescribe transactions, locks, or another mechanism.

**Candidate type:** integration + concurrency.

---

### TEST-INV-005 — Invalid quantity rejection

**Source:** INV-INV-005.

**Blocked.**

The invariant is approved at the normative level only to the extent documented, but the exact definition of an invalid quantity is still OPEN.

No concrete boundary values should be invented here.

---

### TEST-SALE-001 — Confirmed Sale deletion/cancellation

**Source:** INV-SALE-001.

Verify that:
- confirmed Sale is not deleted as a reversal mechanism;
- cancellation is represented as an explicit operation.

The test must not invent cancellation authorization or the complete reversal matrix.

**Candidate type:** domain/integration.

---

### TEST-SALE-002 — Sale effects consistency

**Source:** INV-SALE-002.

**Partially blocked.**

The consistency property can be tested only for effects whose applicability is already defined by approved domain specifications.

The complete evaluation is blocked until the cancellation/effect matrix is specified.

**Candidate type:** integration/transactional/concurrency as applicable.

---

### TEST-CASH-001 — Closed Cash immutability

**Source:** INV-CASH-001.

**Partially blocked.**

Direct modification of closed Cash can be tested.

The correction path cannot be fully tested until the adjustment workflow and authorization semantics are specified.

**Candidate type:** integration.

---

### TEST-FUL-001 — Fulfillment domain ownership

**Source:** INV-FUL-001.

This is not primarily a runtime business test.

Verification should be a structural/domain validation confirming that Fulfillment remains within the Orders domain in the approved architecture/specification.

It must not assert a particular module, folder, endpoint, table, or service because those details are not yet approved.

**Candidate type:** architecture/documentation validation.

---

## 5. Tests explicitly blocked by unresolved specification

The following must not be concretized yet:

| Area | Blocker |
|---|---|
| Invalid inventory quantities | Exact definition of invalid quantity |
| Sale effects | Exact cancellation/reversal matrix |
| Cash corrections | Adjustment workflow |
| Cash sensitive permissions | Pending Owner ruling |
| Payment reconciliation | Exact reconciliation lifecycle |
| Accounts Payable | Lifecycle/application semantics |
| Fulfillment | Detailed states/tracking/zones/tariffs/evidence |
| Messaging | Physical model and behavior |
| AI | Execution scope and permissions |
| WhatsApp | Pending Owner ruling on the specific clause |

A blocked test is not a missing implementation. It is a specification dependency.

---

## 6. Evidence discipline

A future test result must be recorded separately from documentation.

Example:

> INV-INV-001 is DOCUMENTED as a TO-BE invariant.  
> A passing integration test may establish VERIFIED BY TEST for the tested scenario.  
> It does not establish that the entire Wapsell inventory domain is compliant.

Likewise:

> Existing D-014 code evidence is VERIFIED BY CODE for the audited implementation behavior.  
> It is not VERIFIED BY TEST unless a corresponding test has actually executed and passed.

---

## 7. Traceability

| Decision | Contract | Invariant | Candidate Test | Status |
|---|---|---|---|---|
| D-002 | C-IDENT-001 | INV-IDENT-001 | TEST-IDENT-001 | DERIVED |
| D-001 | C-TEN-001 | INV-TEN-001 | TEST-TEN-001 | DERIVED |
| D-002 | C-MEM-001 | INV-MEM-001 | TEST-MEM-001 | DERIVED |
| D-002-bis | C-CUST-001/CUST-002 | INV-CUST-001 | TEST-CUST-001 | DERIVED |
| D-002-bis | C-CUST-001/CUST-002 | INV-CUST-002 | TEST-CUST-002 | DERIVED |
| D-014 | C-INV-001 | INV-INV-001 | TEST-INV-001 | DERIVED |
| D-014 | C-INV-002 | INV-INV-002 | TEST-INV-002 | DERIVED |
| D-014 | C-INV-003 | INV-INV-003 | TEST-INV-003 | DERIVED |
| D-010 | C-INV-004 | INV-INV-004 | TEST-INV-004 | DERIVED |
| D-010 | C-INV-005 | INV-INV-005 | TEST-INV-005 | BLOCKED |
| D-008 | C-SALE-001 | INV-SALE-001 | TEST-SALE-001 | DERIVED |
| D-008 | C-SALE-001 | INV-SALE-002 | TEST-SALE-002 | BLOCKED |
| D-013 | C-CASH-003 | INV-CASH-001 | TEST-CASH-001 | BLOCKED/PARTIAL |
| D-016 | C-FUL-001 | INV-FUL-001 | TEST-FUL-001 | DERIVED |

---

## 8. Advancement gate

Tests/Evals must not advance to implementation until:

- [ ] every candidate test has a stable invariant source;
- [ ] blocked tests are explicitly tied to Open Details;
- [ ] no test invents undefined business behavior;
- [ ] test type is chosen according to the invariant rather than implementation preference;
- [ ] expected results are derived from approved normative text;
- [ ] evidence status remains separate from documentation;
- [ ] no test claims full-domain compliance from a partial scenario;
- [ ] pending Owner rulings remain outside executable acceptance criteria.

**Current status: DRAFT — DERIVATION COMPLETE / NOT APPROVED FOR IMPLEMENTATION.**

---

## 9. Non-actions

This document does not:

- create executable tests;
- modify application code;
- modify database schema;
- define API contracts;
- resolve Open Details;
- resolve pending Owner rulings;
- declare any invariant VERIFIED BY TEST;
- declare Wapsell implementation compliant;
- authorize CI/CD or deployment changes.

---

## 10. Next controlled step

Before writing executable tests, perform an audit of this Tests/Evals derivation against:

1. the current Invariants document;
2. the Contracts audit;
3. the Decision Register;
4. the relevant specialized TO-BE specifications.

The audit should detect:
- tests that are too strong;
- tests that are too weak;
- tests that accidentally define business behavior;
- tests blocked by unresolved specification;
- missing verification coverage;
- inappropriate test levels;
- traceability gaps.

Only after that audit should executable tests be planned.
