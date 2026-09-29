# Wapsell — Contracts / Identity & Tenancy
**Fase:** Contracts 1.0 — Identity & Tenancy · **Creado:** 2026-09-29 · **Estado:** DRAFT — NOT APPROVED

> ## Purpose
>
> This is the first contract-layer artifact after the TO-BE coverage audit.
> It translates already documented Identity/Tenancy directions into **contract candidates** without
> defining physical schema, token format, framework mechanisms, database migrations or implementation.
>
> **Authority:** D-001, D-002, D-002-bis, D-005 and D-006; DEC-001 where it provides the same direction.
> D-005/D-006 are DERIVED / RECONSTRUCTED and therefore are not quoted as Owner-verbatim.
>
> **No new decisions. No new business requirements. No schema. No API implementation. No invariants.
> No tests.**

---

## 1. Contract semantics

A contract defines an externally observable obligation between Wapsell components, actors or domains.
This document deliberately stops before choosing the implementation mechanism.

Each contract is classified as:

- **REQUIRED DIRECTION** — directly supported by an approved decision.
- **OPEN DETAIL** — necessary details remain undecided.
- **CONTRACT CANDIDATE** — formalization of the approved direction, subject to review/approval.

A contract candidate must not be treated as an implementation authorization.

---

## 2. Contract C-IDENT-001 — Global User identity

**Source:** D-002 / DEC-001.

**Contract candidate:** Wapsell treats `User` as a global platform identity rather than an identity
owned by one Business.

**Observable obligation:**
- A User may participate in more than one Business context.
- User identity is not scoped exclusively to a single Business.

**Not defined here:**
- identifier;
- email uniqueness;
- lifecycle states;
- registration method;
- physical persistence;
- authentication token structure.

**Status:** CONTRACT CANDIDATE — REVIEW REQUIRED.

---

## 3. Contract C-TEN-001 — Business isolation boundary

**Source:** D-001.

**Contract candidate:** Business is the canonical business entity and the multi-tenant isolation
boundary.

**Observable obligation:**
- Business-scoped commercial resources must remain within the Business context.
- A resource belonging to Business A must not become accessible as Business B data through a valid
  Business context.

**Not defined here:**
- isolation mechanism;
- schema strategy;
- database policy;
- request propagation mechanism;
- identifier format.

**Status:** CONTRACT CANDIDATE — REVIEW REQUIRED.

---

## 4. Contract C-MEM-001 — User ↔ Business Membership

**Source:** D-002.

**Contract candidate:** access of a User to a Business is represented conceptually through Membership.

**Observable obligation:**
- A User may have Memberships in multiple Business instances.
- The Membership is the contextual relationship used to determine access within that Business.

**Not defined here:**
- Membership states;
- creation/invitation workflow;
- uniqueness constraints;
- role storage;
- permission storage;
- revocation mechanics.

**Status:** CONTRACT CANDIDATE — REVIEW REQUIRED.

---

## 5. Contract C-AUTH-001 — Contextual authorization

**Source:** D-005 / D-006.

**Contract candidate:** authenticated access to a Business-scoped operation requires validation of:
1. global User identity;
2. target Business;
3. valid Membership for that Business;
4. required role/permissions.

A valid authentication token alone does not constitute authorization for a Business-scoped operation.

**Observable obligation:**
- An operation must not be authorized solely because authentication succeeded.
- Authorization must be evaluated in the target Business context.

**Not defined here:**
- token type/claims;
- guard/middleware/interceptor;
- permission catalogue;
- error representation;
- session model;
- active Membership state semantics.

**Status:** CONTRACT CANDIDATE — REVIEW REQUIRED.

---

## 6. Contract C-CUST-001 — Customer is commercial, not User

**Source:** D-002-bis.

**Contract candidate:** Customer is a commercial relationship with a Business and is not equivalent to
the global User identity.

**Observable obligation:**
- A Customer may exist without a User.
- A Customer may optionally be linked to a User.
- Customer information is scoped to its Business.
- Customer commercial information remains associated with the Customer relationship rather than
  requiring a User identity.

**Not defined here:**
- Customer lifecycle;
- deduplication;
- link/unlink workflow;
- exact commercial attributes;
- physical relation;
- anonymous-session mechanics.

**Status:** CONTRACT CANDIDATE — REVIEW REQUIRED.

---

## 7. Contract C-CONTEXT-001 — Business context propagation

**Source:** D-001 / D-006.

**Contract candidate:** every Business-scoped operation must execute against an explicitly resolved
Business context.

**Observable obligation:**
- The target Business cannot be inferred solely from the existence of an authenticated User.
- Membership authorization must correspond to the same Business context used by the operation.

**Not defined here:**
- how the context is transported;
- URL/subdomain/header/token/session representation;
- precedence when multiple contexts are possible.

**Status:** CONTRACT CANDIDATE — REVIEW REQUIRED.

---

## 8. Contract C-BRAND-001 — Brand belongs to Business

**Source:** DEC-001 / D-004.

**Contract candidate:** Brand is the commercial identity presented for a Business.

**Observable obligation:**
- Customer-facing experience may resolve the Business Brand.
- Brand cannot be treated as a global identity of Wapsell itself.

**Not defined here:**
- assets;
- tokens;
- theme;
- persistence;
- configuration API;
- inheritance.

**Status:** CONTRACT CANDIDATE — REVIEW REQUIRED.

---

## 9. Contract boundaries

### Identity ↔ Commerce

Commerce resources involving Customer must resolve the Customer within a Business context.
Commerce must not silently replace Customer identity with User identity.

### Identity ↔ Messaging

Messaging may associate a conversation with a Customer, including a Customer without a User.
The concrete conversation/message model remains open under D-003.

### Identity ↔ Inventory

Inventory resources are Business-owned. D-014 additionally governs the inventory ownership
boundary; its detailed invariants belong to the Inventory contract layer.

### Identity ↔ Cash

Cash operations are Business-scoped and subject to D-013. Detailed cash permissions remain open.

---

## 10. AS-IS → GAP → DECISION → CONTRACT → OPEN DETAIL

| AS-IS | GAP | DECISION | CONTRACT | OPEN DETAIL |
|---|---|---|---|---|
| Usuario is coupled 1:1 to Empresa | Global identity not represented | D-002 | C-IDENT-001 | migration and persistence |
| Empresa is isolation root | TO-BE uses Business | D-001 | C-TEN-001 | physical isolation |
| No Membership equivalent | Access relation is not N:N | D-002 | C-MEM-001 | lifecycle/model |
| Authorization tied to AS-IS user/company context | TO-BE requires User + Business + Membership | D-005/D-006 | C-AUTH-001 | token/guards/catalogue |
| Cliente is separate AS-IS identity | Must remain distinct from User | D-002-bis | C-CUST-001 | linkage/lifecycle |
| Business context currently derives from AS-IS Empresa | TO-BE context mechanism not defined | D-001/D-006 | C-CONTEXT-001 | propagation |
| Brand is embedded in historical system design | Business Brand boundary not formalized | D-004 | C-BRAND-001 | configuration |

---

## 11. Traceability

| Contract | Decision | TO-BE | Invariant | Test |
|---|---|---|---|---|
| C-IDENT-001 | D-002 | 01-IDENTITY-AND-TENANCY.md | NOT CREATED | NOT CREATED |
| C-TEN-001 | D-001 | 01-IDENTITY-AND-TENANCY.md | NOT CREATED | NOT CREATED |
| C-MEM-001 | D-002 | 01-IDENTITY-AND-TENANCY.md | NOT CREATED | NOT CREATED |
| C-AUTH-001 | D-005/D-006 | 01-IDENTITY-AND-TENANCY.md | NOT CREATED | NOT CREATED |
| C-CUST-001 | D-002-bis | 01-IDENTITY-AND-TENANCY.md / 02-COMMERCE.md | NOT CREATED | NOT CREATED |
| C-CONTEXT-001 | D-001/D-006 | 01-IDENTITY-AND-TENANCY.md | NOT CREATED | NOT CREATED |
| C-BRAND-001 | D-004 | 06-BRANDING-AND-EXPERIENCE.md | NOT CREATED | NOT CREATED |

---

## 12. Open Details

1. User identifier and uniqueness.
2. User lifecycle.
3. Membership lifecycle.
4. Membership invitation/activation/revocation.
5. Role catalogue.
6. Permission catalogue.
7. Business lifecycle.
8. Business identifier.
9. Business-context transport.
10. Token types and claims.
11. Authentication/session contract.
12. Authorization failure contract.
13. Customer lifecycle and deduplication.
14. Customer ↔ User linking mechanics.
15. Brand configuration and persistence.
16. Cross-Business administrative context, if any.

---

## 13. Evidence

| Claim | Evidence |
|---|---|
| User global | DOCUMENTED — D-002 / DEC-001 |
| Business isolation boundary | DOCUMENTED — D-001 |
| Membership N:N | DOCUMENTED — D-002 |
| Roles/permissions contextual to Membership | DOCUMENTED — D-005 |
| Token alone is insufficient for Business authorization | DOCUMENTED — D-006 |
| Customer separate from User | DOCUMENTED — D-002-bis |
| Brand belongs to Business | DOCUMENTED — DEC-001 / D-004 |
| Physical identity/auth schema | NOT DETERMINABLE |
| Token format | NOT DETERMINABLE |
| Concrete authorization mechanism | NOT DETERMINABLE |

---

## 14. Closure

**Contracts 1.0 — Identity & Tenancy: drafted.**

This document formalizes only already documented direction. It creates no decision, schema, invariant,
test or implementation.

Next contract group: **Commerce**, beginning with Customer → Catalog/Pricing → Order/Sale → Payments/AR,
while preserving the unresolved boundaries identified by the existing TO-BE documents.
