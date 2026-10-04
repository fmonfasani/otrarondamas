# B3 — CONTRACT RECONCILIATION ADDENDUM
## Tenant Isolation — Post-Owner Closure

**Date:** 2026-10-04  
**Status:** RECONCILED FOR DOWNSTREAM DERIVATION — OWNERSHIP AMBIGUITY CLOSED — NOT YET B3 READY  
**Scope:** Contract reconciliation only  
**Implementation:** NOT AUTHORIZED  
**Code/schema changes:** NONE  
**Tests executed by this document:** NONE  

---

## 1. Purpose

This addendum reconciles the B3 Tenant Isolation contract after the Owner closure of the B3 recommendations.

It does not replace the historical contract, does not silently rewrite historical identifiers, and does not authorize implementation.

The objective is to establish a single reconciled contractual baseline from which the B3 canonical invariants and B3 Tests/Evals can be derived.

## 2. Authority and source hierarchy

1. Owner Decisions / Owner closure
2. R8-ARCH-002 — Tenant Isolation Architecture
3. Canonical B1/B2 contracts and invariants
4. Existing B3 Tenant Isolation contract
5. B3 independent contract/invariant/test audits
6. Derived B3 analysis

B1/B2 guarantees are referenced, not duplicated.

## 3. Owner closure incorporated

| Decision | Resolution |
|---|---|
| B3 invariant namespace | `ISO-*` retained as the working namespace |
| Unsupported persistence operation | Fail-closed obligation retained as B3 requirement |
| `Legajo` / `DocumentoLegajo` ownership | CLOSED NORMATIVELY by Owner Decision 49: Business-scoped with deterministic ownership; physical mechanism remains downstream technical detail |
| ISO-008 | Retained for Business-scoped operations; pre-context paths remain separately governed |
| R8-ARCH-002 property 12 | Verification gate, not an invariant |
| Create ownership | No additional invariant for now; reopen only if evidence reveals a coverage gap |
| TE-ID collision | Preserve existing canonical IDs; renumber only the conflicting/new test set |
| B4 readiness | Documentation alone cannot satisfy requirements that explicitly require execution evidence |

**Owner Decisions pending: 0.**

## 4. R1 — B3-CON-014 / B3-CON-015 collision

The original B3 contract uses `B3-CON-014` and `B3-CON-015` with two different meanings.

| Historical meaning | Reconciled disposition |
|---|---|
| Client ID does not override server Business context | Reference existing B1/B2 context invariant |
| Business switching resolved by Membership | Reference B1/B2 context/Membership invariants |
| Derived ownership | `ISO-003` |
| No presumption of globality | `ISO-004` |

Historical identifiers are not silently rewritten.

## 5. R2 — Contract status

The historical contract status table is not the current B3 count.

Current reconciled set:

- **9 active B3-specific obligations**
- **0 OPEN TECHNICAL DETAILS**
- B1/B2 obligations referenced rather than duplicated
- R8-ARCH-002 property 12 retained as a verification gate
- pre-context handling retained as a scope rule
- unsupported operations retained as a B3 fail-closed obligation

## 6. R3 — Test mapping

The original B3 contract incorrectly implied that existing tenant-isolation tests did not cover nested/read/update/delete/unique behavior.

The reconciled position is:

- existing B1 tests `TE-ID-008..011` already cover specified tenant-scope behaviors;
- B3 must not create duplicate tests for those guarantees;
- B3-specific tests target residual isolation obligations;
- AS-IS characterization must be distinguished from TO-BE compliance;
- specified tests are not executed evidence.

## 7. R4 — TE-ID-005 / TE-ID-006 collision

A real identifier collision exists between the canonical/general Tests/Evals material and the Block 1 baseline.

The existing canonical IDs are preserved.

Rule:

> Never renumber an established canonical test identifier merely to make the B3 set sequential. Assign new identifiers to genuinely new B3-specific tests.

The exact new IDs belong to the Tests/Evals reconciliation artifact and are not invented here.

## 8. B3-specific working obligations

These are **working labels**, not yet final canonical invariant IDs.

| ID | Obligation | Class |
|---|---|---|
| `ISO-001` | Client-supplied related/FK identifiers must be validated against the active Business ownership/context before persistence. | STABLE |
| `ISO-002` | Referential integrity alone is insufficient to establish Business ownership; related entities must not cross Business boundaries. | STABLE |
| `ISO-003` | Derived ownership must resolve deterministically and uniquely to one Business. | STABLE |
| `ISO-004` | Business-scoped persistence must not presume that an identifier or entity is globally owned unless globality is explicitly established. | CONDITIONAL |
| `ISO-005` | Business identifiers used for tenant-scoped uniqueness must not be treated as globally unique unless explicitly defined as global. | STABLE |
| `ISO-006` | A Business-scoped transaction must remain within one effective Business context, including persistence performed through raw SQL or equivalent bypass-capable paths. | STABLE / execution evidence required |
| `ISO-007` | A persistence operation unsupported by the tenant-isolation mechanism must fail closed rather than execute without an enforceable isolation boundary. | STABLE |
| `ISO-008` | Within the Business-scoped application perimeter, tenant isolation must not depend on the particular call path or manual discipline of an individual call site. | CONDITIONAL |

## 9. OPEN TECHNICAL DETAIL

### ISO-009 — Legajo / DocumentoLegajo deterministic Business ownership

The ownership path for `Legajo` and `DocumentoLegajo` remains unresolved.

The reconciliation does **not** select User, Customer, Business, or another physical ownership mechanism.

This remains open because resolving it may affect Customer/User domain semantics.

**Status:** OPEN TECHNICAL DETAIL.

## 10. Explicitly excluded from B3-specific invariants

The following remain references to existing B1/B2 guarantees and must not be recreated under `ISO-*`:

- Business context establishment
- Active Membership
- Role/Permission authorization
- Business switching
- client Business ID not overriding server context
- generic read isolation
- generic update/delete isolation
- generic unique lookup isolation
- generic nested-operation isolation

This is intentional anti-duplication.

## 11. R8-ARCH-002 mapping

| Property | B3 disposition |
|---|---|
| 1. Business context established | B1/B2 reference |
| 2. Active Membership | B1/B2 reference |
| 3. INACTIVE Membership cannot operate | B1/B2 reference |
| 4. Client Business ID cannot override context | B1/B2 reference |
| 5. Create derives Business from context | Existing contract/reference; no new invariant for now |
| 6. Read constrained to context | Existing tenant invariant/test baseline |
| 7. Update/delete constrained to context | Existing tenant invariant/test baseline |
| 8. Unique lookup constrained to context | Existing tenant invariant/test baseline |
| 9. Nested/related persistence preserves ownership | ISO-001, ISO-002, ISO-003 |
| 10. Transactions preserve isolation | ISO-006 |
| 11. Missing/invalid context fails closed | B1/B2 reference; ISO-007 additionally covers unsupported persistence operations |
| 12. Cross-Business negative verification | **VERIFICATION GATE — not an invariant** |

## 12. Property 12 — verification gate

Cross-Business access attempts must be negatively verified by execution.

Documentation, an invariant, or a specified test is not sufficient.

**Current status: NOT VERIFIED.**

No `[T]` or `[E]` evidence is claimed by this addendum.

## 13. AS-IS vs TO-BE

A current test can establish AS-IS characterization. It cannot establish that the future User → Membership → Business Context → persistence chain is implemented.

Properties involving Membership, switching, or the future identity/context chain must not be marked PASS merely because an `empresaId` fixture currently isolates rows.

## 14. Evidence

This reconciliation provides:

- **DOCUMENTADO** — Owner closure and documentary reconciliation.
- **NO DETERMINABLE CON EJECUCIÓN** — no execution evidence is claimed.

It does not provide VERIFICADO POR TEST or VERIFICADO POR EJECUCIÓN.

## 15. Dependencies

- **B1:** User identity, Business Context transport, Membership, switching and context enforcement.
- **B2:** authorization, Membership semantics and permission semantics.
- **Customer/User:** resolution of `Legajo` / `DocumentoLegajo`.
- **B4:** depends on B3.
- **Execution:** transaction behavior and cross-Business negative verification remain evidence gates.

## 16. Propagation requirements

The next artifact must:

1. derive canonical B3 invariants from these eight obligations;
2. retain B1/B2 references instead of duplicating them;
3. preserve `ISO-AMBIG-001` as open;
4. define exact normative statements and testability;
5. distinguish AS-IS characterization from TO-BE compliance;
6. map every invariant to contract source and test/eval coverage;
7. avoid claiming execution evidence.

## 17. Final contract gate

**B3 CONTRACT — RECONCILED FOR DOWNSTREAM DERIVATION**

- Owner Decisions pending: **0**
- R1: reconciled
- R2: reconciled
- R3: reconciled
- R4: reconciled as a test-ID allocation rule
- B3-specific working obligations: **9**
- Open technical detail: **0**
- Property 12: **verification gate**
- Implementation authorization: **NO**
- Test execution claimed: **NO**
- B3 overall readiness: **NOT READY YET**

## 18. Change-control statement

This reconciliation:

- does not modify application code;
- does not modify database schema;
- does not authorize implementation;
- does not declare B3 READY;
- does not declare tests executed;
- does not close the `Legajo` / `DocumentoLegajo` ownership question;
- does not replace B1/B2 canonical guarantees;
- does not silently rewrite historical documents or identifiers.


## 19. Owner Decision 49 propagation — 2026-10-04

The former Legajo/DocumentoLegajo ownership ambiguity is normatively closed by Owner Decision 49. The B3 contract now carries **9 active obligations and 0 open ownership decisions/details**. The physical ownership mechanism remains a downstream technical specification and is not prescribed here.

**Implementation:** NOT AUTHORIZED. **Tests executed:** NONE.
