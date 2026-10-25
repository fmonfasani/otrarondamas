# Wapsell — Contracts Audit & Reconciliation

**Status:** DRAFT — AUDIT / NON-NORMATIVE  
**Date:** 2026-09-29  
**Scope:** Contracts layer currently present under `08-CONTRACTS/`  
**Authority:** `04-DECISIONS/00-DECISION-REGISTER.md` + current TO-BE documents  
**Purpose:** verify that Contracts do not silently promote OPEN details, contradict canonical decisions, duplicate responsibilities, or introduce implementation detail.

> This document is an audit artifact. It does not create decisions, requirements, invariants, schemas, identifiers, APIs, states, permissions, migrations, or implementation.

---

## 1. Evidence basis

Audited artifacts:

1. `01-IDENTITY-AND-TENANCY-CONTRACTS.md`
2. `02-COMMERCE-CONTRACTS.md`
3. `03-INVENTORY-CONTRACTS.md`
4. `04-PAYMENTS-CASH-CONTRACTS.md`
5. `05-MESSAGING-CONTRACTS.md`

Cross-checked against:

- `04-DECISIONS/00-DECISION-REGISTER.md`
- `07-TOBE/01-IDENTITY-AND-TENANCY.md`
- `07-TOBE/02-COMMERCE.md`
- `07-TOBE/03-INVENTORY.md`
- `07-TOBE/04-CASH.md`
- `07-TOBE/05-MESSAGING.md`

The audit uses the repository state on 2026-09-29.

---

## 2. Executive result

The five Contracts are structurally coherent enough to continue the documentation chain, but they are **not yet ready to be treated as a clean basis for Invariants**.

The main blockers are documentary/governance issues rather than a need to invent new domain rules:

- several reconstructed decisions are correctly referenced, but their provenance must remain visibly distinct from OWNER-VERBATIM;
- the canonical Decision Register contains explicit OPEN DETAIL / PENDING OWNER RULING clauses that some Contracts risk treating as settled;
- Messaging currently reproduces the WhatsApp non-dependency as settled even though the canonical register's §4.3.2 records that exact clause as pending owner ruling;
- some contracts describe boundaries that are valid conceptually but should not be interpreted as physical or technical enforcement;
- cross-domain effects of Sale cancellation, payment reconciliation, AR collection, and Cash remain intentionally OPEN;
- D-010 and D-014 have owner rulings that must remain distinguished from implementation compliance;
- no Contract should advance to an invariant merely because it sounds testable: the normative source and exact scope must first be unambiguous.

**Audit disposition:**  
**CONDITIONAL PASS — DOCUMENTATION RECONCILIATION REQUIRED BEFORE INVARIANTS.**

---

## 3. Contract-by-contract disposition

| Contract | Disposition | Main observation |
|---|---|---|
| Identity & Tenancy | CONDITIONAL PASS | Core boundaries align with D-001/D-002/D-002-bis/D-005/D-006; exact authorization mechanics remain OPEN. |
| Commerce | CONDITIONAL PASS | Good cross-domain decomposition; cancellation, payment, AR and fulfillment details remain appropriately OPEN. |
| Inventory | PASS WITH GAP | D-010 and D-014 are represented with the required distinction between normative requirement and current implementation evidence. |
| Payments & Cash | PASS WITH OPEN DETAIL | Correctly avoids deciding disputed Payments↔Cash behavior and D-013 sensitive-permission wording. |
| Messaging | CONDITIONAL PASS — CORRECTION REQUIRED | Messaging MVP direction is coherent, but the treatment of the WhatsApp non-dependency conflicts with the current canonical register's pending-ruling status. |

---

## 4. Findings

### AUD-CON-001 — D-003 WhatsApp clause has inconsistent authority treatment

**Severity:** HIGH — governance/documentation

The canonical Decision Register states D-003 as reconstructed and records, in its reconciliation section, the clause concerning non-dependency on WhatsApp as **OPEN DETAIL — PENDING OWNER RULING**. *(Historical finding; see R3 status update in this section: `RESOLVED — OWNER-RULED`, 2026-09-30.)*

The Messaging TO-BE and Messaging Contracts currently present the non-dependency as settled/documented.

This must not be silently resolved by the Contracts layer.

**Required treatment:** retain the conflict explicitly and mark the exact clause as pending owner ruling until the canonical register is updated by an authorized decision.

**No product behavior should be derived from the disputed clause beyond what the undisputed D-003 core supports.**

> **R3 status update (2026-09-30) — additive; the finding above is preserved as historical audit evidence.** AUD-CON-001 is **RECONCILED**: the Owner ruled on 2026-09-30 (R2) that *"Wapsell Messaging MVP no depende de WhatsApp."* and the canonical Decision Register now records the clause as `RESOLVED — OWNER-RULED` (`04-DECISIONS/00-DECISION-REGISTER.md` §8.1; authority `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md`). The ruling does not prohibit future integrations and implements nothing. The remaining D-003 details (Conversation/Message model, additional channels, AI activation) stay `OPEN`.

---

### AUD-CON-002 — Reconstructed decisions must not be presented as OWNER-VERBATIM

**Severity:** HIGH — provenance

D-001, D-002 and D-002-bis are OWNER-VERBATIM.

D-003…D-018 are DERIVED / RECONSTRUCTED according to the canonical register.

Contracts may use reconstructed decisions as the current requirements basis, but should not describe them as verbatim Owner-approved text.

This is particularly important for D-005, D-006, D-007, D-008, D-011, D-013, D-015, D-016, D-017 and D-018.

**Required treatment:** preserve provenance labels wherever a Contract cites a reconstructed decision.

---

### AUD-CON-003 — D-006 authorization mechanics remain OPEN

**Severity:** HIGH — scope control

The conceptual rule that access depends on User, Business, Membership and required authorization is represented consistently.

However, the canonical register records a dispute around the exact authorization checks / implementation interpretation.

Therefore Contracts must not hard-code a specific guard sequence, token model, middleware/interceptor architecture, error model, or physical enforcement mechanism as if decided.

**Eligible for Invariants:** only the undisputed authorization boundary.

**Blocked:** exact enforcement algorithm.

---

### AUD-CON-004 — D-008 Sale cancellation effects must remain domain-open

**Severity:** HIGH — cross-domain consistency

D-008 establishes explicit Sale lifecycle and cancellation as an operation rather than deletion. It also establishes transactional consistency.

The exact scope of reversals/adjustments across Inventory, Cash, Payments and AR remains open.

Contracts correctly reference the boundary, but no downstream Contract should convert the example effect list into an unconditional implementation rule until the disputed scope is resolved.

**Required treatment:** keep exact reversal matrix OPEN.

---

### AUD-CON-005 — D-010 requirement and current implementation must remain separate

**Severity:** HIGH — evidence integrity

D-010 is owner-ruled. Its normative requirement is not equivalent to current implementation compliance.

The Inventory Contract correctly distinguishes:

- normative stock-integrity requirement;
- AS-IS evidence;
- identified implementation gap;
- absence of tests/invariants.

This distinction must be preserved when advancing to Invariants.

**Important:** no statement such as “D-010 is implemented” should be generated merely because the Contract exists.

---

### AUD-CON-006 — D-014 isolation is verified, but future transfer language remains constrained

**Severity:** MEDIUM

D-014 is owner-ruled. Current treatment establishes:

- inventory belongs to a Business;
- no global shared stock;
- cross-Business stock transfer is prohibited unless a later explicit specification authorizes it.

The Contract must not weaken this into a generic “future transfer feature is OPEN” statement.

The only open part is the possible future specification that could explicitly authorize such an operation.

Current cross-Business transfer behavior remains prohibited.

---

### AUD-CON-007 — D-013 sensitive-operation authorization must remain pending

**Severity:** HIGH — governance

The Payments & Cash Contract correctly treats the phrase concerning sensitive operations and Membership permissions as OPEN DETAIL because the canonical register records a pending ruling.

This treatment must be maintained.

No invariant should currently assert a specific permission requirement for every sensitive cash operation.

The broader ownership/lifecycle rules of D-013 may be formalized separately where their wording is unambiguous.

---

### AUD-CON-008 — D-011 payment reconciliation wording requires scope discipline

**Severity:** MEDIUM

External payment-provider abstraction and payment traceability are supported by D-011.

However, the exact role of reconciliation as a payment state / normative lifecycle element remains identified as disputed/open in the canonical register.

Contracts may preserve reconciliation as an open requirement area but should not define:

- reconciliation states;
- reconciliation workflow;
- settlement model;
- provider-specific behavior;
- webhook semantics;

without a later specification.

---

### AUD-CON-009 — D-015 Accounts Payable details remain open

**Severity:** MEDIUM

The Commerce Contract correctly establishes the Business/Supplier boundary and pending obligations.

The exact lifecycle, payment application, reconciliation behavior and document semantics remain open.

No invariant should yet assert a specific AP state machine.

---

### AUD-CON-010 — D-017 infrastructure language must not become architecture implementation

**Severity:** MEDIUM

D-017 establishes modular monolith as the initial architectural direction and incremental evolution.

It does not authorize a specific:

- deployment topology;
- message broker;
- cache;
- service boundary;
- container/orchestration platform;
- network topology;
- security infrastructure.

Contracts must remain domain contracts, not architecture specifications.

---

### AUD-CON-011 — D-018 CI/CD belongs to architecture/governance, not business-domain Contracts

**Severity:** LOW/MEDIUM

D-018 is valid and approved at the decision layer, but it should not be transformed into domain invariants merely because it contains validation gates.

CI/CD constraints belong to the Architecture / Engineering Governance layer.

Any Contract reference to D-018 should therefore remain traceability-oriented, not define business behavior.

---

### AUD-CON-012 — Messaging evidence classification is stronger than its immediate basis

**Severity:** MEDIUM — evidence quality

Messaging Contracts and TO-BE use statements such as “VERIFIED BY CODE” for the absence of Conversation/Message functionality and WhatsApp integration.

The conclusion is consistent with the documented AS-IS audit, but the Contracts artifact itself is not the primary code-audit source.

**Required treatment:** cite the existing AS-IS/code-evidence artifact when claiming code verification. Do not treat TO-BE absence statements as independent code verification.

---

### AUD-CON-013 — Messaging C-MSG-014 overlaps C-MSG-002

**Severity:** LOW — duplication

Both contracts address the absence of an undocumented external messaging channel / WhatsApp dependency.

This does not create a business contradiction, but it creates redundant contract surface.

**Required treatment:** consolidate or clearly differentiate:
- ownership of the MVP messaging channel; and
- prohibition against inferring an undocumented external integration.

Do not create a new requirement while consolidating.

---

### AUD-CON-014 — Conceptual entities must not become physical-model commitments

**Severity:** HIGH — architecture/data governance

Across Commerce and Messaging, terms such as Customer, Conversation, Message, Order, Sale, Payment and Fulfillment are used conceptually.

This is acceptable.

They must not be interpreted as authorization for:

- table names;
- Prisma models;
- IDs;
- API routes;
- event names;
- foreign keys;
- persistence strategy.

The canonical Decision Register explicitly keeps implementation detail OPEN.

---

## 5. Cross-contract consistency matrix

| Boundary | Contract | Current state | Audit result |
|---|---|---|---|
| User ↔ Business | Identity | Membership boundary | CONSISTENT |
| Customer ↔ User | Identity / Commerce / Messaging | Separate, optional link | CONSISTENT |
| Membership ↔ authorization | Identity / Messaging / Cash | Broad boundary; exact mechanics open | CONSISTENT IF OPEN DETAILS PRESERVED |
| Business ↔ Catalog | Commerce | Business-scoped | CONSISTENT |
| Business ↔ Inventory | Inventory | Exclusive Business ownership | CONSISTENT |
| Order ↔ Sale | Commerce / Messaging | Conceptually distinct | CONSISTENT |
| Sale ↔ Inventory | Commerce / Inventory | Effects referenced, exact lifecycle open | CONSISTENT |
| Sale ↔ Cash | Commerce / Payments-Cash | Boundary intentionally open | CONSISTENT |
| Sale ↔ Payments | Commerce / Payments-Cash | Provider abstraction; exact behavior open | CONSISTENT |
| Sale ↔ AR | Commerce / Payments-Cash | AR boundary defined, application details open | CONSISTENT |
| Purchase ↔ Inventory | Commerce / Inventory | Boundary defined | CONSISTENT |
| Purchase ↔ AP | Commerce | Boundary defined, lifecycle open | CONSISTENT |
| Order ↔ Fulfillment | Commerce / Messaging | Fulfillment belongs to Orders | CONSISTENT |
| Messaging ↔ Commerce | Messaging / Commerce | Conversation as interface, Commerce as operational engine | CONSISTENT |
| Messaging ↔ WhatsApp | Messaging | Authority conflict on exact non-dependency clause | **REQUIRES RECONCILIATION** |
| Payments ↔ Cash | Payments-Cash | Exact effects intentionally open | CONSISTENT |
| AI ↔ Messaging | Messaging | AI inactive in MVP; exact future scope open | CONSISTENT |

---

## 6. What can advance to Invariants

The following areas are candidates for formal invariants **after the provenance corrections above**:

### Eligible / sufficiently bounded

- Business-scoped ownership/isolation where already established by D-001/D-014.
- Customer belonging to a Business and remaining distinct from User.
- Membership as the context of User ↔ Business relationship.
- No global shared inventory.
- Cross-Business stock transfer currently prohibited.
- Sale confirmation as a lifecycle boundary, without defining all downstream reversal effects.
- Confirmed Sale is not deleted; cancellation is an explicit operation.
- Inventory movement atomicity / quantity validity / movement-result consistency, subject to the D-010 implementation gap being tested rather than assumed solved.
- Closed cash cannot be directly modified, subject to exact correction semantics remaining open.
- External payment-provider abstraction as an architectural boundary, not provider-specific implementation.
- Fulfillment belongs to Orders.

### Blocked until clarification/specification

- Exact D-006 authorization algorithm.
- Exact D-008 cancellation/reversal matrix.
- D-011 reconciliation lifecycle/state semantics.
- D-013 sensitive cash permission matrix.
- D-015 AP lifecycle.
- D-016 detailed delivery states, tracking, zones, tariffs and evidence.
- Messaging lifecycle, Message model, realtime, notifications and attachments.
- AI execution permissions/scope.
- WhatsApp non-dependency clause while canonical register records it as pending ruling.
- Any physical schema, API, event, identifier or migration invariant.

---

## 7. Required reconciliation actions

These actions are documentation corrections, not new product decisions:

1. **Messaging Contracts:** mark the exact WhatsApp non-dependency clause as pending canonical ruling, or update the canonical Decision Register first if the Owner has already ruled it elsewhere.
2. **Messaging evidence:** reference the existing AS-IS/code-audit evidence for code-verification claims.
3. **Preserve provenance:** ensure reconstructed D-003…D-018 are not described as OWNER-VERBATIM.
4. **Preserve OPEN details:** do not promote D-006, D-008, D-011, D-013 or D-015 disputed details into invariants.
5. **Keep D-010 implementation status separate:** normative requirement ≠ verified implementation.
6. **Keep D-014 current prohibition explicit:** no cross-Business transfer is currently authorized.
7. **Avoid duplication:** review the overlap between C-MSG-002 and C-MSG-014 without changing scope.
8. **Do not create Invariants yet** from any finding that depends on a pending ruling.

---

## 8. Advancement gate

The Contracts layer can advance to Invariants when all of the following are true:

- [ ] Authority/provenance labels are consistent.
- [ ] The D-003 WhatsApp clause is reconciled in the canonical register or explicitly carried as pending.
- [ ] No Contract promotes a pending implementation detail.
- [ ] Cross-domain cancellation/payment/cash/AR boundaries remain explicit.
- [ ] D-010 evidence and normative requirement remain separated.
- [ ] D-014 current transfer prohibition remains explicit.
- [ ] Evidence classifications point to the strongest available source.
- [ ] Duplicate contract language is consolidated without changing meaning.
- [ ] Candidate invariants are derived only from unambiguous normative statements.

**Current gate:** NOT YET PASSED.

---

## 9. Non-actions

This audit does **not**:

- modify the Decision Register;
- approve reconstructed decision wording;
- create new decisions;
- create schemas;
- create migrations;
- define API contracts;
- define events;
- define permissions;
- define state machines;
- create invariants;
- create tests;
- modify application code;
- deploy anything.

---

## 10. Final disposition

**Contracts layer: CONDITIONAL PASS.**

The documentation is sufficiently developed to perform a controlled reconciliation, but not sufficiently reconciled to derive the Invariants layer without carrying forward governance ambiguity.

The correct next operation is therefore:

**Contracts → Reconciliation/Corrections → Invariants**

not:

**Contracts → Implementation**.

