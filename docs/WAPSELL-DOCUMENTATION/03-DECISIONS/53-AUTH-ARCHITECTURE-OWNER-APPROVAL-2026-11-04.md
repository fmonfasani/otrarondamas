# WAPSELL — AUTHENTICATION, AUTHORIZATION & TENANCY
## OWNER ARCHITECTURE APPROVAL AND DOCUMENTARY RECONCILIATION

**Decision ID:** AUTH-ARCH-OWNER-APPROVAL-2026-11-04  
**Date:** 2026-11-04  
**Authority:** Explicit Owner approval in the project conversation on 2026-11-04.  
**Status:** APPROVED — ARCHITECTURAL DIRECTION FOR MVP  
**Implementation:** NOT AUTHORIZED by this decision.  
**Schema / migrations / seeds / data changes / deployment:** NOT AUTHORIZED.

---

## 1. Purpose and scope

This decision closes twelve architectural directions for the MVP and reconciles conflicting authorization designs. It supplements the canonical Decision Register and the 2026-10-24 Authentication, Authorization and Tenancy closure.

It does not replace earlier evidence, retroactively validate incompatible designs, or authorize implementation. Historical documents remain available as provenance and must be marked when their proposed target state is superseded.

## 2. Owner-approved decisions

| ID | Approved decision | Normative rule | Technical details still open |
|---|---|---|---|
| AUTH-01 | Canonical roles | MVP roles are exactly `OWNER`, `ADMIN`, `VENDEDOR`, `GESTOR_DE_STOCK`. | Physical enum/storage representation and legacy-role mapping. |
| AUTH-02 | Effective role authority | `Membership` is the sole authority for the effective role in MVP. | Exact persistence contract and disposition of existing `RoleGrant` / `RoleTemplate` structures. They must not become a second runtime authority. |
| AUTH-03 | Permission catalogue | One canonical `Permission` catalogue exists. | Atomic identifiers, names, descriptions, domains and physical persistence. |
| AUTH-04 | Permission assignment | MVP authorization derives from a fixed `Role → Permission` matrix. | Exact matrix rows and complete Permission catalogue. Per-Membership grants/denials are not part of the approved MVP model. |
| AUTH-05 | Multi-business membership | A global User may have Memberships in multiple Businesses. Business Switch is explicit and server-side, and requires a valid ACTIVE Membership for the target Business. | Switch endpoint/protocol, context binding, transport, session continuity and error contract. |
| AUTH-06 | JWT | JWT carries authenticated identity and a signed context assertion as specified by the eventual session contract. Authorization is always resolved/revalidated server-side. | Exact claims, signing/key rotation, context binding, lifetime, refresh, revocation, transport and storage. No embedded permission list is authoritative. |
| AUTH-07 | Legacy identity | Legacy `Usuario.id` is mapped explicitly to canonical `User.id`. | Mapping integrity, missing/duplicate mappings, transition behavior and test coverage. Equality of IDs must never be assumed. |
| AUTH-08 | Authorization decorators | One authorization engine is canonical. `@Authorize` and `@RequirePermission` may act only as transitional adapters to that engine. | Internal contract, metadata normalization, precedence, compatibility and retirement criteria. |
| AUTH-09 | Guard integration | Authorization enforcement is integrated progressively; `AuthorizationGuard` is not enabled globally as an immediate step. | Guard ordering, module/controller adoption, policy coverage and rollout gates. |
| AUTH-10 | Endpoint policy | Every endpoint has an explicit policy classification. Unknown or unclassified policies fail closed. | Complete route inventory and per-route policy/permission mapping. |
| AUTH-11 | Legacy permissions | `UsuarioPermiso` is mapped explicitly and reviewed against canonical `Permission`; transition is gradual. | Mapping table, parity evidence, coexistence period, cutover and rollback. |
| AUTH-12 | Migration | Migration is incremental, reversible and backed by tests. | Migration stages, data reconciliation, observability, acceptance gates and rollback procedure. |

## 3. Normative interpretation

1. The four role identifiers in AUTH-01 are the canonical MVP role vocabulary. No alternate role set may be introduced by a lower-level design.
2. `Membership` is the sole effective-role authority. A separate grant/template model must not independently determine the runtime role. Its future or transitional disposition requires technical inventory and reconciliation.
3. There is one canonical Permission catalogue. The term Capability in P1-2 is not a second authorization vocabulary or catalogue.
4. A fixed Role→Permission matrix is approved as the MVP assignment strategy. The exact rows are not approved by this decision and must not be inferred from P1-2's old matrix.
5. Business Switch must be an explicit server-side operation. A client-supplied Business identifier or JWT claim alone cannot establish authorization.
6. JWT is not an authorization source. Signed context is an integrity-protected context assertion, not proof of current Membership status or permission.
7. The legacy identity mapping is explicit; legacy and canonical identifiers are different namespaces even if some current records happen to have equal values.
8. There is one authorization decision engine. Decorators and guards are enforcement interfaces, not independent policy engines.
9. Missing or unknown endpoint policy is deny-by-default for protected surfaces. Public/pre-context routes must be explicitly declared as such.
10. Legacy permissions remain until mapping, parity, cutover and rollback gates are satisfied.

## 4. Formal contradiction resolutions

| ID | Previous conflict | Resolution | Required documentary treatment |
|---|---|---|---|
| REC-01 | P1-2 roles `OWNER / ASISTENTE_LOCAL / PROVEEDOR / REPARTIDOR` conflict with R8 roles. | AUTH-01 prevails. | Mark P1-2 role list/matrix superseded for MVP. Preserve as historical AS-IS/proposal evidence. |
| REC-02 | P1-2 makes `RoleGrant` the Membership→Role authority while Membership already carries role. | AUTH-02: Membership alone is authoritative. | P1-2 RoleGrant runtime authority is superseded; physical disposition remains open. |
| REC-03 | `CapabilityDefinition` competes with canonical `Permission`. | AUTH-03: one Permission catalogue. | Capability vocabulary is historical/adapter-only, not a parallel canonical catalogue. |
| REC-04 | Per-Membership CapabilityGrant overrides conflict with fixed matrix. | AUTH-04: fixed matrix only for MVP. | Grants/denials are excluded from MVP authorization; future scope requires a new decision. |
| REC-05 | BusinessContext requiring exactly one ACTIVE Membership globally conflicts with multi-business Membership. | AUTH-05: multiple Businesses are supported; one ACTIVE Membership per User-Business pair remains consistent with B2. | The resolver's global-single-membership assumption is obsolete; protocol remains open. |
| REC-06 | JWT permission claims vs server-side authorization. | AUTH-06: signed identity/context only; authorization server-side. | JWT permissions are non-authoritative and cannot be used to grant access. |
| REC-07 | Legacy `Usuario.id` used as canonical `User.id`. | AUTH-07: explicit mapping. | Update design and tests; never assume identifier equality. |
| REC-08 | `@Authorize` and `@RequirePermission` as separate engines. | AUTH-08: one engine with transitional adapters. | Dual independent enforcement is not the target state. |
| REC-09 | Immediate/global AuthorizationGuard activation. | AUTH-09: progressive integration. | No global activation until route policy coverage and rollout gates are satisfied. |
| REC-10 | Missing metadata treated as authentication-only. | AUTH-10: explicit endpoint classification; unknown policy fails closed. | P1-2 no-metadata allow behavior is superseded. |
| REC-11 | Legacy permission retirement without approved mapping/cutover. | AUTH-11: reviewed mapping and gradual transition. | Do not delete legacy permission tables or consumers before cutover gates. |
| REC-12 | P1-2 / 2026-10-25 approval wording treated as current implementation authorization. | This later Owner decision supersedes incompatible P1-2 authorization design choices and explicitly does not authorize implementation. | Preserve the 2026-10-25 record as historical evidence; it cannot authorize the superseded P1-2 authorization model or work against this closure. Other unrelated approvals are unaffected. |

## 5. Canonical authorization flow

```text
Request
  → Authentication
  → Legacy Identity Resolver (Usuario.id → User.id), where applicable
  → Business Context Resolver
  → ACTIVE Membership for the selected Business
  → Effective Role from Membership
  → Canonical Role → Permission matrix
  → Explicit Endpoint Policy Enforcement
  → Business Operation
```

The flow is an architectural contract, not an implementation prescription. Exact component boundaries, persistence, session protocol and guard ordering remain technical design work.

## 6. Details intentionally left open

The following must be resolved in a technical specification before implementation:

- Complete atomic Permission catalogue and exact Role→Permission matrix.
- Physical representation of the canonical role and Permission model.
- Existing RoleGrant, RoleTemplate, CapabilityDefinition and CapabilityGrant inventory, consumers and final disposition.
- Business Switch protocol and context binding.
- JWT claims, signature/key lifecycle, refresh, revocation and transport.
- Legacy-to-canonical identity mapping integrity and reconciliation.
- Single authorization engine contract and adapter semantics.
- Complete endpoint classification and permission mapping.
- Legacy UsuarioPermiso mapping, parity, coexistence, cutover and rollback.
- Audit event details and test/evidence requirements.

No technical choice in this list is approved by implication.

## 7. Relationship to prior authority

This decision supplements:
- `03-DECISIONS/00-DECISION-REGISTER.md`;
- `48-AUTH-TENANCY-TECHNICAL-DECISION-CLOSURE-2026-10-24.md`;
- B2 Owner Decision Closure (2026-10-04);
- R8 identity, tenancy and authorization decisions.

Where P1-2 authorization design documents conflict with this later Owner decision, this decision prevails for the MVP target state. The old documents remain historical evidence and must not be silently deleted.

The 2026-10-24 T-03/T-04/T-05/T-06/T-09/T-10 directions remain binding and are refined, not weakened, by this closure.

## 8. Implementation and verification boundary

**Approved:** architectural direction and documentary propagation.

**Not authorized:** code changes, Prisma/schema changes, SQL migrations, seeds, data updates/backfills, destructive legacy retirement, deployment or production cutover.

Implementation readiness requires a reviewed technical specification, contracts, endpoint policy inventory, invariants, tests/evals, migration plan and applicable Owner/governance approval.

This document records an Owner decision. It does not claim code implementation, tests, CI, migration or runtime verification.

---
**Recorded:** 2026-11-04  
**Owner approval:** explicit approval of all twelve AUTH-01…AUTH-12 directions.
