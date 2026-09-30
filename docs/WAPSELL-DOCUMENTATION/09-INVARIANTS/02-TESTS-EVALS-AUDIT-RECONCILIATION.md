# Wapsell — Tests / Evals Audit & Reconciliation

**Status:** DRAFT — AUDIT / NON-NORMATIVE  
**Date:** 2026-09-29  
**Scope:** `09-INVARIANTS/01-TESTS-EVALS-DERIVATION-v0.1.md` against the current Invariants, Decision Register and Contracts audit.

## 1. Overall result

**Result: CONDITIONAL PASS — REFINEMENT REQUIRED BEFORE EXECUTABLE TEST PLANNING.**

The derivation is structurally sound: it distinguishes candidate verification from executed evidence and preserves unresolved specifications as blockers.

Four documentation refinements are required:

1. Do not describe `INV-IDENT-001` testing as proving “no duplicated global identity” unless the approved model defines what constitutes duplication.
2. Separate `INV-MEM-001` contextual membership verification from the still-open exact D-006 authorization algorithm.
3. Mark `TEST-INV-002` as a negative acceptance test whose expected rejection is already supported by Owner-ruled D-014.
4. Treat `TEST-FUL-001` as a structural/documentation evaluation, not an architecture implementation test, until Architecture is approved.

No executable tests should be created by this audit.

## 2. Test-by-test audit

| Candidate | Result | Finding |
|---|---|---|
| TEST-IDENT-001 | REFINE | Global identity is testable conceptually, but “no duplication” must not imply a physical uniqueness/schema rule not yet approved. |
| TEST-TEN-001 | PASS | Correctly tests Business isolation while leaving resource catalogue and mechanism open. |
| TEST-MEM-001 | REFINE | Valid Membership-context test; must not become an implementation of the four-step D-006 algorithm while that detail remains open. |
| TEST-CUST-001 | PASS | Directly derives from Customer/User separation. |
| TEST-CUST-002 | PASS | Correct Business-isolation test. |
| TEST-INV-001 | PASS | Supported by D-014 and C-INV-001. |
| TEST-INV-002 | PASS / ACCEPTANCE | Cross-Business transfer prohibition is currently Owner-ruled and therefore has a normative expected negative result. |
| TEST-INV-003 | PASS | Correctly tests Business-scoped operation. |
| TEST-INV-004 | PASS | Correct target for atomicity/non-partiality; concurrency remains implementation/test-context dependent. |
| TEST-INV-005 | BLOCKED | Correctly blocked because invalid quantity is undefined. |
| TEST-SALE-001 | PASS WITH SCOPE | Non-deletion and explicit cancellation are testable; authorization/effects remain open. |
| TEST-SALE-002 | BLOCKED | Correctly blocked by open effect matrix. |
| TEST-CASH-001 | PARTIAL | Closed-cash direct mutation can be tested; correction path remains blocked. |
| TEST-FUL-001 | REFINE | Structural/domain ownership validation, not runtime architecture implementation verification. |

## 3. Important distinction: invariant verification vs decision verification

The Tests/Evals layer must not silently turn a candidate test into a broader acceptance criterion.

Example:

**D-014 / INV-INV-002**

The current documentation supports the normative negative result:

> Cross-Business stock transfer is prohibited under the current specification.

Therefore a test attempting such a transfer can have an expected rejection.

But the test must not additionally invent:
- a specific HTTP status;
- an error code;
- an exception class;
- a UI message;
- a rollback mechanism.

Those are implementation/API details not currently authorized.

Likewise:

**D-010 / INV-INV-004**

The test can require no partial stock movement, but cannot prescribe transaction isolation level, SQL mechanism, lock strategy, or ORM behavior.

## 4. Corrections required

### CORR-TEST-001 — Global User

Replace the phrase:

> “verify identity is not duplicated/redefined by membership”

with a narrower verification objective:

> “verify that Membership context does not redefine the User as a Business-owned identity.”

This avoids converting the test into an unapproved physical uniqueness constraint.

### CORR-TEST-002 — Membership

Keep the test focused on contextual Membership.

It may verify that a User's Business context is determined through the relevant Membership, but must not assert a particular four-step authorization algorithm while D-006's exact mechanics remain open.

### CORR-TEST-003 — Cross-Business transfer

Retain the negative test and classify it as:

**NORMATIVE ACCEPTANCE CANDIDATE — D-014 OWNER-RULED.**

The expected normative result is rejection of the cross-Business transfer.

The concrete rejection mechanism remains open.

### CORR-TEST-004 — Fulfillment

Change TEST-FUL-001 from “architecture/domain-contract validation” to:

**STRUCTURAL / DOCUMENTATION EVAL**

until the Architecture layer establishes the approved domain decomposition.

The evaluation should only establish that the approved specification assigns Fulfillment to Orders.

## 5. Coverage audit

Current invariant coverage:

- Identity: covered.
- Tenancy: covered.
- Membership: covered.
- Customer/User: covered.
- Inventory ownership/isolation: covered.
- Stock atomicity: covered.
- Invalid quantities: explicitly blocked.
- Sale non-deletion/cancellation: partially covered.
- Sale effects consistency: explicitly blocked.
- Cash closure: partially covered.
- Fulfillment ownership: covered structurally.

No invariant currently lacks a candidate verification path.

This does **not** mean all requirements have tests. It means every current formalized invariant has a documented verification direction.

## 6. Missing tests intentionally not added

No new candidate tests are created for:

- D-006 exact authorization algorithm;
- D-008 cancellation/reversal matrix;
- D-011 reconciliation lifecycle;
- D-013 sensitive Cash permissions;
- D-015 Accounts Payable lifecycle;
- D-016 detailed fulfillment lifecycle;
- Messaging physical model;
- AI execution;
- WhatsApp pending clause *(R3, 2026-09-30, additive: clause now `RESOLVED — OWNER-RULED`, Decision Register §8.1; no test or eval derived in R3)*;
- D-017 architecture implementation;
- D-018 CI/CD implementation.

These require specifications or decisions not currently formalized at the invariant/test level.

## 7. Evidence classification

All candidate tests remain:

**DERIVATION ONLY**

or, where explicitly blocked:

**BLOCKED BY OPEN SPECIFICATION**.

None is:
- VERIFIED BY TEST;
- VERIFIED BY EXECUTION;
- VERIFIED BY CODE.

A candidate test is not evidence that the current repository satisfies the invariant.

## 8. Gate

After the four wording corrections:

- [x] Candidate tests trace to existing invariants.
- [x] Undefined behavior remains blocked.
- [x] D-014 negative requirement is correctly represented.
- [x] D-010 implementation mechanism remains unspecified.
- [x] No test invents API/schema/error details.
- [x] No pending Owner ruling is encoded as an executable acceptance criterion.
- [ ] Executable test plan has not yet been created.
- [ ] Test implementation has not started.
- [ ] Architecture/NFR-level verification remains pending its own specifications.

**Gate status: NOT READY FOR TEST IMPLEMENTATION.**

## 9. Conclusion

The Tests/Evals derivation is suitable as a controlled input to the next planning layer after the four documentation refinements above.

The next layer should be **PLAN**, not implementation.

Before implementation, the project still needs to distinguish:
- what must be tested now;
- what is blocked by specification;
- what is an existing AS-IS verification obligation;
- what belongs to future Architecture/NFR/CI-CD validation.

No code or executable test is authorized by this audit.
