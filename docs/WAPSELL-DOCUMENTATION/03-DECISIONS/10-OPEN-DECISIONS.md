# Open Decisions

**Status:** RECONCILED — derived from the current Decision Register and Owner Rulings.
**Last reconciled:** 2026-11-03
**Authority:** `03-DECISIONS/00-DECISION-REGISTER.md` and the Owner Rulings it records, under ISS-08 / OR-B2-023.

> This file is an index of unresolved decisions and implementation details. It does not replace the Decision Register, restate historical workshop decisions, approve a Technical Specification, or authorize implementation.

## 1. Resolved direction — do not reopen as undecided

The Decision Register records D-001…D-018 with two-tier provenance and subsequent Owner Rulings. OR-B2-001…OR-B2-026 and OR-B3-001…OR-B3-014 resolve or clarify additional conceptual questions. Their exact scope and provenance remain in the Decision Register and the referenced Owner Ruling artifacts.

In particular:
- D-001/D-002 and D-002-bis have Owner-verbatim direction; D-003…D-018 retain the provenance stated in the register, as later promoted or clarified by specific rulings.
- OR-B2-023 formally approves ISS-08 documentary precedence.
- OR-B3-003 places SaaS Admin outside the operational MVP.
- OR-B3-004…OR-B3-011 close the listed conceptual questions for Locations, Product/BusinessProduct, Order confirmation, Cart ownership, Customer participation, stock decrement, Cash permissions and Fulfillment.
- OR-B3-012 leaves Kubernetes / GraphQL as an open technical decision: neither approved nor prohibited.

Do not describe all 18 workshop decisions as having no text or as wholly open. Do not upgrade reconstructed wording to Owner-verbatim wording.

## 2. Open Owner decisions

The following items remain open or require an explicit later ruling, as recorded in the latest Decision Register sections:
- Payment state vocabulary and related C-17 / D-011 details.
- D-013 sensitive Cash operations, except for the scope closed by OR-B3-010.
- D-015 and D-016 clauses not superseded or closed by later rulings.
- OR-003 and OR-005; their identifiers must not be reused.
- CON-008, CON-011 and GRF-02 where still unresolved.
- Any further item explicitly marked OPEN OWNER DECISION in the latest ruling sections.

For exact scope, consult the latest sections of `00-DECISION-REGISTER.md` and the corresponding Owner Ruling source. This index intentionally does not infer answers.

## 3. Open implementation details

Owner-approved conceptual direction does not by itself approve a technical design or implementation. Details still requiring a specification and, where required, explicit Owner approval include:
- Identity transition: physical coexistence, migration mechanism, cutover, rollback and legacy-session compatibility.
- Membership authorization: permission catalogue, role-permission mapping, enforcement, token/session mechanics and Business Switch implementation.
- Customer/User association lifecycle and physical relationship, notwithstanding the later rulings that close the conceptual matching questions.
- Product / BusinessProduct field allocation and physical model.
- Order, Sale, stock reservation/decrement, cancellation, reversal, refund, transaction boundaries and state models.
- Inventory integrity enforcement and evidence that existing controls are maintained; negative stock remains forbidden.
- Payment provider contracts, webhooks, idempotency and reconciliation.
- Cash authorization enforcement and audit trail.
- Messaging persistence, realtime, navigation and participant representation.
- Location/Warehouse physical model and any unresolved quantity constraints.
- Platform governance, audit, security, observability and operational controls.

This is a non-exhaustive index. The Decision Register is authoritative for the exact status and provenance of each item.

## 4. Specification and implementation gates

The current documentary record distinguishes:
- **Conceptual decision:** resolved only within the exact scope of its Owner Ruling.
- **Technical specification:** NOT APPROVED unless a specific version is explicitly approved by the Owner.
- **Implementation:** NOT AUTHORIZED where the applicable ruling requires the sequence specification → Owner approval → implementation.

Do not infer implementation authorization from an approved conceptual decision, a draft SPEC, an audit, a roadmap, or existing code.

## 5. Reconciliation rule

When this index conflicts with a later Owner Ruling or the Decision Register, the higher-authority source prevails under ISS-08. Record the discrepancy; do not silently resolve it. Update this index only from those sources and preserve historical provenance.
