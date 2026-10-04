# R4 — TO-BE AUDIT — INVENTORY, CASH & MESSAGING

**Date:** 2026-10-03  
**Status:** AUDIT COMPLETE — RECONCILIATION NOT YET APPLIED

## 1. Purpose

Audit the current TO-BE documents for Inventory, Cash and Messaging against OR-B2 and OR-B3.

This report does not approve the Technical Specification and does not authorize implementation.

## 2. Inventory

### Findings

| ID | Finding | Classification | Required treatment |
|---|---|---|---|
| R4-INV-001 | Document still says the physical decrement timing is open in its historical OR-B2 section | SUPERSEDED | Current conceptual rule is stock decrement through a registered stock-out movement representing actual physical stock exit |
| R4-INV-002 | Reserve-on-confirmation is correctly propagated | CONSISTENT | Retain |
| R4-INV-003 | FEFO/FIFO is correctly propagated | CONSISTENT | Retain: FEFO with expiry, FIFO without expiry |
| R4-INV-004 | Negative stock prohibition is correctly propagated | CONSISTENT | Retain |
| R4-INV-005 | Locations still carry historical conflicting wording | SUPERSEDED | Current ruling: generic Location, MAIN minimum, multiple Locations permitted |
| R4-INV-006 | Business ownership/isolation is consistent with canonical model | CONSISTENT | Retain Business as isolation/ownership context |
| R4-INV-007 | Detailed schema, transaction boundaries and technical enforcement remain open | CONSISTENT | Keep open |
| R4-INV-008 | Some old authority notes still say D-006 4-vs-2 validation is open | SUPERSEDED | OR-B2-002 closed the conceptual four-check model |
| R4-INV-009 | D-010 AS-IS implementation gap is preserved | CONSISTENT | Keep as evidence; do not claim implementation compliance |
| R4-INV-010 | Inventory document contains historical placeholder/spec-name discussion | HISTORICAL | Preserve for traceability; do not treat as current canonical rule |

### Current conceptual Inventory baseline

- Inventory belongs exclusively to a Business.
- Stock is not globally shared between Businesses.
- Confirmed Order reserves stock.
- Physical decrement is represented by a registered stock-out movement corresponding to actual physical exit.
- Negative stock is prohibited.
- Expiring products use FEFO.
- Non-expiring products use FIFO.
- Generic Location is the conceptual location model; MAIN is the minimum and multiple Locations are permitted.
- Physical schema, transaction boundaries and implementation mechanisms remain open.

## 3. Cash

### Findings

| ID | Finding | Classification | Required treatment |
|---|---|---|---|
| R4-CASH-001 | Sensitive Cash operations were historically left pending | SUPERSEDED | OR-B3-010 establishes specific Permissions as the authorization mechanism |
| R4-CASH-002 | Cash remains Business-scoped | CONSISTENT | Retain |
| R4-CASH-003 | Formal Cash states remain open | CONSISTENT | Do not invent states |
| R4-CASH-004 | Adjustment/compensating operation mechanics remain open | CONSISTENT | Keep open |
| R4-CASH-005 | Payment↔Cash relationship remains open | CONSISTENT | Do not infer integration behavior |
| R4-CASH-006 | Existing AS-IS double-confirmation/threshold behavior is evidence, not TO-BE authority | CONSISTENT | Preserve as AS-IS only |
| R4-CASH-007 | Permission catalog and detailed authorization rules remain open | CONSISTENT | Keep open |

### Current conceptual Cash baseline

- Cash is Business-scoped.
- Sensitive Cash operations require specific Permissions.
- Exact Permission names, catalog, thresholds and workflow remain open.
- Formal state machine remains open.
- Adjustment/compensation mechanics remain open.
- Payment/Cash/AR boundaries remain open where not explicitly decided.

## 4. Messaging

### Findings

| ID | Finding | Classification | Required treatment |
|---|---|---|---|
| R4-MSG-001 | Messaging as first-class domain is correctly established | CONSISTENT | Retain |
| R4-MSG-002 | Conversation-centric UX is correctly established | CONSISTENT | Retain |
| R4-MSG-003 | WhatsApp dependency is correctly removed from MVP | CONSISTENT | Retain |
| R4-MSG-004 | AI is correctly inactive in MVP | CONSISTENT | Retain |
| R4-MSG-005 | Customer without User was historically open | SUPERSEDED | OR-B3-008 closes it conceptually: Customer may participate without User |
| R4-MSG-006 | Customer/User association remains controlled and optional | CONSISTENT | Retain OR-B3 controlled-association rule |
| R4-MSG-007 | Conversation belongs to one Business | CONSISTENT | Retain |
| R4-MSG-008 | Detailed Conversation/Message/Participant physical model remains open | CONSISTENT | Keep open |
| R4-MSG-009 | Historical D-016/Repartidor wording remains | HISTORICAL / SUPERSEDED | Repartidor remains outside MVP Membership Roles; Fulfillment remains under Orders |
| R4-MSG-010 | Messaging implementation, realtime, transport, providers and AI activation remain open | CONSISTENT | Keep open |

### Current conceptual Messaging baseline

- Messaging is a first-class functional domain.
- UX is conversation-centric.
- Messaging is active in the initial MVP.
- The MVP uses Wapsell's own messaging system and does not depend on WhatsApp.
- AI is product direction but inactive in the MVP.
- A commercial Conversation belongs to exactly one Business.
- Customer may participate without a User.
- Customer/User association is optional and controlled.
- Commerce actions remain governed by the corresponding Commerce authorization rules.
- Physical message/conversation model and transport remain open.

## 5. Cross-domain conclusion

Inventory, Cash and Messaging do not require a new Owner Decision Pass for the identified OR-B2/OR-B3 conflicts.

The remaining work is documentary reconciliation where historical wording is still ambiguous.

### Current status

| Artifact | R4 status |
|---|---|
| Identity & Tenancy SPEC | Reconciled v0.3 |
| Commerce SPEC | Reconciled v0.3 |
| Inventory TO-BE | Audit complete; reconciliation pending |
| Cash TO-BE | Audit complete; reconciliation pending |
| Messaging TO-BE | Audit complete; reconciliation pending |

## 6. Evidence

- **VERIFICADO POR REPOSITORIO:** current Inventory TO-BE.
- **VERIFICADO POR REPOSITORIO:** current Cash TO-BE.
- **VERIFICADO POR REPOSITORIO:** current Messaging TO-BE.
- **DOCUMENTADO:** R4 findings in this report.
- **NOT VERIFIED BY CODE:** no implementation claim is made.

## 7. Governance boundary

No code, schema, migration, infrastructure or deployment was changed by this audit.

**TECHNICAL SPECIFICATION = NOT APPROVED**

**IMPLEMENTATION = NOT AUTHORIZED**
