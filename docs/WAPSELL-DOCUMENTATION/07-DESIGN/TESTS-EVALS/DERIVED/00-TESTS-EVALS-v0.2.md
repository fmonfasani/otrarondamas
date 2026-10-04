# WAPSELL — Canonical Tests / Evals v0.2

**Status:** DRAFT — NOT APPROVED  
**Date:** 2026-10-03  
**Layer:** Tests / Evals  
**Authority:** Canonical Invariants v0.2 + reconciled Contracts  
**Derived from:** `07-DESIGN/INVARIANTS/DERIVED/00-INVARIANTS-v0.1.md` (canonical content v0.2) + R6 Invariants Canonical Audit

> This document derives verification criteria from the current canonical invariant candidates. It does not claim that tests exist, have been executed, or that implementation complies. It does not resolve OPEN specifications or define test-framework, API, schema, CI, infrastructure, or transaction mechanisms.

---

## 1. Derivation rule

The verification chain is:

`Requirement → Contract → Invariant → Test/Eval → Implementation → Evidence`

A test/eval is eligible only when the behavior it verifies is sufficiently bounded by an authoritative invariant or contract.

Tests must not:

- infer implementation mechanisms from domain rules;
- convert OPEN details into requirements;
- assume a specific framework, endpoint, database constraint, JWT claim or transaction boundary;
- use current AS-IS behavior as proof of TO-BE compliance.

Historical tests remain in the R6 baseline and are not silently deleted or reclassified as canonical.

---

## 2. Evidence states

- **SPECIFIED:** verification criterion defined.
- **IMPLEMENTED:** test/eval exists in implementation.
- **EXECUTED:** test/eval has been run.
- **PASSED:** execution produced acceptable evidence.
- **FAILED:** execution produced evidence of non-compliance.
- **BLOCKED:** criterion cannot be meaningfully executed without an OPEN semantic/contract decision.
- **NOT EXECUTED:** criterion is specified but no execution evidence exists.

All tests/evals in this document are initially **SPECIFIED** unless explicitly marked otherwise.

---

## 3. Identity & Tenancy

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-ID-001 | INV-IDENT-001 | The same User identity can participate in more than one Business context without becoming separate User identities. | Functional | SPECIFIED |
| TE-ID-002 | INV-MEM-001 | A User without Membership for Business B cannot operate in Business B solely because the User has Membership for Business A. | Isolation/Security | SPECIFIED |
| TE-ID-003 | INV-MEM-002 | An INACTIVE Membership cannot authorize a Business-scoped operation. | Authorization | SPECIFIED |
| TE-ID-004 | INV-IDENT-002 | Two distinct Users cannot be established with the same normalized email identity. | Integrity | SPECIFIED |
| TE-ID-005 | INV-CUST-001 | A Customer can exist without a User association. | Domain | SPECIFIED |
| TE-ID-006 | INV-CUST-002 | Email equality alone does not automatically create Customer↔User association. | Security/Domain | SPECIFIED |
| TE-ID-007 | INV-CUST-003 | Customer commercial data from Business A cannot silently appear in Business B. | Isolation | SPECIFIED |
| TE-TEN-001 | INV-TEN-001 | A Business-scoped resource remains associated with its Business context and cannot silently cross into another Business context. | Isolation | SPECIFIED |

**OPEN:** physical identity model, normalization algorithm, physical tenant isolation, association mechanics.

---

## 4. Authorization

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-AUTH-001 | INV-AUTH-001 | Authentication without a valid target Business Membership is insufficient for a Business-scoped operation. | Security | SPECIFIED |
| TE-AUTH-002 | INV-AUTH-001 | A valid Membership alone is insufficient when the operation lacks applicable authorization. | Security | SPECIFIED |
| TE-AUTH-003 | INV-AUTH-002 | The canonical authorization model does not introduce Profile/Capability/Individual Override precedence and is constrained to Membership→Role→Permission. | Domain/Architecture | SPECIFIED |
| TE-AUTH-004 | INV-AUTH-003 | Hiding an action in UI does not constitute the authorization decision for the underlying operation. | Security | SPECIFIED |

**OPEN / implementation-blocked:** exact Permission catalogue, Role→Permission matrix and technical enforcement cannot yet be tested as implementation behavior.

**OPEN:** permission catalogue, Role→Permission matrix and technical enforcement.

---

## 5. Commerce — Product / Cart / Order / Sale

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-COM-001 | INV-COM-001 | Global Product identity is not silently duplicated to represent Business-specific commercial configuration. | Domain/Isolation | SPECIFIED |
| TE-COM-002 | INV-CART-001 | A Cart can exist before Customer association. | Domain | SPECIFIED |
| TE-COM-003 | INV-CART-001 | Order creation is rejected/blocked when the required Customer context is absent. | Domain | SPECIFIED |
| TE-COM-004 | INV-CART-002 | A Cart cannot mix products or commercial configuration across Business contexts. | Isolation | SPECIFIED |
| TE-COM-005 | INV-ORD-001 | Creating or maintaining an Order does not by itself create a Sale. | Domain | SPECIFIED |
| TE-COM-006 | INV-ORD-002 | Commercial Order confirmation requires Business authorization governed by ORDER_CONFIRM. | Authorization | SPECIFIED |
| TE-COM-007 | INV-ORD-002 | Customer confirmation/intent alone cannot satisfy Business authorization for Order confirmation. | Security | SPECIFIED |
| TE-COM-008 | INV-SALE-001 | Sale creation occurs at commercial confirmation rather than merely at Order creation or delivery. | Domain | SPECIFIED |
| TE-COM-009 | INV-SALE-002 | A confirmed Sale cannot be edited/deleted as if the original operation never existed. | Integrity | SPECIFIED |
| TE-COM-010 | INV-SALE-003 | An applicable Sale operation does not leave its approved effects partially applied. | Integrity | SPECIFIED |

**OPEN:** exact state machines and cancellation/reversal/refund effect matrix.

---

## 6. Inventory

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-INV-001 | INV-INV-001 | Inventory belonging to Business A cannot be operated on as Business B inventory. | Isolation | SPECIFIED |
| TE-INV-002 | INV-INV-003 | A valid inventory operation cannot produce negative stock. | Integrity | SPECIFIED |
| TE-INV-003 | INV-INV-004 | Confirmed Order causes the corresponding stock reservation required by the canonical rule. | Domain | SPECIFIED |
| TE-INV-004 | INV-INV-005 | Physical stock decrement is represented by a stock-out movement corresponding to actual physical stock exit. | Domain/Audit | SPECIFIED |
| TE-INV-005 | INV-INV-006 | Where expiry applies, stock selection follows FEFO. | Domain | SPECIFIED |
| TE-INV-006 | INV-INV-006 | Where expiry does not apply, stock selection follows FIFO. | Domain | SPECIFIED |
| TE-INV-007 | INV-INV-007 | Inventory can operate with the generic Location concept and at least one conceptual MAIN Location. | Domain | SPECIFIED |

**OPEN:** reservation transaction boundaries, locking, lot/batch representation and physical Location model.

---

## 7. Cash / AR

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-CASH-001 | INV-CASH-001 | Cash context from Business A cannot be mixed with Business B. | Isolation | SPECIFIED |
| TE-CASH-002 | INV-CASH-002 | Cash operations respect the conceptual Apertura→Operaciones/Movimientos→Arqueo→Cierre lifecycle. | Domain | SPECIFIED |
| TE-CASH-003 | INV-CASH-003 | A closed Cash cannot be directly modified. | Integrity | SPECIFIED |
| TE-CASH-004 | INV-CASH-004 | A sensitive Cash operation requires the applicable specific Permission. | Security | SPECIFIED |
| TE-AR-001 | INV-AR-001 | A receivable remains within its Business and Customer commercial context. | Isolation | SPECIFIED |

**OPEN:** exact Cash state machine, adjustment workflow, Payment↔Cash effects and AR allocation/credit formulas.

---

## 8. Messaging

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-MSG-001 | INV-MSG-001 | A commercial Conversation belongs to exactly one Business. | Isolation | SPECIFIED |
| TE-MSG-002 | INV-MSG-002 | A Customer can participate in Messaging without a User identity. | Domain | SPECIFIED |
| TE-MSG-003 | INV-MSG-003 | An action initiated from Messaging is rejected when the underlying domain authorization is absent. | Security/Integration | SPECIFIED |
| TE-MSG-004 | INV-MSG-004 | MVP Messaging can operate without dependency on WhatsApp. | Architecture/Domain | SPECIFIED |
| TE-MSG-005 | INV-MSG-005 | MVP does not activate autonomous AI assistant behavior. | Scope/Security | SPECIFIED |

**OPEN:** physical messaging model, realtime, notifications, retention, attachments and external channels.

---

## 9. Fulfillment

| ID | Invariant | Verification criterion | Type | Status |
|---|---|---|---|---|
| TE-FUL-001 | INV-FUL-001 | Fulfillment requirements are evaluated under the Orders domain boundary rather than against an independent Fulfillment domain specification. | Domain/Architecture | SPECIFIED |
| TE-FUL-002 | INV-FUL-002 | Repartidor is not required as an MVP Membership Role. | Scope/Authorization | SPECIFIED |

**OPEN:** delivery states, tracking, zones, tariffs, evidence, timeout/escalation and future actor model.

---

## 10. Negative / abuse evaluation families

The following evaluation families are derived from the canonical invariants and should be instantiated once their relevant implementation surfaces exist:

1. cross-Business access using a Membership from another Business;
2. operation using INACTIVE Membership;
3. authentication without Business Membership;
4. insufficient Role/Permission authorization;
5. UI-hidden action invoked through another application surface;
6. Customer/User association triggered only by equal email;
7. cross-Business Cart contamination;
8. Order confirmation without `ORDER_CONFIRM`;
9. Customer confirmation treated as Business authorization;
10. editing/deleting confirmed Sale;
11. negative stock attempt;
12. inventory operation against another Business;
13. invalid stock-selection order against FEFO/FIFO;
14. direct modification of closed Cash;
15. sensitive Cash operation without required Permission;
16. Messaging action bypassing domain authorization;
17. cross-Business Conversation access.

These are **evaluation families**, not claims that corresponding automated tests already exist.

---

## 11. Review corrections incorporated

The R7 review identified and corrected three issues before advancing the gate:

1. **Coverage gap closed:** `INV-TEN-001` now has dedicated criterion `TE-TEN-001`.
2. **Authorization boundary narrowed:** the test does not assert a technical permission implementation; it verifies only the canonical conceptual model. Exact catalogue/matrix/enforcement remain OPEN.
3. **Fulfillment criterion narrowed:** it verifies the approved domain boundary without implying a separate technical module/package architecture.

No implementation detail was introduced by these corrections.

---

## 12. Explicitly excluded / BLOCKED

The following are not canonical executable tests yet because their governing semantics remain OPEN:

- exact Order/Sale state-machine tests;
- cancellation/reversal/refund effect tests;
- Payment reconciliation lifecycle tests;
- Payment↔Cash effect tests;
- AR credit formula tests;
- Cash adjustment/state-machine tests beyond the closed lifecycle boundary;
- inventory transaction/locking/concurrency tests requiring unspecified boundaries;
- physical Location model tests;
- detailed Messaging realtime/retention/notification tests;
- Return/Refund state-machine tests;
- delivery timeout/escalation tests;
- AI execution tests;
- external-channel implementation tests;
- exact Customer↔User merge/unlink mechanics;
- JWT/session implementation tests;
- physical tenant-isolation mechanism tests;
- API/event contract tests where those contracts are not yet approved.

A blocked test must not be made executable by inventing the missing semantic rule.

---

## 13. Historical baseline disposition

The existing:

`07-DESIGN/TESTS-EVALS/BASELINE/00-R6-TESTS-EVALS-BASELINE-001-490.md`

is retained as historical baseline.

The following baseline material is not promoted automatically because it conflicts with or exceeds the current canonical boundary:

- Profile/Capability/Individual Override authorization tests;
- Driver/Repartidor operational state tests;
- Purchase/Receiving tests while Purchases/AP remain outside the initial MVP;
- detailed Promotion precedence/combination tests;
- detailed Refund/Return state-machine tests;
- legacy session tests requiring technical transition semantics;
- provider-specific notification/payment tests not bounded by current contracts.

No historical baseline test is deleted.

---

## 14. Traceability

| Test family | Invariant(s) | Contract/source | Status |
|---|---|---|---|
| Identity/Tenancy | INV-IDENT-001, INV-MEM-001/002, INV-IDENT-002, INV-CUST-001/002/003 | R5 Identity Contracts | SPECIFIED |
| Authorization | INV-AUTH-001/002/003 | R5 Identity Contracts | SPECIFIED |
| Commerce | INV-COM-001, INV-CART-001/002, INV-ORD-001/002, INV-SALE-001/002/003 | R5 Commerce Contracts | SPECIFIED |
| Inventory | INV-INV-001..007 | R5 Inventory/Commerce Contracts | SPECIFIED |
| Cash/AR | INV-CASH-001..004, INV-AR-001 | R5 Cash Contracts + Commerce AR boundary | SPECIFIED |
| Messaging | INV-MSG-001..005 | R5 Messaging Contracts | SPECIFIED |
| Fulfillment | INV-FUL-001/002 | R5 Commerce Contracts | SPECIFIED |

---

## 15. Evidence status

No test in this document is claimed as:

- IMPLEMENTED;
- EXECUTED;
- PASSED;
- FAILED.

Current evidence state:

| Evidence | State |
|---|---|
| Canonical test/eval criteria | SPECIFIED |
| Automated tests | NOT CREATED |
| Test execution | NOT EXECUTED |
| Coverage | NOT DETERMINABLE |
| CI validation | NOT EXECUTED |
| E2E validation | NOT EXECUTED |
| Production validation | NOT EXECUTED |

---

## 16. Advancement gate

The Tests/Evals layer is ready for controlled planning only when:

- [x] canonical invariants are identified;
- [x] stale historical test families are separated from current canonical criteria;
- [x] each canonical invariant has a verification criterion where meaningful;
- [x] R7 review corrections applied for tenancy coverage, authorization scope and Fulfillment boundary;
- [x] OPEN semantics remain explicitly blocked;
- [x] no framework or implementation mechanism is assumed;
- [x] evidence states distinguish specification from execution;
- [ ] Owner approval of Tests/Evals v0.2;
- [ ] implementation test plan;
- [ ] implementation of tests;
- [ ] test execution and evidence.

**Current status: DRAFT — DERIVED / NOT APPROVED.**

---

## 17. Non-actions

This document does not:

- modify code;
- modify schema;
- create migrations;
- define APIs;
- define event payloads;
- define JWT/session mechanics;
- select a test framework;
- create automated tests;
- execute tests;
- claim implementation compliance;
- resolve OPEN domain decisions.

**R7 TEST/EVAL DERIVATION: REVIEWED / RECONCILED — DRAFT / NOT APPROVED.**


## R8 ARCHITECTURE CLOSURE — TEST/EVAL RECONCILIATION — 2026-10-03

The verification layer must include negative tests/evals for the approved tenant/authentication boundary:

- authenticated User with valid Membership in Business A cannot access Business B;
- INACTIVE Membership cannot execute protected Business-scoped operations;
- missing Business Context fails closed;
- invalid Business Context fails closed;
- client-supplied Business identifier cannot override the established Business Context;
- a valid JWT without a valid Membership for the target Business is insufficient for authorization;
- cross-Business create/read/update/delete is denied;
- unique lookups cannot expose records from another Business;
- nested/related persistence cannot escape Business ownership.

These tests verify the approved properties and must remain implementation-agnostic. They do not authorize a specific JWT claim set, API, ORM, database isolation mechanism or session design.
\n\n## R8-INV-002 TEST/EVAL RECONCILIATION — 2026-10-03\n\n| ID | Criterion | Status |\n|---|---|---|\n| TE-INV-008 | Confirming an Order reserves stock without reducing physical on-hand stock. | SPECIFIED |\n| TE-INV-009 | A reservation cannot exceed available stock. | SPECIFIED |\n| TE-INV-010 | Concurrent confirmations cannot oversubscribe the same available stock. | SPECIFIED |\n| TE-INV-011 | A failed reservation leaves no partial reservation effect. | SPECIFIED |\n| TE-INV-012 | Physical stock exit is represented by a stock-out movement. | SPECIFIED |\n| TE-INV-013 | Cancellation before physical exit releases the applicable reservation. | SPECIFIED |\n| TE-INV-014 | Partial physical exit preserves reserved versus physically removed quantities. | SPECIFIED |\n\nThese criteria are not automated tests and have not been executed. The physical concurrency mechanism remains open; the evaluation criterion is implementation-agnostic.\n

## R8-ORD-002 TEST/EVAL RECONCILIATION — 2026-10-03

| ID | Criterion | Status |
|---|---|---|
| TE-ORD-001 | Order and Sale maintain separate lifecycles; fulfillment state changes do not by themselves redefine Sale state. | SPECIFIED |
| TE-ORD-002 | Business-authorized ORDER_CONFIRM creates the Sale at commercial confirmation rather than at delivery. | SPECIFIED |
| TE-ORD-003 | Customer intent/confirmation alone cannot satisfy Business authorization for commercial Order confirmation. | SPECIFIED |
| TE-ORD-004 | Confirmed Sale cannot be arbitrarily edited/deleted as if the original operation never existed. | SPECIFIED |
| TE-ORD-005 | Payment completion does not determine Sale creation or Sale lifecycle state. | SPECIFIED |
| TE-ORD-006 | Cancellation before physical stock exit releases applicable reservation without inventing a physical stock-out. | SPECIFIED |
| TE-ORD-007 | A cancelled Order does not reopen through a simple normal-state toggle. | SPECIFIED |
| TE-ORD-008 | Delivery/fulfillment completion does not create the Sale when commercial confirmation already created it. | SPECIFIED |

These are specified verification criteria only. Exact state-transition tests and complete cancellation/reversal/refund cross-domain effect tests remain blocked until their respective specialized contracts are closed.

## R8-PAY-002 TEST/EVAL RECONCILIATION — 2026-10-03

| ID | Criterion | Status |
|---|---|---|
| TE-PAY-001 | Payment lifecycle can progress independently from Sale lifecycle. | SPECIFIED |
| TE-PAY-002 | Multiple partial Payments can cumulatively settle a Sale without requiring one-payment settlement. | SPECIFIED |
| TE-PAY-003 | A Payment exceeding the applicable outstanding amount is rejected unless a separate approved surplus/credit rule exists. | SPECIFIED |
| TE-PAY-004 | Refund/reversal preserves traceability and does not erase the original Payment event. | SPECIFIED |
| TE-PAY-005 | Payment and AR application remain distinguishable in the domain model. | SPECIFIED |
| TE-PAY-006 | Payment reconciliation does not implicitly reconcile Cash or AR. | SPECIFIED |

These are verification criteria only; no automated test has been created or executed. Exact state transitions, refund mechanics and cross-domain effects remain blocked until their specialized contracts are closed.


## R8-PAY-003 TEST/EVAL RECONCILIATION — 2026-10-03

| ID | Criterion | Status |
|---|---|---|
| TE-PAY-CASH-001 | Payment Cash effects respect the approved payment-method boundary. | SPECIFIED |
| TE-PAY-CASH-002 | Cash impact timing follows the applicable payment-method confirmation/evidence semantics. | SPECIFIED |
| TE-PAY-AR-001 | Payment and AR application remain distinguishable. | SPECIFIED |
| TE-PAY-AR-002 | A Payment can be applied partially or fully to applicable AR obligations. | SPECIFIED |
| TE-PAY-AR-003 | A Payment can exist without creating an AR obligation. | SPECIFIED |
| TE-PAY-AR-004 | Partial Payment does not automatically create AR. | SPECIFIED |
| TE-PAY-REF-001 | Refund/correction preserves historical Payment traceability and produces compensating Cash effects when applicable. | SPECIFIED |
| TE-PAY-SALE-001 | Sale cancellation does not erase historical Payments. | SPECIFIED |

Verification criteria only. No automated tests are created or executed by this reconciliation.


## R8-INV-003 TEST/EVAL RECONCILIATION — 2026-10-03

| ID | Criterion | Status |
|---|---|---|
| TE-LOC-001 | A Location cannot belong to more than one Business. | SPECIFIED |
| TE-LOC-002 | A Business supports a MAIN Location and may have additional Locations. | SPECIFIED |
| TE-LOC-003 | MVP does not require separate Branch/Warehouse/Deposito entity semantics. | SPECIFIED |
| TE-LOC-004 | MAIN is represented as a Location role rather than a separate entity type. | SPECIFIED |
| TE-LOC-005 | Location/Inventory association is not assumed before specialized Inventory physical-model specification. | SPECIFIED |

No automated tests were created or executed by this reconciliation.

## R8-B2 OWNER CLOSURE TEST/EVAL ADDENDUM — 2026-10-04

| ID | Criterion | Status |
|---|---|---|
| TE-B2-001 | A `(User, Business)` pair cannot have more than one ACTIVE Membership. | SPECIFIED |
| TE-B2-002 | A Membership has exactly one effective MVP Role. | SPECIFIED |
| TE-B2-003 | A protected Business-scoped operation fails closed when Business Context or ACTIVE Membership is absent/invalid. | SPECIFIED |
| TE-B2-004 | Public/pre-context authentication paths are not incorrectly rejected merely because no Business Permission exists. | SPECIFIED |
| TE-B2-005 | A protected operation evaluates current server-side Membership/authorization state rather than trusting stale token claims alone. | SPECIFIED |
| TE-B2-006 | Legacy `UsuarioPermiso`/`Permiso` cannot be retired for an affected path without an explicit reviewed mapping to target Role→Permission. | SPECIFIED |
| TE-B2-007 | Legacy retirement is treated as a controlled cutover/process gate rather than an implicit runtime behavior. | SPECIFIED |
| TE-B2-008 | Customer-facing responses do not expose secrets or authorization-sensitive data. | SPECIFIED |
| TE-B2-009 | Critical-operation additional authorization control is required at the conceptual boundary, while its exact technical mechanism remains OPEN. | SPECIFIED |

No automated test is created or executed by this addendum.

**Reference:** `03-DECISIONS/47-B2-OWNER-DECISION-CLOSURE-2026-10-04.md`.
