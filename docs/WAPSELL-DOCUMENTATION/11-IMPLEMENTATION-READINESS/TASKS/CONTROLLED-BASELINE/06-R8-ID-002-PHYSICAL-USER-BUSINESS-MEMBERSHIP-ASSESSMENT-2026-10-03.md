# R8-ID-002 — PHYSICAL USER / BUSINESS / MEMBERSHIP MODEL ASSESSMENT

**Fecha:** 2026-10-03  
**Task:** R8-ID-002  
**Status:** CONDITIONAL PASS — READY FOR OWNER DECISION  
**Class:** SPEC-CLOSURE

## 1. Purpose

Define the candidate physical identity/tenancy boundary required by the already-approved Wapsell architecture.

This assessment does not modify schema or code.

## 2. Approved conceptual model

The canonical target is:

User → Membership → Business

with:

- User = global identity;
- Business = tenant/business entity;
- Membership = User↔Business relationship;
- Role and Permission are contextual to Membership;
- one User may have multiple Memberships;
- INACTIVE Membership cannot operate.

The approved R8 architecture additionally requires:

Authenticated User → active Business Context → valid Membership → authorization → Business-scoped persistence

## 3. AS-IS physical evidence

The current Prisma schema is centered on:

Usuario → Empresa

Verified:

- Usuario has empresaId;
- Usuario has a direct Empresa relation;
- Usuario.email is globally unique;
- Usuario contains role directly;
- Usuario contains estadoLegajo directly;
- Usuario has UsuarioPermiso relations;
- Empresa has a usuarios collection;
- there is no Membership model;
- Invitacion has empresaId and a direct role;
- Cliente is Business-scoped through empresaId;
- Product is Business-scoped through empresaId.

Therefore the current physical model cannot represent one User belonging to multiple Businesses through Membership.

## 4. Required target properties

Any physical model selected must support:

1. globally unique User identity;
2. Business as tenant;
3. N:N User↔Business relationship;
4. Role contextual to Membership;
5. Membership lifecycle at least ACTIVE / INACTIVE;
6. multiple Memberships per User;
7. Business Context resolution;
8. Business-scoped ownership;
9. controlled Business switching;
10. compatibility with application-level tenant isolation;
11. incremental migration from Usuario/Empresa;
12. no requirement for physical tenant separation.

## 5. Candidate physical models

### Option A — Adapt existing Empresa + introduce Membership

Concept:

- retain existing Empresa table as the physical Business record during transition;
- treat Empresa as the current physical representation of canonical Business;
- remove the conceptual ownership of User from Usuario.empresaId over time;
- introduce Membership as the N:N relationship;
- move role from Usuario to Membership;
- move Business-specific authorization relationship to Membership context;
- preserve existing Empresa IDs to reduce migration risk;
- migrate existing Usuario→Empresa relationships into Membership records.

Conceptual target:

User
→ Membership
→ Empresa/Business

Advantages:

- lowest migration risk;
- preserves existing Business identifiers;
- aligns with incremental transformation;
- minimizes immediate physical renaming;
- compatible with existing application-level isolation;
- gives a bounded coexistence path.

Risks:

- physical table name may remain legacy (Empresa) temporarily;
- terminology mismatch must be explicitly contained;
- old empresaId paths must eventually be retired or clearly classified as compatibility.

### Option B — Physically introduce Business and migrate Empresa

Concept:

- create a canonical Business table;
- migrate Empresa records into Business;
- Membership references Business;
- remove direct Usuario→Empresa ownership after migration.

Advantages:

- physical model immediately matches canonical terminology;
- cleaner long-term schema.

Risks:

- larger migration surface;
- all existing Empresa foreign keys must be reconciled;
- greater cutover/rollback complexity;
- more legacy references must change simultaneously.

### Option C — Hybrid compatibility model

Concept:

- introduce Business and Membership;
- preserve Empresa temporarily as a compatibility representation;
- establish explicit Empresa→Business mapping;
- migrate dependent domains incrementally.

Advantages:

- maximum coexistence control;
- can isolate legacy dependencies.

Risks:

- highest temporary complexity;
- duplicate identity/tenant representations;
- requires strict anti-drift rules.

## 6. Recommendation

**Option A is recommended for the first physical transformation boundary.**

The recommendation is not to preserve Empresa as a permanent canonical concept.

Instead:

Treat the existing Empresa record as the compatibility-preserved physical Business record during the incremental migration, introduce Membership as the new relationship boundary, and progressively remove direct Usuario→Empresa ownership.

A later controlled task may decide whether/when the physical table is renamed to Business.

## 7. Role placement

The target physical direction should place Membership-scoped role information on Membership rather than User.

Current:

Usuario
- rol
- empresaId
- usuarioPermisos

Target concept:

User
- global identity/authentication attributes

Membership
- userId
- businessId
- role
- lifecycle
- Business-context authorization relationship

The exact Permission physical model remains dependent on R8-AUTH-001.

## 8. Authentication attribute placement

The following are User-global candidates:

- email;
- password credential material;
- Google identity;
- display/profile identity.

The exact physical placement of every existing Usuario field remains to be reconciled.

Business-specific operational attributes must not remain User-global merely because they exist there today.

## 9. Invitation implication

The current Invitacion is Business-scoped and carries a role directly.

Under the target model, the invitation represents intent to create/activate a Membership for a Business.

The exact invitation-to-Membership lifecycle remains open and should be closed in R8-ID-003 / authorization reconciliation rather than inferred here.

## 10. Customer boundary

Customer remains separate from User.

No Customer migration into User is implied by this task.

## 11. Required invariants for physical model

The selected physical model must preserve:

- one global User may have many Memberships;
- one Business may have many Memberships;
- a Membership belongs to exactly one User and one Business;
- Membership state controls operational eligibility;
- User identity is not duplicated per Business;
- Business ownership is explicit for Business-scoped operations;
- no User can operate in a Business without a valid Membership.

Exact constraints, indexes, IDs and schema syntax remain implementation details to be specified after approval.

## 12. Migration boundary

The model must support:

Current:

Usuario → Empresa

to:

User → Membership → Business

without requiring an immediate destructive cutover.

The migration strategy remains a separate controlled task.

## 13. Decision required

### Recommended

**A — Adapt existing Empresa + introduce Membership incrementally.**

This closes the physical-model direction while preserving the existing Business identifiers and allowing controlled coexistence.

### Alternatives

**B — Introduce physical Business immediately and migrate Empresa.**

**C — Hybrid Empresa + Business compatibility model.**

Selecting A/B/C does not authorize schema migration or code changes.

## 14. Gate

**R8-ID-002: READY FOR OWNER DECISION.**

Implementation remains NOT AUTHORIZED.
