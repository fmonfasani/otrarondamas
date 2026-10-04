# B3 TESTS/EVALS — OWNER DECISION CLOSURE — 2026-10-04

**Status:** OWNER-APPROVED — RECORDED FOR PROPAGATION
**Scope:** Block 3 (Tenant Isolation) — Tests/Evals strategy
**Decisions:** B3-TEST-001 … B3-TEST-025 (25)
**Implementation:** NOT AUTHORIZED
**Code / schema / migration / data changes:** NONE
**Tests executed by this document:** NONE

---

## 1. Purpose

Record, in the decision layer, the 25 Owner decisions on how Block 3 Tests/Evals are derived, specified, executed and closed. Until this record, these decisions existed only in the Owner's instruction of 2026-10-04 and in no repository artifact (verified by search: zero hits for `B3-TEST-` before this file).

This record does not reinterpret or reopen any decision. It transcribes them and states what they bind.

## 2. Authority

Owner acceptance, 2026-10-04. Precedence applied: OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > CONTRACTS > INVARIANTS > AUDIT > HISTORICAL.

Upstream (not modified by this record): R8-ARCH-002 (CLOSED — OWNER APPROVED), B3 Contract Reconciliation Addendum (`07-DESIGN/CONTRACTS/DOMAIN/27-…`), B3 Canonical Invariants (`07-DESIGN/INVARIANTS/DERIVED/06-BLOCK-3-TENANT-ISOLATION-INVARIANTS-v0.1.md`).

## 3. Accepted decisions

| ID | Topic | Option | Decision |
|---|---|---|---|
| B3-TEST-001 | Canonical test level | C | Unit + integration. Order: unit first, then PostgreSQL/Prisma integration. E2E later, once auth/Business context is sufficiently implemented. |
| B3-TEST-002 | Data source | C | Existing seed + B3-specific fixtures. |
| B3-TEST-003 | Fixtures | C | Two Businesses + users/memberships + the related entities each test needs. |
| B3-TEST-004 | Tenant identification | C | Create the Businesses inside each suite and keep their IDs in variables. |
| B3-TEST-005 | Isolation goal | D | Verify the observable isolation property and, when useful, also the technical mechanism. |
| B3-TEST-006 | Creation | C | The server context determines the Business; a client `empresaId` cannot override it. |
| B3-TEST-007 | Cross-Business reads | C | The system never returns the other Business's record; no uniform error code is imposed unless the contract does. |
| B3-TEST-008 | Cross-Business update/delete | D | Only the current Business's records may be affected; the final persisted state is also verified. |
| B3-TEST-009 | Unique lookups | D | Test the lookup mechanisms that actually exist in code; invent no surface. |
| B3-TEST-010 | Nested / related ownership | C | Direct FK + nested writes + relevant indirect relations. |
| B3-TEST-011 | Legajo / DocumentoLegajo | C | Keep OPEN / NOT TESTABLE while ownership is not sufficiently determined; invent no tenant rule. |
| B3-TEST-012 | Transactions | D | Operations inside transactions preserve the Business context; several operations in one transaction cannot escape the Business. |
| B3-TEST-013 | Unsupported operations | C | Fail explicitly (fail-closed). |
| B3-TEST-014 | Raw SQL | C | Test the currently relevant raw SQL surface; raw SQL is not prohibited in general. |
| B3-TEST-015 | Absent context | C | A Business-scoped operation without context fails closed. |
| B3-TEST-016 | Invalid context | C | Fails closed. |
| B3-TEST-017 | Client Business ID | C | A client `empresaId` cannot override the authorized context. |
| B3-TEST-018 | Cross-Business read | C | Expose no other-Business data. |
| B3-TEST-019 | Cross-Business update/delete | B | Do not allow the operation. |
| B3-TEST-020 | Inherited nested/related ownership | C | Test the relevant relations that could produce cross-Business access. |
| B3-TEST-021 | PASS | D | The expected result must hold AND, when there is a mutation, the final persisted state must be verified. |
| B3-TEST-022 | `[T]` | C | Only when the specific test has been executed and a verifiable result exists. |
| B3-TEST-023 | `[E]` | B | Only with real execution against the target infrastructure and evidence of it. |
| B3-TEST-024 | Failures | C | First classify as implementation / fixture / infrastructure / contract / invariant / incorrect test; do not modify tests arbitrarily to obtain PASS. |
| B3-TEST-025 | Closure | C | B3 Tests/Evals may be closed only when criteria are derived, tests implemented, tests executed, evidence recorded, and every failure resolved or formally open/classified. |

## 4. Interpretation rules (derived, not new decisions)

1. **001 and 025 together.** "Canonical level C" fixes the *test level*; it does not authorize writing or running tests. Closure of the *derivation* is a different state from closure of B3 Tests/Evals under 025 (see §6).
2. **005 and 021 are cross-cutting evidence rules**: every matrix row that includes a mutation must state an expected persisted state.
3. **007 does not impose an error code.** A row may require "no record of the other Business is returned"; it may not require `404`, `null` or P2025 unless a contract does. Observed AS-IS behaviours (`null`/P2025) are characterization only.
4. **009 forbids inventing lookup surface.** Rows for unique lookups are limited to mechanisms that exist in code.
5. **011 keeps ISO-OPEN-001 NOT TESTABLE.** No test ID, fixture or expected result may encode a Legajo/DocumentoLegajo tenant rule.
6. **015/016/017 ≡ TE-ID-004/005/006 (B1 baseline).** They are covered by reference; B3 does not create duplicate IDs (no-duplication rule).
7. **022/023 bind evidence classes.** `[T]` requires an executed specific test with a verifiable result; `[E]` requires real execution against the target infrastructure with evidence. Neither is claimed by this record.
8. **024 is a failure protocol.** It forbids editing a test merely to turn FAIL into PASS.

## 5. Evidence status

| Class | Status |
|---|---|
| `[D]` Owner decisions | 25 recorded |
| `[C]` code | not claimed by this record |
| `[T]` | **0** |
| `[E]` | **0** |

## 6. Propagation status

| Layer | Status |
|---|---|
| B3 Tests/Evals Reconciliation (`07-DESIGN/TESTS-EVALS/DERIVED/06-…`) | PROPAGATED — this change set |
| Readiness / Audit (`13-AUDIT/27-…`) | PROPAGATED — this change set |
| Transformation Plan v0.2 | PROPAGATED — this change set |
| Task Execution Set v0.1 | PROPAGATED — this change set (no task created or promoted) |
| Decision Register §10 | PROPAGATED — this change set |
| R8-ARCH-002 architecture | NOT MODIFIED — decisions are tests-layer only, no architectural change |
| B3 Contract (09) and Addendum (27) | NOT MODIFIED — decisions already consistent; the addendum's §6/§7/§16 already delegate test-ID allocation to the Tests/Evals artifact |
| B3 Invariants (06) | NOT MODIFIED — decisions already consistent; §14 and §15 already point to Tests/Evals derivation |

## 7. Gate

These decisions authorize the *method* of B3 Tests/Evals derivation and later execution. They do not authorize implementation, schema changes, test execution or any claim of B3 readiness.

**Owner Decisions pending for B3 Tests/Evals: 0.**
