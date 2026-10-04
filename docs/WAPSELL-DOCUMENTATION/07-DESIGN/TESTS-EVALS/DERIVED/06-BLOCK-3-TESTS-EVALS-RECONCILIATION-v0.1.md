# WAPSELL — BLOCK 3 TESTS / EVALS RECONCILIATION v0.1
## B3 TESTS/EVALS RECONCILIATION / POST-INVARIANT READINESS

**Status:** DRAFT — BLOCK 3 TESTS / EVALS — DERIVED / RECONCILED, NOT EXECUTED, NOT APPROVED
**Date:** 2026-10-04
**Scope:** Wapsell MVP — Block 3 (Tenant Isolation), verification criteria
**Invariants source:** `07-DESIGN/INVARIANTS/DERIVED/06-BLOCK-3-TENANT-ISOLATION-INVARIANTS-v0.1.md` (ISO-001…ISO-009)
**Contract source:** `07-DESIGN/CONTRACTS/DOMAIN/27-B3-CONTRACT-RECONCILIATION-ADDENDUM-2026-10-04.md` over `09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1.md`
**Owner decisions:** `03-DECISIONS/48-B3-TESTS-EVALS-OWNER-DECISION-CLOSURE-2026-10-04.md` (B3-TEST-001…025)
**Historical artifact acknowledged:** `13-AUDIT/26-B3-TESTS-EVALS-AND-READINESS-2026-10-04.md` (not modified)
**Technical Specification:** NOT APPROVED
**Implementation:** NOT AUTHORIZED
**Code / schema / migration / data changes:** NONE
**Tests executed by this document:** NONE

**Evidence classes:** `[C]` code · `[T]` test · `[E]` execution · `[D]` documented · `[ND]` not determinable.

> **`[T]` = 0 and `[E]` = 0.** No test was written, no test was executed and the API was not run. Every row below is a *specification*. A specified criterion is not an executed test, and an executed test is not yet a verified invariant.

---

# 1. Purpose

Reconcile the Block 3 Tests/Evals layer against what has been established since the historical B3 Tests/Evals analysis was produced:

1. the canonical B3 invariant set (ISO-001…ISO-008, ISO-OPEN-001) now exists;
2. the B3 contract has been reconciled (addendum 27);
3. the Owner approved 25 Tests/Evals decisions (B3-TEST-001…025).

The output is a canonical verification matrix: **B3-specific criteria** (TE-B3-001…008) and the **inherited B1 criteria** that B3 reuses rather than duplicates (TE-ID-004, 005, 006, 008, 009, 010, 011).

This document does not create decisions, define schema, select a test framework, prescribe an enforcement mechanism, or authorize implementation.

---

# 2. Authority and sources

Precedence: OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > CONTRACTS > INVARIANTS > AUDIT > HISTORICAL.

| Source | Role here |
|---|---|
| `03-DECISIONS/48-B3-TESTS-EVALS-OWNER-DECISION-CLOSURE-…` | OWNER RULING — the 25 test decisions |
| `03-DECISIONS/28-R8-ARCH-002-…` | OWNER RULING — 12 properties; P12 = negative verification |
| `07-DESIGN/CONTRACTS/DOMAIN/27-B3-CONTRACT-RECONCILIATION-ADDENDUM-…` | CONTRACT — 8 obligations + 1 open; P12 gate; TE-ID allocation rule (§7) |
| `07-DESIGN/INVARIANTS/DERIVED/06-BLOCK-3-…-v0.1.md` | INVARIANTS (DRAFT) — normative statements; §13 traceability; §14 gate |
| `07-DESIGN/TESTS-EVALS/DERIVED/05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md` | B1 criteria TE-ID-004…011 (all SPECIFIED) — **referenced, not duplicated** |
| `07-DESIGN/TESTS-EVALS/DERIVED/00-TESTS-EVALS-v0.2.md` | Canonical Tests/Evals v0.2 — source of the TE-ID collision (§6) |
| `13-AUDIT/23-BLOCK-3-TENANT-ISOLATION-ASIS-AUDIT-2026-10-04.md`, `13-AUDIT/24-B4-…`, `13-AUDIT/25-B3-…-INDEPENDENT-AUDIT-…` | AUDIT — AS-IS facts, `[D]` unless spot-checked in §9 |
| `13-AUDIT/26-B3-TESTS-EVALS-AND-READINESS-2026-10-04.md` | HISTORICAL — see §3 |

The B1/B2 invariants (`INV-TEN-001`, `INV-CONTEXT-001`, `INV-X-001`, B2 `CTX-001…004`, `MEM-002/003`, `AUT-004`) are **referenced, never restated**. No B3 ID is created for a property they own.

---

# 3. Acknowledgement of the historical B3 Tests/Evals artifact

`13-AUDIT/26-B3-TESTS-EVALS-AND-READINESS-2026-10-04.md` is **not overwritten, renumbered or edited**. It remains the record of the analysis as it stood when it was produced.

**It was generated before the canonical B3 invariant set (06) was published and before the contract reconciliation (27) and the Owner's B3 test decisions existed. Some of its claims are therefore stale.** The table classifies them; the historical file keeps its original text.

| Historical claim | Current position | Disposition |
|---|---|---|
| "B3 Canonical Invariants: NO EXISTE" | `06-BLOCK-3-TENANT-ISOLATION-INVARIANTS-v0.1.md` exists and is versioned (commit `9f38aa1`) `[C]` | **STALE** |
| Contract `09` "untracked" | Contract and addendum are committed (contract `4f35522`, addendum `ac8f3ae`) | **STALE** |
| Gate B (invariants) BLOCKED | Invariant set exists; two criteria remain unmet by design (ISO-OPEN-001; negative verification) — `06` §14 | **PARTIALLY STALE** — the reason for the block changed |
| Test IDs for B3 "NOT YET DEFINED" | TE-B3-001…008 allocated in §7 | **STALE** — superseded by §7 |
| Candidate names `ISO-AMBIG` for Legajo/DocumentoLegajo | Canonical name is `ISO-OPEN-001` (06); addendum 27 uses `ISO-AMBIG-001` | **NAMING DISCREPANCY** — §10 |
| Reconciliation of TE-ID-004/005/006/008/009/010/011 as reusable B1 criteria | Still valid; B1 baseline unchanged | **VALID** — carried into §8 |
| AS-IS vs TO-BE separation; the three prohibited readings ("not applicable today", "passes trivially", "operation does not exist") | Still valid and reinforced by decisions 005 and 021 | **VALID** — carried into §5 |
| Coverage by the 12 R8-ARCH-002 properties (12/12 contract, 11/12 test criterion, 0/12 execution; P12 not satisfied) | Direction still valid; counts are recomputed in §11 | **VALID IN SUBSTANCE, RECOMPUTED** |
| Candidate tests `TC-B3-*` | Superseded by the matrix. Seven were duplicates of B1 criteria (historic §8); `TC-B3-14/15/17/18` were not applicable | **SUPERSEDED** |
| Verdict BLOCKED | See §12; this document does not issue a readiness verdict | **SUPERSEDED BY §12 / `13-AUDIT/27-…`** |

Where a statement in the historical artifact conflicts with this document or with the sources in §2, this document governs for Tests/Evals purposes.

---

# 4. Owner decisions

The 25 decisions are recorded in `03-DECISIONS/48-…`. This section maps them to what they bind. **None is reopened or modified.**

| Decision(s) | Binds | Applied in |
|---|---|---|
| 001 | canonical level = unit + PostgreSQL/Prisma integration; unit first, integration second; E2E deferred | §5.1; every row's *test type* |
| 002, 003, 004 | data/fixtures: seed + B3 fixtures; two Businesses + users/memberships + needed entities; Businesses created inside each suite, IDs held in variables | §5.2; every row's *fixture* |
| 005 | observable property and, when useful, the technical mechanism | §5.3 |
| 006, 017 | creation: server context determines Business; client `empresaId` cannot override | TE-ID-006 row; TE-B3-001 |
| 007, 018 | cross-Business read: other Business's record never returned; no imposed error code | TE-ID-008 row |
| 008, 019, 021 | update/delete: only current Business affected; final persisted state verified; operation not allowed | TE-ID-009 row; every mutating row's *persisted state* |
| 009 | unique lookups: only mechanisms that exist in code | TE-ID-010; TE-B3-005 |
| 010, 020 | nested/related: direct FK + nested writes + relevant indirect relations | TE-ID-011; TE-B3-001, 002, 003 |
| 011 | Legajo/DocumentoLegajo OPEN / NOT TESTABLE | §10; ISO-OPEN-001 has **no TE row** |
| 012 | transactions preserve context | TE-B3-006 |
| 013 | unsupported operations fail explicitly | TE-B3-007 |
| 014 | raw SQL: test the currently relevant surface; do not prohibit raw SQL | TE-B3-006 |
| 015, 016 | absent / invalid context fails closed | TE-ID-004, TE-ID-005 |
| 021 | PASS = expected result AND persisted state (if mutation) | §5.3 |
| 022, 023 | `[T]` / `[E]` evidence admissibility | §5.4; §11 |
| 024 | failure classification protocol | §5.5 |
| 025 | closure criteria for B3 Tests/Evals | §12 |

---

# 5. Governing rules for this matrix

## 5.1 Test levels and order (decision 001)

| Level | Meaning | Order |
|---|---|---|
| **U** — unit | the isolation mechanism in isolation, with a stub persistence delegate | first |
| **I** — integration | real PostgreSQL through Prisma | second |
| **E2E** | through the HTTP/auth/context chain | **deferred** until auth and Business Context are sufficiently implemented |

No row below is assigned E2E. A row that cannot be concluded at U or I says so.

## 5.2 Fixtures (decisions 002–004)

- **Base:** the existing seed plus B3-specific fixtures.
- **Per suite:** two Businesses (A and B) are **created inside the suite**; their IDs are held in variables; no test depends on a hard-coded Business ID or on seed ordering.
- **Related data:** users/memberships and exactly the related entities each test needs.
- **Transitional note:** in the AS-IS there is no Membership entity `[D]`; a fixture "user/membership" is, today, a user whose transitional `empresaId` claim selects the Business. A test built on that fixture is an **AS-IS characterization** (§5.6), not evidence of the TO-BE User → Membership → Business Context chain.

## 5.3 What a PASS means (decisions 005, 021)

A row **PASSES** only when **both** hold:

1. the *expected result* holds — and where decision 005 finds it useful, the *technical mechanism* is also observed; and
2. if the operation mutates, the *expected persisted state* holds after the operation (read back through a path that is independent of the operation under test).

A result that satisfies (1) but not (2) is not a PASS. No error code is imposed unless a contract imposes it (decision 007).

## 5.4 Evidence admissibility (decisions 022, 023)

- `[T]` is admissible **only** for a specific executed test with a verifiable result.
- `[E]` is admissible **only** for real execution against the target infrastructure, with evidence of it. A mocked or unit-level run never yields `[E]`.
- **Today `[T]` = 0 and `[E]` = 0.**

## 5.5 Failure protocol (decision 024)

Before any change, a failing row is classified as exactly one of: **implementation · fixture · infrastructure · contract · invariant · incorrect test**. A test is **not** edited to obtain PASS. The classification is recorded with the result.

## 5.6 AS-IS characterization vs TO-BE compliance

A test on the current seed characterizes the AS-IS. It does not prove the TO-BE chain. Three readings are prohibited:

1. "not applicable today" — used to dismiss a criterion because the surface is absent;
2. "passes trivially" — counted as verification when no surface exists to attack (TE-ID-006 today);
3. "the operation does not exist" — used to dismiss a criterion for an operation with zero current uses (nested connect/update/delete, upsert, groupBy).

A row whose AS-IS expectation differs from its TO-BE expectation states both.

## 5.7 No duplication

B3 creates an ID only for a property that no B1/B2 criterion verifies. Where a B1 criterion already verifies it (TE-ID-004…011), the row is **inherited**: B3 adds method constraints from decisions 001–025 and AS-IS caveats, never a parallel criterion.

---

# 6. Identifier allocation and the TE-ID collision

## 6.1 New B3 identifiers

`TE-B3-001`…`TE-B3-009` are **new**: a search of the repository found no prior occurrence. Mapping is one-to-one with ISO-001…ISO-009. Allocation follows addendum 27 §7: *assign new identifiers to genuinely new B3-specific tests; never renumber an established canonical identifier merely to make the B3 set sequential.* ISO-009 covers the formerly open Legajo/DocumentoLegajo ownership property after Owner Decision 49.

## 6.2 Inherited identifiers — documentary contradiction

The numeric IDs `TE-ID-004`, `TE-ID-005`, `TE-ID-006` are used with **different meanings** in two documents:

| ID | `00-TESTS-EVALS-v0.2.md` (2026-10-03) | `05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md` (2026-10-04) |
|---|---|---|
| TE-ID-004 | two Users cannot share a normalized email (`INV-IDENT-002`) | missing Business Context fails closed (`INV-CONTEXT-001`) |
| TE-ID-005 | a Customer can exist without a User (`INV-CUST-001`) | invalid Business Context fails closed (`INV-CONTEXT-001`) |
| TE-ID-006 | email equality does not create Customer↔User association (`INV-CUST-002`) | a client Business ID cannot override the Business Context (`INV-CONTEXT-001`) |
| TE-ID-007 | Customer commercial data of A does not appear in B (`INV-CUST-003`) | email uniqueness (`INV-IDENT-002`) — also differs |

`TE-ID-008…011` exist only in the B1 baseline and **do not collide**.

**Resolution applied in this document (without modifying either upstream document):**

- The numeric ID is **kept** as instructed. Every inherited reference is **qualified by source**: `B1-BASE:TE-ID-00x` denotes `05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md`. An unqualified `TE-ID-004/005/006` is ambiguous and is not used for B3 purposes.
- Per addendum 27 §7, an established canonical ID is preserved and only the *conflicting* set is renumbered. Which of the two sets is to be renumbered, and the new IDs, are **not decided here** and no ID is invented. **This requires intervention in an upstream Tests/Evals document** (not this artifact); recorded as discrepancy D-TE-01 in §14.
- A similar collision exists for `TE-ORD-001…008` between the same two documents. It is outside B3 scope and is only noted.

---

# 7. Canonical verification matrix — B3-specific rows

Legend. **Type:** U unit · I integration (decision 001). **Status:** SPECIFIED = criterion defined; NOT EXECUTED = no execution evidence. Class and testability are quoted from `06`. "Rejected" means the operation does not take effect; no uniform error code is imposed (decision 007). "Positive control" is a companion case proving the fixture can succeed, so a rejection is not vacuous.

| Invariant / Contract | Test/Eval ID | Test type | Required fixture | Precondition | Action | Expected result | Expected persisted state | Required evidence | Dependencies | Current status |
|---|---|---|---|---|---|---|---|---|---|---|
| **ISO-001** — a client-supplied relation identifier is validated against the effective Business Context before it is persisted as a reference. `B3-CON-017`. STABLE. R8 P9. Dec. 010, 020, 006. | **TE-B3-001** | I (U for the validation unit if one exists) | Businesses A, B created in-suite; actor in A; a parent entity in A; related entities (e.g. product, batch, line) owned by A **and** by B, IDs in variables. One case per nested-write site enumerated in audit 23 §11 `[D]` (to be re-confirmed against code when the test is written). | Context = A. Related entity `X_B` exists in B. | Under A, perform the nested/related write supplying `X_B`'s identifier as the reference. **Positive control:** same write with an A-owned identifier. | The write supplying `X_B` is **rejected**; the positive control is accepted. | **No row of A references `X_B`**; affected-table row counts unchanged by the rejected write; `X_B` and everything of B unchanged; positive control persists with A-owned reference only. | `[T]` per executed case. A fixture-only run yields none. | B1 context (transitional `empresaId` in AS-IS); fixture (dec. 002-004); ISO-002 for the resulting-state view. | SPECIFIED · NOT EXECUTED. **Priority 2** (06 §15). AS-IS expectation (`[C]` reading, audit 23 `[D]`): **not satisfied at `crearDevolucion`** → expected to FAIL there. |
| **ISO-002** — no Business-scoped entity is linked to an entity of another Business; referential integrity does not by itself satisfy this. `B3-CON-018`. STABLE. R8 P9. | **TE-B3-002** | I | Two populated Businesses (A, B) with entities across the relations between Business-scoped models; the same fixtures as TE-B3-001 and TE-B3-003, run **before** the check. | State after the legitimate operations and the attempted cross-Business operations of TE-B3-001/003/006. | Run a **test-side cross-link audit** over the persisted relations: for each relation between two Business-scoped entities, the two Businesses resolve to the same Business. The audit is verification tooling, not a product feature. | Zero cross-Business links. | No persisted link between an entity of A and an entity of B anywhere in the fixture. | `[T]` per executed audit; AS-IS characterization only. | TE-B3-001 (input path); the enforcement mechanism is **OPEN upstream** — the row checks the property, not a mechanism (06 §11 item 1). | SPECIFIED · NOT EXECUTED. AS-IS: **no mechanism at any layer** `[C]` → the audit can only show whether discipline held on the exercised paths. |
| **ISO-003** — derived ownership is determinate and unique and carries the same isolation obligations. `B3-CON-014`. STABLE (cond. on ISO-002 for `AplicacionPago`). R8 P6, P7, P9. | **TE-B3-003** | I | Per derived entity: a parent in A and a parent in B, each with child rows. The ten derived entities (06 §7.2): sale/order/purchase/return line items, user-permission link, cash opening, cash movement, cash count, cash closing, payment application. | Context = A. Child rows of B exist. | (a) Resolve the Business of each child **via its owning relation** and confirm it is unique. (b) Under A, read/update/delete B's child rows. | (a) Each child's Business is determinate and unique (for `AplicacionPago`: both ownership paths agree). (b) B's child rows are not returned and not affected. | B's child rows unchanged after (b); A's own children unaffected by B's context and vice versa. | `[T]` per executed entity case. | ISO-002 (`AplicacionPago` case only); TE-ID-008/009 (do not re-test what they cover for direct entities); **a derived entity already covered by a domain criterion receives no second criterion** (06 §5 ISO-003). | SPECIFIED · NOT EXECUTED. Case `AplicacionPago`: **CONDITIONAL on ISO-002**. AS-IS: held by call-site discipline `[C]`. |
| **ISO-004** — an entity not explicitly classified as global does not receive global treatment. `B3-CON-015`. CONDITIONAL. | **TE-B3-004** | none derivable yet | None can be defined without inventing a classification artefact. | Classification must exist as an artefact the system consults (06 §5 ISO-004, testability). | — | — | — | None until classification is a system artefact. The classification's *completeness* (28 direct / 10 derived / 2 global / 2 ambiguous / 0 unknown = 42) is a **review check `[D]`**, not a test. | The classification-as-artefact decision/mechanism — OPEN (06 §11 item 5). | **CONDITIONAL — NOT TESTABLE YET.** ID reserved so the invariant is not left without a row; no case, fixture or result is defined. |
| **ISO-005** — an identifier whose uniqueness is proper to a Business does not behave as a global identifier. `B3-CON-016`. STABLE. R8 P8. Dec. 009. | **TE-B3-005** | I (the behaviour depends on the database unique constraint, so U cannot conclude) | Businesses A, B; a sale in A carrying key `K` through the persist and lookup mechanisms that exist in code (the sale idempotency key: schema field, lookup in the sales service) — **no other lookup surface is invented**. | Context = A has persisted `K`. | Under B, persist a sale carrying `K`; then look up `K` under A and under B. | The persist under B is **accepted**; the lookup under A resolves to A's record, under B to B's record; neither lookup returns the other Business's record. | Two records, one per Business, each with its own Business and key `K`; A's record unchanged. | `[T]` per executed case. | A schema/uniqueness change is **NOT AUTHORIZED** and not required to *specify* the row. Identity identifiers (email) are out of scope (`INV-IDENT-002`; 06 §5 ISO-005 boundary). | SPECIFIED · NOT EXECUTED. AS-IS: **not satisfied** — the field is globally `@unique` `[C]` (`prisma/schema.prisma:663`) → persist under B expected to FAIL; the lookup does not leak (post-query validation) `[D]`. |
| **ISO-006** — a transaction operates under exactly one Business Context, raw statements included. `B3-CON-020/021`. STABLE for derivation; AS-IS NOT VERIFIED `[ND]`. R8 P10. Dec. 012, 014. | **TE-B3-006** | **I with `[E]` required** (a U-level run cannot answer the open mechanism question) | Businesses A, B with data in both for the entities touched by (i) an interactive transaction using the scoped client and (ii) the raw statement at `inventario.service.ts:266` `[C]`. | Context = A. B's rows exist. | (i) Inside one interactive transaction under A, issue several operations — including ones targeting B's rows. (ii) Exercise the raw statement under A with B's identifiers. | (i) No operation in the transaction reads or affects B's rows; every operation applies the same isolation obligations as outside the transaction. (ii) The raw statement does not affect B's rows. | B's rows unchanged in **all** outcomes (commit, rollback, failure); A's effects consistent with the transaction's outcome. | **`[E]` only** — real execution against the target PostgreSQL, with evidence (dec. 023). `[T]` alone is not sufficient. | Target PostgreSQL infrastructure; **ND-01: whether the scoping stays active on the transaction client** — this row exists to answer it. Raw SQL is **not prohibited**; only the currently relevant surface is tested (dec. 014). Health `SELECT 1` is pre-context (06 §4) and out of scope. | SPECIFIED · NOT EXECUTED. **Priority 1** (06 §15). AS-IS: satisfied by construction `[C]`; **`[ND]` by execution**. |
| **ISO-007** — a persistence operation without a defined isolation guarantee is rejected. `B3-CON-003` (operation reading). STABLE. R8 P11. Dec. 013. | **TE-B3-007** | U (stub delegate: operation rejected and the delegate is **not called**) **+** I (real DB: rejected, no row changed) | Businesses A, B; for I, rows in both. A fixed set of operations *not* given isolation handling (at minimum `upsert`, named in the mechanism's own code comment `[C]`, and `groupBy`, per audit 23 `[D]`). **Positive control:** a supported operation still executes. | Valid context A. | Invoke each unsupported operation under A. | Each is **rejected explicitly** (fail-closed); not executed unscoped. Error text/code is not imposed. | No row of A or B created, changed or deleted. | `[T]` for U and I separately; neither is `[E]`. | None upstream. Zero current uses of `upsert`/`groupBy` `[D]` — this is **not** a reason to skip (prohibited reading 3, §5.6). | SPECIFIED · NOT EXECUTED. **Priority 3** (06 §15). AS-IS: **satisfied by code reading** — `src/prisma/empresa-scope.extension.ts:160-166` throws for unlisted operations `[C]`; that reading is not `[T]`. |
| **ISO-008** — isolation obligations are independent of the execution path (Business-scoped operations only). `B3-CON-023`. CONDITIONAL. R8 §7. | **TE-B3-008** | I | Businesses A, B; the same operation available through each **enumerable** Business-scoped path. | Valid context A; B's rows exist. | Execute the same operation through each enumerable path and compare. | Equal isolation outcome on every compared path. | Equal on every path: B's rows unchanged, A's effect identical. | `[T]` per executed comparison; completeness of "every path" **cannot be claimed**. | Surface enumerability — a **process rule, not an invariant** (06 §6.2); the scoped client is opt-in per call site and the unscoped client is injectable from any module `[D]`. Partial overlap with TE-B3-006 (raw SQL): raw-statement cases live **only** in TE-B3-006. | **CONDITIONAL** · SPECIFIED for the enumerable subset only · NOT EXECUTED. |

**ISO-OPEN-001 (Legajo / DocumentoLegajo) has no row** — see §10.

---

# 8. Canonical verification matrix — inherited B1 rows

These criteria already exist as SPECIFIED in `05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md` (qualified `B1-BASE:`). B3 does not redefine them. The matrix records **how B3's decisions constrain their execution** and which B3 invariants they complement. Their status in B1 is unchanged and none has an executed result.

| Invariant / Contract | Test/Eval ID | Test type | Required fixture | Precondition | Action | Expected result | Expected persisted state | Required evidence | Dependencies | Current status |
|---|---|---|---|---|---|---|---|---|---|---|
| B1 `INV-CONTEXT-001` · R8 P1, P11 · complemented by **ISO-007** (different subject). Dec. 015. | **B1-BASE:TE-ID-004** — missing Business Context fails closed | U then I | Business A with data; an actor/call with **no** context | No context supplied | Invoke a Business-scoped persistence operation without context | **Fails closed**; no data of any Business returned | Nothing created, changed or deleted | `[T]` | **B1 dependency:** in the AS-IS the context is assumed from a claim, not established; what the persistence layer does with an absent/empty `empresaId` is **`[ND]`** (not inspected here). B1 owns this criterion. | SPECIFIED · NOT EXECUTED |
| B1 `INV-CONTEXT-001` · R8 P11. Dec. 016. | **B1-BASE:TE-ID-005** — invalid Business Context fails closed | U then I | Business A; invalid contexts available **today** (non-existent / malformed Business identifier) | Invalid context supplied | Invoke a Business-scoped operation | **Fails closed**; no data returned | Nothing created, changed or deleted | `[T]` | The *Membership-based* invalidity (no ACTIVE Membership) is **not satisfiable in the AS-IS** — no Membership entity `[D]` (06 §8, P2/P3); that part is **BLOCKED** on the B1 physical model, not a B3 gap. | SPECIFIED · NOT EXECUTED · Membership-based cases BLOCKED (B1) |
| B1 `INV-CONTEXT-001`, B2 `CTX-002` · R8 P4, P5 · complemented by **ISO-001**. Dec. 006, 017. | **B1-BASE:TE-ID-006** — a client Business ID cannot override the Business Context | U then I | Businesses A, B; a create operation under A whose payload carries B's identifier | Context = A | Create under A with a payload `empresaId` = B | The record belongs to **A**; the client value is ignored/overridden — never B's | One record under A; **none under B**; B's existing data unchanged | `[T]` | **Caveat (06 §8 P4):** satisfied in the AS-IS by absence of any selection surface, not by active defence `[C]`; **a pass today does not demonstrate P4** (prohibited reading 2). Becomes live with Business Switch (`CTX-004`). Create ownership has no separate invariant (06 §6.2); reopening condition: if no criterion covers create-ownership for the two entities outside the mechanism's coverage — recorded in §11. | SPECIFIED · NOT EXECUTED |
| B1 `INV-TEN-001` · R8 P6. Dec. 007, 018. | **B1-BASE:TE-ID-008** — Business A resources cannot be read through Business B context | U then I | Businesses A, B; records in both | Context = B; A's record `R_A` exists | Read/list/lookup `R_A` under B | **`R_A` is never returned**; no uniform error code required (a `null`, an empty list or an error are all acceptable) | Read-only; state unchanged | `[T]` | Direct entities here; derived entities via TE-B3-003 | SPECIFIED · NOT EXECUTED |
| B1 `INV-TEN-001` · R8 P7. Dec. 008, 019, 021. | **B1-BASE:TE-ID-009** — Business A resources cannot be updated or deleted through Business B context | U then I | Businesses A, B; records in both | Context = B; `R_A` exists | Update and delete `R_A` under B (each separately) | The operation is **not allowed** / has no effect on `R_A`; B's own records may be affected only if targeted | **`R_A` unchanged (value and existence)**; B's non-targeted records unchanged; verified by an independent read-back | `[T]` | Derived entities via TE-B3-003; path-independence via TE-B3-008 | SPECIFIED · NOT EXECUTED |
| B1 `INV-TEN-001` · R8 P8 · complemented by **ISO-005** (uniqueness semantics — different property). Dec. 009. | **B1-BASE:TE-ID-010** — unique lookups cannot expose a resource of another Business | U then I | Businesses A, B; a record of A addressable by a unique key | Context = B | Use **each unique-lookup mechanism that exists in code** (unique find / find-or-throw, and the sale idempotency-key lookup) against A's key | A's record is not returned | Read-only; unchanged | `[T]` | **No lookup surface is invented** (dec. 009). Post-query validation, not the query predicate, is what cuts the leak in the AS-IS `[D]`; the test observes the outcome and, per dec. 005, may observe the mechanism. | SPECIFIED · NOT EXECUTED |
| B1 `INV-TEN-001` · R8 P9 · complemented by **ISO-001/002/003**. Dec. 010, 020. | **B1-BASE:TE-ID-011** — nested/related persistence cannot escape Business ownership | U then I | Businesses A, B; parents and children in both; direct FK, nested-write and indirect-relation cases that **could** produce cross-Business access | Context = A | Nested create under A; operations through an indirect relation reaching B | Created nested records belong to A; no path reaches B's records | B's records and relations unchanged; no A record owned by B | `[T]` | **Boundary with TE-B3-001:** TE-ID-011 verifies **ownership of the created record**; TE-B3-001 verifies **validity of the reference it carries**. They are adjacent, not duplicates. Nested connect/update/delete have zero current uses `[D]` and are **not** dismissed (prohibited reading 3). | SPECIFIED · NOT EXECUTED |

---

# 9. AS-IS facts used (spot-checked read-only in this session)

Read-only inspection; nothing executed. `[C]` = verified by reading code; everything else is `[D]` from the audits.

| Fact | Class |
|---|---|
| `apps/api/test/` does not exist; `package.json` `test:e2e` references `./test/jest-e2e.json` | `[C]` |
| The only spec file in `apps/api` is `src/health/health.controller.spec.ts` (it mocks `$queryRaw`) | `[C]` |
| `prisma/seed.ts` creates `empresaAislamiento` (line 69) and entities under it (line 181); no test consumes it | `[C]` |
| `src/prisma/empresa-scope.extension.ts:160-166` rejects operations without isolation handling | `[C]` |
| `prisma/schema.prisma:663`: `Venta.idempotencyKey String? @unique` (global) | `[C]` |
| `src/ventas/ventas.service.ts:115-118` looks up by `idempotencyKey` | `[C]` |
| `src/inventario/inventario.service.ts:266` uses a parametrized `$executeRaw` | `[C]` (the `empresaId` predicate inside it is `[D]` from audit 23; re-confirm when the test is written) |
| `src/compras/compras.controller.ts:121-126` / `compras.service.ts:343`: `crearDevolucion` | `[C]` location; non-validation of relation identifiers is `[D]` (audit 23 H-4) |
| Absence of Membership entity; context from a claim; five nested-write sites; zero upsert/groupBy | `[D]` |
| Existence of a PostgreSQL test database / CI integration infrastructure | **`[ND]`** — not determined |

---

# 10. Legajo / DocumentoLegajo — OPEN

**ISO-OPEN-001 remains OPEN / NOT TESTABLE** (decision 011). Two entities have two mutually exclusive optional ownership paths, so their tenant is indeterminate `[D]`. Resolving it may affect Customer/User semantics and is delegated, not decided.

- No TE row, fixture, expected result or tenant rule is defined for them.
- ISO-003's determinacy clause has a known exception here; a test suite must not read ISO-003 as universal.
- The create-ownership reopening condition (06 §6.2) names these two entities specifically.
- **Naming discrepancy (not corrected):** `ISO-OPEN-001` (06, canonical) · `ISO-AMBIG-001` (addendum 27) · `ISO-AMBIG` (historic 26). This document uses the canonical `ISO-OPEN-001`.

---

# 11. R8-ARCH-002 properties — verification coverage (recomputed)

P12 is a **readiness / verification gate, not an invariant** (06 §6.2; addendum 27 §12). It is satisfied only by executed negative verification.

| # | Property | B3 matrix rows | Execution evidence | State |
|---|---|---|---|---|
| 1 | Context established | B1-BASE:TE-ID-004 | none | criterion SPECIFIED; AS-IS context assumed (B1 dependency) |
| 2 | Context ↔ valid Membership | — (B1/B2) | none | BLOCKED on B1 physical model |
| 3 | INACTIVE Membership cannot operate | — (B1/B2) | none | BLOCKED on B1 physical model |
| 4 | Client Business ID cannot override | B1-BASE:TE-ID-006 | none | criterion SPECIFIED; "passes trivially" caveat |
| 5 | CREATE assigns Business from context | B1-BASE:TE-ID-006, TE-B3-001 | none | absorbed (06 §6.2); reopening condition open |
| 6 | READ restricted | B1-BASE:TE-ID-008, TE-B3-003 | none | SPECIFIED |
| 7 | UPDATE/DELETE do not cross | B1-BASE:TE-ID-009, TE-B3-003, TE-B3-008 | none | SPECIFIED |
| 8 | Unique lookups do not expose | B1-BASE:TE-ID-010, TE-B3-005 | none | SPECIFIED |
| 9 | Nested/related ownership | B1-BASE:TE-ID-011, TE-B3-001/002/003 | none | SPECIFIED |
| 10 | Transactions preserve isolation | TE-B3-006 | none (`[E]` required) | SPECIFIED; AS-IS `[ND]` |
| 11 | Missing/invalid context fails closed | B1-BASE:TE-ID-004/005, TE-B3-007 | none | SPECIFIED |
| 12 | Cross-Business negative verification | all rows with a negative case | **none — gate NOT MET** | **NOT VERIFIED** |

**Create-ownership reopening check (06 §6.2).** Coverage of create-ownership for the two entities outside the mechanism's coverage (Legajo / DocumentoLegajo): **no criterion covers it, and none can be derived while ISO-OPEN-001 is open (decision 011).** The reopening condition is therefore **recorded as live-but-blocked**, not triggered: no new invariant is proposed and no tenant rule is invented.

Recount: contract coverage 12/12 (unchanged); specified test criterion 9/12 (P2 and P3 BLOCKED on the B1 physical model; P12 is a gate, not a criterion); execution evidence **0/12**.

---

# 12. Status summary

| Item | State |
|---|---|
| Owner decisions B3-TEST-001…025 | **DECIDED** — 25, recorded in `03-DECISIONS/48-…` |
| Matrix (8 B3-specific + 7 inherited rows), criteria, fixtures, coverage | **DERIVED** — rows: 6 SPECIFIED (TE-B3-001/002/003/005/006/007), 1 CONDITIONAL-specified for the enumerable subset (TE-B3-008), 1 CONDITIONAL-not-testable (TE-B3-004); inherited 7 SPECIFIED (Membership-based cases of TE-ID-005 BLOCKED) |
| Current infrastructure, known gaps, auth/context dependence, Legajo open | **DOCUMENTED** |
| Tests written | **NO** (0) |
| Tests executed | **NO** (0) |
| `[T]` | **0** |
| `[E]` | **0** |
| Real PostgreSQL integration | **NOT EXECUTED** |
| Implementation / code / schema change | **NOT AUTHORIZED** |
| ISO-009 | **SPECIFIED — NOT EXECUTED** |
| P12 | **VERIFICATION GATE — NOT MET** |
| ND-01 (does scoping stay active on the transaction client) | **NOT DETERMINABLE without `[E]`** |

**Closure under decision 025.** Five conditions: (1) criteria derived — **MET** for the derivable set; (2) tests implemented — NOT MET; (3) tests executed — NOT MET; (4) evidence recorded — NOT MET; (5) every failure resolved or formally open/classified — NOT APPLICABLE until execution. B3 Tests/Evals therefore **cannot** be closed under decision 025; only the *derivation / reconciliation* stage is closed.

**B3 TESTS/EVALS: CLOSED FOR DERIVATION / RECONCILIATION; NOT EXECUTED; NOT VERIFIED; NOT READY FOR IMPLEMENTATION unless the existing readiness gates explicitly permit it.**

This document does not declare B3 READY and does not authorize implementation. Readiness is assessed in `13-AUDIT/27-B3-POST-INVARIANT-TESTS-EVALS-READINESS-2026-10-04.md`.

---

# 13. Traceability

Owner Decision → Contract → Invariant → Test/Eval:

| Owner decision (48) | Contract (09 / 27) | Invariant (06) | Test/Eval (this doc) |
|---|---|---|---|
| 010, 020, 006 | `B3-CON-017` | ISO-001 | TE-B3-001 (+ B1-BASE:TE-ID-006, TE-ID-011) |
| 010, 020 | `B3-CON-018` | ISO-002 | TE-B3-002 |
| 008, 018, 019, 010, 020 | `B3-CON-014` | ISO-003 | TE-B3-003 (+ B1-BASE:TE-ID-008, TE-ID-009) |
| 011 (applies by analogy: classification not yet testable) | `B3-CON-015` | ISO-004 | TE-B3-004 (CONDITIONAL — not testable) |
| 009 | `B3-CON-016` | ISO-005 | TE-B3-005 (+ B1-BASE:TE-ID-010) |
| 012, 014 | `B3-CON-020/021` | ISO-006 | TE-B3-006 |
| 013 | `B3-CON-003` (operation reading) | ISO-007 | TE-B3-007 (+ B1-BASE:TE-ID-004/005 for the context subject, dec. 015/016) |
| 005, 008 | `B3-CON-023` | ISO-008 | TE-B3-008 |
| 011 | `B3-CON-019` | ISO-OPEN-001 | — (no row) |
| 021, 022, 023, 024, 025 | addendum 27 §12 (P12 gate) | — (not an invariant) | §5.3-5.5, §12 |

Downstream: Readiness `13-AUDIT/27-…` → Transformation Plan v0.2 (B3 Tests/Evals propagation section) → Task Execution Set v0.1 §12 → Decision Register §10.

**Decision 011 note.** Decision 011's wording ("keep OPEN while ownership is not sufficiently determined") applies literally only to Legajo/DocumentoLegajo; its use for TE-B3-004 is an **analogy recorded for transparency**, not an extension of the decision. TE-B3-004 is CONDITIONAL on 06's own testability statement.

---

# 14. Discrepancy register

| ID | Discrepancy | Where | Action |
|---|---|---|---|
| D-TE-01 | `TE-ID-004/005/006` (and `007`) mean different things in `00-TESTS-EVALS-v0.2.md` and `05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md` | §6.2 | **Requires intervention in an upstream document**; not modified here. Inherited references are source-qualified. |
| D-TE-02 | `TE-ORD-001…008` collision between the same two documents | out of B3 scope | noted only |
| D-TE-03 | Legajo/DocumentoLegajo named `ISO-OPEN-001` (06), `ISO-AMBIG-001` (27), `ISO-AMBIG` (historic 26) | §10 | canonical name used; others untouched |
| D-TE-04 | Historical `13-AUDIT/26-B3-TESTS-EVALS-AND-READINESS` predates the invariant set; stale claims | §3 | acknowledged; file untouched |
| D-TE-05 | `13-AUDIT/` has duplicate numbering (two `24-`, three `25-`, two `26-`) | repository | not renumbered |
| D-TE-06 | Audit reports 11 `$transaction` call sites; a read-only line count of `$transaction` in `apps/api/src` finds 18 lines | §9 | **NOT RECONCILED** — counting method differs; to be enumerated when TE-B3-006 is implemented |
| D-TE-07 | `05-BLOCK-1-TESTS-EVALS-BASELINE` has a duplicated bullet ("define locking or transaction mechanisms") | upstream | cosmetic; not modified |

No contradiction with an Owner decision, with R8-ARCH-002, with the reconciled contract or with the canonical invariants was found.

---

# 15. Change-control statement

This document:

- modifies no application code and no database schema;
- writes no test and executes no test;
- issues no `[T]` or `[E]` evidence;
- does not authorize implementation;
- does not declare B3 READY;
- does not resolve Legajo/DocumentoLegajo ownership;
- does not modify the historical `13-AUDIT/26-…` artifact, the B1 baseline, Tests/Evals v0.2, contracts, invariants or architecture;
- creates no identifier other than `TE-B3-001…008`.

**BLOCK 3 TESTS/EVALS RECONCILIATION: DRAFT — NOT APPROVED.**


# 11. Owner Decision 49 — ownership ambiguity closure

Owner Decision 49-B3-LEGAJO-DOCUMENTOLEGajo-OWNER-DECISION-CLOSURE-2026-10-04 closes the former ISO-OPEN-001 / ISO-AMBIG-001 ambiguity. The canonical B3 invariant is now **ISO-009**.

A new B3 verification criterion is derived:

| Row | Covers | State | Expected verification |
|---|---|---|---|
| **TE-B3-009** | **ISO-009** | **SPECIFIED** | Business ownership of Legajo/DocumentoLegajo is deterministic; cross-Business ownership is rejected; unresolved ownership fails closed. |

B3-specific verification coverage is therefore **TE-B3-001…TE-B3-009 (9 criteria)** plus the 7 inherited B1 criteria. No test is written or executed by this reconciliation.

B3-TEST-011 remains a historical Owner decision record describing the condition before ownership closure. For downstream test derivation, Decision 49 supersedes its OPEN condition; no historical text is rewritten.

**[T] = 0. [E] = 0. Implementation = NOT AUTHORIZED.**
