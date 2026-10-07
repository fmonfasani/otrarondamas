# F-02 — User/Membership Reconciliation & Legacy Boundary

Status: IMPLEMENTED FOR REVIEW

Baseline: 51b396c8827d7e59a8d30620be2f1b891bf3adbb

## Scope

This slice validates the existing User/Membership foundation and documents its coexistence boundary with legacy `Usuario`.

## Verified by code

- `User` is global identity and has no `businessId`.
- `Membership` represents `User ↔ Business`.
- `Membership(userId,businessId)` is unique.
- `Usuario → User` is an explicit transition mapping through `usuarioId`.
- `Usuario.empresaId` remains legacy and is not introduced as a second tenancy mechanism.
- `MembershipService.findUserByLegacyUserId()` resolves through `User.usuarioId`.
- `MembershipService.getMembershipsForUser()` scopes reads by `User.id` and does not accept an arbitrary Business selector.
- The backfill is additive and idempotent; it creates missing User/Membership records without rewriting legacy Usuario data.
- `Membership.role` remains a transition copy of `Usuario.rol`; effective role/permission migration remains outside F-02.

## Verified by existing test suite

S-V1-01 already covers the F-02 invariants:

- User creation and explicit legacy mapping.
- User email uniqueness.
- Membership User → Business mapping.
- Membership uniqueness.
- Inactive legacy user → SUSPENDED membership.
- Multiple Business memberships on one User.
- Backfill idempotency.
- Preservation of legacy `empresaId`, `rol`, and permissions.
- Identity collision reporting without person merging.
- User membership isolation.
- Unknown identity fail-closed behavior.
- ACTIVE vs SUSPENDED distinction.

F-01 BusinessContext tests additionally cover fail-closed behavior when a USER has multiple ACTIVE memberships; Business selection is therefore not inferred arbitrarily.

## Protected / out of scope

F-02 does not change:

- Prisma schema or migrations.
- JWT structure or claims.
- Permission model or PermissionsGuard.
- Role catalog or role mapping.
- Business selector UX/API.
- Dossier authorization redesign.
- Customer/User linking.
- Google ExternalIdentity.
- Endpoint-by-endpoint authorization migration.

## Open discovered dependencies

- R-01 Role Mapping: OPEN.
- Business Selection: OPEN.
- F-03 Authorization: OPEN.

These are not implemented by F-02.

## Evidence classification

- Foundation and mappings: VERIFIED BY CODE.
- F-02 invariants listed above: VERIFIED BY TEST through existing S-V1-01 / F-01 suites.
- CI status for this branch: pending PR execution.
- No schema change introduced by this slice.
