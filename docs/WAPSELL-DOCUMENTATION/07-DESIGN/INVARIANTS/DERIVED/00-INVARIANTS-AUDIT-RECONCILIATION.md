# Wapsell — Invariants Audit & Reconciliation

**Status:** DRAFT — AUDIT / NON-NORMATIVE  
**Date:** 2026-09-29  
**Scope:** `09-INVARIANTS/00-INVARIANTS-v0.1.md` against the current Decision Register and reconciled Contracts.  
**Purpose:** determine whether each proposed invariant is actually formalizable at the Invariants layer without resolving pending Owner rulings, inventing implementation detail, or converting domain/architecture statements into invariants.

> This audit does not approve, reject, or modify business decisions. It records the current documentation state and identifies corrections required before the Tests/Evals layer.

---

## 1. Evidence and authority

### Primary authority reviewed

- `04-DECISIONS/00-DECISION-REGISTER.md`
- `08-CONTRACTS/01-IDENTITY-AND-TENANCY-CONTRACTS.md`
- `08-CONTRACTS/02-COMMERCE-CONTRACTS.md`
- `08-CONTRACTS/03-INVENTORY-CONTRACTS.md`
- `08-CONTRACTS/04-PAYMENTS-CASH-CONTRACTS.md`
- `08-CONTRACTS/05-MESSAGING-CONTRACTS.md`
- `08-CONTRACTS/00-CONTRACTS-AUDIT-RECONCILIATION.md`
- `09-INVARIANTS/00-INVARIANTS-v0.1.md`

### Authority rule

The Decision Register remains authoritative for decision status and provenance.

The Contracts layer is authoritative only for the reconciled contractual interpretation already documented there.

The Invariants layer must not upgrade a reconstructed decision into Owner-verbatim language, close an Open Detail, or introduce implementation commitments.

---

## 2. Overall result

**Result: CONDITIONAL PASS — RECONCILIATION REQUIRED BEFORE TEST DERIVATION.**

The current invariant set is broadly traceable to existing Decisions and Contracts, and it does not currently introduce schema, API, migration, event-name, or implementation commitments.

However, three classes of correction are required:

1. **Layer precision:** `INV-FUL-001` mixes a valid domain-boundary statement with a navigation statement that does not belong in an invariant.
2. **Scope precision:** `INV-SALE-002` is directionally supported by D-008, but its wording is broad enough to conceal the still-open cancellation/effects matrix.
3. **Provenance discipline:** every invariant derived from D-003…D-018 must remain explicitly marked as reconstructed rather than Owner-verbatim; pending D-003 WhatsApp wording must not become an invariant.

No new business decision is required merely to perform these documentation corrections.

---

## 3. Invariant-by-invariant audit

| Invariant | Assessment | Finding |
|---|---|---|
| INV-IDENT-001 | PASS | Directly supported by D-002 / C-IDENT-001. Does not freeze physical identity or persistence. |
| INV-TEN-001 | PASS WITH SCOPE | Business as tenancy boundary is supported. “Commercial resources” should remain conceptual and must not imply a complete resource catalogue. |
| INV-MEM-001 | PASS | Supported by D-002 / C-MEM-001. Correctly leaves lifecycle, roles and permissions open. |
| INV-CUST-001 | PASS | Supported by D-002-bis / C-CUST-001. Correctly preserves optional User linkage. |
| INV-CUST-002 | PASS WITH PRECISION | “A Customer belongs to one Business” must refer to the Customer record's commercial context; it must not be read as a global cardinality or cross-Business identity rule. |
| INV-INV-001 | PASS | D-014 explicitly establishes Business-owned inventory and rejects global shared stock. |
| INV-INV-002 | PASS | Current prohibition is explicitly Owner-ruled. Correctly does not define a future transfer mechanism. |
| INV-INV-003 | PASS | Correctly states Business scoping without fixing enforcement mechanics. |
| INV-INV-004 | PASS | D-010 Owner ruling supports atomic/non-partial stock movement. Transaction/locking/database mechanism remains open. |
| INV-INV-005 | PASS WITH OPEN DEFINITION | Rejection of invalid quantities is Owner-ruled. The exact definition of invalid quantity remains open and must not be invented in Tests. |
| INV-SALE-001 | PASS | D-008 supports non-deletion of confirmed Sale and explicit cancellation. Authorization/effects remain open. |
| INV-SALE-002 | **REFINE** | “Effects associated with the applicable Sale operation” is too broad without defining which effects apply to which operation. The invariant can preserve the non-partial consistency requirement, but must avoid implying a universal fixed effect set. |
| INV-CASH-001 | PASS WITH PROVENANCE CAUTION | Supported by D-013 / C-CASH-003. Exact adjustment workflow and authorization remain open. |
| INV-FUL-001 | **REFINE / NARROW** | “Fulfillment belongs to Orders” is a valid domain-boundary statement. “It is not required to become an independent principal navigation module” is a navigation/product-structure statement and should not be normative at the Invariants layer. |

---

## 4. Detailed findings

### INV-IDENT-001 — User is global

**Disposition:** RETAIN.

The invariant faithfully expresses the global identity concept from D-002 without deciding identifiers, persistence, lifecycle, or physical model.

**No correction required.**

---

### INV-TEN-001 — Business is the tenancy boundary

**Disposition:** RETAIN WITH SCOPE DISCIPLINE.

The first sentence is a valid invariant.

The second sentence is acceptable as a conceptual consequence, but it must not be interpreted as an exhaustive definition of every Business-scoped resource. Specialized Contracts and future specifications remain responsible for defining resource ownership.

**No business decision required.**

---

### INV-MEM-001 — Membership contextualizes User ↔ Business

**Disposition:** RETAIN.

The invariant correctly formalizes the relationship established by D-002 while leaving lifecycle, role storage and permission storage open.

It must not be expanded into the exact authorization algorithm of D-006.

---

### INV-CUST-001 — Customer is distinct from User

**Disposition:** RETAIN.

This is one of the clearest current invariants.

It preserves:
- conceptual separation;
- Customer without User;
- optional User linkage.

No physical relationship or merge/deduplication rule is introduced.

---

### INV-CUST-002 — Customer is Business-scoped

**Disposition:** RETAIN WITH WORDING CONTROL.

The invariant should be interpreted as:

> each Customer record exists in the commercial context of a Business.

It must not be interpreted as:
- a global uniqueness rule;
- a prohibition on future cross-Business relationship mechanisms;
- a physical database constraint.

Those details remain open.

---

### INV-INV-001 — Inventory belongs exclusively to Business

**Disposition:** RETAIN.

Directly supported by D-014.

The current Owner ruling explicitly rejects global shared stock.

---

### INV-INV-002 — Cross-Business stock transfer is currently prohibited

**Disposition:** RETAIN.

This is a current invariant, not merely an open design question.

A future exception requires a later explicit specification and authorization.

---

### INV-INV-003 — Inventory operations remain Business-scoped

**Disposition:** RETAIN.

Correctly separates the normative boundary from the technical enforcement mechanism.

The existing AS-IS code evidence for D-014 does not prove TO-BE compliance and must remain separate from this invariant.

---

### INV-INV-004 — Stock movement is atomic

**Disposition:** RETAIN.

D-010 is currently Owner-ruled and explicitly requires atomic/concurrency-safe stock movement.

The invariant does not select transactions, locks, database constraints, or other mechanisms.

The known AS-IS D-010 implementation gap remains a validation target, not evidence of compliance.

---

### INV-INV-005 — Invalid stock quantities are rejected

**Disposition:** RETAIN.

The current Owner ruling explicitly rejected a Business-specific exception.

The exact definition of “invalid quantity” remains open. Tests must therefore not invent prohibited values or edge cases until the relevant specification defines them.

---

### INV-SALE-001 — Confirmed Sale is not deleted

**Disposition:** RETAIN.

D-008 establishes explicit cancellation rather than deletion.

The invariant must not be extended to specify:
- who may cancel;
- which state transitions exist;
- which effects are reversed;
- how reversal is implemented.

---

### INV-SALE-002 — Sale effects must not be partially applied

**Disposition:** REFINE.

The normative intent is supported: D-008 requires transactional consistency and avoidance of partially applied effects.

The current wording can nevertheless be misread as if the Invariants layer already knows the complete set of effects of every Sale or cancellation.

**Required refinement:** constrain the invariant to the consistency property:

> For any Sale operation to which an effect applies according to the approved domain specifications, the applicable effects must not be left partially applied.

This preserves D-008 without closing the still-open effect matrix.

**Status:** documentation refinement; no new decision required.

---

### INV-CASH-001 — Closed Cash is not directly modified

**Disposition:** RETAIN WITH PROVENANCE.

D-013 is reconstructed rather than Owner-verbatim in the current Decision Register.

Therefore the invariant may be derived from it, but the provenance must remain visibly reconstructed.

The invariant must not establish a concrete adjustment mechanism or permission catalogue.

---

### INV-FUL-001 — Fulfillment belongs to Orders

**Disposition:** REFINE / NARROW.

The domain-ownership statement is supported by D-016 and C-FUL-001.

The additional statement concerning principal navigation is not an invariant. It belongs to product/navigation specification.

**Required refinement:** retain only the domain-boundary assertion:

> Fulfillment belongs to the Orders domain.

The following should be removed from the invariant:

> “It is not required by the current decision to become an independent principal navigation module.”

That sentence may remain as explanatory traceability in the specialized TO-BE/Commerce documentation, but not as a system invariant.

**No new decision required.**

---

## 5. Pending decision protection

The following must remain outside the invariant set:

### D-003 — WhatsApp wording

The Decision Register currently contains an authority inconsistency:

- D-003 reconstructed text contains a non-dependency statement.
- §4.3.2 of the Decision Register currently marks that specific clause as **PENDING OWNER RULING**.
- Messaging Contracts correctly preserve that pending status.

Therefore no invariant may state a WhatsApp prohibition/non-dependency rule as closed.

The invariant set correctly does not currently contain such a rule.

> **R3 note (2026-09-30) — additive; this section is preserved as historical audit evidence.** The authority inconsistency above is **RECONCILED**: the Owner ruled on 2026-09-30 (R2) *"Wapsell Messaging MVP no depende de WhatsApp."* and the Decision Register §8.1 records the clause as `RESOLVED — OWNER-RULED`. No invariant was added in R3; the invariant layer is not expanded by this propagation.

### D-013 — Sensitive Cash permissions

The exact “sensitive operations” permission clause remains pending Owner ruling.

No invariant may define a Cash permission matrix.

The current invariant set correctly avoids doing so.

---

## 6. Layer-boundary audit

| Statement type | Invariants layer? | Current treatment |
|---|---|---|
| Global identity property | YES | Correct |
| Tenancy/isolation property | YES | Correct |
| Membership contextual relationship | YES | Correct |
| Customer/User conceptual separation | YES | Correct |
| Business ownership of inventory | YES | Correct |
| Current cross-Business transfer prohibition | YES | Correct |
| Stock atomicity | YES | Correct |
| Invalid quantity rejection | YES | Correct |
| Sale non-deletion / explicit cancellation | YES | Correct |
| Sale effect consistency | YES, if scoped | Requires refinement |
| Closed Cash immutability | YES | Correct |
| Domain ownership of Fulfillment | YES, narrowly | Remove navigation statement |
| Navigation module structure | NO | Must not be invariant |
| API/endpoint shape | NO | Not present |
| Database schema | NO | Not present |
| Migration strategy | NO | Not present |
| Event names | NO | Not present |
| Permission identifiers | NO | Not present |
| Exact authorization algorithm | NO | Correctly open |
| Payment reconciliation lifecycle | NO | Correctly open |
| AI execution model | NO | Correctly open |
| WhatsApp policy while pending | NO | Correctly excluded |

---

## 7. Duplication audit

No critical duplicate invariant was found.

Potential conceptual overlaps are intentional:

- INV-INV-001 establishes ownership of Inventory by Business.
- INV-INV-003 establishes Business scoping of Inventory operations.
- INV-CUST-001 establishes Customer/User separation.
- INV-CUST-002 establishes Customer Business scope.

These are distinct properties and can remain separate for test traceability.

No invariant currently duplicates C-MSG-002/C-MSG-014. This is appropriate because those contracts contain an unresolved authority issue and Messaging physical behavior is not sufficiently specified for an invariant.

---

## 8. Implementation-evidence separation

The current invariant document correctly states that all invariants are:

**DOCUMENTED — DERIVED FROM DECISIONS + CONTRACTS**

It must remain separate from:

- D-014 code evidence showing current Business-scoped inventory behavior;
- D-010 code audit showing current implementation gaps;
- absence of tests;
- absence of execution evidence.

In particular:

**D-014 VERIFIED BY CODE ≠ TO-BE INVARIANT VERIFIED.**

**D-010 GAP ≠ invariant failure test result.**

No change is required to the evidence classification.

---

## 9. Required documentation corrections

Only two substantive wording corrections are recommended at this stage:

### CORR-INV-001
Refine INV-SALE-002 so it expresses non-partial consistency without implicitly defining the still-open Sale effect matrix.

### CORR-INV-002
Narrow INV-FUL-001 to domain ownership and remove the navigation-module statement from the invariant.

These corrections do not create new business requirements or resolve pending decisions.

---

## 10. Advancement gate

After the two wording corrections:

- [x] Stable source for every retained invariant.
- [x] No pending Owner ruling encoded as an invariant.
- [x] No schema/API/migration/event implementation detail embedded.
- [x] Cross-domain effects remain explicitly scoped.
- [x] D-010 implementation gap remains a validation target.
- [ ] Tests/Evals not yet derived.
- [ ] Full Decision → Contract → Invariant traceability still requires final review after corrections.

**Gate status: NOT READY FOR TEST DERIVATION until the two corrections are applied and the resulting document is re-read.**

---

## 11. Audit conclusion

**Invariants v0.1 is structurally sound but requires two documentation-level refinements before becoming a stable input to Tests/Evals.**

No new decision is required.

No code, schema, migration, API, test, deployment, or implementation change is authorized or implied by this audit.

**Next controlled step:** apply CORR-INV-001 and CORR-INV-002 to the invariant draft, re-read the complete resulting document, and only then evaluate whether the layer is ready to derive Tests/Evals.
