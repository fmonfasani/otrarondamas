# WAPSELL — BLOCK 3 TENANT ISOLATION INVARIANTS v0.1
## CANONICAL B3 INVARIANT SET

**Status:** DRAFT — BLOCK 3 INVARIANTS / NOT APPROVED
**Date:** 2026-10-04
**Scope:** Wapsell MVP — Block 3 (Tenant Isolation), persistence-level properties only
**Contracts source:** `07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1.md`
**Architecture source:** `07-DESIGN/ARCHITECTURE/06-BLOCK-1-ARCHITECTURE-SPEC-v0.1.md` §5.4-5.5
**Owner authority:** R8-ARCH-002 (CLOSED — OWNER APPROVED)
**Audit input:** `13-AUDIT/25-B3-TENANT-ISOLATION-INVARIANTS-INDEPENDENT-AUDIT-2026-10-04.md`
**Technical Specification:** NOT APPROVED
**Implementation:** NOT AUTHORIZED

**Evidence classes:** `[C]` code · `[T]` test · `[E]` execution · `[D]` documented · `[ND]` not determinable.

> **No `[T]` or `[E]` evidence is issued in this document.** No test was executed and the API was not run. The existence of an invariant does not establish that the current implementation satisfies it.

---

# 1. Purpose and derivation rule

This document derives the **canonical Block 3 invariant set**: the persistence-level properties of tenant isolation that are **not** already normatively owned by Block 1 or Block 2.

The governing rule, applied without exception:

```
property already normative in B1/B2
        ↓
    REFERENCE  (cited, not restated, no new ID)

property specific to B3 persistence
        ↓
    B3 INVARIANT  (new ID, ISO-* prefix)
```

The anti-pattern this rule exists to prevent:

```
B1  INV-CONTEXT-001  ─┐
B2  CTX-001           ├── three names, one property  ✗
B3  INV-B3-CTX-001   ─┘
```

**This document does not:**
- re-design the B3 contract;
- create business decisions or Owner Decisions;
- prescribe schema, ORM, column, index or enforcement mechanism;
- define APIs, DTOs or JWT claims;
- convert an implementation defect into a new requirement;
- declare any test executed;
- authorize implementation.

---

# 2. Authority

Precedence applied:

```
OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE >
CONTRACTS > INVARIANTS > AUDIT > HISTORICAL
```

**Primary source: R8-ARCH-002** — application-level tenant isolation, 12 required properties (§3), security invariant (§7), AS-IS disposition ADAPTED (§5), ten items left open for downstream specification (§6).

| Source | Level | Role here |
|---|---|---|
| `28-R8-ARCH-002` | OWNER RULING | the 12 properties; §6 defines the space B3 may legitimately occupy |
| `29-R8-ARCH-003`, `33-R8-ID-003`, `35-R8-AUTH-001` | OWNER RULING | context, coexistence, authorization — **upstream of B3** |
| `31-R8-MASTER-DECISION-PROPAGATION-AUDIT` §140 | DECISION REGISTER | requires an application-level tenant-isolation invariant |
| `06-BLOCK-1-ARCHITECTURE-SPEC` §5.4-5.5 | CANONICAL SPEC | the 12 properties, literal |
| `09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1` | CONTRACTS | the 24 `B3-CON-*` obligations this set derives from |
| `05-BLOCK-1-INVARIANTS-BASELINE-v0.1` | INVARIANTS | **B1 set — referenced, never duplicated** |
| `24-B2-CONTROLLED-INVARIANT-RECONCILIATION` | INVARIANTS (cuasi-canonical) | **B2 set — referenced, never duplicated** |
| `23-BLOCK-3-TENANT-ISOLATION-ASIS-AUDIT`, `25-...-INDEPENDENT-AUDIT` | AUDIT | AS-IS evidence; duplication findings |

## 2.1 Two authority facts that define this set's boundary

**Fact 1 — B1 leaves the space open explicitly.** `05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md` §13 item 6 lists *"physical tenant isolation mechanism"* as explicitly open and outside the closed B1 invariant set `[D]`. B1 closes the **boundary** (`INV-TEN-001`) and the **context** (`INV-CONTEXT-001`); it does not close persistence-level isolation.

**Fact 2 — B2 formally assigns `CTX-006` to B3.** The B2 reconciliation table maps the ARCH-003 clauses to owners and records, for `CTX-001..006`: *"CTX-001, CTX-003, CTX-002, CTX-003/AUT-004, CTX-004 (switch)/MEM, **B3 (CTX-006)**"* `[D]`. `CTX-006` is *"Business Context must be consistent with the Business scope used by persistence and related/nested operations"*.

**Consequence:** B3 is not claiming scope — B1 vacated it and B2 assigned it. This set is the derivation of `CTX-006` plus the §6 open items, and nothing more.

---

# 3. Reference frame — what B3 does NOT restate

These properties are normative in B1/B2. B3 **references** them. No B3 ID is created for any of them.

| Property | Normative owner | ID | B3 relation |
|---|---|---|---|
| Business is the tenancy boundary; a resource of A must not be exposed or operated through B context | **B1** | `INV-TEN-001` | **PARENT** — every ISO-* is a persistence refinement of this |
| One effective Business context per protected operation; must correspond to an ACTIVE Membership; client identifier cannot override; missing or invalid context fails closed | **B1** | `INV-CONTEXT-001` | **UPSTREAM** — B3 consumes the context, never redefines it |
| Membership contextualizes access; a Membership for A does not authorize B | **B1** | `INV-MEM-001` | UPSTREAM |
| An INACTIVE Membership cannot authorize Business-scoped operations | **B1** | `INV-MEM-002` | UPSTREAM |
| Authentication alone does not authorize | **B1** | `INV-AUTH-001` | UPSTREAM |
| Cross-domain operations preserve the same effective Business context | **B1** | `INV-X-001` | **SIBLING** — same property across domains; ISO-006 is its transactional dimension |
| Business Context is mandatory | **B2** | `CTX-001` | UPSTREAM |
| The client cannot impose the context | **B2** | `CTX-002` | UPSTREAM |
| One effective context resolving to an ACTIVE Membership | **B2** | `CTX-003` | UPSTREAM |
| On Business Switch, authority is re-derived from the target Membership | **B2** | `CTX-004` | UPSTREAM |
| Only an ACTIVE Membership authorizes | **B2** | `MEM-002` | UPSTREAM |
| A Membership does not authorize another Business | **B2** | `MEM-003` (marked *CROSS-BLOCK with B3*) | UPSTREAM |
| The JWT authenticates, it does not authorize; claims are not the sole authorization truth | **B2** | `AUT-001` | UPSTREAM |
| Fail-closed on absent/ambiguous **context, membership, role or permission** | **B2** | `AUT-004` | **ADJACENT** — see ISO-007, which is fail-closed on an **operation**, a different subject |
| `empresaId`, `Usuario.rol`, `UsuarioPermiso`, legacy JWT are transitional | **B2** | `LEG-001` | **CONSTRAINT** — governs how ISO-003/004 may classify |
| Business-scoped isolation per domain (Inventory, AR, Cash, Messaging, Cart, Customer, Purchases) | **B1** / **R5** | `INV-INV-002`, `INV-AR-001`, `INV-CASH-001`, `INV-MSG-001`, `INV-CART-002`, `INV-CUST-002`, R5 `INV-PUR-003` | **DOMAIN SIBLINGS** — R5 `INV-PUR-003` is the closest ancestor of ISO-001/002 |

**Retired by this derivation.** The twenty `INV-B3-*` candidates in the contract's §21 are **not adopted**. Eight were duplicates of the table above — including the whole `INV-B3-CTX-001..004` family, which triplicated `INV-CONTEXT-001` and `CTX-001..004`. The independent audit established this and the finding is sustained `[D]`.

---

# 4. Scope clause

This set applies to **protected Business-scoped operations**.

An operation whose function is to establish or resolve identity and Business — authentication, identity resolution, activation by secret, and work outside the request plane such as seed and migration scripts — is **outside its scope**. The context does not yet exist when such an operation runs, so no obligation about the context can bind it.

**Formulation precedent, not invention:** `INV-CONTEXT-001` achieves the same exclusion with one adjective — *"a **protected** Business-scoped operation has one effective Business context"* `[C]`. This clause makes that adjective explicit for the persistence layer.

**Consequence, recorded deliberately:** the legitimacy of pre-context access is **not** a B3 invariant. The contract proposed it as one (B3-CON-022 → `INV-B3-BYP-001`); as an invariant it would state an exception to scope rather than a property of the system. It belongs here, in the scope clause.

---

# 5. Canonical B3 invariant set

**Eight invariants.** Minimal and sufficient: each covers a property that no B1/B2 invariant covers, and removing any one leaves an R8-ARCH-002 property or §6 open item without a verifiable property.

---

## ISO-001 — Client-supplied relation identifiers are validated against the context

**Normative statement**

A relation identifier received from a client is resolved and validated against the effective Business Context before it is persisted as a reference.

**Contractual source:** `B3-CON-017` (NEW)
**Architectural source:** R8-ARCH-002 §3.9 (related/nested persistence preserves ownership), §7 (security invariant); `06-BLOCK-1-ARCH-SPEC` §5.5 property 9
**Relation to B1/B2:** refinement of **B1 `INV-TEN-001`**; nearest domain ancestor **R5 `INV-PUR-003`** (Purchase Business isolation). Neither covers it: `INV-TEN-001` forbids a resource of A being *"exposed or operated"* through B context, and persisting a *reference* to an entity of B neither exposes it (nothing is returned) nor operates it (nothing is read or modified).
**Class:** **STABLE**
**Testability:** STABLE FOR TEST DERIVATION — directly observable: submit an operation carrying a relation identifier belonging to another Business and verify rejection. The multi-tenant fixture already exists (`seed.ts` creates a second Business with its own catalogue) `[C]`.
**Duplication risk:** **LOW.** No existing invariant addresses input-side relation identifiers. Adjacent criterion `TE-ID-011` covers *ownership of the created record*, not the validity of the reference it carries.
**Evidence:** `[D]` as invariant · AS-IS **`[C]` not satisfied** at one of five nested-write sites.

> **Not a new requirement (rule 7).** The obligation already exists contractually: `C-COEX-004` requires that *"related/nested persistence cannot cross Business"* `[D]`. This invariant makes that existing obligation verifiable. It does not raise the bar because of a defect; the defect is evidence that the bar was never observable.

---

## ISO-002 — Referential integrity does not satisfy isolation

**Normative statement**

No Business-scoped entity is linked to an entity belonging to another Business. The referential integrity of the persistence layer does not by itself satisfy this property.

**Contractual source:** `B3-CON-018` (NEW)
**Architectural source:** R8-ARCH-002 §3.9, §7
**Relation to B1/B2:** refinement of **B1 `INV-TEN-001`**. No existing invariant distinguishes *"the reference exists"* from *"the reference belongs to the tenant"*.
**Class:** **STABLE**
**Testability:** STABLE FOR TEST DERIVATION — observable as a state property: no persisted link exists between entities of different Businesses.
**Duplication risk:** **LOW.** Complements ISO-001 without overlapping: ISO-001 governs the input path, ISO-002 governs the resulting state. Both are needed — a link could also arise from a path that does not come from a client payload.
**Evidence:** `[D]` as invariant · AS-IS **`[C]` no mechanism at any layer**.

> **Second sentence is deliberate and is not a mechanism prescription.** It states what does *not* discharge the obligation, without saying what would. Composite keys, application validation and database constraints all remain open; R8-ARCH-002 §4 excludes database-enforced tenant isolation as the primary mechanism, so the invariant must not imply it.

---

## ISO-003 — Derived ownership is determinate and carries equal obligations

**Normative statement**

The Business of an entity that carries no Business identifier of its own is determined by its ownership relation, and that determination is unique. Such an entity is subject to the same isolation obligations as an entity carrying its own identifier.

**Contractual source:** `B3-CON-014` (NEW)
**Architectural source:** R8-ARCH-002 §3.6, §3.9; §6 (*"direct versus inherited Business ownership"* listed as open)
**Relation to B1/B2:** **B1 `INV-TEN-001`** asserts that *"every Business-scoped resource remains associated with exactly one applicable Business context"* but does not define what makes an entity without its own identifier Business-scoped. This invariant supplies that definition. Constrained by **B2 `LEG-001`**: the classification describes the AS-IS and is transitional.
**Class:** **STABLE**
**Testability:** STABLE FOR TEST DERIVATION per derived entity — ten are enumerated in §7.2. **Conditional on ISO-002** for `AplicacionPago`, which has two ownership paths (→Payment, →Debt) whose agreement depends on no cross-Business link existing.
**Duplication risk:** **LOW**, with one caution: the per-domain isolation invariants (`INV-INV-002`, `INV-CASH-001`, `INV-AR-001`) already isolate some of the same entities *by domain*. ISO-003 is the persistence-level property of the derivation itself, not a restatement of any domain rule. When deriving tests, a derived entity that is already covered by its domain criterion must not receive a second redundant criterion.
**Evidence:** `[D]` as invariant · AS-IS `[C]` held by call-site discipline across ten models, with no mechanism.

> **Why the first sentence matters.** An invariant that asserted only *"equal obligations"* would not be verifiable: to test that a child entity meets the same obligations as its parent, the tenant of the child must first be determinable. The determinacy clause is the substantive property. The independent audit identified this as UNDER-SPECIFIED in the original candidate and the correction is adopted.
>
> **No schema prescription.** The statement says *"ownership relation"*, never *"must carry a Business column"*. Requiring an identifier on the ten derived models would prescribe schema, which R8-ARCH-002 §4 and `06-R8-ID-003` §5 both forbid `[D]`.

---

## ISO-004 — Absence of a Business identifier does not imply global scope

**Normative statement**

An entity not explicitly classified as global does not receive global treatment.

**Contractual source:** `B3-CON-015` (NEW)
**Architectural source:** R8-ARCH-002 §3.9, §6
**Relation to B1/B2:** none covers it. The inverse presumption would silently remove the boundary from twelve of the fourteen models that carry no Business identifier — only two are legitimately global `[C]`.
**Class:** **CONDITIONAL**
**Testability:** CONDITIONAL — observable only once classification is an artefact the system consults rather than a documentary statement. Until then the property is reviewable but not test-derivable.
**Duplication risk:** **LOW.**
**Evidence:** `[D]` as invariant · AS-IS `[C]` two of fourteen are legitimately global (the tenant entity itself and the platform permission catalogue).

> **Why this is an invariant and not a process rule.** The contract degraded this to *"verified by review"*. Formulated over the **classification process** it would indeed be a process rule. Formulated over **system behaviour** — an unclassified entity is not treated as global — it is a property of the system and can eventually be observed. The audit's reformulation is adopted on that basis, with CONDITIONAL class recording that observability is not yet available.

---

## ISO-005 — A Business-scoped identifier does not behave globally

**Normative statement**

An identifier whose uniqueness is semantically proper to a Business does not behave as a global identifier.

**Contractual source:** `B3-CON-016` (NEW)
**Architectural source:** R8-ARCH-002 §3.8 (unique lookups must not expose another Business)
**Relation to B1/B2:** adjacent to **B1 `INV-TEN-001`** and criterion `TE-ID-010`, which cover **non-exposure**. This invariant covers **uniqueness semantics**, a different property: in the AS-IS a business identifier is global, so no data leaks (the lookup returns nothing) yet two Businesses share one namespace and one cannot reuse a key the other consumed `[C]`.
**Class:** **STABLE**
**Testability:** STABLE FOR TEST DERIVATION — observable: reuse in Business B an identifier already consumed in Business A. Expected to fail against the AS-IS.
**Duplication risk:** **LOW.** The distinction between isolation and uniqueness semantics is explicit, and the contract required it be kept (*"do not confuse a unique index with authorization/tenant isolation"*).
**Evidence:** `[D]` as invariant · AS-IS **`[C]` not satisfied** for one business identifier.

> **No schema prescription.** The statement does not require a composite unique constraint. It states the observable property; whether it is met by a constraint, by scoped generation or otherwise stays open.
>
> **Boundary held.** Identity identifiers — a normalized user email, an external identity identifier, an invitation secret — are legitimately global and outside this invariant. **B1 `INV-IDENT-002`** owns email global uniqueness. The distinction is that an *identity* identifier resolves *which* Business the subject belongs to, while a *business* identifier belongs to a Business.

---

## ISO-006 — A transaction operates under exactly one Business Context

**Normative statement**

A transaction operates under exactly one effective Business Context, and every operation executed within it — including raw statements issued directly to the persistence layer — is subject to the same isolation obligations that apply outside it.

**Contractual source:** `B3-CON-020`, `B3-CON-021` (EXTEND)
**Architectural source:** R8-ARCH-002 §3.10 (transactions preserve isolation); `06-BLOCK-1-ARCH-SPEC` §5.5 property 10
**Relation to B1/B2:** **B1 `INV-X-001`** is the sibling property — *"a Business-scoped operation crossing domain boundaries must preserve the same effective Business context"*. ISO-006 is its transactional dimension: crossing a **transaction boundary** rather than a **domain boundary**. **B1 `INV-X-003`** is adjacent (multi-effect operations must not expose partial state) and explicitly leaves *"the exact transaction and concurrency mechanism"* open, so it cannot carry this property. The B4 readiness assessment records transactions as having *"no invariant of their own"* `[D]`.
**Class:** **STABLE** for derivation · **AS-IS state NOT VERIFIED**
**Testability:** STABLE FOR TEST DERIVATION — the test is writable and is the highest-priority candidate, because it closes the one remaining mechanism uncertainty.
**Duplication risk:** **LOW.** `INV-X-001` is about domains; this is about transaction boundaries. The second clause overlaps slightly with ISO-008 — a raw statement without a filter is also an operation executed by an unusual path — but it is retained because the transaction boundary adds its own dimension: the obligation must hold *inside* the boundary, which ISO-008 alone does not state.
**Evidence:** `[D]` as invariant · AS-IS `[C]` satisfied by construction (every transaction opens under a single context and none mixes tenants) · **`[ND]` by execution**.

> **Explicit evidence separation (rule 10).** Two different things are recorded and must not be merged: the invariant is **derivable to a test** (STABLE), and the AS-IS compliance is **not verified** (`[ND]`). Type-level and documentary evidence converge on the AS-IS holding, but nothing was executed. This invariant is **not** marked verified.

---

## ISO-007 — An operation without a defined isolation guarantee is rejected

**Normative statement**

A persistence operation for which no isolation guarantee is defined is rejected, rather than executed without one.

**Contractual source:** `B3-CON-003` (EXTEND) — the operation-level reading
**Architectural source:** R8-ARCH-002 §3.11 (missing or invalid context must fail closed rather than fall back to unrestricted access)
**Relation to B1/B2:** **adjacent to, and not covered by, both.** **B1 `INV-CONTEXT-001`** closes with *"missing or invalid Business **context** fails closed"*; **B2 `AUT-004`** is *"fail-closed on absent/ambiguous **context, membership, role or permission**"*. Both take the **context** (or the authorization inputs) as the subject. ISO-007 takes the **operation** as the subject: the context may be perfectly valid while the operation itself has no defined isolation semantics. Verified: no existing invariant states this `[C]`.
**Class:** **STABLE**
**Testability:** STABLE FOR TEST DERIVATION — observable: invoke a persistence operation with no defined isolation handling and verify rejection rather than unscoped execution. Expected to pass against the AS-IS.
**Duplication risk:** **LOW**, and the subject distinction is the reason. Without ISO-007, R8-ARCH-002 property 11 would be covered only in its context dimension.
**Evidence:** `[D]` as invariant · AS-IS **`[C]` satisfied** — unsupported operations are rejected, and the effect is observable in the code: the operations that would be rejected appear nowhere in the application, and one site documents having chosen a different construction precisely because of this behaviour.

> **Included because the reconciled contract preserves it (rule 6).** The contract classifies this behaviour PRESERVE and calls it the strongest property of the AS-IS. The independent audit found it had been left without an invariant — the contract mapped `B3-CON-003` to a *context* invariant, losing the operation-level reading. That gap is closed here.
>
> **Why the phrasing avoids a mechanism leak.** The statement says *"for which no isolation guarantee is defined"*, not *"an operation absent from the allow-list"*. The first is a property; the second would encode the current implementation's structure.

---

## ISO-008 — Isolation obligations are independent of the execution path

**Normative statement**

A Business-scoped operation is subject to the isolation obligations regardless of the path by which it is executed.

**Contractual source:** `B3-CON-023` (NEW)
**Architectural source:** R8-ARCH-002 §7 (*"this must hold regardless of values supplied by the client"*); §5 (the AS-IS mechanism's known limitations must be addressed before it is implementation-ready)
**Relation to B1/B2:** none states it. **B1 `INV-TEN-001`** asserts the outcome (a resource of A is not exposed or operated through B) but is silent on whether the outcome must hold uniformly across execution paths. This invariant is what distinguishes *"isolation holds"* from *"isolation happens to hold on the paths currently written"*.
**Class:** **CONDITIONAL**
**Testability:** CONDITIONAL — observable by executing the same operation through two different paths and comparing outcomes. It is not fully test-derivable because *"every path"* is not enumerable without the surface-enumerability process rule (§6), which is deliberately not an invariant.
**Duplication risk:** **LOW**, with a known partial overlap with ISO-006's second clause (§5, ISO-006 note).
**Evidence:** `[D]` as invariant · AS-IS `[C]` satisfied in fact — no reviewed path produces a cross-Business outcome — but held by discipline rather than by mechanism at several sites.

> **Phrasing corrected for an implementation leak.** The original candidate read *"outside the expected isolation"*. *"Expected"* is not observable and, in the AS-IS, silently means *"whatever the current mechanism applies"* — encoding the mechanism into the invariant, which R8-ARCH-002 §4 and the still-open enforcement mechanism both forbid `[D]`. *"Regardless of the path"* is observable and mechanism-agnostic.
>
> **This does not forbid direct persistence access.** The scope clause (§4) keeps pre-context access out of scope. ISO-008 binds Business-scoped operations only.

---

# 6. Deferred and not-admitted

## 6.1 Deferred — OPEN

| ID | Statement | Why deferred |
|---|---|---|
| **ISO-OPEN-001** | For an entity whose Business is not determinable from its data model without an explicit resolution, no isolation obligation is derivable until that resolution exists. | **OPEN / TECHNICAL.** Two entities in the AS-IS have two mutually exclusive optional ownership paths, so the tenant is indeterminate `[C]`. Resolving it requires a model decision, which `06-R8-ID-003` §5 does not authorize and which this document must not invent (rules 3, 5, 8). **No Owner Decision is raised:** the authority to decide already exists and is simply unexercised. |

**Class:** **OPEN** · **Testability:** NOT TESTABLE YET · **Duplication risk:** none.

**This is a real entry, not a placeholder.** It records that ISO-003's determinacy clause has a known exception, so a future test suite does not read ISO-003 as universal.

## 6.2 Not admitted as invariants

| Proposal | Classification | Reason |
|---|---|---|
| Cross-Business negative verification must exist (R8-ARCH-002 property 12) | **READINESS GATE** | A property of the verification set, not of the system. An invariant states what must always be true of the system; *"a test must exist"* does not. Precedent: B2 classifies an equivalent statement as a process/gate rule, not test-derivable `[D]`. Recorded in §9. |
| The non-scoped access surface must be enumerable and auditable | **PROCESS RULE** | Same category. It is a precondition for ISO-008 being fully testable, which is exactly why ISO-008 is CONDITIONAL rather than STABLE. |
| Pre-context access is legitimate without a Business Context | **SCOPE CLAUSE** (§4) | States an exception to scope, not a property. B1 achieves the same with the adjective *"protected"*. |
| Create assigns ownership from the context | **ABSORBED** | Covered jointly by ISO-001 (a client value does not determine ownership) and B1 criterion `TE-ID-006` (a client identifier cannot override the context). A ninth ID for a property `INV-TEN-001` already presupposes would add no verifiable coverage. **Reopening condition recorded:** if test derivation finds no criterion covering create-ownership for the two entities outside the current mechanism's coverage, this must be revisited. |
| Read / update / delete isolation; unique-lookup non-exposure; nested-write ownership | **REFERENCE** (§3) | Normative in B1 `INV-TEN-001` with criteria `TE-ID-008`, `TE-ID-009`, `TE-ID-010`, `TE-ID-011` already specified. Creating B3 IDs would be the three-names anti-pattern. |
| Context required; context ↔ ACTIVE Membership; client cannot override; context fail-closed | **REFERENCE** (§3) | Normative in B1 `INV-CONTEXT-001` and B2 `CTX-001..004`, `MEM-002`, `AUT-004`. |
| Prospective obligations for linking forms absent from the system | **COVERED BY FORMULATION** | ISO-001 and ISO-002 are stated over *"a relation identifier received from a client"* and *"a link between entities"*, naming no operation. They bind any future linking form automatically. A separate conditional invariant would add an ID without adding a property (rule 2). |

---

# 7. Ownership classification

Required by rule 5, and the basis of ISO-003, ISO-004 and ISO-OPEN-001. Derived from the AS-IS audit and verified against the schema `[C]`.

## 7.1 Classification summary

| Class | Count | Contract treatment | Invariant |
|---|---|---|---|
| **DIRECT** — carries its own Business identifier | 28 | scoped | B1 `INV-TEN-001` + ISO-001/002/005/006/007/008 |
| **DERIVED** — tenant determinable by ownership relation | 10 | derived scope | **ISO-003** |
| **GLOBAL** — legitimately global | 2 | no scope obligation | **ISO-004** (boundary) |
| **AMBIGUOUS** — tenant not determinable without resolution | 2 | resolution required first | **ISO-OPEN-001** |
| **UNKNOWN** | **0** | — | — |
| **Total** | **42** | | |

Zero UNKNOWN: every model in the schema is classified.

## 7.2 DERIVED entities (ten)

Each has an unambiguous owning relation. Two carry more than one path:

| Entity | Ownership path(s) | Determinate |
|---|---|---|
| Sale line item | → Sale | yes |
| Order line item | → Order | yes |
| Purchase line item | → Purchase | yes |
| Return line item | → Return (+ carries product/lot references) | yes for tenant; references governed by ISO-001/002 |
| User-permission link | → User | yes |
| Cash opening | → Cash register | yes |
| Cash movement | → Cash register, → Cash opening | yes — same chain |
| Cash count | → Cash register, → Cash opening, → Authorization | yes — same chain |
| Cash closing | → Cash opening | yes |
| Payment application | → Payment, → Debt | **yes, conditionally** — the two paths agree only while no cross-Business link exists, i.e. while ISO-002 holds |

**The payment-application case is why ISO-003 is marked conditional on ISO-002.** It is a soft dependency between two invariants in this set and must be carried into test derivation rather than resolved here.

## 7.3 GLOBAL entities (two)

The tenant entity itself, and the platform permission catalogue. Both are legitimately global: the first *is* the boundary, the second is governed by the authorization block, whose approved permission domains are platform-level `[D]`.

**Method note, per the contract's requirement:** absence of a Business identifier was not treated as evidence of global scope. Of the fourteen models without one, two are global, ten are derived and two are ambiguous. ISO-004 exists to prevent the opposite presumption.

---

# 8. R8-ARCH-002 property → reference / invariant / gap matrix

Required by the task. For each of the twelve approved properties: which B1/B2 invariant covers it, which B3 invariant (if any) is needed, and whether a gap remains.

| # | Property | B1 / B2 reference | B3 invariant | Gap |
|---|---|---|---|---|
| **1** | Business Context exists before Business-scoped operations | **B1 `INV-CONTEXT-001`**; **B2 `CTX-001`** | — (referenced) | none at invariant level. AS-IS does not satisfy it — context is assumed from a claim, not established `[C]`. **B1 dependency**, not a B3 gap |
| **2** | Context corresponds to a valid Membership | **B1 `INV-CONTEXT-001`, `INV-MEM-001`**; **B2 `CTX-003`, `MEM-003`** | — (referenced) | none at invariant level. Not satisfiable in the AS-IS: no Membership entity exists `[C]`. **B1 dependency** — physical Membership schema is explicitly open `[D]` |
| **3** | INACTIVE Membership cannot operate | **B1 `INV-MEM-002`**; **B2 `MEM-002`** | — (referenced) | same as property 2 |
| **4** | Client Business identifier cannot override the context | **B1 `INV-CONTEXT-001`**; **B2 `CTX-002`**; criterion `TE-ID-006` | — (referenced) | none at invariant level. **Verification caveat:** satisfied in the AS-IS by absence of any selection surface, not by active defence `[C]`. Passing `TE-ID-006` today does not demonstrate the property. Becomes live when Business Switch is introduced (**B2 `CTX-004`**) |
| **5** | CREATE assigns Business from the context | **B1 `INV-TEN-001`** (presupposed); criterion `TE-ID-006` | — (absorbed into ISO-001; §6.2) | **narrow gap, recorded not closed.** No invariant states create-ownership explicitly. Reopening condition in §6.2 |
| **6** | READ constrained to the context | **B1 `INV-TEN-001`** + criterion `TE-ID-008`; domain siblings `INV-INV-002`, `INV-AR-001`, `INV-CASH-001`, `INV-MSG-001`, `INV-CUST-002` | **ISO-003** (derived entities only), **ISO-004** | none |
| **7** | UPDATE / DELETE do not cross Business | **B1 `INV-TEN-001`** + criterion `TE-ID-009` | **ISO-003** (derived), **ISO-008** (path independence) | none |
| **8** | Unique lookups do not expose another Business | **B1 `INV-TEN-001`** + criterion `TE-ID-010` | **ISO-005** (uniqueness semantics — a distinct property) | none |
| **9** | Related / nested persistence preserves ownership | **B1 `INV-TEN-001`** + criterion `TE-ID-011`; R5 `INV-PUR-003` | **ISO-001**, **ISO-002** | **closed by B3.** This was the one real contractual gap: the existing reference covers ownership of the created record, not the validity of the reference it carries |
| **10** | Transactions preserve isolation | **B1 `INV-X-001`** (sibling, domain dimension), `INV-X-003` (adjacent, mechanism open) | **ISO-006** | **closed by B3.** No prior invariant existed `[D]` |
| **11** | Missing / invalid context fails closed | **B1 `INV-CONTEXT-001`**; **B2 `AUT-004`** — both with *context* as subject | **ISO-007** — *operation* as subject | **closed by B3** for the operation dimension; the context dimension is referenced |
| **12** | Cross-Business access covered by negative verification | — | **not an invariant** (§6.2) | **READINESS GATE** — see §9. Contractually covered, **empirically unsatisfied** |

## 8.1 Reading of the matrix

| Coverage origin | Properties |
|---|---|
| **B1 / B2 reference only** | 1, 2, 3, 4 |
| **Reference + B3 refinement** | 6, 7, 8 |
| **Closed by B3** | 9, 10, 11 (operation dimension) |
| **Narrow gap recorded** | 5 |
| **Not an invariant** | 12 |

**Eight of twelve properties need no new B3 invariant, or need one only as a refinement.** Three are genuinely closed by this set. That ratio is the evidence that the set is minimal: it is the arithmetic the three-names anti-pattern would have hidden.

**Two gaps that are not B3's to close.** Properties 2 and 3 are unsatisfiable in the AS-IS because no Membership entity exists. The invariants are correct and owned by B1/B2; the dependency is the physical identity model, explicitly open in B1 §13 item 23 and in the architecture contract `[D]`. Recorded, not escalated, and no Owner Decision is raised.

---

# 9. Verification requirement (property 12)

R8-ARCH-002 §3.12 requires cross-Business access to be covered by negative verification. This is recorded here as a **readiness gate**, not as an invariant (§6.2).

**Current state:** the repository contains **no isolation test** `[C]`. The only specification file is a health check, and the end-to-end test directory referenced by the project configuration does not exist `[C]`.

**Fixture state:** the seed already creates a second Business with its own catalogue hierarchy `[C]`. The multi-tenant fixture required by §3.12 **exists and has no consumer.**

**Therefore:** no invariant in this set — and none in B1 or B2 — may be described as verified. Property 12 is **contractually covered and empirically unsatisfied.**

---

# 10. Set summary

| ID | Class | Testability | Duplication risk | R8 property |
|---|---|---|---|---|
| **ISO-001** | STABLE | STABLE | LOW | 9 |
| **ISO-002** | STABLE | STABLE | LOW | 9 |
| **ISO-003** | STABLE | STABLE (cond. on ISO-002 for one entity) | LOW | 6, 7, 9 |
| **ISO-004** | CONDITIONAL | CONDITIONAL | LOW | 6, 9 |
| **ISO-005** | STABLE | STABLE | LOW | 8 |
| **ISO-006** | STABLE / AS-IS NOT VERIFIED | STABLE | LOW | 10 |
| **ISO-007** | STABLE | STABLE | LOW | 11 |
| **ISO-008** | CONDITIONAL | CONDITIONAL | LOW | §7 |
| **ISO-OPEN-001** | OPEN | NOT TESTABLE YET | none | §6 |
| *(reference frame, §3)* | **REFERENCE** | owned by B1/B2 | **eliminated by design** | 1, 2, 3, 4, 6, 7, 8 |

**Totals:** 8 active invariants — 6 STABLE, 2 CONDITIONAL · 1 OPEN · 1 readiness gate · 1 process rule · 1 scope clause · 16 referenced B1/B2 invariants with no B3 ID created.

## 10.1 Why this is minimal and sufficient

**Minimal.** Each invariant covers a property no B1/B2 invariant covers, verified statement by statement against both sets (§3). The twenty candidates proposed earlier were reduced by: eight duplicates removed, three category errors reclassified (gate, process rule, scope clause), two merged by agnostic formulation, one absorbed with a recorded reopening condition.

**Sufficient.** Removing any one leaves a property or an open item unverifiable:

| Remove | Consequence |
|---|---|
| ISO-001 | property 9's input path loses its only property |
| ISO-002 | the resulting-state dimension of property 9 is lost; ISO-003 loses its precondition |
| ISO-003 | ten entities have no determinable tenant; properties 6 and 7 lose coverage for them |
| ISO-004 | twelve entities could be presumed global, removing the boundary |
| ISO-005 | property 8's uniqueness-semantics dimension is lost |
| ISO-006 | property 10 returns to having no invariant |
| ISO-007 | property 11 is covered only for context, not for operations — losing the AS-IS's strongest verified behaviour |
| ISO-008 | "isolation holds" becomes indistinguishable from "isolation happens to hold on current paths" |

---

# 11. Explicitly open

Not closed by this document, and not implicitly approved by appearing here:

1. the enforcement mechanism for every invariant in this set (explicitly open upstream `[D]`);
2. the resolution of ambiguous ownership (ISO-OPEN-001);
3. whether a business identifier's scoped uniqueness is met by a constraint, by scoped generation or otherwise (ISO-005);
4. the determination mechanism for derived ownership (ISO-003);
5. whether classification becomes a system artefact, which governs ISO-004's testability;
6. enumerability of the execution-path surface, which governs ISO-008's testability;
7. physical tenant isolation mechanism (B1 §13 item 6);
8. physical identity / Business / Membership model (B1 §13 item 23) — blocks properties 2 and 3;
9. transaction and concurrency mechanism (B1 `INV-X-003`);
10. Business Switch transport, which makes property 4 live.

Items 7-10 are open **upstream** of B3 and are not B3's to close.

---

# 12. Evidence classification

| Evidence type | Meaning in this document |
|---|---|
| Owner decision / closure | DOCUMENTED / OWNER-RULED `[D]` |
| Architecture boundary | DOCUMENTED / OWNER-APPROVED `[D]` |
| Contract-derived invariant | DOCUMENTED — DERIVED `[D]` |
| Existing implementation behaviour | VERIFIED BY CODE `[C]` |
| Runtime behaviour | would require VERIFIED BY EXECUTION `[E]` — **none issued** |
| Test outcome | would require VERIFIED BY TEST `[T]` — **none issued** |
| Open technical mechanism | NOT DETERMINABLE `[ND]` |

**The existence of an invariant does not establish that the current implementation satisfies it.**

AS-IS state per invariant, for traceability only:

| Invariant | AS-IS | Class |
|---|---|---|
| ISO-001 | **not satisfied** at one of five nested-write sites | `[C]` |
| ISO-002 | **no mechanism** at any layer | `[C]` |
| ISO-003 | held by call-site discipline, no mechanism | `[C]` |
| ISO-004 | two of fourteen are legitimately global | `[C]` |
| ISO-005 | **not satisfied** for one business identifier | `[C]` |
| ISO-006 | satisfied by construction / **not verified by execution** | `[C]` + `[ND]` |
| ISO-007 | **satisfied**, with observable effect in the code | `[C]` |
| ISO-008 | satisfied in fact, by discipline at several sites | `[C]` |

> **Rule 7 restated.** Two invariants record a non-satisfied AS-IS. Neither was created because of the defect: ISO-001 derives from an obligation that already existed contractually, and ISO-005 derives from property 8. The defects are evidence that these obligations were never observable — not the reason the obligations exist.

---

# 13. Traceability

| Invariant | Contract | Owner authority | B1/B2 relation | Existing criterion | Test |
|---|---|---|---|---|---|
| ISO-001 | `B3-CON-017` | R8-ARCH-002 §3.9, §7 | refines B1 `INV-TEN-001`; ancestor R5 `INV-PUR-003` | adjacent `TE-ID-011` | NOT CREATED |
| ISO-002 | `B3-CON-018` | R8-ARCH-002 §3.9, §7 | refines B1 `INV-TEN-001` | adjacent `TE-ID-011` | NOT CREATED |
| ISO-003 | `B3-CON-014` | R8-ARCH-002 §3.6, §3.9, §6 | defines derived scope for B1 `INV-TEN-001`; constrained by B2 `LEG-001` | `TE-ID-008/009` (direct only) | NOT CREATED |
| ISO-004 | `B3-CON-015` | R8-ARCH-002 §3.9, §6 | none | none | NOT CREATED |
| ISO-005 | `B3-CON-016` | R8-ARCH-002 §3.8 | adjacent B1 `INV-TEN-001`; bounded by `INV-IDENT-002` | adjacent `TE-ID-010` | NOT CREATED |
| ISO-006 | `B3-CON-020`, `B3-CON-021` | R8-ARCH-002 §3.10 | sibling B1 `INV-X-001`; adjacent `INV-X-003` | none | NOT CREATED |
| ISO-007 | `B3-CON-003` (operation reading) | R8-ARCH-002 §3.11 | adjacent B1 `INV-CONTEXT-001`, B2 `AUT-004` (different subject) | none | NOT CREATED |
| ISO-008 | `B3-CON-023` | R8-ARCH-002 §7, §5 | none | none | NOT CREATED |
| ISO-OPEN-001 | `B3-CON-019` | R8-ARCH-002 §6 | none | none | NOT CREATED |

**Contract obligations deliberately not producing a B3 invariant:** `B3-CON-001`, `002`, `005`, `007`, `008`, `009`, `010`, `011`, `013` → referenced to B1/B2 (§3). `B3-CON-004` → upstream (the persistence layer consuming the context is a B1 context property). `B3-CON-006` → absorbed (§6.2). `B3-CON-012` → covered by ISO-001/002's agnostic formulation. `B3-CON-022` → scope clause (§4). `B3-CON-024` → process rule (§6.2).

---

# 14. Readiness gate

The Block 3 invariant set is ready to enter Tests/Evals derivation when:

| Criterion | State |
|---|---|
| every invariant has an authoritative source | **MET** — §13 |
| no invariant introduces a business decision | **MET** — zero Owner Decisions raised |
| no invariant prescribes schema, ORM or enforcement mechanism | **MET** — §11 keeps all mechanism open |
| no B1/B2 property is duplicated | **MET** — §3 reference frame; zero B3 IDs for referenced properties |
| direct, derived and ambiguous ownership are distinguished | **MET** — §7; zero UNKNOWN |
| unsupported-operation fail-closed is explicit | **MET** — ISO-007 |
| no implementation defect became a new requirement | **MET** — §12 note |
| every invariant is observable, or its non-observability is explained | **MET** — §10; two CONDITIONAL and one OPEN explained |
| no test is declared executed | **MET** — §9, §12 |
| test criteria linked to existing ones rather than duplicated | **PENDING** — §13 identifies the adjacent criteria; the linkage is derivation work |
| ambiguous ownership resolved | **NOT MET** — ISO-OPEN-001, deliberately deferred |
| negative verification exists | **NOT MET** — §9; zero isolation tests |

**Two criteria unmet, both deliberate:** ISO-OPEN-001 requires a model resolution this document must not invent, and negative verification is the next stage's work, not this one's.

---

# 15. Closure

**Canonical Block 3 invariant set: 8 active invariants, 1 open, derived.**

This document creates no decision, schema, API, test or implementation. It modifies no existing document, and it creates no identifier for any property already normative in Block 1 or Block 2.

**Next stage:** Block 3 Tests/Evals derivation, linking to the existing criteria named in §13 rather than creating a parallel family, and prioritising ISO-006 (closes the one remaining mechanism uncertainty), ISO-001 (reproduces the one recorded cross-Business persistence defect) and ISO-007 (converts the strongest AS-IS behaviour into verified evidence for the first time).

**BLOCK 3 INVARIANTS: DRAFT — NOT APPROVED.**
