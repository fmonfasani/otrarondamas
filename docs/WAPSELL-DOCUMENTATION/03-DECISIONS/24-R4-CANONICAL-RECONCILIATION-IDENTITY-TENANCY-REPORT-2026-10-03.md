# R4 — CANONICAL RECONCILIATION REPORT — IDENTITY & TENANCY

**Date:** 2026-10-03  
**Status:** AUDIT COMPLETE — RECONCILIATION NOT YET APPLIED  
**Scope:** `06-SPECIFICATIONS/CANONICAL/01-IDENTITY-AND-TENANCY-SPEC.md`

## 1. Purpose

This report audits the Identity & Tenancy specialized specification against the Owner rulings propagated through OR-B2 and OR-B3.

It does **not** approve the Technical Specification and does **not** authorize implementation.

Historical text is preserved. This report identifies where historical wording is superseded, stale, or overly prescriptive.

## 2. Authority

Under ISS-08:

`OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > AUDIT > WORKSHOP / PREPARATION > HISTORICAL`

OR-B3 rulings are later than OR-B2 rulings and therefore prevail within their defined scope.

Primary evidence:
- `03-DECISIONS/22-OR-B3-OWNER-DECISIONS-2026-10-03.md`
- `03-DECISIONS/23-OR-B3-CANONICAL-PROPAGATION-REPORT-2026-10-03.md`
- `03-DECISIONS/00-DECISION-REGISTER.md`
- current `01-IDENTITY-AND-TENANCY-SPEC.md`

## 3. Findings

| ID | Area | Current document condition | R4 classification | Required treatment |
|---|---|---|---|---|
| R4-ID-001 | Membership lifecycle | Lists active/pending/invited/inactive as possible states and marks detail open | SUPERSEDED | Canonical wording must state ACTIVE/INACTIVE as the conceptual lifecycle; other states remain undecided |
| R4-ID-002 | MVP roles | Historical examples use Asistente and omit Admin in places | HISTORICAL OVERLAP | Preserve AS-IS/history, but canonical TO-BE role vocabulary is Owner/Admin/Vendedor/Gestor de Stock |
| R4-ID-003 | Permissions | States that direct Permission assignment may be used if approved | CONTRADICTION | Remove from canonical normative model; MVP is Membership → Role → Permission; no direct overrides |
| R4-ID-004 | D-009 approvals | Uses D-009 in operational/business approval framing | CONTRADICTION | Remove operational approval interpretation; D-009 concerns documentation governance; operational approval rules remain open unless separately decided |
| R4-ID-005 | Token/session | Prescribes token carrying/deriving Business, Membership, Role and Permission context | OVER-SPECIFICATION | Retain conceptual authorization checks; move token claims/session mechanics to implementation detail |
| R4-ID-006 | Authentication mechanisms | Prescribes password + Google OAuth for TO-BE | OVER-SPECIFICATION | Retain as AS-IS evidence unless separately approved; TO-BE mechanism remains open |
| R4-ID-007 | MFA | States MFA is OPEN/FUTURE | CONTRADICTION | Canonical wording must state MFA mandatory for Owner/Admin; technical mechanism remains open |
| R4-ID-008 | SaaS Admin | Presented as OPEN/FUTURE | SUPERSEDED | State conceptually exists but is outside operational MVP |
| R4-ID-009 | Business Switch | Multiple Memberships and switch are stated; technical mechanism remains open | CONSISTENT | No change to decision; retain as conceptual rule |
| R4-ID-010 | Customer/User matching | Optional association exists, but older same-email framing remains | SUPERSEDED / OPEN DETAIL | State system may detect/propose; association is controlled; no automatic email-only link; exact matching remains open |
| R4-ID-011 | Customer/User association | Customer may exist without User | CONSISTENT | Retain |
| R4-ID-012 | Business terminology | Business is canonical; historical Tenant wording remains | HISTORICAL OVERLAP | Preserve historical evidence, but canonical entity term is Business |
| R4-ID-013 | Authorization | Conceptual flow includes User/Business/Membership/Role/Permission | CONSISTENT WITH REFINEMENT | Ensure token alone is not treated as authorization and four conceptual validations remain explicit |

## 4. Canonical identity model after OR-B3

The reconciled conceptual model is:

`User → Membership → Business`

with:

- User = global identity.
- Business = tenant/business entity and isolation context.
- Membership = User↔Business relationship.
- Membership lifecycle = ACTIVE / INACTIVE.
- Membership role model = Owner / Admin / Vendedor / Gestor de Stock.
- Authorization = Membership → Role → Permission.
- Customer is not a Membership Role.
- Supplier is not a Membership Role.
- Repartidor is outside the MVP Membership Role catalog.
- Customer and User remain distinct entities.
- Customer may exist without User.
- Customer→User association is optional and controlled.
- Multiple Memberships are allowed.
- Business Switch exists conceptually; technical mechanism remains open.
- SaaS Admin exists conceptually but is outside the operational MVP.
- MFA is mandatory for Owner/Admin; technical mechanism remains open.

## 5. Authorization boundary

The canonical conceptual authorization checks are:

1. authenticated User;
2. target Business;
3. valid Membership for that Business;
4. Role/Permission authorization.

A valid token alone does not authorize an operation.

Token format, claims, guards, middleware, session mechanics and enforcement implementation remain open implementation detail.

## 6. Items that must remain open

This audit does not close:

- physical User/Membership/Business schema;
- Customer↔User physical association model;
- exact matching algorithm;
- Business Switch mechanism;
- authentication provider set;
- token/session format;
- permission catalog;
- permission-to-role matrix;
- technical MFA mechanism;
- Business isolation mechanism;
- migration mechanics, cutover and rollback;
- additional Membership lifecycle states beyond ACTIVE/INACTIVE;
- SaaS Admin implementation;
- technical enforcement.

## 7. Reconciliation boundary

This report recommends a controlled update of the specialized Identity & Tenancy SPEC.

That future update must:
- preserve historical material;
- make the current canonical interpretation unambiguous;
- avoid inventing technical contracts;
- avoid silently closing OPEN items;
- keep `TECHNICAL SPECIFICATION = NOT APPROVED`;
- keep `IMPLEMENTATION = NOT AUTHORIZED`.

## 8. Evidence status

- **VERIFICADO POR REPOSITORIO:** current Identity & Tenancy SPEC contents.
- **VERIFICADO POR REPOSITORIO:** OR-B3 propagation report.
- **VERIFICADO POR REPOSITORIO:** Decision Register OR-B2/OR-B3 state.
- **DOCUMENTADO:** R4 findings in this report.
- **NOT VERIFIED BY CODE:** this is a documentary reconciliation; no implementation claim is made.

## 9. Conclusion

**R4 Identity & Tenancy audit: COMPLETE.**

The current specialized specification is **not yet canonical-clean**. OR-B2/OR-B3 already provide the necessary Owner rulings for the identified conflicts; no new Owner Decision Pass is required for these items.

The next controlled operation is to produce a reconciled Identity & Tenancy SPEC version while preserving historical traceability.

**TECHNICAL SPECIFICATION = NOT APPROVED**

**IMPLEMENTATION = NOT AUTHORIZED**
