# Identity & Tenancy — Migration Execution Plan

Fecha: 2026-09-28
Estado: PLANNING — NOT AUTHORIZED FOR EXECUTION
Base: Migration Readiness + Migration Design / Backfill Specification
Branch: audit/identity-tenancy-2026-09-28

## 1. Purpose

Convert the approved Identity & Tenancy design into an implementation sequence that can later be executed safely.
This document is an execution plan, not an authorization to modify schema, runtime or data.

## 2. Approved design inputs

The Owner approved:
- Business = tenant.
- User = global identity.
- Membership = User ↔ Business.
- Roles are contextual to Membership.
- Target authorization: Membership → Role → RolePermission → Permission.
- MVP roles: Owner/Admin, Vendedor, Gestor de Stock, Cliente/Comprador, Proveedor.
- Repartidor remains an independent operational role.
- Customer remains a Business-scoped commercial entity and is not automatically a Membership.
- Supplier remains a Business-scoped commercial entity and is not automatically a Membership.
- Legajo is decomposed conceptually into identity, Membership, operational profile, delivery profile and commercial/fiscal concepts.
- Business IDs are preserved: Empresa.id == Business.id during coexistence.
This approval does not authorize implementation.

## 3. Preconditions still open

### G5 — User reconciliation
Define deterministic treatment of duplicate legacy User emails.
Required output: collision query; classification rules; merge/no-merge rule; recoverable mapping if merges are authorized.

### G7 — Authentication/session contract
Define access-token subject; Business context selection; Membership resolution; refresh/session invalidation; Google OAuth behavior; /auth/me response; legacy-token rejection/cutover behavior.

### G8 — Validation environment
Provide an executable database environment or snapshot where row counts can be measured, integrity queries can run, backfill can be rehearsed, transaction/lock behavior can be measured, and rollback/recovery can be tested.
R-03 remains an implementation sub-gate for physical Legajo decomposition.

## 4. Physical target schema — planning level

The target is additive first.
Conceptual target: Business, User, Membership, Role, Permission, RolePermission, Customer, OperationalProfile, DeliveryProfile.
Compatibility/legacy structures remain during coexistence.

### 4.1 Business
Empresa.id → Business.id; Empresa.nombre → Business.name; Empresa.configuracion → Business.configuration; timestamps preserved. No ID rewrite.

### 4.2 User
Preserve existing User IDs. Remove the physical dependency Usuario.empresaId only after Membership is authoritative and all consumers have migrated. Historical actor FKs continue to reference User.

### 4.3 Membership
Initial backfill: Usuario.id + Usuario.empresaId → Membership(userId, businessId). Constraints: UNIQUE(userId, businessId); valid User; valid Business; active state defined explicitly; role assigned only through target Role.

### 4.4 Role / Permission
Target: Membership → Role → RolePermission → Permission. Legacy UsuarioPermiso remains during coexistence. Permission parity must be measured before legacy authorization is retired.

### 4.5 Customer
Preserve Customer identity, Business ownership and business-scoped uniqueness. Add optional User linkage only when deterministic identity linkage exists.

### 4.6 Supplier
Preserve Business-scoped Supplier identity. Do not automatically create User or Membership records.

### 4.7 Operational profiles
Physical decomposition is gated by R-03. No blind Legajo → Membership migration.

## 5. Migration phases

### P0 — Preparation
Artifacts: migration branch; database backup/snapshot; validation query set; rollback mapping; migration runbook.
Exit criteria: G5, G7 and G8 resolved; snapshot verified; migration can be rehearsed.

### P1 — Additive schema
Create only target structures and compatibility fields required for coexistence. No legacy data deletion.
Expected objects: Business compatibility/target table; Membership; Role; RolePermission; target Permission linkage; required Customer→User linkage; operational profile structures only if R-03 is closed.
Exit criteria: Prisma migration applies cleanly to rehearsal database; existing application remains operable; no legacy constraint is weakened unintentionally.

### P2 — Catalog backfill
Populate Business, Role, Permission and RolePermission.
Role catalog: OWNER_ADMIN; VENDEDOR; GESTOR_STOCK; CLIENTE_COMPRADOR; PROVEEDOR; REPARTIDOR.
Exact persisted enum/table naming must be finalized in the schema contract before implementation.
Exit criteria: every required role exists exactly once; every permission has deterministic identity; RolePermission assignments are auditable.

### P3 — User and Membership backfill
For every valid legacy User/Empresa relationship: Usuario → User and Usuario + Empresa → Membership.
Preserve User IDs. Do not merge Users automatically.
Exit criteria: every valid source relationship has target Membership; no Membership points to missing User/Business; no duplicate user/business pair; actor IDs remain stable.

### P4 — Authorization backfill
Translate effective legacy authorization into target authorization.
Source: UsuarioPermiso. Target: Membership → Role → RolePermission → Permission.
A direct User permission may not map one-to-one to a RolePermission without defining whether it is a role baseline permission, an exceptional membership permission, or stale/unused permission.
Therefore implementation must first classify current permissions and determine the canonical role-permission matrix.
Exit criteria: permission parity report; unexplained permission expansion = zero; denied-access regressions = zero for validated endpoint set.

### P5 — Customer / Supplier / Invitation
Customer: preserve Business; create deterministic User link only when applicable; never create Membership solely because a Customer has an account.
Supplier: preserve Business; no automatic User/Membership.
Invitation: preserve Business and inviter User; map invitation role to target role; preserve token/expiry/used state.
Exit criteria: no orphan Customer/Supplier/Invitation records; inviter attribution preserved.

### P6 — Operational profile / Legajo
Execute only after R-03 is closed.
Expected decomposition: User identity; Membership; OperationalProfile; DeliveryProfile; operational documents; fiscal/commercial profile where applicable.
Sensitive documents must retain identity and ownership traceability.
Exit criteria: every source Legajo row classified; no document orphan; required role-specific fields preserved; unresolved rows = zero or explicitly quarantined with owner-approved rule.

### P7 — Application compatibility
Adapt runtime in dependency order: Prisma data access; tenant context; Auth session/JWT; Authorization guard; Users/invitations; Catalog; Sales/orders; Inventory; Purchases; Cash/payments; Fulfillment; Store/public business context; Audit.
Critical invariant: authorization context = Membership; historical actor = User; business ownership = Business.
Do not replace historical actor FKs with Membership IDs unless separately approved.

### P8 — Authentication cutover
Target flow: Token → User identity → Business context → Membership → Role / Permission → Business rule → Resource.
JWT claims must not be treated as sufficient authorization for arbitrary Business context.
Cutover must invalidate/reject legacy sessions according to G7.

### P9 — Validation
Required validation classes: schema integrity; identity cardinality; Membership cardinality; role mapping; permission parity; Customer ownership; Supplier ownership; Invitation integrity; Legajo/document preservation; actor preservation; Business isolation; authentication/session behavior; endpoint authorization.

### P10 — Legacy retirement
Only after P9 passes: retire User→Empresa authorization dependency; retire User-global role storage; retire legacy permission path; remove obsolete compatibility structures; enforce final NOT NULL/UNIQUE/FK constraints; update canonical AS-IS/TO-BE evidence; produce final migration evidence.
No destructive cleanup before P9.

## 6. Transaction and locking strategy

Separate structural DDL from large data backfill. For large tables use batch backfill, deterministic ordering, resumable checkpoints, bounded transactions and explicit progress logging.
For uniqueness/FK enforcement: populate, validate, enforce constraint.
Do not hold a single transaction across the entire backfill unless actual database size and lock analysis demonstrate safety.
Exact batch size is not determined until G8 data-volume measurements exist.

## 7. Dual-read / dual-write strategy

During coexistence, avoid uncontrolled two-model writes.
Preferred sequence: introduce target structures; backfill; temporarily adapt reads to target with legacy fallback where required; write both models only where necessary with explicit consistency rules; validate parity; cut over; stop legacy writes; retire legacy structures.
Every dual-write path must have source of truth, failure behavior, retry behavior and reconciliation query.

## 8. Validation query families

Identity: duplicate normalized User emails; User count; User ID preservation; Google ID collisions.
Membership: source User/Empresa relationship count; target Membership count; duplicate user/business pairs; missing references.
Authorization: effective legacy permission set; effective target permission set; diff; unauthorized expansion; unexpected denial.
Business isolation: User from A cannot access B without B Membership; resource from A cannot be read through B context; mutation against B from A is rejected.
Actors: every historical User actor remains resolvable; no actor becomes null unexpectedly.
Customer/Supplier: Business ownership; uniqueness; optional Customer→User linkage; absence of automatic Supplier Membership.
Legajo: source row count; target classification; document count; ownership; unresolved classification.

## 9. Rollback / recovery

Rollback is forward-compatible recovery, not destructive down migration.
Required mappings: LegacyEmpresaId → BusinessId; LegacyUsuarioId → UserId; UserId + BusinessId → MembershipId; LegacyRole → TargetRole; LegacyPermission → TargetPermission.
If any User merge is ever approved, additionally persist SourceUserId → TargetUserId, reason, timestamp and operator.
No irreversible merge before the mapping is persisted.

## 10. Implementation deliverables

Before execution: Prisma schema contract; Prisma migration sequence; SQL/backfill scripts where Prisma is insufficient; validation SQL; reconciliation report; Authentication/session contract; authorization matrix; rollback/recovery runbook; test plan; cutover checklist.

## 11. Gate model

G0 Owner design approval — CLOSED
G1 Role mapping — CLOSED
G2 Legajo conceptual decomposition — CLOSED
G3 Role catalog — CLOSED
G4 Permission direction — CLOSED
G5 User duplicate reconciliation rule — OPEN
G6 Business ID strategy — CLOSED
G7 Authentication/session contract — OPEN
G8 Validation environment + snapshot — OPEN
G9 Canonical physical schema contract — OPEN
G10 Prisma migration implementation — NOT STARTED
G11 Backfill rehearsal — NOT STARTED
G12 Runtime cutover — NOT STARTED
G13 Final validation — NOT STARTED
G14 Legacy retirement — NOT STARTED
This gate list is a planning control, not a canonical project-wide gate sequence.

## 12. Current status

Evidence status:
- Design decisions: DOCUMENTED / OWNER-APPROVED.
- Migration history: VERIFIED BY CODE.
- Physical database contents: NOT DETERMINABLE WITHOUT EXECUTION/SNAPSHOT.
- Runtime migration: NOT STARTED.
- Schema migration: NOT STARTED.
- Data backfill: NOT STARTED.
- Cutover: NOT STARTED.

## 13. Next action

The next work item is not to write Prisma migrations yet.
First close G5 — User duplicate reconciliation; G7 — Authentication/session contract; G8 — Validation environment/snapshot; G9 — Canonical physical schema contract.
After those gates, prepare the actual Prisma migration implementation as a separate, reviewable change.

No runtime/schema/data changes are authorized by this document.