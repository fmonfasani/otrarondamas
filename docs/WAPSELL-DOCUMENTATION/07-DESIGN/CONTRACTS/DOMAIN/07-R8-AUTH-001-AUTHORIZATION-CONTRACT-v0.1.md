# WAPSELL — R8-AUTH-001 AUTHORIZATION CONTRACT v0.1

**Status:** DRAFT — TASK-LOCAL CONTRACT / OWNER APPROVED DIRECTION  
**Date:** 2026-10-04  
**Task:** R8-AUTH-001  
**Implementation:** NOT AUTHORIZED

## 1. Purpose

Formalize the Owner-approved MVP authorization boundary and capability matrix without inventing atomic permission identifiers, persistence mechanics or enforcement technology.

## 2. Authority

Primary: R8-AUTH-001 Owner Decision — Permission Catalogue / Role Matrix.

Supporting: R8-ARCH-002, R8-ARCH-003, R8-ID-002, R8-ID-003, R5 Identity/Tenancy Contracts, canonical Invariants and Block 1 Implementation Plan.

## 3. Canonical authorization chain

Every protected Business-scoped operation follows the conceptual boundary:

Authenticated User → Active Business Context → ACTIVE Membership → Role → Permission → Authorized Operation

Authentication alone is insufficient.

A client-supplied Business identifier cannot override the application-established Business Context.

## 4. MVP Membership Roles

| Role | MVP |
|---|---|
| Owner | Yes |
| Admin | Yes |
| Vendedor | Yes |
| Gestor de Stock | Yes |

Customer, Supplier and Repartidor are not MVP Membership Roles.

## 5. Approved permission domains

| Domain | Purpose |
|---|---|
| users | Business team/user administration |
| customers | Customer management |
| catalog | Product/catalog management |
| pricing | Commercial price management |
| orders | Order management and confirmation |
| sales | Sale creation and correction operations |
| inventory | Stock operations and adjustments |
| cash | Cash operations |
| payments | Payment operations |
| receivables | Accounts receivable operations |
| purchases | Purchase operations; outside initial MVP execution scope |
| messaging | Protected Business messaging operations |
| brand | Business Brand configuration |
| reports | Business reporting |

These are approved conceptual authorization domains. They are not yet a physical Permission table or final atomic identifier list.

## 6. High-sensitivity operations

The following require explicit Permission authorization rather than role-name inference:

- Order commercial confirmation: `ORDER_CONFIRM` conceptual permission.
- sensitive Cash operations;
- Sale cancellation/reversal/refund operations;
- Inventory adjustments;
- Business team/user administration;
- pricing changes.

The exact atomic identifier for each operation may be normalized during specialized authorization design, except that the requirement for explicit authorization is already closed.

## 7. Capability-level role matrix

| Capability domain | Owner | Admin | Vendedor | Gestor de Stock |
|---|---|---|---|---|
| Users / Team | Full | Delegated | No | No |
| Customers | Full | Yes | Operational | No |
| Catalog | Full | Yes | Operational | No |
| Pricing | Full | Yes | No | No |
| Orders | Full | Yes | Operational | No |
| Order confirmation | Yes | Yes | Permission-controlled | No |
| Sales | Full | Yes | Operational | No |
| Inventory | Full | Yes | Read/operational as authorized | Full |
| Cash | Full | Yes, subject to sensitive permissions | Explicitly authorized | No |
| Payments | Full | Yes | Operational as authorized | No |
| Receivables | Full | Yes | Operational as authorized | No |
| Messaging | Full | Yes | Operational | No |
| Brand | Full | Yes | No | No |
| Reports | Full | Yes | Limited/operational | Inventory scope |

This matrix is capability-level direction. 'Yes', 'Operational' or 'Full' does not bypass Permission enforcement.

## 8. AS-IS → TO-BE authorization boundary

AS-IS evidence:

`Usuario → UsuarioPermiso → Permiso`

TO-BE:

`Membership → Role → Permission`

The AS-IS permission names verified in the source decision are:

- `caja.gastos`
- `inventario.ajustes`
- `precios.cambiar`
- `ventas.crear`
- `ventas.anular`
- `usuarios.gestionar`
- `clientes.gestionar`
- `productos.gestionar`
- `compras.gestionar`
- `pedidos.gestionar`
- `fidelizacion.gestionar`

These names are evidence of the current system, not an automatically approved TO-BE catalogue.

## 9. Migration rule

No AS-IS `UsuarioPermiso` assignment may be silently converted into a target Role→Permission assignment.

Capability preservation requires an explicit mapping and verification before the corresponding legacy authorization path is retired.

Until that mapping is closed:

- `UsuarioPermiso` remains preserved as AS-IS evidence;
- legacy guards/authorization are not deleted;
- no permission is invented from role names;
- no direct Membership permission override is introduced.

## 10. Authorization invariants

Applicable canonical invariants include:

- INV-AUTH-001 — authentication alone does not authorize Business operations;
- INV-AUTH-002 — authorization is Membership → Role → Permission;
- INV-AUTH-003 — UI visibility is not authorization;
- INV-MEM-002 — INACTIVE Membership cannot operate;
- INV-TEN-001 — Business is the tenancy boundary.

## 11. Test/Eval mapping

The contract must be verified against the applicable authorization evaluation family, including:

- authenticated User without valid Membership;
- valid Membership with insufficient Permission;
- INACTIVE Membership;
- correct Role/Permission in Business A attempting Business B;
- client-supplied Business ID attempting to override active context;
- UI-hidden operation invoked directly;
- high-sensitivity operations without explicit Permission;
- Owner/Admin role scope;
- Vendedor and Gestor de Stock least-privilege boundaries.

No test execution is claimed by this document.

## 12. Explicitly OPEN

The following remain OPEN:

1. exact atomic Permission identifiers beyond the approved conceptual operations;
2. exact Role→Permission row assignment at atomic level;
3. Permission persistence model;
4. permission inheritance, if any;
5. permission revocation timing;
6. technical enforcement mechanism;
7. endpoint/use-case-to-permission mapping;
8. MFA mechanism;
9. authentication/session mechanics;
10. Business Switch mechanism.

These are not resolved by inference in this contract.

## 13. Preservation classification

| AS-IS capability | Disposition |
|---|---|
| UsuarioPermiso / Permiso | PRESERVED during transition |
| existing authorization guards/services | PRESERVED / ADAPTED during transition |
| AS-IS permission names | PRESERVED as evidence |
| target Membership→Role→Permission | NEW CANONICAL BOUNDARY |
| legacy authorization as final authority | DEPRECATED conceptually |
| direct permission overrides | NOT APPROVED |

## 14. Exit criteria

R8-AUTH-001 is closed for downstream design when:

- approved roles are recorded;
- approved permission domains are recorded;
- high-sensitivity authorization requirements are explicit;
- capability-level matrix is reconciled;
- AS-IS permission evidence is preserved;
- open atomic details are explicitly listed;
- applicable invariants and tests are traceable;
- no implementation authorization is implied.

## 15. Gate

**R8-AUTH-001: CONTRACT-LEVEL CLOSURE COMPLETE.**

**Owner direction: APPROVED.**

**Atomic technical authorization mapping: OPEN.**

**Implementation: NOT AUTHORIZED.**

## 16. B2 Owner Decision Propagation — 2026-10-04

- A Membership has exactly one effective Role in the MVP.
- At most one ACTIVE Membership may exist for a given `(User, Business)`.
- Permission domains are conceptually approved; atomic IDs, exact Role→Permission rows, persistence and technical enforcement remain OPEN.
- Legacy `UsuarioPermiso`/`Permiso` semantics remain preserved during coexistence and require an explicit reviewed mapping to target Role→Permission before the affected legacy path is retired.
- Public/pre-context authentication paths may exist without Business Permission where their contract permits it; protected Business-scoped operations fail closed when applicable authorization is absent.
- Critical-operation additional authorization control remains conceptually required; exact actors, triggers, states and technical enforcement remain OPEN.

**Reference:** `03-DECISIONS/47-B2-OWNER-DECISION-CLOSURE-2026-10-04.md`.

**Implementation:** NOT AUTHORIZED.


## 17. T-01–T-10 security contract propagation — 2026-10-24

**Authority:** Owner-accepted directions in `03-DECISIONS/48-AUTH-TENANCY-TECHNICAL-DECISION-CLOSURE-2026-10-24.md`.

The following are normative contract requirements for downstream implementation design. They do not approve a physical schema, a particular provider, a migration, or implementation.

| ID | Contract requirement | Required observable behavior | Deferred detail |
|---|---|---|---|
| T-01 | Normalize email by trimming external whitespace and lowercasing before registration, lookup, and comparison. | Equivalent normalized inputs resolve to the same identity; distinct Users cannot be created for the same normalized email. | Existing duplicate/collision audit and physical uniqueness constraint. |
| T-02 | Google OAuth account linking requires a provider-verified email. | Unverified provider email or email-string equality alone never links accounts. | Provider adapter specifics and remediation UX. |
| T-03 | JWT is authentication/session context, not authorization truth. | No protected operation succeeds from JWT validity alone; authorization is re-evaluated server-side. | Exact claims, token transport, key management and lifetime. |
| T-04 | Protected operations use current Membership and authorization state. | INACTIVE/revoked Membership or removed Permission is denied without relying solely on access-token expiry. | Revocation propagation/SLA and session storage. |
| T-05 | Business Switch is server-controlled. | Requested Business is accepted only after ACTIVE Membership validation; effective Business Context is established by trusted server logic. | Endpoint contract, response shape and session persistence. |
| T-06 | All protected reads/writes enforce Business isolation. | Cross-Business access is denied for normal ORM paths, bulk operations, upsert, groupBy and raw SQL paths. | Chosen isolation mechanism and per-query implementation. |
| T-07 | Responses use explicit safe projections. | Password hashes, tokens, provider identifiers and other secrets/internal auth fields are absent from public/API DTOs. | Complete DTO/projection inventory. |
| T-08 | MFA/2FA is mandatory for Owner and Admin. | Owner/Admin privileged access cannot be treated as fully authenticated until the required MFA policy is satisfied. | Provider/protocol, enrollment, challenge and recovery. |
| T-09 | Every route is explicitly classified. | Public/pre-context routes are explicitly allowlisted; Business-protected routes fail closed when context, ACTIVE Membership or applicable authorization is absent. | Route inventory, atomic Permission IDs, Role→Permission matrix and endpoint mapping. |
| T-10 | Security-sensitive identity/authorization/context changes are auditable. | Membership, Role/Permission, Business Context switches and sensitive session/security events produce traceable audit evidence. | Event schema, storage, retention and access controls. |

### Contract acceptance rules

- Client-supplied Business identifiers never override the server-established Business Context.
- UI visibility is not an authorization boundary.
- Customer identity does not imply User authentication or Membership.
- No AS-IS authorization path is removed until an explicit capability mapping and regression evidence exist.
- Every contract implementation must map its route/use case to the applicable invariant and test case.
- These requirements remain design/contract requirements; this document does not claim they are implemented or passing.
