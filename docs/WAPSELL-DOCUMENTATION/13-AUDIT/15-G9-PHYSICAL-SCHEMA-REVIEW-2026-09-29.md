# G9 — Physical Schema Review Findings

**Fecha:** 2026-09-29  
**Estado:** REVIEW — FINDINGS RECORDED  
**Base:** current `main` Prisma schema + initial migration + OR-002 Technical Specification + G9 draft

## 1. Verified AS-IS

The current Prisma schema confirms:

- `Empresa.id` is String UUID and primary key.
- `Usuario.id` is String UUID and primary key.
- `Usuario.empresaId` is required FK to Empresa.
- `Usuario.email` is globally unique.
- `Usuario.rol` is the legacy `RolUsuario` enum.
- `UsuarioPermiso` is unique by `(usuarioId, permisoId)`.
- `Permiso.nombre` is globally unique.
- `Cliente` is Business/Empresa-scoped and currently has `email` nullable.
- Current operational actor FKs reference `Usuario`.
- `Legajo` remains attached to either Usuario or Cliente and must not be collapsed into Membership.
- Existing schema has multiple Business-scoped resources through `empresaId`.

## 2. G9 corrections / clarifications

### 2.1 Do not physically rename Empresa yet

The target concept is Business, but the current physical table is `Empresa`.

The migration should therefore introduce the target abstraction without assuming that a physical table rename is required in the first additive step.

The preservation rule remains:

`Business.id == Empresa.id`

The final physical naming decision remains part of the implementation contract.

### 2.2 User email uniqueness

Current AS-IS already has:

`UNIQUE(Usuario.email)`

Therefore C1 does not require inventing a new global uniqueness concept. The migration must instead define the normalized representation required by OR-002.

Important: PostgreSQL case-sensitive text uniqueness does not by itself enforce the selected semantic:

> same normalized email = same person.

A future migration must explicitly enforce the normalization rule.

### 2.3 Customer email

Current `Cliente.email` is nullable and its uniqueness is Business-scoped.

The OR-002 rule does **not** require Customer.email to become globally unique.

Therefore:

- preserve Customer Business-scoped uniqueness;
- add optional User linkage;
- do not add global uniqueness to Customer.email;
- use normalized email only as the deterministic identity-linkage criterion.

### 2.4 Customer linkage ambiguity

D1 resolves the identity rule, but implementation still needs a precise conflict invariant:

- zero matching Users → no linkage;
- exactly one matching User → link;
- more than one matching User → impossible under C1 if User uniqueness is correctly enforced, but must remain a validation check;
- malformed/empty Customer email → no linkage.

### 2.5 Membership role

Membership must contain the target Role reference.

The legacy `Usuario.rol` cannot remain the authorization source after cutover.

During coexistence:

`Usuario.rol → Membership.role`

must be populated deterministically according to the approved mapping.

### 2.6 Permission migration

The current `Permiso` catalog is reusable as the target Permission entity only if its identity and semantics are retained.

The current `UsuarioPermiso` table must remain during transition.

A key implementation issue remains: the current permission assignments are User-global, while the target assignments are Membership-contextual.

The migration therefore cannot merely copy rows mechanically when a User has multiple Memberships.

The canonical target Role → Permission matrix must determine the effective permissions of each Membership.

### 2.7 Membership active state

The target contract requires an active state, but the current User has `activo`.

These are different semantics:

- User.active = global identity state;
- Membership.active = relationship-to-Business state.

The migration must not reuse one field as the other.

### 2.8 Delete behavior

Existing actor FKs predominantly use `ON DELETE RESTRICT` or `SET NULL`.

Target Membership FKs should default to restrictive semantics for identity/tenant references unless a concrete lifecycle contract says otherwise.

No cascade delete of Business → Membership/User is authorized by this contract.

### 2.9 Indexing

At minimum, target physical implementation requires efficient lookup for:

- Membership by `userId`;
- Membership by `businessId`;
- Membership by `userId + businessId`;
- RolePermission by `roleId`;
- Customer by Business and normalized email where used for linkage;
- User normalized email.

Exact indexes should be finalized with the Prisma migration design.

## 3. Critical implementation consequence

The physical migration cannot simply perform:

`Usuario.empresaId → Usuario.businessId`

because that preserves one User → one Business.

The required target is:

`Usuario → User`

and

`Usuario + Empresa → Membership`

This is the central schema transformation.

## 4. G9 status

The review confirms the conceptual contract and identifies the remaining physical decisions.

G9 is **not yet closed**.

Before writing executable Prisma migration SQL, the following must be explicitly fixed:

1. physical target table naming;
2. exact Prisma model names;
3. Membership ID strategy;
4. Role ID strategy;
5. Permission reuse strategy;
6. normalized email enforcement;
7. Membership active semantics;
8. Customer.userId FK and index;
9. exact delete/update actions;
10. legacy-column retirement sequence.

No runtime/schema/data modification was performed by this review.
